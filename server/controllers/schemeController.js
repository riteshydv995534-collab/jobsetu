const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitRecord = require('../models/BenefitRecord');
const { logAudit } = require('../services/auditService');

const getSchemes = async (req, res, next) => {
  try {
    const { scope, category, activeOnly } = req.query;

    const query = {};
    if (scope && scope !== 'ALL') {
      query.benefitScope = scope;
    }
    if (category && category !== 'ALL') {
      query.benefitCategory = category;
    }
    if (activeOnly === 'true') {
      query.isActive = true;
    }

    const schemes = await Scheme.find(query).sort({ createdAt: 1 });

    // Enrich with live metrics
    const enriched = await Promise.all(
      schemes.map(async (s) => {
        const [appCount, benefitCount] = await Promise.all([
          Application.countDocuments({ scheme: s._id }),
          BenefitRecord.countDocuments({ scheme: s._id, status: { $in: ['SANCTIONED', 'DISBURSED'] } })
        ]);
        return {
          ...s.toObject(),
          totalApplications: appCount,
          sanctionedCount: benefitCount
        };
      })
    );

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

const getSchemeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    res.json({
      success: true,
      data: scheme
    });
  } catch (error) {
    next(error);
  }
};

const createScheme = async (req, res, next) => {
  try {
    const {
      name,
      code,
      description,
      benefitScope,
      maxBenefitAmount,
      allowedIncomeCategories,
      maxAnnualIncome,
      minAgeYears,
      maxAgeYears,
      targetGender,
      requiredDocuments,
      isActive = true
    } = req.body;

    if (!name || !code || !benefitScope || !maxBenefitAmount) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, benefitScope, and maxBenefitAmount are required.'
      });
    }

    const count = await Scheme.countDocuments();
    const schemeId = `SCH-${String(count + 1).padStart(3, '0')}`;

    const scheme = new Scheme({
      schemeId,
      name,
      code: code.toUpperCase(),
      description,
      benefitScope,
      maxBenefitAmount,
      allowedIncomeCategories: allowedIncomeCategories || ['BPL', 'AAY'],
      maxAnnualIncome: maxAnnualIncome ? Number(maxAnnualIncome) : null,
      minAgeYears: minAgeYears ? Number(minAgeYears) : null,
      maxAgeYears: maxAgeYears ? Number(maxAgeYears) : null,
      targetGender: targetGender || 'ALL',
      requiredDocuments: requiredDocuments || ['Identity Proof', 'Income Certificate'],
      isActive
    });

    await scheme.save();

    await logAudit({
      actingUser: req.user,
      action: 'SCHEME_CREATE',
      entityType: 'Scheme',
      entityId: scheme._id,
      afterSnapshot: scheme.toObject(),
      reasonNotes: req.body.reason || 'New scheme rule configuration',
      req
    });

    res.status(201).json({
      success: true,
      message: `Scheme ${scheme.name} configured successfully.`,
      data: scheme
    });
  } catch (error) {
    next(error);
  }
};

const updateScheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, ...updates } = req.body;

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    const beforeSnapshot = scheme.toObject();
    Object.assign(scheme, updates);
    await scheme.save();

    await logAudit({
      actingUser: req.user,
      action: 'SCHEME_UPDATE',
      entityType: 'Scheme',
      entityId: scheme._id,
      beforeSnapshot,
      afterSnapshot: scheme.toObject(),
      reasonNotes: reason || 'Updated scheme rules',
      req
    });

    res.json({
      success: true,
      message: `Scheme ${scheme.name} updated.`,
      data: scheme
    });
  } catch (error) {
    next(error);
  }
};

const toggleSchemeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    scheme.isActive = !scheme.isActive;
    await scheme.save();

    await logAudit({
      actingUser: req.user,
      action: 'SCHEME_STATUS_TOGGLE',
      entityType: 'Scheme',
      entityId: scheme._id,
      afterSnapshot: { isActive: scheme.isActive },
      reasonNotes: reason || `Scheme status toggled to ${scheme.isActive ? 'Active' : 'Inactive'}`,
      req
    });

    res.json({
      success: true,
      message: `Scheme ${scheme.name} is now ${scheme.isActive ? 'Active' : 'Inactive'}.`,
      data: scheme
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  toggleSchemeStatus
};
