const mongoose = require('mongoose');

const familyRelationshipSchema = new mongoose.Schema(
  {
    individualA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      required: true,
      index: true
    },
    individualB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      required: true,
      index: true
    },
    relationshipType: {
      type: String,
      enum: ['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARDIAN', 'DEPENDENT', 'OTHER'],
      required: true
    },
    isVerified: {
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

familyRelationshipSchema.index({ individualA: 1, individualB: 1 });

module.exports = mongoose.model('FamilyRelationship', familyRelationshipSchema);
