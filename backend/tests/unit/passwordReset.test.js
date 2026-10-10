const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../src/config/prisma');
const emailService = require('../../src/services/emailService');
const { forgotPassword, verifyOtp, resetPassword, login } = require('../../src/controllers/authController');
const authMiddleware = require('../../src/middleware/auth');
const { resetPasswordSchema } = require('../../src/schemas/authSchema');

jest.mock('../../src/config/prisma', () => {
  const client = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetOtp: {
      create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn(), create: jest.fn() },
    business: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  return client;
});
jest.mock('../../src/services/emailService', () => ({ sendEmail: jest.fn(), isConfigured: jest.fn(() => true) }));

const OLD_PASSWORD = 'BeforeReset1!';
const NEW_PASSWORD = 'AfterReset2!';
const response = () => ({
  statusCode: 200,
  status: jest.fn(function (code) { this.statusCode = code; return this; }),
  json: jest.fn(function (body) { this.body = body; return this; }),
  cookie: jest.fn(), clearCookie: jest.fn(),
});
const invoke = async (controller, body) => {
  const res = response();
  await controller({ body, headers: { 'user-agent': 'password-reset-test' } }, res);
  return res;
};

describe('Password recovery for tenant users', () => {
  let user, otps, refreshTokens, previousSecret, otpSequence;

  beforeAll(() => {
    previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'isolated-password-reset-test-secret';
  });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    user = {
      id: 'tenant-user', businessId: 'business', name: 'Test User',
      email: 'tenant@example.test', role: 'OWNER',
      password: await bcrypt.hash(OLD_PASSWORD, 10), sessionVersion: 0,
      isEmailVerified: true, mustChangePassword: false,
    };
    otps = [];
    otpSequence = 0;
    refreshTokens = [{ userId: user.id, revokedAt: null }];
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id === user.id || where.email === user.email ? { ...user } : null);
    prisma.user.update.mockImplementation(async ({ data }) => {
      if (data.password) user.password = data.password;
      if (data.mustChangePassword !== undefined) user.mustChangePassword = data.mustChangePassword;
      if (data.sessionVersion) user.sessionVersion += data.sessionVersion.increment;
      return { ...user };
    });
    prisma.passwordResetOtp.create.mockImplementation(async ({ data }) => {
      const record = { id: `otp-${++otpSequence}`, attempts: 0, usedAt: null, createdAt: new Date(), ...data };
      otps.push(record);
      return { ...record };
    });
    prisma.passwordResetOtp.findUnique.mockImplementation(async ({ where }) => {
      const record = otps.find((otp) => otp.id === where.id);
      return record ? { ...record } : null;
    });
    prisma.passwordResetOtp.findFirst.mockImplementation(async ({ where }) => {
      const record = [...otps].reverse().find((otp) =>
        otp.userId === where.userId && otp.usedAt === null &&
        otp.attempts < where.attempts.lt && otp.expiresAt > where.expiresAt.gt);
      return record ? { ...record } : null;
    });
    prisma.passwordResetOtp.update.mockImplementation(async ({ where, data }) => {
      const record = otps.find((otp) => otp.id === where.id);
      Object.assign(record, data);
      return { ...record };
    });
    prisma.passwordResetOtp.updateMany.mockImplementation(async ({ where, data }) => {
      const record = otps.find((otp) => otp.id === where.id && otp.userId === where.userId &&
        otp.usedAt === where.usedAt && (!where.attempts || otp.attempts < where.attempts.lt) &&
        (!where.expiresAt || otp.expiresAt > where.expiresAt.gt));
      if (!record) return { count: 0 };
      if (data.usedAt) record.usedAt = data.usedAt;
      if (data.attempts) record.attempts += data.attempts.increment;
      return { count: 1 };
    });
    prisma.passwordResetOtp.deleteMany.mockImplementation(async ({ where }) => {
      otps = otps.filter((otp) => !(otp.userId === where.userId &&
        (where.usedAt === undefined || otp.usedAt === where.usedAt) &&
        (!where.id || otp.id !== where.id.not)));
      return { count: 0 };
    });
    prisma.refreshToken.updateMany.mockImplementation(async ({ data }) => {
      refreshTokens.filter((token) => token.revokedAt === null).forEach((token) => Object.assign(token, data));
      return { count: refreshTokens.length };
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'new-refresh-token' });
    prisma.business.findUnique.mockResolvedValue({ subscriptionStatus: 'ACTIVE', deletedAt: null });
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    emailService.sendEmail.mockResolvedValue({ ok: true });
    emailService.isConfigured.mockReturnValue(true);
  });

  const requestOtp = async () => {
    const result = await invoke(forgotPassword, { email: user.email });
    expect(result.statusCode).toBe(200);
    const message = emailService.sendEmail.mock.calls.at(-1)[0];
    expect(message.to).toBe(user.email);
    const otp = message.html.match(/>(\d{6})<\/span>/)[1];
    expect(await bcrypt.compare(otp, otps.at(-1).otp)).toBe(true);
    return otp;
  };
  const requestToken = async () => {
    const otp = await requestOtp();
    const result = await invoke(verifyOtp, { email: user.email, otp });
    expect(result.statusCode).toBe(200);
    expect(result.body.resetToken).toBeTruthy();
    return result.body.resetToken;
  };

  it.each(['OWNER', 'STAFF'])('%s can reset, log in, and revoke previous sessions', async (role) => {
    user.role = role;
    const oldAccessToken = jwt.sign({ id: user.id, sessionVersion: 0 }, process.env.JWT_SECRET);
    const resetToken = await requestToken();
    const result = await invoke(resetPassword, { resetToken, newPassword: NEW_PASSWORD });
    expect(result.statusCode).toBe(200);
    expect(await bcrypt.compare(NEW_PASSWORD, user.password)).toBe(true);
    expect(await bcrypt.compare(OLD_PASSWORD, user.password)).toBe(false);
    expect(user.sessionVersion).toBe(1);
    expect(refreshTokens.every((token) => token.revokedAt instanceof Date)).toBe(true);
    const oldSession = response();
    const next = jest.fn();
    await authMiddleware({ headers: { authorization: `Bearer ${oldAccessToken}` } }, oldSession, next);
    expect(oldSession.statusCode).toBe(401);
    expect(oldSession.body.code).toBe('SESSION_REVOKED');
    expect(next).not.toHaveBeenCalled();
    const newLogin = await invoke(login, { email: user.email, password: NEW_PASSWORD });
    expect(newLogin.statusCode).toBe(200);
    expect(newLogin.body.user.role).toBe(role);
    expect(jwt.verify(newLogin.body.token, process.env.JWT_SECRET).sessionVersion).toBe(1);
    expect((await invoke(login, { email: user.email, password: OLD_PASSWORD })).statusCode).toBe(401);
    expect((await invoke(resetPassword, { resetToken, newPassword: 'AnotherReset3!' })).statusCode).toBe(400);
  });

  it('does not provide tenant recovery for a separate superadmin email', async () => {
    const result = await invoke(forgotPassword, { email: 'superadmin@example.test' });
    expect(result.statusCode).toBe(200);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(otps).toHaveLength(0);
    expect((await invoke(verifyOtp, { email: 'superadmin@example.test', otp: '123456' })).statusCode).toBe(400);
  });

  it('rejects expired OTPs', async () => {
    const otp = await requestOtp();
    otps[0].expiresAt = new Date(Date.now() - 1);
    expect((await invoke(verifyOtp, { email: user.email, otp })).statusCode).toBe(400);
  });

  it('rejects the correct OTP after five wrong attempts', async () => {
    const otp = await requestOtp();
    for (let i = 0; i < 5; i++) {
      expect((await invoke(verifyOtp, { email: user.email, otp: '000000' })).statusCode).toBe(400);
    }
    expect(otps[0].attempts).toBe(5);
    expect((await invoke(verifyOtp, { email: user.email, otp })).statusCode).toBe(400);
  });

  it('rejects a sixth concurrent OTP guess even when it is correct', async () => {
    const otp = await requestOtp();
    const results = await Promise.all(['000000', '000000', '000000', '000000', '000000', otp]
      .map((guess) => invoke(verifyOtp, { email: user.email, otp: guess })));
    expect(results.map((result) => result.statusCode)).toEqual([400, 400, 400, 400, 400, 400]);
    expect(otps[0].attempts).toBe(5);
    expect(results.every((result) => !result.body.resetToken)).toBe(true);
  });

  it('invalidates a previously issued reset token when a new OTP is requested', async () => {
    const oldToken = await requestToken();
    const oldId = otps[0].id;
    await requestOtp();
    expect(otps).toHaveLength(1);
    expect(otps[0].id).not.toBe(oldId);
    expect((await invoke(resetPassword, { resetToken: oldToken, newPassword: NEW_PASSWORD })).statusCode).toBe(400);
  });

  it.each(['invalid', 'expired', 'wrong-purpose'])('rejects a %s reset token without changing the password', async (kind) => {
    const before = user.password;
    const resetToken = kind === 'invalid' ? 'not-a-jwt' : jwt.sign(
      { userId: user.id, otpId: 'otp-1', purpose: kind === 'wrong-purpose' ? 'access' : 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: kind === 'expired' ? -1 : '10m' },
    );
    expect((await invoke(resetPassword, { resetToken, newPassword: NEW_PASSWORD })).statusCode).toBe(400);
    expect(user.password).toBe(before);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('satisfies the staff password requirement while keeping email verification separate', async () => {
    user.role = 'STAFF';
    user.mustChangePassword = true;
    user.isEmailVerified = false;
    const resetToken = await requestToken();
    expect((await invoke(resetPassword, { resetToken, newPassword: NEW_PASSWORD })).statusCode).toBe(200);
    const result = await invoke(login, { email: user.email, password: NEW_PASSWORD });
    expect(result.body.user.mustChangePassword).toBe(false);
    expect(result.body.user.isEmailVerified).toBe(false);
  });

  it('rejects recovery and removes the unusable OTP when email delivery reports skipped', async () => {
    emailService.sendEmail.mockResolvedValue({ skipped: true, devMode: true });
    expect((await invoke(forgotPassword, { email: user.email })).statusCode).toBe(503);
    expect(otps).toHaveLength(0);
  });

  it.each(['tenant@example.test', 'unknown@example.test'])('reports unavailable SMTP for %s without issuing an OTP', async (email) => {
    emailService.isConfigured.mockReturnValue(false);
    const result = await invoke(forgotPassword, { email });
    expect(result.statusCode).toBe(503);
    expect(result.body.code).toBe('EMAIL_UNAVAILABLE');
    expect(otps).toHaveLength(0);
  });

  it('accepts only one of two concurrent requests using the same reset token', async () => {
    const resetToken = await requestToken();
    const results = await Promise.all([
      invoke(resetPassword, { resetToken, newPassword: NEW_PASSWORD }),
      invoke(resetPassword, { resetToken, newPassword: 'ConcurrentReset3!' }),
    ]);
    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 400]);
    expect(user.sessionVersion).toBe(1);
    const winningPassword = results[0].statusCode === 200 ? NEW_PASSWORD : 'ConcurrentReset3!';
    expect(await bcrypt.compare(winningPassword, user.password)).toBe(true);
  });

  it.each(['short', 'alllowercase1!', 'NoSymbol123'])('rejects weak password %s at the route schema', (newPassword) => {
    expect(resetPasswordSchema.safeParse({ resetToken: 'token', newPassword }).success).toBe(false);
  });

});
