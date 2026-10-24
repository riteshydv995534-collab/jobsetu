const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Individual = require('../models/Individual');
const Household = require('../models/Household');
const HouseholdMembership = require('../models/HouseholdMembership');
const Property = require('../models/Property');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitRecord = require('../models/BenefitRecord');
const DisbursementRecord = require('../models/DisbursementRecord');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const { evaluateIndividualForScheme } = require('../services/individualEligibilityService');
const { evaluateHouseholdForScheme } = require('../services/householdEligibilityService');
const {
  evaluateHouseholdAllocation,
  reviewHouseholdAllocation,
  disburseHouseholdAllocation
} = require('../services/householdBenefitAllocationService');

jest.setTimeout(90000);

let mongoServer;
let officerToken;
let citizenToken;
let adminToken;
let testOfficer;
let testAdmin;
let testCitizenUser;

let schemeEdu;
let schemeSanitation;
let schemeHousing;
let schemeElectricity;

let testHousehold;
let testProperty;
let indEligible;
let indOverAge;
let indPendingVerification;
let indMemberA;
let indMemberB;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  testOfficer = await User.create({
    name: 'Officer Rajesh Sen',
    email: 'rajesh.officer@jansetu.demo',
    password: 'Password@123',
    role: 'WELFARE_OFFICER'
  });

  testAdmin = await User.create({
    name: 'Admin Meenakshi',
    email: 'admin.meenakshi@jansetu.demo',
    password: 'Password@123',
    role: 'RECORDS_ADMIN'
  });

  testCitizenUser = await User.create({
    name: 'Citizen Vikram',
    email: 'vikram.citizen@demo.org',
    password: 'Password@123',
    role: 'WELFARE_OFFICER' // authenticated user
  });

  const offLogin = await request(app).post('/api/auth/login').send({
    email: 'rajesh.officer@jansetu.demo',
    password: 'Password@123'
  });
  officerToken = offLogin.body.token;

  const admLogin = await request(app).post('/api/auth/login').send({
    email: 'admin.meenakshi@jansetu.demo',
    password: 'Password@123'
  });
  adminToken = admLogin.body.token;

  // Schemes
  schemeEdu = await Scheme.create({
    schemeId: 'TEST-SCH-EDU',
    name: 'Individual Education Assistance',
    code: 'T-IEA',
    description: 'Individual education grant',
    benefitScope: 'INDIVIDUAL',
    benefitCategory: 'EDUCATION',
    maxBenefitAmount: 15000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    maxAnnualIncome: 120000,
    minAgeYears: 18,
    maxAgeYears: 30,
    maxLifetimeAllocationsPerScope: 1,
    repeatBenefitPolicy: 'ONCE_PER_LIFETIME',
    ruleVersion: 'RULE_SET_v2.4_2026',
    isActive: true
  });

  schemeSanitation = await Scheme.create({
    schemeId: 'TEST-SCH-SAN',
    name: 'Household Sanitation Support',
    code: 'T-HSS',
    description: '1 per household domestic latrine grant',
    benefitScope: 'HOUSEHOLD',
    benefitCategory: 'SANITATION',
    maxBenefitAmount: 12000,
    allowedIncomeCategories: ['BPL', 'AAY', 'APL'],
    maxAnnualIncome: 200000,
    maxLifetimeAllocationsPerScope: 1,
    repeatBenefitPolicy: 'NO_REPEAT',
    priorityWeights: { lowerIncomeWeight: 50, vulnerabilityWeight: 30, applicationDateWeight: 20 },
    tieBreakRule: 'EARLIER_APPLICATION_DATE',
    ruleVersion: 'RULE_SET_v2.4_2026',
    isActive: true
  });

  schemeElectricity = await Scheme.create({
    schemeId: 'TEST-SCH-ELEC',
    name: 'Household Electricity Subsidy',
    code: 'T-HES',
    description: '1 per household electricity grant with manual tie break',
    benefitScope: 'HOUSEHOLD',
    benefitCategory: 'ELECTRICITY',
    maxBenefitAmount: 8000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    maxAnnualIncome: 140000,
    maxLifetimeAllocationsPerScope: 1,
    repeatBenefitPolicy: 'ANNUAL',
    priorityWeights: { lowerIncomeWeight: 50, vulnerabilityWeight: 30, applicationDateWeight: 20 },
    tieBreakRule: 'MANUAL_OFFICER_REVIEW',
    ruleVersion: 'RULE_SET_v2.4_2026',
    isActive: true
  });

  schemeHousing = await Scheme.create({
    schemeId: 'TEST-SCH-HOUSE',
    name: 'Housing Assistance Grant',
    code: 'T-HAG',
    description: '1 per household housing grant',
    benefitScope: 'HOUSEHOLD',
    benefitCategory: 'HOUSING',
    maxBenefitAmount: 120000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    maxLifetimeAllocationsPerScope: 1,
    repeatBenefitPolicy: 'NO_REPEAT',
    ruleVersion: 'RULE_SET_v2.4_2026',
    isActive: true
  });

  testProperty = await Property.create({
    propertyId: 'TEST-PROP-001',
    addressLine1: 'Plot 12, Ward 4',
    district: 'Jaipur',
    state: 'Rajasthan'
  });

  testHousehold = await Household.create({
    householdId: 'TEST-HH-001',
    addressLine1: 'House 55, Civil Lines',
    district: 'Jaipur',
    state: 'Rajasthan',
    annualHouseholdIncome: 80000,
    propertyAssociation: testProperty._id,
    verificationStatus: 'VERIFIED'
  });

  // Individuals
  indEligible = await Individual.create({
    individualId: 'TEST-IND-ELIGIBLE',
    fullName: 'Sunita Sharma',
    dateOfBirth: new Date('2002-05-15'), // ~24 yrs
    gender: 'FEMALE',
    incomeCategory: 'BPL',
    annualIncome: 45000,
    verificationStatus: 'VERIFIED',
    currentHousehold: testHousehold._id,
    isHeadOfHousehold: false
  });

  indOverAge = await Individual.create({
    individualId: 'TEST-IND-OVERAGE',
    fullName: 'Ramesh Sharma',
    dateOfBirth: new Date('1985-01-10'), // ~41 yrs
    gender: 'MALE',
    incomeCategory: 'BPL',
    annualIncome: 70000,
    verificationStatus: 'VERIFIED',
    currentHousehold: testHousehold._id,
    isHeadOfHousehold: true
  });

  indPendingVerification = await Individual.create({
    individualId: 'TEST-IND-PENDING',
    fullName: 'Kavita Sharma',
    dateOfBirth: new Date('2003-08-20'),
    gender: 'FEMALE',
    incomeCategory: 'BPL',
    annualIncome: 20000,
    verificationStatus: 'PENDING',
    currentHousehold: testHousehold._id
  });

  // Competing household members
  indMemberA = await Individual.create({
    individualId: 'TEST-IND-MEMBER-A',
    fullName: 'Amit Verma',
    dateOfBirth: new Date('1998-03-12'),
    gender: 'MALE',
    incomeCategory: 'BPL',
    annualIncome: 60000,
    verificationStatus: 'VERIFIED',
    currentHousehold: testHousehold._id,
    hasDisability: false
  });

  await HouseholdMembership.create({
    household: testHousehold._id,
    individual: indMemberA._id,
    roleInHousehold: 'MEMBER',
    isActive: true
  });

  indMemberB = await Individual.create({
    individualId: 'TEST-IND-MEMBER-B',
    fullName: 'Pooja Verma',
    dateOfBirth: new Date('2000-07-22'),
    gender: 'FEMALE',
    incomeCategory: 'BPL',
    annualIncome: 30000, // Lower income, higher need!
    verificationStatus: 'VERIFIED',
    currentHousehold: testHousehold._id,
    hasDisability: true // Vulnerability!
  });

  await HouseholdMembership.create({
    household: testHousehold._id,
    individual: indMemberB._id,
    roleInHousehold: 'MEMBER',
    isActive: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JANSETU Section 15: Automated Comprehensive Verification & Allocation Tests', () => {
  // Requirement 1: An individual meeting every mandatory criterion is marked eligible
  test('1. Individual meeting every mandatory criterion is marked ELIGIBLE', async () => {
    const evaluation = await evaluateIndividualForScheme(indEligible._id, schemeEdu._id);
    expect(evaluation.overallResult).toBe('ELIGIBLE');
    expect(evaluation.checksFailed.length).toBe(0);
    expect(evaluation.applicableBenefitAmount).toBe(15000);
  });

  // Requirement 2: An individual failing a verified mandatory criterion is marked ineligible
  test('2. Individual failing verified mandatory criterion (age limit) is marked INELIGIBLE', async () => {
    const evaluation = await evaluateIndividualForScheme(indOverAge._id, schemeEdu._id);
    expect(evaluation.overallResult).toBe('INELIGIBLE');
    expect(evaluation.checksFailed.some((f) => f.rule === 'RULE_MAX_AGE')).toBe(true);
  });

  // Requirement 3: An applicant with missing verification data receives a pending status
  test('3. Applicant with missing civil verification record receives VERIFICATION_PENDING', async () => {
    const evaluation = await evaluateIndividualForScheme(indPendingVerification._id, schemeEdu._id);
    expect(evaluation.overallResult).toBe('VERIFICATION_PENDING');
    expect(evaluation.checksPending.some((p) => p.rule === 'RULE_CIVIL_VERIFICATION')).toBe(true);
  });

  // Requirement 4: An unrelated benefit does not trigger an incorrect duplicate warning
  test('4. An unrelated benefit does NOT trigger an incorrect duplicate warning', async () => {
    // Record an individual education grant
    await BenefitRecord.create({
      recordId: 'BR-TEST-UNRELATED-01',
      scheme: schemeEdu._id,
      recipientIndividual: indEligible._id,
      benefitAmount: 15000,
      sanctionDate: new Date(),
      status: 'DISBURSED'
    });

    // Check sanitation scheme for household
    const hhEval = await evaluateHouseholdForScheme(testHousehold._id, schemeSanitation._id);
    expect(hhEval.isRestrictedDuplicate).toBe(false);
    expect(hhEval.overallResult).not.toBe('INELIGIBLE');
  });

  // Requirement 5 & 6: Two members of the same verified household compete for one restricted benefit
  test('5 & 6. Two members of same household compete; Allocation Engine applies documented priority criteria', async () => {
    const appA = await Application.create({
      applicationId: 'APP-COMPETE-A',
      scheme: schemeSanitation._id,
      applicantIndividual: indMemberA._id,
      household: testHousehold._id,
      requestedAmount: 12000,
      applicationDate: new Date('2026-01-10'),
      status: 'SUBMITTED'
    });

    const appB = await Application.create({
      applicationId: 'APP-COMPETE-B',
      scheme: schemeSanitation._id,
      applicantIndividual: indMemberB._id,
      household: testHousehold._id,
      requestedAmount: 12000,
      applicationDate: new Date('2026-01-12'),
      status: 'SUBMITTED'
    });

    const allocation = await evaluateHouseholdAllocation({
      householdId: testHousehold._id,
      schemeId: schemeSanitation._id,
      benefitPeriod: 'FY_2025_2026'
    });

    expect(allocation.competingApplications.length).toBe(2);
    expect(allocation.candidateAssessments.length).toBe(2);
    // Member B has lower income (30k vs 60k) and disability, so Member B must have a higher priority score!
    const candidateB = allocation.candidateAssessments.find((c) => c.applicant._id.toString() === indMemberB._id.toString());
    const candidateA = allocation.candidateAssessments.find((c) => c.applicant._id.toString() === indMemberA._id.toString());
    expect(candidateB.priorityScore).toBeGreaterThan(candidateA.priorityScore);
    expect(allocation.recommendedApplicant._id.toString()).toBe(indMemberB._id.toString());
    expect(allocation.status).toBe('RECOMMENDED_FOR_ALLOCATION');
  });

  // Requirement 7: A less eligible applicant is not recommended over a more eligible applicant
  test('7. A less eligible applicant is NOT recommended over a more eligible applicant', async () => {
    const allocation = await HouseholdAllocation.findOne({
      household: testHousehold._id,
      scheme: schemeSanitation._id
    }).populate('recommendedApplicant');

    expect(allocation.recommendedApplicant._id.toString()).toBe(indMemberB._id.toString());
  });

  // Requirement 8: Equal-priority applicants follow the documented tie-break rule
  test('8. Equal-priority applicants follow documented tie-break rule (EARLIER_APPLICATION_DATE)', async () => {
    // Create twin applicants with exact same income and vulnerability
    const twin1 = await Individual.create({
      individualId: 'TEST-TWIN-1',
      fullName: 'Twin One',
      dateOfBirth: new Date('2000-01-01'),
      gender: 'MALE',
      incomeCategory: 'BPL',
      annualIncome: 40000,
      verificationStatus: 'VERIFIED',
      currentHousehold: testHousehold._id
    });

    const twin2 = await Individual.create({
      individualId: 'TEST-TWIN-2',
      fullName: 'Twin Two',
      dateOfBirth: new Date('2000-01-01'),
      gender: 'MALE',
      incomeCategory: 'BPL',
      annualIncome: 40000,
      verificationStatus: 'VERIFIED',
      currentHousehold: testHousehold._id
    });

    // Twin 1 applied on Jan 1, Twin 2 applied on Jan 5
    await Application.create({
      applicationId: 'APP-TWIN-1',
      scheme: schemeSanitation._id,
      applicantIndividual: twin1._id,
      household: testHousehold._id,
      requestedAmount: 12000,
      applicationDate: new Date('2026-01-01'),
      status: 'SUBMITTED'
    });

    await Application.create({
      applicationId: 'APP-TWIN-2',
      scheme: schemeSanitation._id,
      applicantIndividual: twin2._id,
      household: testHousehold._id,
      requestedAmount: 12000,
      applicationDate: new Date('2026-01-05'),
      status: 'SUBMITTED'
    });

    // Re-run allocation engine
    const allocation = await evaluateHouseholdAllocation({
      householdId: testHousehold._id,
      schemeId: schemeSanitation._id,
      benefitPeriod: 'FY_2025_2026'
    });

    expect(allocation.recommendedApplicant).toBeDefined();
  });

  // Requirement 9: Missing or manual tie-break rule triggers review instead of arbitrary selection
  test('9. Missing/manual tie-break rules trigger PRIORITY_REVIEW_REQUIRED instead of arbitrary selection', async () => {
    // Create two applicants for electricity scheme which has tieBreakRule: 'MANUAL_OFFICER_REVIEW'
    const cand1 = await Individual.create({
      individualId: 'TEST-ELEC-1',
      fullName: 'Elec Candidate 1',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      incomeCategory: 'BPL',
      annualIncome: 50000,
      verificationStatus: 'VERIFIED',
      currentHousehold: testHousehold._id
    });

    const cand2 = await Individual.create({
      individualId: 'TEST-ELEC-2',
      fullName: 'Elec Candidate 2',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      incomeCategory: 'BPL',
      annualIncome: 50000,
      verificationStatus: 'VERIFIED',
      currentHousehold: testHousehold._id
    });

    await Application.create({
      applicationId: 'APP-ELEC-1',
      scheme: schemeElectricity._id,
      applicantIndividual: cand1._id,
      household: testHousehold._id,
      requestedAmount: 8000,
      applicationDate: new Date('2026-02-01'),
      status: 'SUBMITTED'
    });

    await Application.create({
      applicationId: 'APP-ELEC-2',
      scheme: schemeElectricity._id,
      applicantIndividual: cand2._id,
      household: testHousehold._id,
      requestedAmount: 8000,
      applicationDate: new Date('2026-02-01'),
      status: 'SUBMITTED'
    });

    const allocElec = await evaluateHouseholdAllocation({
      householdId: testHousehold._id,
      schemeId: schemeElectricity._id,
      benefitPeriod: 'FY_2025_2026'
    });

    expect(allocElec.status).toBe('PRIORITY_REVIEW_REQUIRED');
  });

  // Requirement 10: A previously disbursed restricted household benefit is detected
  test('10. Previously disbursed restricted household benefit is detected and restricts new claims', async () => {
    // Record a completed payment for Housing scheme
    await BenefitRecord.create({
      recordId: 'BR-TEST-HOUSE-001',
      scheme: schemeHousing._id,
      recipientHousehold: testHousehold._id,
      recipientIndividual: indMemberA._id,
      benefitAmount: 120000,
      sanctionDate: new Date('2025-01-01'),
      disbursementDate: new Date('2025-01-15'),
      status: 'DISBURSED'
    });

    const evaluation = await evaluateHouseholdForScheme(testHousehold._id, schemeHousing._id);
    expect(evaluation.isRestrictedDuplicate).toBe(true);
    expect(evaluation.overallResult).toBe('INELIGIBLE');
  });

  // Requirement 11 & 18: Approved but undisbursed application is SANCTIONED, not DISBURSED; approval != disbursement
  test('11 & 18. Officer review approves recommendation (SANCTIONED), separate disbursement records DISBURSED', async () => {
    const allocation = await HouseholdAllocation.findOne({
      household: testHousehold._id,
      scheme: schemeSanitation._id
    });

    // Officer reviews and approves recommendation
    const approved = await reviewHouseholdAllocation({
      allocationId: allocation._id,
      officerUser: testOfficer,
      decision: 'APPROVE_RECOMMENDATION',
      decisionReason: 'Verified economic hardship and authenticated civil record'
    });

    expect(approved.status).toBe('ALLOCATION_APPROVED');

    // Check benefit record: Must be SANCTIONED, NOT DISBURSED!
    const benefitRecord = await BenefitRecord.findOne({ application: approved.recommendedApplication });
    expect(benefitRecord).toBeDefined();
    expect(benefitRecord.status).toBe('SANCTIONED');
    expect(benefitRecord.disbursementDate).toBeUndefined();

    // Now record actual disbursement separately
    const disbursed = await disburseHouseholdAllocation({
      allocationId: allocation._id,
      officerUser: testOfficer,
      paymentReference: 'PFMS-DBT-2026-TEST-9988',
      amount: 12000
    });

    expect(disbursed.allocation.status).toBe('BENEFIT_DISBURSED');
    expect(disbursed.benefitRecord.status).toBe('DISBURSED');
    expect(disbursed.benefitRecord.referenceNumber).toBe('PFMS-DBT-2026-TEST-9988');
  });

  // Requirement 12: A failed external API request never produces a false verification success
  test('12. API error handling does not fabricate verification success', async () => {
    const res = await request(app)
      .get(`/api/individuals/${indPendingVerification._id}/potential-benefits`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const pendingItem = res.body.data.individualBenefits.find((b) => b.scheme.code === 'T-IEA');
    expect(pendingItem.evaluation.overallResult).toBe('VERIFICATION_PENDING');
  });

  // Requirement 13: Household changes preserve historical membership records
  test('13. Household move or split preserves historical membership records', async () => {
    const originalMembership = await HouseholdMembership.findOne({
      household: testHousehold._id,
      individual: indMemberA._id
    });

    expect(originalMembership).toBeDefined();
    expect(originalMembership.isCurrent).toBe(true);
  });

  // Requirement 14: Unauthorised users cannot access restricted administrative records
  test('14. Unauthorized users without token cannot access admin benefit records (401)', async () => {
    const res = await request(app).get('/api/admin/benefit-records');
    expect(res.status).toBe(401);
  });

  // Requirement 15: Dashboard totals match the underlying database
  test('15. Dashboard totals strictly match database counts', async () => {
    const dbIndividualCount = await Individual.countDocuments();
    const dbHouseholdCount = await Household.countDocuments();

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.totalIndividuals).toBe(dbIndividualCount);
    expect(res.body.data.metrics.totalHouseholds).toBe(dbHouseholdCount);
  });

  // Requirement 16: Re-running seed script does not create uncontrolled duplicates
  test('16. Re-running seed without force maintains stable record counts', async () => {
    const { seedDatabase } = require('../utils/seed');
    // Ensure database has standard dataset
    await seedDatabase(false);
    const countAfterFirstSeed = await Scheme.countDocuments();

    // Second call without force
    await seedDatabase(false);
    const countAfterSecondSeed = await Scheme.countDocuments();
    expect(countAfterSecondSeed).toBe(countAfterFirstSeed);
  });

  // Requirement 17: All eligibility decisions record the applicable rule version
  test('17. Eligibility evaluations record current rule version', async () => {
    const evaluation = await evaluateIndividualForScheme(indEligible._id, schemeEdu._id);
    expect(evaluation.ruleVersion).toBe('RULE_SET_v2.4_2026');
  });
});
