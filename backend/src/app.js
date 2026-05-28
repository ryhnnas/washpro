const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: '../.env' });

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
app.use(helmet());

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
  skip: () => process.env.NODE_ENV === 'test' // Skip rate limit saat testing
});
app.use(globalLimiter);

// 5. Body Parser — limit kecil karena upload pakai multipart (multer), bukan base64 JSON
app.use(express.json({ limit: '100kb' }));

// Serve static files (foto bukti bayar)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Gunakan Routes
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
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Test Route
app.get('/', (req, res) => res.send("WashPro API Active"));

// 6. Global Error Handler (Must be last)
app.use(errorMiddleware);

module.exports = app;
