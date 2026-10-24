const express = require('express');
const router = express.Router();
const {
  getApplications,
  getApplicationById,
  submitApplication,
  evaluateApplicationRules,
  updateApplicationStatus,
  reviewApplicationAction,
  disburseApplicationBenefit,
  getVerificationDetails,
  getApplicationAssessmentReport,
  trackApplicationStage
} = require('../controllers/applicationController');
const { authenticate } = require('../middleware/authMiddleware');

// Public/Applicant read-only application stage tracker
router.get('/track/:identifier', trackApplicationStage);

router.get('/', authenticate, getApplications);
router.get('/:id/report', authenticate, getApplicationAssessmentReport);
router.get('/:id', authenticate, getApplicationById);
router.get('/:applicationId/verification-details', authenticate, getVerificationDetails);
router.post('/submit', authenticate, submitApplication);
router.post('/evaluate', authenticate, evaluateApplicationRules);
router.patch('/:id/status', authenticate, updateApplicationStatus);
router.post('/:id/review', authenticate, reviewApplicationAction);
router.post('/:id/disburse', authenticate, disburseApplicationBenefit);

module.exports = router;
