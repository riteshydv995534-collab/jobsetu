const mongoose = require('mongoose');

const safeErrorLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    errorCode: { type: String, required: true },
    message: { type: String, required: true },
    service: { type: String, required: true }
  },
  { _id: false }
);

const apiIntegrationSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    verificationService: {
      type: String,
      enum: [
        'INDIVIDUAL_IDENTITY',
        'HOUSEHOLD_MEMBERSHIP',
        'PROPERTY_ASSOCIATION',
        'PREVIOUS_BENEFIT',
        'EXTERNAL_SCHEME',
        'FINANCIAL_INCOME',
        'DIGILOCKER_VAULT'
      ],
      required: true,
      index: true
    },
    officialPortalUrl: {
      type: String,
      default: ''
    },
    discoveryRoute: {
      type: String,
      default: ''
    },
    eligibilityCriteriaRank: {
      type: Number,
      default: 99,
      index: true
    },
    criteriaCategory: {
      type: String,
      default: ''
    },
    integrationType: {
      type: String,
      enum: ['MOCK_SANDBOX', 'APPROVED_SANDBOX', 'AUTHORIZED_PRODUCTION'],
      default: 'MOCK_SANDBOX'
    },
    connectionStatus: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED', 'OFFLINE', 'MAINTENANCE'],
      default: 'HEALTHY'
    },
    endpointUrl: {
      type: String,
      default: 'https://sandbox.api.gov.in/v1/verify'
    },
    timeoutMs: {
      type: Number,
      default: 5000
    },
    isActive: {
      type: Boolean,
      default: true
    },
    simulateState: {
      type: String,
      enum: ['NORMAL', 'TIMEOUT', 'UNAVAILABLE', 'FAILURE'],
      default: 'NORMAL'
    },
    lastSuccessfulVerification: {
      type: Date,
      default: Date.now
    },
    lastError: {
      type: String,
      default: null
    },
    lastErrorTimestamp: {
      type: Date
    },
    averageResponseTimeMs: {
      type: Number,
      default: 120
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    failedRequests: {
      type: Number,
      default: 0
    },
    supportedFields: {
      type: [String],
      default: []
    },
    documentationSummary: {
      type: String,
      default: ''
    },
    safeErrorLogs: [safeErrorLogSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ApiIntegration', apiIntegrationSchema);
