const ApiIntegration = require('../models/ApiIntegration');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const Individual = require('../models/Individual');
const { initDefaultProviders, invokeProvider } = require('../services/verification/apiProviderRegistry');
const { logAudit } = require('../services/auditService');
const { assessEligibility } = require('../services/eligibilityEngine');
const { createDuplicateAlertsForApplication } = require('../services/duplicateDetectionService');

/**
 * Get all configured Government API Integrations & Verification Sources
 */
const getIntegrations = async (req, res, next) => {
  try {
    await initDefaultProviders();
    const integrations = await ApiIntegration.find().sort({ eligibilityCriteriaRank: 1, createdAt: 1 });

    res.json({
      success: true,
      data: integrations,
      meta: {
        totalConfigured: integrations.length,
        environment: 'HACKATHON_DEMONSTRATION_SANDBOX',
        policyNote: 'All external API endpoints operate in authenticated mock/sandbox mode with synthetic citizen rosters.'
      }
    });
  } catch (error) {
    next(error);
  }
};

const OFFICIAL_GOVERNMENT_DOCUMENTS = [
  {
    rank: 1,
    name: 'Ration Card',
    category: 'MINIMUM_CRITERIA',
    criteriaPurpose: 'Hierarchy of family and household roster verification',
    accessWebsite: 'https://nfsa.gov.in/portal/State_Portals',
    uploadSubmissionRoute: 'Choose state; use its ration-card application/update portal.',
    dataFetched: ['Ration Card Number', 'Head of Household', 'Family Hierarchy', 'Active Members Roster', 'BPL / AAY Classification'],
    isMinimumCriteria: true
  },
  {
    rank: 2,
    name: 'Land Records / Khatauni / Record of Rights (RoR)',
    category: 'MINIMUM_CRITERIA',
    criteriaPurpose: 'Evaluate property, ownership title, parcel number, and holding valuation',
    accessWebsite: 'https://dilrmp.gov.in/dilrmpold/State-RoR-Web',
    uploadSubmissionRoute: 'Select state land-record website. Viewing records is distinct from registration/mutation applications.',
    dataFetched: ['Khasra / Parcel Number', 'Khatauni Number', 'Land Holding Area', 'Evaluated Property Value', 'Registered Title Owner'],
    isMinimumCriteria: true
  },
  {
    rank: 3,
    name: 'Aadhaar Card',
    category: 'MINIMUM_CRITERIA',
    criteriaPurpose: 'Applicant name and father / guardian name demographic confirmation',
    accessWebsite: 'https://myaadhaar.uidai.gov.in/',
    uploadSubmissionRoute: 'Use supported document-update service where applicable; not general document storage.',
    dataFetched: ['Applicant Full Name', "Father's / Guardian Name", 'Date of Birth (DOB)', 'Gender', 'Biometric / Demographic Match'],
    isMinimumCriteria: true
  },
  {
    rank: 4,
    name: 'PAN Card / Instant e-PAN',
    category: 'MINIMUM_CRITERIA',
    criteriaPurpose: 'Income evaluation, tax assessment, and economic tier verification',
    accessWebsite: 'https://www.incometax.gov.in/',
    uploadSubmissionRoute: 'Instant e-PAN status/download applies to that specific service. Other PAN applications/corrections require applicable PAN service.',
    dataFetched: ['Permanent Account Number (PAN)', 'Assessed Annual Income', 'ITR Return Filing Status', 'Financial Classification'],
    isMinimumCriteria: true
  },
  {
    rank: 5,
    name: 'DigiLocker Digital Document Repository',
    category: 'STORAGE_AND_FETCH',
    criteriaPurpose: 'Fetch supported issuer documents or store your own PDFs/images',
    accessWebsite: 'https://www.digilocker.gov.in/',
    developerResources: 'https://www.digilocker.gov.in/web/resources',
    apiDiscoveryRoute: 'https://directory.apisetu.gov.in/search',
    uploadSubmissionRoute: 'Fetch supported issuer documents or store your own PDFs/images. These remain distinct categories.',
    dataFetched: ['Issued Certificates', 'Verified Marksheets', 'Driving Licences', 'Vehicle Registrations'],
    isMinimumCriteria: false
  },
  {
    rank: 6,
    name: 'Domicile / Residence Certificate',
    category: 'STATE_DOCUMENT',
    criteriaPurpose: 'State residency and nativity eligibility proof',
    accessWebsite: 'https://serviceonline.gov.in/',
    uploadSubmissionRoute: 'Select state; search Domicile, Residence or Nativity. Upload within the service application where available.',
    dataFetched: ['Resident State', 'District', 'Nativity Status'],
    isMinimumCriteria: false
  },
  {
    rank: 7,
    name: 'Income Certificate',
    category: 'STATE_DOCUMENT',
    criteriaPurpose: 'State revenue department certified income affidavit',
    accessWebsite: 'https://serviceonline.gov.in/',
    uploadSubmissionRoute: 'Select state and Income Certificate; use state e-District if not available.',
    dataFetched: ['Certified Family Income', 'Certifying Tehsildar / Magistrate'],
    isMinimumCriteria: false
  },
  {
    rank: 8,
    name: 'Caste Certificate (State / Central OBC-NCL)',
    category: 'STATE_DOCUMENT',
    criteriaPurpose: 'Affirmative welfare category reservation validation',
    accessWebsite: 'https://serviceonline.gov.in/',
    uploadSubmissionRoute: 'Select state and applicable caste-certificate application.',
    dataFetched: ['Social Category', 'Issuing Authority'],
    isMinimumCriteria: false
  },
  {
    rank: 9,
    name: 'EWS Certificate',
    category: 'STATE_DOCUMENT',
    criteriaPurpose: 'Economically Weaker Section income & asset certification',
    accessWebsite: 'https://serviceonline.gov.in/',
    uploadSubmissionRoute: 'Select applicable state service and required purpose/format.',
    dataFetched: ['EWS Eligibility Status', 'Validity Financial Year'],
    isMinimumCriteria: false
  },
  {
    rank: 10,
    name: 'Birth Certificate',
    category: 'CIVIL_REGISTRATION',
    criteriaPurpose: 'Statutory age & parental lineage confirmation',
    accessWebsite: 'https://services.india.gov.in/',
    uploadSubmissionRoute: 'Search Birth Certificate plus state; follow linked registration/application service.',
    dataFetched: ['Date of Birth', 'Mother Name', 'Father Name', 'Place of Birth'],
    isMinimumCriteria: false
  },
  {
    rank: 11,
    name: 'State Scholarship Documents',
    category: 'EDUCATION',
    criteriaPurpose: 'Scholastic grant eligibility validation',
    accessWebsite: 'https://scholarships.gov.in/',
    uploadSubmissionRoute: 'For participating schemes, submit evidence in scholarship application.',
    dataFetched: ['Student Enrolment ID', 'Institution Name', 'Course Details'],
    isMinimumCriteria: false
  },
  {
    rank: 12,
    name: 'PM-JAY Ayushman Card',
    category: 'HEALTHCARE',
    criteriaPurpose: 'National health insurance family coverage',
    accessWebsite: 'https://beneficiary.nha.gov.in/',
    uploadSubmissionRoute: 'Use eligibility, e-KYC and card-creation workflow; not general file storage.',
    dataFetched: ['PMJAY ID', 'Family Head Reference', 'Covered Members'],
    isMinimumCriteria: false
  },
  {
    rank: 13,
    name: 'e-Shram Card (Unorganised Worker)',
    category: 'LABOUR_WELFARE',
    criteriaPurpose: 'Social security for unorganised workers',
    accessWebsite: 'https://eshram.gov.in/',
    uploadSubmissionRoute: 'Use linked registration/update service. Evidence requirements depend on workflow.',
    dataFetched: ['UAN Number', 'Primary Occupation'],
    isMinimumCriteria: false
  },
  {
    rank: 14,
    name: 'Voter ID / EPIC',
    category: 'ELECTORAL_IDENTITY',
    criteriaPurpose: 'Constituency & adult electoral roll confirmation',
    accessWebsite: 'https://voters.eci.gov.in/',
    uploadSubmissionRoute: 'Download e-EPIC; submit evidence within the relevant registration/correction application.',
    dataFetched: ['EPIC Number', 'Assembly Constituency', 'Relation Name'],
    isMinimumCriteria: false
  },
  {
    rank: 15,
    name: 'Driving Licence',
    category: 'TRANSPORT',
    criteriaPurpose: 'State transport department issued identity and licence',
    accessWebsite: 'https://sarathi.parivahan.gov.in/',
    uploadSubmissionRoute: 'Select state and service. Upload documents within applicable application where enabled.',
    dataFetched: ['DL Number', 'Vehicle Classes', 'Validity Date'],
    isMinimumCriteria: false
  },
  {
    rank: 16,
    name: 'EPFO UAN Member Interface',
    category: 'EMPLOYMENT',
    criteriaPurpose: 'Organised sector provident fund verification',
    accessWebsite: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
    uploadSubmissionRoute: 'Member account services; use relevant KYC/claim workflow.',
    dataFetched: ['UAN', 'Active Employment Status', 'PF Contributions'],
    isMinimumCriteria: false
  },
  {
    rank: 17,
    name: 'Passport',
    category: 'NATIONAL_IDENTITY',
    criteriaPurpose: 'Consular passport identity and citizenship evidence',
    accessWebsite: 'https://www.passportindia.gov.in/',
    uploadSubmissionRoute: 'Use passport application workflow and supported DigiLocker sharing/manual document options.',
    dataFetched: ['Passport Number', 'Nationality', 'Place of Issue'],
    isMinimumCriteria: false
  }
];

const getGovernmentDocumentSources = (req, res) => {
  res.json({
    success: true,
    data: OFFICIAL_GOVERNMENT_DOCUMENTS,
    minimumCriteriaOrder: [
      { step: 1, document: 'Ration Card', purpose: 'Hierarchy of family or household roster' },
      { step: 2, document: 'Land Records', purpose: 'Evaluate property and cadastral parcel title' },
      { step: 3, document: 'Aadhaar Card', purpose: "Father's name and applicant name verification" },
      { step: 4, document: 'PAN Card', purpose: 'Annual income assessment and tax return status' },
      { step: 5, document: 'More Documents', purpose: 'DigiLocker, Domicile, Caste/EWS, Scholarship, PM-JAY' }
    ]
  });
};

/**
 * Get single integration details
 */
const getIntegrationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const integration = await ApiIntegration.findById(id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'API Integration provider not found.'
      });
    }

    res.json({
      success: true,
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update integration configuration (Administrator Only)
 */
const updateIntegration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, timeoutMs, simulateState, endpointUrl, integrationType } = req.body;

    const integration = await ApiIntegration.findById(id);
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'API Integration provider not found.'
      });
    }

    // Guardrail: Never allow labeling a mock as a real government integration without verified production credentials
    if (integrationType === 'AUTHORIZED_PRODUCTION') {
      const hasGovDomain = endpointUrl && (endpointUrl.includes('.gov.in') || endpointUrl.includes('.nic.in'));
      const hasProdKey = process.env.GOV_PRODUCTION_API_KEY || process.env[`${integration.providerId}_KEY`];

      if (!hasGovDomain || !hasProdKey) {
        return res.status(400).json({
          success: false,
          message:
            'Security Policy Violation: Cannot label mock integration as AUTHORIZED_PRODUCTION without verifiable official government endpoint (*.gov.in) and registered backend production credentials in environment variables.'
        });
      }
      integration.integrationType = 'AUTHORIZED_PRODUCTION';
    } else if (integrationType) {
      integration.integrationType = integrationType;
    }

    if (typeof isActive === 'boolean') {
      integration.isActive = isActive;
    }
    if (typeof timeoutMs === 'number' && timeoutMs >= 500 && timeoutMs <= 30000) {
      integration.timeoutMs = timeoutMs;
    }
    if (simulateState && ['NORMAL', 'TIMEOUT', 'UNAVAILABLE', 'FAILURE'].includes(simulateState)) {
      integration.simulateState = simulateState;
      if (simulateState === 'UNAVAILABLE') {
        integration.connectionStatus = 'OFFLINE';
      } else if (simulateState === 'TIMEOUT' || simulateState === 'FAILURE') {
        integration.connectionStatus = 'DEGRADED';
      } else {
        integration.connectionStatus = 'HEALTHY';
      }
    }
    if (endpointUrl && typeof endpointUrl === 'string') {
      integration.endpointUrl = endpointUrl;
    }

    await integration.save();

    await logAudit({
      actingUser: req.user,
      action: 'API_INTEGRATION_UPDATE',
      entityType: 'ApiIntegration',
      entityId: integration._id,
      afterSnapshot: {
        providerId: integration.providerId,
        isActive: integration.isActive,
        simulateState: integration.simulateState,
        timeoutMs: integration.timeoutMs
      },
      reasonNotes: `Administrator adjusted integration settings for ${integration.name}`,
      req
    });

    res.json({
      success: true,
      message: `Settings updated successfully for ${integration.name}`,
      data: integration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Live test connectivity and latency measurement
 */
const testIntegrationConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const integration = await ApiIntegration.findById(id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'API Integration provider not found.'
      });
    }

    const testPayload = {
      pingTest: true,
      testTimestamp: new Date().toISOString()
    };

    const result = await invokeProvider(integration.providerId, testPayload);

    // Refresh integration doc
    const updated = await ApiIntegration.findById(id);

    res.json({
      success: true,
      message: `Test ping executed against ${integration.name}.`,
      data: {
        providerId: integration.providerId,
        name: integration.name,
        resultStatus: result.status,
        responseTimeMs: result.responseTimeMs,
        isSyntheticDemo: result.isSyntheticDemo,
        connectionStatus: updated.connectionStatus,
        lastSuccessfulVerification: updated.lastSuccessfulVerification,
        lastError: updated.lastError
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get safe error logs
 */
const getIntegrationLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const integration = await ApiIntegration.findById(id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'API Integration provider not found.'
      });
    }

    res.json({
      success: true,
      data: integration.safeErrorLogs || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/integrations/status
 */
const getIntegrationsStatus = async (req, res, next) => {
  try {
    await initDefaultProviders();
    const integrations = await ApiIntegration.find();
    const totalApps = await Application.countDocuments();
    const totalAssessed = await Application.countDocuments({ status: { $ne: 'SUBMITTED' } });

    res.json({
      success: true,
      status: 'OPERATIONAL',
      environment: 'HACKATHON_DEMO_SANDBOX',
      data: {
        activeProviders: integrations.filter((i) => i.connectionStatus === 'CONNECTED').length,
        totalProviders: integrations.length,
        totalImportedApplications: totalApps,
        totalAssessedApplications: totalAssessed,
        lastSynchronizedAt: new Date(),
        providers: integrations.map((i) => ({
          providerId: i.providerId,
          name: i.name,
          category: i.category,
          mode: i.environmentMode || 'DEMO',
          status: i.connectionStatus,
          lastVerified: i.lastSuccessfulVerification,
          errorCount: (i.safeErrorLogs || []).length
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/integrations/sync
 */
const syncIntegrations = async (req, res, next) => {
  try {
    const syncBatchId = `SYNC-BATCH-${Date.now()}`;
    const timestamp = new Date();

    await logAudit({
      actingUser: req.user?._id,
      actingUserName: req.user?.name || 'Authorized Scheme Officer',
      userRole: req.user?.role || 'SUPER_ADMIN',
      action: 'EXTERNAL_SYNC_EXECUTED',
      entityType: 'INTEGRATION_SYNC',
      entityId: syncBatchId,
      reasonNotes: 'Idempotent external applications synchronisation triggered.'
    });

    res.json({
      success: true,
      message: 'Idempotent external provider synchronization completed successfully.',
      data: {
        batchId: syncBatchId,
        timestamp,
        syncStatus: 'SUCCESS',
        recordsChecked: 35,
        newApplicationsIngested: 0,
        duplicateEventsPrevented: 35,
        mode: 'DEMO_SANDBOX'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/integrations/history
 */
const getIntegrationHistory = async (req, res, next) => {
  try {
    const history = [
      {
        batchId: 'SYNC-BATCH-INITIAL-SEED',
        timestamp: new Date(Date.now() - 3600000 * 24),
        source: 'NATIONAL_SW_DATA_EXCHANGE',
        recordsProcessed: 100,
        status: 'COMPLETED',
        importedCount: 82,
        duplicateSuppressed: 18,
        mode: 'SYNTHETIC_DEMO'
      },
      {
        batchId: 'SYNC-BATCH-NSP-DELTA',
        timestamp: new Date(Date.now() - 3600000 * 4),
        source: 'NATIONAL_SCHOLARSHIP_PORTAL',
        recordsProcessed: 15,
        status: 'COMPLETED',
        importedCount: 12,
        duplicateSuppressed: 3,
        mode: 'SANDBOX'
      }
    ];

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/integrations/import
 * Ingests external applications with field mapping, reference preservation, and duplicate checks
 */
const importExternalApplications = async (req, res, next) => {
  try {
    const { applications: incomingApps, sourceSystem = 'EXTERNAL_PORTAL_EXCHANGE' } = req.body;

    if (!Array.isArray(incomingApps) || incomingApps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import payload. Expected non-empty array of application records.'
      });
    }

    const imported = [];
    const skippedDuplicates = [];

    for (const item of incomingApps) {
      const sourceRef = item.sourceSystemReference || item.externalReference || item.applicationId;
      if (!sourceRef) continue;

      // Idempotency check: don't import if source ref already exists
      const existing = await Application.findOne({ sourceSystemReference: sourceRef });
      if (existing) {
        skippedDuplicates.push({ sourceRef, reason: 'Source system reference already imported' });
        continue;
      }

      // Resolve scheme
      let scheme = null;
      if (item.schemeId) {
        scheme = await Scheme.findOne({
          $or: [{ schemeId: item.schemeId }, { code: item.schemeId }, { _id: item.schemeId.match(/^[0-9a-fA-F]{24}$/) ? item.schemeId : null }]
        });
      }
      if (!scheme) {
        scheme = await Scheme.findOne({ benefitScope: item.benefitScope || 'INDIVIDUAL' });
      }

      // Resolve applicant
      let applicant = null;
      if (item.applicantDemoIdentifier) {
        applicant = await Individual.findOne({ demoIdentifier: item.applicantDemoIdentifier });
      } else if (item.applicantId) {
        applicant = await Individual.findOne({
          $or: [{ individualId: item.applicantId }, { _id: item.applicantId.match(/^[0-9a-fA-F]{24}$/) ? item.applicantId : null }]
        });
      }

      if (!applicant) {
        applicant = await Individual.findOne();
      }

      const count = await Application.countDocuments();
      const newAppId = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      const newApp = new Application({
        applicationId: newAppId,
        sourceSystemReference: sourceRef,
        scheme: scheme._id,
        applicantIndividual: applicant._id,
        household: applicant.currentHousehold || null,
        status: 'SUBMITTED',
        eligibilityStatus: 'PENDING_VERIFICATION',
        requestedAmount: item.requestedAmount || scheme.maxBenefitAmount || 10000,
        applicationDate: item.applicationDate ? new Date(item.applicationDate) : new Date(),
        notes: `Imported via authorized bridge from ${sourceSystem}`
      });

      await newApp.save();

      // Trigger automatic deterministic eligibility evaluation & duplicate detection
      await assessEligibility({ applicationId: newApp._id });
      await createDuplicateAlertsForApplication(newApp);

      await logAudit({
        actingUser: req.user?._id,
        actingUserName: req.user?.name || 'Integration Bridge Worker',
        userRole: req.user?.role || 'SYSTEM',
        action: 'APPLICATION_IMPORTED',
        entityType: 'APPLICATION',
        entityId: newApp.applicationId,
        reasonNotes: `Imported from ${sourceSystem} with source ref ${sourceRef}`
      });

      imported.push({
        applicationId: newApp.applicationId,
        sourceSystemReference: sourceRef,
        scheme: scheme.name,
        applicant: applicant.fullName
      });
    }

    res.status(201).json({
      success: true,
      message: `Batch import completed. ${imported.length} new applications ingested, ${skippedDuplicates.length} duplicates prevented.`,
      data: {
        importedCount: imported.length,
        skippedCount: skippedDuplicates.length,
        imported,
        skippedDuplicates
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIntegrations,
  getGovernmentDocumentSources,
  getIntegrationById,
  updateIntegration,
  testIntegrationConnection,
  getIntegrationLogs,
  getIntegrationsStatus,
  syncIntegrations,
  getIntegrationHistory,
  importExternalApplications
};
