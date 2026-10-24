const mongoose = require('mongoose');

const householdMembershipSchema = new mongoose.Schema(
  {
    individual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      required: true,
      index: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true
    },
    relationshipToHead: {
      type: String,
      enum: ['HEAD', 'SPOUSE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'FATHER', 'MOTHER', 'DAUGHTER_IN_LAW', 'GRANDSON', 'GRANDDAUGHTER', 'OTHER'],
      default: 'OTHER'
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    endDate: {
      type: Date
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true
    },
    eventType: {
      type: String,
      enum: ['INITIAL_REGISTRATION', 'MARRIAGE', 'BIRTH', 'HOUSEHOLD_SPLIT', 'RELOCATION', 'DEATH', 'ADMIN_CORRECTION'],
      default: 'INITIAL_REGISTRATION'
    },
    reasonForChange: {
      type: String,
      default: 'Initial household roster creation'
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'UNVERIFIED', 'REJECTED'],
      default: 'VERIFIED',
      index: true
    },
    verificationSource: {
      type: String,
      default: 'CIVIL_SUPPLIES_RATION_REGISTER'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

householdMembershipSchema.index({ individual: 1, household: 1, isCurrent: 1 });

module.exports = mongoose.model('HouseholdMembership', householdMembershipSchema);
