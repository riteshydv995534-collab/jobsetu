const mongoose = require('mongoose');

const individualSchema = new mongoose.Schema(
  {
    individualId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    demoIdentifier: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true
    },
    fatherName: {
      type: String,
      trim: true,
      default: 'Ramesh Sharma'
    },
    aadhaarRef: {
      type: String,
      trim: true,
      default: 'XXXX-XXXX-4921'
    },
    panNumber: {
      type: String,
      trim: true,
      default: 'ABCPS1234F'
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    incomeCategory: {
      type: String,
      enum: ['APL', 'BPL', 'AAY', 'NONE'],
      default: 'BPL',
      index: true
    },
    annualIncome: {
      type: Number,
      default: 0
    },
    state: {
      type: String,
      default: 'Rajasthan',
      trim: true
    },
    district: {
      type: String,
      default: 'Jaipur',
      trim: true
    },
    employmentStatus: {
      type: String,
      enum: ['EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'SELF_EMPLOYED', 'AGRICULTURAL_WORKER', 'INFORMAL_WORKER'],
      default: 'EMPLOYED'
    },
    educationStatus: {
      type: String,
      enum: ['PRIMARY', 'SECONDARY', 'HIGHER_SECONDARY', 'UNDERGRADUATE', 'POSTGRADUATE', 'ILLITERATE'],
      default: 'SECONDARY'
    },
    hasDisability: {
      type: Boolean,
      default: false
    },
    isVulnerable: {
      type: Boolean,
      default: false
    },
    membershipStatus: {
      type: String,
      enum: ['PRIMARY_RESIDENT', 'MEMBER', 'TEMPORARY', 'RELOCATED'],
      default: 'MEMBER'
    },
    isSyntheticDemo: {
      type: Boolean,
      default: true
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'FLAGGED_CONFLICT'],
      default: 'VERIFIED',
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    currentHousehold: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household'
    },
    isHeadOfHousehold: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      default: ''
    },
    applicationCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

individualSchema.index({ fullName: 'text', individualId: 'text' });

module.exports = mongoose.model('Individual', individualSchema);
