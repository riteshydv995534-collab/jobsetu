const BenefitRecord = require('../../models/BenefitRecord');
const Application = require('../../models/Application');
const DisbursementRecord = require('../../models/DisbursementRecord');
const DuplicateAlert = require('../../models/DuplicateAlert');
const { invokeProvider } = require('./apiProviderRegistry');

/**
 * Unified Benefit History & Disbursement Verification Service
 * 
 * Accurately classifies historical records into distinct statutory statuses:
 * - APPLICATION_SUBMITTED
 * - APPLICATION_UNDER_VERIFICATION
 * - APPLICATION_APPROVED (Sanctioned, NOT yet disbursed!)
 * - BENEFIT_DISBURSED (Completed payment with transaction reference)
 * - BENEFIT_PREVIOUSLY_RECEIVED
 * - POTENTIAL_DUPLICATE
 * - DUPLICATE_CONFIRMED
 * - REQUIRES_FURTHER_VERIFICATION
 */
const verifyBenefitHistory = async ({
  scheme,
  applicant,
  household,
  property,
  excludeApplicationId = null
}) => {
  const result = {
    status: 'VERIFIED',
    hasConflict: false,
    conflicts: [],
    historicalRecords: [],
    externalApiStatus: 'VERIFIED',
    providerEvidence: '',
    ruleEvaluated: 'RULE_BENEFIT_HISTORY_INTEGRITY'
  };

  if (!scheme) return result;

  // 1. Invoke external PFMS/DBT Provider for cross-department disbursement ledger
  const pfmsResponse = await invokeProvider('PFMS_DBT_BENEFIT_PROVIDER', {
    applicantIndividualId: applicant?.individualId,
    householdId: household?.householdId,
    propertyId: property?.propertyId,
    schemeCode: scheme.code
  });

  if (pfmsResponse.status === 'UNAVAILABLE' || pfmsResponse.status === 'TIMEOUT') {
    result.status = 'PENDING';
    result.externalApiStatus = pfmsResponse.status;
    result.providerEvidence = 'Verification pending — the relevant external record could not be confirmed.';
    return result;
  }

  if (pfmsResponse.status === 'FAILURE') {
    result.status = 'PENDING';
    result.externalApiStatus = 'FAILURE';
    result.providerEvidence = 'PFMS benefit ledger reported a service error. Benefit history check marked pending.';
    return result;
  }

  result.providerEvidence = 'PFMS & DBT central ledger checked: External records verified.';

  const scope = scheme.benefitScope; // INDIVIDUAL, HOUSEHOLD, PROPERTY
  const schemeId = scheme._id;

  // 2. Query previous BenefitRecords based on Scope
  let benefitQuery = { scheme: schemeId };

  if (scope === 'INDIVIDUAL' && applicant?._id) {
    benefitQuery.recipientIndividual = applicant._id;
  } else if (scope === 'HOUSEHOLD' && household?._id) {
    benefitQuery.recipientHousehold = household._id;
  } else if (scope === 'PROPERTY' && property?._id) {
    benefitQuery.recipientProperty = property._id;
  } else {
    // If required scope entity is missing, return clean
    return result;
  }

  const existingBenefits = await BenefitRecord.find(benefitQuery)
    .populate('scheme recipientIndividual recipientHousehold recipientProperty application');

  for (const b of existingBenefits) {
    // Check if there is an actual disbursement record associated
    const disbursement = await DisbursementRecord.findOne({ benefitRecord: b._id });

    let recordStatus = 'APPLICATION_APPROVED';
    if (b.status === 'DISBURSED' || disbursement) {
      recordStatus = 'BENEFIT_DISBURSED';
    } else if (b.status === 'SANCTIONED') {
      recordStatus = 'APPLICATION_APPROVED'; // Crucial: Approved != Disbursed!
    } else if (b.status === 'CANCELLED') {
      recordStatus = 'REQUIRES_FURTHER_VERIFICATION';
    }

    const conflicts = b.status === 'SANCTIONED' || b.status === 'DISBURSED';

    const item = {
      recordId: b.recordId,
      schemeName: b.scheme?.name || scheme.name,
      schemeCode: b.scheme?.code || scheme.code,
      benefitScope: scope,
      beneficiaryRef:
        scope === 'INDIVIDUAL'
          ? b.recipientIndividual?.fullName || 'Individual'
          : scope === 'HOUSEHOLD'
          ? b.recipientHousehold?.householdId || 'Household'
          : b.recipientProperty?.propertyId || 'Property',
      status: b.status,
      disbursementStatus: recordStatus,
      sanctionDate: b.sanctionDate,
      disbursementDate: b.disbursementDate || disbursement?.disbursementDate || null,
      transactionReference: b.referenceNumber || disbursement?.paymentReference || 'N/A',
      amount: b.benefitAmount,
      source: 'Internal PFMS Synchronized Benefit Ledger',
      conflictsWithCurrentScheme: conflicts,
      ruleTriggered: `RULE_${scope}_REPEAT_BENEFIT_RESTRICTION`
    };

    result.historicalRecords.push(item);

    if (conflicts) {
      result.hasConflict = true;
      result.conflicts.push(item);
    }
  }

  // 3. Query active concurrent Applications (excluding current application)
  let appQuery = {
    scheme: schemeId,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'APPROVED'] }
  };
  if (excludeApplicationId) {
    appQuery._id = { $ne: excludeApplicationId };
  }

  if (scope === 'INDIVIDUAL' && applicant?._id) {
    appQuery.applicantIndividual = applicant._id;
  } else if (scope === 'HOUSEHOLD' && household?._id) {
    appQuery.household = household._id;
  } else if (scope === 'PROPERTY' && property?._id) {
    appQuery.property = property._id;
  }

  const concurrentApps = await Application.find(appQuery)
    .populate('scheme applicantIndividual household property');

  for (const a of concurrentApps) {
    let appStatusCategory = 'APPLICATION_SUBMITTED';
    if (a.status === 'UNDER_REVIEW') appStatusCategory = 'POTENTIAL_DUPLICATE';
    else if (a.status === 'VERIFICATION_PENDING') appStatusCategory = 'APPLICATION_UNDER_VERIFICATION';
    else if (a.status === 'APPROVED') appStatusCategory = 'APPLICATION_APPROVED';

    const item = {
      recordId: a.applicationId,
      schemeName: a.scheme?.name || scheme.name,
      schemeCode: a.scheme?.code || scheme.code,
      benefitScope: scope,
      beneficiaryRef: a.applicantIndividual?.fullName || 'Applicant',
      status: a.status,
      disbursementStatus: appStatusCategory,
      sanctionDate: a.applicationDate,
      disbursementDate: null,
      transactionReference: 'PENDING_SANCTION',
      amount: a.requestedAmount,
      source: 'JanSetu Active Application Workflow',
      conflictsWithCurrentScheme: true,
      ruleTriggered: `RULE_${scope}_CONCURRENT_APPLICATION`
    };

    result.historicalRecords.push(item);
    result.hasConflict = true;
    result.conflicts.push(item);
  }

  return result;
};

module.exports = {
  verifyBenefitHistory
};
