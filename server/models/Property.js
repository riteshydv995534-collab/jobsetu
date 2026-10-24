const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    propertyType: {
      type: String,
      enum: ['RESIDENTIAL', 'AGRICULTURAL', 'COMMERCIAL', 'MIXED'],
      default: 'RESIDENTIAL'
    },
    plotNumber: {
      type: String,
      trim: true,
      default: 'Plot 42'
    },
    surveyNumber: {
      type: String,
      trim: true,
      default: 'Khasra 281/4'
    },
    khatauniNumber: {
      type: String,
      trim: true,
      default: 'KH-8821'
    },
    landHoldingArea: {
      type: String,
      trim: true,
      default: '1200 Sq Ft'
    },
    evaluatedValue: {
      type: Number,
      default: 450000
    },
    propertyReference: {
      type: String,
      trim: true,
      index: true
    },
    associatedHousehold: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household'
    },
    ownershipStatus: {
      type: String,
      enum: ['VERIFIED_OWNER', 'TENANT', 'FAMILY_RESIDENT', 'UNVERIFIED'],
      default: 'VERIFIED_OWNER'
    },
    isSyntheticDemo: {
      type: Boolean,
      default: true
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true
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
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'FLAGGED_CONFLICT'],
      default: 'VERIFIED',
      index: true
    },
    totalSanctionedBenefits: {
      type: Number,
      default: 0
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

propertySchema.index({ propertyId: 'text', addressLine1: 'text' });

module.exports = mongoose.model('Property', propertySchema);
