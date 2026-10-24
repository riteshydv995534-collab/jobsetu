const mongoose = require('mongoose');

const disbursementRecordSchema = new mongoose.Schema(
  {
    disbursementId: {
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
    benefitRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BenefitRecord',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true
    },
    paymentMethod: {
      type: String,
      enum: ['DBT_DIRECT_BENEFIT_TRANSFER', 'PFMS_BANK_CREDIT', 'TREASURY_TRANSFER'],
      default: 'DBT_DIRECT_BENEFIT_TRANSFER'
    },
    disbursedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

module.exports = mongoose.model('DisbursementRecord', disbursementRecordSchema);
