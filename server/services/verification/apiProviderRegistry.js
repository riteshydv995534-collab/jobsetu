const ApiIntegration = require('../../models/ApiIntegration');

const DEFAULT_PROVIDERS = [
  {
    providerId: 'NFSA_PDS_HOUSEHOLD_PROVIDER',
    name: '1. Ration Card: Family Hierarchy & Household Roster',
    verificationService: 'HOUSEHOLD_MEMBERSHIP',
    integrationType: 'MOCK_SANDBOX',
    connectionStatus: 'HEALTHY',
    endpointUrl: 'https://sandbox.pds.gov.in/rcms/v1/household/roster',
    officialPortalUrl: 'https://nfsa.gov.in/portal/State_Portals',
    discoveryRoute: 'State Food & Civil Supplies / RCMS Portal (Choose state portal)',
    eligibilityCriteriaRank: 1,
    criteriaCategory: 'RATION_CARD_HOUSEHOLD',
    timeoutMs: 4500,
    isActive: true,
    simulateState: 'NORMAL',
    averageResponseTimeMs: 165,
    supportedFields: ['rationCardNumber', 'headOfHousehold', 'familyHierarchy', 'activeMembers', 'categoryBPL'],
    documentationSummary:
      'Minimum Criteria 1: Fetches family hierarchy and household roster from NFSA State Portals. Verifies family relationships to head of household to prevent double-allocation across members.'
  },
  {
    providerId: 'BHUNAKSHA_LAND_PROVIDER',
    name: '2. Land Records: Property Evaluation & Title (RoR / Khatauni)',
    verificationService: 'PROPERTY_ASSOCIATION',
    integrationType: 'MOCK_SANDBOX',
    connectionStatus: 'HEALTHY',
    endpointUrl: 'https://sandbox.revenue.gov.in/bhunaksha/v3/parcel/verify',
    officialPortalUrl: 'https://dilrmp.gov.in/dilrmpold/State-RoR-Web',
    discoveryRoute: 'State Land Records / RoR (Khasra & Khatauni) Portal',
    eligibilityCriteriaRank: 2,
    criteriaCategory: 'LAND_PROPERTY',
    timeoutMs: 5000,
    isActive: true,
    simulateState: 'NORMAL',
    averageResponseTimeMs: 190,
    supportedFields: ['propertyId', 'surveyNumber', 'khatauniNumber', 'landHoldingArea', 'evaluatedValue', 'titleOwner'],
    documentationSummary:
      'Minimum Criteria 2: Fetches land valuation, parcel number (Khasra/Khatauni), and documented title from DILRMP State RoR. Verifies property eligibility; address match alone is never treated as proof of ownership.'
  },
  {
    providerId: 'UIDAI_IDENTITY_PROVIDER',
    name: '3. Aadhaar: Applicant Name & Father Name Demographic Verification',
    verificationService: 'INDIVIDUAL_IDENTITY',
    integrationType: 'MOCK_SANDBOX',
    connectionStatus: 'HEALTHY',
    endpointUrl: 'https://sandbox.uidai.gov.in/identity/v2/verify',
    officialPortalUrl: 'https://myaadhaar.uidai.gov.in/',
    discoveryRoute: 'myAadhaar Document-Update & eKYC Portal',
    eligibilityCriteriaRank: 3,
    criteriaCategory: 'AADHAAR_IDENTITY',
    timeoutMs: 4000,
    isActive: true,
    simulateState: 'NORMAL',
    averageResponseTimeMs: 130,
    supportedFields: ['applicantName', 'fatherName', 'dateOfBirth', 'gender', 'demographicScore'],
    documentationSummary:
      'Minimum Criteria 3: Fetches applicant name, father/guardian name, and demographic DOB from UIDAI myAadhaar. Confirms parental lineage and eliminates duplicate citizen claims.'
  },
  {
    providerId: 'INCOME_TAX_PAN_PROVIDER',
    name: '4. PAN Card: Income Assessment & Tax Return Status',
    verificationService: 'FINANCIAL_INCOME',
    integrationType: 'MOCK_SANDBOX',
    connectionStatus: 'HEALTHY',
    endpointUrl: 'https://sandbox.incometax.gov.in/pan/v1/verify',
    officialPortalUrl: 'https://www.incometax.gov.in/',
    discoveryRoute: 'Income Tax e-Filing & Instant e-PAN Portal',
    eligibilityCriteriaRank: 4,
    criteriaCategory: 'PAN_INCOME',
    timeoutMs: 4500,
    isActive: true,
    simulateState: 'NORMAL',
    averageResponseTimeMs: 155,
    supportedFields: ['panNumber', 'assessedAnnualIncome', 'taxFilingStatus', 'incomeCategory'],
    documentationSummary:
      'Minimum Criteria 4: Fetches income verification and tax return filing status from Income Tax Department e-Filing. Evaluates scheme annual income limits and prevents high-income misclassification.'
  },
  {
    providerId: 'DIGILOCKER_INTEGRATION_PROVIDER',
    name: '5. DigiLocker & ServicePlus: Additional Document Vault',
    verificationService: 'DIGILOCKER_VAULT',
    integrationType: 'MOCK_SANDBOX',
    connectionStatus: 'HEALTHY',
    endpointUrl: 'https://sandbox.digilocker.gov.in/v2/pull/document',
    officialPortalUrl: 'https://www.digilocker.gov.in/',
    discoveryRoute: 'DigiLocker (digilocker.gov.in) & ServicePlus (serviceonline.gov.in)',
    eligibilityCriteriaRank: 5,
    criteriaCategory: 'ADDITIONAL_DOCUMENTS',
    timeoutMs: 5000,
    isActive: true,
    simulateState: 'NORMAL',
    averageResponseTimeMs: 175,
    supportedFields: ['domicileCertificate', 'casteCertificate', 'ewsCertificate', 'eShramUAN', 'pmjayCard'],
    documentationSummary:
      'Minimum Criteria 5: Connects to DigiLocker and ServicePlus discovery routes (API Setu directory.apisetu.gov.in) for additional certificate evidence (Domicile, Caste, EWS, e-Shram, PM-JAY).'
  },
  {
    providerId: 'PFMS_DBT_BENEFIT_PROVIDER',
    name: '6. PFMS / DBT Central Benefit Ledger: Disbursement Tracking',
    verificationService: 'PREVIOUS_BENEFIT',
    integrationType: 'MOCK_SANDBOX',
    connectionStatus: 'HEALTHY',
    endpointUrl: 'https://sandbox.pfms.gov.in/dbt/v1/ledger/history',
    officialPortalUrl: 'https://dbtbharat.gov.in/',
    discoveryRoute: 'Public Financial Management System (pfms.nic.in) & DBT Bharat',
    eligibilityCriteriaRank: 6,
    criteriaCategory: 'BENEFIT_DISBURSEMENT',
    timeoutMs: 5000,
    isActive: true,
    simulateState: 'NORMAL',
    averageResponseTimeMs: 180,
    supportedFields: ['beneficiaryId', 'schemeCode', 'sanctionAmount', 'disbursementStatus', 'disbursementDate', 'utrReference'],
    documentationSummary:
      'Direct Benefit Transfer and PFMS gateway strictly distinguishing sanctioned approvals from completed cash payments with UTR transaction references.'
  }
];

/**
 * Initializes default providers in DB if collection is empty or updates missing fields
 */
const initDefaultProviders = async () => {
  try {
    for (const p of DEFAULT_PROVIDERS) {
      const {
        name,
        officialPortalUrl,
        discoveryRoute,
        eligibilityCriteriaRank,
        criteriaCategory,
        documentationSummary,
        supportedFields,
        ...insertDefaults
      } = p;

      await ApiIntegration.findOneAndUpdate(
        { providerId: p.providerId },
        {
          $setOnInsert: {
            ...insertDefaults,
            totalRequests: 0,
            failedRequests: 0,
            lastSuccessfulVerification: new Date()
          },
          $set: {
            name,
            officialPortalUrl,
            discoveryRoute,
            eligibilityCriteriaRank,
            criteriaCategory,
            documentationSummary,
            supportedFields
          }
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error('Failed to initialize default API integrations:', err.message);
  }
};

/**
 * Invokes a verification provider with simulated latency, resilience checks, and safe error logs
 */
const invokeProvider = async (providerId, payload = {}) => {
  const startTime = Date.now();
  let provider = await ApiIntegration.findOne({ providerId });

  if (!provider) {
    const fallback = DEFAULT_PROVIDERS.find((p) => p.providerId === providerId);
    if (fallback) {
      provider = new ApiIntegration(fallback);
    } else {
      return {
        status: 'UNAVAILABLE',
        error: `Unknown verification provider ${providerId}`,
        responseTimeMs: 0,
        isSyntheticDemo: true
      };
    }
  }

  // 1. Check if provider is enabled
  if (!provider.isActive) {
    const elapsed = Date.now() - startTime;
    return {
      status: 'UNAVAILABLE',
      error: `Integration ${provider.name} is currently deactivated by administrator.`,
      responseTimeMs: elapsed,
      isSyntheticDemo: provider.integrationType === 'MOCK_SANDBOX'
    };
  }

  // 2. Handle simulated failure states for resilience testing
  if (provider.simulateState === 'TIMEOUT') {
    const elapsed = Math.min(provider.timeoutMs + 50, 6000);
    await logProviderError(provider, 'ERR_GATEWAY_TIMEOUT', 'Upstream gateway timed out before response was received.');
    return {
      status: 'TIMEOUT',
      error: 'Verification pending — the relevant external record could not be confirmed (Gateway Timeout).',
      responseTimeMs: elapsed,
      isSyntheticDemo: true
    };
  }

  if (provider.simulateState === 'UNAVAILABLE') {
    await logProviderError(provider, 'ERR_ENDPOINT_UNAVAILABLE', 'Remote government endpoint returned HTTP 503 Service Unavailable.');
    return {
      status: 'UNAVAILABLE',
      error: 'Verification pending — the relevant external record could not be confirmed.',
      responseTimeMs: 80,
      isSyntheticDemo: true
    };
  }

  if (provider.simulateState === 'FAILURE') {
    await logProviderError(provider, 'ERR_INTERNAL_REMOTE', 'Remote data provider returned 500 error.');
    return {
      status: 'FAILURE',
      error: 'Remote provider verification failed with an unrecoverable service exception.',
      responseTimeMs: 95,
      isSyntheticDemo: true
    };
  }

  // 3. Normal Execution (Synthetic Mock or Authorized Live)
  const latency = Math.floor(Math.random() * 40) + 70; // 70-110 ms
  const elapsed = Date.now() - startTime + latency;

  // Update provider runtime statistics safely
  try {
    if (provider._id) {
      await ApiIntegration.findByIdAndUpdate(provider._id, {
        $inc: { totalRequests: 1 },
        $set: {
          lastSuccessfulVerification: new Date(),
          averageResponseTimeMs: Math.round((provider.averageResponseTimeMs + elapsed) / 2)
        }
      });
    }
  } catch (e) {
    // Non-blocking metrics update
  }

  return {
    status: 'VERIFIED',
    providerId: provider.providerId,
    providerName: provider.name,
    integrationType: provider.integrationType,
    isSyntheticDemo: provider.integrationType === 'MOCK_SANDBOX',
    responseTimeMs: elapsed,
    timestamp: new Date(),
    data: payload
  };
};

/**
 * Logs safe error without credentials or citizen PII
 */
const logProviderError = async (provider, errorCode, message) => {
  try {
    if (!provider._id) return;
    const safeLog = {
      timestamp: new Date(),
      errorCode,
      message,
      service: provider.verificationService
    };

    await ApiIntegration.findByIdAndUpdate(provider._id, {
      $inc: { totalRequests: 1, failedRequests: 1 },
      $set: {
        lastError: `${errorCode}: ${message}`,
        lastErrorTimestamp: new Date(),
        connectionStatus: 'DEGRADED'
      },
      $push: {
        safeErrorLogs: {
          $each: [safeLog],
          $slice: -25 // keep last 25 safe error logs
        }
      }
    });
  } catch (err) {
    console.error('Error logging provider error safely:', err.message);
  }
};

module.exports = {
  DEFAULT_PROVIDERS,
  initDefaultProviders,
  invokeProvider,
  logProviderError
};
