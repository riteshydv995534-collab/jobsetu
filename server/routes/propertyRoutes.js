const express = require('express');
const router = express.Router();
const {
  getProperties,
  getPropertyById,
  createProperty,
  associateHousehold
} = require('../controllers/propertyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getProperties);
router.get('/:id', authenticate, getPropertyById);
router.post('/', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), createProperty);
router.post('/:id/associate', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), associateHousehold);

module.exports = router;
