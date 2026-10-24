const express = require('express');
const router = express.Router();
const {
  getReportAnalytics,
  getEligibilityReports,
  getAllocationReports
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/analytics', authenticate, getReportAnalytics);
router.get('/eligibility', authenticate, getEligibilityReports);
router.get('/allocations', authenticate, getAllocationReports);

module.exports = router;
