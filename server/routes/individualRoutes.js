const express = require('express');
const router = express.Router();
const {
  getIndividuals,
  getIndividualById,
  createIndividual,
  updateIndividual,
  getPotentialBenefits,
  lookupByDemoIdentifier,
  getIndividualHousehold,
  getIndividualSchemes,
  getIndividualBenefitHistory
} = require('../controllers/individualController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, getIndividuals);
router.get('/lookup/:demoId', authenticate, lookupByDemoIdentifier);
router.get('/:id/potential-benefits', authenticate, getPotentialBenefits);
router.get('/:id/household', authenticate, getIndividualHousehold);
router.get('/:id/schemes', authenticate, getIndividualSchemes);
router.get('/:id/benefit-history', authenticate, getIndividualBenefitHistory);
router.get('/:id', authenticate, getIndividualById);
router.post('/', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), createIndividual);
router.put('/:id', authenticate, authorize('RECORDS_ADMIN', 'SUPER_ADMIN'), updateIndividual);

module.exports = router;
