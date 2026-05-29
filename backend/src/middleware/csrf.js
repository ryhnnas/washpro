const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 * 
 * Strategi: Double Submit Cookie Pattern
 * - Server generate CSRF token dan set di cookie (non-httpOnly, agar JS bisa baca)
 * - Frontend baca cookie dan kirim token di header X-CSRF-Token
 * - Server validasi bahwa header === cookie
 * 
 * Ini aman karena:
 * - Attacker dari domain lain tidak bisa membaca cookie (Same-Origin Policy)
 * - Attacker tidak bisa set custom header di cross-origin request tanpa CORS preflight
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate CSRF token dan set di cookie.
 * Dipanggil setelah login berhasil atau saat GET /api/auth/csrf-token.
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Set CSRF cookie pada response.
 */
const setCsrfCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend JS harus bisa membaca ini
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 hari (sama dengan JWT)
    path: '/',
  });
};

/**
 * Middleware: Validasi CSRF token pada request yang mengubah state (POST, PUT, PATCH, DELETE).
 * GET dan HEAD di-skip karena seharusnya idempotent.
 */
const validateCsrf = (req, res, next) => {
  // Skip untuk safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip jika request menggunakan Authorization header (API client / SuperAdmin)
  // Token di header sudah cukup sebagai proof of intent
  if (req.headers['authorization']) {
    return next();
  }

  // Skip untuk public auth endpoints (belum punya session, tidak perlu CSRF)
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/verify-otp',
    '/api/auth/reset-password',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/csrf-token',
    '/api/superadmin/login',
  ];
  if (publicPaths.some(p => req.path === p || req.originalUrl === p)) {
    return next();
  }

  // Validasi double-submit: cookie vs header
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      message: 'CSRF token tidak ditemukan. Silakan refresh halaman.',
      code: 'CSRF_MISSING',
    });
  }

  if (cookieToken !== headerToken) {
    return res.status(403).json({
      message: 'CSRF token tidak valid. Silakan refresh halaman.',
      code: 'CSRF_INVALID',
    });
  }

  next();
};

module.exports = {
  generateCsrfToken,
  setCsrfCookie,
  validateCsrf,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
