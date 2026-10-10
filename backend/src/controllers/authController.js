const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { generateCsrfToken, setCsrfCookie } = require('../middleware/csrf');
const { sendError } = require('../utils/errorResponse');

// Token durations
const ACCESS_TOKEN_EXPIRY = '15m';   // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Long-lived refresh token

const EMAIL_OTP_EXPIRY_MS = 10 * 60 * 1000;
const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_OTP_MAX_PER_HOUR = 5;

const sendEmailVerificationOtp = async ({ userId, email, name }) => {
  const now = new Date();

  const recent = await prisma.emailVerificationOtp.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (recent && now - new Date(recent.createdAt) < EMAIL_OTP_RESEND_COOLDOWN_MS) {
    const seconds = Math.ceil((EMAIL_OTP_RESEND_COOLDOWN_MS - (now - new Date(recent.createdAt))) / 1000);
    return { ok: false, code: 'COOLDOWN', retryAfterSeconds: seconds };
  }

  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const sentCount = await prisma.emailVerificationOtp.count({
    where: { userId, createdAt: { gte: windowStart } },
  });

  if (sentCount >= EMAIL_OTP_MAX_PER_HOUR) {
    return { ok: false, code: 'RATE_LIMIT' };
  }

  const otpPlain = crypto.randomInt(100000, 999999).toString();
  const otpHashed = await bcrypt.hash(otpPlain, 10);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MS);

  await prisma.emailVerificationOtp.create({
    data: {
      userId,
      otp: otpHashed,
      expiresAt,
    },
  });

  await emailService.sendEmail({
    to: email,
    subject: 'WashPro - Kode Verifikasi Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #4f46e5; text-align: center;">WashPro - Verifikasi Email</h2>
        <p>Halo <strong>${name || 'Pengguna'}</strong>,</p>
        <p>Gunakan kode OTP berikut untuk memverifikasi email Anda:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #0f172a; background: #f8fafc; padding: 16px 24px; border-radius: 10px;">${otpPlain}</span>
        </div>
        <p>Kode ini berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapa pun.</p>
      </div>
    `,
  });

  return { ok: true };
};

const createRefreshToken = async (userId, userAgent) => {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent || null,
    },
  });

  return { token, expiresAt };
};

/**
 * Helper: Set auth cookies (access token + refresh token + CSRF).
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token — httpOnly, short-lived
  res.cookie('auth_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 menit
    path: '/',
  });

  // Refresh token — httpOnly, long-lived, restricted path
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth', // Hanya dikirim ke auth endpoints
  });

  // CSRF token
  const csrfToken = generateCsrfToken();
  setCsrfCookie(res, csrfToken);
};

const buildAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      businessId: user.businessId,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

const revokeAllUserSessions = async (tx, userId) => {
  await tx.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

// LOGIC REGISTER
const registerOwner = async (req, res) => {
  const { businessName, ownerName, email, password, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      // Set trial 7 hari sejak registrasi
      const trialEndAt = new Date();
      trialEndAt.setDate(trialEndAt.getDate() + 7);

      const business = await tx.business.create({
        data: {
          name: businessName,
          phone,
          subscriptionStatus: 'TRIAL',
          trialEndAt,
        },
      });
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          password: hashedPassword,
          phone,
          role: 'OWNER',
          isEmailVerified: false,
          businessId: business.id
        }
      });
      
      // Buat Pengaturan Bisnis Default
      await tx.businessSetting.create({
        data: {
          businessId: business.id,
          allowStaffCustomers: true,
          allowStaffDashboard: false,
          allowStaffServices: false,
          allowStaffReports: false,
        }
      });

      // Buat Layanan Default Kiloan
      const defaultServices = [
        { name: 'Setrika', price: 4000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Kering Parfum', price: 5000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Standar 3 Hari', price: 6500, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Reguler 2 Hari', price: 7500, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Express 1 Hari', price: 9000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Kilat 12 Jam', price: 12000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Kilat 6 Jam', price: 15000, type: 'KILOAN', unit: 'kg' },
        // Layanan Satuan
        { name: 'Bedcover', price: 25000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Selimut', price: 15000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Seprai Set', price: 10000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Boneka', price: 20000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Karpet', price: 15000, type: 'SATUAN', unit: 'm2' },
        { name: 'Sepatu', price: 20000, type: 'SATUAN', unit: 'pasang' }
      ].map(s => ({ ...s, businessId: business.id }));

      await tx.service.createMany({ data: defaultServices });

      return { business, user };
    });
    
    const userWithoutPassword = { ...result.user };
    delete userWithoutPassword.password;

    sendEmailVerificationOtp({ userId: result.user.id, email: result.user.email, name: result.user.name }).catch(() => {});

    res.status(201).json({
      message: "Registrasi berhasil. Kode OTP verifikasi email telah dikirim.",
      requiresEmailVerification: true,
      email: result.user.email,
      data: { business: result.business, user: userWithoutPassword }
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }
    if (error?.code === 'P2022') {
      return res.status(500).json({ message: "Database belum termigrasi. Jalankan prisma migrate terlebih dahulu." });
    }
    sendError(res, error, 500);
  }
};

// LOGIC LOGIN
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Password salah" });

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { subscriptionStatus: true, deletedAt: true },
    });

    if (business?.deletedAt) {
      return res.status(403).json({ message: "Akun Anda ditangguhkan. Mohon chat admin.", code: 'BUSINESS_DELETED' });
    }
    if (business?.subscriptionStatus === 'SUSPENDED') {
      return res.status(403).json({ message: "Akun Anda ditangguhkan. Mohon chat admin.", code: 'BUSINESS_SUSPENDED' });
    }

    if (user.role === 'OWNER' && !user.isEmailVerified) {
      return res.status(403).json({
        message: "Email Anda belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.",
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const accessToken = buildAccessToken(user);

    const userAgent = req.headers['user-agent'];
    const { token: refreshToken } = await createRefreshToken(user.id, userAgent);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Login Berhasil",
      token: accessToken, // Backward compat untuk mobile/API client
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        mustChangePassword: user.mustChangePassword,
      }
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// GET SESSION — validasi cookie auth, return profil user
const getSession = async (req, res) => {
  try {
    const user = req.currentUser?.id === req.user.id ? req.currentUser : await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, businessId: true, phone: true, isEmailVerified: true, mustChangePassword: true },
    });
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    const { id, name, email, role, businessId, phone, isEmailVerified, mustChangePassword } = user;
    res.json({ user: { id, name, email, role, businessId, phone, isEmailVerified, mustChangePassword } });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  const { name, password, currentPassword, phone } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const data = {};
    if (name) data.name = name;
    if (password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(401).json({ message: "Password saat ini salah" });
      data.password = await bcrypt.hash(password, 10);
    }
    if (phone !== undefined) {
      data.phone = phone || null;
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data,
      }),
      ...(phone !== undefined && user.role === 'OWNER'
        ? [
            prisma.business.update({
              where: { id: user.businessId },
              data: { phone: phone || null },
            }),
          ]
        : []),
    ]);

    res.json({
      message: "Profil berhasil diperbarui",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        businessId: updatedUser.businessId,
        isEmailVerified: updatedUser.isEmailVerified,
        mustChangePassword: updatedUser.mustChangePassword,
      }
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// CHANGE PASSWORD (Authenticated)
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Password lama salah" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword, mustChangePassword: false },
      });
      await revokeAllUserSessions(tx, userId);
    });

    res.json({ message: 'Password berhasil diubah. Silakan login ulang di semua perangkat.' });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// Password recovery via email OTP, with atomic token consumption.
const { forgotPassword, verifyOtp, resetPassword } = require('./passwordResetController').userPasswordReset;

// REFRESH TOKEN — Generate new access token using refresh token
const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token tidak ditemukan. Silakan login ulang.' });
  }

  try {
    // Hash token untuk lookup di DB
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      // Token tidak valid atau sudah expired/revoked — clear cookies
      res.clearCookie('auth_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/api/auth' });
      res.clearCookie('csrf_token', { path: '/' });
      return res.status(401).json({ message: 'Sesi telah berakhir. Silakan login ulang.' });
    }

    const user = storedToken.user;

    const accessToken = buildAccessToken(user);

    // Set new access token cookie + refresh CSRF
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json({
      message: 'Token berhasil diperbarui',
      token: accessToken, // Backward compat
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Kode OTP tidak valid atau sudah kedaluwarsa." });

    if (user.isEmailVerified) {
      return res.json({ message: "Email sudah terverifikasi. Silakan login." });
    }

    const otpRecord = await prisma.emailVerificationOtp.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        attempts: { lt: 5 },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Kode OTP tidak valid atau sudah kedaluwarsa." });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      await prisma.emailVerificationOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      const remaining = 4 - otpRecord.attempts;
      return res.status(400).json({
        message: `Kode OTP salah. ${remaining > 0 ? `Sisa percobaan: ${remaining}` : 'OTP telah hangus, silakan kirim ulang.'}`,
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true, mustChangePassword: user.role === 'STAFF' ? user.mustChangePassword : false },
      }),
      prisma.emailVerificationOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.emailVerificationOtp.updateMany({
        where: { userId: user.id, usedAt: null, id: { not: otpRecord.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: "Verifikasi email berhasil. Silakan login." });
  } catch (error) {
    sendError(res, error, 500);
  }
};

const resendEmailOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: "Jika email terdaftar, OTP verifikasi akan dikirim." });
    if (user.isEmailVerified) return res.json({ message: "Email sudah terverifikasi. Silakan login." });

    const result = await sendEmailVerificationOtp({ userId: user.id, email: user.email, name: user.name });
    if (!result.ok && result.code === 'COOLDOWN') {
      return res.status(429).json({ message: `Terlalu cepat. Coba lagi dalam ${result.retryAfterSeconds} detik.`, retryAfterSeconds: result.retryAfterSeconds });
    }
    if (!result.ok && result.code === 'RATE_LIMIT') {
      return res.status(429).json({ message: "Terlalu banyak permintaan OTP. Silakan coba lagi nanti." });
    }

    res.json({ message: "OTP verifikasi email telah dikirim." });
  } catch (error) {
    sendError(res, error, 500);
  }
};

module.exports = {
  registerOwner,
  login,
  getSession,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  refreshAccessToken,
  verifyEmailOtp,
  resendEmailOtp,
};
