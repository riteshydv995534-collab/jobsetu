const express = require('express');
const router = express.Router();
const {
  getIndividualHistory,
  getHouseholdHistory,
  getBenefitRecords,
  getBenefitRecordById
} = require('../controllers/benefitRecordController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/history/individual/:id', getIndividualHistory);
router.get('/history/household/:id', getHouseholdHistory);
router.get('/', getBenefitRecords);
router.get('/:id', getBenefitRecordById);

module.exports = router;
