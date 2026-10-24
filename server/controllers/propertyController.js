const Property = require('../models/Property');
const PropertyAssociation = require('../models/PropertyAssociation');
const BenefitRecord = require('../models/BenefitRecord');
const { logAudit } = require('../services/auditService');

const getProperties = async (req, res, next) => {
  try {
    const { search, propertyType, district, page = 1, limit = 10 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { propertyId: { $regex: search, $options: 'i' } },
        { addressLine1: { $regex: search, $options: 'i' } },
        { plotNumber: { $regex: search, $options: 'i' } },
        { surveyNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (propertyType && propertyType !== 'ALL') {
      query.propertyType = propertyType;
    }

    if (district && district !== 'ALL') {
      query.district = district;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, properties] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    // Count associated households for each property
    const propIds = properties.map((p) => p._id);
    const assocCounts = await PropertyAssociation.aggregate([
      { $match: { property: { $in: propIds }, isCurrent: true } },
      { $group: { _id: '$property', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    assocCounts.forEach((a) => {
      countMap[String(a._id)] = a.count;
    });

    const enriched = properties.map((p) => ({
      ...p.toObject(),
      associatedHouseholdCount: countMap[String(p._id)] || 0
    }));

    res.json({
      success: true,
      data: enriched,
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

const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property record not found.' });
    }

    const [associations, benefitHistory] = await Promise.all([
      PropertyAssociation.find({ property: id })
        .populate('household', 'householdId addressLine1 rationCardNumber')
        .populate('individual', 'fullName individualId phone')
        .populate('verifiedBy', 'name role')
        .sort({ isCurrent: -1, startDate: -1 }),
      BenefitRecord.find({ recipientProperty: id })
        .populate('scheme', 'name code benefitScope')
        .populate('recipientIndividual', 'fullName individualId')
        .sort({ sanctionDate: -1 })
    ]);

    res.json({
      success: true,
      data: {
        property,
        associations,
        benefitHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const { propertyType, plotNumber, addressLine1, district, state, pincode, surveyNumber, notes } = req.body;

    if (!addressLine1 || !district) {
      return res.status(400).json({ success: false, message: 'Address and District are required.' });
    }

    const count = await Property.countDocuments();
    const propertyId = `PROP-${String(count + 101).padStart(4, '0')}`;

    const property = new Property({
      propertyId,
      propertyType: propertyType || 'RESIDENTIAL',
      plotNumber: plotNumber || 'Plot 10',
      surveyNumber: surveyNumber || `Khasra-${Date.now().toString().slice(-4)}`,
      addressLine1,
      district,
      state: state || 'Rajasthan',
      pincode: pincode || '302001',
      notes,
      verificationStatus: 'VERIFIED'
    });

    await property.save();

    await logAudit({
      actingUser: req.user,
      action: 'PROPERTY_CREATE',
      entityType: 'Property',
      entityId: property._id,
      afterSnapshot: property.toObject(),
      reasonNotes: req.body.reason || 'New property registry recording',
      req
    });

    res.status(201).json({
      success: true,
      message: `Property ${property.propertyId} registered.`,
      data: property
    });
  } catch (error) {
    next(error);
  }
};

const associateHousehold = async (req, res, next) => {
  try {
    const { id } = req.params; // propertyId
    const { householdId, associationType = 'RESIDENT', reason } = req.body;

    if (!householdId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Household ID and formal justification reason are required.'
      });
    }

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const association = new PropertyAssociation({
      property: property._id,
      household: householdId,
      associationType,
      startDate: new Date(),
      isCurrent: true,
      reasonForChange: reason,
      verifiedBy: req.user._id
    });
    await association.save();

    await logAudit({
      actingUser: req.user,
      action: 'PROPERTY_ASSOCIATION_CREATE',
      entityType: 'PropertyAssociation',
      entityId: association._id,
      reasonNotes: reason,
      afterSnapshot: { propertyId: property.propertyId, householdId, associationType },
      req
    });

    res.json({
      success: true,
      message: `Household linked to property ${property.propertyId}.`,
      data: association
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  associateHousehold
};
