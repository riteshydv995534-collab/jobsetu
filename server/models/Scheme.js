const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    schemeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Scheme name is required'],
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    benefitScope: {
      type: String,
      enum: ['INDIVIDUAL', 'HOUSEHOLD', 'PROPERTY'],
      required: true,
      index: true
    },
    benefitCategory: {
      type: String,
      enum: [
        'EDUCATION',
        'SCHOLARSHIP',
        'EMPLOYMENT',
        'HEALTHCARE',
        'SANITATION',
        'ELECTRICITY',
        'FOOD_ASSISTANCE',
        'HOUSING',
        'INFRASTRUCTURE',
        'FAMILY_SUPPORT',
        'AGRICULTURE',
        'AGRICULTURAL_EQUIPMENT'
      ],
      default: 'EDUCATION',
      index: true
    },
    targetPopulation: {
      type: String,
      default: 'General eligible beneficiaries'
    },
    maxBenefitAmount: {
      type: Number,
      required: true
    },
    allowedIncomeCategories: {
      type: [String],
      enum: ['APL', 'BPL', 'AAY', 'NONE'],
      default: ['BPL', 'AAY']
    },
    maxAnnualIncome: {
      type: Number,
      default: null
    },
    minAgeYears: {
      type: Number,
      default: null
    },
    maxAgeYears: {
      type: Number,
      default: null
    },
    targetGender: {
      type: String,
      enum: ['ALL', 'MALE', 'FEMALE', 'OTHER'],
      default: 'ALL'
    },
    allowedEmploymentStatus: {
      type: [String],
      default: ['ALL']
    },
    allowedEducationStatus: {
      type: [String],
      default: ['ALL']
    },
    requiresDisability: {
      type: Boolean,
      default: false
    },
    maxLifetimeAllocationsPerScope: {
      type: Number,
      default: 1
    },
    repeatBenefitPolicy: {
      type: String,
      enum: ['NO_REPEAT', 'ANNUAL', 'ONCE_PER_LIFETIME', 'EVERY_3_YEARS'],
      default: 'ONCE_PER_LIFETIME'
    },
    benefitPeriod: {
      type: String,
      default: 'FY_2025_2026'
    },
    coolOffPeriodMonths: {
      type: Number,
      default: 0 // 0 = lifetime limit applies, > 0 = wait period
    },
    priorityWeights: {
      lowerIncomeWeight: { type: Number, default: 40 },
      vulnerabilityWeight: { type: Number, default: 30 },
      applicationDateWeight: { type: Number, default: 30 }
    },
    tieBreakRule: {
      type: String,
      enum: ['EARLIER_APPLICATION_DATE', 'LOWER_ANNUAL_INCOME', 'MANUAL_OFFICER_REVIEW'],
      default: 'EARLIER_APPLICATION_DATE'
    },
    ruleVersion: {
      type: String,
      default: 'RULE_SET_v2.4_2026'
    },
    effectiveStartDate: {
      type: Date,
      default: () => new Date('2025-04-01')
    },
    effectiveEndDate: {
      type: Date,
      default: () => new Date('2027-03-31')
    },
    requiredDocuments: {
      type: [String],
      default: ['Identity Proof', 'Income Certificate', 'Address Proof']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isDemonstration: {
      type: Boolean,
      default: true
    },
    rulesNote: {
      type: String,
      default: 'Illustrative hackathon demo rule set. Not official government policy.'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Scheme', schemeSchema);
