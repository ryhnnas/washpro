const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const { validateCsrf } = require('./middleware/csrf');
const { requestLogger } = require('./utils/logger');
const sanitizeInput = require('./middleware/sanitize');

// ==================== ENV VALIDATION ====================
const requiredEnv = ['JWT_SECRET', 'SUPERADMIN_JWT_SECRET', 'DATABASE_URL'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`❌ [Startup] Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingRoutes = require('./routes/settingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const reportRoutes = require('./routes/reportRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// 1. Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL].filter(Boolean),
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));

// 2. CORS Configuration
const allowedOrigins = [
  'http://localhost:5173', // Vite default
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// 3. Request Logging (hanya di dev atau jika tidak sedang testing)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4. Rate Limiting (Global)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { message: "Terlalu banyak permintaan, silakan coba lagi nanti." },
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true'
});
app.use(globalLimiter);

// 5. Body Parser — limit kecil karena upload pakai multipart (multer), bukan base64 JSON
app.use(express.json({ limit: '100kb' }));

// 5b. Input Sanitization — strip HTML tags dari semua string di req.body
app.use(sanitizeInput);

// 5c. Request Logger — attach requestId dan structured logger ke setiap request
app.use(requestLogger);

// 6. Cookie Parser — untuk membaca httpOnly auth cookie dan CSRF cookie
app.use(cookieParser());

// 7. CSRF Protection — validasi pada state-changing requests (POST/PUT/PATCH/DELETE)
app.use(validateCsrf);

// Serve static files — uploads dilindungi auth (lihat uploadRoutes)
// CATATAN: /uploads/payments/ TIDAK lagi di-serve sebagai static.
// Gunakan /api/uploads/payments/:filename dengan auth.
const uploadRoutes = require('./routes/uploadRoutes');

// Gunakan Routes
app.use('/api/uploads', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const { getCacheStats } = require('./middleware/checkSubscription');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    subscriptionCache: getCacheStats(),
  });
});

// CSRF Token endpoint — frontend calls this on app init to get a CSRF cookie
app.get('/api/auth/csrf-token', (req, res) => {
  const { generateCsrfToken, setCsrfCookie } = require('./middleware/csrf');
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.json({ message: 'CSRF token set' });
});

// Logout endpoint — clears httpOnly cookies and revokes refresh token
app.post('/api/auth/logout', async (req, res) => {
  // Revoke refresh token if present
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    try {
      const crypto = require('crypto');
      const prisma = require('./config/prisma');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Best-effort revocation
    }
  }

  res.clearCookie('auth_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('csrf_token', { path: '/' });
  res.json({ message: 'Logout berhasil' });
});

// Test Route
app.get('/', (req, res) => res.send("WashPro API Active"));

// 6. Global Error Handler (Must be last)
app.use(errorMiddleware);

module.exports = app;
