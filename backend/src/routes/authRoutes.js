const express = require('express');
const router = express.Router();
const { registerOwner, login, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Jalur: /api/auth/register
router.post('/register', registerOwner);

// Jalur: /api/auth/login
router.post('/login', login);

// Jalur: /api/auth/profile
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;