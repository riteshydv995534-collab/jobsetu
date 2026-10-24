const mongoose = require('mongoose');

const documentMetadataSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    originalName: {
      type: String,
      required: true
    },
    storedFilename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    linkedEntityType: {
      type: String,
      enum: ['INDIVIDUAL', 'HOUSEHOLD', 'PROPERTY', 'APPLICATION', 'SCHEME'],
      required: true,
      index: true
    },
    linkedEntityId: {
      type: String,
      required: true,
      index: true
    },
    documentType: {
      type: String,
      enum: [
        'IDENTITY_PROOF',
        'RATION_CARD',
        'INCOME_CERTIFICATE',
        'PROPERTY_TAX_RECEIPT',
        'AFFIDAVIT',
        'GENERAL_DOCUMENT'
      ],
      default: 'GENERAL_DOCUMENT'
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'REJECTED'],
      default: 'VERIFIED'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DocumentMetadata', documentMetadataSchema);
