const express = require('express');
const router = express.Router();
const { registerOwner, login } = require('../controllers/authController');

// Jalur: /api/auth/register
router.post('/register', registerOwner);

// Jalur: /api/auth/login
router.post('/login', login);

module.exports = router;