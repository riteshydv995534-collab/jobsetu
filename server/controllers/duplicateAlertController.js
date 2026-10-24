const DuplicateAlert = require('../models/DuplicateAlert');
const ReviewDecision = require('../models/ReviewDecision');
const Application = require('../models/Application');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const { logAudit } = require('../services/auditService');

const getDuplicateAlerts = async (req, res, next) => {
  try {
    const { status, candidateType, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (candidateType && candidateType !== 'ALL') {
      query.candidateType = candidateType;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, alerts] = await Promise.all([
      DuplicateAlert.countDocuments(query),
      DuplicateAlert.find(query)
        .populate('application', 'applicationId status requestedAmount applicationDate')
        .populate('scheme', 'name code benefitScope maxBenefitAmount')
        .populate('applicantIndividual', 'fullName individualId incomeCategory phone')
        .populate('conflictingBenefitRecord')
        .populate('conflictingApplication')
        .populate('relevantHousehold', 'householdId addressLine1 district')
        .populate('relevantProperty', 'propertyId addressLine1 propertyType')
        .populate('assignedOfficer', 'name role')
        .sort({ detectedAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getDuplicateAlertById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await DuplicateAlert.findById(id)
      .populate('application')
      .populate('scheme')
      .populate('applicantIndividual')
      .populate({
        path: 'conflictingBenefitRecord',
        populate: [
          { path: 'scheme', select: 'name code benefitScope' },
          { path: 'recipientIndividual', select: 'fullName individualId' },
          { path: 'recipientHousehold', select: 'householdId addressLine1' },
          { path: 'recipientProperty', select: 'propertyId addressLine1' }
        ]
      })
      .populate('conflictingApplication')
      .populate('relevantHousehold')
      .populate('relevantProperty')
      .populate('assignedOfficer');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Duplicate alert not found.' });
    }

    const decisions = await ReviewDecision.find({ duplicateAlert: id })
      .populate('reviewingOfficer', 'name role email')
      .sort({ decidedAt: -1 });

    res.json({
      success: true,
      data: {
        alert,
        decisions
      }
    });
  } catch (error) {
    next(error);
  }
};

const recordReviewDecision = async (req, res, next) => {
  try {
    const { id } = req.params; // alertId
    const { decision, reasonNotes, actionTaken = '' } = req.body;

    if (!decision || !reasonNotes || !reasonNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A review decision and detailed mandatory justification reason are required.'
      });
    }

    const validDecisions = [
      'CONFIRMED_DUPLICATE',
      'MARKED_NOT_DUPLICATE',
      'RESOLVED_NOT_DUPLICATE',
      'ESCALATED',
      'INFO_REQUESTED'
    ];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Invalid decision. Allowed values: [${validDecisions.join(', ')}]`
      });
    }

    const alert = await DuplicateAlert.findById(id).populate('application scheme applicantIndividual');
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Duplicate alert not found.' });
    }

    const canonicalDecision = decision === 'MARKED_NOT_DUPLICATE' ? 'RESOLVED_NOT_DUPLICATE' : decision;

    const previousStatus = alert.status;
    alert.status = canonicalDecision;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = reasonNotes;
    alert.assignedOfficer = req.user._id;
    await alert.save();

    // Create formal ReviewDecision record
    const reviewDecision = new ReviewDecision({
      duplicateAlert: alert._id,
      application: alert.application._id,
      reviewingOfficer: req.user._id,
      decision: canonicalDecision,
      reasonNotes,
      actionTaken,
      decidedAt: new Date()
    });
    await reviewDecision.save();

    // Update parent Application state accordingly
    const application = await Application.findById(alert.application._id);
    if (application) {
      let appNewStatus = application.status;
      let appReason = `Duplicate Alert ${alert.alertId} reviewed: ${canonicalDecision}. ${reasonNotes}`;

      if (canonicalDecision === 'CONFIRMED_DUPLICATE') {
        appNewStatus = 'REJECTED';
        application.decisionReason = `Duplicate claim confirmed upon officer inspection: ${reasonNotes}`;
      } else if (canonicalDecision === 'RESOLVED_NOT_DUPLICATE') {
        // Check if there are other pending alerts for this application
        const otherPendingAlerts = await DuplicateAlert.countDocuments({
          application: application._id,
          _id: { $ne: alert._id },
          status: 'PENDING_REVIEW'
        });

        if (otherPendingAlerts === 0) {
          appNewStatus = 'VERIFICATION_PENDING';
          application.hasDuplicateAlert = false;
        }
      } else if (decision === 'INFO_REQUESTED') {
        appNewStatus = 'INFORMATION_REQUIRED';
      } else if (decision === 'ESCALATED') {
        appNewStatus = 'UNDER_REVIEW';
      }

      const prevAppStatus = application.status;
      application.status = appNewStatus;
      await application.save();

      // Log status history on application
      const statusHistory = new ApplicationStatusHistory({
        application: application._id,
        previousStatus: prevAppStatus,
        newStatus: appNewStatus,
        changedBy: req.user._id,
        changeReason: appReason
      });
      await statusHistory.save();
    }

    // Record system audit log
    await logAudit({
      actingUser: req.user,
      action: 'DUPLICATE_ALERT_REVIEW_DECISION',
      entityType: 'DuplicateAlert',
      entityId: alert._id,
      beforeSnapshot: { status: previousStatus },
      afterSnapshot: { status: decision, reasonNotes },
      reasonNotes: `Officer decision: ${decision} with justification: ${reasonNotes}`,
      req
    });

    res.json({
      success: true,
      message: `Duplicate alert ${alert.alertId} successfully marked as ${decision}.`,
      data: {
        alert,
        reviewDecision
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDuplicateAlerts,
  getDuplicateAlertById,
  recordReviewDecision
};
