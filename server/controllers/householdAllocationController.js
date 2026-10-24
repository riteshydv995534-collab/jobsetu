const HouseholdAllocation = require('../models/HouseholdAllocation');
const {
  evaluateHouseholdAllocation,
  reviewHouseholdAllocation,
  disburseHouseholdAllocation
} = require('../services/householdBenefitAllocationService');

/**
 * List all fair household allocation cases
 * GET /api/household-allocations
 */
const getAllocations = async (req, res, next) => {
  try {
    const { status, householdId, schemeId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (householdId) filter.household = householdId;
    if (schemeId) filter.scheme = schemeId;

    const skip = (Number(page) - 1) * Number(limit);

    const [allocations, total] = await Promise.all([
      HouseholdAllocation.find(filter)
        .populate('household', 'householdId addressLine1 district state rationCardNumber annualHouseholdIncome')
        .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy tieBreakRule')
        .populate({
          path: 'competingApplications',
          populate: { path: 'applicantIndividual', select: 'fullName individualId annualIncome incomeCategory gender' }
        })
        .populate('recommendedApplicant', 'fullName individualId annualIncome incomeCategory gender')
        .populate('recommendedApplication', 'applicationId requestedAmount applicationDate status')
        .populate('reviewedBy', 'name badgeNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      HouseholdAllocation.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: allocations,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)) || 1,
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single household allocation details
 * GET /api/household-allocations/:id
 */
const getAllocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allocation = await HouseholdAllocation.findById(id)
      .populate('household', 'householdId addressLine1 district state rationCardNumber annualHouseholdIncome')
      .populate('scheme')
      .populate({
        path: 'competingApplications',
        populate: { path: 'applicantIndividual' }
      })
      .populate('candidateAssessments.applicant')
      .populate('candidateAssessments.application')
      .populate('recommendedApplicant')
      .populate('recommendedApplication')
      .populate('reviewedBy', 'name badgeNumber designation')
      .populate('disbursementRecord');

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Household allocation record not found'
      });
    }

    res.json({
      success: true,
      data: allocation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Triggers or evaluates Fair Allocation Engine for a household and scheme
 * POST /api/household-allocations/evaluate
 */
const evaluateAllocation = async (req, res, next) => {
  try {
    const { householdId, schemeId, benefitPeriod } = req.body;

    if (!householdId || !schemeId) {
      return res.status(400).json({
        success: false,
        message: 'householdId and schemeId are required.'
      });
    }

    const allocation = await evaluateHouseholdAllocation({
      householdId,
      schemeId,
      benefitPeriod: benefitPeriod || 'FY_2025_2026'
    });

    res.status(200).json({
      success: true,
      message: 'Fair household benefit allocation evaluated successfully.',
      data: allocation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authorized officer reviews allocation (Approve or Manual Override)
 * POST /api/household-allocations/:id/review
 */
const reviewAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, decisionReason, selectedApplicantId } = req.body;

    if (!decision) {
      return res.status(400).json({
        success: false,
        message: 'Officer decision is required (APPROVE_RECOMMENDATION, MANUAL_OVERRIDE, REJECT_ALL).'
      });
    }

    const reviewed = await reviewHouseholdAllocation({
      allocationId: id,
      officerUser: req.user,
      decision,
      decisionReason,
      selectedApplicantId,
      req
    });

    res.json({
      success: true,
      message: `Allocation decision recorded: ${reviewed.status}`,
      data: reviewed
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Separate step: Record actual disbursement of approved allocation
 * POST /api/household-allocations/:id/disburse
 */
const disburseAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentReference, paymentMethod, amount, notes } = req.body;

    const result = await disburseHouseholdAllocation({
      allocationId: id,
      officerUser: req.user,
      paymentReference,
      paymentMethod,
      amount,
      notes,
      req
    });

    res.json({
      success: true,
      message: 'Direct benefit transfer disbursement recorded successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllocations,
  getAllocationById,
  evaluateAllocation,
  reviewAllocation,
  disburseAllocation
};
