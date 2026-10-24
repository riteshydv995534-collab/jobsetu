const mongoose = require('mongoose');

const reviewDecisionSchema = new mongoose.Schema(
  {
    duplicateAlert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DuplicateAlert',
      required: true,
      index: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true
    },
    reviewingOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    decision: {
      type: String,
      enum: ['CONFIRMED_DUPLICATE', 'MARKED_NOT_DUPLICATE', 'RESOLVED_NOT_DUPLICATE', 'ESCALATED', 'INFO_REQUESTED'],
      required: true
    },
    reasonNotes: {
      type: String,
      required: [true, 'A formal justification reason is strictly required for every decision'],
      trim: true
    },
    actionTaken: {
      type: String,
      default: ''
    },
    decidedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ReviewDecision', reviewDecisionSchema);
