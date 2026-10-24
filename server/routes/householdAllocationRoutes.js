const express = require('express');
const router = express.Router();
const {
  getAllocations,
  getAllocationById,
  evaluateAllocation,
  reviewAllocation,
  disburseAllocation
} = require('../controllers/householdAllocationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', getAllocations);
router.get('/:id', getAllocationById);
router.post('/evaluate', evaluateAllocation);
router.post(
  '/:id/review',
  authorize('WELFARE_OFFICER', 'RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  reviewAllocation
);
router.post(
  '/:id/recommendation',
  authorize('WELFARE_OFFICER', 'RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  reviewAllocation
);
router.post(
  '/:id/decision',
  authorize('WELFARE_OFFICER', 'RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  reviewAllocation
);
router.post(
  '/:id/disburse',
  authorize('WELFARE_OFFICER', 'RECORDS_ADMIN', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  disburseAllocation
);

module.exports = router;
