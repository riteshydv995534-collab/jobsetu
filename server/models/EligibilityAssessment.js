const mongoose = require('mongoose');

const eligibilityAssessmentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      index: true
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      required: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household'
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    ruleVersion: {
      type: String,
      default: 'RULE_SET_v2.4_2026'
    },
    overallResult: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'REQUIRES_VERIFICATION', 'VERIFICATION_PENDING', 'POTENTIAL_DUPLICATE_REVIEW'],
      required: true,
      index: true
    },
    checksPassed: [
      {
        ruleName: { type: String, required: true },
        description: { type: String, required: true },
        passed: { type: Boolean, default: true }
      }
    ],
    checksFailed: [
      {
        ruleName: { type: String, required: true },
        description: { type: String, required: true },
        reason: { type: String, required: true }
      }
    ],
    checksRequiringVerification: [
      {
        checkItem: { type: String, required: true },
        reason: { type: String, required: true }
      }
    ],
    rulesEvaluated: {
      type: [String],
      default: []
    },
    externalApiResults: [
      {
        providerId: String,
        service: String,
        status: {
          type: String,
          enum: ['VERIFIED', 'UNVERIFIED', 'PENDING', 'TIMEOUT', 'UNAVAILABLE', 'FAILURE']
        },
        evidence: String,
        isSyntheticDemo: { type: Boolean, default: true },
        responseTimeMs: Number,
        timestamp: { type: Date, default: Date.now }
      }
    ],
    previousBenefitsFound: [
      {
        schemeName: String,
        benefitScope: String,
        beneficiaryRef: String,
        status: String,
        disbursementStatus: String,
        sanctionDate: Date,
        disbursementDate: Date,
        amount: Number,
        source: String,
        conflictsWithCurrentScheme: Boolean,
        ruleTriggered: String
      }
    ],
    explanation: {
      type: String,
      default: ''
    },
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assessedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EligibilityAssessment', eligibilityAssessmentSchema);
