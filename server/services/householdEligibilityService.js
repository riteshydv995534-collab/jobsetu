const Household = require('../models/Household');
const Individual = require('../models/Individual');
const HouseholdMembership = require('../models/HouseholdMembership');
const Scheme = require('../models/Scheme');
const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');

const CURRENT_RULE_VERSION = 'RULE_SET_v2.4_2026';

/**
 * Evaluates a household against a specific household-level scheme
 */
const evaluateHouseholdForScheme = async (householdId, schemeId) => {
  const household = await Household.findById(householdId).populate('headOfHousehold');
  if (!household) {
    throw new Error(`Household record ${householdId} not found`);
  }

  const scheme = await Scheme.findById(schemeId);
  if (!scheme) {
    throw new Error(`Scheme record ${schemeId} not found`);
  }

  const members = await Individual.find({ currentHousehold: household._id });

  const checksPassed = [];
  const checksFailed = [];
  const checksPending = [];

  // 1. Household Verification Status
  if (household.verificationStatus === 'PENDING') {
    checksPending.push({
      rule: 'RULE_HOUSEHOLD_VERIFICATION',
      description: 'Household civil ration roster record is currently pending state verification'
    });
  } else if (household.verificationStatus === 'FLAGGED_CONFLICT') {
    checksPending.push({
      rule: 'RULE_HOUSEHOLD_CONFLICT',
      description: 'Household address or membership roster has active civil record discrepancies'
    });
  } else {
    checksPassed.push({
      rule: 'RULE_HOUSEHOLD_VERIFICATION',
      description: 'Household roster and ration record authenticated with civil registry'
    });
  }

  // 2. Household Income Evaluation
  const totalHouseholdIncome =
    household.annualHouseholdIncome || members.reduce((sum, m) => sum + (m.annualIncome || 0), 0);

  if (scheme.maxAnnualIncome && totalHouseholdIncome > scheme.maxAnnualIncome) {
    checksFailed.push({
      rule: 'RULE_HOUSEHOLD_INCOME_CEILING',
      description: `Cumulative household income (₹${totalHouseholdIncome.toLocaleString('en-IN')}) exceeds scheme limit (₹${scheme.maxAnnualIncome.toLocaleString('en-IN')})`,
      field: 'annualHouseholdIncome'
    });
  } else {
    checksPassed.push({
      rule: 'RULE_HOUSEHOLD_INCOME_CEILING',
      description: `Cumulative household income (₹${totalHouseholdIncome.toLocaleString('en-IN')}) is within eligible ceiling`
    });
  }

  // 3. Allowed Income Categories (Head or Member)
  const headCategory = household.headOfHousehold ? household.headOfHousehold.incomeCategory : 'BPL';
  if (scheme.allowedIncomeCategories && scheme.allowedIncomeCategories.length > 0) {
    const hasQualifyingCategory = members.some((m) => scheme.allowedIncomeCategories.includes(m.incomeCategory));
    if (!hasQualifyingCategory && !scheme.allowedIncomeCategories.includes(headCategory)) {
      checksFailed.push({
        rule: 'RULE_HOUSEHOLD_CATEGORY',
        description: `Household classification (${headCategory}) does not match allowed categories (${scheme.allowedIncomeCategories.join(', ')})`,
        field: 'incomeCategory'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_HOUSEHOLD_CATEGORY',
        description: 'Household members satisfy targeted socioeconomic category quota'
      });
    }
  }

  // 4. Previous Household Benefits Check (One benefit per household restriction)
  const previousDisbursedHouseholdBenefits = await BenefitRecord.find({
    scheme: scheme._id,
    recipientHousehold: household._id,
    status: 'DISBURSED'
  });

  const previousSanctionedHouseholdBenefits = await BenefitRecord.find({
    scheme: scheme._id,
    recipientHousehold: household._id,
    status: 'SANCTIONED'
  });

  let isRestrictedDuplicate = false;

  if (previousDisbursedHouseholdBenefits.length >= scheme.maxLifetimeAllocationsPerScope) {
    if (scheme.repeatBenefitPolicy === 'NO_REPEAT' || scheme.repeatBenefitPolicy === 'ONCE_PER_LIFETIME') {
      isRestrictedDuplicate = true;
      checksFailed.push({
        rule: 'RULE_ONE_BENEFIT_PER_HOUSEHOLD',
        description: `This household has already received ${previousDisbursedHouseholdBenefits.length} disbursed benefit(s) under ${scheme.name}. Policy: strictly 1 benefit per verified household`,
        field: 'previousBenefits'
      });
    }
  }

  if (previousSanctionedHouseholdBenefits.length > 0) {
    checksPending.push({
      rule: 'RULE_PREVIOUS_SANCTION_CONFIRMATION',
      description: `A benefit was sanctioned on ${new Date(previousSanctionedHouseholdBenefits[0].sanctionDate).toLocaleDateString()} for this household but DBT disbursement is pending; cannot treat as completed payment`
    });
  }

  // 5. Detect Overlapping Member Applications for the same scheme
  const competingApplications = await Application.find({
    scheme: scheme._id,
    household: household._id,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING'] }
  }).populate('applicantIndividual', 'fullName individualId annualIncome incomeCategory dateOfBirth');

  if (competingApplications.length > 1) {
    checksPending.push({
      rule: 'RULE_COMPETING_HOUSEHOLD_APPLICATIONS',
      description: `Detected ${competingApplications.length} members of this household applying for the same restricted household benefit. Requires Fair Allocation Engine execution`
    });
  }

  // Final Assessment Result
  let overallResult = 'ELIGIBLE';
  let explanation = 'Household satisfies all statutory criteria for this welfare scheme.';

  if (checksFailed.length > 0) {
    overallResult = 'INELIGIBLE';
    explanation = checksFailed.map((f) => f.description).join('. ');
  } else if (competingApplications.length > 1) {
    overallResult = 'REQUIRES_ALLOCATION_REVIEW';
    explanation = `Multiple family members (${competingApplications.map((a) => a.applicantIndividual?.fullName).join(', ')}) are competing for a single household entitlement. Allocation Engine recommendation generated.`;
  } else if (checksPending.length > 0) {
    overallResult = 'VERIFICATION_PENDING';
    explanation = checksPending.map((p) => p.description).join('. ');
  }

  const totalRules = checksPassed.length + checksFailed.length + checksPending.length;
  const eligibilityPercentage = totalRules > 0 ? Math.round((checksPassed.length / totalRules) * 100) : 100;

  const requiredCorrections = checksFailed.map((f) => ({
    rule: f.rule,
    issue: f.description,
    field: f.field,
    action: f.field === 'annualHouseholdIncome'
      ? 'Upload comprehensive household income certificate issued by Tehsildar/Sub-Divisional Officer'
      : `Resolve ${f.rule} with civil supplies registry`
  }));

  const missingDocuments = checksPending.map((p) => ({
    documentName: p.rule.replace('RULE_', '').replace(/_/g, ' '),
    reason: p.description
  }));

  return {
    householdId: household.householdId,
    schemeId: scheme.schemeId,
    schemeName: scheme.name,
    benefitScope: scheme.benefitScope,
    overallResult,
    explanation,
    eligibilityPercentage,
    requiredCorrections,
    missingDocuments,
    isRestrictedDuplicate,
    totalMembers: members.length,
    cumulativeIncome: totalHouseholdIncome,
    competingApplicationsCount: competingApplications.length,
    competingApplications: competingApplications.map((a) => ({
      applicationId: a.applicationId,
      applicantName: a.applicantIndividual?.fullName,
      applicantId: a.applicantIndividual?.individualId,
      applicationDate: a.applicationDate,
      status: a.status
    })),
    checksPassed,
    checksFailed,
    checksPending,
    ruleVersion: scheme.ruleVersion || CURRENT_RULE_VERSION
  };
};

/**
 * Returns all potential benefits, active applications, and allocation states for a household
 */
const getPotentialBenefitsForHousehold = async (householdId) => {
  const household = await Household.findById(householdId).populate('headOfHousehold propertyAssociation');
  if (!household) {
    throw new Error(`Household record ${householdId} not found`);
  }

  const members = await Individual.find({ currentHousehold: household._id });
  const householdSchemes = await Scheme.find({ benefitScope: 'HOUSEHOLD', isActive: true });

  const evaluatedSchemes = [];
  for (const sch of householdSchemes) {
    const evaluation = await evaluateHouseholdForScheme(household._id, sch._id);
    evaluatedSchemes.push({
      scheme: sch,
      evaluation
    });
  }

  const previousBenefits = await BenefitRecord.find({
    recipientHousehold: household._id
  })
    .populate('scheme', 'name code benefitScope maxBenefitAmount')
    .sort({ sanctionDate: -1 });

  return {
    household: {
      id: household._id,
      householdId: household.householdId,
      householdReference: household.householdReference || household.householdId,
      addressLine1: household.addressLine1,
      district: household.district,
      state: household.state,
      rationCardNumber: household.rationCardNumber,
      householdSize: members.length || household.householdSize,
      headOfHouseholdName: household.headOfHousehold?.fullName || 'Not Designated',
      members: members.map((m) => ({
        id: m._id,
        fullName: m.fullName,
        individualId: m.individualId,
        incomeCategory: m.incomeCategory,
        annualIncome: m.annualIncome,
        employmentStatus: m.employmentStatus
      }))
    },
    householdSchemes: evaluatedSchemes,
    previousBenefits,
    competingApplicationsDetected: evaluatedSchemes.some((s) => s.evaluation.competingApplicationsCount > 1)
  };
};

module.exports = {
  evaluateHouseholdForScheme,
  getPotentialBenefitsForHousehold,
  CURRENT_RULE_VERSION
};
