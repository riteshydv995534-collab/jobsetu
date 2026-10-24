const express = require('express');
const router = express.Router();
const { getDisbursements, recordDisbursement } = require('../controllers/disbursementController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getDisbursements);
router.post(
  '/record',
  authenticate,
  authorize('WELFARE_OFFICER', 'RECORDS_ADMIN', 'SUPER_ADMIN', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  recordDisbursement
);

module.exports = router;
