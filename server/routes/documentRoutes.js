const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadDocument, getDocuments, downloadDocument } = require('../controllers/documentController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/upload', authenticate, upload.single('file'), uploadDocument);
router.get('/', authenticate, getDocuments);
router.get('/:id/download', authenticate, downloadDocument);

module.exports = router;
