const HouseholdAllocation = require('../models/HouseholdAllocation');
const Application = require('../models/Application');
const Household = require('../models/Household');
const Individual = require('../models/Individual');
const Scheme = require('../models/Scheme');
const BenefitRecord = require('../models/BenefitRecord');
const DisbursementRecord = require('../models/DisbursementRecord');
const { logAudit } = require('./auditService');

const CURRENT_RULE_VERSION = 'RULE_SET_v2.4_2026';

/**
 * Executes the Fair Household Allocation Engine for a given household & scheme
 */
const evaluateHouseholdAllocation = async ({ householdId, schemeId, benefitPeriod = 'FY_2025_2026' }) => {
  const household = await Household.findById(householdId).populate('headOfHousehold');
  if (!household) {
    throw new Error(`Household record ${householdId} not found`);
  }

  const scheme = await Scheme.findById(schemeId);
  if (!scheme) {
    throw new Error(`Scheme record ${schemeId} not found`);
  }

  // Step 1: Group relevant competing applications
  const applications = await Application.find({
    household: household._id,
    scheme: scheme._id,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'APPROVED'] }
  })
    .populate('applicantIndividual')
    .sort({ applicationDate: 1 });

  if (applications.length === 0) {
    return {
      message: 'No active applications found for this household and scheme.',
      householdId: household.householdId,
      schemeName: scheme.name,
      competingCount: 0
    };
  }

  // Step 2 & 3: Evaluate mandatory eligibility and calculate documented priority criteria
  const candidateAssessments = [];
  const priorityWeights = scheme.priorityWeights || {
    lowerIncomeWeight: 40,
    vulnerabilityWeight: 30,
    applicationDateWeight: 30
  };

  // Find min/max income and earliest date in cohort for normalization
  const incomes = applications.map((app) => app.applicantIndividual?.annualIncome || 0);
  const maxIncomeInCohort = Math.max(...incomes, 150000);
  const minIncomeInCohort = Math.min(...incomes, 0);

  const applicationTimestamps = applications.map((app) => new Date(app.applicationDate).getTime());
  const earliestDate = Math.min(...applicationTimestamps);
  const latestDate = Math.max(...applicationTimestamps);

  for (const app of applications) {
    const applicant = app.applicantIndividual;
    const verifiedCriteria = [];
    const missingEvidence = [];
    let mandatoryEligible = true;
    let eligibilityResult = 'ELIGIBLE';
    let failReason = '';

    // Mandatory: Income category
    if (
      scheme.allowedIncomeCategories &&
      scheme.allowedIncomeCategories.length > 0 &&
      !scheme.allowedIncomeCategories.includes(applicant.incomeCategory)
    ) {
      mandatoryEligible = false;
      eligibilityResult = 'INELIGIBLE';
      failReason = `Income category (${applicant.incomeCategory}) not allowed under scheme rules.`;
    } else {
      verifiedCriteria.push(`Income Category: ${applicant.incomeCategory}`);
    }

    // Mandatory: Annual income threshold
    if (scheme.maxAnnualIncome && applicant.annualIncome > scheme.maxAnnualIncome) {
      mandatoryEligible = false;
      eligibilityResult = 'INELIGIBLE';
      failReason = `Annual income (₹${applicant.annualIncome}) exceeds scheme ceiling (₹${scheme.maxAnnualIncome}).`;
    } else {
      verifiedCriteria.push(`Income within ceiling: ₹${applicant.annualIncome}`);
    }

    // Mandatory: Verification state check
    if (applicant.verificationStatus === 'PENDING') {
      eligibilityResult = 'VERIFICATION_PENDING';
      missingEvidence.push('Applicant civil demographic authentication pending');
    }

    // Priority Score Calculation (0 - 100)
    let incomeScore = 0;
    let vulnerabilityScore = 0;
    let applicationDateScore = 0;

    if (mandatoryEligible && eligibilityResult !== 'INELIGIBLE') {
      // 1. Lower Income Score (Lower income = higher need = higher score)
      const incomeRange = maxIncomeInCohort - minIncomeInCohort;
      if (incomeRange > 0) {
        const incomeFraction = 1 - (applicant.annualIncome - minIncomeInCohort) / incomeRange;
        incomeScore = Math.round(incomeFraction * priorityWeights.lowerIncomeWeight);
      } else {
        incomeScore = Math.round(priorityWeights.lowerIncomeWeight);
      }

      // 2. Vulnerability Score (disability, female head, AAY tier, or elderly)
      let vulnerabilityPoints = 0;
      if (applicant.hasDisability) vulnerabilityPoints += 15;
      if (applicant.isVulnerable) vulnerabilityPoints += 10;
      if (applicant.incomeCategory === 'AAY') vulnerabilityPoints += 10;
      if (applicant.isHeadOfHousehold && applicant.gender === 'FEMALE') vulnerabilityPoints += 10;
      vulnerabilityScore = Math.min(vulnerabilityPoints, priorityWeights.vulnerabilityWeight);

      // 3. Application Date Score (Earlier submission = higher score)
      const dateRange = latestDate - earliestDate;
      if (dateRange > 0) {
        const dateFraction = 1 - (new Date(app.applicationDate).getTime() - earliestDate) / dateRange;
        applicationDateScore = Math.round(dateFraction * priorityWeights.applicationDateWeight);
      } else {
        applicationDateScore = Math.round(priorityWeights.applicationDateWeight);
      }
    }

    const priorityScore = incomeScore + vulnerabilityScore + applicationDateScore;

    candidateAssessments.push({
      applicant: applicant._id,
      application: app._id,
      mandatoryEligible,
      eligibilityResult,
      verifiedCriteria,
      priorityScore,
      priorityBreakdown: {
        incomeScore,
        vulnerabilityScore,
        applicationDateScore
      },
      missingEvidence,
      recommended: false,
      explanation: mandatoryEligible
        ? `Score: ${priorityScore}/100 (Economic Need: ${incomeScore}, Vulnerability: ${vulnerabilityScore}, First-Come: ${applicationDateScore})`
        : failReason
    });
  }

  // Step 4: Sort candidates by Priority Score (descending)
  const eligibleCandidates = candidateAssessments.filter(
    (c) => c.mandatoryEligible && c.eligibilityResult === 'ELIGIBLE'
  );

  let recommendedApplication = null;
  let recommendedApplicant = null;
  let allocationStatus = 'RECOMMENDED_FOR_ALLOCATION';

  if (eligibleCandidates.length === 0) {
    allocationStatus = 'ALLOCATION_REJECTED';
  } else {
    // Sort by priorityScore descending
    eligibleCandidates.sort((a, b) => b.priorityScore - a.priorityScore);

    // Check for exact ties
    if (eligibleCandidates.length > 1 && eligibleCandidates[0].priorityScore === eligibleCandidates[1].priorityScore) {
      const tieRule = scheme.tieBreakRule || 'EARLIER_APPLICATION_DATE';

      if (tieRule === 'EARLIER_APPLICATION_DATE') {
        const appA = applications.find((app) => app._id.toString() === eligibleCandidates[0].application.toString());
        const appB = applications.find((app) => app._id.toString() === eligibleCandidates[1].application.toString());

        if (new Date(appA.applicationDate).getTime() <= new Date(appB.applicationDate).getTime()) {
          eligibleCandidates[0].recommended = true;
          eligibleCandidates[0].explanation += ' [Tie-Break Rule: Earlier Application Date Applied]';
          recommendedApplication = eligibleCandidates[0].application;
          recommendedApplicant = eligibleCandidates[0].applicant;
        } else {
          eligibleCandidates[1].recommended = true;
          eligibleCandidates[1].explanation += ' [Tie-Break Rule: Earlier Application Date Applied]';
          recommendedApplication = eligibleCandidates[1].application;
          recommendedApplicant = eligibleCandidates[1].applicant;
        }
      } else if (tieRule === 'LOWER_ANNUAL_INCOME') {
        const appA = applications.find((app) => app._id.toString() === eligibleCandidates[0].application.toString());
        const appB = applications.find((app) => app._id.toString() === eligibleCandidates[1].application.toString());
        const incA = appA.applicantIndividual?.annualIncome || 0;
        const incB = appB.applicantIndividual?.annualIncome || 0;

        if (incA <= incB) {
          eligibleCandidates[0].recommended = true;
          eligibleCandidates[0].explanation += ' [Tie-Break Rule: Lower Annual Income Applied]';
          recommendedApplication = eligibleCandidates[0].application;
          recommendedApplicant = eligibleCandidates[0].applicant;
        } else {
          eligibleCandidates[1].recommended = true;
          eligibleCandidates[1].explanation += ' [Tie-Break Rule: Lower Annual Income Applied]';
          recommendedApplication = eligibleCandidates[1].application;
          recommendedApplicant = eligibleCandidates[1].applicant;
        }
      } else {
        // Missing or manual tie-break rule -> send to PRIORITY_REVIEW_REQUIRED
        allocationStatus = 'PRIORITY_REVIEW_REQUIRED';
      }
    } else {
      eligibleCandidates[0].recommended = true;
      recommendedApplication = eligibleCandidates[0].application;
      recommendedApplicant = eligibleCandidates[0].applicant;
    }
  }

  // Step 5: Save or update the HouseholdAllocation record
  const allocationId = `ALLOC-${household.householdId}-${scheme.code}-${benefitPeriod}`;

  let allocation = await HouseholdAllocation.findOne({ allocationId });
  if (!allocation) {
    allocation = new HouseholdAllocation({
      allocationId,
      household: household._id,
      scheme: scheme._id,
      benefitPeriod,
      competingApplications: applications.map((a) => a._id),
      candidateAssessments,
      recommendedApplication,
      recommendedApplicant,
      status: allocationStatus,
      ruleVersion: scheme.ruleVersion || CURRENT_RULE_VERSION,
      isSyntheticDemo: true
    });
  } else {
    // Only update if not already approved or disbursed
    if (allocation.status !== 'ALLOCATION_APPROVED' && allocation.status !== 'BENEFIT_DISBURSED') {
      allocation.competingApplications = applications.map((a) => a._id);
      allocation.candidateAssessments = candidateAssessments;
      allocation.recommendedApplication = recommendedApplication;
      allocation.recommendedApplicant = recommendedApplicant;
      allocation.status = allocationStatus;
    }
  }

  await allocation.save();

  // Return populated result
  return await HouseholdAllocation.findById(allocation._id)
    .populate('household', 'householdId addressLine1 district state rationCardNumber')
    .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
    .populate({
      path: 'competingApplications',
      populate: { path: 'applicantIndividual', select: 'fullName individualId annualIncome incomeCategory' }
    })
    .populate('recommendedApplicant', 'fullName individualId annualIncome incomeCategory')
    .populate('recommendedApplication', 'applicationId requestedAmount applicationDate status');
};

/**
 * Authorized officer reviews and approves or overrides an allocation recommendation
 */
const reviewHouseholdAllocation = async ({
  allocationId,
  officerUser,
  decision, // 'APPROVE_RECOMMENDATION' | 'MANUAL_OVERRIDE' | 'REJECT_ALL'
  decisionReason,
  selectedApplicantId = null,
  req = null
}) => {
  const allocation = await HouseholdAllocation.findById(allocationId)
    .populate('scheme')
    .populate('household');

  if (!allocation) {
    throw new Error(`Household allocation case ${allocationId} not found`);
  }

  if (!decisionReason || decisionReason.trim().length < 5) {
    throw new Error('A documented justification (at least 5 characters) is required for officer determination.');
  }

  let finalRecommendedApplicant = allocation.recommendedApplicant;
  let finalRecommendedApp = allocation.recommendedApplication;
  let isManualOverride = false;

  if (decision === 'MANUAL_OVERRIDE') {
    if (!selectedApplicantId) {
      throw new Error('When performing a manual override, a designated applicant must be selected.');
    }
    isManualOverride = true;
    finalRecommendedApplicant = selectedApplicantId;

    // Find their application
    const app = await Application.findOne({
      household: allocation.household._id,
      scheme: allocation.scheme._id,
      applicantIndividual: selectedApplicantId
    });

    if (app) {
      finalRecommendedApp = app._id;
    }
    allocation.status = 'ALLOCATION_APPROVED';
  } else if (decision === 'APPROVE_RECOMMENDATION') {
    allocation.status = 'ALLOCATION_APPROVED';
  } else if (decision === 'REJECT_ALL') {
    allocation.status = 'ALLOCATION_REJECTED';
  }

  allocation.reviewedBy = officerUser._id;
  allocation.reviewDate = new Date();
  allocation.decisionReason = decisionReason;
  allocation.isManualOverride = isManualOverride;
  if (finalRecommendedApplicant) allocation.recommendedApplicant = finalRecommendedApplicant;
  if (finalRecommendedApp) allocation.recommendedApplication = finalRecommendedApp;

  await allocation.save();

  // If approved, update the winning application to APPROVED and create BenefitRecord in SANCTIONED status
  if (allocation.status === 'ALLOCATION_APPROVED' && finalRecommendedApp) {
    await Application.findByIdAndUpdate(finalRecommendedApp, {
      status: 'APPROVED',
      reviewedBy: officerUser._id,
      decisionDate: new Date(),
      decisionReason
    });

    // Mark other competing applications as REJECTED with explainable duplicate limitation note
    const losingApps = allocation.competingApplications.filter(
      (appId) => appId.toString() !== finalRecommendedApp.toString()
    );

    for (const lostAppId of losingApps) {
      await Application.findByIdAndUpdate(lostAppId, {
        status: 'REJECTED',
        reviewedBy: officerUser._id,
        decisionDate: new Date(),
        decisionReason: `Allocation awarded to co-household member under one-benefit-per-household policy. Case Ref: ${allocation.allocationId}`
      });
    }

    // Create a BenefitRecord in SANCTIONED status (Approval != Disbursement)
    const existingBenefit = await BenefitRecord.findOne({
      application: finalRecommendedApp
    });

    if (!existingBenefit) {
      const benefitRecord = new BenefitRecord({
        recordId: `BR-${allocation.allocationId}`,
        scheme: allocation.scheme._id,
        recipientIndividual: finalRecommendedApplicant,
        recipientHousehold: allocation.household._id,
        application: finalRecommendedApp,
        benefitAmount: allocation.scheme.maxBenefitAmount,
        sanctionDate: new Date(),
        status: 'SANCTIONED',
        notes: `Sanctioned via Fair Household Allocation Engine. Reviewed by ${officerUser.name || 'Officer'}`
      });
      await benefitRecord.save();
    }
  }

  // Audit Logging
  await logAudit({
    actingUser: officerUser,
    action: isManualOverride ? 'ALLOCATION_OVERRIDE' : 'ALLOCATION_APPROVED',
    entityType: 'HouseholdAllocation',
    entityId: allocation._id,
    afterSnapshot: {
      status: allocation.status,
      decision,
      decisionReason,
      winner: finalRecommendedApplicant
    },
    reasonNotes: decisionReason,
    req
  });

  return allocation;
};

/**
 * Separate step: Record actual disbursement of the approved household benefit
 */
const disburseHouseholdAllocation = async ({
  allocationId,
  officerUser,
  paymentReference,
  paymentMethod = 'DBT_DIRECT_BENEFIT_TRANSFER',
  amount = null,
  notes = '',
  req = null
}) => {
  const allocation = await HouseholdAllocation.findById(allocationId)
    .populate('scheme')
    .populate('household')
    .populate('recommendedApplication');

  if (!allocation) {
    throw new Error(`Household allocation case ${allocationId} not found`);
  }

  if (allocation.status !== 'ALLOCATION_APPROVED') {
    throw new Error('Only approved allocations can be disbursed.');
  }

  if (!paymentReference) {
    paymentReference = `PFMS-DBT-${Date.now()}`;
  }

  const disburseAmount = amount || allocation.scheme.maxBenefitAmount;

  // 1. Find or create benefit record
  let benefitRecord = await BenefitRecord.findOne({
    scheme: allocation.scheme._id,
    recipientHousehold: allocation.household._id,
    recipientIndividual: allocation.recommendedApplicant
  });

  if (!benefitRecord) {
    benefitRecord = new BenefitRecord({
      recordId: `BR-${allocation.allocationId}`,
      scheme: allocation.scheme._id,
      recipientIndividual: allocation.recommendedApplicant,
      recipientHousehold: allocation.household._id,
      application: allocation.recommendedApplication?._id,
      benefitAmount: disburseAmount,
      sanctionDate: new Date(),
      status: 'DISBURSED',
      disbursementDate: new Date(),
      referenceNumber: paymentReference
    });
  } else {
    benefitRecord.status = 'DISBURSED';
    benefitRecord.disbursementDate = new Date();
    benefitRecord.referenceNumber = paymentReference;
  }
  await benefitRecord.save();

  // 2. Create DisbursementRecord
  const disbursement = new DisbursementRecord({
    disbursementId: `DISB-${allocation.allocationId}`,
    application: allocation.recommendedApplication?._id,
    benefitRecord: benefitRecord._id,
    amount: disburseAmount,
    paymentReference,
    paymentMethod,
    disbursedAt: new Date(),
    disbursedBy: officerUser._id,
    notes: notes || `Direct Benefit Transfer to recipient of ${allocation.scheme.name}`
  });
  await disbursement.save();

  // 3. Update Allocation and Application
  allocation.status = 'BENEFIT_DISBURSED';
  allocation.disbursementRecord = disbursement._id;
  allocation.disbursedAt = new Date();
  await allocation.save();

  if (allocation.recommendedApplication) {
    await Application.findByIdAndUpdate(allocation.recommendedApplication._id, {
      status: 'BENEFIT_DISBURSED'
    });
  }

  // 4. Audit Log
  await logAudit({
    actingUser: officerUser,
    action: 'DISBURSEMENT_RECORDED',
    entityType: 'HouseholdAllocation',
    entityId: allocation._id,
    afterSnapshot: {
      status: 'BENEFIT_DISBURSED',
      disbursementId: disbursement.disbursementId,
      amount: disburseAmount,
      paymentReference
    },
    reasonNotes: `DBT Disbursement of ₹${disburseAmount} recorded under reference ${paymentReference}`,
    req
  });

  return {
    allocation,
    disbursement,
    benefitRecord
  };
};

module.exports = {
  evaluateHouseholdAllocation,
  reviewHouseholdAllocation,
  disburseHouseholdAllocation,
  CURRENT_RULE_VERSION
};
