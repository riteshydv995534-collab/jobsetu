const express = require('express');
const router = express.Router();
const {
  evaluateIndividualEligibility,
  evaluateHouseholdEligibility
} = require('../controllers/eligibilityController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/individual/:id/evaluate', evaluateIndividualEligibility);
router.post('/household/:id/evaluate', evaluateHouseholdEligibility);

module.exports = router;
