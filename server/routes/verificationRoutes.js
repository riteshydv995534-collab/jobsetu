const express = require('express');
const router = express.Router();
const { getVerificationDetails } = require('../controllers/applicationController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/:applicationId', getVerificationDetails);

module.exports = router;
