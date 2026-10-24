const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitRecord = require('../models/BenefitRecord');
const DisbursementRecord = require('../models/DisbursementRecord');
const { seedDatabase } = require('../utils/seed');

jest.setTimeout(90000);

let mongoServer;
let educationOfficerToken;
let housingOfficerToken;
let welfareOfficerToken;
let adminToken;
let applicantToken;

let eduScheme;
let housingScheme;
let arjunApplication;
let vikramApplication;

const JWT_SECRET = process.env.JWT_SECRET || 'jansetu-hackathon-techtrix-super-secure-key-2026';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await seedDatabase(true);

  // Retrieve seeded users
  const eduOfficer = await User.findOne({ email: 'officer.education@jansetu.gov.demo' });
  const housingOfficer = await User.findOne({ email: 'officer.housing@jansetu.gov.demo' });
  const welfareOfficer = await User.findOne({ email: 'officer@jansetu.gov.demo' });
  const adminUser = await User.findOne({ email: 'admin@jansetu.gov.demo' });
  const applicantUser = await User.findOne({ email: 'arjun@jansetu.demo' });

  educationOfficerToken = jwt.sign({ id: eduOfficer._id, role: eduOfficer.role }, JWT_SECRET, { expiresIn: '1d' });
  housingOfficerToken = jwt.sign({ id: housingOfficer._id, role: housingOfficer.role }, JWT_SECRET, { expiresIn: '1d' });
  welfareOfficerToken = jwt.sign({ id: welfareOfficer._id, role: welfareOfficer.role }, JWT_SECRET, { expiresIn: '1d' });
  adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1d' });
  applicantToken = jwt.sign({ id: applicantUser._id, role: applicantUser.role }, JWT_SECRET, { expiresIn: '1d' });

  // Retrieve test schemes
  eduScheme = await Scheme.findOne({ code: 'IEA-2026' });
  housingScheme = await Scheme.findOne({ code: 'HAG-2026' });

  // Retrieve test applications
  arjunApplication = await Application.findOne({ applicationId: 'APP-2026-ARJUN-EDU' });
  vikramApplication = await Application.findOne({ applicationId: 'APP-2026-H1005-HOUSING-V' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JANSETU: Security, Scheme-Specific Authority Access & Isolation Tests', () => {
  // Test 1: Scheme-Specific Access Control - 403 Forbidden for unassigned scheme
  test('1. Scheme-Specific Isolation: Education Officer gets 403 Forbidden when accessing Housing Scheme application', async () => {
    const res = await request(app)
      .get(`/api/applications/${vikramApplication._id}`)
      .set('Authorization', `Bearer ${educationOfficerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized|forbidden/i);
  });

  // Test 2: Scheme-Specific Access Control - 200 OK for assigned scheme
  test('2. Scheme-Specific Access: Education Officer gets 200 OK when accessing Education Scheme application', async () => {
    const res = await request(app)
      .get(`/api/applications/${arjunApplication._id}`)
      .set('Authorization', `Bearer ${educationOfficerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.applicationId).toBe('APP-2026-ARJUN-EDU');
  });

  // Test 3: Officer cannot query applications of an unassigned scheme via query parameter
  test('3. Query Parameter Security: Education Officer cannot query applications filtered by Housing Scheme ID', async () => {
    const res = await request(app)
      .get(`/api/applications?schemeId=${housingScheme._id}`)
      .set('Authorization', `Bearer ${educationOfficerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Test 4: Applicant Isolation - Applicant cannot access another citizen application
  test('4. Applicant Data Isolation: Arjun cannot view Vikram application (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/applications/${vikramApplication._id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot view application records submitted by other citizens/i);
  });

  // Test 5: Applicant Isolation - Applicant CAN access their own application
  test('5. Applicant Self-Access: Arjun can view their own education application', async () => {
    const res = await request(app)
      .get(`/api/applications/${arjunApplication._id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.applicationId).toBe('APP-2026-ARJUN-EDU');
  });

  // Test 6: Applicant list query only returns own applications
  test('6. Applicant Query Scoping: GET /api/applications for Arjun only returns Arjun records', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    res.body.data.forEach((appItem) => {
      expect(appItem.applicantIndividual.demoIdentifier).toBe('DEMO-AADHAAR-100003');
    });
  });

  // Test 7: Applicants cannot update application status (403 Forbidden)
  test('7. Unauthorized Action Protection: Applicant cannot change application status', async () => {
    const res = await request(app)
      .patch(`/api/applications/${arjunApplication._id}/status`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ status: 'APPROVED', reason: 'Self-approval attempt' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Test 8: Self-promotion block during registration
  test('8. Self-Promotion Defense: Ordinary registration forces role to APPLICANT even if admin requested', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker User',
        email: 'hacker@test.local',
        password: 'Password@123',
        role: 'SUPER_ADMIN' // Attempt to self-promote
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('APPLICANT');
  });

  // Test 9: Application Review - Mandatory rejection reason
  test('9. Mandatory Justification: Officer cannot reject application without formal justification reason', async () => {
    const res = await request(app)
      .post(`/api/applications/${arjunApplication._id}/review`)
      .set('Authorization', `Bearer ${educationOfficerToken}`)
      .send({ action: 'REJECT' }); // No reason provided

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/mandatory formal justification/i);
  });

  // Test 10: Application Review - Valid Approval creates SANCTIONED BenefitRecord
  test('10. Review Approval Workflow: Officer approval transitions status to APPROVED and creates BenefitRecord in SANCTIONED state', async () => {
    const res = await request(app)
      .post(`/api/applications/${arjunApplication._id}/review`)
      .set('Authorization', `Bearer ${educationOfficerToken}`)
      .send({ action: 'APPROVE', reason: 'All documents verified and compliant with education norms.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');

    const benefit = await BenefitRecord.findOne({ application: arjunApplication._id });
    expect(benefit).not.toBeNull();
    expect(benefit.status).toBe('SANCTIONED');
  });

  // Test 11: DBT Benefit Disbursement - Transitions status to BENEFIT_DISBURSED and creates DisbursementRecord
  test('11. DBT Disbursement Workflow: Disbursing approved benefit creates DisbursementRecord and updates status to BENEFIT_DISBURSED', async () => {
    const res = await request(app)
      .post(`/api/applications/${arjunApplication._id}/disburse`)
      .set('Authorization', `Bearer ${educationOfficerToken}`)
      .send({ paymentReference: 'PFMS-TEST-TXN-998877', notes: 'Direct student bank credit completed.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('BENEFIT_DISBURSED');

    const disb = await DisbursementRecord.findOne({ application: arjunApplication._id });
    expect(disb).not.toBeNull();
    expect(disb.paymentReference).toBe('PFMS-TEST-TXN-998877');
  });

  // Test 12: Interactive Calendar Activity API - Month Aggregation
  test('12. Calendar API: GET /api/calendar/activity returns monthly activity breakdown with daily stats', async () => {
    const res = await request(app)
      .get('/api/calendar/activity')
      .set('Authorization', `Bearer ${welfareOfficerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.days).toBeDefined();
    expect(Array.isArray(res.body.data.days)).toBe(true);
    expect(res.body.data.summary.totalSubmitted).toBeGreaterThan(0);
  });

  // Test 13: Calendar API - Officer Scheme Restriction
  test('13. Calendar Security: Education Officer querying Housing Scheme calendar gets 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/calendar/activity?schemeId=${housingScheme._id}`)
      .set('Authorization', `Bearer ${educationOfficerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Test 14: Analytics & Reports API - Returns all 6 required datasets
  test('14. Reports & Analytics API: GET /api/reports/analytics returns all 6 database-backed chart datasets', async () => {
    const res = await request(app)
      .get('/api/reports/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;

    // Chart 1: Daily Activity
    expect(Array.isArray(d.dailyActivity)).toBe(true);
    // Chart 2: Status Distribution
    expect(Array.isArray(d.statusDistribution)).toBe(true);
    // Chart 3: Clearance Trend
    expect(Array.isArray(d.clearanceTrend)).toBe(true);
    // Chart 4: Scheme Performance
    expect(Array.isArray(d.schemePerformance)).toBe(true);
    // Chart 5: Application Age Breakdown
    expect(Array.isArray(d.applicationAgeBreakdown)).toBe(true);
    expect(d.applicationAgeBreakdown.length).toBe(4);
    // Chart 6: Household Allocation Cases
    expect(Array.isArray(d.householdAllocationCases)).toBe(true);
  });

  // Test 15: Demo accounts endpoint returns dual portals
  test('15. Dual-Portal Demo Accounts: GET /api/auth/demo-accounts returns applicant and authority demo profiles', async () => {
    const res = await request(app).get('/api/auth/demo-accounts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const accounts = res.body.accounts;

    const applicantAcc = accounts.find((a) => a.portal === 'APPLICANT');
    const officerEduAcc = accounts.find((a) => a.email === 'officer.education@jansetu.gov.demo');
    const officerHousingAcc = accounts.find((a) => a.email === 'officer.housing@jansetu.gov.demo');

    expect(applicantAcc).toBeDefined();
    expect(officerEduAcc).toBeDefined();
    expect(officerHousingAcc).toBeDefined();
  });
});
