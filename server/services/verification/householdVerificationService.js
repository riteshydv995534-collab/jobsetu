const Household = require('../../models/Household');
const HouseholdMembership = require('../../models/HouseholdMembership');
const { invokeProvider } = require('./apiProviderRegistry');

/**
 * Household Membership Verification Service
 * Validates applicant's household roster membership against local DB and NFSA/PDS external registry.
 */
const verifyHouseholdMembership = async (applicant, household) => {
  if (!household) {
    return {
      status: 'UNVERIFIED',
      passed: false,
      requiresVerification: true,
      evidence: 'No linked household record provided for household scope verification.',
      ruleEvaluated: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
      isSyntheticDemo: true
    };
  }

  // 1. Invoke external NFSA/PDS Household Provider
  const providerResponse = await invokeProvider('NFSA_PDS_HOUSEHOLD_PROVIDER', {
    householdId: household.householdId,
    rationCardNumber: household.rationCardNumber,
    applicantIndividualId: applicant?.individualId
  });

  // Check provider resilience
  if (providerResponse.status === 'UNAVAILABLE' || providerResponse.status === 'TIMEOUT') {
    return {
      status: 'PENDING',
      passed: false,
      requiresVerification: true,
      providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER',
      evidence: 'Verification pending — the relevant external record could not be confirmed.',
      ruleEvaluated: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
      responseTimeMs: providerResponse.responseTimeMs,
      isSyntheticDemo: providerResponse.isSyntheticDemo
    };
  }

  if (providerResponse.status === 'FAILURE') {
    return {
      status: 'UNVERIFIED',
      passed: false,
      requiresVerification: true,
      providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER',
      evidence: 'Household verification service encountered an upstream provider failure. Manual officer review required.',
      ruleEvaluated: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
      responseTimeMs: providerResponse.responseTimeMs,
      isSyntheticDemo: providerResponse.isSyntheticDemo
    };
  }

  // 2. Check internal HouseholdMembership consistency
  let activeMemberships = [];
  if (applicant?._id) {
    activeMemberships = await HouseholdMembership.find({
      individual: applicant._id,
      isCurrent: true
    }).populate('household');
  }

  // Check for conflicting or multiple active households for the applicant
  if (activeMemberships.length > 1) {
    const hhIds = activeMemberships.map((m) => m.household?.householdId || 'Unknown').join(', ');
    return {
      status: 'UNVERIFIED',
      passed: false,
      requiresVerification: true,
      hasConflict: true,
      providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER',
      evidence: `Conflicting household records detected: Applicant is currently associated with multiple active households (${hhIds}). Requires administrative roster reconciliation.`,
      ruleEvaluated: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
      responseTimeMs: providerResponse.responseTimeMs,
      isSyntheticDemo: providerResponse.isSyntheticDemo
    };
  }

  // Check membership in the specific target household
  const targetMembership = activeMemberships.find(
    (m) => m.household?._id?.toString() === household._id?.toString()
  );

  // If applicant is registered in target household directly or via membership
  const isDirectlyLinked = applicant?.currentHousehold?.toString() === household._id?.toString();

  if (targetMembership || isDirectlyLinked) {
    return {
      status: 'VERIFIED',
      passed: true,
      requiresVerification: false,
      providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER',
      evidence: `Active household membership verified for Household ${household.householdId} (Ration: ${household.rationCardNumber || 'Verified Roster'}).`,
      ruleEvaluated: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
      responseTimeMs: providerResponse.responseTimeMs,
      isSyntheticDemo: providerResponse.isSyntheticDemo
    };
  }

  // Unlinked household
  return {
    status: 'UNVERIFIED',
    passed: false,
    requiresVerification: true,
    providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER',
    evidence: `Applicant ${applicant?.fullName || 'Citizen'} does not have an active verified roster membership in Household ${household.householdId}.`,
    ruleEvaluated: 'RULE_HOUSEHOLD_MEMBERSHIP_VERIFICATION',
    responseTimeMs: providerResponse.responseTimeMs,
    isSyntheticDemo: providerResponse.isSyntheticDemo
  };
};

module.exports = {
  verifyHouseholdMembership
};
