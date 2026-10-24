const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const Individual = require('../models/Individual');
const Household = require('../models/Household');
const Property = require('../models/Property');
const EligibilityAssessment = require('../models/EligibilityAssessment');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const BenefitRecord = require('../models/BenefitRecord');
const DisbursementRecord = require('../models/DisbursementRecord');
const DuplicateAlert = require('../models/DuplicateAlert');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const AuditLog = require('../models/AuditLog');
const { assessEligibility } = require('../services/eligibilityEngine');
const { createDuplicateAlertsForApplication } = require('../services/duplicateDetectionService');
const { logAudit } = require('../services/auditService');

const getApplications = async (req, res, next) => {
  try {
    const { status, schemeId, applicantId, page = 1, limit = 10, search } = req.query;

    const query = {};

    // 1. Strict Applicant Isolation
    if (req.user && req.user.role === 'APPLICANT') {
      if (!req.user.linkedIndividual) {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: parseInt(limit, 10), totalPages: 0 }
        });
      }
      query.applicantIndividual = req.user.linkedIndividual._id || req.user.linkedIndividual;
    } else if (req.user && !['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      // 2. Scheme-Specific Authority Access Control
      const assignedIds = (req.user.assignedSchemes || []).map((s) =>
        (s && s._id ? s._id : s).toString()
      );

      if (assignedIds.length > 0) {
        if (schemeId && schemeId !== 'ALL') {
          if (!assignedIds.includes(schemeId.toString())) {
            return res.status(403).json({
              success: false,
              message: 'Access forbidden: You are not authorized to view applications for this scheme.'
            });
          }
          query.scheme = schemeId;
        } else {
          // Default query strictly scoped to officer's assigned schemes
          query.scheme = { $in: assignedIds };
        }
      } else if (schemeId && schemeId !== 'ALL') {
        query.scheme = schemeId;
      }
    } else {
      // Super Admin or Records Admin
      if (schemeId && schemeId !== 'ALL') {
        query.scheme = schemeId;
      }
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (applicantId && req.user && req.user.role !== 'APPLICANT') {
      query.applicantIndividual = applicantId;
    }

    if (search) {
      const matchingIndividuals = await Individual.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { demoIdentifier: { $regex: search, $options: 'i' } },
          { individualId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const indIds = matchingIndividuals.map((i) => i._id);

      query.$or = [
        { applicationId: { $regex: search, $options: 'i' } },
        { sourceSystemReference: { $regex: search, $options: 'i' } },
        ...(indIds.length > 0 ? [{ applicantIndividual: { $in: indIds } }] : [])
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, applications] = await Promise.all([
      Application.countDocuments(query),
      Application.find(query)
        .populate('scheme', 'name code benefitScope maxBenefitAmount benefitCategory')
        .populate('applicantIndividual', 'fullName individualId demoIdentifier incomeCategory phone age gender')
        .populate('household', 'householdId addressLine1 district')
        .populate('property', 'propertyId addressLine1 propertyType')
        .populate('submittedBy', 'name role')
        .populate('reviewedBy', 'name role badgeNumber designation department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: applications,
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

const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id)
      .populate('scheme')
      .populate('applicantIndividual')
      .populate('household')
      .populate('property')
      .populate('submittedBy', 'name role email')
      .populate('reviewedBy', 'name role email badgeNumber designation department')
      .populate('documents');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Security Check 1: Applicant Isolation
    if (req.user && req.user.role === 'APPLICANT') {
      const userIndId = (req.user.linkedIndividual?._id || req.user.linkedIndividual || '').toString();
      const appIndId = (application.applicantIndividual?._id || application.applicantIndividual || '').toString();

      if (!userIndId || userIndId !== appIndId) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You cannot view application records submitted by other citizens.'
        });
      }

      // Return sanitized applicant view without internal duplicate notes or sensitive officer tools
      const statusHistory = await ApplicationStatusHistory.find({ application: id })
        .select('previousStatus newStatus changedAt changeReason')
        .sort({ changedAt: 1 });

      return res.json({
        success: true,
        data: {
          application,
          statusHistory,
          isApplicantView: true
        }
      });
    }

    // Security Check 2: Scheme Assignment Enforcement for Officers
    if (req.user && !['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      const assignedIds = (req.user.assignedSchemes || []).map((s) =>
        (s && s._id ? s._id : s).toString()
      );

      const appSchemeId = (application.scheme?._id || application.scheme || '').toString();
      if (assignedIds.length > 0 && !assignedIds.includes(appSchemeId)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to view records for this scheme.'
        });
      }
    }

    const [statusHistory, assessments, duplicateAlerts, linkedBenefitRecord] = await Promise.all([
      ApplicationStatusHistory.find({ application: id })
        .populate('changedBy', 'name role')
        .sort({ changedAt: 1 }),
      EligibilityAssessment.find({ application: id })
        .populate('assessedBy', 'name role')
        .sort({ assessedAt: -1 }),
      require('../models/DuplicateAlert').find({ application: id })
        .populate('conflictingBenefitRecord')
        .populate('conflictingApplication')
        .populate('assignedOfficer', 'name role'),
      BenefitRecord.findOne({ application: id })
    ]);

    res.json({
      success: true,
      data: {
        application,
        statusHistory,
        assessments,
        duplicateAlerts,
        linkedBenefitRecord
      }
    });
  } catch (error) {
    next(error);
  }
};

const submitApplication = async (req, res, next) => {
  try {
    const {
      schemeId,
      applicantIndividualId,
      householdId,
      propertyId,
      requestedAmount,
      applicationDate,
      remarks,
      documentIds = []
    } = req.body;

    if (!schemeId || !applicantIndividualId || !requestedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Scheme, Applicant Individual, and Requested Amount are required.'
      });
    }

    const scheme = await Scheme.findById(schemeId);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    const applicant = await Individual.findById(applicantIndividualId);
    if (!applicant) {
      return res.status(404).json({ success: false, message: 'Applicant individual not found.' });
    }

    let household = null;
    if (householdId) {
      household = await Household.findById(householdId);
    } else if (applicant.currentHousehold) {
      household = await Household.findById(applicant.currentHousehold);
    }

    let property = null;
    if (propertyId) {
      property = await Property.findById(propertyId);
    }

    // Run deep eligibility evaluation and duplicate detection
    const evaluation = await assessEligibility({
      scheme,
      applicant,
      household,
      property
    });

    const count = await Application.countDocuments();
    const applicationId = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Determine initial application status based on evaluation
    let initialStatus = 'SUBMITTED';
    if (evaluation.duplicateResult.isPotentialDuplicate) {
      initialStatus = 'UNDER_REVIEW';
    } else if (evaluation.overallResult === 'REQUIRES_VERIFICATION' || evaluation.overallResult === 'VERIFICATION_PENDING') {
      initialStatus = 'VERIFICATION_PENDING';
    }

    const application = new Application({
      applicationId,
      scheme: scheme._id,
      applicantIndividual: applicant._id,
      household: household?._id || null,
      property: property?._id || null,
      requestedAmount: Number(requestedAmount),
      applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
      status: initialStatus,
      eligibilityStatus: evaluation.overallResult,
      hasDuplicateAlert: evaluation.duplicateResult.isPotentialDuplicate,
      duplicateAlertCount: evaluation.duplicateResult.alerts.length,
      remarks: remarks || '',
      submittedBy: req.user?._id || null,
      documents: documentIds
    });

    await application.save();

    // Increment individual's application count
    await Individual.findByIdAndUpdate(applicant._id, { $inc: { applicationCount: 1 } });

    // Save eligibility assessment record
    const assessmentRecord = new EligibilityAssessment({
      application: application._id,
      scheme: scheme._id,
      applicant: applicant._id,
      household: household?._id || null,
      property: property?._id || null,
      ruleVersion: evaluation.ruleVersion || 'RULE_SET_v2.4_2026',
      overallResult: evaluation.overallResult,
      checksPassed: evaluation.checksPassed,
      checksFailed: evaluation.checksFailed,
      checksRequiringVerification: evaluation.checksRequiringVerification,
      rulesEvaluated: evaluation.rulesEvaluated,
      externalApiResults: evaluation.externalApiResults || [],
      previousBenefitsFound: evaluation.previousBenefitsFound || [],
      explanation: evaluation.explanation,
      assessedBy: req.user?._id || null,
      assessedAt: new Date()
    });
    await assessmentRecord.save();

    // If duplicate detected, generate DuplicateAlert documents
    let createdAlerts = [];
    if (evaluation.duplicateResult.isPotentialDuplicate) {
      createdAlerts = await createDuplicateAlertsForApplication(application, evaluation.duplicateResult.alerts);
    }

    // Record initial status history
    const statusEntry = new ApplicationStatusHistory({
      application: application._id,
      previousStatus: 'DRAFT',
      newStatus: initialStatus,
      changedBy: req.user?._id || null,
      changeReason: evaluation.duplicateResult.isPotentialDuplicate
        ? 'Application placed under review due to detected duplicate/overlap condition requiring officer confirmation.'
        : 'Initial application submission and automated rules evaluation.'
    });
    await statusEntry.save();

    // Record audit event
    await logAudit({
      actingUser: req.user,
      action: 'APPLICATION_SUBMIT',
      entityType: 'Application',
      entityId: application._id,
      afterSnapshot: {
        applicationId: application.applicationId,
        scheme: scheme.name,
        applicant: applicant.fullName,
        overallResult: evaluation.overallResult,
        hasDuplicateAlert: evaluation.duplicateResult.isPotentialDuplicate
      },
      reasonNotes: 'Benefit application registered and processed by rules engine',
      req
    });

    res.status(201).json({
      success: true,
      message: `Application ${application.applicationId} submitted successfully.`,
      data: {
        application,
        assessment: assessmentRecord,
        duplicateAlerts: createdAlerts,
        evaluation
      }
    });
  } catch (error) {
    next(error);
  }
};

const evaluateApplicationRules = async (req, res, next) => {
  try {
    const { schemeId, applicantIndividualId, householdId, propertyId, applicationId } = req.body;

    const scheme = await Scheme.findById(schemeId);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });

    const applicant = await Individual.findById(applicantIndividualId);
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found.' });

    const household = householdId ? await Household.findById(householdId) : null;
    const property = propertyId ? await Property.findById(propertyId) : null;

    const evaluation = await assessEligibility({
      scheme,
      applicant,
      household,
      property,
      excludeApplicationId: applicationId || null
    });

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (req.user && req.user.role === 'APPLICANT') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Applicants are not authorized to update application status.'
      });
    }

    if (!status || !reason) {
      return res.status(400).json({
        success: false,
        message: 'New status and justification reason are strictly required.'
      });
    }

    const application = await Application.findById(id).populate('scheme applicantIndividual household property');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Check scheme assignment for officers
    if (req.user && !['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      const assignedIds = (req.user.assignedSchemes || []).map((s) => (s && s._id ? s._id : s).toString());
      const appSchemeId = (application.scheme?._id || application.scheme || '').toString();
      if (assignedIds.length > 0 && !assignedIds.includes(appSchemeId)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to update records for this scheme.'
        });
      }
    }

    const previousStatus = application.status;
    application.status = status;
    application.reviewedBy = req.user._id;
    application.decisionDate = new Date();
    application.decisionReason = reason;
    await application.save();

    // If status updated to APPROVED, automatically create or link a BenefitRecord in 'SANCTIONED' state (distinguishing sanctioned from disbursed!)
    if (status === 'APPROVED') {
      const existingBenefit = await BenefitRecord.findOne({ application: application._id });
      if (!existingBenefit) {
        const count = await BenefitRecord.countDocuments();
        const recordId = `BR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const newBenefitRecord = new BenefitRecord({
          recordId,
          scheme: application.scheme._id,
          recipientIndividual: application.applicantIndividual?._id || null,
          recipientHousehold: application.household?._id || null,
          recipientProperty: application.property?._id || null,
          application: application._id,
          benefitAmount: application.requestedAmount,
          sanctionDate: new Date(),
          status: 'SANCTIONED',
          referenceNumber: `SANCT-${Date.now().toString().slice(-6)}`,
          notes: `Sanctioned by Officer ${req.user.name}. Awaiting actual disbursement.`
        });
        await newBenefitRecord.save();
      }
    }

    const statusHistory = new ApplicationStatusHistory({
      application: application._id,
      previousStatus,
      newStatus: status,
      changedBy: req.user._id,
      changeReason: reason
    });
    await statusHistory.save();

    await logAudit({
      actingUser: req.user,
      action: 'APPLICATION_STATUS_CHANGE',
      entityType: 'Application',
      entityId: application._id,
      beforeSnapshot: { status: previousStatus },
      afterSnapshot: { status },
      reasonNotes: reason,
      req
    });

    res.json({
      success: true,
      message: `Application ${application.applicationId} status updated to ${status}.`,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

const reviewApplicationAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, notes, reason, overrideJustification } = req.body;

    if (req.user && req.user.role === 'APPLICANT') {
      return res.status(403).json({ success: false, message: 'Access forbidden: Applicants cannot review applications.' });
    }

    const application = await Application.findById(id).populate('scheme applicantIndividual household property');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (req.user && !['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      const assignedIds = (req.user.assignedSchemes || []).map((s) => (s && s._id ? s._id : s).toString());
      const appSchemeId = (application.scheme?._id || application.scheme || '').toString();
      if (assignedIds.length > 0 && !assignedIds.includes(appSchemeId)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to review records for this scheme.'
        });
      }
    }

    let newStatus = application.status;
    let finalReason = reason || notes || '';

    switch (action) {
      case 'START_REVIEW':
        newStatus = 'UNDER_REVIEW';
        finalReason = finalReason || 'Officer initiated in-depth application review and document inspection.';
        break;
      case 'REQUEST_ADDITIONAL_INFO':
        newStatus = 'INFORMATION_REQUIRED';
        if (!finalReason) {
          return res.status(400).json({ success: false, message: 'Please specify the additional information or documents required.' });
        }
        break;
      case 'MARK_VERIFIED':
        newStatus = 'UNDER_REVIEW';
        application.eligibilityStatus = 'ELIGIBLE';
        finalReason = finalReason || 'Verification officer marked individual and household criteria as verified.';
        break;
      case 'APPROVE':
        newStatus = 'APPROVED';
        finalReason = finalReason || 'Application satisfies all statutory eligibility requirements and was approved.';
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        if (!finalReason) {
          return res.status(400).json({ success: false, message: 'Rejection requires a mandatory formal justification.' });
        }
        break;
      case 'OVERRIDE_RECOMMENDATION':
        if (!overrideJustification && !finalReason) {
          return res.status(400).json({ success: false, message: 'Overriding system recommendation requires explicit justification.' });
        }
        finalReason = `[OFFICER OVERRIDE] ${overrideJustification || finalReason}`;
        break;
      default:
        return res.status(400).json({ success: false, message: `Unsupported review action: ${action}` });
    }

    const previousStatus = application.status;
    application.status = newStatus;
    application.reviewedBy = req.user._id;
    application.decisionDate = new Date();
    application.decisionReason = finalReason;
    await application.save();

    if (newStatus === 'APPROVED') {
      const existingBenefit = await BenefitRecord.findOne({ application: application._id });
      if (!existingBenefit) {
        const count = await BenefitRecord.countDocuments();
        const recordId = `BR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        const newBenefitRecord = new BenefitRecord({
          recordId,
          scheme: application.scheme._id,
          recipientIndividual: application.applicantIndividual?._id || null,
          recipientHousehold: application.household?._id || null,
          recipientProperty: application.property?._id || null,
          application: application._id,
          benefitAmount: application.requestedAmount,
          sanctionDate: new Date(),
          status: 'SANCTIONED',
          referenceNumber: `SANCT-${Date.now().toString().slice(-6)}`,
          notes: `Sanctioned by Officer ${req.user.name}. ${finalReason}`
        });
        await newBenefitRecord.save();
      }
    }

    const statusHistory = new ApplicationStatusHistory({
      application: application._id,
      previousStatus,
      newStatus,
      changedBy: req.user._id,
      changeReason: finalReason
    });
    await statusHistory.save();

    await logAudit({
      actingUser: req.user,
      action: 'APPLICATION_REVIEW_ACTION',
      entityType: 'Application',
      entityId: application._id,
      beforeSnapshot: { status: previousStatus },
      afterSnapshot: { status: newStatus, action },
      reasonNotes: finalReason,
      req
    });

    res.json({
      success: true,
      message: `Action ${action} executed successfully. Status is now ${newStatus}.`,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

const disburseApplicationBenefit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentReference, paymentMethod, notes } = req.body;

    if (req.user && req.user.role === 'APPLICANT') {
      return res.status(403).json({ success: false, message: 'Access forbidden: Applicants cannot disburse benefits.' });
    }

    const application = await Application.findById(id).populate('scheme applicantIndividual household property');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications can have benefits disbursed.'
      });
    }

    // Check scheme assignment for officers
    if (req.user && !['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      const assignedIds = (req.user.assignedSchemes || []).map((s) => (s && s._id ? s._id : s).toString());
      const appSchemeId = (application.scheme?._id || application.scheme || '').toString();
      if (assignedIds.length > 0 && !assignedIds.includes(appSchemeId)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to disburse benefits for this scheme.'
        });
      }
    }

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
        benefitAmount: application.requestedAmount,
        sanctionDate: application.decisionDate || new Date(),
        status: 'SANCTIONED',
        referenceNumber: `SANCT-${Date.now().toString().slice(-6)}`
      });
      await benefitRecord.save();
    }

    const dCount = await DisbursementRecord.countDocuments();
    const disbursementId = `DBT-${new Date().getFullYear()}-${String(dCount + 1).padStart(5, '0')}`;
    const refNum = paymentReference || `PFMS-TXN-${Date.now().toString().slice(-8)}`;

    const disbursement = new DisbursementRecord({
      disbursementId,
      application: application._id,
      benefitRecord: benefitRecord._id,
      amount: application.requestedAmount,
      paymentReference: refNum,
      paymentMethod: paymentMethod || 'DBT_DIRECT_BENEFIT_TRANSFER',
      disbursedAt: new Date(),
      disbursedBy: req.user._id,
      notes: notes || 'Direct Benefit Transfer executed successfully via integrated treasury gateway.'
    });
    await disbursement.save();

    benefitRecord.status = 'DISBURSED';
    benefitRecord.disbursementDate = new Date();
    await benefitRecord.save();

    const prevStatus = application.status;
    application.status = 'BENEFIT_DISBURSED';
    await application.save();

    const statusHistory = new ApplicationStatusHistory({
      application: application._id,
      previousStatus: prevStatus,
      newStatus: 'BENEFIT_DISBURSED',
      changedBy: req.user._id,
      changeReason: `DBT Payment disbursed successfully [Ref: ${refNum}]. Amount: ₹${application.requestedAmount.toLocaleString('en-IN')}`
    });
    await statusHistory.save();

    await logAudit({
      actingUser: req.user,
      action: 'BENEFIT_DISBURSEMENT',
      entityType: 'DisbursementRecord',
      entityId: disbursement._id,
      afterSnapshot: {
        applicationId: application.applicationId,
        amount: application.requestedAmount,
        paymentReference: refNum
      },
      reasonNotes: `DBT Disbursement executed by ${req.user.name}`,
      req
    });

    res.json({
      success: true,
      message: `Disbursement completed successfully. Reference: ${refNum}`,
      data: {
        application,
        benefitRecord,
        disbursement
      }
    });
  } catch (error) {
    next(error);
  }
};

const getVerificationDetails = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(applicationId) ? applicationId : null },
        { applicationId }
      ]
    })
      .populate('scheme')
      .populate('applicantIndividual')
      .populate('household')
      .populate('property')
      .populate('reviewedBy', 'name badgeNumber designation');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: `Application ${applicationId} not found.`
      });
    }

    const [assessment, alerts, history] = await Promise.all([
      EligibilityAssessment.findOne({ application: application._id }),
      DuplicateAlert.find({ application: application._id }).populate('matchingBenefitRecord'),
      ApplicationStatusHistory.find({ application: application._id }).populate('changedBy', 'name badgeNumber').sort({ changedAt: 1 })
    ]);

    res.json({
      success: true,
      data: {
        application,
        assessment,
        alerts,
        statusHistory: history,
        verificationStatus: application.eligibilityStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/imported-applications/:id/report or /api/applications/:id/report
 * Generates Consolidated Application Assessment Report (Sections A through G)
 */
const getApplicationAssessmentReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = id && id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { $or: [{ _id: id }, { applicationId: id }] } : { applicationId: id };

    const application = await Application.findOne(query)
      .populate('scheme')
      .populate('applicantIndividual')
      .populate('household')
      .populate('property')
      .populate('reviewedBy', 'name badgeNumber designation department');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found in JanSetu database.'
      });
    }

    // Scheme permission check
    if (req.user && !['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      const assignedIds = (req.user.assignedSchemes || []).map((s) => (s && s._id ? s._id : s).toString());
      const appSchemeId = (application.scheme?._id || application.scheme || '').toString();
      if (assignedIds.length > 0 && !assignedIds.includes(appSchemeId)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You are not authorized to view reports for this scheme.'
        });
      }
    }

    let assessment = await EligibilityAssessment.findOne({ application: application._id });
    if (!assessment) {
      assessment = await assessEligibility({ applicationId: application._id });
    }

    const [alerts, history, disbursement, previousApps, householdApps, householdAlloc, audits] = await Promise.all([
      DuplicateAlert.find({ application: application._id }).populate('matchingBenefitRecord'),
      ApplicationStatusHistory.find({ application: application._id })
        .populate('changedBy', 'name badgeNumber designation role')
        .sort({ changedAt: 1 }),
      DisbursementRecord.findOne({ application: application._id }),
      application.applicantIndividual
        ? Application.find({
            applicantIndividual: application.applicantIndividual._id,
            _id: { $ne: application._id }
          }).populate('scheme', 'name code benefitCategory benefitScope')
        : [],
      application.household
        ? Application.find({
            household: application.household._id,
            _id: { $ne: application._id }
          }).populate('scheme applicantIndividual', 'name code fullName individualId')
        : [],
      application.household
        ? HouseholdAllocation.findOne({
            household: application.household._id,
            scheme: application.scheme?._id
          }).populate('recommendedApplicant', 'fullName individualId')
        : null,
      AuditLog.find({
        $or: [
          { entityId: application._id.toString() },
          { entityId: application.applicationId }
        ]
      }).sort({ timestamp: -1 }).limit(20)
    ]);

    // Calculate Criteria Completion Percentage strictly: (verified passed or failed criteria / total applicable criteria) * 100
    const breakdown = assessment?.criteriaBreakdown || [];
    const totalApplicable = breakdown.length || 8;
    const passedCount = breakdown.filter((c) => c.status === 'PASSED' || c.result === 'PASSED').length;
    const failedCount = breakdown.filter((c) => c.status === 'FAILED' || c.result === 'FAILED').length;
    const pendingCount = totalApplicable - (passedCount + failedCount);
    const completionPercentage = totalApplicable > 0 ? Math.round(((passedCount + failedCount) / totalApplicable) * 100) : 100;

    // Build consolidated report according to Section 11 requirements
    const report = {
      sectionA: {
        title: 'Section A — Application Overview',
        internalApplicationReference: application.applicationId,
        sourceSystemApplicationReference: application.sourceSystemReference || `EXT-${application.applicationId}`,
        schemeName: application.scheme?.name || 'Social Welfare Scheme',
        schemeCode: application.scheme?.code || 'SCH-CODE',
        sourceDepartment: application.scheme?.department || 'Department of Social Welfare',
        receivedTimestamp: application.createdAt || application.applicationDate,
        currentProcessingStatus: application.status,
        lastAssessmentTimestamp: assessment?.assessmentTimestamp || application.updatedAt
      },
      sectionB: {
        title: 'Section B — Data Verification',
        individualVerificationStatus: application.applicantIndividual?.isVerified ? 'VERIFIED' : 'DEMO_VERIFIED',
        householdVerificationStatus: application.household
          ? (application.household.isVerified ? 'VERIFIED' : 'HOUSEHOLD MEMBERSHIP REQUIRES VERIFICATION')
          : 'NOT_APPLICABLE',
        propertyVerificationStatus: application.property
          ? (application.property.isVerified ? 'VERIFIED' : 'REQUIRES_VERIFICATION')
          : 'NOT_APPLICABLE',
        dataSourceReferences: [
          { source: 'UIDAI Synthetic Demo Roster', verifiedAt: application.createdAt },
          { source: 'State NFSA Ration Card Registry', verifiedAt: application.createdAt },
          { source: 'State Revenue & Land Records (RoR)', verifiedAt: application.createdAt }
        ],
        dataCompleteness: pendingCount === 0 ? 'COMPLETE (100%)' : `PARTIAL (${completionPercentage}%)`,
        missingInformation: pendingCount > 0 ? breakdown.filter((c) => c.status === 'PENDING').map((c) => c.criterionName || c.criterion) : [],
        providerErrorsOrUnavailableData: null
      },
      sectionC: {
        title: 'Section C — Eligibility Analysis',
        overallEligibilityResult: assessment?.overallResult || 'VERIFICATION_PENDING',
        criteriaCompletionPercentage: completionPercentage,
        completionSummary: `Criteria completion: ${passedCount + failedCount} of ${totalApplicable} checks completed — ${completionPercentage}%`,
        numberPassed: passedCount,
        numberFailed: failedCount,
        numberPendingVerification: pendingCount,
        criterionByCriterionExplanation: breakdown.map((c) => ({
          criterion: c.criterionName || c.criterion,
          result: c.status || c.result,
          explanation: c.explanation || c.reason || 'Satisfies configured statutory rule',
          mandatory: c.isMandatory !== false
        })),
        schemeRuleVersion: assessment?.ruleVersion || 'RULE_SET_v2.4_2026'
      },
      sectionD: {
        title: 'Section D — Duplicate and Benefit History',
        previousRelevantApplications: previousApps.map((pa) => ({
          applicationId: pa.applicationId,
          schemeName: pa.scheme?.name,
          status: pa.status,
          date: pa.applicationDate
        })),
        previousApprovals: previousApps.filter((pa) => pa.status === 'APPROVED').length,
        confirmedDisbursements: disbursement ? [{
          disbursementId: disbursement.disbursementId,
          amount: disbursement.disbursedAmount,
          transactionRef: disbursement.transactionReference,
          date: disbursement.disbursedAt,
          status: disbursement.status
        }] : [],
        potentialDuplicateApplications: alerts.map((al) => ({
          alertId: al.alertId,
          severity: al.severity,
          reason: al.flagReason,
          status: al.status,
          matchedApplication: al.matchingApplicationId
        })),
        relevantHouseholdClaims: householdApps.map((ha) => ({
          applicationId: ha.applicationId,
          applicantName: ha.applicantIndividual?.fullName,
          schemeName: ha.scheme?.name,
          status: ha.status
        })),
        conflictingOrUncertainRecords: alerts.filter((al) => al.status === 'PENDING').length
      },
      sectionE: {
        title: 'Section E — Allocation Assessment',
        isRestrictedScheme: application.scheme?.benefitScope === 'HOUSEHOLD' || application.scheme?.repeatBenefitPolicy === 'ONCE_PER_LIFETIME',
        competingApplicationsCount: householdApps.length,
        competingApplications: householdApps,
        documentedPriorityCriteria: application.scheme?.priorityCriteria || 'Income tier (BPL/AAY), single earning member, student count',
        householdAllocationCase: householdAlloc,
        recommendation: householdAlloc?.recommendedApplicant
          ? `Recommended for approval: ${householdAlloc.recommendedApplicant.fullName}`
          : (assessment?.overallResult === 'ELIGIBLE' ? 'RECOMMENDED_FOR_APPROVAL' : 'MANUAL_REVIEW_REQUIRED'),
        reasonForHumanReview: householdAlloc?.tieBreakTriggered
          ? 'Equal priority tie detected; manual supervisor review required'
          : null
      },
      sectionF: {
        title: 'Section F — Final Administrative Workflow',
        stages: {
          verificationCompleted: { status: application.applicantIndividual?.isVerified ? 'COMPLETED' : 'DEMO_COMPLETED', timestamp: application.createdAt },
          assessmentCompleted: { status: 'COMPLETED', timestamp: assessment?.assessmentTimestamp, ruleVersion: assessment?.ruleVersion },
          officerReview: { status: application.reviewedBy ? 'COMPLETED' : 'PENDING', officer: application.reviewedBy?.name || null },
          recommendationRecorded: { status: application.reviewedBy ? 'RECORDED' : 'PENDING' },
          finalDecisionRecorded: { status: ['APPROVED', 'REJECTED'].includes(application.status) ? application.status : 'PENDING', date: application.decisionDate, reason: application.decisionReason },
          disbursementConfirmed: { status: application.disbursementStatus || (disbursement ? 'DISBURSED' : 'PENDING'), record: disbursement ? disbursement.transactionReference : null }
        }
      },
      sectionG: {
        title: 'Section G — Audit and Provenance',
        assessmentId: assessment?._id,
        ruleVersion: assessment?.ruleVersion || 'RULE_SET_v2.4_2026',
        sourceReferences: {
          sourceSystem: application.sourceSystemReference || 'NATIONAL_SW_DATA_EXCHANGE',
          dataEnvironment: 'HACKATHON_SYNTHETIC_DEMO'
        },
        assessmentTimestamp: assessment?.assessmentTimestamp || application.createdAt,
        authorisedReviewingOfficer: application.reviewedBy
          ? `${application.reviewedBy.name} (${application.reviewedBy.badgeNumber || 'OFFICER'}) - ${application.reviewedBy.designation || 'Scheme Officer'}`
          : 'Pending Officer Review',
        decisionHistory: history.map((h) => ({
          status: h.status,
          changedBy: h.changedBy?.name,
          reason: h.reason,
          timestamp: h.changedAt
        })),
        auditEvents: audits.map((a) => ({
          action: a.action,
          actingUser: a.actingUserName,
          timestamp: a.timestamp,
          notes: a.reasonNotes
        }))
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/applications/track/:identifier
 * Public read-only application stage tracker for applicants
 */
const trackApplicationStage = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Application ID or reference is required.' });
    }

    const trimmed = identifier.trim();

    // Check if identifier matches an Individual's demo identifier or individualId
    let individual = await Individual.findOne({
      $or: [
        { demoIdentifier: trimmed },
        { individualId: trimmed }
      ]
    });

    let application = null;

    if (individual) {
      application = await Application.findOne({ applicantIndividual: individual._id })
        .sort({ createdAt: -1 })
        .populate('scheme', 'name code benefitCategory maxBenefitAmount benefitScope')
        .populate('applicantIndividual', 'fullName demoIdentifier individualId district state')
        .populate('household', 'householdId district state');
    }

    if (!application) {
      const isObjectId = trimmed.match(/^[0-9a-fA-F]{24}$/);
      application = await Application.findOne({
        $or: [
          { applicationId: trimmed },
          { sourceSystemReference: trimmed },
          ...(isObjectId ? [{ _id: trimmed }] : [])
        ]
      })
        .populate('scheme', 'name code benefitCategory maxBenefitAmount benefitScope')
        .populate('applicantIndividual', 'fullName demoIdentifier individualId district state')
        .populate('household', 'householdId district state');
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: `No application matching reference "${trimmed}" was found in JanSetu.`
      });
    }

    const [statusHistory, disbursement, assessment] = await Promise.all([
      ApplicationStatusHistory.find({ application: application._id })
        .select('previousStatus newStatus changedAt changeReason')
        .sort({ changedAt: 1 }),
      DisbursementRecord.findOne({ application: application._id })
        .select('disbursementId disbursedAmount paymentMethod transactionReference disbursedAt status'),
      EligibilityAssessment.findOne({ application: application._id })
        .select('overallResult assessmentTimestamp ruleVersion criteriaBreakdown')
    ]);

    let currentStage = 1;
    let stage1Status = 'COMPLETED';
    let stage2Status = 'PENDING';
    let stage3Status = 'PENDING';
    let stage4Status = 'PENDING';
    let stage5Status = 'PENDING';
    let stage6Status = 'PENDING';

    const appStatus = application.status;

    if (appStatus === 'SUBMITTED') {
      currentStage = 2;
      stage2Status = 'IN_PROGRESS';
    } else if (appStatus === 'VERIFICATION_PENDING' || appStatus === 'INFORMATION_REQUIRED') {
      currentStage = 2;
      stage2Status = appStatus === 'INFORMATION_REQUIRED' ? 'ACTION_REQUIRED' : 'IN_PROGRESS';
    } else if (appStatus === 'UNDER_REVIEW') {
      currentStage = 5;
      stage2Status = 'COMPLETED';
      stage3Status = 'COMPLETED';
      stage4Status = 'COMPLETED';
      stage5Status = 'IN_PROGRESS';
    } else if (appStatus === 'APPROVED') {
      currentStage = disbursement ? 6 : 5;
      stage2Status = 'COMPLETED';
      stage3Status = 'COMPLETED';
      stage4Status = 'COMPLETED';
      stage5Status = 'COMPLETED';
      stage6Status = disbursement ? 'COMPLETED' : 'AWAITING_TREASURY';
    } else if (appStatus === 'REJECTED') {
      currentStage = 5;
      stage2Status = 'COMPLETED';
      stage3Status = 'COMPLETED';
      stage4Status = 'COMPLETED';
      stage5Status = 'REJECTED';
    } else if (appStatus === 'BENEFIT_DISBURSED') {
      currentStage = 6;
      stage2Status = 'COMPLETED';
      stage3Status = 'COMPLETED';
      stage4Status = 'COMPLETED';
      stage5Status = 'COMPLETED';
      stage6Status = 'COMPLETED';
    }

    const stages = [
      {
        stageNumber: 1,
        title: 'Application Received & Ingested',
        status: stage1Status,
        date: application.applicationDate || application.createdAt,
        description: `Application ingested via external submission gateway with ref ${application.sourceSystemReference || application.applicationId}.`
      },
      {
        stageNumber: 2,
        title: 'Individual & Household Verification',
        status: stage2Status,
        description: stage2Status === 'ACTION_REQUIRED'
          ? 'Additional verification evidence requested by review officer.'
          : 'Demographic and NFSA family roster checks against government records.'
      },
      {
        stageNumber: 3,
        title: 'Statutory Eligibility Evaluation',
        status: stage3Status,
        description: assessment
          ? `Evaluated against versioned criteria (${assessment.ruleVersion || 'RULE_SET_v2.4_2026'}). Result: ${assessment.overallResult}.`
          : 'Deterministic evaluation of age, income ceiling, and scheme criteria.'
      },
      {
        stageNumber: 4,
        title: 'De-Duplication & Prior Benefits Check',
        status: stage4Status,
        description: 'Cross-checking across individual, household, and property records to prevent duplicate allocations.'
      },
      {
        stageNumber: 5,
        title: 'Departmental Sanction Decision',
        status: stage5Status,
        date: application.decisionDate,
        description: appStatus === 'APPROVED'
          ? 'Sanction approved by competent scheme authority.'
          : appStatus === 'REJECTED'
          ? `Application not approved: ${application.decisionReason || 'Statutory criteria not met'}.`
          : 'Pending final review and decision by authorised scheme officer.'
      },
      {
        stageNumber: 6,
        title: 'DBT Fund Disbursement',
        status: stage6Status,
        date: disbursement?.disbursedAt,
        description: disbursement
          ? `Disbursed ₹${Number(disbursement.disbursedAmount).toLocaleString('en-IN')} via DBT to bank account (Ref: ${disbursement.transactionReference}).`
          : appStatus === 'APPROVED'
          ? 'Sanction approved. Electronic payment file queued for state treasury DBT dispatch.'
          : 'Pending sanction approval before fund release.'
      }
    ];

    res.json({
      success: true,
      data: {
        applicationId: application.applicationId,
        sourceSystemReference: application.sourceSystemReference,
        schemeName: application.scheme?.name,
        schemeCode: application.scheme?.code,
        benefitScope: application.scheme?.benefitScope,
        applicantName: application.applicantIndividual?.fullName,
        applicantDemoId: application.applicantIndividual?.demoIdentifier,
        householdId: application.household?.householdId,
        requestedAmount: application.requestedAmount,
        applicationDate: application.applicationDate || application.createdAt,
        currentStatus: application.status,
        currentStage,
        decisionDate: application.decisionDate,
        decisionReason: application.decisionReason,
        disbursement: disbursement || null,
        stages,
        statusHistory: statusHistory.map((h) => ({
          from: h.previousStatus,
          to: h.newStatus,
          timestamp: h.changedAt,
          note: h.changeReason
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApplications,
  getApplicationById,
  submitApplication,
  evaluateApplicationRules,
  updateApplicationStatus,
  reviewApplicationAction,
  disburseApplicationBenefit,
  getVerificationDetails,
  getApplicationAssessmentReport,
  trackApplicationStage
};
