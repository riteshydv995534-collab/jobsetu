const Household = require('../models/Household');
const Individual = require('../models/Individual');
const HouseholdMembership = require('../models/HouseholdMembership');
const PropertyAssociation = require('../models/PropertyAssociation');
const BenefitRecord = require('../models/BenefitRecord');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const HouseholdAllocation = require('../models/HouseholdAllocation');
const { logAudit } = require('../services/auditService');
const { getPotentialBenefitsForHousehold } = require('../services/householdEligibilityService');

const getHouseholds = async (req, res, next) => {
  try {
    const { search, district, page = 1, limit = 10 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { householdId: { $regex: search, $options: 'i' } },
        { addressLine1: { $regex: search, $options: 'i' } },
        { rationCardNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (district && district !== 'ALL') {
      query.district = district;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, households] = await Promise.all([
      Household.countDocuments(query),
      Household.find(query)
        .populate('headOfHousehold', 'fullName individualId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    // For each household, count current active members
    const householdIds = households.map((h) => h._id);
    const memberCounts = await HouseholdMembership.aggregate([
      { $match: { household: { $in: householdIds }, isCurrent: true } },
      { $group: { _id: '$household', memberCount: { $sum: 1 } } }
    ]);

    const countMap = {};
    memberCounts.forEach((m) => {
      countMap[String(m._id)] = m.memberCount;
    });

    const enriched = households.map((h) => ({
      ...h.toObject(),
      memberCount: countMap[String(h._id)] || 0
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

const getHouseholdById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const household = await Household.findById(id).populate('headOfHousehold');
    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'Household record not found.'
      });
    }

    const [memberships, properties, benefits] = await Promise.all([
      HouseholdMembership.find({ household: id })
        .populate('individual', 'fullName individualId dateOfBirth gender incomeCategory verificationStatus')
        .populate('updatedBy', 'name role')
        .sort({ isCurrent: -1, startDate: -1 }),
      PropertyAssociation.find({ household: id, isCurrent: true })
        .populate('property', 'propertyId addressLine1 propertyType verificationStatus totalSanctionedBenefits'),
      BenefitRecord.find({ recipientHousehold: id })
        .populate('scheme', 'name code benefitScope maxBenefitAmount')
        .sort({ sanctionDate: -1 })
    ]);

    const currentMembers = memberships.filter((m) => m.isCurrent);
    const historicalMembers = memberships.filter((m) => !m.isCurrent);

    res.json({
      success: true,
      data: {
        household,
        currentMembers,
        historicalMembers,
        linkedProperties: properties,
        benefitHistory: benefits
      }
    });
  } catch (error) {
    next(error);
  }
};

const createHousehold = async (req, res, next) => {
  try {
    const { addressLine1, addressLine2, villageWard, district, state, pincode, rationCardNumber, notes } = req.body;

    if (!addressLine1 || !district) {
      return res.status(400).json({
        success: false,
        message: 'Address and District are required.'
      });
    }

    const count = await Household.countDocuments();
    const householdId = `HH-${String(count + 101).padStart(4, '0')}`;

    const household = new Household({
      householdId,
      addressLine1,
      addressLine2,
      villageWard,
      district,
      state: state || 'Rajasthan',
      pincode: pincode || '302001',
      rationCardNumber: rationCardNumber || `RC-RJ-${Date.now().toString().slice(-6)}`,
      notes,
      verificationStatus: 'VERIFIED'
    });

    await household.save();

    await logAudit({
      actingUser: req.user,
      action: 'HOUSEHOLD_CREATE',
      entityType: 'Household',
      entityId: household._id,
      afterSnapshot: household.toObject(),
      reasonNotes: req.body.reason || 'New household registration',
      req
    });

    res.status(201).json({
      success: true,
      message: `Household ${household.householdId} registered successfully.`,
      data: household
    });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { id } = req.params; // householdId
    const { individualId, relationshipToHead, eventType = 'INITIAL_REGISTRATION', reason = 'Family roster addition' } = req.body;

    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found.' });
    }

    const individual = await Individual.findById(individualId);
    if (!individual) {
      return res.status(404).json({ success: false, message: 'Individual citizen not found.' });
    }

    // Deactivate any existing active membership for this individual to prevent conflicting active residences
    await HouseholdMembership.updateMany(
      { individual: individual._id, isCurrent: true },
      {
        $set: {
          isCurrent: false,
          endDate: new Date(),
          reasonForChange: `Relocated to household ${household.householdId}`
        }
      }
    );

    const membership = new HouseholdMembership({
      individual: individual._id,
      household: household._id,
      relationshipToHead: relationshipToHead || 'OTHER',
      startDate: new Date(),
      isCurrent: true,
      eventType,
      reasonForChange: reason,
      updatedBy: req.user._id
    });

    await membership.save();

    individual.currentHousehold = household._id;
    if (relationshipToHead === 'HEAD' || !household.headOfHousehold) {
      household.headOfHousehold = individual._id;
      individual.isHeadOfHousehold = true;
      await household.save();
    }
    await individual.save();

    await logAudit({
      actingUser: req.user,
      action: 'HOUSEHOLD_MEMBER_ADD',
      entityType: 'Household',
      entityId: household._id,
      afterSnapshot: { member: individual.fullName, relationship: relationshipToHead },
      reasonNotes: reason,
      req
    });

    res.json({
      success: true,
      message: `${individual.fullName} added to household ${household.householdId}.`,
      data: membership
    });
  } catch (error) {
    next(error);
  }
};

const moveMember = async (req, res, next) => {
  try {
    const { individualId, fromHouseholdId, toHouseholdId, reason, relationshipToHead } = req.body;

    if (!individualId || !toHouseholdId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Individual, target household, and reason are required.'
      });
    }

    const targetHousehold = await Household.findById(toHouseholdId);
    if (!targetHousehold) {
      return res.status(404).json({ success: false, message: 'Target household not found.' });
    }

    const individual = await Individual.findById(individualId);
    if (!individual) {
      return res.status(404).json({ success: false, message: 'Individual not found.' });
    }

    // Close past membership with timestamp and reason
    await HouseholdMembership.updateMany(
      { individual: individual._id, isCurrent: true },
      {
        $set: {
          isCurrent: false,
          endDate: new Date(),
          reasonForChange: `Moved to ${targetHousehold.householdId}: ${reason}`,
          updatedBy: req.user._id
        }
      }
    );

    // Create new membership record
    const newMembership = new HouseholdMembership({
      individual: individual._id,
      household: targetHousehold._id,
      relationshipToHead: relationshipToHead || 'OTHER',
      startDate: new Date(),
      isCurrent: true,
      eventType: 'RELOCATION',
      reasonForChange: reason,
      updatedBy: req.user._id
    });
    await newMembership.save();

    individual.currentHousehold = targetHousehold._id;
    await individual.save();

    await logAudit({
      actingUser: req.user,
      action: 'HOUSEHOLD_MEMBER_MOVE',
      entityType: 'HouseholdMembership',
      entityId: newMembership._id,
      reasonNotes: reason,
      afterSnapshot: {
        individual: individual.fullName,
        fromHousehold: fromHouseholdId,
        toHousehold: targetHousehold.householdId
      },
      req
    });

    res.json({
      success: true,
      message: `Member ${individual.fullName} successfully moved to ${targetHousehold.householdId}. Historical record preserved.`,
      data: newMembership
    });
  } catch (error) {
    next(error);
  }
};

const splitHousehold = async (req, res, next) => {
  try {
    const { originalHouseholdId, movingMemberIds, newAddressLine1, newDistrict, reason } = req.body;

    if (!originalHouseholdId || !movingMemberIds || !movingMemberIds.length || !newAddressLine1 || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Original household, moving members, new address, and justification reason are required.'
      });
    }

    const originalHousehold = await Household.findById(originalHouseholdId);
    if (!originalHousehold) {
      return res.status(404).json({ success: false, message: 'Original household not found.' });
    }

    const count = await Household.countDocuments();
    const newHouseholdId = `HH-${String(count + 101).padStart(4, '0')}`;

    const newHousehold = new Household({
      householdId: newHouseholdId,
      addressLine1: newAddressLine1,
      district: newDistrict || originalHousehold.district,
      state: originalHousehold.state,
      pincode: originalHousehold.pincode,
      rationCardNumber: `RC-SPLIT-${Date.now().toString().slice(-6)}`,
      notes: `Split from ${originalHousehold.householdId} on ${new Date().toLocaleDateString()}. Reason: ${reason}`
    });
    await newHousehold.save();

    // Migrate moving members
    for (const memberId of movingMemberIds) {
      await HouseholdMembership.updateMany(
        { individual: memberId, household: originalHousehold._id, isCurrent: true },
        {
          $set: {
            isCurrent: false,
            endDate: new Date(),
            reasonForChange: `Split off into new household ${newHousehold.householdId}: ${reason}`,
            updatedBy: req.user._id
          }
        }
      );

      const newMembership = new HouseholdMembership({
        individual: memberId,
        household: newHousehold._id,
        relationshipToHead: 'OTHER',
        startDate: new Date(),
        isCurrent: true,
        eventType: 'HOUSEHOLD_SPLIT',
        reasonForChange: `Separated into independent household: ${reason}`,
        updatedBy: req.user._id
      });
      await newMembership.save();

      await Individual.findByIdAndUpdate(memberId, { currentHousehold: newHousehold._id });
    }

    // Set first migrating member as head of new household
    if (movingMemberIds.length > 0) {
      newHousehold.headOfHousehold = movingMemberIds[0];
      await newHousehold.save();
    }

    await logAudit({
      actingUser: req.user,
      action: 'HOUSEHOLD_SPLIT',
      entityType: 'Household',
      entityId: newHousehold._id,
      reasonNotes: reason,
      afterSnapshot: {
        originalHouseholdId: originalHousehold.householdId,
        newHouseholdId: newHousehold.householdId,
        migratedCount: movingMemberIds.length
      },
      req
    });

    res.status(201).json({
      success: true,
      message: `Household successfully split. New household ${newHousehold.householdId} registered with ${movingMemberIds.length} members.`,
      data: newHousehold
    });
  } catch (error) {
    next(error);
  }
};

const getPotentialBenefits = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await getPotentialBenefitsForHousehold(id);
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

const getHouseholdMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }

    const memberships = await HouseholdMembership.find({ household: id, isCurrent: true })
      .populate('individual')
      .sort({ createdAt: 1 });

    const membersWithCounts = await Promise.all(
      memberships.map(async (m) => {
        const ind = m.individual;
        if (!ind) return null;
        const [applicationCount, benefitCount] = await Promise.all([
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
          applicationCount,
          benefitCount
        };
      })
    );

    res.json({
      success: true,
      data: membersWithCounts.filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
};

const getHouseholdSchemes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ success: false, message: 'Household not found' });
    }

    const [applications, benefits, potentialReport, allocations] = await Promise.all([
      Application.find({ household: id })
        .populate('scheme')
        .populate('applicantIndividual', 'fullName individualId demoIdentifier'),
      BenefitRecord.find({ recipientHousehold: id }).populate('scheme'),
      getPotentialBenefitsForHousehold(id),
      HouseholdAllocation.find({ household: id })
    ]);

    const householdSchemes = await Scheme.find({ benefitScope: 'HOUSEHOLD', isActive: true });
    const mapped = householdSchemes.map((sch) => {
      const schemeApps = applications.filter((a) => String(a.scheme?._id) === String(sch._id));
      const schemeBen = benefits.find((b) => String(b.scheme?._id) === String(sch._id));
      const pot = potentialReport?.evaluations?.find(
        (p) => String(p.schemeId) === String(sch.schemeId || sch.code)
      );
      const alloc = allocations.find((al) => String(al.scheme) === String(sch._id));

      return {
        scheme: sch,
        householdId: household.householdId,
        householdEligibilityStatus: pot ? pot.overallResult : 'POTENTIALLY_ELIGIBLE',
        eligibilityPercentage: pot ? pot.eligibilityPercentage || 100 : 100,
        explanation: pot ? pot.explanation : '',
        requiredCorrections: pot ? pot.requiredCorrections || [] : [],
        missingDocuments: pot ? pot.missingDocuments || [] : [],
        competingApplicationsCount: schemeApps.length,
        applications: schemeApps.map((a) => ({
          applicationId: a.applicationId,
          applicantName: a.applicantIndividual?.fullName,
          applicantId: a.applicantIndividual?.individualId,
          demoIdentifier: a.applicantIndividual?.demoIdentifier,
          applicationDate: a.applicationDate,
          status: a.status
        })),
        submittedByMember:
          schemeApps.length > 0
            ? schemeApps.map((a) => a.applicantIndividual?.fullName).join(', ')
            : 'None',
        previousBenefit: schemeBen ? schemeBen.status : 'No confirmed record',
        applicableHouseholdLimit: `Max ${sch.maxLifetimeAllocationsPerScope || 1} per verified household`,
        approvalStatus: schemeBen
          ? 'APPROVED'
          : schemeApps.some((a) => a.status === 'APPROVED')
          ? 'APPROVED'
          : schemeApps.length > 0
          ? schemeApps[0].status
          : 'NOT_APPLIED',
        disbursementStatus: schemeBen ? schemeBen.status : 'Not disbursed',
        benefitPeriod: sch.benefitPeriod || 'FY 2025-2026',
        allocationCase: alloc || null
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

const getHouseholdBenefitHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const records = await BenefitRecord.find({ recipientHousehold: id })
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

const getHouseholdBenefitTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schemeId, status } = req.query;

    const [applications, benefits, allocations] = await Promise.all([
      Application.find({ household: id })
        .populate('scheme')
        .populate('applicantIndividual', 'fullName individualId demoIdentifier'),
      BenefitRecord.find({ recipientHousehold: id }).populate('scheme'),
      HouseholdAllocation.find({ household: id }).populate('scheme')
    ]);

    let timeline = [];

    // Applications
    applications.forEach((app) => {
      timeline.push({
        eventId: `APP-${app._id}`,
        type: 'APPLICATION_SUBMITTED',
        title: `Application for ${app.scheme?.name || 'Scheme'}`,
        description: `Submitted by ${app.applicantIndividual?.fullName || 'Household Member'} (${app.applicantIndividual?.demoIdentifier || ''})`,
        date: app.applicationDate || app.createdAt,
        schemeId: app.scheme?._id,
        schemeName: app.scheme?.name,
        schemeCode: app.scheme?.code,
        status: app.status,
        reference: app.applicationId
      });
    });

    // Benefits (Sanctions & Disbursements)
    benefits.forEach((ben) => {
      if (ben.sanctionDate) {
        timeline.push({
          eventId: `SANC-${ben._id}`,
          type: 'BENEFIT_SANCTIONED',
          title: `Sanction Order: ${ben.scheme?.name || 'Scheme'}`,
          description: `₹${(ben.benefitAmount || 0).toLocaleString('en-IN')} approved under Sanction Order ${ben.recordId || ben.referenceNumber}`,
          date: ben.sanctionDate,
          schemeId: ben.scheme?._id,
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
          title: `DBT Disbursed: ${ben.scheme?.name || 'Scheme'}`,
          description: `Direct Benefit Transfer of ₹${(ben.benefitAmount || 0).toLocaleString('en-IN')} disbursed via PFMS voucher ${ben.referenceNumber || 'PFMS-DBT'}`,
          date: ben.disbursementDate,
          schemeId: ben.scheme?._id,
          schemeName: ben.scheme?.name,
          schemeCode: ben.scheme?.code,
          status: 'DISBURSED',
          reference: ben.referenceNumber
        });
      }
    });

    // Allocations
    allocations.forEach((al) => {
      timeline.push({
        eventId: `ALLOC-${al._id}`,
        type: 'ALLOCATION_EVALUATION',
        title: `Fair Allocation Evaluated: ${al.scheme?.name || 'Household Scheme'}`,
        description: `Engine recommendation: ${al.engineRecommendation}. ${al.isManualOverride ? 'Manual Officer Override logged.' : ''}`,
        date: al.reviewedAt || al.updatedAt || al.createdAt,
        schemeId: al.scheme?._id,
        schemeName: al.scheme?.name,
        schemeCode: al.scheme?.code,
        status: al.status,
        reference: al.allocationReference
      });
    });

    // Filter
    if (schemeId && schemeId !== 'ALL') {
      timeline = timeline.filter(
        (item) => String(item.schemeId) === String(schemeId) || item.schemeCode === schemeId
      );
    }
    if (status && status !== 'ALL') {
      timeline = timeline.filter((item) => item.status === status);
    }

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHouseholds,
  getHouseholdById,
  createHousehold,
  addMember,
  moveMember,
  splitHousehold,
  getPotentialBenefits,
  getHouseholdMembers,
  getHouseholdSchemes,
  getHouseholdBenefitHistory,
  getHouseholdBenefitTimeline
};
