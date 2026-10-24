const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      index: true
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      index: true
    },
    requestedAmount: {
      type: Number,
      required: true
    },
    applicationDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'VERIFICATION_PENDING',
        'UNDER_REVIEW',
        'INFORMATION_REQUIRED',
        'APPROVED',
        'REJECTED',
        'BENEFIT_DISBURSED'
      ],
      default: 'SUBMITTED',
      index: true
    },
    eligibilityStatus: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'REQUIRES_VERIFICATION', 'VERIFICATION_PENDING', 'POTENTIAL_DUPLICATE_REVIEW'],
      default: 'REQUIRES_VERIFICATION'
    },
    hasDuplicateAlert: {
      type: Boolean,
      default: false,
      index: true
    },
    duplicateAlertCount: {
      type: Number,
      default: 0
    },
    remarks: {
      type: String,
      default: ''
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decisionDate: {
      type: Date
    },
    decisionReason: {
      type: String,
      default: ''
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentMetadata'
      }
    ]
  },
  {
    timestamps: true
  }
);

applicationSchema.index({ scheme: 1, applicantIndividual: 1 });
applicationSchema.index({ scheme: 1, property: 1 });
applicationSchema.index({ scheme: 1, household: 1 });

module.exports = mongoose.model('Application', applicationSchema);
