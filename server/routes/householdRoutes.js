const express = require('express');
const router = express.Router();
const {
  getHouseholds,
  getHouseholdById,
  createHousehold,
  addMember,
  moveMember,
  splitHousehold,
  getPotentialBenefits,
  getHouseholdMembers,
  getHouseholdSchemes,
  getHouseholdBenefitHistory,
  getHouseholdBenefitTimeline
} = require('../controllers/householdController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getHouseholds);
router.get('/:id/potential-benefits', authenticate, getPotentialBenefits);
router.get('/:id/members', authenticate, getHouseholdMembers);
router.get('/:id/schemes', authenticate, getHouseholdSchemes);
router.get('/:id/benefit-history', authenticate, getHouseholdBenefitHistory);
router.get('/:id/benefit-timeline', authenticate, getHouseholdBenefitTimeline);
router.get('/:id', authenticate, getHouseholdById);
router.post('/', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), createHousehold);
router.post('/:id/members', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), addMember);
router.post('/move-member', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), moveMember);
router.post('/split', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), splitHousehold);

module.exports = router;
