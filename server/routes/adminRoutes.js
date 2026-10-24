const express = require('express');
const router = express.Router();
const { getAdminBenefitRecords } = require('../controllers/adminExplorerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get(
  '/benefit-records',
  authorize('RECORDS_ADMIN', 'SUPER_ADMIN', 'WELFARE_OFFICER', 'SCHEME_OFFICER', 'SCHEME_SUPERVISOR', 'VERIFICATION_OFFICER'),
  getAdminBenefitRecords
);

module.exports = router;
