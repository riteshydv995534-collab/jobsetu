const express = require('express');
const router = express.Router();
const { getCalendarActivity, getDayDetails } = require('../controllers/calendarController');
const { authenticate, enforceSchemeAccess } = require('../middleware/authMiddleware');

router.get('/activity', authenticate, enforceSchemeAccess('schemeId'), getCalendarActivity);
router.get('/date/:date', authenticate, enforceSchemeAccess('schemeId'), getDayDetails);

module.exports = router;
