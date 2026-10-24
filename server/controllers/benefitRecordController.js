const BenefitRecord = require('../models/BenefitRecord');
const {
  getIndividualBenefitHistory: fetchIndHistory,
  getHouseholdBenefitHistory: fetchHhHistory
} = require('../services/benefitHistoryService');

const getBenefitRecords = async (req, res, next) => {
  try {
    const { schemeId, status, recipientType, page = 1, limit = 10 } = req.query;

    const query = {};
    if (schemeId && schemeId !== 'ALL') query.scheme = schemeId;
    if (status && status !== 'ALL') query.status = status;

    if (recipientType === 'INDIVIDUAL') {
      query.recipientIndividual = { $ne: null };
    } else if (recipientType === 'HOUSEHOLD') {
      query.recipientHousehold = { $ne: null };
    } else if (recipientType === 'PROPERTY') {
      query.recipientProperty = { $ne: null };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, records] = await Promise.all([
      BenefitRecord.countDocuments(query),
      BenefitRecord.find(query)
        .populate('scheme', 'name code benefitScope maxBenefitAmount')
        .populate('recipientIndividual', 'fullName individualId incomeCategory phone')
        .populate('recipientHousehold', 'householdId addressLine1')
        .populate('recipientProperty', 'propertyId addressLine1 propertyType')
        .populate('application', 'applicationId status')
        .sort({ sanctionDate: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: records,
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

const getBenefitRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await BenefitRecord.findById(id)
      .populate('scheme')
      .populate('recipientIndividual')
      .populate('recipientHousehold')
      .populate('recipientProperty')
      .populate('application');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Benefit record not found.' });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getIndividualHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await fetchIndHistory(id);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

const getHouseholdHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await fetchHhHistory(id);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBenefitRecords,
  getBenefitRecordById,
  getIndividualHistory,
  getHouseholdHistory
};
