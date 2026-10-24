const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');
const Individual = require('../models/Individual');
const Household = require('../models/Household');
const Property = require('../models/Property');
const DisbursementRecord = require('../models/DisbursementRecord');

/**
 * Retrieves complete and explainable benefit history for an individual citizen
 */
const getIndividualBenefitHistory = async (individualId) => {
  const individual = await Individual.findById(individualId);
  if (!individual) {
    throw new Error(`Individual citizen ${individualId} not found`);
  }

  // 1. Benefits where citizen is direct recipient
  const directBenefits = await BenefitRecord.find({ recipientIndividual: individual._id })
    .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
    .populate('application', 'applicationId status applicationDate')
    .sort({ sanctionDate: -1 });

  // 2. Applications submitted by this citizen
  const applications = await Application.find({ applicantIndividual: individual._id })
    .populate('scheme', 'name code benefitScope maxBenefitAmount')
    .sort({ applicationDate: -1 });

  // 3. Check for any disbursements linked
  const disbursements = await DisbursementRecord.find({
    benefitRecord: { $in: directBenefits.map((b) => b._id) }
  });

  const history = directBenefits.map((b) => {
    const linkedDisb = disbursements.find((d) => d.benefitRecord.toString() === b._id.toString());
    return {
      benefitRecordId: b.recordId,
      schemeId: b.scheme?.code,
      schemeName: b.scheme?.name,
      benefitScope: b.scheme?.benefitScope,
      applicationId: b.application?.applicationId || 'HISTORICAL_MIGRATED',
      applicationStatus: b.application?.status || 'APPROVED',
      sanctionDate: b.sanctionDate,
      disbursementStatus: b.status, // SANCTIONED vs DISBURSED
      actualDisbursementDate: b.disbursementDate || (linkedDisb ? linkedDisb.disbursedAt : null),
      amount: b.benefitAmount,
      paymentReference: b.referenceNumber || (linkedDisb ? linkedDisb.paymentReference : 'N/A'),
      isDisbursed: b.status === 'DISBURSED',
      verificationSource: 'DIRECT_BENEFICIARY_LEDGER'
    };
  });

  return {
    individual: {
      id: individual._id,
      individualId: individual.individualId,
      fullName: individual.fullName,
      incomeCategory: individual.incomeCategory
    },
    totalRecordedBenefits: directBenefits.length,
    totalDisbursedBenefits: directBenefits.filter((b) => b.status === 'DISBURSED').length,
    totalSanctionedUndisbursed: directBenefits.filter((b) => b.status === 'SANCTIONED').length,
    history,
    applicationHistory: applications.map((a) => ({
      applicationId: a.applicationId,
      schemeName: a.scheme?.name,
      status: a.status,
      applicationDate: a.applicationDate,
      hasDuplicateAlert: a.hasDuplicateAlert
    }))
  };
};

/**
 * Retrieves complete and explainable benefit history for a household
 */
const getHouseholdBenefitHistory = async (householdId) => {
  const household = await Household.findById(householdId).populate('headOfHousehold');
  if (!household) {
    throw new Error(`Household ${householdId} not found`);
  }

  const members = await Individual.find({ currentHousehold: household._id });

  // 1. Benefits granted to the household itself
  const householdBenefits = await BenefitRecord.find({ recipientHousehold: household._id })
    .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
    .populate('recipientIndividual', 'fullName individualId')
    .populate('application', 'applicationId status applicationDate')
    .sort({ sanctionDate: -1 });

  // 2. Individual benefits received by any household member (to show separation of individual vs household entitlements)
  const memberIndividualBenefits = await BenefitRecord.find({
    recipientIndividual: { $in: members.map((m) => m._id) },
    recipientHousehold: { $ne: household._id }
  })
    .populate('scheme', 'name code benefitScope')
    .populate('recipientIndividual', 'fullName individualId');

  return {
    household: {
      id: household._id,
      householdId: household.householdId,
      addressLine1: household.addressLine1,
      headOfHousehold: household.headOfHousehold?.fullName,
      memberCount: members.length
    },
    householdLevelBenefits: householdBenefits.map((b) => ({
      benefitRecordId: b.recordId,
      schemeName: b.scheme?.name,
      scope: b.scheme?.benefitScope,
      beneficiaryMember: b.recipientIndividual?.fullName || 'Household Unit',
      sanctionDate: b.sanctionDate,
      disbursementStatus: b.status,
      amount: b.benefitAmount,
      isDisbursed: b.status === 'DISBURSED',
      affectsNewHouseholdApplications: b.scheme?.repeatBenefitPolicy === 'NO_REPEAT' || b.scheme?.repeatBenefitPolicy === 'ONCE_PER_LIFETIME'
    })),
    memberIndividualEntitlements: memberIndividualBenefits.map((b) => ({
      benefitRecordId: b.recordId,
      schemeName: b.scheme?.name,
      scope: 'INDIVIDUAL',
      recipientName: b.recipientIndividual?.fullName,
      disbursementStatus: b.status,
      affectsHouseholdEntitlements: false,
      policyNote: 'Individual-level benefit does NOT restrict or disqualify household entitlements.'
    }))
  };
};

module.exports = {
  getIndividualBenefitHistory,
  getHouseholdBenefitHistory
};
