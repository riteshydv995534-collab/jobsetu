const mongoose = require('mongoose');
const User = require('../models/User');
const Individual = require('../models/Individual');
const Household = require('../models/Household');
const HouseholdMembership = require('../models/HouseholdMembership');
const FamilyRelationship = require('../models/FamilyRelationship');
const Property = require('../models/Property');
const PropertyAssociation = require('../models/PropertyAssociation');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const EligibilityAssessment = require('../models/EligibilityAssessment');
const BenefitRecord = require('../models/BenefitRecord');
const DuplicateAlert = require('../models/DuplicateAlert');
const ReviewDecision = require('../models/ReviewDecision');
const DocumentMetadata = require('../models/DocumentMetadata');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const AuditLog = require('../models/AuditLog');
const DisbursementRecord = require('../models/DisbursementRecord');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const { initDefaultProviders } = require('../services/verification/apiProviderRegistry');
const { evaluateHouseholdAllocation } = require('../services/householdBenefitAllocationService');

const STATES_DISTRICTS = [
  { state: 'Rajasthan', district: 'Jaipur', ward: 'Ward 14, Civil Lines', pin: '302001' },
  { state: 'Rajasthan', district: 'Ajmer', ward: 'Ward 8, Shastri Nagar', pin: '305001' },
  { state: 'Uttar Pradesh', district: 'Lucknow', ward: 'Ward 22, Gomti Nagar', pin: '226010' },
  { state: 'Uttar Pradesh', district: 'Varanasi', ward: 'Ward 5, Assi Ghat', pin: '221005' },
  { state: 'Maharashtra', district: 'Pune', ward: 'Sector 4, Shivaji Nagar', pin: '411005' },
  { state: 'Maharashtra', district: 'Nagpur', ward: 'Ward 11, Sitabuldi', pin: '440012' },
  { state: 'Gujarat', district: 'Ahmedabad', ward: 'Zone 3, Navrangpura', pin: '380009' },
  { state: 'Bihar', district: 'Patna', ward: 'Ward 17, Kankarbagh', pin: '800020' },
  { state: 'Punjab', district: 'Ludhiana', ward: 'Model Town Block B', pin: '141002' },
  { state: 'Tamil Nadu', district: 'Madurai', ward: 'Ward 33, Anna Nagar', pin: '625020' }
];

const FIRST_NAMES = [
  'Ramesh', 'Sunita', 'Rajesh', 'Kavita', 'Priya', 'Mohammad', 'Gurpreet', 'Amit',
  'Pooja', 'Anita', 'Suresh', 'Manish', 'Deepak', 'Geeta', 'Rekha', 'Vikas',
  'Anand', 'Lakshmi', 'Santosh', 'Meena', 'Ajay', 'Shweta', 'Dinesh', 'Suman',
  'Rohit', 'Kiran', 'Naresh', 'Sarita', 'Kamal', 'Bimla', 'Ashok', 'Neelam',
  'Vijay', 'Preeti', 'Harish', 'Usha', 'Sanjay', 'Mamta', 'Mukesh', 'Pushpa',
  'Sunil', 'Kusum', 'Pawan', 'Asha', 'Rakesh', 'Seema', 'Anil', 'Babita',
  'Vinod', 'Madhu', 'Satish', 'Saroj', 'Manoj', 'Chanda', 'Subhash', 'Radha',
  'Mahesh', 'Parvati', 'Suraj', 'Shanti'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Yadav', 'Singh', 'Ansari', 'Devi', 'Gupta',
  'Meena', 'Choudhary', 'Kumar', 'Nair', 'Reddy', 'Joshi', 'Mishra', 'Tiwari',
  'Kaur', 'Das', 'Roy', 'Sen', 'Rao', 'Bose', 'Pillai', 'Rathore', 'Solanki'
];

const EMPLOYMENT_TYPES = [
  'EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'SELF_EMPLOYED', 'AGRICULTURAL_WORKER', 'INFORMAL_WORKER'
];

const EDUCATION_TYPES = [
  'PRIMARY', 'SECONDARY', 'HIGHER_SECONDARY', 'UNDERGRADUATE', 'POSTGRADUATE', 'ILLITERATE'
];

const seedDatabase = async (force = false) => {
  try {
    const existingUsers = await User.countDocuments();
    const existingSchemes = await Scheme.countDocuments();
    await initDefaultProviders();

    const existingDemoIndividuals = await Individual.countDocuments({ demoIdentifier: { $exists: true } });

    if (!force && existingUsers > 0 && existingSchemes >= 12 && existingDemoIndividuals >= 80) {
      // Ensure admin user has full SUPER_ADMIN privileges and all schemes assigned
      const allSchemes = await Scheme.find().select('_id');
      await User.findOneAndUpdate(
        { email: 'admin@jansetu.gov.demo' },
        {
          role: 'SUPER_ADMIN',
          designation: 'Chief Administrator & Registrar General',
          assignedSchemes: allSchemes.map((s) => s._id)
        }
      );
      console.log('ℹ️ [JanSetu Seed] Synthetic database already seeded. Admin ensured as SUPER_ADMIN with full access.');
      return;
    }

    if (force) {
      console.log('🧹 [JanSetu Seed] Force flag detected. Clearing collections...');
      await Promise.all([
        User.deleteMany({}),
        Individual.deleteMany({}),
        Household.deleteMany({}),
        HouseholdMembership.deleteMany({}),
        Property.deleteMany({}),
        PropertyAssociation.deleteMany({}),
        Scheme.deleteMany({}),
        Application.deleteMany({}),
        EligibilityAssessment.deleteMany({}),
        BenefitRecord.deleteMany({}),
        DuplicateAlert.deleteMany({}),
        ReviewDecision.deleteMany({}),
        DocumentMetadata.deleteMany({}),
        ApplicationStatusHistory.deleteMany({}),
        AuditLog.deleteMany({}),
        DisbursementRecord.deleteMany({}),
        HouseholdAllocation.deleteMany({})
      ]);
    }

    console.log('🌱 [JanSetu Seed] Generating synthetic demonstration dataset (100+ individuals, 30+ households, 12 schemes)...');

    // 1. Create Demonstration Administrative & Welfare Users
    const officerEdu = new User({
      name: 'Sunita Sharma',
      email: 'officer.education@jansetu.gov.demo',
      password: 'Password@123',
      role: 'SCHEME_OFFICER',
      designation: 'Education Scheme Verification Officer',
      badgeNumber: 'JS-EDO-2026-04',
      department: 'Department of School & Higher Education'
    });
    await officerEdu.save();

    const officerHousing = new User({
      name: 'Rajesh Mukherjee',
      email: 'officer.housing@jansetu.gov.demo',
      password: 'Password@123',
      role: 'SCHEME_OFFICER',
      designation: 'Housing Entitlement Officer',
      badgeNumber: 'JS-HSO-2026-07',
      department: 'Department of Urban & Rural Housing'
    });
    await officerHousing.save();

    const officerVerification = new User({
      name: 'Anjali Deshmukh',
      email: 'officer.verification@jansetu.gov.demo',
      password: 'Password@123',
      role: 'VERIFICATION_OFFICER',
      designation: 'Field & Document Verification Officer',
      badgeNumber: 'JS-VFO-2026-03',
      department: 'Directorate of Citizen Field Verification & Data Audits'
    });
    await officerVerification.save();

    const supervisor = new User({
      name: 'Rameshwar Sen',
      email: 'supervisor@jansetu.gov.demo',
      password: 'Password@123',
      role: 'SCHEME_SUPERVISOR',
      designation: 'Regional Scheme Operations Supervisor',
      badgeNumber: 'JS-SSV-2026-02',
      department: 'Public Scheme Supervisory Commission'
    });
    await supervisor.save();

    const deptAdmin = new User({
      name: 'Dr. Kavita Nair',
      email: 'dept.admin@jansetu.gov.demo',
      password: 'Password@123',
      role: 'DEPARTMENT_ADMIN',
      designation: 'Department Administrator & Policy Incharge',
      badgeNumber: 'JS-DAD-2026-05',
      department: 'Department of Social Welfare & Entitlements'
    });
    await deptAdmin.save();

    const officer = new User({
      name: 'Pooja Verma',
      email: 'officer@jansetu.gov.demo',
      password: 'Password@123',
      role: 'WELFARE_OFFICER',
      designation: 'Senior Welfare Verification Officer',
      badgeNumber: 'JS-WFO-2026-09',
      department: 'Directorate of Social Welfare & Fair Entitlements'
    });
    await officer.save();

    const admin = new User({
      name: 'Vikram Singhania',
      email: 'admin@jansetu.gov.demo',
      password: 'Password@123',
      role: 'SUPER_ADMIN',
      designation: 'Chief Administrator & Registrar General',
      badgeNumber: 'JS-ADM-2026-01',
      department: 'Department of Public Documentation & Civil Registries'
    });
    await admin.save();

    // 2. Create the 12 Required Illustrative Government Schemes
    const SCHEME_DEFINITIONS = [
      {
        schemeId: 'SCH-001',
        name: 'Individual Education Assistance',
        code: 'IEA-2026',
        description: 'Financial scholarship grant for student educational expenses and scholastic materials.',
        benefitCategory: 'EDUCATION',
        benefitScope: 'INDIVIDUAL',
        targetPopulation: 'Students and scholastic youth',
        maxBenefitAmount: 15000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 120000,
        minAgeYears: 5,
        maxAgeYears: 30,
        allowedEducationStatus: ['PRIMARY', 'SECONDARY', 'HIGHER_SECONDARY', 'UNDERGRADUATE'],
        allowedEmploymentStatus: ['STUDENT', 'UNEMPLOYED'],
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ONCE_PER_LIFETIME',
        benefitPeriod: 'FY_2025_2026',
        rulesNote: 'Individual-level grant. Brother or relative receiving another scheme does NOT disqualify applicant.'
      },
      {
        schemeId: 'SCH-002',
        name: 'Student Scholarship Assistance',
        code: 'SSA-2026',
        description: 'Merit-cum-means scholarship for collegiate and vocational professional development.',
        benefitCategory: 'SCHOLARSHIP',
        benefitScope: 'INDIVIDUAL',
        targetPopulation: 'Enrolled higher secondary and collegiate students',
        maxBenefitAmount: 25000,
        allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
        maxAnnualIncome: 250000,
        minAgeYears: 16,
        maxAgeYears: 28,
        allowedEducationStatus: ['HIGHER_SECONDARY', 'UNDERGRADUATE', 'POSTGRADUATE'],
        allowedEmploymentStatus: ['STUDENT'],
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ANNUAL',
        benefitPeriod: 'FY_2025_2026',
        rulesNote: 'Annual individual scholastic support. Requires authenticated student enrollment verification.'
      },
      {
        schemeId: 'SCH-003',
        name: 'Individual Employment Assistance',
        code: 'IEA-EMP-2026',
        description: 'Vocational training stipend and job search allowance for informal and unorganised sector workers.',
        benefitCategory: 'EMPLOYMENT',
        benefitScope: 'INDIVIDUAL',
        targetPopulation: 'Job-seeking adults and informal unorganised labour',
        maxBenefitAmount: 18000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 150000,
        minAgeYears: 18,
        maxAgeYears: 55,
        allowedEmploymentStatus: ['UNEMPLOYED', 'INFORMAL_WORKER'],
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ONCE_PER_LIFETIME',
        benefitPeriod: 'FY_2025_2026',
        rulesNote: 'Targeted livelihood bridge support for adults actively registered on e-Shram.'
      },
      {
        schemeId: 'SCH-004',
        name: 'Eligible Individual Healthcare Assistance',
        code: 'EIHA-2026',
        description: 'Direct medical relief and critical health treatment co-payment subsidy for vulnerable citizens.',
        benefitCategory: 'HEALTHCARE',
        benefitScope: 'INDIVIDUAL',
        targetPopulation: 'Economically vulnerable patients requiring secondary treatment',
        maxBenefitAmount: 30000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 180000,
        minAgeYears: 0,
        maxAgeYears: 100,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ANNUAL',
        benefitPeriod: 'FY_2025_2026',
        rulesNote: 'Individual health subsidy. Evaluated on individual diagnostic necessity without household disqualification.'
      },
      {
        schemeId: 'SCH-005',
        name: 'Household Sanitation Support',
        code: 'HSS-2026',
        description: 'Capital subsidy grant for domestic toilet and sanitation infrastructure installation.',
        benefitCategory: 'SANITATION',
        benefitScope: 'HOUSEHOLD',
        targetPopulation: 'Rural and semi-urban households lacking individual domestic toilets',
        maxBenefitAmount: 12000,
        allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
        maxAnnualIncome: 200000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'NO_REPEAT',
        benefitPeriod: 'LIFETIME',
        priorityWeights: { lowerIncomeWeight: 45, vulnerabilityWeight: 35, applicationDateWeight: 20 },
        tieBreakRule: 'EARLIER_APPLICATION_DATE',
        rulesNote: 'Strictly 1 benefit per verified household. Multiple family member applications trigger Fair Allocation Engine.'
      },
      {
        schemeId: 'SCH-006',
        name: 'Household Electricity Subsidy',
        code: 'HES-2026',
        description: 'Direct tariff reimbursement providing 100 units free monthly domestic power for BPL households.',
        benefitCategory: 'ELECTRICITY',
        benefitScope: 'HOUSEHOLD',
        targetPopulation: 'Electrified domestic consumer meters in BPL/AAY households',
        maxBenefitAmount: 8000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 140000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ANNUAL',
        benefitPeriod: 'FY_2025_2026',
        priorityWeights: { lowerIncomeWeight: 50, vulnerabilityWeight: 30, applicationDateWeight: 20 },
        tieBreakRule: 'LOWER_ANNUAL_INCOME',
        rulesNote: '1 subsidy per domestic household meter per fiscal year.'
      },
      {
        schemeId: 'SCH-007',
        name: 'Eligible Household Food Assistance',
        code: 'EHFA-2026',
        description: 'PDS NFSA supplemental grain allotment subsidy for low-income ration card holders.',
        benefitCategory: 'FOOD_ASSISTANCE',
        benefitScope: 'HOUSEHOLD',
        targetPopulation: 'Priority household (PHH) and Antyodaya Anna Yojana (AAY) ration holders',
        maxBenefitAmount: 10000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 100000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ANNUAL',
        benefitPeriod: 'FY_2025_2026',
        priorityWeights: { lowerIncomeWeight: 40, vulnerabilityWeight: 40, applicationDateWeight: 20 },
        tieBreakRule: 'EARLIER_APPLICATION_DATE',
        rulesNote: 'Evaluated against statutory state NFSA ration card roster. Limited to 1 allocation per household card.'
      },
      {
        schemeId: 'SCH-008',
        name: 'Housing Assistance Grant (PMAY-Style)',
        code: 'HAG-2026',
        description: 'Pucca house construction financial assistance for homeless and kutcha dwelling families.',
        benefitCategory: 'HOUSING',
        benefitScope: 'HOUSEHOLD',
        targetPopulation: 'Houseless families or households residing in single-room kutcha houses',
        maxBenefitAmount: 120000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 150000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'NO_REPEAT',
        benefitPeriod: 'LIFETIME',
        priorityWeights: { lowerIncomeWeight: 40, vulnerabilityWeight: 40, applicationDateWeight: 20 },
        tieBreakRule: 'EARLIER_APPLICATION_DATE',
        rulesNote: 'Strictly 1 lifetime housing assistance allocation per eligible household.'
      },
      {
        schemeId: 'SCH-009',
        name: 'Property Infrastructure Support',
        code: 'PIS-2026',
        description: 'Subsidized assistance for dwelling roof weatherproofing, drainage connection, and structural fortification.',
        benefitCategory: 'INFRASTRUCTURE',
        benefitScope: 'PROPERTY',
        targetPopulation: 'Registered residential land parcels and rural homestead plots',
        maxBenefitAmount: 40000,
        allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
        maxAnnualIncome: 300000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ONCE_PER_LIFETIME',
        benefitPeriod: 'LIFETIME',
        rulesNote: 'Property-level limit: Assessed per physical cadastral parcel. Living at address does not establish title.'
      },
      {
        schemeId: 'SCH-010',
        name: 'Income-Based Family Assistance',
        code: 'IEFA-2026',
        description: 'Direct nutritional and livelihood baseline grant for economically vulnerable family units.',
        benefitCategory: 'FAMILY_SUPPORT',
        benefitScope: 'HOUSEHOLD',
        targetPopulation: 'Multigenerational low-income families below poverty line',
        maxBenefitAmount: 20000,
        allowedIncomeCategories: ['BPL', 'AAY'],
        maxAnnualIncome: 90000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ANNUAL',
        benefitPeriod: 'FY_2025_2026',
        priorityWeights: { lowerIncomeWeight: 45, vulnerabilityWeight: 35, applicationDateWeight: 20 },
        tieBreakRule: 'LOWER_ANNUAL_INCOME',
        rulesNote: 'Household-level welfare grant. Evaluated across collective household membership.'
      },
      {
        schemeId: 'SCH-011',
        name: 'Agricultural Household Assistance',
        code: 'AHA-2026',
        description: 'Direct income support of ₹6,000 per crop cycle for small and marginal landholding farmer households.',
        benefitCategory: 'AGRICULTURE',
        benefitScope: 'HOUSEHOLD',
        targetPopulation: 'Small and marginal farmer households holding cultivable land up to 2 hectares',
        maxBenefitAmount: 25000,
        allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
        maxAnnualIncome: 250000,
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'ANNUAL',
        benefitPeriod: 'FY_2025_2026',
        priorityWeights: { lowerIncomeWeight: 40, vulnerabilityWeight: 30, applicationDateWeight: 30 },
        tieBreakRule: 'EARLIER_APPLICATION_DATE',
        rulesNote: '1 farm support allocation per landholding farmer household.'
      },
      {
        schemeId: 'SCH-012',
        name: 'Agricultural Equipment Subsidy',
        code: 'AES-2026',
        description: 'Individual capital grant for procurement of solar pumps, power tillers, and drip irrigation units.',
        benefitCategory: 'AGRICULTURAL_EQUIPMENT',
        benefitScope: 'INDIVIDUAL',
        targetPopulation: 'Practicing individual farmers and agricultural labour',
        maxBenefitAmount: 50000,
        allowedIncomeCategories: ['APL', 'BPL', 'AAY'],
        maxAnnualIncome: 350000,
        minAgeYears: 21,
        maxAgeYears: 65,
        allowedEmploymentStatus: ['AGRICULTURAL_WORKER', 'SELF_EMPLOYED'],
        maxLifetimeAllocationsPerScope: 1,
        repeatBenefitPolicy: 'EVERY_3_YEARS',
        benefitPeriod: 'FY_2025_2026',
        rulesNote: 'Individual-level machinery subsidy. Available to any qualifying farmer in the family unit.'
      }
    ];

    const createdSchemes = [];
    for (const def of SCHEME_DEFINITIONS) {
      const scheme = new Scheme({
        ...def,
        isActive: true,
        isDemonstration: true,
        isSyntheticDemo: true,
        ruleVersion: 'RULE_SET_v2.4_2026',
        requiredDocuments: ['Identity Proof', 'Income Affidavit', 'Address Proof']
      });
      await scheme.save();
      createdSchemes.push(scheme);
    }

    // Assign explicit schemes to demonstration officers
    officerEdu.assignedSchemes = [createdSchemes[0]._id, createdSchemes[1]._id];
    await officerEdu.save();

    officerHousing.assignedSchemes = [createdSchemes[7]._id, createdSchemes[4]._id];
    await officerHousing.save();

    officerVerification.assignedSchemes = createdSchemes.map((s) => s._id);
    await officerVerification.save();

    supervisor.assignedSchemes = createdSchemes.map((s) => s._id);
    await supervisor.save();

    deptAdmin.assignedSchemes = createdSchemes.map((s) => s._id);
    await deptAdmin.save();

    officer.assignedSchemes = createdSchemes.slice(0, 8).map((s) => s._id);
    await officer.save();

    admin.assignedSchemes = createdSchemes.map((s) => s._id);
    await admin.save();
    console.log(`✅ [JanSetu Seed] Created ${createdSchemes.length} illustrative government schemes.`);

    // 3. Create 32 Fictional Properties
    const createdProperties = [];
    for (let pIdx = 1; pIdx <= 32; pIdx++) {
      const loc = STATES_DISTRICTS[(pIdx - 1) % STATES_DISTRICTS.length];
      const property = new Property({
        propertyId: `PROP-${loc.state.substring(0, 2).toUpperCase()}-${String(100 + pIdx).padStart(3, '0')}`,
        propertyReference: `PARCEL-SURVEY-${202600 + pIdx}`,
        propertyType: pIdx % 4 === 0 ? 'AGRICULTURAL' : 'RESIDENTIAL',
        plotNumber: `Plot ${pIdx * 3}`,
        surveyNumber: `Khasra ${100 + pIdx}/${(pIdx % 5) + 1}`,
        khatauniNumber: `KH-2026/${String(pIdx).padStart(4, '0')}`,
        landHoldingArea: pIdx % 4 === 0 ? `${(1.2 + (pIdx % 3) * 0.4).toFixed(1)} Hectares` : `${900 + pIdx * 25} Sq Ft`,
        evaluatedValue: 350000 + pIdx * 25000,
        addressLine1: `${pIdx * 4}, ${loc.ward}`,
        district: loc.district,
        state: loc.state,
        pincode: loc.pin,
        ownershipStatus: pIdx % 6 === 0 ? 'TENANT' : 'VERIFIED_OWNER',
        verificationStatus: pIdx % 7 === 0 ? 'PENDING' : 'VERIFIED',
        isSyntheticDemo: true
      });
      await property.save();
      createdProperties.push(property);
    }
    console.log(`✅ [JanSetu Seed] Created ${createdProperties.length} fictional properties.`);

    // 4. Create 25 Fictional Households (H-1001 to H-1025)
    const createdHouseholds = [];
    for (let hIdx = 1; hIdx <= 25; hIdx++) {
      const loc = STATES_DISTRICTS[(hIdx - 1) % STATES_DISTRICTS.length];
      const linkedProp = createdProperties[hIdx - 1];
      const householdCode = `H-${1000 + hIdx}`;

      const household = new Household({
        householdId: householdCode,
        householdReference: `RATION-CARD-RC${loc.state.substring(0, 2).toUpperCase()}${88000 + hIdx}`,
        rationCardNumber: `RC-${loc.state.substring(0, 2).toUpperCase()}-${77000 + hIdx}`,
        addressLine1: `${hIdx * 4}, ${loc.ward}`,
        district: loc.district,
        state: loc.state,
        pincode: loc.pin,
        annualHouseholdIncome: 45000 + (hIdx % 8) * 15000,
        householdSize: 4, // 4 members per family
        propertyAssociation: linkedProp._id,
        verificationStatus: hIdx % 9 === 0 ? 'PENDING' : 'VERIFIED',
        isSyntheticDemo: true,
        benefitRestrictions: []
      });
      await household.save();

      // Backlink property
      linkedProp.associatedHousehold = household._id;
      await linkedProp.save();

      createdHouseholds.push(household);
    }
    console.log(`✅ [JanSetu Seed] Created ${createdHouseholds.length} fictional households (H-1001 to H-1025).`);

    // 5. Create 100+ Fictional Individuals (Realistic Indian Citizen Profiles & Demo Identifiers)
    const createdIndividuals = [];
    let indSeq = 1;
    const usedDemoIds = new Set([
      'DEMO-AADHAAR-100001',
      'DEMO-AADHAAR-100002',
      'DEMO-AADHAAR-100003',
      'DEMO-AADHAAR-100004',
      'DEMO-AADHAAR-100005',
      'DEMO-AADHAAR-100021',
      'DEMO-AADHAAR-100022',
      'DEMO-AADHAAR-100024'
    ]);
    let nextDemoNum = 100006;
    const getUniqueDemoId = () => {
      while (usedDemoIds.has(`DEMO-AADHAAR-${nextDemoNum}`)) {
        nextDemoNum++;
      }
      const id = `DEMO-AADHAAR-${nextDemoNum}`;
      usedDemoIds.add(id);
      nextDemoNum++;
      return id;
    };

    for (let hIdx = 0; hIdx < createdHouseholds.length; hIdx++) {
      const hh = createdHouseholds[hIdx];
      const loc = STATES_DISTRICTS[hIdx % STATES_DISTRICTS.length];
      const hNumber = 1001 + hIdx;

      let familyLastName = LAST_NAMES[hIdx % LAST_NAMES.length];
      let membersSpec = [];

      if (hNumber === 1001) {
        // Special Section 2 Spec: Household H-1001
        familyLastName = 'Kumar';
        membersSpec = [
          { name: 'Rajesh Kumar', rel: 'HEAD', gender: 'MALE', age: 48, demoId: 'DEMO-AADHAAR-100001' },
          { name: 'Sunita Kumar', rel: 'SPOUSE', gender: 'FEMALE', age: 44, demoId: 'DEMO-AADHAAR-100002' },
          { name: 'Aman Kumar', rel: 'SON', gender: 'MALE', age: 22, demoId: 'DEMO-AADHAAR-100004' },
          { name: 'Pooja Kumar', rel: 'DAUGHTER', gender: 'FEMALE', age: 19, demoId: 'DEMO-AADHAAR-100005' }
        ];
      } else if (hNumber === 1005) {
        // Special Section 11 Spec: Household H-1005 (Vikram, Meena, Arjun, Neha)
        familyLastName = 'Singh';
        membersSpec = [
          { name: 'Vikram Singh', rel: 'HEAD', gender: 'MALE', age: 50, demoId: 'DEMO-AADHAAR-100021' },
          { name: 'Meena Singh', rel: 'SPOUSE', gender: 'FEMALE', age: 46, demoId: 'DEMO-AADHAAR-100022' },
          { name: 'Arjun Singh', rel: 'SON', gender: 'MALE', age: 23, demoId: 'DEMO-AADHAAR-100003' }, // Target demo identifier
          { name: 'Neha Singh', rel: 'DAUGHTER', gender: 'FEMALE', age: 20, demoId: 'DEMO-AADHAAR-100024' }
        ];
      } else {
        // Generic family members
        const headFirst = FIRST_NAMES[(hIdx * 2) % FIRST_NAMES.length];
        const spouseFirst = FIRST_NAMES[(hIdx * 2 + 1) % FIRST_NAMES.length];
        const child1First = FIRST_NAMES[(hIdx * 2 + 2) % FIRST_NAMES.length];
        const child2First = FIRST_NAMES[(hIdx * 2 + 3) % FIRST_NAMES.length];
        membersSpec = [
          { name: `${headFirst} ${familyLastName}`, rel: 'HEAD', gender: 'MALE', age: 45 + (hIdx % 10) },
          { name: `${spouseFirst} ${familyLastName}`, rel: 'SPOUSE', gender: 'FEMALE', age: 40 + (hIdx % 10) },
          { name: `${child1First} ${familyLastName}`, rel: 'SON', gender: 'MALE', age: 20 + (hIdx % 5) },
          { name: `${child2First} ${familyLastName}`, rel: 'DAUGHTER', gender: 'FEMALE', age: 18 + (hIdx % 4) }
        ];
      }

      for (let mIdx = 0; mIdx < membersSpec.length; mIdx++) {
        const spec = membersSpec[mIdx];
        const isHead = spec.rel === 'HEAD';
        const birthYear = new Date().getFullYear() - spec.age;
        const demoIdentifier = spec.demoId || getUniqueDemoId();

        let incomeCategory = 'BPL';
        if (hIdx % 5 === 0) incomeCategory = 'AAY';
        else if (hIdx % 4 === 0) incomeCategory = 'APL';

        const empStatus = isHead
          ? (hIdx % 3 === 0 ? 'AGRICULTURAL_WORKER' : 'INFORMAL_WORKER')
          : (spec.age < 24 ? 'STUDENT' : EMPLOYMENT_TYPES[(hIdx + mIdx) % EMPLOYMENT_TYPES.length]);

        const eduStatus = isHead ? 'SECONDARY' : 'HIGHER_SECONDARY';
        const hasDisability = indSeq % 14 === 0;
        const isVulnerable = incomeCategory === 'AAY' || hasDisability;

        const individual = new Individual({
          individualId: `IND-${1000 + indSeq}`,
          demoIdentifier: demoIdentifier,
          fullName: spec.name,
          fatherName: isHead ? `Late Shiv ${familyLastName}` : membersSpec[0].name,
          aadhaarRef: `XXXX-XXXX-${String(1000 + indSeq).padStart(4, '0')}`,
          panNumber: `ABC${familyLastName.substring(0, 2).toUpperCase()}${String(2000 + indSeq).padStart(4, '0')}Z`,
          gender: spec.gender,
          dateOfBirth: new Date(`${birthYear}-05-15`),
          incomeCategory,
          annualIncome: isHead ? hh.annualHouseholdIncome : (empStatus === 'STUDENT' ? 0 : 25000 + (mIdx * 10000)),
          state: loc.state,
          district: loc.district,
          employmentStatus: empStatus,
          educationStatus: eduStatus,
          hasDisability,
          isVulnerable,
          currentHousehold: hh._id,
          isHeadOfHousehold: isHead,
          membershipStatus: 'PRIMARY_RESIDENT',
          verificationStatus: indSeq % 15 === 0 ? 'PENDING' : 'VERIFIED',
          phone: `98${String(10000000 + indSeq * 1234).substring(0, 8)}`,
          email: `${spec.name.toLowerCase().replace(/\s+/g, '.')}${indSeq}@demo.gov.in`,
          isSyntheticDemo: true
        });
        await individual.save();
        createdIndividuals.push(individual);

        if (isHead) {
          hh.headOfHousehold = individual._id;
          await hh.save();
        }

        const membership = new HouseholdMembership({
          household: hh._id,
          individual: individual._id,
          relationshipToHead: spec.rel,
          isCurrent: true,
          verificationStatus: 'VERIFIED',
          verificationSource: 'CIVIL_SUPPLIES_RATION_REGISTER',
          startDate: new Date('2024-01-01')
        });
        await membership.save();

        indSeq++;
      }
    }
    console.log(`✅ [JanSetu Seed] Created ${createdIndividuals.length} fictional individuals with demo identifiers (DEMO-AADHAAR-XXXXXX).`);

    // 6. Create Historical Previous Benefits (Disbursed & Sanctioned)
    // - Benefit 1: Disbursed Sanitation Grant on Household H-102
    const prevDisbSanitation = new BenefitRecord({
      recordId: 'BR-2025-001',
      scheme: createdSchemes[4]._id, // Household Sanitation
      recipientHousehold: createdHouseholds[1]._id,
      recipientIndividual: createdIndividuals[4]._id,
      benefitAmount: 12000,
      sanctionDate: new Date('2024-11-15'),
      disbursementDate: new Date('2024-12-01'),
      status: 'DISBURSED',
      referenceNumber: 'PFMS-DBT-20241201-9982',
      financialYear: '2024-2025',
      notes: 'Disbursed directly via PFMS to household head account.'
    });
    await prevDisbSanitation.save();

    // - Benefit 2: Sanctioned but undisbursed Housing Grant on Household H-103
    const prevSanctHousing = new BenefitRecord({
      recordId: 'BR-2025-002',
      scheme: createdSchemes[7]._id, // Housing Assistance
      recipientHousehold: createdHouseholds[2]._id,
      recipientIndividual: createdIndividuals[8]._id,
      benefitAmount: 120000,
      sanctionDate: new Date('2025-01-10'),
      status: 'SANCTIONED',
      referenceNumber: 'SANCTION-ORDER-2025-HAG-09',
      financialYear: '2024-2025',
      notes: 'Sanction order issued by district magistrate; bank account verification pending for stage 1 DBT.'
    });
    await prevSanctHousing.save();

    // - Benefit 3: Disbursed Education Scholarship on Individual 1
    const prevDisbEdu = new BenefitRecord({
      recordId: 'BR-2025-003',
      scheme: createdSchemes[0]._id, // Individual Education
      recipientIndividual: createdIndividuals[1]._id,
      benefitAmount: 15000,
      sanctionDate: new Date('2024-09-01'),
      disbursementDate: new Date('2024-09-20'),
      status: 'DISBURSED',
      referenceNumber: 'PFMS-EDU-2024-8821',
      financialYear: '2024-2025',
      notes: 'Individual grant received by Sunita Kumar. Does NOT disqualify family members from sanitation or other schemes.'
    });
    await prevDisbEdu.save();

    // 6.B SPECIFIC SECTION 11 DEMONSTRATION SCENARIO: Household H-1005
    const hh1005 = createdHouseholds[4]; // Household H-1005
    const vikram = createdIndividuals.find((i) => i.fullName === 'Vikram Singh');
    const meena = createdIndividuals.find((i) => i.fullName === 'Meena Singh');
    const arjun = createdIndividuals.find((i) => i.fullName === 'Arjun Singh');
    const neha = createdIndividuals.find((i) => i.fullName === 'Neha Singh');

    if (vikram && meena && arjun && neha) {
      // 1. Vikram has a recorded individual education benefit (DISBURSED)
      const benVikramEdu = new BenefitRecord({
        recordId: 'BR-2024-H1005-VIKRAM',
        scheme: createdSchemes[0]._id, // SCH-001 (Individual Education Assistance)
        recipientIndividual: vikram._id,
        benefitAmount: 15000,
        sanctionDate: new Date('2024-08-15'),
        disbursementDate: new Date('2024-09-01'),
        status: 'DISBURSED',
        referenceNumber: 'PFMS-EDU-VIKRAM-01',
        financialYear: '2024-2025',
        verificationSource: 'PFMS_DBT_PORTAL',
        notes: 'Vocational education grant received by Vikram Singh.'
      });
      await benVikramEdu.save();

      // 2. Meena has a recorded individual healthcare benefit (DISBURSED)
      const benMeenaHealth = new BenefitRecord({
        recordId: 'BR-2024-H1005-MEENA',
        scheme: createdSchemes[3]._id, // SCH-004 (Eligible Individual Healthcare Assistance)
        recipientIndividual: meena._id,
        benefitAmount: 30000,
        sanctionDate: new Date('2024-10-10'),
        disbursementDate: new Date('2024-10-25'),
        status: 'DISBURSED',
        referenceNumber: 'PFMS-HEALTH-MEENA-01',
        financialYear: '2024-2025',
        verificationSource: 'PFMS_DBT_PORTAL',
        notes: 'Critical medical relief grant disbursed to Meena Singh.'
      });
      await benMeenaHealth.save();

      // 3. Household H-1005 has a recorded sanitation benefit (DISBURSED)
      const benH1005San = new BenefitRecord({
        recordId: 'BR-2024-H1005-SAN',
        scheme: createdSchemes[4]._id, // SCH-005 (Household Sanitation Support)
        recipientHousehold: hh1005._id,
        recipientIndividual: vikram._id,
        benefitAmount: 12000,
        sanctionDate: new Date('2024-04-10'),
        disbursementDate: new Date('2024-05-12'),
        status: 'DISBURSED',
        referenceNumber: 'PFMS-SAN-H1005-01',
        financialYear: '2024-2025',
        verificationSource: 'PFMS_DBT_PORTAL',
        notes: 'Household domestic sanitation latrine grant disbursed.'
      });
      await benH1005San.save();

      // 4. Arjun has applied for education assistance (SUBMITTED)
      const appArjunEdu = new Application({
        applicationId: 'APP-2026-ARJUN-EDU',
        scheme: createdSchemes[0]._id, // SCH-001 (Individual Education Assistance)
        applicantIndividual: arjun._id,
        household: hh1005._id,
        property: hh1005.propertyAssociation,
        requestedAmount: 15000,
        applicationDate: new Date('2026-02-10'),
        status: 'SUBMITTED',
        eligibilityStatus: 'ELIGIBLE',
        remarks: 'Scholastic scholarship application submitted by Arjun Singh'
      });
      await appArjunEdu.save();

      // Create demonstration applicant users linked to Arjun Singh
      const arjunUser = new User({
        name: 'Arjun Vikram Singh',
        email: 'arjun@jansetu.demo',
        password: 'Password@123',
        role: 'APPLICANT',
        linkedIndividual: arjun._id,
        designation: 'Verified Citizen Applicant'
      });
      await arjunUser.save();

      const applicantUser = new User({
        name: 'Arjun Vikram Singh',
        email: 'applicant@jansetu.demo',
        password: 'Password@123',
        role: 'APPLICANT',
        linkedIndividual: arjun._id,
        designation: 'Verified Citizen Applicant'
      });
      await applicantUser.save();

      // 5. Neha has a pending individual scheme application (SUBMITTED)
      const appNehaSch = new Application({
        applicationId: 'APP-2026-NEHA-SCH',
        scheme: createdSchemes[1]._id, // SCH-002 (Student Scholarship Assistance)
        applicantIndividual: neha._id,
        household: hh1005._id,
        property: hh1005.propertyAssociation,
        requestedAmount: 25000,
        applicationDate: new Date('2026-02-12'),
        status: 'SUBMITTED',
        eligibilityStatus: 'REQUIRES_VERIFICATION',
        remarks: 'Collegiate scholarship application awaiting institution verification'
      });
      await appNehaSch.save();

      // 6. Two household members (Vikram and Arjun) applied for a restricted single-benefit scheme (Housing SCH-008)
      const appH1005VikramHousing = new Application({
        applicationId: 'APP-2026-H1005-HOUSING-V',
        scheme: createdSchemes[7]._id, // SCH-008 (Housing Assistance Grant - 1 per HH)
        applicantIndividual: vikram._id,
        household: hh1005._id,
        property: hh1005.propertyAssociation,
        requestedAmount: 120000,
        applicationDate: new Date('2026-01-15'),
        status: 'SUBMITTED',
        eligibilityStatus: 'REQUIRES_VERIFICATION',
        remarks: 'Pucca house construction subsidy application by Vikram Singh'
      });
      await appH1005VikramHousing.save();

      const appH1005ArjunHousing = new Application({
        applicationId: 'APP-2026-H1005-HOUSING-A',
        scheme: createdSchemes[7]._id, // SCH-008 (Housing Assistance Grant - 1 per HH)
        applicantIndividual: arjun._id,
        household: hh1005._id,
        property: hh1005.propertyAssociation,
        requestedAmount: 120000,
        applicationDate: new Date('2026-01-20'),
        status: 'SUBMITTED',
        eligibilityStatus: 'REQUIRES_VERIFICATION',
        remarks: 'Pucca house construction subsidy application by Arjun Singh'
      });
      await appH1005ArjunHousing.save();
    }

    // 7. Seed Applications (Including Competing Household Claims)
    // SCENARIO: Household H-101 has 2 competing members applying for SCH-005 (Household Sanitation Support)
    const hh1 = createdHouseholds[0];
    const ind1MemberA = createdIndividuals[0]; // Ramesh Sharma (Income: 45000)
    const ind1MemberB = createdIndividuals[1]; // Sunita Sharma (Income: 25000, Female head)

    const appCompeting1 = new Application({
      applicationId: 'APP-2026-H101-A',
      scheme: createdSchemes[4]._id, // Sanitation Support (1 per HH)
      applicantIndividual: ind1MemberA._id,
      household: hh1._id,
      property: hh1.propertyAssociation,
      requestedAmount: 12000,
      applicationDate: new Date('2026-01-10'),
      status: 'SUBMITTED',
      eligibilityStatus: 'REQUIRES_VERIFICATION',
      remarks: 'Applying for domestic sanitation latrine construction'
    });
    await appCompeting1.save();

    const appCompeting2 = new Application({
      applicationId: 'APP-2026-H101-B',
      scheme: createdSchemes[4]._id, // Sanitation Support (1 per HH)
      applicantIndividual: ind1MemberB._id,
      household: hh1._id,
      property: hh1.propertyAssociation,
      requestedAmount: 12000,
      applicationDate: new Date('2026-01-15'),
      status: 'SUBMITTED',
      eligibilityStatus: 'REQUIRES_VERIFICATION',
      remarks: 'Women-led household application for sanitation grant'
    });
    await appCompeting2.save();

    // Household H-104 has 3 competing members applying for SCH-006 (Electricity Subsidy)
    const hh4 = createdHouseholds[3];
    const ind4A = createdIndividuals[12];
    const ind4B = createdIndividuals[13];
    const ind4C = createdIndividuals[14];

    const appH4A = new Application({
      applicationId: 'APP-2026-H104-A',
      scheme: createdSchemes[5]._id, // Electricity Subsidy (1 per HH)
      applicantIndividual: ind4A._id,
      household: hh4._id,
      property: hh4.propertyAssociation,
      requestedAmount: 8000,
      applicationDate: new Date('2026-02-01'),
      status: 'SUBMITTED',
      eligibilityStatus: 'REQUIRES_VERIFICATION',
      remarks: 'Primary meter subsidy application'
    });
    await appH4A.save();

    const appH4B = new Application({
      applicationId: 'APP-2026-H104-B',
      scheme: createdSchemes[5]._id,
      applicantIndividual: ind4B._id,
      household: hh4._id,
      property: hh4.propertyAssociation,
      requestedAmount: 8000,
      applicationDate: new Date('2026-02-04'),
      status: 'SUBMITTED',
      eligibilityStatus: 'REQUIRES_VERIFICATION',
      remarks: 'Co-applicant household claim'
    });
    await appH4B.save();

    const appH4C = new Application({
      applicationId: 'APP-2026-H104-C',
      scheme: createdSchemes[5]._id,
      applicantIndividual: ind4C._id,
      household: hh4._id,
      property: hh4.propertyAssociation,
      requestedAmount: 8000,
      applicationDate: new Date('2026-02-08'),
      status: 'SUBMITTED',
      eligibilityStatus: 'REQUIRES_VERIFICATION',
      remarks: 'Third family member application'
    });
    await appH4C.save();

    // Additional solo applications for various schemes with varied dates and realistic statuses
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    for (let aIdx = 5; aIdx < 30; aIdx++) {
      const applicant = createdIndividuals[(aIdx * 3) % createdIndividuals.length];
      const targetScheme = createdSchemes[aIdx % createdSchemes.length];
      const applicantHh = createdHouseholds.find((h) => h._id.toString() === applicant.currentHousehold?.toString()) || createdHouseholds[0];

      // Stagger dates across month: 1st, 3rd, 5th, etc.
      const dayNum = ((aIdx * 2) % 27) + 1;
      const appDate = new Date(currentYear, currentMonth, dayNum, 10, 30);

      let status = 'SUBMITTED';
      let eligibilityStatus = 'ELIGIBLE';
      let decisionDate = null;
      let decisionReason = '';

      if (aIdx % 4 === 0) {
        status = 'APPROVED';
        decisionDate = new Date(currentYear, currentMonth, Math.min(dayNum + 2, 28), 14, 0);
        decisionReason = 'Statutory income, property, and residency criteria verified and confirmed compliant.';
      } else if (aIdx % 6 === 0) {
        status = 'REJECTED';
        eligibilityStatus = 'INELIGIBLE';
        decisionDate = new Date(currentYear, currentMonth, Math.min(dayNum + 3, 28), 16, 30);
        decisionReason = 'Declared individual annual earnings exceed maximum allowable threshold under scheme rules.';
      } else if (aIdx % 7 === 0) {
        status = 'BENEFIT_DISBURSED';
        decisionDate = new Date(currentYear, currentMonth, Math.min(dayNum + 2, 28), 11, 0);
        decisionReason = 'Approved by scheme authority and disbursed via direct benefit transfer.';
      } else if (aIdx % 5 === 0) {
        status = 'UNDER_REVIEW';
        eligibilityStatus = 'REQUIRES_VERIFICATION';
      } else if (aIdx % 3 === 0) {
        status = 'INFORMATION_REQUIRED';
        eligibilityStatus = 'REQUIRES_VERIFICATION';
      }

      const app = new Application({
        applicationId: `APP-2026-${String(aIdx + 100).padStart(4, '0')}`,
        scheme: targetScheme._id,
        applicantIndividual: applicant._id,
        household: applicantHh._id,
        property: applicantHh.propertyAssociation,
        requestedAmount: targetScheme.maxBenefitAmount,
        applicationDate: appDate,
        status,
        eligibilityStatus,
        decisionDate,
        decisionReason,
        remarks: `Standard public claim intake for ${targetScheme.name}`
      });
      await app.save();

      // If disbursed, create BenefitRecord and DisbursementRecord
      if (status === 'BENEFIT_DISBURSED') {
        const br = new BenefitRecord({
          recordId: `BR-2026-${String(aIdx + 200).padStart(4, '0')}`,
          scheme: targetScheme._id,
          recipientIndividual: applicant._id,
          recipientHousehold: applicantHh._id,
          recipientProperty: applicantHh.propertyAssociation,
          application: app._id,
          benefitAmount: targetScheme.maxBenefitAmount,
          sanctionDate: decisionDate,
          disbursementDate: new Date(currentYear, currentMonth, Math.min(dayNum + 4, 28), 12, 0),
          status: 'DISBURSED',
          referenceNumber: `PFMS-DISB-${aIdx + 1000}`,
          financialYear: '2025-2026',
          verificationSource: 'PFMS_DBT_PORTAL',
          notes: 'Disbursement recorded and reconciled.'
        });
        await br.save();

        const dr = new DisbursementRecord({
          disbursementId: `DBT-2026-${String(aIdx + 300).padStart(5, '0')}`,
          application: app._id,
          benefitRecord: br._id,
          amount: targetScheme.maxBenefitAmount,
          paymentReference: `PFMS-TXN-2026-${aIdx + 5000}`,
          paymentMethod: 'DBT_DIRECT_BENEFIT_TRANSFER',
          disbursedAt: new Date(currentYear, currentMonth, Math.min(dayNum + 4, 28), 12, 0),
          notes: 'Direct Benefit Transfer completed.'
        });
        await dr.save();
      }
    }
    console.log('✅ [JanSetu Seed] Created realistic application cohort with competing household claims.');

    // 8. Pre-execute Fair Household Allocation Engine for the competing cases
    console.log('⚖️ [JanSetu Seed] Pre-evaluating Household Allocation recommendations...');
    await evaluateHouseholdAllocation({
      householdId: hh1._id,
      schemeId: createdSchemes[4]._id,
      benefitPeriod: 'FY_2025_2026'
    });

    await evaluateHouseholdAllocation({
      householdId: hh4._id,
      schemeId: createdSchemes[5]._id,
      benefitPeriod: 'FY_2025_2026'
    });

    if (hh1005) {
      await evaluateHouseholdAllocation({
        householdId: hh1005._id,
        schemeId: createdSchemes[7]._id, // SCH-008 (Housing Assistance Grant)
        benefitPeriod: 'FY_2025_2026'
      });
    }
    console.log('✅ [JanSetu Seed] Household Allocation cases evaluated and recorded.');

    console.log('🎉 [JanSetu Seed] Synthetic database initialization completed successfully.');
    console.log(`📊 Summary: ${createdIndividuals.length} Individuals | ${createdHouseholds.length} Households | ${createdProperties.length} Properties | ${createdSchemes.length} Schemes`);
  } catch (err) {
    console.error('❌ [JanSetu Seed Error]:', err);
  }
};

module.exports = { seedDatabase };
