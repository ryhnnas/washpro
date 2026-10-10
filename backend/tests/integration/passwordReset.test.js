// These tests may mutate only the isolated local integration database.
const enabled = process.env.WASHPRO_PASSWORD_RESET_DB_TESTS === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) ||
      !['/washpro_ci', '/washpro_test'].includes(url.pathname)) {
    throw new Error('Password reset integration tests require a local washpro_ci or washpro_test database');
  }
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../src/config/prisma');
const { userPasswordReset, superAdminPasswordReset } = require('../../src/controllers/passwordResetController');
jest.mock('../../src/services/emailService', () => ({ isConfigured: () => true, sendEmail: jest.fn().mockResolvedValue({ ok: true }) }));
const emailService = require('../../src/services/emailService');

const invoke = async (handler, body) => {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  await handler({ body }, res);
  return res;
};

(enabled ? describe : describe.skip)('Password recovery on MySQL 8', () => {
  let business, users, admin, previousUserSecret, previousAdminSecret;
  beforeAll(async () => {
    previousUserSecret = process.env.JWT_SECRET;
    previousAdminSecret = process.env.SUPERADMIN_JWT_SECRET;
    process.env.JWT_SECRET = 'mysql-password-reset-user-test-secret';
    process.env.SUPERADMIN_JWT_SECRET = 'mysql-password-reset-admin-test-secret';
    await prisma.$connect();
    business = await prisma.business.create({ data: { name: 'Password reset test tenant' } });
    const password = await bcrypt.hash('PreviousPassword1!', 10);
    users = {};
    for (const role of ['OWNER', 'STAFF']) {
      users[role] = await prisma.user.create({ data: {
        businessId: business.id, name: `Recovery ${role}`, role,
        email: `${business.id}-${role}@example.test`, password, mustChangePassword: role === 'STAFF',
      } });
    }
    admin = await prisma.superAdmin.create({ data: { name: 'Recovery admin', email: `${business.id}-admin@example.test`, password } });
  });
  afterAll(async () => {
    if (admin) await prisma.superAdmin.delete({ where: { id: admin.id } });
    if (business) {
      await prisma.user.deleteMany({ where: { businessId: business.id } });
      await prisma.business.delete({ where: { id: business.id } });
    }
    await prisma.$disconnect();
    if (previousUserSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousUserSecret;
    if (previousAdminSecret === undefined) delete process.env.SUPERADMIN_JWT_SECRET;
    else process.env.SUPERADMIN_JWT_SECRET = previousAdminSecret;
  });

  it.each(['OWNER', 'STAFF', 'SUPERADMIN'])('%s consumes a token exactly once under concurrent SQL transactions', async (role) => {
    const isAdmin = role === 'SUPERADMIN';
    const account = isAdmin ? admin : users[role];
    const handlers = isAdmin ? superAdminPasswordReset : userPasswordReset;
    const model = isAdmin ? 'superAdmin' : 'user';
    const otpModel = isAdmin ? 'superAdminPasswordResetOtp' : 'passwordResetOtp';
    const foreignKey = isAdmin ? 'superAdminId' : 'userId';
    if (!isAdmin) await prisma.refreshToken.create({ data: {
      userId: account.id, tokenHash: `${account.id}-refresh-hash`, expiresAt: new Date(Date.now() + 86400000),
    } });
    expect((await invoke(handlers.forgotPassword, { email: account.email })).statusCode).toBe(200);
    const otp = emailService.sendEmail.mock.calls.at(-1)[0].html.match(/>(\d{6})<\/span>/)[1];
    const verified = await invoke(handlers.verifyOtp, { email: account.email, otp });
    expect(verified.statusCode).toBe(200);
    const resetToken = verified.body.resetToken;
    const passwords = ['ConcurrentPassword1!', 'ConcurrentPassword2!'];
    const results = await Promise.all(passwords.map((newPassword) => invoke(handlers.resetPassword, { resetToken, newPassword })));
    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 400]);
    const updated = await prisma[model].findUnique({ where: { id: account.id } });
    expect(updated.sessionVersion).toBe(1);
    expect(await bcrypt.compare(passwords[results.findIndex((result) => result.statusCode === 200)], updated.password)).toBe(true);
    if (!isAdmin) {
      expect(updated.mustChangePassword).toBe(false);
      expect(updated.isEmailVerified).toBe(false);
      expect(await prisma.refreshToken.count({ where: { userId: account.id, revokedAt: null } })).toBe(0);
    }
    expect((await invoke(handlers.resetPassword, { resetToken, newPassword: 'ReplayPassword3!' })).statusCode).toBe(400);
    expect(await prisma[otpModel].count({ where: { [foreignKey]: account.id, usedAt: null } })).toBe(0);
  });

  it.each(['OWNER', 'STAFF', 'SUPERADMIN'])('%s limits concurrent OTP comparisons to five using SQL reservations', async (role) => {
    const isAdmin = role === 'SUPERADMIN';
    const account = isAdmin ? admin : users[role];
    const handlers = isAdmin ? superAdminPasswordReset : userPasswordReset;
    const otpModel = isAdmin ? 'superAdminPasswordResetOtp' : 'passwordResetOtp';
    const foreignKey = isAdmin ? 'superAdminId' : 'userId';
    expect((await invoke(handlers.forgotPassword, { email: account.email })).statusCode).toBe(200);
    const correctOtp = emailService.sendEmail.mock.calls.at(-1)[0].html.match(/>(\d{6})<\/span>/)[1];
    const comparisons = jest.spyOn(bcrypt, 'compare');
    try {
      const results = await Promise.all(Array.from({ length: 10 }, () => invoke(handlers.verifyOtp, { email: account.email, otp: '000000' })));
      expect(results.every((result) => result.statusCode === 400)).toBe(true);
      expect(comparisons).toHaveBeenCalledTimes(5);
      const record = await prisma[otpModel].findFirst({ where: { [foreignKey]: account.id, usedAt: null } });
      expect(record.attempts).toBe(5);
      expect((await invoke(handlers.verifyOtp, { email: account.email, otp: correctOtp })).statusCode).toBe(400);
      expect(comparisons).toHaveBeenCalledTimes(5);
    } finally { comparisons.mockRestore(); }
  });

  it('rolls back the token claim if password persistence fails', async () => {
    const account = users.OWNER;
    const record = await prisma.passwordResetOtp.create({ data: {
      userId: account.id, otp: await bcrypt.hash('123456', 10), expiresAt: new Date(Date.now() + 300000),
    } });
    const resetToken = jwt.sign({ accountId: account.id, accountType: 'USER', otpId: record.id, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const before = await prisma.user.findUnique({ where: { id: account.id } });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // Interactive transactions use their own delegate; inject failure immediately after claiming.
      const originalTransaction = prisma.$transaction.bind(prisma);
      const transaction = jest.spyOn(prisma, '$transaction').mockImplementationOnce((callback) => originalTransaction((tx) => callback({
        ...tx, user: { ...tx.user, update: () => { throw new Error('simulated persistence failure'); } },
      })));
      try {
        expect((await invoke(userPasswordReset.resetPassword, { resetToken, newPassword: 'RolledBackPassword1!' })).statusCode).toBe(500);
        expect((await prisma.passwordResetOtp.findUnique({ where: { id: record.id } })).usedAt).toBeNull();
        const after = await prisma.user.findUnique({ where: { id: account.id } });
        expect(after.sessionVersion).toBe(before.sessionVersion);
        expect(after.password).toBe(before.password);
      } finally { transaction.mockRestore(); }
    } finally { log.mockRestore(); }
  });
});
