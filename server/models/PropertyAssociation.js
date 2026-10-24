const mongoose = require('mongoose');

const propertyAssociationSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      index: true
    },
    individual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      index: true
    },
    associationType: {
      type: String,
      enum: ['OWNER', 'RESIDENT', 'TENANT', 'CARETAKER'],
      required: true,
      default: 'RESIDENT'
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
    reasonForChange: {
      type: String,
      default: 'Verified property association record'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

propertyAssociationSchema.index({ property: 1, household: 1, isCurrent: 1 });

module.exports = mongoose.model('PropertyAssociation', propertyAssociationSchema);
