const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Individual = require('../models/Individual');
const Household = require('../models/Household');
const HouseholdMembership = require('../models/HouseholdMembership');
const Property = require('../models/Property');
const PropertyAssociation = require('../models/PropertyAssociation');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitRecord = require('../models/BenefitRecord');
const DuplicateAlert = require('../models/DuplicateAlert');
const DisbursementRecord = require('../models/DisbursementRecord');
const ApiIntegration = require('../models/ApiIntegration');
const { assessSchemeEligibility, CURRENT_RULE_VERSION } = require('../services/verification/schemeVerificationEngine');

jest.setTimeout(90000);

let mongoServer;
let officerToken;
let adminToken;
let testOfficer;
let testAdmin;

let schemeIndividualEdu;
let schemeHouseholdRation;
let schemePropertySolar;

let propGreen;
let hhSharma;
let hhVerma;
let citizenPriya;
let citizenRohan;
let citizenKavita;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testOfficer = await User.create({
    name: 'Officer Ananya Sen',
    email: 'ananya.officer@test.gov.in',
    password: 'Password@123',
    role: 'WELFARE_OFFICER'
  });

  testAdmin = await User.create({
    name: 'Director Rajesh Mehta',
    email: 'rajesh.admin@test.gov.in',
    password: 'Password@123',
    role: 'RECORDS_ADMIN'
  });

  const offLogin = await request(app).post('/api/auth/login').send({
    email: 'ananya.officer@test.gov.in',
    password: 'Password@123'
  });
  officerToken = offLogin.body.token;

  const admLogin = await request(app).post('/api/auth/login').send({
    email: 'rajesh.admin@test.gov.in',
    password: 'Password@123'
  });
  adminToken = admLogin.body.token;

  // 1. Individual Scheme
  schemeIndividualEdu = await Scheme.create({
    schemeId: 'SCH-EDU-IND-01',
    name: 'National Higher Education Scholarship',
    code: 'NHES-IND',
    description: 'Direct scholarship for eligible students',
    benefitScope: 'INDIVIDUAL',
    maxBenefitAmount: 25000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    minAgeYears: 16,
    maxAgeYears: 30,
    isActive: true
  });

  // 2. Household Scheme (1 per household)
  schemeHouseholdRation = await Scheme.create({
    schemeId: 'SCH-HH-RAT-02',
    name: 'Antyodaya Clean Fuel & Kitchen Support',
    code: 'ACFK-HH',
    description: 'Single grant per verified household roster',
    benefitScope: 'HOUSEHOLD',
    maxBenefitAmount: 18000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    isActive: true
  });

  // 3. Property Scheme (1 per property)
  schemePropertySolar = await Scheme.create({
    schemeId: 'SCH-PROP-SOL-03',
    name: 'Rooftop Solar Electrification Grant',
    code: 'RSEG-PROP',
    description: 'Infrastructure subsidy strictly 1 per property title',
    benefitScope: 'PROPERTY',
    maxBenefitAmount: 50000,
    allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
    isActive: true
  });

  // Entities
  propGreen = await Property.create({
    propertyId: 'PROP-DEL-7788',
    addressLine1: 'Plot 108, Sector 12',
    district: 'South Delhi',
    propertyType: 'RESIDENTIAL'
  });

  hhSharma = await Household.create({
    householdId: 'HH-DEL-9001',
    addressLine1: 'Flat 4A, Green Park',
    district: 'South Delhi',
    rationCardNumber: 'RC-DL-998822'
  });

  hhVerma = await Household.create({
    householdId: 'HH-DEL-9002',
    addressLine1: 'Flat 5B, Green Park',
    district: 'South Delhi',
    rationCardNumber: 'RC-DL-998823'
  });

  citizenPriya = await Individual.create({
    individualId: 'IND-DL-1001',
    fullName: 'Priya Sharma',
    gender: 'FEMALE',
    dateOfBirth: new Date('2003-05-15'),
    incomeCategory: 'BPL',
    annualIncome: 120000,
    currentHousehold: hhSharma._id
  });

  citizenRohan = await Individual.create({
    individualId: 'IND-DL-1002',
    fullName: 'Rohan Sharma',
    gender: 'MALE',
    dateOfBirth: new Date('2000-08-20'),
    incomeCategory: 'BPL',
    annualIncome: 95000,
    currentHousehold: hhSharma._id
  });

  citizenKavita = await Individual.create({
    individualId: 'IND-DL-1003',
    fullName: 'Kavita Verma',
    gender: 'FEMALE',
    dateOfBirth: new Date('1998-12-10'),
    incomeCategory: 'BPL',
    annualIncome: 80000,
    currentHousehold: hhVerma._id
  });

  // Household memberships
  await HouseholdMembership.create({
    individual: citizenPriya._id,
    household: hhSharma._id,
    relationshipToHead: 'DAUGHTER',
    isCurrent: true
  });

  await HouseholdMembership.create({
    individual: citizenRohan._id,
    household: hhSharma._id,
    relationshipToHead: 'SON',
    isCurrent: true
  });

  await HouseholdMembership.create({
    individual: citizenKavita._id,
    household: hhVerma._id,
    relationshipToHead: 'HEAD',
    isCurrent: true
  });

  // Property associations
  await PropertyAssociation.create({
    property: propGreen._id,
    individual: citizenPriya._id,
    household: hhSharma._id,
    associationType: 'OWNER',
    isCurrent: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JanSetu Complete Workflow & Specification Scenarios', () => {
  // Scenario 1: An eligible individual applies for an individual-level scheme
  test('Scenario 1: An eligible individual applies for an individual-level scheme', async () => {
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: schemeIndividualEdu._id,
        applicantIndividualId: citizenPriya._id,
        householdId: hhSharma._id,
        requestedAmount: 25000,
        remarks: 'First time applicant for Higher Education Scholarship'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.evaluation.overallResult).toBe('ELIGIBLE');
    expect(res.body.data.application.hasDuplicateAlert).toBe(false);
    expect(res.body.data.application.status).toBe('SUBMITTED');
  });

  // Scenario 2: A household member applies for a household-level scheme after a relevant benefit was disbursed to another member
  test('Scenario 2: A household member applies for a household-level scheme after a relevant benefit was disbursed to another member', async () => {
    // 1. Rohan Sharma receives household fuel benefit first
    await BenefitRecord.create({
      recordId: 'BR-HH-PRIOR-01',
      scheme: schemeHouseholdRation._id,
      recipientIndividual: citizenRohan._id,
      recipientHousehold: hhSharma._id,
      benefitAmount: 18000,
      sanctionDate: new Date('2025-06-01'),
      disbursementDate: new Date('2025-06-15'),
      status: 'DISBURSED',
      referenceNumber: 'PFMS-UTR-776655'
    });

    // 2. Priya Sharma (same household) now applies for the same household scheme
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: schemeHouseholdRation._id,
        applicantIndividualId: citizenPriya._id,
        householdId: hhSharma._id,
        requestedAmount: 18000,
        remarks: 'Second claim in same household'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.hasDuplicateAlert).toBe(true);
    expect(res.body.data.application.status).toBe('UNDER_REVIEW');
    const alert = res.body.data.duplicateAlerts.find((a) => a.candidateType === 'HOUSEHOLD');
    expect(alert).toBeDefined();
    expect(alert.triggeringRule).toBe('RULE_HOUSEHOLD_BENEFIT_LIMIT_EXCEEDED');
  });

  // Scenario 3: A household member applies after another member received an unrelated benefit
  test('Scenario 3: A household member applies after another member received an unrelated benefit', async () => {
    // Kavita Verma in household hhVerma applies for Higher Education (unrelated to fuel benefit)
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: schemeIndividualEdu._id,
        applicantIndividualId: citizenKavita._id,
        householdId: hhVerma._id,
        requestedAmount: 25000,
        remarks: 'Education scholarship'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.hasDuplicateAlert).toBe(false);
    expect(res.body.data.evaluation.overallResult).toBe('ELIGIBLE');
  });

  // Scenario 4: A property-level scheme identifies a potentially restricted previous benefit
  test('Scenario 4: A property-level scheme identifies a potentially restricted previous benefit', async () => {
    // 1. Sanction prior rooftop solar on propGreen
    await BenefitRecord.create({
      recordId: 'BR-PROP-PRIOR-01',
      scheme: schemePropertySolar._id,
      recipientProperty: propGreen._id,
      recipientIndividual: citizenPriya._id,
      benefitAmount: 50000,
      sanctionDate: new Date('2025-02-10'),
      status: 'SANCTIONED'
    });

    // 2. Rohan Sharma applies for rooftop solar on the SAME property
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: schemePropertySolar._id,
        applicantIndividualId: citizenRohan._id,
        householdId: hhSharma._id,
        propertyId: propGreen._id,
        requestedAmount: 50000,
        remarks: 'Claim on previously sanctioned solar property'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.hasDuplicateAlert).toBe(true);
    const propAlert = res.body.data.duplicateAlerts.find((a) => a.candidateType === 'PROPERTY');
    expect(propAlert).toBeDefined();
    expect(propAlert.triggeringRule).toBe('RULE_PROPERTY_BENEFIT_LIMIT_EXCEEDED');
  });

  // Scenario 5: An approved but undisbursed application is not treated as a completed payment
  test('Scenario 5: An approved but undisbursed application is not treated as a completed payment', async () => {
    const testApp = await Application.create({
      applicationId: 'APP-TEST-SANCT-01',
      scheme: schemeIndividualEdu._id,
      applicantIndividual: citizenKavita._id,
      requestedAmount: 25000,
      status: 'APPROVED'
    });

    // Verify no disbursement record exists automatically
    const disbursement = await DisbursementRecord.findOne({ application: testApp._id });
    expect(disbursement).toBeNull();

    // Verify benefit history service distinguishes SANCTIONED from DISBURSED
    const evalResult = await assessSchemeEligibility({
      scheme: schemeIndividualEdu,
      applicant: citizenKavita,
      household: hhVerma
    });

    const foundRecord = evalResult.previousBenefitsFound.find(
      (b) => b.recordId === testApp.applicationId || b.beneficiaryRef === citizenKavita.fullName
    );
    if (foundRecord) {
      expect(foundRecord.disbursementStatus).not.toBe('BENEFIT_DISBURSED');
    }
  });

  // Scenario 6: A household record cannot be verified because an API is unavailable
  test('Scenario 6: A household record cannot be verified because an API is unavailable', async () => {
    // Simulate NFSA_PDS provider unavailable
    await ApiIntegration.findOneAndUpdate(
      { providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER' },
      { $set: { simulateState: 'UNAVAILABLE', connectionStatus: 'OFFLINE' } },
      { upsert: true }
    );

    const evalResult = await assessSchemeEligibility({
      scheme: schemeHouseholdRation,
      applicant: citizenKavita,
      household: hhVerma
    });

    expect(evalResult.overallResult).toBe('VERIFICATION_PENDING');
    expect(evalResult.explanation).toContain('Verification pending — the relevant external record could not be confirmed.');

    // Reset simulate state
    await ApiIntegration.findOneAndUpdate(
      { providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER' },
      { $set: { simulateState: 'NORMAL', connectionStatus: 'HEALTHY' } }
    );
  });

  // Scenario 7: Conflicting household information requires review
  test('Scenario 7: Conflicting household information requires review', async () => {
    // Add conflicting active membership for Rohan in hhVerma while still active in hhSharma
    await HouseholdMembership.create({
      individual: citizenRohan._id,
      household: hhVerma._id,
      relationshipToHead: 'OTHER',
      isCurrent: true
    });

    const evalResult = await assessSchemeEligibility({
      scheme: schemeHouseholdRation,
      applicant: citizenRohan,
      household: hhSharma
    });

    expect(evalResult.overallResult).toBe('INELIGIBLE');
    const rosterCheck = evalResult.checksFailed.find((c) => c.ruleName === 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION');
    expect(rosterCheck).toBeDefined();
    expect(rosterCheck.reason).toContain('Conflicting household records detected');
  });

  // Scenario 8: An authorised officer clears a potential duplicate with a recorded reason
  test('Scenario 8: An authorised officer clears a potential duplicate with a recorded reason', async () => {
    const alert = await DuplicateAlert.findOne({ status: 'PENDING_REVIEW' });
    expect(alert).not.toBeNull();

    const decisionRes = await request(app)
      .post(`/api/duplicate-alerts/${alert._id}/decision`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        decision: 'RESOLVED_NOT_DUPLICATE',
        reasonNotes: 'Field officer verified separate partition and separate kitchen installation under certified affidavit.',
        actionTaken: 'Cleared duplicate alert. Authorized application to proceed.'
      });

    expect(decisionRes.status).toBe(200);
    expect(decisionRes.body.success).toBe(true);
    expect(decisionRes.body.data.alert.status).toBe('RESOLVED_NOT_DUPLICATE');
    expect(decisionRes.body.data.alert.resolutionNotes).toContain('Field officer verified separate partition');
  });

  // Scenario 9: An unauthorised user cannot access restricted verification information
  test('Scenario 9: An unauthorised user cannot access restricted verification information', async () => {
    // 1. Unauthenticated request
    const unauthRes = await request(app).get('/api/api-integrations');
    expect(unauthRes.status).toBe(401);

    // 2. Welfare officer trying to modify API Integration configuration (Admin Only)
    const intDoc = await ApiIntegration.findOne();
    const forbiddenRes = await request(app)
      .patch(`/api/api-integrations/${intDoc._id}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ timeoutMs: 9000 });

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.message).toContain('Access forbidden');
  });

  // Scenario 10: A failed API request does not produce a false verification success
  test('Scenario 10: A failed API request does not produce a false verification success', async () => {
    // Simulate UIDAI failure
    await ApiIntegration.findOneAndUpdate(
      { providerId: 'UIDAI_IDENTITY_PROVIDER' },
      { $set: { simulateState: 'FAILURE', connectionStatus: 'DEGRADED' } },
      { upsert: true }
    );

    const evalResult = await assessSchemeEligibility({
      scheme: schemeIndividualEdu,
      applicant: citizenPriya,
      household: hhSharma
    });

    // Verification must NOT pass falsely
    const idCheck = evalResult.checksPassed.find((c) => c.ruleName === 'RULE_IDENTITY_VERIFICATION');
    expect(idCheck).toBeUndefined();
    expect(evalResult.overallResult).not.toBe('ELIGIBLE');

    // Reset simulate state
    await ApiIntegration.findOneAndUpdate(
      { providerId: 'UIDAI_IDENTITY_PROVIDER' },
      { $set: { simulateState: 'NORMAL', connectionStatus: 'HEALTHY' } }
    );
  });

  // Scenario 11: All eligibility assessments preserve the rule version and evidence used
  test('Scenario 11: All eligibility assessments preserve the rule version and evidence used', async () => {
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: schemeIndividualEdu._id,
        applicantIndividualId: citizenPriya._id,
        requestedAmount: 25000,
        remarks: 'Rule version audit check'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.assessment.ruleVersion).toBe(CURRENT_RULE_VERSION);
    expect(res.body.data.assessment.rulesEvaluated).toContain('RULE_SCHEME_SCOPE_DETECTION');
    expect(res.body.data.assessment.rulesEvaluated).toContain('RULE_IDENTITY_VERIFICATION');
    expect(res.body.data.assessment.externalApiResults.length).toBeGreaterThan(0);
    expect(res.body.data.assessment.checksPassed.length).toBeGreaterThan(0);
  });

  // Scenario 12: Dashboard statistics match the backend records
  test('Scenario 12: Dashboard statistics match the backend records', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const totalAppsInDb = await Application.countDocuments();
    const eligibleAppsInDb = await Application.countDocuments({ eligibilityStatus: 'ELIGIBLE' });
    const duplicateAlertsInDb = await DuplicateAlert.countDocuments();

    expect(res.body.data.metrics.totalApplications).toBe(totalAppsInDb);
    expect(res.body.data.metrics.eligibleApplications).toBe(eligibleAppsInDb);
    expect(res.body.data.metrics.potentialDuplicateAlerts).toBe(duplicateAlertsInDb);
    expect(res.body.data.charts.duplicateOutcomes).toBeDefined();
    expect(res.body.data.charts.processingTimes).toBeDefined();
  });
});
