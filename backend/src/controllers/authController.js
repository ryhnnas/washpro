const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const whatsappService = require('../services/whatsappService');
const { generateCsrfToken, setCsrfCookie } = require('../middleware/csrf');
const { sendError } = require('../utils/errorResponse');

// Token durations
const ACCESS_TOKEN_EXPIRY = '15m';   // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Long-lived refresh token

/**
 * Helper: Generate refresh token, hash it, store in DB.
 */
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
          subscriptionStatus: 'TRIAL',
          trialEndAt,
        },
      });
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          password: hashedPassword,
          phone: phone || null,
          role: 'OWNER',
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
          allowStaffSettings: false
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
    
    res.status(201).json({ message: "Registrasi Berhasil", data: { business: result.business, user: userWithoutPassword } });
  } catch (error) {
    res.status(400).json({ error: "Email sudah terdaftar atau data tidak valid" });
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

    // Generate short-lived access token
    const accessToken = jwt.sign(
      { id: user.id, businessId: user.businessId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate long-lived refresh token
    const userAgent = req.headers['user-agent'];
    const { token: refreshToken } = await createRefreshToken(user.id, userAgent);

    // Set httpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Login Berhasil",
      token: accessToken, // Backward compat untuk mobile/API client
      user: { id: user.id, name: user.name, role: user.role, businessId: user.businessId }
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  const { name, password, phone } = req.body;
  const userId = req.user.id;

  try {
    const data = {};
    if (name) data.name = name;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (phone !== undefined) {
      data.phone = phone || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    res.json({
      message: "Profil berhasil diperbarui",
      user: { id: updatedUser.id, name: updatedUser.name, phone: updatedUser.phone, role: updatedUser.role, businessId: updatedUser.businessId }
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
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password berhasil diubah" });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// FORGOT PASSWORD — Generate & Send OTP via WhatsApp SuperAdmin
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: { select: { phone: true } } },
    });

    // Anti-enumeration: selalu return response yang sama
    if (!user) {
      return res.json({ message: "Jika email terdaftar, kode OTP akan dikirim ke WhatsApp terdaftar." });
    }

    // Tentukan nomor tujuan: user.phone > business.phone
    const targetPhone = user.phone || user.business?.phone;
    if (!targetPhone) {
      return res.status(400).json({
        message: "Nomor WhatsApp belum terdaftar pada akun Anda. Hubungi pemilik usaha untuk reset password.",
      });
    }

    // Hapus OTP lama yang belum expired untuk user ini
    await prisma.passwordResetOtp.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate OTP 6 digit
    const otpPlain = crypto.randomInt(100000, 999999).toString();
    const otpHashed = await bcrypt.hash(otpPlain, 10);

    // Simpan OTP (expires 5 menit)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otp: otpHashed,
        expiresAt,
      },
    });

    // Kirim OTP via WhatsApp SuperAdmin
    const message = `🔐 *WashPro - Kode Reset Password*\n${'━'.repeat(28)}\n\nKode OTP Anda: *${otpPlain}*\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapapun.\n\n_Jika Anda tidak merasa meminta reset password, abaikan pesan ini._`;

    whatsappService.sendMessage({
      businessId: 'SUPERADMIN',
      phone: targetPhone,
      message,
    }).catch((err) => {
      console.error('[FORGOT-PASSWORD] Gagal kirim OTP via WA:', err.message);
    });

    res.json({ message: "Jika email terdaftar, kode OTP akan dikirim ke WhatsApp terdaftar." });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// VERIFY OTP — Return short-lived reset token
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Kode OTP tidak valid atau sudah kedaluwarsa." });

    // Cari OTP terbaru yang belum expired, belum dipakai, dan attempts < 5
    const otpRecord = await prisma.passwordResetOtp.findFirst({
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

    // Verifikasi OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      // Increment attempts
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      const remaining = 4 - otpRecord.attempts;
      return res.status(400).json({
        message: `Kode OTP salah. ${remaining > 0 ? `Sisa percobaan: ${remaining}` : 'OTP telah hangus, silakan minta ulang.'}`,
      });
    }

    // OTP valid — generate short-lived reset token (10 menit)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset', otpId: otpRecord.id },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ message: "OTP valid. Silakan set password baru.", resetToken });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// RESET PASSWORD — Using reset token from verifyOtp
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    // Verify token
    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Token tidak valid atau sudah kedaluwarsa. Silakan ulangi proses reset." });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ message: "Token tidak valid." });
    }

    // Cek apakah OTP sudah dipakai (prevent reuse)
    const otpRecord = await prisma.passwordResetOtp.findUnique({
      where: { id: payload.otpId },
    });

    if (!otpRecord || otpRecord.usedAt) {
      return res.status(400).json({ message: "Token sudah digunakan. Silakan minta OTP baru." });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: payload.userId },
        data: { password: hashedPassword },
      }),
      // Tandai OTP sebagai sudah dipakai
      prisma.passwordResetOtp.update({
        where: { id: payload.otpId },
        data: { usedAt: new Date() },
      }),
      // Hapus semua OTP lama untuk user ini
      prisma.passwordResetOtp.deleteMany({
        where: { userId: payload.userId, id: { not: payload.otpId } },
      }),
    ]);

    res.json({ message: "Password berhasil direset. Silakan login dengan password baru." });
  } catch (error) {
    sendError(res, error, 500);
  }
};

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

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, businessId: user.businessId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

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
      user: { id: user.id, name: user.name, role: user.role, businessId: user.businessId },
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

module.exports = { registerOwner, login, updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword, refreshAccessToken };