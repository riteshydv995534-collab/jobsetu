const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/apiIntegrationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', getIntegrations);
router.get('/status', getIntegrationsStatus);
router.get('/history', getIntegrationHistory);
router.post('/sync', authorize('RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), syncIntegrations);
router.post('/import', authorize('RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), importExternalApplications);
router.get('/official-sources', getGovernmentDocumentSources);
router.get('/:id', getIntegrationById);
router.patch('/:id', authorize('RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), updateIntegration);
router.post('/:id/test', authorize('RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), testIntegrationConnection);
router.get('/:id/logs', authorize('RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getIntegrationLogs);

module.exports = router;
