const express = require('express');
const router = express.Router();
const {
  getDuplicateAlerts,
  getDuplicateAlertById,
  recordReviewDecision
} = require('../controllers/duplicateAlertController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getDuplicateAlerts);
router.get('/:id', authenticate, getDuplicateAlertById);
router.post(
  '/:id/decision',
  authenticate,
  authorize('WELFARE_OFFICER', 'RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  recordReviewDecision
);

module.exports = router;
