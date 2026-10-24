const Individual = require('../models/Individual');
const HouseholdMembership = require('../models/HouseholdMembership');
const FamilyRelationship = require('../models/FamilyRelationship');
const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const Household = require('../models/Household');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const DocumentMetadata = require('../models/DocumentMetadata');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../services/auditService');
const { getPotentialBenefitsForIndividual } = require('../services/individualEligibilityService');
const { getPotentialBenefitsForHousehold } = require('../services/householdEligibilityService');

const getIndividuals = async (req, res, next) => {
  try {
    const { search, incomeCategory, verificationStatus, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { individualId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (incomeCategory && incomeCategory !== 'ALL') {
      query.incomeCategory = incomeCategory;
    }

    if (verificationStatus && verificationStatus !== 'ALL') {
      query.verificationStatus = verificationStatus;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, individuals] = await Promise.all([
      Individual.countDocuments(query),
      Individual.find(query)
        .populate('currentHousehold', 'householdId addressLine1 district state')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: individuals,
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

const getIndividualById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const individual = await Individual.findById(id).populate('currentHousehold');
    if (!individual) {
      return res.status(404).json({
        success: false,
        message: 'Citizen record not found.'
      });
    }

    // Fetch related records concurrently
    const [membershipHistory, familyRelationships, benefitHistory, applications, documents, auditLogs] = await Promise.all([
      HouseholdMembership.find({ individual: id })
        .populate('household', 'householdId addressLine1 district state')
        .populate('updatedBy', 'name role')
        .sort({ startDate: -1 }),
      FamilyRelationship.find({
        $or: [{ individualA: id }, { individualB: id }]
      }).populate('individualA individualB', 'fullName individualId incomeCategory'),
      BenefitRecord.find({ recipientIndividual: id })
        .populate('scheme', 'name code benefitScope')
        .sort({ sanctionDate: -1 }),
      Application.find({ applicantIndividual: id })
        .populate('scheme', 'name code benefitScope')
        .sort({ applicationDate: -1 }),
      DocumentMetadata.find({
        linkedEntityType: 'INDIVIDUAL',
        linkedEntityId: individual.individualId
      }),
      AuditLog.find({
        entityType: 'Individual',
        entityId: String(individual._id)
      }).sort({ timestamp: -1 })
    ]);

    // Format family relationships cleanly
    const formattedFamily = familyRelationships.map((rel) => {
      const isA = String(rel.individualA._id) === String(id);
      const relative = isA ? rel.individualB : rel.individualA;
      return {
        _id: rel._id,
        relationshipType: rel.relationshipType,
        isVerified: rel.isVerified,
        notes: rel.notes,
        relative: {
          id: relative?._id,
          individualId: relative?.individualId,
          fullName: relative?.fullName,
          incomeCategory: relative?.incomeCategory
        }
      };
    });

    res.json({
      success: true,
      data: {
        individual,
        membershipHistory,
        familyRelationships: formattedFamily,
        benefitHistory,
        applications,
        documents,
        auditLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

const createIndividual = async (req, res, next) => {
  try {
    const {
      fullName,
      gender,
      dateOfBirth,
      incomeCategory = 'BPL',
      annualIncome = 0,
      phone,
      email,
      notes
    } = req.body;

    if (!fullName || !gender || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Full name, gender, and date of birth are required.'
      });
    }

    const count = await Individual.countDocuments();
    const individualId = `IND-${String(count + 101).padStart(4, '0')}`;

    const individual = new Individual({
      individualId,
      fullName,
      gender,
      dateOfBirth,
      incomeCategory,
      annualIncome,
      phone,
      email,
      notes,
      verificationStatus: 'VERIFIED'
    });

    await individual.save();

    await logAudit({
      actingUser: req.user,
      action: 'INDIVIDUAL_CREATE',
      entityType: 'Individual',
      entityId: individual._id,
      afterSnapshot: individual.toObject(),
      reasonNotes: req.body.reason || 'New citizen registry creation',
      req
    });

    res.status(201).json({
      success: true,
      message: `Citizen profile ${individual.individualId} created successfully.`,
      data: individual
    });
  } catch (error) {
    next(error);
  }
};

const updateIndividual = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, ...updates } = req.body;

    const existing = await Individual.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Individual not found.'
      });
    }

    const beforeSnapshot = existing.toObject();

    Object.assign(existing, updates);
    await existing.save();

    await logAudit({
      actingUser: req.user,
      action: 'INDIVIDUAL_UPDATE',
      entityType: 'Individual',
      entityId: existing._id,
      beforeSnapshot,
      afterSnapshot: existing.toObject(),
      reasonNotes: reason || 'Authorized record correction',
      req
    });

    res.json({
      success: true,
      message: `Individual record ${existing.individualId} updated.`,
      data: existing
    });
  } catch (error) {
    next(error);
  }
};

const getPotentialBenefits = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await getPotentialBenefitsForIndividual(id);
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Demo Identifier Lookup Service for Authorized Officers
 * GET /api/individuals/lookup/:demoId
 */
const lookupByDemoIdentifier = async (req, res, next) => {
  try {
    const searchVal = req.params.demoId ? req.params.demoId.trim() : '';
    if (!searchVal) {
      return res.status(400).json({
        success: false,
        message: 'A valid demonstration identifier is required for search.'
      });
    }

    // Locate individual by demoIdentifier, individualId, or aadhaarRef
    const individual = await Individual.findOne({
      $or: [
        { demoIdentifier: { $regex: new RegExp(`^${searchVal}$`, 'i') } },
        { individualId: { $regex: new RegExp(`^${searchVal}$`, 'i') } },
        { aadhaarRef: { $regex: new RegExp(`^${searchVal}$`, 'i') } }
      ]
    }).populate('currentHousehold');

    if (!individual) {
      return res.status(404).json({
        success: false,
        message: 'No matching record was found in the JanSetu demonstration database.'
      });
    }

    // Audit log this lookup
    await logAudit({
      actingUser: req.user,
      action: 'DEMO_IDENTIFIER_LOOKUP',
      entityType: 'Individual',
      entityId: individual._id,
      reasonNotes: `Authorized verification lookup performed for demo identifier ${searchVal}`,
      req
    });

    // 1. Locate Verified Household Association
    const membership = await HouseholdMembership.findOne({
      individual: individual._id,
      isCurrent: true
    }).populate({
      path: 'household',
      populate: { path: 'headOfHousehold propertyAssociation' }
    });

    let household = membership?.household || individual.currentHousehold;
    let householdMembers = [];
    let householdSchemesReport = null;
    let householdBenefits = [];
    let householdApplications = [];
    let timeline = [];
    let competingAllocations = [];

    if (household) {
      // Find current members of this verified household
      const memberRecords = await HouseholdMembership.find({
        household: household._id,
        isCurrent: true
      }).populate('individual');

      householdMembers = await Promise.all(
        memberRecords.map(async (m) => {
          const ind = m.individual;
          if (!ind) return null;
          const [appCount, benCount] = await Promise.all([
            Application.countDocuments({ applicantIndividual: ind._id }),
            BenefitRecord.countDocuments({ recipientIndividual: ind._id })
          ]);
          return {
            _id: ind._id,
            individualId: ind.individualId,
            demoIdentifier: ind.demoIdentifier,
            fullName: ind.fullName,
            relationshipToHead: m.relationshipToHead,
            gender: ind.gender,
            age: ind.dateOfBirth
              ? new Date().getFullYear() - new Date(ind.dateOfBirth).getFullYear()
              : 35,
            membershipStatus: m.isCurrent ? 'ACTIVE' : 'HISTORICAL',
            verificationStatus: ind.verificationStatus,
            verificationSource: m.verificationSource || 'CIVIL_SUPPLIES_RATION_REGISTER',
            annualIncome: ind.annualIncome,
            incomeCategory: ind.incomeCategory,
            employmentStatus: ind.employmentStatus,
            applicationCount: appCount,
            benefitCount: benCount
          };
        })
      );
      householdMembers = householdMembers.filter(Boolean);

      // Fetch household applications, benefits, and evaluations
      const [hhApps, hhBens, hhPotential, allocations] = await Promise.all([
        Application.find({ household: household._id })
          .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
          .populate('applicantIndividual', 'fullName individualId demoIdentifier')
          .sort({ applicationDate: -1 }),
        BenefitRecord.find({ recipientHousehold: household._id })
          .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
          .sort({ sanctionDate: -1 }),
        getPotentialBenefitsForHousehold(household._id),
        HouseholdAllocation.find({ household: household._id })
          .populate('scheme', 'name code benefitScope')
          .populate('recommendedApplication')
          .populate('recommendedApplicant', 'fullName individualId demoIdentifier')
      ]);

      householdApplications = hhApps;
      householdBenefits = hhBens;
      householdSchemesReport = hhPotential;
      competingAllocations = allocations;

      // Construct Household Timeline
      hhApps.forEach((app) => {
        timeline.push({
          eventId: `APP-${app._id}`,
          type: 'APPLICATION_SUBMITTED',
          title: `Application for ${app.scheme?.name || 'Scheme'}`,
          description: `Submitted by ${app.applicantIndividual?.fullName || 'Household Member'} (${app.applicantIndividual?.demoIdentifier || ''})`,
          date: app.applicationDate || app.createdAt,
          schemeName: app.scheme?.name,
          schemeCode: app.scheme?.code,
          status: app.status,
          reference: app.applicationId
        });
      });

      hhBens.forEach((ben) => {
        if (ben.sanctionDate) {
          timeline.push({
            eventId: `SANC-${ben._id}`,
            type: 'BENEFIT_SANCTIONED',
            title: `Sanction Order Approved: ${ben.scheme?.name || 'Scheme'}`,
            description: `₹${(ben.benefitAmount || 0).toLocaleString('en-IN')} sanctioned under reference ${ben.recordId || ben.referenceNumber}`,
            date: ben.sanctionDate,
            schemeName: ben.scheme?.name,
            schemeCode: ben.scheme?.code,
            status: 'SANCTIONED',
            reference: ben.recordId || ben.referenceNumber
          });
        }
        if (ben.disbursementDate && ben.status === 'DISBURSED') {
          timeline.push({
            eventId: `DISB-${ben._id}`,
            type: 'BENEFIT_DISBURSED',
            title: `Direct Benefit Transfer (DBT): ${ben.scheme?.name || 'Scheme'}`,
            description: `Disbursement of ₹${(ben.benefitAmount || 0).toLocaleString('en-IN')} completed via PFMS voucher ${ben.referenceNumber || 'PFMS-DBT'}`,
            date: ben.disbursementDate,
            schemeName: ben.scheme?.name,
            schemeCode: ben.scheme?.code,
            status: 'DISBURSED',
            reference: ben.referenceNumber
          });
        }
      });

      allocations.forEach((al) => {
        timeline.push({
          eventId: `ALLOC-${al._id}`,
          type: 'ALLOCATION_EVALUATION',
          title: `Fair Allocation Evaluated: ${al.scheme?.name || 'Household Scheme'}`,
          description: `Engine recommendation: ${al.engineRecommendation}. ${al.isManualOverride ? 'Manual Officer Override logged.' : ''}`,
          date: al.reviewedAt || al.updatedAt || al.createdAt,
          schemeName: al.scheme?.name,
          schemeCode: al.scheme?.code,
          status: al.status,
          reference: al.allocationReference
        });
      });

      timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // 2. Retrieve Individual Scheme Records & Potential Eligibility
    const [indApps, indBens, indPotential] = await Promise.all([
      Application.find({ applicantIndividual: individual._id })
        .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
        .sort({ applicationDate: -1 }),
      BenefitRecord.find({ recipientIndividual: individual._id })
        .populate('scheme', 'name code benefitScope maxBenefitAmount repeatBenefitPolicy')
        .sort({ sanctionDate: -1 }),
      getPotentialBenefitsForIndividual(individual._id)
    ]);

    // Format individual schemes mapping
    const individualSchemesList = indPotential.individualBenefits.map((item) => {
      const sch = item.scheme;
      const app = indApps.find((a) => String(a.scheme?._id) === String(sch._id));
      const ben = indBens.find((b) => String(b.scheme?._id) === String(sch._id));

      return {
        scheme: sch,
        application: app || null,
        applicationStatus: app ? app.status : 'NOT_APPLIED',
        applicationDate: app ? app.applicationDate : null,
        eligibilityResult: item.evaluation.overallResult,
        eligibilityPercentage: item.evaluation.eligibilityPercentage || 100,
        explanation: item.evaluation.explanation,
        requiredCorrections: item.evaluation.requiredCorrections || [],
        missingDocuments: item.evaluation.missingDocuments || [],
        benefitStatus: ben ? ben.status : 'NO_RECORDED_BENEFIT',
        approvalStatus: ben ? 'APPROVED' : (app?.status === 'APPROVED' ? 'APPROVED' : (app ? app.status : 'NOT_APPLIED')),
        disbursementStatus: ben ? ben.status : 'NOT_DISBURSED',
        recordedBenefitAmount: ben ? ben.benefitAmount : (app ? app.requestedAmount : sch.benefitAmount || sch.maxBenefitAmount),
        benefitPeriod: sch.benefitPeriod || 'FY 2025-2026'
      };
    });

    // Format household schemes mapping
    let householdSchemesList = [];
    if (household) {
      const allHouseholdSchemes = await Scheme.find({ benefitScope: 'HOUSEHOLD', isActive: true });
      householdSchemesList = allHouseholdSchemes.map((sch) => {
        const apps = householdApplications.filter((a) => String(a.scheme?._id) === String(sch._id));
        const ben = householdBenefits.find((b) => String(b.scheme?._id) === String(sch._id));
        const pot = householdSchemesReport?.evaluations?.find(
          (p) => String(p.schemeId) === String(sch.schemeId || sch.code)
        );
        const alloc = competingAllocations.find((al) => String(al.scheme?._id) === String(sch._id));

        return {
          scheme: sch,
          householdId: household.householdId,
          householdEligibilityStatus: pot ? pot.overallResult : 'POTENTIALLY_ELIGIBLE',
          eligibilityPercentage: pot ? pot.eligibilityPercentage || 100 : 100,
          explanation: pot ? pot.explanation : '',
          requiredCorrections: pot ? pot.requiredCorrections || [] : [],
          missingDocuments: pot ? pot.missingDocuments || [] : [],
          applicationsCount: apps.length,
          submittedByMember: apps.length > 0 ? apps.map((a) => a.applicantIndividual?.fullName).join(', ') : 'None',
          previousBenefit: ben ? ben.status : 'No confirmed record',
          applicableHouseholdLimit: `Max ${sch.maxLifetimeAllocationsPerScope || 1} per verified household`,
          approvalStatus: ben ? 'APPROVED' : (apps.some((a) => a.status === 'APPROVED') ? 'APPROVED' : (apps.length > 0 ? apps[0].status : 'NOT_APPLIED')),
          disbursementStatus: ben ? ben.status : 'Not disbursed',
          benefitPeriod: sch.benefitPeriod || 'FY 2025-2026',
          allocationCase: alloc || null
        };
      });
    }

    res.json({
      success: true,
      data: {
        individual: {
          _id: individual._id,
          individualId: individual.individualId,
          demoIdentifier: individual.demoIdentifier,
          fullName: individual.fullName,
          fatherName: individual.fatherName,
          gender: individual.gender,
          dateOfBirth: individual.dateOfBirth,
          age: individual.dateOfBirth
            ? new Date().getFullYear() - new Date(individual.dateOfBirth).getFullYear()
            : 35,
          incomeCategory: individual.incomeCategory,
          annualIncome: individual.annualIncome,
          employmentStatus: individual.employmentStatus,
          educationStatus: individual.educationStatus,
          hasDisability: individual.hasDisability,
          isVulnerable: individual.isVulnerable,
          state: individual.state,
          district: individual.district,
          verificationStatus: individual.verificationStatus,
          isSyntheticDemo: true
        },
        household: household
          ? {
              _id: household._id,
              householdId: household.householdId,
              householdReference: household.householdReference,
              addressLine1: household.addressLine1,
              district: household.district,
              state: household.state,
              pincode: household.pincode,
              rationCardNumber: household.rationCardNumber,
              annualHouseholdIncome: household.annualHouseholdIncome,
              householdSize: householdMembers.length || household.householdSize,
              verificationStatus: household.verificationStatus,
              isSyntheticDemo: true
            }
          : null,
        householdMembers,
        individualSchemes: individualSchemesList,
        householdSchemes: householdSchemesList,
        benefitHistory: {
          individual: indBens,
          household: householdBenefits
        },
        timeline,
        competingAllocations
      }
    });
  } catch (error) {
    next(error);
  }
};

const getIndividualHousehold = async (req, res, next) => {
  try {
    const { id } = req.params;
    const membership = await HouseholdMembership.findOne({ individual: id, isCurrent: true })
      .populate({
        path: 'household',
        populate: { path: 'headOfHousehold propertyAssociation' }
      });

    if (!membership || !membership.household) {
      return res.json({
        success: true,
        data: null,
        message: 'No active verified household association recorded for this individual.'
      });
    }

    res.json({
      success: true,
      data: {
        household: membership.household,
        membership: {
          relationshipToHead: membership.relationshipToHead,
          startDate: membership.startDate,
          isCurrent: membership.isCurrent,
          verificationStatus: membership.verificationStatus || 'VERIFIED',
          verificationSource: membership.verificationSource || 'CIVIL_SUPPLIES_RATION_REGISTER'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getIndividualSchemes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const individual = await Individual.findById(id);
    if (!individual) {
      return res.status(404).json({ success: false, message: 'Individual not found' });
    }

    const [applications, benefitRecords, potentialReport] = await Promise.all([
      Application.find({ applicantIndividual: id }).populate('scheme'),
      BenefitRecord.find({ recipientIndividual: id }).populate('scheme'),
      getPotentialBenefitsForIndividual(id)
    ]);

    const allSchemes = await Scheme.find({ benefitScope: 'INDIVIDUAL', isActive: true });
    const mapped = allSchemes.map((sch) => {
      const app = applications.find((a) => String(a.scheme?._id) === String(sch._id));
      const ben = benefitRecords.find((b) => String(b.scheme?._id) === String(sch._id));
      const pot = potentialReport?.individualBenefits?.find((p) => String(p.scheme?._id) === String(sch._id));

      return {
        scheme: sch,
        application: app || null,
        applicationStatus: app ? app.status : 'NOT_APPLIED',
        applicationDate: app ? app.applicationDate : null,
        eligibilityResult: pot ? pot.evaluation?.overallResult : 'POTENTIALLY_ELIGIBLE',
        eligibilityPercentage: pot ? pot.evaluation?.eligibilityPercentage || 100 : 100,
        explanation: pot ? pot.evaluation?.explanation : '',
        requiredCorrections: pot ? pot.evaluation?.requiredCorrections || [] : [],
        missingDocuments: pot ? pot.evaluation?.missingDocuments || [] : [],
        benefitStatus: ben ? ben.status : 'NO_RECORDED_BENEFIT',
        approvalStatus: ben ? 'APPROVED' : (app?.status === 'APPROVED' ? 'APPROVED' : (app ? app.status : 'NOT_APPLIED')),
        disbursementStatus: ben ? ben.status : 'NOT_DISBURSED',
        recordedBenefitAmount: ben ? ben.benefitAmount : (app ? app.requestedAmount : sch.benefitAmount || sch.maxBenefitAmount),
        benefitPeriod: sch.benefitPeriod || 'FY 2025-2026'
      };
    });

    res.json({
      success: true,
      data: mapped
    });
  } catch (error) {
    next(error);
  }
};

const getIndividualBenefitHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const records = await BenefitRecord.find({ recipientIndividual: id })
      .populate('scheme')
      .populate('application')
      .sort({ sanctionDate: -1 });

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIndividuals,
  getIndividualById,
  createIndividual,
  updateIndividual,
  getPotentialBenefits,
  lookupByDemoIdentifier,
  getIndividualHousehold,
  getIndividualSchemes,
  getIndividualBenefitHistory
};
