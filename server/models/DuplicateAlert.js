const mongoose = require('mongoose');

const duplicateAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true,
      index: true
    },
    applicantIndividual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      required: true,
      index: true
    },
    candidateType: {
      type: String,
      enum: ['INDIVIDUAL', 'HOUSEHOLD', 'PROPERTY'],
      required: true,
      index: true
    },
    conflictingBenefitRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BenefitRecord'
    },
    conflictingApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    relevantHousehold: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household'
    },
    relevantProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    triggeringRule: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      required: true
    },
    matchReason: {
      type: String,
      default: ''
    },
    riskScore: {
      type: Number,
      default: 80
    },
    status: {
      type: String,
      enum: [
        'PENDING_REVIEW',
        'CONFIRMED_DUPLICATE',
        'RESOLVED_NOT_DUPLICATE',
        'MARKED_NOT_DUPLICATE',
        'ESCALATED',
        'INFO_REQUESTED'
      ],
      default: 'PENDING_REVIEW',
      index: true
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    resolvedAt: {
      type: Date
    },
    resolutionNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DuplicateAlert', duplicateAlertSchema);
