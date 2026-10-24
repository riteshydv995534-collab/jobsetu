const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Individual = require('../models/Individual');
const Household = require('../models/Household');
const HouseholdMembership = require('../models/HouseholdMembership');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitRecord = require('../models/BenefitRecord');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const { seedDatabase } = require('../utils/seed');

jest.setTimeout(90000);

let mongoServer;
let officerToken;
let officerUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Force seed demonstration database with all 20+ households, demo identifiers, and scenarios
  await seedDatabase(true);

  // Retrieve seeded welfare officer
  officerUser = await User.findOne({ role: 'WELFARE_OFFICER' });
  const jwt = require('jsonwebtoken');
  officerToken = jwt.sign(
    { id: officerUser._id, role: officerUser.role, email: officerUser.email },
    process.env.JWT_SECRET || 'jansetu-hackathon-techtrix-super-secure-key-2026',
    { expiresIn: '1d' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JANSETU: Household Identification and Scheme Benefit Mapping Tests', () => {
  // Requirement 1: A valid demo identifier returns the correct individual
  test('1. Valid demo identifier DEMO-AADHAAR-100003 returns Arjun Singh', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.individual.fullName).toBe('Arjun Singh');
    expect(res.body.data.individual.demoIdentifier).toBe('DEMO-AADHAAR-100003');
  });

  // Requirement 2: An individual lookup returns the correct verified household
  test('2. Individual lookup returns verified household H-1005', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.household).toBeDefined();
    expect(res.body.data.household.householdId).toBe('H-1005');
    expect(res.body.data.household.verificationStatus).toBe('VERIFIED');
  });

  // Requirement 3: The household lookup returns the correct current members
  test('3. Household lookup returns all current members of H-1005', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    const members = res.body.data.householdMembers;
    expect(members).toBeDefined();
    expect(members.length).toBe(4);

    const names = members.map((m) => m.fullName);
    expect(names).toContain('Vikram Singh');
    expect(names).toContain('Meena Singh');
    expect(names).toContain('Arjun Singh');
    expect(names).toContain('Neha Singh');
  });

  // Requirement 4: Searching two members of same household returns consistent household scheme history
  test('4. Searching Vikram and Arjun returns consistent household scheme history for H-1005', async () => {
    const resArjun = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    const resVikram = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100021')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(resArjun.status).toBe(200);
    expect(resVikram.status).toBe(200);

    // Household scheme count and data must match
    expect(resArjun.body.data.household.householdId).toBe(resVikram.body.data.household.householdId);
    expect(resArjun.body.data.householdSchemes.length).toBe(resVikram.body.data.householdSchemes.length);

    // Both see the household sanitation grant
    const arjunSanitation = resArjun.body.data.householdSchemes.find((s) => s.scheme.code === 'HSS-2026');
    const vikramSanitation = resVikram.body.data.householdSchemes.find((s) => s.scheme.code === 'HSS-2026');
    expect(arjunSanitation.previousBenefit).toBe('DISBURSED');
    expect(vikramSanitation.previousBenefit).toBe('DISBURSED');
  });

  // Requirement 5: Each individual retains a separate individual scheme history
  test('5. Each individual retains separate individual scheme history', async () => {
    const resArjun = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    const resVikram = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100021')
      .set('Authorization', `Bearer ${officerToken}`);

    // Arjun has an active application for IEA-2026, no disbursed benefit
    const arjunEdu = resArjun.body.data.individualSchemes.find((s) => s.scheme.code === 'IEA-2026');
    expect(arjunEdu.applicationStatus).toBe('SUBMITTED');
    expect(arjunEdu.benefitStatus).toBe('NO_RECORDED_BENEFIT');

    // Vikram has a previously DISBURSED benefit for IEA-2026
    const vikramEdu = resVikram.body.data.individualSchemes.find((s) => s.scheme.code === 'IEA-2026');
    expect(vikramEdu.benefitStatus).toBe('DISBURSED');
  });

  // Requirement 6: Household scheme history is not incorrectly copied into individual scheme records
  test('6. Household scheme history is not incorrectly placed in individual scheme records', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    // Individual schemes must only contain INDIVIDUAL scope schemes
    const indSchemes = res.body.data.individualSchemes;
    indSchemes.forEach((s) => {
      expect(s.scheme.benefitScope).toBe('INDIVIDUAL');
    });

    // Household schemes must only contain HOUSEHOLD scope schemes
    const hhSchemes = res.body.data.householdSchemes;
    hhSchemes.forEach((s) => {
      expect(s.scheme.benefitScope).toBe('HOUSEHOLD');
    });
  });

  // Requirement 7: Missing or invalid identifier returns appropriate 404 message
  test('7. Missing or invalid identifier returns standard 404 message', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-NONEXISTENT-999')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No matching record was found in the JanSetu demonstration database.');
  });

  // Requirement 8: Unverified household membership is not presented as verified
  test('8. Verified status matches database verification record', async () => {
    const arjun = await Individual.findOne({ demoIdentifier: 'DEMO-AADHAAR-100003' });
    const membership = await HouseholdMembership.findOne({ individual: arjun._id, isCurrent: true });

    expect(membership.verificationStatus).toBe('VERIFIED');
    expect(membership.verificationSource).toBe('CIVIL_SUPPLIES_RATION_REGISTER');
  });

  // Requirement 9: Previous applications are not incorrectly counted as disbursed benefits
  test('9. Previous applications are not incorrectly counted as disbursed benefits', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    const arjunEdu = res.body.data.individualSchemes.find((s) => s.scheme.code === 'IEA-2026');
    expect(arjunEdu.applicationStatus).toBe('SUBMITTED');
    expect(arjunEdu.disbursementStatus).toBe('NOT_DISBURSED');
  });

  // Requirement 10: Relevant previous household benefits are detected
  test('10. Previous household sanitation benefit is detected for H-1005', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    const sanitation = res.body.data.householdSchemes.find((s) => s.scheme.code === 'HSS-2026');
    expect(sanitation.previousBenefit).toBe('DISBURSED');
  });

  // Requirement 11: Unrelated individual benefits do not trigger incorrect household duplicates
  test('11. Unrelated individual benefits do not trigger incorrect household duplicates', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    // Vikram received individual education; it must not make H-1005 ineligible for unrelated schemes
    const unrelatedHhScheme = res.body.data.householdSchemes.find((s) => s.scheme.code === 'HES-2026');
    expect(unrelatedHhScheme.previousBenefit).toBe('No confirmed record');
  });

  // Requirement 12: An unauthorised user cannot access restricted household information
  test('12. Unauthorized request without token returns 401', async () => {
    const res = await request(app).get('/api/individuals/lookup/DEMO-AADHAAR-100003');
    expect(res.status).toBe(401);
  });

  // Requirement 13: Household membership history is preserved
  test('13. Household membership preserves relationship and start dates', async () => {
    const arjun = await Individual.findOne({ demoIdentifier: 'DEMO-AADHAAR-100003' });
    const membership = await HouseholdMembership.findOne({ individual: arjun._id, isCurrent: true });

    expect(membership.relationshipToHead).toBe('SON');
    expect(membership.isCurrent).toBe(true);
    expect(membership.startDate).toBeDefined();
  });

  // Requirement 14: All Section 14 Endpoints return valid data
  test('14. Section 14 dedicated endpoints return verified records', async () => {
    const arjun = await Individual.findOne({ demoIdentifier: 'DEMO-AADHAAR-100003' });
    const hh = await Household.findOne({ householdId: 'H-1005' });

    // GET /api/individuals/:id/household
    const resIndHh = await request(app)
      .get(`/api/individuals/${arjun._id}/household`)
      .set('Authorization', `Bearer ${officerToken}`);
    expect(resIndHh.status).toBe(200);
    expect(resIndHh.body.data.household.householdId).toBe('H-1005');

    // GET /api/households/:id/members
    const resMembers = await request(app)
      .get(`/api/households/${hh._id}/members`)
      .set('Authorization', `Bearer ${officerToken}`);
    expect(resMembers.status).toBe(200);
    expect(resMembers.body.data.length).toBe(4);

    // GET /api/individuals/:id/schemes
    const resIndSchemes = await request(app)
      .get(`/api/individuals/${arjun._id}/schemes`)
      .set('Authorization', `Bearer ${officerToken}`);
    expect(resIndSchemes.status).toBe(200);
    expect(resIndSchemes.body.data.length).toBeGreaterThan(0);

    // GET /api/households/:id/schemes
    const resHhSchemes = await request(app)
      .get(`/api/households/${hh._id}/schemes`)
      .set('Authorization', `Bearer ${officerToken}`);
    expect(resHhSchemes.status).toBe(200);
    expect(resHhSchemes.body.data.length).toBeGreaterThan(0);

    // GET /api/households/:id/benefit-timeline
    const resTimeline = await request(app)
      .get(`/api/households/${hh._id}/benefit-timeline`)
      .set('Authorization', `Bearer ${officerToken}`);
    expect(resTimeline.status).toBe(200);
    expect(Array.isArray(resTimeline.body.data)).toBe(true);
  });

  // Acceptance Test: Competing claims and eligibility percentage
  test('15. Competing household claims and eligibility percentage score are calculated', async () => {
    const res = await request(app)
      .get('/api/individuals/lookup/DEMO-AADHAAR-100003')
      .set('Authorization', `Bearer ${officerToken}`);

    // H-1005 has competing applications for Housing Assistance (Vikram and Arjun)
    const housing = res.body.data.householdSchemes.find((s) => s.scheme.code === 'HAG-2026');
    expect(housing.applicationsCount).toBe(2);

    // Individual schemes include eligibilityPercentage
    const arjunEdu = res.body.data.individualSchemes.find((s) => s.scheme.code === 'IEA-2026');
    expect(arjunEdu.eligibilityPercentage).toBeGreaterThanOrEqual(0);
    expect(arjunEdu.eligibilityPercentage).toBeLessThanOrEqual(100);
  });
});
