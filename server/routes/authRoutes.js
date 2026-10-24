const express = require('express');
const router = express.Router();
const { register, login, logout, getCurrentUser, getDemoAccounts } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.get('/demo-accounts', getDemoAccounts);

module.exports = router;
