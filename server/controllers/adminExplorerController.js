const Individual = require('../models/Individual');
const Household = require('../models/Household');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitRecord = require('../models/BenefitRecord');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const EligibilityAssessment = require('../models/EligibilityAssessment');
const DuplicateAlert = require('../models/DuplicateAlert');

/**
 * Universal Explorer Query Endpoint for Administrators
 * GET /api/admin/benefit-records
 */
const getAdminBenefitRecords = async (req, res, next) => {
  try {
    const {
      tab = 'INDIVIDUALS', // 'INDIVIDUALS' | 'HOUSEHOLDS' | 'SCHEMES' | 'APPLICATIONS' | 'BENEFITS' | 'ALLOCATIONS' | 'VERIFICATIONS'
      search = '',
      status = 'ALL',
      page = 1,
      limit = 15,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    let result = { records: [], total: 0 };

    switch (tab.toUpperCase()) {
      case 'INDIVIDUALS': {
        const query = {};
        if (search) {
          query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { individualId: { $regex: search, $options: 'i' } },
            { fatherName: { $regex: search, $options: 'i' } }
          ];
        }
        if (status !== 'ALL') query.verificationStatus = status;

        const [records, total] = await Promise.all([
          Individual.find(query)
            .populate('currentHousehold', 'householdId addressLine1 district state')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
          Individual.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }

      case 'HOUSEHOLDS': {
        const query = {};
        if (search) {
          query.$or = [
            { householdId: { $regex: search, $options: 'i' } },
            { addressLine1: { $regex: search, $options: 'i' } },
            { rationCardNumber: { $regex: search, $options: 'i' } }
          ];
        }
        if (status !== 'ALL') query.verificationStatus = status;

        const [records, total] = await Promise.all([
          Household.find(query)
            .populate('headOfHousehold', 'fullName individualId phone')
            .populate('propertyAssociation', 'propertyId addressLine1')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
          Household.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }

      case 'SCHEMES': {
        const query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
            { benefitCategory: { $regex: search, $options: 'i' } }
          ];
        }
        if (status === 'ACTIVE') query.isActive = true;
        if (status === 'INACTIVE') query.isActive = false;

        const [records, total] = await Promise.all([
          Scheme.find(query).sort(sort).skip(skip).limit(limitNum),
          Scheme.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }

      case 'APPLICATIONS': {
        const query = {};
        if (search) {
          query.$or = [
            { applicationId: { $regex: search, $options: 'i' } },
            { remarks: { $regex: search, $options: 'i' } }
          ];
        }
        if (status !== 'ALL') query.status = status;

        const [records, total] = await Promise.all([
          Application.find(query)
            .populate('scheme', 'name code benefitScope maxBenefitAmount')
            .populate('applicantIndividual', 'fullName individualId incomeCategory annualIncome')
            .populate('household', 'householdId addressLine1')
            .populate('reviewedBy', 'name badgeNumber')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
          Application.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }

      case 'BENEFITS': {
        const query = {};
        if (status !== 'ALL') query.status = status;

        const [records, total] = await Promise.all([
          BenefitRecord.find(query)
            .populate('scheme', 'name code benefitScope maxBenefitAmount')
            .populate('recipientIndividual', 'fullName individualId')
            .populate('recipientHousehold', 'householdId addressLine1')
            .populate('application', 'applicationId status')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
          BenefitRecord.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }

      case 'ALLOCATIONS': {
        const query = {};
        if (status !== 'ALL') query.status = status;

        const [records, total] = await Promise.all([
          HouseholdAllocation.find(query)
            .populate('household', 'householdId addressLine1 district state')
            .populate('scheme', 'name code benefitScope maxBenefitAmount')
            .populate('recommendedApplicant', 'fullName individualId annualIncome')
            .populate('recommendedApplication', 'applicationId requestedAmount status')
            .populate('reviewedBy', 'name badgeNumber')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
          HouseholdAllocation.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }

      case 'VERIFICATIONS':
      default: {
        const query = {};
        const [records, total] = await Promise.all([
          EligibilityAssessment.find(query)
            .populate('application', 'applicationId status')
            .populate('individual', 'fullName individualId')
            .populate('scheme', 'name code')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
          EligibilityAssessment.countDocuments(query)
        ]);
        result = { records, total };
        break;
      }
    }

    res.json({
      success: true,
      tab: tab.toUpperCase(),
      data: result.records,
      pagination: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminBenefitRecords
};
