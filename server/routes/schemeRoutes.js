const express = require('express');
const router = express.Router();
const {
  getSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  toggleSchemeStatus
} = require('../controllers/schemeController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getSchemes);
router.get('/:id', authenticate, getSchemeById);
router.post('/', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), createScheme);
router.put('/:id', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), updateScheme);
router.patch('/:id/toggle', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), toggleSchemeStatus);

module.exports = router;
