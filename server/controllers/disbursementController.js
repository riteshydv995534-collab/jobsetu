const DisbursementRecord = require('../models/DisbursementRecord');
const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const { logAudit } = require('../services/auditService');

const getDisbursements = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, disbursements] = await Promise.all([
      DisbursementRecord.countDocuments(),
      DisbursementRecord.find()
        .populate({
          path: 'application',
          select: 'applicationId requestedAmount status',
          populate: [
            { path: 'scheme', select: 'name code benefitScope' },
            { path: 'applicantIndividual', select: 'fullName individualId' }
          ]
        })
        .populate('benefitRecord')
        .populate('disbursedBy', 'name role')
        .sort({ disbursedAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: disbursements,
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

const recordDisbursement = async (req, res, next) => {
  try {
    const { applicationId, amount, paymentReference, paymentMethod = 'DBT_DIRECT_BENEFIT_TRANSFER', notes } = req.body;

    if (!applicationId || !amount || !paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'Application ID, payment amount, and bank/DBT transaction reference are required.'
      });
    }

    const application = await Application.findById(applicationId).populate('scheme applicantIndividual household property');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Only applications with status 'APPROVED' can be disbursed. Current status: ${application.status}.`
      });
    }

    // Locate or create the corresponding BenefitRecord
    let benefitRecord = await BenefitRecord.findOne({ application: application._id });
    if (!benefitRecord) {
      const bCount = await BenefitRecord.countDocuments();
      benefitRecord = new BenefitRecord({
        recordId: `BR-${new Date().getFullYear()}-${String(bCount + 1).padStart(4, '0')}`,
        scheme: application.scheme._id,
        recipientIndividual: application.applicantIndividual?._id || null,
        recipientHousehold: application.household?._id || null,
        recipientProperty: application.property?._id || null,
        application: application._id,
        benefitAmount: Number(amount),
        sanctionDate: application.decisionDate || new Date(),
        status: 'SANCTIONED',
        referenceNumber: paymentReference
      });
      await benefitRecord.save();
    }

    const count = await DisbursementRecord.countDocuments();
    const disbursementId = `DISB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const disbursement = new DisbursementRecord({
      disbursementId,
      application: application._id,
      benefitRecord: benefitRecord._id,
      amount: Number(amount),
      paymentReference,
      paymentMethod,
      disbursedAt: new Date(),
      disbursedBy: req.user._id,
      notes: notes || 'Verified Direct Benefit Transfer execution'
    });
    await disbursement.save();

    // Mark BenefitRecord as DISBURSED
    benefitRecord.status = 'DISBURSED';
    benefitRecord.disbursementDate = new Date();
    await benefitRecord.save();

    // Update Application status to BENEFIT_DISBURSED
    const prevStatus = application.status;
    application.status = 'BENEFIT_DISBURSED';
    await application.save();

    const statusHistory = new ApplicationStatusHistory({
      application: application._id,
      previousStatus: prevStatus,
      newStatus: 'BENEFIT_DISBURSED',
      changedBy: req.user._id,
      changeReason: `Direct Benefit Transfer of ₹${amount} executed. Reference: ${paymentReference}`
    });
    await statusHistory.save();

    await logAudit({
      actingUser: req.user,
      action: 'BENEFIT_DISBURSED',
      entityType: 'DisbursementRecord',
      entityId: disbursement._id,
      afterSnapshot: {
        disbursementId,
        applicationId: application.applicationId,
        amount,
        paymentReference
      },
      reasonNotes: `Benefit disbursement logged for ${application.applicantIndividual?.fullName || 'Beneficiary'}`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Benefit disbursement ${disbursement.disbursementId} completed successfully.`,
      data: disbursement
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDisbursements,
  recordDisbursement
};
