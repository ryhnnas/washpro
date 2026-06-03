const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerOwner, login, updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword, refreshAccessToken } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } = require('../schemas/authSchema');

// Skip rate limiting saat testing atau saat flag DISABLE_RATE_LIMIT aktif.
// Production tetap terlindungi (flag tidak di-set).
const skipRateLimit = () =>
  process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

// Rate limiter khusus untuk Auth (mencegah brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maksimal 20 percobaan per 15 menit
  message: { message: "Terlalu banyak percobaan login/register, silakan coba lagi nanti." },
  skip: skipRateLimit,
});

// Rate limiter ketat untuk forgot password (anti-abuse)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 3, // Maksimal 3 request per 15 menit
  message: { message: "Terlalu banyak permintaan reset password. Silakan coba lagi dalam 15 menit." },
  skip: skipRateLimit,
});

// Rate limiter untuk verify OTP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Terlalu banyak percobaan verifikasi OTP. Silakan coba lagi nanti." },
  skip: skipRateLimit,
});

// Jalur: /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), registerOwner);

// Jalur: /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// Jalur: /api/auth/profile
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);

// Jalur: /api/auth/change-password (Authenticated)
router.put('/change-password', authMiddleware, validate(changePasswordSchema), changePassword);

// Jalur: /api/auth/forgot-password (Public)
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);

// Jalur: /api/auth/verify-otp (Public)
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), verifyOtp);

// Jalur: /api/auth/reset-password (Public)
router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), resetPassword);

// Jalur: /api/auth/refresh (Public — menggunakan refresh_token cookie)
router.post('/refresh', refreshAccessToken);

module.exports = router;