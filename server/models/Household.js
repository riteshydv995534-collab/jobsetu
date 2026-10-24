const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema(
  {
    householdId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    headOfHousehold: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual'
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true
    },
    addressLine2: {
      type: String,
      trim: true,
      default: ''
    },
    villageWard: {
      type: String,
      trim: true,
      default: 'Ward 12'
    },
    district: {
      type: String,
      required: true,
      trim: true,
      default: 'Jaipur'
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Rajasthan'
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      default: '302001'
    },
    rationCardNumber: {
      type: String,
      trim: true,
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'FLAGGED_CONFLICT'],
      default: 'VERIFIED',
      index: true
    },
    householdReference: {
      type: String,
      trim: true,
      index: true
    },
    annualHouseholdIncome: {
      type: Number,
      default: 95000
    },
    householdSize: {
      type: Number,
      default: 4
    },
    propertyAssociation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    benefitRestrictions: {
      type: [String],
      default: []
    },
    isSyntheticDemo: {
      type: Boolean,
      default: true
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

householdSchema.index({ householdId: 'text', addressLine1: 'text' });

module.exports = mongoose.model('Household', householdSchema);
