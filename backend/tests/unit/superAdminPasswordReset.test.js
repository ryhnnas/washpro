const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../src/config/prisma');
const emailService = require('../../src/services/emailService');
const { validateCsrf } = require('../../src/middleware/csrf');
const superAdminRoutes = require('../../src/routes/superAdminRoutes');
const authRoutes = require('../../src/routes/authRoutes');

jest.mock('../../src/config/prisma', () => ({
  superAdmin: { findUnique: jest.fn(), update: jest.fn() },
  superAdminPasswordResetOtp: {
    create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(),
    updateMany: jest.fn(), deleteMany: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  passwordResetOtp: { findUnique: jest.fn() },
  $transaction: jest.fn(),
}));
jest.mock('../../src/services/emailService', () => ({ sendEmail: jest.fn(), isConfigured: () => true }));
jest.mock('../../src/services/whatsappService', () => ({}));

const app = express();
app.use(express.json(), cookieParser(), validateCsrf);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/auth', authRoutes);

describe('Superadmin password recovery HTTP flow', () => {
  let admin, otp, previousSecret, previousUserSecret;
  beforeAll(() => {
    previousSecret = process.env.SUPERADMIN_JWT_SECRET;
    previousUserSecret = process.env.JWT_SECRET;
    // Intentionally equal to ensure account-type checks do not rely on distinct secrets.
    process.env.SUPERADMIN_JWT_SECRET = process.env.JWT_SECRET = 'isolated-superadmin-reset-test-secret';
  });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.SUPERADMIN_JWT_SECRET;
    else process.env.SUPERADMIN_JWT_SECRET = previousSecret;
    if (previousUserSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousUserSecret;
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    otp = null;
    admin = { id: 'admin', name: 'Test Admin', email: 'admin@example.test', password: await bcrypt.hash('OldAdmin1!', 10), sessionVersion: 0 };
    prisma.superAdmin.findUnique.mockImplementation(async ({ where }) =>
      where.id === admin.id || where.email === admin.email ? { ...admin } : null);
    prisma.superAdmin.update.mockImplementation(async ({ data }) => {
      if (data.password) admin.password = data.password;
      if (data.sessionVersion) admin.sessionVersion += data.sessionVersion.increment;
      return { ...admin };
    });
    prisma.superAdminPasswordResetOtp.create.mockImplementation(async ({ data }) => {
      otp = { id: 'admin-otp', usedAt: null, attempts: 0, ...data };
      return { ...otp };
    });
    prisma.superAdminPasswordResetOtp.findFirst.mockImplementation(async () => otp && { ...otp });
    prisma.superAdminPasswordResetOtp.findUnique.mockImplementation(async () => otp && { ...otp });
    prisma.superAdminPasswordResetOtp.updateMany.mockImplementation(async ({ where, data }) => {
      if (!otp || otp.id !== where.id || otp.superAdminId !== where.superAdminId || otp.usedAt !== where.usedAt ||
        (where.attempts && otp.attempts >= where.attempts.lt) ||
        (where.expiresAt && otp.expiresAt <= where.expiresAt.gt)) return { count: 0 };
      if (data.usedAt) otp.usedAt = data.usedAt;
      if (data.attempts) otp.attempts += data.attempts.increment;
      return { count: 1 };
    });
    prisma.superAdminPasswordResetOtp.deleteMany.mockImplementation(async ({ where }) => {
      if (otp && (!where.id || otp.id !== where.id.not)) otp = null;
      return { count: 0 };
    });
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    prisma.user.findUnique.mockResolvedValue(null);
    emailService.sendEmail.mockResolvedValue({ ok: true });
  });

  const getResetToken = async () => {
    const forgot = await request(app).post('/api/superadmin/forgot-password').send({ email: admin.email });
    expect(forgot.status).toBe(200);
    const code = emailService.sendEmail.mock.calls.at(-1)[0].html.match(/>(\d{6})<\/span>/)[1];
    const verify = await request(app).post('/api/superadmin/verify-otp').send({ email: admin.email, otp: code });
    expect(verify.status).toBe(200);
    return verify.body.resetToken;
  };

  it('recovers without a session, rejects old sessions, and accepts a new login', async () => {
    const oldToken = jwt.sign({ id: admin.id, role: 'SUPERADMIN', sessionVersion: 0 }, process.env.SUPERADMIN_JWT_SECRET);
    const resetToken = await getResetToken();
    const reset = await request(app).post('/api/superadmin/reset-password').send({ resetToken, newPassword: 'NewAdmin2!' });
    expect(reset.status).toBe(200);
    expect(await bcrypt.compare('NewAdmin2!', admin.password)).toBe(true);
    expect(await bcrypt.compare('OldAdmin1!', admin.password)).toBe(false);
    const oldSession = await request(app).get('/api/superadmin/me').set('Authorization', `Bearer ${oldToken}`);
    expect(oldSession.status).toBe(401);
    expect(oldSession.body.code).toBe('SESSION_REVOKED');
    const login = await request(app).post('/api/superadmin/login').send({ email: admin.email, password: 'NewAdmin2!' });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'].find((value) => value.startsWith('superadmin_token='));
    expect((await request(app).get('/api/superadmin/me').set('Cookie', cookie.split(';')[0])).status).toBe(200);
    expect((await request(app).post('/api/superadmin/reset-password').send({ resetToken, newPassword: 'OtherAdmin3!' })).status).toBe(400);
  });

  it('accepts only one concurrent reset', async () => {
    const resetToken = await getResetToken();
    const results = await Promise.all([
      request(app).post('/api/superadmin/reset-password').send({ resetToken, newPassword: 'FirstAdmin1!' }),
      request(app).post('/api/superadmin/reset-password').send({ resetToken, newPassword: 'SecondAdmin2!' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(admin.sessionVersion).toBe(1);
  });

  it('rejects a superadmin reset token at the tenant endpoint', async () => {
    const resetToken = await getResetToken();
    const result = await request(app).post('/api/auth/reset-password').send({ resetToken, newPassword: 'TenantPassword1!' });
    expect(result.status).toBe(400);
    expect(otp.usedAt).toBeNull();
  });

  it('rejects a tenant reset token at the superadmin endpoint', async () => {
    const resetToken = jwt.sign({ userId: admin.id, otpId: 'admin-otp', purpose: 'password-reset', accountType: 'USER' }, process.env.JWT_SECRET);
    const result = await request(app).post('/api/superadmin/reset-password').send({ resetToken, newPassword: 'OtherPassword1!' });
    expect(result.status).toBe(400);
  });
});
