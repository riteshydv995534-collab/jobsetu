const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const DisbursementRecord = require('../models/DisbursementRecord');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');

/**
 * Helper to get authorized scheme filter for officer
 */
const getAuthorizedSchemeQuery = (user, requestedSchemeId) => {
  // Admins have access to everything
  if (['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(user.role)) {
    if (requestedSchemeId && requestedSchemeId !== 'ALL') {
      return { scheme: requestedSchemeId };
    }
    return {};
  }

  const assignedIds = (user.assignedSchemes || []).map((s) =>
    (s && s._id ? s._id : s).toString()
  );

  if (assignedIds.length > 0) {
    if (requestedSchemeId && requestedSchemeId !== 'ALL') {
      if (!assignedIds.includes(requestedSchemeId.toString())) {
        const error = new Error('Access forbidden: You are not authorized to view calendar activity for this scheme.');
        error.statusCode = 403;
        throw error;
      }
      return { scheme: requestedSchemeId };
    }
    return { scheme: { $in: assignedIds } };
  }

  if (requestedSchemeId && requestedSchemeId !== 'ALL') {
    return { scheme: requestedSchemeId };
  }

  return {};
};

/**
 * GET /api/calendar/activity
 * Query params: month (YYYY-MM), schemeId
 */
const getCalendarActivity = async (req, res, next) => {
  try {
    const { month, schemeId } = req.query;

    const baseSchemeFilter = getAuthorizedSchemeQuery(req.user, schemeId);

    // Default to current month if not provided
    const now = new Date();
    const targetMonthStr = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    // Query 1: Submissions in this month
    const submissionFilter = {
      ...baseSchemeFilter,
      applicationDate: { $gte: startDate, $lte: endDate }
    };
    const submissions = await Application.find(submissionFilter).select('applicationDate status requestedAmount scheme');

    // Query 2: Decisions (Approved/Rejected/Disbursed) in this month
    const decisionFilter = {
      ...baseSchemeFilter,
      decisionDate: { $gte: startDate, $lte: endDate }
    };
    const decisions = await Application.find(decisionFilter).select('decisionDate status requestedAmount scheme');

    // Query 3: Disbursements in this month
    let disbursementFilter = {
      disbursedAt: { $gte: startDate, $lte: endDate }
    };
    const disbursements = await DisbursementRecord.find(disbursementFilter)
      .populate({
        path: 'application',
        select: 'scheme status'
      });

    // Initialize daily map
    const dailyMap = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyMap[dateKey] = {
        date: dateKey,
        day,
        submitted: 0,
        reviewed: 0,
        approved: 0,
        rejected: 0,
        cleared: 0,
        pending: 0,
        disbursed: 0,
        totalRequested: 0,
        totalDisbursedAmount: 0
      };
    }

    // Populate submissions
    submissions.forEach((app) => {
      if (app.applicationDate) {
        const d = new Date(app.applicationDate);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].submitted += 1;
          dailyMap[dateKey].totalRequested += app.requestedAmount || 0;
          if (['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'INFORMATION_REQUIRED'].includes(app.status)) {
            dailyMap[dateKey].pending += 1;
          }
        }
      }
    });

    // Populate decisions
    decisions.forEach((app) => {
      if (app.decisionDate) {
        const d = new Date(app.decisionDate);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].reviewed += 1;
          if (app.status === 'APPROVED' || app.status === 'BENEFIT_DISBURSED') {
            dailyMap[dateKey].approved += 1;
            dailyMap[dateKey].cleared += 1;
          } else if (app.status === 'REJECTED') {
            dailyMap[dateKey].rejected += 1;
            dailyMap[dateKey].cleared += 1;
          }
        }
      }
    });

    // Populate disbursements
    disbursements.forEach((disb) => {
      // Check scheme filter match if applicable
      if (baseSchemeFilter.scheme && disb.application && disb.application.scheme) {
        const appScheme = disb.application.scheme.toString();
        if (baseSchemeFilter.scheme.$in && !baseSchemeFilter.scheme.$in.includes(appScheme)) {
          return;
        }
        if (typeof baseSchemeFilter.scheme === 'string' && baseSchemeFilter.scheme !== appScheme) {
          return;
        }
      }

      if (disb.disbursedAt) {
        const d = new Date(disb.disbursedAt);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].disbursed += 1;
          dailyMap[dateKey].totalDisbursedAmount += disb.amount || 0;
        }
      }
    });

    // Month totals summary
    let monthSubmitted = 0;
    let monthCleared = 0;
    let monthApproved = 0;
    let monthRejected = 0;
    let monthDisbursed = 0;

    Object.values(dailyMap).forEach((d) => {
      monthSubmitted += d.submitted;
      monthCleared += d.cleared;
      monthApproved += d.approved;
      monthRejected += d.rejected;
      monthDisbursed += d.disbursed;
    });

    res.json({
      success: true,
      data: {
        month: targetMonthStr,
        summary: {
          totalSubmitted: monthSubmitted,
          totalCleared: monthCleared,
          totalApproved: monthApproved,
          totalRejected: monthRejected,
          totalDisbursed: monthDisbursed
        },
        days: Object.values(dailyMap)
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/calendar/date/:date
 * Detailed drill-down for a specific day
 */
const getDayDetails = async (req, res, next) => {
  try {
    const { date } = req.params;
    const { schemeId } = req.query;

    const baseSchemeFilter = getAuthorizedSchemeQuery(req.user, schemeId);

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Fetch applications submitted or decided on this date
    const applications = await Application.find({
      ...baseSchemeFilter,
      $or: [
        { applicationDate: { $gte: startOfDay, $lte: endOfDay } },
        { decisionDate: { $gte: startOfDay, $lte: endOfDay } }
      ]
    })
      .populate('scheme', 'name code benefitCategory benefitScope')
      .populate('applicantIndividual', 'fullName individualId demoIdentifier incomeCategory')
      .populate('household', 'householdId district')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    // Aggregate by scheme
    const schemeMap = {};
    applications.forEach((app) => {
      const schemeName = app.scheme ? app.scheme.name : 'Unknown Scheme';
      const schemeCode = app.scheme ? app.scheme.code : 'SCH-GEN';
      if (!schemeMap[schemeCode]) {
        schemeMap[schemeCode] = {
          schemeCode,
          schemeName,
          submitted: 0,
          approved: 0,
          rejected: 0,
          underReview: 0
        };
      }

      if (app.applicationDate >= startOfDay && app.applicationDate <= endOfDay) {
        schemeMap[schemeCode].submitted += 1;
      }
      if (app.decisionDate >= startOfDay && app.decisionDate <= endOfDay) {
        if (app.status === 'APPROVED' || app.status === 'BENEFIT_DISBURSED') {
          schemeMap[schemeCode].approved += 1;
        } else if (app.status === 'REJECTED') {
          schemeMap[schemeCode].rejected += 1;
        }
      }
      if (['UNDER_REVIEW', 'VERIFICATION_PENDING'].includes(app.status)) {
        schemeMap[schemeCode].underReview += 1;
      }
    });

    res.json({
      success: true,
      data: {
        date,
        totalApplications: applications.length,
        byScheme: Object.values(schemeMap),
        applications
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getCalendarActivity,
  getDayDetails
};
