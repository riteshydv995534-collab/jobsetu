const { evaluateIndividualForScheme } = require('../services/individualEligibilityService');
const { evaluateHouseholdForScheme } = require('../services/householdEligibilityService');
const { logAudit } = require('../services/auditService');

/**
 * Evaluates individual citizen eligibility for a scheme
 * POST /api/eligibility/individual/:id/evaluate
 */
const evaluateIndividualEligibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schemeId } = req.body;

    if (!schemeId) {
      return res.status(400).json({
        success: false,
        message: 'schemeId is required in request body.'
      });
    }

    const evaluation = await evaluateIndividualForScheme(id, schemeId);

    // Optional audit log
    if (req.user) {
      await logAudit({
        actingUser: req.user,
        action: 'ELIGIBILITY_ASSESSMENT_RUN',
        entityType: 'Individual',
        entityId: id,
        afterSnapshot: {
          schemeId,
          overallResult: evaluation.overallResult
        },
        reasonNotes: `On-demand individual eligibility check: ${evaluation.overallResult}`,
        req
      });
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluates household eligibility for a scheme
 * POST /api/eligibility/household/:id/evaluate
 */
const evaluateHouseholdEligibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schemeId } = req.body;

    if (!schemeId) {
      return res.status(400).json({
        success: false,
        message: 'schemeId is required in request body.'
      });
    }

    const evaluation = await evaluateHouseholdForScheme(id, schemeId);

    if (req.user) {
      await logAudit({
        actingUser: req.user,
        action: 'HOUSEHOLD_ELIGIBILITY_RUN',
        entityType: 'Household',
        entityId: id,
        afterSnapshot: {
          schemeId,
          overallResult: evaluation.overallResult
        },
        reasonNotes: `On-demand household eligibility check: ${evaluation.overallResult}`,
        req
      });
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  evaluateIndividualEligibility,
  evaluateHouseholdEligibility
};
