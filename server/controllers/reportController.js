const Application = require('../models/Application');
const DuplicateAlert = require('../models/DuplicateAlert');
const BenefitRecord = require('../models/BenefitRecord');
const DisbursementRecord = require('../models/DisbursementRecord');
const Scheme = require('../models/Scheme');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const EligibilityAssessment = require('../models/EligibilityAssessment');

/**
 * Helper to build scheme query filter based on officer assignments
 */
const getSchemeFilter = (user, requestedSchemeId) => {
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
        const error = new Error('Access forbidden: Scheme not in authorized assignments.');
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

const getReportAnalytics = async (req, res, next) => {
  try {
    const { schemeId, days = 30 } = req.query;
    const schemeFilter = getSchemeFilter(req.user, schemeId);

    const now = new Date();
    const daysInt = parseInt(days, 10) || 30;

    // 1. Applications matching scheme filter
    const appQuery = { ...schemeFilter };
    const applications = await Application.find(appQuery)
      .populate('scheme', 'name code benefitCategory')
      .lean();

    const totalApplications = applications.length;

    // Chart 2: Status Distribution
    const statusCounts = {
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      VERIFICATION_PENDING: 0,
      INFORMATION_REQUIRED: 0,
      APPROVED: 0,
      REJECTED: 0,
      BENEFIT_DISBURSED: 0
    };

    applications.forEach((a) => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status] += 1;
      }
    });

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      label: status.replace(/_/g, ' ')
    }));

    // Chart 1 & Chart 3: Daily Activity & Clearance Trend (last N days)
    const dailyMap = {};
    for (let i = daysInt - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyMap[key] = {
        date: key,
        received: 0,
        cleared: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        approvalRate: 0
      };
    }

    applications.forEach((a) => {
      if (a.applicationDate) {
        const d = new Date(a.applicationDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyMap[key]) {
          dailyMap[key].received += 1;
          if (['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'INFORMATION_REQUIRED'].includes(a.status)) {
            dailyMap[key].pending += 1;
          }
        }
      }
      if (a.decisionDate) {
        const d = new Date(a.decisionDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyMap[key]) {
          if (a.status === 'APPROVED' || a.status === 'BENEFIT_DISBURSED') {
            dailyMap[key].approved += 1;
            dailyMap[key].cleared += 1;
          } else if (a.status === 'REJECTED') {
            dailyMap[key].rejected += 1;
            dailyMap[key].cleared += 1;
          }
        }
      }
    });

    // Compute approval rates
    const dailyActivity = Object.values(dailyMap).map((item) => {
      item.approvalRate = item.cleared > 0 ? Math.round((item.approved / item.cleared) * 100) : 0;
      return item;
    });

    // Chart 4: Scheme-Wise Performance
    const schemePerfMap = {};
    applications.forEach((a) => {
      const sName = a.scheme ? a.scheme.name : 'Unknown Scheme';
      const sCode = a.scheme ? a.scheme.code : 'UNKNOWN';
      if (!schemePerfMap[sCode]) {
        schemePerfMap[sCode] = {
          schemeName: sName,
          schemeCode: sCode,
          received: 0,
          approved: 0,
          rejected: 0,
          disbursed: 0,
          pending: 0
        };
      }
      schemePerfMap[sCode].received += 1;
      if (a.status === 'APPROVED') schemePerfMap[sCode].approved += 1;
      else if (a.status === 'REJECTED') schemePerfMap[sCode].rejected += 1;
      else if (a.status === 'BENEFIT_DISBURSED') {
        schemePerfMap[sCode].approved += 1;
        schemePerfMap[sCode].disbursed += 1;
      } else {
        schemePerfMap[sCode].pending += 1;
      }
    });

    const schemePerformance = Object.values(schemePerfMap);

    // Chart 5: Pending Application Age Breakdown
    // 0-2 days, 3-7 days, 8-15 days, 15+ days
    let age0to2 = 0;
    let age3to7 = 0;
    let age8to15 = 0;
    let age15Plus = 0;

    applications.forEach((a) => {
      if (['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_PENDING', 'INFORMATION_REQUIRED'].includes(a.status)) {
        const appDate = a.applicationDate ? new Date(a.applicationDate) : new Date(a.createdAt);
        const ageDays = Math.floor((now.getTime() - appDate.getTime()) / (24 * 60 * 60 * 1000));
        if (ageDays <= 2) age0to2 += 1;
        else if (ageDays <= 7) age3to7 += 1;
        else if (ageDays <= 15) age8to15 += 1;
        else age15Plus += 1;
      }
    });

    const applicationAgeBreakdown = [
      { category: '0–2 Days', count: age0to2, description: 'Freshly received applications' },
      { category: '3–7 Days', count: age3to7, description: 'Under active verification' },
      { category: '8–15 Days', count: age8to15, description: 'Approaching SLA turnaround' },
      { category: '15+ Days', count: age15Plus, description: 'Escalated / Pending applicant response' }
    ];

    // Chart 6: Household Allocation Cases
    const allocationQuery = {};
    if (schemeFilter.scheme) {
      allocationQuery.scheme = schemeFilter.scheme;
    }
    const [allocRecommended, allocApproved, allocDisbursed, allocRejected, allocReviewReq] = await Promise.all([
      HouseholdAllocation.countDocuments({ ...allocationQuery, status: 'RECOMMENDED_FOR_ALLOCATION' }),
      HouseholdAllocation.countDocuments({ ...allocationQuery, status: 'ALLOCATION_APPROVED' }),
      HouseholdAllocation.countDocuments({ ...allocationQuery, status: 'BENEFIT_DISBURSED' }),
      HouseholdAllocation.countDocuments({ ...allocationQuery, status: 'ALLOCATION_REJECTED' }),
      HouseholdAllocation.countDocuments({ ...allocationQuery, status: 'PRIORITY_REVIEW_REQUIRED' })
    ]);

    const householdAllocationCases = [
      { status: 'Recommended', count: allocRecommended },
      { status: 'Approved', count: allocApproved },
      { status: 'Disbursed', count: allocDisbursed },
      { status: 'Rejected', count: allocRejected },
      { status: 'Priority Review Required', count: allocReviewReq }
    ];

    // Summary calculations
    const approvedTotal = statusCounts.APPROVED + statusCounts.BENEFIT_DISBURSED;
    const clearedTotal = approvedTotal + statusCounts.REJECTED;
    const pendingTotal = statusCounts.SUBMITTED + statusCounts.UNDER_REVIEW + statusCounts.VERIFICATION_PENDING + statusCounts.INFORMATION_REQUIRED;

    res.json({
      success: true,
      data: {
        summary: {
          totalApplications,
          approvedTotal,
          clearedTotal,
          pendingTotal,
          clearanceRate: totalApplications > 0 ? Math.round((clearedTotal / totalApplications) * 100) : 0,
          approvalRate: clearedTotal > 0 ? Math.round((approvedTotal / clearedTotal) * 100) : 0
        },
        // Chart 1: Daily Application Activity
        dailyActivity,
        // Chart 2: Status Distribution
        statusDistribution,
        // Chart 3: Approval and Clearance Trend
        clearanceTrend: dailyActivity.map((d) => ({
          date: d.date,
          cleared: d.cleared,
          approved: d.approved,
          approvalRate: d.approvalRate
        })),
        // Chart 4: Scheme Performance
        schemePerformance,
        // Chart 5: Application Age Breakdown
        applicationAgeBreakdown,
        // Chart 6: Household Allocation Cases
        householdAllocationCases
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getEligibilityReports = async (req, res, next) => {
  try {
    const { schemeId } = req.query;
    const schemeFilter = getSchemeFilter(req.user, schemeId);

    const query = {};
    if (schemeFilter.scheme) query.scheme = schemeFilter.scheme;

    const [totalAssessments, eligibleCount, ineligibleCount, pendingCount, reviewCount, assessmentsByScheme] =
      await Promise.all([
        EligibilityAssessment.countDocuments(query),
        EligibilityAssessment.countDocuments({ ...query, overallResult: 'ELIGIBLE' }),
        EligibilityAssessment.countDocuments({ ...query, overallResult: 'INELIGIBLE' }),
        EligibilityAssessment.countDocuments({ ...query, overallResult: 'VERIFICATION_PENDING' }),
        EligibilityAssessment.countDocuments({
          ...query,
          overallResult: { $in: ['REQUIRES_VERIFICATION', 'POTENTIAL_DUPLICATE_REVIEW', 'PREVIOUS_BENEFIT_REVIEW_REQUIRED'] }
        }),
        EligibilityAssessment.aggregate([
          ...(query.scheme ? [{ $match: query }] : []),
          {
            $lookup: {
              from: 'schemes',
              localField: 'scheme',
              foreignField: '_id',
              as: 'schemeDoc'
            }
          },
          { $unwind: '$schemeDoc' },
          {
            $group: {
              _id: '$schemeDoc.name',
              total: { $sum: 1 },
              eligible: { $sum: { $cond: [{ $eq: ['$overallResult', 'ELIGIBLE'] }, 1, 0] } },
              ineligible: { $sum: { $cond: [{ $eq: ['$overallResult', 'INELIGIBLE'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$overallResult', 'VERIFICATION_PENDING'] }, 1, 0] } }
            }
          }
        ])
      ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalAssessments,
          eligibleCount,
          ineligibleCount,
          pendingCount,
          reviewCount,
          complianceRate: totalAssessments > 0 ? Math.round((eligibleCount / totalAssessments) * 100) : 100
        },
        assessmentsByScheme
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getAllocationReports = async (req, res, next) => {
  try {
    const { schemeId } = req.query;
    const schemeFilter = getSchemeFilter(req.user, schemeId);
    const query = {};
    if (schemeFilter.scheme) query.scheme = schemeFilter.scheme;

    const [totalAllocations, recommended, approved, disbursed, rejected, reviewRequired] =
      await Promise.all([
        HouseholdAllocation.countDocuments(query),
        HouseholdAllocation.countDocuments({ ...query, status: 'RECOMMENDED_FOR_ALLOCATION' }),
        HouseholdAllocation.countDocuments({ ...query, status: 'ALLOCATION_APPROVED' }),
        HouseholdAllocation.countDocuments({ ...query, status: 'BENEFIT_DISBURSED' }),
        HouseholdAllocation.countDocuments({ ...query, status: 'ALLOCATION_REJECTED' }),
        HouseholdAllocation.countDocuments({ ...query, status: 'PRIORITY_REVIEW_REQUIRED' })
      ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalAllocations,
          recommended,
          approved,
          disbursed,
          rejected,
          reviewRequired
        }
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
  getReportAnalytics,
  getEligibilityReports,
  getAllocationReports
};
