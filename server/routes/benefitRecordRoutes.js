const express = require('express');
const router = express.Router();
const { getBenefitRecords, getBenefitRecordById } = require('../controllers/benefitRecordController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, getBenefitRecords);
router.get('/:id', authenticate, getBenefitRecordById);

module.exports = router;
