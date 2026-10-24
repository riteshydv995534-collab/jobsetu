const Individual = require('../models/Individual');
const Scheme = require('../models/Scheme');
const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');
const Household = require('../models/Household');
const Property = require('../models/Property');

const CURRENT_RULE_VERSION = 'RULE_SET_v2.4_2026';

/**
 * Evaluates an individual citizen profile against a specific scheme
 */
const evaluateIndividualForScheme = async (individualId, schemeId) => {
  const individual = await Individual.findById(individualId).populate('currentHousehold');
  if (!individual) {
    throw new Error(`Individual record ${individualId} not found`);
  }

  const scheme = await Scheme.findById(schemeId);
  if (!scheme) {
    throw new Error(`Scheme record ${schemeId} not found`);
  }

  const checksPassed = [];
  const checksFailed = [];
  const checksPending = [];

  // Calculate age from dateOfBirth
  const birthYear = new Date(individual.dateOfBirth).getFullYear();
  const currentYear = new Date().getFullYear();
  const ageYears = currentYear - birthYear;

  // 1. Mandatory Age Range Check
  if (scheme.minAgeYears !== null && scheme.minAgeYears !== undefined) {
    if (ageYears < scheme.minAgeYears) {
      checksFailed.push({
        rule: 'RULE_MIN_AGE',
        description: `Applicant age (${ageYears} yrs) is below the minimum required age of ${scheme.minAgeYears} yrs`,
        field: 'dateOfBirth'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_MIN_AGE',
        description: `Applicant age (${ageYears} yrs) satisfies minimum age threshold of ${scheme.minAgeYears} yrs`
      });
    }
  }

  if (scheme.maxAgeYears !== null && scheme.maxAgeYears !== undefined) {
    if (ageYears > scheme.maxAgeYears) {
      checksFailed.push({
        rule: 'RULE_MAX_AGE',
        description: `Applicant age (${ageYears} yrs) exceeds maximum allowed age limit of ${scheme.maxAgeYears} yrs`,
        field: 'dateOfBirth'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_MAX_AGE',
        description: `Applicant age (${ageYears} yrs) satisfies maximum age limit of ${scheme.maxAgeYears} yrs`
      });
    }
  }

  // 2. Mandatory Income Category Check
  if (scheme.allowedIncomeCategories && scheme.allowedIncomeCategories.length > 0) {
    if (!scheme.allowedIncomeCategories.includes(individual.incomeCategory)) {
      checksFailed.push({
        rule: 'RULE_INCOME_CATEGORY',
        description: `Applicant classification (${individual.incomeCategory}) not in eligible categories (${scheme.allowedIncomeCategories.join(', ')})`,
        field: 'incomeCategory'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_INCOME_CATEGORY',
        description: `Applicant classification (${individual.incomeCategory}) qualifies for scheme quota`
      });
    }
  }

  // 3. Mandatory Annual Income Ceiling Check
  if (scheme.maxAnnualIncome !== null && scheme.maxAnnualIncome !== undefined && scheme.maxAnnualIncome > 0) {
    if (individual.annualIncome > scheme.maxAnnualIncome) {
      checksFailed.push({
        rule: 'RULE_INCOME_CEILING',
        description: `Annual income (₹${individual.annualIncome.toLocaleString('en-IN')}) exceeds statutory threshold (₹${scheme.maxAnnualIncome.toLocaleString('en-IN')})`,
        field: 'annualIncome'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_INCOME_CEILING',
        description: `Annual income (₹${individual.annualIncome.toLocaleString('en-IN')}) is within statutory ceiling (₹${scheme.maxAnnualIncome.toLocaleString('en-IN')})`
      });
    }
  }

  // 4. Gender Criterion
  if (scheme.targetGender && scheme.targetGender !== 'ALL') {
    if (individual.gender !== scheme.targetGender) {
      checksFailed.push({
        rule: 'RULE_TARGET_GENDER',
        description: `Scheme targets ${scheme.targetGender} applicants; applicant recorded as ${individual.gender}`,
        field: 'gender'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_TARGET_GENDER',
        description: `Applicant gender (${individual.gender}) satisfies target cohort requirement`
      });
    }
  }

  // 5. Employment Condition Check
  if (
    scheme.allowedEmploymentStatus &&
    scheme.allowedEmploymentStatus.length > 0 &&
    !scheme.allowedEmploymentStatus.includes('ALL')
  ) {
    if (!scheme.allowedEmploymentStatus.includes(individual.employmentStatus)) {
      checksFailed.push({
        rule: 'RULE_EMPLOYMENT_CONDITION',
        description: `Employment status (${individual.employmentStatus}) does not match allowed statuses (${scheme.allowedEmploymentStatus.join(', ')})`,
        field: 'employmentStatus'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_EMPLOYMENT_CONDITION',
        description: `Employment status (${individual.employmentStatus}) qualifies under scheme conditions`
      });
    }
  }

  // 6. Education Status Check
  if (
    scheme.allowedEducationStatus &&
    scheme.allowedEducationStatus.length > 0 &&
    !scheme.allowedEducationStatus.includes('ALL')
  ) {
    if (!scheme.allowedEducationStatus.includes(individual.educationStatus)) {
      checksFailed.push({
        rule: 'RULE_EDUCATION_STATUS',
        description: `Education attainment (${individual.educationStatus}) does not meet scheme criteria (${scheme.allowedEducationStatus.join(', ')})`,
        field: 'educationStatus'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_EDUCATION_STATUS',
        description: `Education attainment (${individual.educationStatus}) meets scheme criteria`
      });
    }
  }

  // 7. Disability Requirement Check
  if (scheme.requiresDisability) {
    if (!individual.hasDisability) {
      checksFailed.push({
        rule: 'RULE_DISABILITY_ELIGIBILITY',
        description: 'Scheme requires documented disability welfare status',
        field: 'hasDisability'
      });
    } else {
      checksPassed.push({
        rule: 'RULE_DISABILITY_ELIGIBILITY',
        description: 'Documented disability welfare status confirmed'
      });
    }
  }

  // 8. Document & Verification Status
  if (individual.verificationStatus === 'PENDING') {
    checksPending.push({
      rule: 'RULE_CIVIL_VERIFICATION',
      description: 'Applicant demographic or civil registration record is in PENDING verification state',
      field: 'verificationStatus'
    });
  } else if (individual.verificationStatus === 'FLAGGED_CONFLICT') {
    checksPending.push({
      rule: 'RULE_DATA_CONFLICT',
      description: 'Applicant identity records flagged with external registry discrepancies requiring human review',
      field: 'verificationStatus'
    });
  } else {
    checksPassed.push({
      rule: 'RULE_CIVIL_VERIFICATION',
      description: 'Applicant civil and identity verification records authenticated'
    });
  }

  // 9. Check Previous Benefits relevant to this scheme
  const previousDisbursedBenefits = await BenefitRecord.find({
    scheme: scheme._id,
    recipientIndividual: individual._id,
    status: 'DISBURSED'
  });

  const previousSanctionedBenefits = await BenefitRecord.find({
    scheme: scheme._id,
    recipientIndividual: individual._id,
    status: 'SANCTIONED'
  });

  const pendingApplications = await Application.find({
    scheme: scheme._id,
    applicantIndividual: individual._id,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING'] }
  });

  let hasDisbursedRepeatRestriction = false;
  let previousBenefitReviewRequired = false;

  if (previousDisbursedBenefits.length >= scheme.maxLifetimeAllocationsPerScope) {
    if (scheme.repeatBenefitPolicy === 'NO_REPEAT' || scheme.repeatBenefitPolicy === 'ONCE_PER_LIFETIME') {
      hasDisbursedRepeatRestriction = true;
      checksFailed.push({
        rule: 'RULE_REPEAT_BENEFIT_RESTRICTION',
        description: `Applicant has previously received ${previousDisbursedBenefits.length} disbursed benefit(s) under this scheme. Lifetime limit: ${scheme.maxLifetimeAllocationsPerScope}`,
        field: 'previousBenefits'
      });
    }
  }

  if (previousSanctionedBenefits.length > 0) {
    checksPending.push({
      rule: 'RULE_PREVIOUS_SANCTION_PENDING',
      description: `Applicant has ${previousSanctionedBenefits.length} sanctioned benefit(s) awaiting actual DBT disbursement; cannot assume as completed payment`
    });
    previousBenefitReviewRequired = true;
  }

  if (pendingApplications.length > 0) {
    checksPending.push({
      rule: 'RULE_ACTIVE_CLAIM_IN_PROGRESS',
      description: `Applicant currently has an active application (${pendingApplications[0].applicationId}) in review under this scheme`
    });
  }

  // Determine Overall Result
  let overallResult = 'ELIGIBLE';
  let explanation = 'All statutory mandatory conditions and eligibility criteria satisfied.';

  if (checksFailed.length > 0) {
    overallResult = 'INELIGIBLE';
    explanation = checksFailed.map((f) => f.description).join('. ');
  } else if (hasDisbursedRepeatRestriction) {
    overallResult = 'INELIGIBLE';
    explanation = 'Repeat benefit limit reached for this citizen under statutory rules.';
  } else if (checksPending.length > 0) {
    if (previousBenefitReviewRequired) {
      overallResult = 'PREVIOUS_BENEFIT_REVIEW_REQUIRED';
      explanation = 'A previous sanctioned claim or active application requires officer inspection.';
    } else {
      overallResult = 'VERIFICATION_PENDING';
      explanation = 'Verification pending — one or more statutory criteria require external record confirmation.';
    }
  }

  const totalRules = checksPassed.length + checksFailed.length + checksPending.length;
  const eligibilityPercentage = totalRules > 0 ? Math.round((checksPassed.length / totalRules) * 100) : 100;

  const requiredCorrections = checksFailed.map((f) => ({
    rule: f.rule,
    issue: f.description,
    field: f.field,
    action: f.field === 'annualIncome'
      ? 'Submit updated income affidavit or latest ITR certificate to verify current income bracket'
      : f.field === 'dateOfBirth'
      ? 'Provide authenticated municipal birth certificate or matriculation certificate'
      : f.field === 'incomeCategory'
      ? 'Upload valid BPL / Antyodaya ration card certificate issued by competent authority'
      : `Provide civil verification proof for ${f.rule}`
  }));

  const missingDocuments = checksPending
    .filter((p) => p.rule.includes('DOC') || p.rule.includes('VERIFICATION') || p.rule.includes('CLAIM'))
    .map((p) => ({
      documentName: p.rule.replace('RULE_', '').replace(/_/g, ' '),
      reason: p.description
    }));

  return {
    individualId: individual.individualId,
    fullName: individual.fullName,
    schemeId: scheme.schemeId,
    schemeName: scheme.name,
    benefitScope: scheme.benefitScope,
    overallResult,
    explanation,
    eligibilityPercentage,
    requiredCorrections,
    missingDocuments,
    applicableBenefitAmount: scheme.maxBenefitAmount,
    ruleVersion: scheme.ruleVersion || CURRENT_RULE_VERSION,
    checksPassed,
    checksFailed,
    checksPending,
    previousBenefitsFound: {
      disbursed: previousDisbursedBenefits.length,
      sanctioned: previousSanctionedBenefits.length,
      pendingApplications: pendingApplications.length
    }
  };
};

/**
 * Evaluates all active schemes and returns a comprehensive discovery report
 * for an individual citizen (Individual, Household, Property benefits)
 */
const getPotentialBenefitsForIndividual = async (individualId) => {
  const individual = await Individual.findById(individualId).populate('currentHousehold');
  if (!individual) {
    throw new Error(`Individual record ${individualId} not found`);
  }

  const allSchemes = await Scheme.find({ isActive: true });
  const individualSchemes = allSchemes.filter((s) => s.benefitScope === 'INDIVIDUAL');
  const householdSchemes = allSchemes.filter((s) => s.benefitScope === 'HOUSEHOLD');
  const propertySchemes = allSchemes.filter((s) => s.benefitScope === 'PROPERTY');

  // 1. Evaluate Individual Schemes
  const evaluatedIndividualBenefits = [];
  for (const sch of individualSchemes) {
    const result = await evaluateIndividualForScheme(individual._id, sch._id);
    evaluatedIndividualBenefits.push({
      scheme: sch,
      evaluation: result
    });
  }

  // 2. Evaluate Household Schemes if citizen has linked household
  const evaluatedHouseholdBenefits = [];
  let linkedHousehold = individual.currentHousehold;
  if (linkedHousehold) {
    // If not populated or just id
    if (!linkedHousehold.householdId) {
      linkedHousehold = await Household.findById(linkedHousehold);
    }

    if (linkedHousehold) {
      for (const sch of householdSchemes) {
        // Check previous household benefits
        const prevHouseholdBenefits = await BenefitRecord.find({
          scheme: sch._id,
          recipientHousehold: linkedHousehold._id,
          status: 'DISBURSED'
        });

        const prevSanctioned = await BenefitRecord.find({
          scheme: sch._id,
          recipientHousehold: linkedHousehold._id,
          status: 'SANCTIONED'
        });

        // Check competing member applications
        const competingApplications = await Application.find({
          scheme: sch._id,
          household: linkedHousehold._id,
          status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING'] }
        }).populate('applicantIndividual', 'fullName individualId');

        let hhResult = 'ELIGIBLE';
        let hhReason = 'Household qualifies under baseline roster criteria.';

        // Check income category
        if (
          sch.allowedIncomeCategories &&
          sch.allowedIncomeCategories.length > 0 &&
          !sch.allowedIncomeCategories.includes(individual.incomeCategory)
        ) {
          hhResult = 'INELIGIBLE';
          hhReason = `Household classification (${individual.incomeCategory}) does not meet scheme requirements.`;
        } else if (prevHouseholdBenefits.length >= sch.maxLifetimeAllocationsPerScope) {
          hhResult = 'INELIGIBLE';
          hhReason = `Household has already received the maximum allowed allocation (${prevHouseholdBenefits.length}/${sch.maxLifetimeAllocationsPerScope}) for this scheme.`;
        } else if (prevSanctioned.length > 0) {
          hhResult = 'VERIFICATION_PENDING';
          hhReason = 'A previous household benefit is sanctioned and awaiting disbursement confirmation.';
        } else if (competingApplications.length > 0) {
          hhResult = 'POTENTIAL_DUPLICATE_REVIEW';
          hhReason = `${competingApplications.length} other household member(s) have active applications for this restricted benefit.`;
        }

        evaluatedHouseholdBenefits.push({
          scheme: sch,
          evaluation: {
            overallResult: hhResult,
            explanation: hhReason,
            householdId: linkedHousehold.householdId,
            competingMembersCount: competingApplications.length,
            competingApplicants: competingApplications.map((app) => app.applicantIndividual?.fullName),
            previousDisbursedCount: prevHouseholdBenefits.length
          }
        });
      }
    }
  }

  // 3. Evaluate Property Schemes
  const evaluatedPropertyBenefits = [];
  let linkedProperty = null;
  if (linkedHousehold && linkedHousehold.propertyAssociation) {
    linkedProperty = await Property.findById(linkedHousehold.propertyAssociation);
  }

  for (const sch of propertySchemes) {
    if (!linkedProperty) {
      evaluatedPropertyBenefits.push({
        scheme: sch,
        evaluation: {
          overallResult: 'VERIFICATION_PENDING',
          explanation: 'No registered cadastral property associated with this citizen/household.'
        }
      });
    } else {
      const prevPropBenefits = await BenefitRecord.find({
        scheme: sch._id,
        recipientProperty: linkedProperty._id,
        status: 'DISBURSED'
      });

      let propResult = 'ELIGIBLE';
      let propReason = 'Cadastral parcel verified and eligible for property infrastructure support.';

      if (prevPropBenefits.length >= sch.maxLifetimeAllocationsPerScope) {
        propResult = 'INELIGIBLE';
        propReason = `Property has already received maximum permissible benefit allocations (${prevPropBenefits.length}/${sch.maxLifetimeAllocationsPerScope}).`;
      }

      evaluatedPropertyBenefits.push({
        scheme: sch,
        evaluation: {
          overallResult: propResult,
          explanation: propReason,
          propertyId: linkedProperty.propertyId,
          plotNumber: linkedProperty.plotNumber,
          previousDisbursedCount: prevPropBenefits.length
        }
      });
    }
  }

  // 4. Retrieve Previous Benefits Received by this Citizen
  const previousBenefits = await BenefitRecord.find({
    recipientIndividual: individual._id
  })
    .populate('scheme', 'name code benefitScope maxBenefitAmount')
    .sort({ sanctionDate: -1 });

  return {
    individual: {
      id: individual._id,
      individualId: individual.individualId,
      fullName: individual.fullName,
      gender: individual.gender,
      dateOfBirth: individual.dateOfBirth,
      incomeCategory: individual.incomeCategory,
      annualIncome: individual.annualIncome,
      employmentStatus: individual.employmentStatus,
      educationStatus: individual.educationStatus,
      hasDisability: individual.hasDisability,
      verificationStatus: individual.verificationStatus,
      householdId: linkedHousehold?.householdId || null
    },
    individualBenefits: evaluatedIndividualBenefits,
    householdBenefits: evaluatedHouseholdBenefits,
    propertyBenefits: evaluatedPropertyBenefits,
    previousBenefits,
    summary: {
      totalEligibleIndividual: evaluatedIndividualBenefits.filter((b) => b.evaluation.overallResult === 'ELIGIBLE').length,
      totalIneligibleIndividual: evaluatedIndividualBenefits.filter((b) => b.evaluation.overallResult === 'INELIGIBLE').length,
      totalPendingIndividual: evaluatedIndividualBenefits.filter((b) => ['VERIFICATION_PENDING', 'PREVIOUS_BENEFIT_REVIEW_REQUIRED'].includes(b.evaluation.overallResult)).length,
      totalEligibleHousehold: evaluatedHouseholdBenefits.filter((b) => b.evaluation.overallResult === 'ELIGIBLE').length,
      totalPreviousBenefitsReceived: previousBenefits.length
    }
  };
};

module.exports = {
  evaluateIndividualForScheme,
  getPotentialBenefitsForIndividual,
  CURRENT_RULE_VERSION
};
