const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');
const DuplicateAlert = require('../models/DuplicateAlert');

/**
 * JanSetu Scope-Aware Duplicate & Overlap Detection Engine
 * 
 * Evaluates duplicate eligibility strictly against configured Scheme Benefit Scope:
 * - INDIVIDUAL: Only flags multiple claims for the same individual for the same scheme.
 * - HOUSEHOLD: Only flags multiple claims for the same household for the same scheme.
 * - PROPERTY: Flags multiple claims for the same verified property for the same scheme.
 * 
 * Explicit Non-Flagging Guarantees (Hackathon Compliance):
 * - Family relatives or shared surnames ALONE never trigger an alert.
 * - Relatives receiving UNRELATED schemes never trigger an alert.
 * - Relatives residing in separate households/properties are assessed independently.
 */
const detectDuplicates = async ({ scheme, applicantIndividual, household, property, excludeApplicationId = null }) => {
  const result = {
    isPotentialDuplicate: false,
    alerts: [],
    summary: 'No duplicate or conflicting benefit history detected.'
  };

  if (!scheme) return result;

  const schemeId = scheme._id;
  const scope = scheme.benefitScope; // INDIVIDUAL, HOUSEHOLD, PROPERTY

  // 1. PROPERTY-LEVEL SCHEME DETECTION
  if (scope === 'PROPERTY' && property) {
    const propId = property._id || property;

    // Check previously sanctioned/disbursed benefit records on this property
    const existingBenefit = await BenefitRecord.findOne({
      scheme: schemeId,
      recipientProperty: propId,
      status: { $in: ['SANCTIONED', 'DISBURSED'] }
    }).populate('scheme recipientIndividual recipientProperty');

    if (existingBenefit) {
      result.isPotentialDuplicate = true;
      result.alerts.push({
        candidateType: 'PROPERTY',
        conflictingBenefitRecord: existingBenefit._id,
        relevantProperty: propId,
        triggeringRule: 'RULE_PROPERTY_BENEFIT_LIMIT_EXCEEDED',
        riskScore: 88,
        matchReason: `Property ${property.propertyId || 'record'} already received a benefit under ${scheme.name}.`,
        explanation: `Property ${property.propertyId || 'record'} (${property.addressLine1 || 'verified location'}) has an existing active benefit record (${existingBenefit.recordId || 'Ref'} awarded ${existingBenefit.sanctionDate ? new Date(existingBenefit.sanctionDate).toLocaleDateString() : 'previously'}). Under ${scheme.name} guidelines, allocation is restricted to 1 benefit per verified property.`
      });
    }

    // Check active pending applications for this property (excluding self)
    const pendingAppQuery = {
      scheme: schemeId,
      property: propId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'APPROVED'] }
    };
    if (excludeApplicationId) {
      pendingAppQuery._id = { $ne: excludeApplicationId };
    }

    const pendingApp = await Application.findOne(pendingAppQuery)
      .populate('applicantIndividual scheme property');

    if (pendingApp) {
      result.isPotentialDuplicate = true;
      result.alerts.push({
        candidateType: 'PROPERTY',
        conflictingApplication: pendingApp._id,
        relevantProperty: propId,
        triggeringRule: 'RULE_PROPERTY_CONCURRENT_APPLICATION',
        riskScore: 82,
        matchReason: `Concurrent active application ${pendingApp.applicationId} for the same property.`,
        explanation: `Another application (${pendingApp.applicationId} by ${pendingApp.applicantIndividual?.fullName || 'Applicant'}) is currently under process for Property ${property.propertyId || 'record'}. Multiple concurrent claims for the same property require officer review.`
      });
    }
  }

  // 2. HOUSEHOLD-LEVEL SCHEME DETECTION
  else if (scope === 'HOUSEHOLD' && household) {
    const hhId = household._id || household;

    const existingBenefit = await BenefitRecord.findOne({
      scheme: schemeId,
      recipientHousehold: hhId,
      status: { $in: ['SANCTIONED', 'DISBURSED'] }
    }).populate('scheme recipientIndividual recipientHousehold');

    if (existingBenefit) {
      result.isPotentialDuplicate = true;
      result.alerts.push({
        candidateType: 'HOUSEHOLD',
        conflictingBenefitRecord: existingBenefit._id,
        relevantHousehold: hhId,
        triggeringRule: 'RULE_HOUSEHOLD_BENEFIT_LIMIT_EXCEEDED',
        riskScore: 85,
        matchReason: `Household ${household.householdId || 'record'} already received assistance under ${scheme.name}.`,
        explanation: `Household ${household.householdId || 'record'} was previously sanctioned benefit ${existingBenefit.recordId} on ${existingBenefit.sanctionDate ? new Date(existingBenefit.sanctionDate).toLocaleDateString() : 'earlier date'}. Household-scoped schemes limit allocations to 1 per verified household.`
      });
    }

    const pendingAppQuery = {
      scheme: schemeId,
      household: hhId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'APPROVED'] }
    };
    if (excludeApplicationId) {
      pendingAppQuery._id = { $ne: excludeApplicationId };
    }

    const pendingApp = await Application.findOne(pendingAppQuery).populate('applicantIndividual');
    if (pendingApp) {
      result.isPotentialDuplicate = true;
      result.alerts.push({
        candidateType: 'HOUSEHOLD',
        conflictingApplication: pendingApp._id,
        relevantHousehold: hhId,
        triggeringRule: 'RULE_HOUSEHOLD_CONCURRENT_APPLICATION',
        riskScore: 78,
        matchReason: `Concurrent application exists for Household ${household.householdId || 'record'}.`,
        explanation: `Member ${pendingApp.applicantIndividual?.fullName || 'Family member'} already has an active application (${pendingApp.applicationId}) for this household.`
      });
    }
  }

  // 3. INDIVIDUAL-LEVEL SCHEME DETECTION
  else if (scope === 'INDIVIDUAL' && applicantIndividual) {
    const indId = applicantIndividual._id || applicantIndividual;

    const existingBenefit = await BenefitRecord.findOne({
      scheme: schemeId,
      recipientIndividual: indId,
      status: { $in: ['SANCTIONED', 'DISBURSED'] }
    }).populate('scheme recipientIndividual');

    if (existingBenefit) {
      result.isPotentialDuplicate = true;
      result.alerts.push({
        candidateType: 'INDIVIDUAL',
        conflictingBenefitRecord: existingBenefit._id,
        triggeringRule: 'RULE_INDIVIDUAL_REPEAT_CLAIM',
        riskScore: 90,
        matchReason: `Individual already received ${scheme.name} benefit.`,
        explanation: `Citizen ${applicantIndividual.fullName || 'Applicant'} received benefit ${existingBenefit.recordId} on ${existingBenefit.sanctionDate ? new Date(existingBenefit.sanctionDate).toLocaleDateString() : 'prior date'}. Repeated individual claim within prohibited timeframe.`
      });
    }

    const pendingAppQuery = {
      scheme: schemeId,
      applicantIndividual: indId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'APPROVED'] }
    };
    if (excludeApplicationId) {
      pendingAppQuery._id = { $ne: excludeApplicationId };
    }

    const pendingApp = await Application.findOne(pendingAppQuery);
    if (pendingApp) {
      result.isPotentialDuplicate = true;
      result.alerts.push({
        candidateType: 'INDIVIDUAL',
        conflictingApplication: pendingApp._id,
        triggeringRule: 'RULE_INDIVIDUAL_CONCURRENT_CLAIM',
        riskScore: 84,
        matchReason: `Citizen already has active application ${pendingApp.applicationId}.`,
        explanation: `Citizen already has an active application (${pendingApp.applicationId}) undergoing processing for this scheme.`
      });
    }
  }

  if (result.isPotentialDuplicate) {
    result.summary = `Detected ${result.alerts.length} potential duplicate/overlap condition(s). Forwarded for Human Officer Verification.`;
  }

  return result;
};

/**
 * Creates DuplicateAlert documents in MongoDB for flagged conditions
 */
const createDuplicateAlertsForApplication = async (application, alertsList) => {
  const createdAlerts = [];
  const count = await DuplicateAlert.countDocuments();

  for (let i = 0; i < alertsList.length; i++) {
    const item = alertsList[i];
    const alertId = `ALT-${new Date().getFullYear()}-${String(count + i + 1).padStart(4, '0')}`;

    const newAlert = new DuplicateAlert({
      alertId,
      application: application._id,
      scheme: application.scheme,
      applicantIndividual: application.applicantIndividual,
      candidateType: item.candidateType,
      conflictingBenefitRecord: item.conflictingBenefitRecord || null,
      conflictingApplication: item.conflictingApplication || null,
      relevantHousehold: item.relevantHousehold || application.household || null,
      relevantProperty: item.relevantProperty || application.property || null,
      triggeringRule: item.triggeringRule,
      explanation: item.explanation,
      matchReason: item.matchReason,
      riskScore: item.riskScore || 80,
      status: 'PENDING_REVIEW'
    });

    await newAlert.save();
    createdAlerts.push(newAlert);
  }

  return createdAlerts;
};

module.exports = {
  detectDuplicates,
  createDuplicateAlertsForApplication
};
