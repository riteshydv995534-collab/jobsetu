const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, getAuditLogs);

module.exports = router;
