const { verifyIndividualIdentity } = require('./identityVerificationService');
const { verifyHouseholdMembership } = require('./householdVerificationService');
const { verifyPropertyAssociation } = require('./propertyVerificationService');
const { verifyBenefitHistory } = require('./benefitHistoryVerificationService');
const { detectDuplicates } = require('../duplicateDetectionService');

const CURRENT_RULE_VERSION = 'RULE_SET_v2.4_2026';

/**
 * Government Scheme Eligibility & Verification Engine
 * 
 * Comprehensive, auditable, and scope-aware evaluation:
 * - Detects Scheme Scope: INDIVIDUAL, HOUSEHOLD, or PROPERTY
 * - Evaluates statutory identity, household rosters, and cadastral property title
 * - Enforces previous benefit restrictions without assuming guilt or false matches
 * - Handles provider timeouts and unavailable states gracefully
 */
const assessSchemeEligibility = async ({
  scheme,
  applicant,
  household = null,
  property = null,
  excludeApplicationId = null
}) => {
  const checksPassed = [];
  const checksFailed = [];
  const checksRequiringVerification = [];
  const rulesEvaluated = [];
  const externalApiResults = [];
  const previousBenefitsFound = [];

  const ruleVersion = CURRENT_RULE_VERSION;
  const assessmentTimestamp = new Date();

  // 1. Check Scheme Active Status
  rulesEvaluated.push('RULE_SCHEME_ACTIVE_STATUS');
  if (scheme.isActive) {
    checksPassed.push({
      ruleName: 'RULE_SCHEME_ACTIVE_STATUS',
      description: 'Scheme is officially operational and accepting benefit applications.',
      passed: true
    });
  } else {
    checksFailed.push({
      ruleName: 'RULE_SCHEME_ACTIVE_STATUS',
      description: 'Scheme is marked inactive or decommissioned.',
      reason: 'Scheme is not currently open for new allocations.'
    });
  }

  // 2. Scheme Scope Detection
  rulesEvaluated.push('RULE_SCHEME_SCOPE_DETECTION');
  const scope = scheme.benefitScope || 'INDIVIDUAL';
  checksPassed.push({
    ruleName: 'RULE_SCHEME_SCOPE_DETECTION',
    description: `Configured benefit scope detected: ${scope}. Verification rules targeted accordingly.`,
    passed: true
  });

  // 3. Statutory Individual Identity Verification
  rulesEvaluated.push('RULE_IDENTITY_VERIFICATION');
  const identityCheck = await verifyIndividualIdentity(applicant);
  externalApiResults.push({
    providerId: identityCheck.providerId || 'UIDAI_IDENTITY_PROVIDER',
    service: 'INDIVIDUAL_IDENTITY',
    status: identityCheck.status,
    evidence: identityCheck.evidence,
    isSyntheticDemo: identityCheck.isSyntheticDemo,
    responseTimeMs: identityCheck.responseTimeMs || 120,
    timestamp: new Date()
  });

  if (identityCheck.status === 'VERIFIED') {
    checksPassed.push({
      ruleName: 'RULE_IDENTITY_VERIFICATION',
      description: identityCheck.evidence,
      passed: true
    });
  } else if (identityCheck.status === 'PENDING') {
    checksRequiringVerification.push({
      checkItem: 'Identity Verification (UIDAI Registry)',
      reason: identityCheck.evidence
    });
  } else {
    checksFailed.push({
      ruleName: 'RULE_IDENTITY_VERIFICATION',
      description: 'Demographic identity could not be confirmed.',
      reason: identityCheck.evidence
    });
  }

  // 4. Income / BPL Category Requirement
  rulesEvaluated.push('RULE_INCOME_CATEGORY_COMPLIANCE');
  if (scheme.allowedIncomeCategories && scheme.allowedIncomeCategories.length > 0) {
    const applicantCategory = applicant?.incomeCategory || 'NONE';
    if (scheme.allowedIncomeCategories.includes(applicantCategory)) {
      checksPassed.push({
        ruleName: 'RULE_INCOME_CATEGORY_COMPLIANCE',
        description: `Applicant income category (${applicantCategory}) satisfies scheme criteria (${scheme.allowedIncomeCategories.join(', ')}).`,
        passed: true
      });
    } else {
      checksFailed.push({
        ruleName: 'RULE_INCOME_CATEGORY_COMPLIANCE',
        description: `Applicant income category (${applicantCategory}) does not meet scheme criteria.`,
        reason: `Scheme requires category to be one of: [${scheme.allowedIncomeCategories.join(', ')}]. Individual is registered as ${applicantCategory}.`
      });
    }
  }

  // 5. Maximum Annual Income Cap
  if (typeof scheme.maxAnnualIncome === 'number' && scheme.maxAnnualIncome > 0) {
    rulesEvaluated.push('RULE_MAX_ANNUAL_INCOME_CAP');
    const income = applicant?.annualIncome || 0;
    if (income <= scheme.maxAnnualIncome) {
      checksPassed.push({
        ruleName: 'RULE_MAX_ANNUAL_INCOME_CAP',
        description: `Applicant annual income (₹${income.toLocaleString('en-IN')}) is within limit (₹${scheme.maxAnnualIncome.toLocaleString('en-IN')}).`,
        passed: true
      });
    } else {
      checksFailed.push({
        ruleName: 'RULE_MAX_ANNUAL_INCOME_CAP',
        description: 'Applicant annual income exceeds cap.',
        reason: `Recorded income ₹${income.toLocaleString('en-IN')} exceeds scheme cap of ₹${scheme.maxAnnualIncome.toLocaleString('en-IN')}.`
      });
    }
  }

  // 6. Age Criteria
  if (applicant?.dateOfBirth) {
    const birthDate = new Date(applicant.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (typeof scheme.minAgeYears === 'number' && scheme.minAgeYears > 0) {
      rulesEvaluated.push('RULE_MINIMUM_AGE_CRITERIA');
      if (age >= scheme.minAgeYears) {
        checksPassed.push({
          ruleName: 'RULE_MINIMUM_AGE_CRITERIA',
          description: `Applicant age (${age} years) meets minimum requirement (${scheme.minAgeYears} years).`,
          passed: true
        });
      } else {
        checksFailed.push({
          ruleName: 'RULE_MINIMUM_AGE_CRITERIA',
          description: `Applicant age (${age} years) is below required minimum (${scheme.minAgeYears} years).`,
          reason: `Applicant does not satisfy minimum age requirement of ${scheme.minAgeYears} years.`
        });
      }
    }

    if (typeof scheme.maxAgeYears === 'number' && scheme.maxAgeYears > 0) {
      rulesEvaluated.push('RULE_MAXIMUM_AGE_CRITERIA');
      if (age <= scheme.maxAgeYears) {
        checksPassed.push({
          ruleName: 'RULE_MAXIMUM_AGE_CRITERIA',
          description: `Applicant age (${age} years) is within maximum allowed age (${scheme.maxAgeYears} years).`,
          passed: true
        });
      } else {
        checksFailed.push({
          ruleName: 'RULE_MAXIMUM_AGE_CRITERIA',
          description: 'Applicant age exceeds upper limit.',
          reason: `Applicant age (${age} years) exceeds maximum allowed age (${scheme.maxAgeYears} years).`
        });
      }
    }
  }

  // 7. Target Gender Criteria
  if (scheme.targetGender && scheme.targetGender !== 'ALL') {
    rulesEvaluated.push('RULE_TARGET_GENDER_CRITERIA');
    if (applicant?.gender === scheme.targetGender) {
      checksPassed.push({
        ruleName: 'RULE_TARGET_GENDER_CRITERIA',
        description: `Applicant gender (${applicant.gender}) matches scheme target (${scheme.targetGender}).`,
        passed: true
      });
    } else {
      checksFailed.push({
        ruleName: 'RULE_TARGET_GENDER_CRITERIA',
        description: 'Applicant gender does not match scheme target.',
        reason: `Scheme is reserved for ${scheme.targetGender} applicants.`
      });
    }
  }

  // 8. Scope Associated Entity Checks
  if (scope === 'HOUSEHOLD') {
    rulesEvaluated.push('RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION');
    const hhCheck = await verifyHouseholdMembership(applicant, household);
    externalApiResults.push({
      providerId: hhCheck.providerId || 'NFSA_PDS_HOUSEHOLD_PROVIDER',
      service: 'HOUSEHOLD_MEMBERSHIP',
      status: hhCheck.status,
      evidence: hhCheck.evidence,
      isSyntheticDemo: hhCheck.isSyntheticDemo,
      responseTimeMs: hhCheck.responseTimeMs || 150,
      timestamp: new Date()
    });

    if (hhCheck.status === 'VERIFIED') {
      checksPassed.push({
        ruleName: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
        description: hhCheck.evidence,
        passed: true
      });
    } else if (hhCheck.status === 'PENDING') {
      checksRequiringVerification.push({
        checkItem: 'Household Roster External Verification',
        reason: hhCheck.evidence
      });
    } else {
      checksFailed.push({
        ruleName: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
        description: 'Household roster verification failed.',
        reason: hhCheck.evidence
      });
    }
  } else if (scope === 'PROPERTY') {
    rulesEvaluated.push('RULE_PROPERTY_TITLE_VERIFICATION');
    const propCheck = await verifyPropertyAssociation(applicant, household, property);
    externalApiResults.push({
      providerId: propCheck.providerId || 'BHUNAKSHA_LAND_PROVIDER',
      service: 'PROPERTY_ASSOCIATION',
      status: propCheck.status,
      evidence: propCheck.evidence,
      isSyntheticDemo: propCheck.isSyntheticDemo,
      responseTimeMs: propCheck.responseTimeMs || 180,
      timestamp: new Date()
    });

    if (propCheck.status === 'VERIFIED') {
      checksPassed.push({
        ruleName: 'RULE_PROPERTY_TITLE_VERIFICATION',
        description: propCheck.evidence,
        passed: true
      });
    } else if (propCheck.status === 'PENDING') {
      checksRequiringVerification.push({
        checkItem: 'Property Title Cadastral Verification',
        reason: propCheck.evidence
      });
    } else {
      checksFailed.push({
        ruleName: 'RULE_PROPERTY_TITLE_VERIFICATION',
        description: 'Property title verification could not be confirmed.',
        reason: propCheck.evidence
      });
    }
  }

  // 9. Benefit History & Previous Duplicate Detection
  rulesEvaluated.push('RULE_PREVIOUS_BENEFIT_DUPLICATE_CHECK');
  const benefitHistory = await verifyBenefitHistory({
    scheme,
    applicant,
    household,
    property,
    excludeApplicationId
  });

  if (benefitHistory.historicalRecords) {
    previousBenefitsFound.push(...benefitHistory.historicalRecords);
  }

  externalApiResults.push({
    providerId: 'PFMS_DBT_BENEFIT_PROVIDER',
    service: 'PREVIOUS_BENEFIT',
    status: benefitHistory.externalApiStatus,
    evidence: benefitHistory.providerEvidence,
    isSyntheticDemo: true,
    responseTimeMs: 140,
    timestamp: new Date()
  });

  // Call DuplicateDetectionService
  const duplicateResult = await detectDuplicates({
    scheme,
    applicantIndividual: applicant,
    household,
    property,
    excludeApplicationId
  });

  if (benefitHistory.status === 'PENDING') {
    checksRequiringVerification.push({
      checkItem: 'PFMS Benefit History Verification',
      reason: benefitHistory.providerEvidence
    });
  } else if (duplicateResult.isPotentialDuplicate || benefitHistory.hasConflict) {
    for (const alert of duplicateResult.alerts) {
      checksRequiringVerification.push({
        checkItem: `Potential Benefit Overlap (${alert.candidateType})`,
        reason: alert.explanation
      });
    }
  } else {
    checksPassed.push({
      ruleName: 'RULE_PREVIOUS_BENEFIT_DUPLICATE_CHECK',
      description: 'Historical records verify no prior conflicting benefit sanctioned or active for this scope.',
      passed: true
    });
  }

  // 10. Synthesize Overall Assessment Result
  let overallResult = 'ELIGIBLE';
  let explanation = 'All baseline criteria satisfied. No duplicate claims or conflicting allocations found.';

  const isPendingProvider = externalApiResults.some((api) => api.status === 'PENDING' || api.status === 'TIMEOUT');

  if (checksFailed.length > 0) {
    overallResult = 'INELIGIBLE';
    explanation = `Applicant does not satisfy ${checksFailed.length} mandatory requirement(s): ${checksFailed.map((c) => c.reason).join('; ')}`;
  } else if (isPendingProvider) {
    overallResult = 'VERIFICATION_PENDING';
    explanation = 'Verification pending — the relevant external record could not be confirmed.';
  } else if (checksRequiringVerification.length > 0 || duplicateResult.isPotentialDuplicate) {
    overallResult = 'REQUIRES_VERIFICATION';
    explanation = `Baseline eligibility criteria satisfied, but ${checksRequiringVerification.length} record item(s) require authorized officer verification prior to sanction.`;
  }

  return {
    overallResult,
    ruleVersion,
    assessmentTimestamp,
    checksPassed,
    checksFailed,
    checksRequiringVerification,
    rulesEvaluated,
    externalApiResults,
    previousBenefitsFound,
    explanation,
    duplicateResult
  };
};

module.exports = {
  CURRENT_RULE_VERSION,
  assessSchemeEligibility
};
