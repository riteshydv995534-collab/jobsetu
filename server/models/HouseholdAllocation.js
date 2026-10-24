const mongoose = require('mongoose');

const candidateAssessmentSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      required: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true
    },
    mandatoryEligible: {
      type: Boolean,
      required: true,
      default: false
    },
    eligibilityResult: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'VERIFICATION_PENDING', 'INFORMATION_REQUIRED'],
      default: 'ELIGIBLE'
    },
    verifiedCriteria: {
      type: [String],
      default: []
    },
    priorityScore: {
      type: Number,
      default: 0
    },
    priorityBreakdown: {
      incomeScore: { type: Number, default: 0 },
      vulnerabilityScore: { type: Number, default: 0 },
      applicationDateScore: { type: Number, default: 0 }
    },
    missingEvidence: {
      type: [String],
      default: []
    },
    recommended: {
      type: Boolean,
      default: false
    },
    explanation: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const householdAllocationSchema = new mongoose.Schema(
  {
    allocationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true,
      index: true
    },
    benefitPeriod: {
      type: String,
      default: 'FY_2025_2026',
      index: true
    },
    competingApplications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
      }
    ],
    candidateAssessments: [candidateAssessmentSchema],
    recommendedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    recommendedApplicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual'
    },
    status: {
      type: String,
      enum: [
        'PENDING_EVALUATION',
        'RECOMMENDED_FOR_ALLOCATION',
        'PRIORITY_REVIEW_REQUIRED',
        'ALLOCATION_APPROVED',
        'ALLOCATION_REJECTED',
        'BENEFIT_DISBURSED'
      ],
      default: 'RECOMMENDED_FOR_ALLOCATION',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: {
      type: Date
    },
    isManualOverride: {
      type: Boolean,
      default: false
    },
    decisionReason: {
      type: String,
      default: ''
    },
    disbursementRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisbursementRecord'
    },
    disbursedAt: {
      type: Date
    },
    ruleVersion: {
      type: String,
      default: 'RULE_SET_v2.4_2026'
    },
    isSyntheticDemo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

householdAllocationSchema.index({ household: 1, scheme: 1, benefitPeriod: 1 });

module.exports = mongoose.model('HouseholdAllocation', householdAllocationSchema);
