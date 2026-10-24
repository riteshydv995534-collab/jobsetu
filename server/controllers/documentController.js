const path = require('path');
const fs = require('fs');
const DocumentMetadata = require('../models/DocumentMetadata');
const { logAudit } = require('../services/auditService');

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or file rejected due to unsupported type/size.'
      });
    }

    const { linkedEntityType, linkedEntityId, documentType } = req.body;

    const count = await DocumentMetadata.countDocuments();
    const documentId = `DOC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const document = new DocumentMetadata({
      documentId,
      originalName: req.file.originalname,
      storedFilename: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      linkedEntityType: linkedEntityType || 'APPLICATION',
      linkedEntityId: linkedEntityId || 'UNLINKED',
      documentType: documentType || 'GENERAL_DOCUMENT',
      verificationStatus: 'VERIFIED',
      uploadedBy: req.user?._id || null
    });

    await document.save();

    await logAudit({
      actingUser: req.user,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'DocumentMetadata',
      entityId: document._id,
      afterSnapshot: {
        documentId: document.documentId,
        fileName: document.originalName,
        linkedEntityType,
        linkedEntityId
      },
      reasonNotes: 'Demonstration evidence document uploaded and verified',
      req
    });

    res.status(201).json({
      success: true,
      message: `Document ${document.documentId} uploaded successfully.`,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const { linkedEntityType, linkedEntityId } = req.query;

    const query = {};
    if (linkedEntityType && linkedEntityType !== 'ALL') query.linkedEntityType = linkedEntityType;
    if (linkedEntityId) query.linkedEntityId = linkedEntityId;

    const documents = await DocumentMetadata.find(query)
      .populate('uploadedBy', 'name role')
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await DocumentMetadata.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document record not found.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', doc.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document binary file missing from storage.' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  downloadDocument
};
