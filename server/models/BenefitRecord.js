const mongoose = require('mongoose');

const benefitRecordSchema = new mongoose.Schema(
  {
    recordId: {
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
    recipientIndividual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      index: true
    },
    recipientHousehold: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      index: true
    },
    recipientProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      index: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    benefitAmount: {
      type: Number,
      required: true
    },
    sanctionDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    disbursementDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['SANCTIONED', 'DISBURSED', 'CANCELLED'],
      default: 'SANCTIONED',
      index: true
    },
    referenceNumber: {
      type: String,
      trim: true
    },
    financialYear: {
      type: String,
      default: '2025-2026'
    },
    verificationSource: {
      type: String,
      default: 'PFMS_DBT_PORTAL'
    },
    verificationTimestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

benefitRecordSchema.index({ scheme: 1, recipientProperty: 1 });
benefitRecordSchema.index({ scheme: 1, recipientHousehold: 1 });
benefitRecordSchema.index({ scheme: 1, recipientIndividual: 1 });

module.exports = mongoose.model('BenefitRecord', benefitRecordSchema);
