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
const { assessEligibility } = require('../services/eligibilityEngine');

jest.setTimeout(90000);

let mongoServer;
let officerToken;
let adminToken;
let officerUser;
let adminUser;

let testSchemeSanitation;
let testSchemeEducation;
let testProp100;
let testHousehold100;
let testHousehold101;
let testIndRahul;
let testIndAmit;
let testIndSuresh;
let testPriorSanitationBenefit;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create Officer and Admin
  officerUser = await User.create({
    name: 'Pooja Verma',
    email: 'officer@test.com',
    password: 'Password@123',
    role: 'WELFARE_OFFICER'
  });

  adminUser = await User.create({
    name: 'Vikram Singhania',
    email: 'admin@test.com',
    password: 'Password@123',
    role: 'RECORDS_ADMIN'
  });

  // Login to get tokens
  const officerLogin = await request(app).post('/api/auth/login').send({
    email: 'officer@test.com',
    password: 'Password@123'
  });
  officerToken = officerLogin.body.token;

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@test.com',
    password: 'Password@123'
  });
  adminToken = adminLogin.body.token;

  // Set up test entities
  testSchemeSanitation = await Scheme.create({
    schemeId: 'TEST-SCH-002',
    name: 'Household Sanitation Support',
    code: 'TEST-HSS',
    description: '1 per property',
    benefitScope: 'PROPERTY',
    maxBenefitAmount: 12000,
    allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
    isActive: true
  });

  testSchemeEducation = await Scheme.create({
    schemeId: 'TEST-SCH-001',
    name: 'Individual Education Assistance',
    code: 'TEST-IEA',
    description: 'Individual education grant',
    benefitScope: 'INDIVIDUAL',
    maxBenefitAmount: 15000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    minAgeYears: 5,
    maxAgeYears: 30,
    isActive: true
  });

  testProp100 = await Property.create({
    propertyId: 'TEST-PROP-100',
    propertyType: 'RESIDENTIAL',
    addressLine1: 'Plot 42, Adarsh Nagar',
    district: 'Jaipur'
  });

  testHousehold100 = await Household.create({
    householdId: 'TEST-HH-100',
    addressLine1: 'House 14, Adarsh Nagar',
    district: 'Jaipur'
  });

  testHousehold101 = await Household.create({
    householdId: 'TEST-HH-101',
    addressLine1: 'House 88, Civil Lines',
    district: 'Ajmer'
  });

  testIndRahul = await Individual.create({
    individualId: 'TEST-IND-001',
    fullName: 'Rahul Sharma',
    gender: 'MALE',
    dateOfBirth: new Date('1997-01-01'),
    incomeCategory: 'BPL',
    currentHousehold: testHousehold100._id
  });

  testIndAmit = await Individual.create({
    individualId: 'TEST-IND-002',
    fullName: 'Amit Sharma',
    gender: 'MALE',
    dateOfBirth: new Date('2001-01-01'),
    incomeCategory: 'BPL',
    currentHousehold: testHousehold100._id
  });

  testIndSuresh = await Individual.create({
    individualId: 'TEST-IND-003',
    fullName: 'Suresh Verma',
    gender: 'MALE',
    dateOfBirth: new Date('1995-01-01'),
    incomeCategory: 'APL', // APL for income test
    currentHousehold: testHousehold101._id
  });

  // Prior benefit: Sanitation granted on Property testProp100
  testPriorSanitationBenefit = await BenefitRecord.create({
    recordId: 'TEST-BR-001',
    scheme: testSchemeSanitation._id,
    recipientIndividual: testIndRahul._id,
    recipientHousehold: testHousehold100._id,
    recipientProperty: testProp100._id,
    benefitAmount: 12000,
    sanctionDate: new Date('2025-01-01'),
    status: 'DISBURSED'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JanSetu Core Rules & System Tests', () => {
  // Test 1: Same verified property and an existing relevant benefit produce a potential duplicate alert
  test('Rule 1: Same verified property with existing relevant benefit produces a potential duplicate alert', async () => {
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: testSchemeSanitation._id,
        applicantIndividualId: testIndAmit._id,
        householdId: testHousehold100._id,
        propertyId: testProp100._id,
        requestedAmount: 12000,
        remarks: 'Second claim on same property'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.hasDuplicateAlert).toBe(true);
    expect(res.body.data.duplicateAlerts.length).toBeGreaterThan(0);
    expect(res.body.data.duplicateAlerts[0].candidateType).toBe('PROPERTY');
    expect(res.body.data.duplicateAlerts[0].triggeringRule).toBe('RULE_PROPERTY_BENEFIT_LIMIT_EXCEEDED');
  });

  // Test 2: A relative's unrelated benefit does NOT trigger a duplicate alert
  test('Rule 2: A relative who received an unrelated benefit (sanitation) does NOT cause duplicate alert for education scheme', async () => {
    const res = await request(app)
      .post('/api/applications/submit')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        schemeId: testSchemeEducation._id,
        applicantIndividualId: testIndAmit._id,
        householdId: testHousehold100._id,
        propertyId: testProp100._id,
        requestedAmount: 15000,
        remarks: 'Scholarship assistance'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.hasDuplicateAlert).toBe(false);
    expect(res.body.data.duplicateAlerts.length).toBe(0);
    expect(res.body.data.application.eligibilityStatus).toBe('ELIGIBLE');
  });

  // Test 3: Different verified households and properties are assessed independently
  test('Rule 3: Separate verified households and properties are assessed independently', async () => {
    const evalResult = await assessEligibility({
      scheme: testSchemeSanitation,
      applicant: testIndSuresh,
      household: testHousehold101,
      property: null // no property association with P-100
    });

    // Does NOT trigger P-100 property duplicate
    const propertyAlert = evalResult.duplicateResult.alerts.find((a) => a.candidateType === 'PROPERTY');
    expect(propertyAlert).toBeUndefined();
  });

  // Test 4: Income categories are evaluated according to configured scheme rules
  test('Rule 4: Income categories are evaluated according to configured scheme rules', async () => {
    // testIndSuresh is APL; testSchemeEducation only allows BPL and AAY
    const evalResult = await assessEligibility({
      scheme: testSchemeEducation,
      applicant: testIndSuresh,
      household: testHousehold101,
      property: null
    });

    expect(evalResult.overallResult).toBe('INELIGIBLE');
    const incomeCheck = evalResult.checksFailed.find((c) => c.ruleName === 'RULE_INCOME_CATEGORY_COMPLIANCE');
    expect(incomeCheck).toBeDefined();
    expect(incomeCheck.reason).toContain('Scheme requires category to be one of');
  });

  // Test 5: An approved but undisbursed application is not treated as a completed payment
  test('Rule 5: An approved application without disbursement is SANCTIONED, not DISBURSED', async () => {
    const appDoc = await Application.create({
      applicationId: 'TEST-APP-099',
      scheme: testSchemeEducation._id,
      applicantIndividual: testIndRahul._id,
      requestedAmount: 15000,
      status: 'APPROVED'
    });

    // Check disbursement record
    const disb = await DisbursementRecord.findOne({ application: appDoc._id });
    expect(disb).toBeNull(); // No payment has occurred!

    // Attempting disbursement endpoint creates completed payment
    const disbRes = await request(app)
      .post('/api/disbursements/record')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        applicationId: appDoc._id,
        amount: 15000,
        paymentReference: 'PFMS-TEST-001'
      });

    expect(disbRes.status).toBe(201);
    expect(disbRes.body.success).toBe(true);

    const updatedApp = await Application.findById(appDoc._id);
    expect(updatedApp.status).toBe('BENEFIT_DISBURSED');
  });

  // Test 6: A potential duplicate is NOT automatically rejected
  test('Rule 6: A potential duplicate application is placed UNDER_REVIEW, not automatically rejected', async () => {
    const flaggedApp = await Application.findOne({ hasDuplicateAlert: true });
    expect(flaggedApp).not.toBeNull();
    expect(flaggedApp.status).not.toBe('REJECTED');
    expect(['UNDER_REVIEW', 'VERIFICATION_PENDING']).toContain(flaggedApp.status);
  });

  // Test 7: An officer can record a review decision and reason
  test('Rule 7: An authorized officer can record a duplicate review decision with mandatory reason', async () => {
    const alert = await DuplicateAlert.findOne({ status: 'PENDING_REVIEW' });
    expect(alert).not.toBeNull();

    const reviewRes = await request(app)
      .post(`/api/duplicate-alerts/${alert._id}/decision`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        decision: 'CONFIRMED_DUPLICATE',
        reasonNotes: 'Field inspection confirms single structural toilet already built on Plot 42-A.',
        actionTaken: 'Rejected concurrent duplicate claim.'
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.data.alert.status).toBe('CONFIRMED_DUPLICATE');
    expect(reviewRes.body.data.reviewDecision.reasonNotes).toContain('Field inspection confirms');
  });

  // Test 8: Household membership changes preserve historical records
  test('Rule 8: Moving or splitting household members preserves historical records', async () => {
    // Add initial membership
    await HouseholdMembership.create({
      individual: testIndAmit._id,
      household: testHousehold100._id,
      relationshipToHead: 'BROTHER',
      startDate: new Date('2020-01-01'),
      isCurrent: true
    });

    const moveRes = await request(app)
      .post('/api/households/move-member')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        individualId: testIndAmit._id,
        fromHouseholdId: testHousehold100._id,
        toHouseholdId: testHousehold101._id,
        reason: 'Marriage and independent relocation',
        relationshipToHead: 'HEAD'
      });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.success).toBe(true);

    // Verify historical membership is preserved
    const allMemberships = await HouseholdMembership.find({ individual: testIndAmit._id }).sort({ startDate: 1 });
    expect(allMemberships.length).toBeGreaterThanOrEqual(2);
    const pastRecord = allMemberships.find((m) => !m.isCurrent);
    expect(pastRecord).toBeDefined();
    expect(pastRecord.reasonForChange).toContain('Moved to');
  });

  // Test 9: A welfare officer cannot access administrator-only endpoints
  test('Rule 9: Welfare Officer cannot access administrator-only endpoints (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/households')
      .set('Authorization', `Bearer ${officerToken}`) // Officer trying to create household
      .send({
        addressLine1: 'Unauthorized creation attempt',
        district: 'Jaipur'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access forbidden');
  });

  // Test 10: Dashboard metrics match MongoDB records
  test('Rule 10: Dashboard metrics strictly reflect MongoDB collection totals', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const actualIndCount = await Individual.countDocuments();
    const actualHHCount = await Household.countDocuments();
    const actualPropCount = await Property.countDocuments();

    expect(res.body.data.metrics.totalIndividuals).toBe(actualIndCount);
    expect(res.body.data.metrics.totalHouseholds).toBe(actualHHCount);
    expect(res.body.data.metrics.totalProperties).toBe(actualPropCount);
  });
});
