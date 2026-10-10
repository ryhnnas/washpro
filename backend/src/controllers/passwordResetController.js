const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const emailService = require('../services/emailService');
const { DomainError } = require('../utils/domainError');
const { handleControllerError } = require('../utils/errorResponse');

const GENERIC_MESSAGE = 'Jika email terdaftar, kode OTP akan dikirim ke email Anda.';
const emailUnavailable = (res) => res.status(503).json({
  code: 'EMAIL_UNAVAILABLE',
  message: 'Pengiriman OTP belum tersedia. Silakan coba lagi nanti atau hubungi admin.',
});

// Separate account tables, OTP tables and token scopes; both flows share the same safeguards.
const createPasswordResetController = (accountType) => {
  const isUser = accountType === 'USER';
  const accountModel = isUser ? 'user' : 'superAdmin';
  const otpModel = isUser ? 'passwordResetOtp' : 'superAdminPasswordResetOtp';
  const accountKey = isUser ? 'userId' : 'superAdminId';
  const secret = () => process.env[isUser ? 'JWT_SECRET' : 'SUPERADMIN_JWT_SECRET'];

  const forgotPassword = async (req, res) => {
    if (!emailService.isConfigured()) return emailUnavailable(res);
    try {
      const account = await prisma[accountModel].findUnique({ where: { email: req.body.email } });
      if (!account) return res.json({ message: GENERIC_MESSAGE });

      await prisma[otpModel].deleteMany({ where: { [accountKey]: account.id, usedAt: null } });
      const otpPlain = crypto.randomInt(100000, 1000000).toString();
      const record = await prisma[otpModel].create({
        data: {
          [accountKey]: account.id,
          otp: await bcrypt.hash(otpPlain, 10),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      try {
        const delivery = await emailService.sendEmail({
          to: account.email,
          subject: `WashPro - Kode Reset Password${isUser ? '' : ' Superadmin'}`,
          requireDelivery: true,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
            <h2>WashPro - Reset Password${isUser ? '' : ' Superadmin'}</h2>
            <p>Gunakan kode OTP berikut untuk mengatur ulang kata sandi Anda:</p>
            <span style="font-size:32px;font-weight:700;letter-spacing:8px">${otpPlain}</span>
            <p>Kode berlaku selama 5 menit. Jangan bagikan kepada siapa pun.</p>
            <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
          </div>`,
        });
        if (!delivery?.ok || delivery.skipped) throw new Error('EMAIL_NOT_DELIVERED');
      } catch (error) {
        await prisma[otpModel].deleteMany({ where: { id: record.id, [accountKey]: account.id } });
        console.error('[PasswordReset] Email delivery failed:', error.code || 'DELIVERY_FAILED');
        return emailUnavailable(res);
      }
      return res.json({ message: GENERIC_MESSAGE });
    } catch (error) {
      return handleControllerError(res, error, 'Gagal memproses permintaan reset password.');
    }
  };

  const verifyOtp = async (req, res) => {
    try {
      const account = await prisma[accountModel].findUnique({ where: { email: req.body.email } });
      const invalid = () => res.status(400).json({ message: 'Kode OTP tidak valid atau sudah kedaluwarsa.' });
      if (!account) return invalid();
      const record = await prisma[otpModel].findFirst({
        where: { [accountKey]: account.id, usedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!record) return invalid();
      // Reserve a guess before comparing; concurrent requests share a strict five-guess budget.
      const reserved = await prisma[otpModel].updateMany({
        where: {
          id: record.id, [accountKey]: account.id, usedAt: null,
          attempts: { lt: 5 }, expiresAt: { gt: new Date() },
        },
        data: { attempts: { increment: 1 } },
      });
      if (reserved.count !== 1 || !await bcrypt.compare(req.body.otp, record.otp)) return invalid();
      const resetToken = jwt.sign(
        { accountId: account.id, accountType, purpose: 'password-reset', otpId: record.id },
        secret(),
        { expiresIn: '10m' },
      );
      return res.json({ message: 'OTP valid. Silakan set password baru.', resetToken });
    } catch (error) {
      return handleControllerError(res, error, 'Gagal memverifikasi OTP.');
    }
  };

  const resetPassword = async (req, res) => {
    try {
      let payload;
      try {
        payload = jwt.verify(req.body.resetToken, secret());
      } catch {
        return res.status(400).json({ message: 'Token tidak valid atau sudah kedaluwarsa. Silakan ulangi proses reset.' });
      }
      if (payload.purpose !== 'password-reset' || payload.accountType !== accountType ||
          typeof payload.accountId !== 'string' || typeof payload.otpId !== 'string') {
        return res.status(400).json({ message: 'Token tidak valid.' });
      }
      const password = await bcrypt.hash(req.body.newPassword, 10);
      await prisma.$transaction(async (tx) => {
        // A conditional write locks/claims the OTP inside the transaction. Only one request can win.
        const claimed = await tx[otpModel].updateMany({
          where: { id: payload.otpId, [accountKey]: payload.accountId, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new DomainError(400, 'RESET_TOKEN_USED', 'Token sudah digunakan. Silakan minta OTP baru.');
        }
        await tx[accountModel].update({
          where: { id: payload.accountId },
          data: { password, sessionVersion: { increment: 1 }, ...(isUser ? { mustChangePassword: false } : {}) },
        });
        if (isUser) {
          await tx.refreshToken.updateMany({
            where: { userId: payload.accountId, revokedAt: null }, data: { revokedAt: new Date() },
          });
        }
        await tx[otpModel].deleteMany({ where: { [accountKey]: payload.accountId, id: { not: payload.otpId } } });
      });
      return res.json({ message: 'Password berhasil direset. Silakan login dengan password baru.' });
    } catch (error) {
      return handleControllerError(res, error, 'Gagal mereset password.');
    }
  };
  return { forgotPassword, verifyOtp, resetPassword };
};

module.exports = {
  userPasswordReset: createPasswordResetController('USER'),
  superAdminPasswordReset: createPasswordResetController('SUPERADMIN'),
};
