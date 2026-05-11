const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerOwner, login, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { registerSchema, loginSchema, updateProfileSchema } = require('../schemas/authSchema');

// Rate limiter khusus untuk Auth (mencegah brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maksimal 20 percobaan per 15 menit
  message: { message: "Terlalu banyak percobaan login/register, silakan coba lagi nanti." }
});

// Jalur: /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), registerOwner);

// Jalur: /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// Jalur: /api/auth/profile
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);

module.exports = router;