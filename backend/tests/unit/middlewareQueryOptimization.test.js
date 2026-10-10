const prisma = require('../../src/config/prisma');
const jwt = require('jsonwebtoken');
const auth = require('../../src/middleware/auth');
const userGuard = require('../../src/middleware/userGuard');
const checkSubscription = require('../../src/middleware/checkSubscription');
const { getSession } = require('../../src/controllers/authController');

jest.mock('../../src/config/prisma', () => ({ user: { findUnique: jest.fn() }, business: { findUnique: jest.fn(), update: jest.fn() } }));
jest.mock('jsonwebtoken');
jest.mock('../../src/services/emailService', () => ({}));

const user = { id: 'user-a', businessId: 'biz-a', sessionVersion: 2, role: 'OWNER', name: 'Owner', email: 'owner@example.com', phone: null, isEmailVerified: true, mustChangePassword: false };
const business = { id: 'biz-a', subscriptionStatus: 'ACTIVE', deletedAt: null, trialEndAt: null, subscriptionEndAt: new Date('2099-01-01') };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), clearCookie: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  jwt.verify.mockReturnValue({ id: 'user-a', sessionVersion: 2 });
  prisma.user.findUnique.mockResolvedValue(user);
  prisma.business.findUnique.mockResolvedValue(business);
  checkSubscription.invalidateSubscriptionCache('biz-a');
});

it('auth, guard, and subscription use one user read and one fresh business read', async () => {
  const req = { headers: { authorization: 'Bearer token' } }, res = response(), next = jest.fn();
  await auth(req, res, next);
  await userGuard(req, res, next);
  await checkSubscription(req, res, next);
  expect(next).toHaveBeenCalledTimes(3);
  expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  expect(prisma.user.findUnique.mock.calls[0][0].select).toEqual(expect.objectContaining({ sessionVersion: true, isEmailVerified: true, mustChangePassword: true, name: true, email: true, phone: true }));
  expect(prisma.business.findUnique).toHaveBeenCalledTimes(1);
  expect(req.subscription).toEqual({ subscriptionStatus: 'ACTIVE', trialEndAt: null, subscriptionEndAt: new Date('2099-01-01') });
});

it('session endpoint reuses the authenticated profile without exposing sessionVersion', async () => {
  const req = { headers: { authorization: 'Bearer token' } }, res = response();
  await auth(req, res, jest.fn());
  await getSession(req, res);
  expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledWith({ user: { id: 'user-a', businessId: 'biz-a', role: 'OWNER', name: 'Owner', email: 'owner@example.com', phone: null, isEmailVerified: true, mustChangePassword: false } });
});

it('does not reuse user data from a different identity', async () => {
  const req = { user: { id: 'user-a', businessId: 'biz-a' }, currentUser: { ...user, id: 'other-user' } }, res = response(), next = jest.fn();
  await userGuard(req, res, next);
  expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  expect(req.currentUser.id).toBe('user-a');
  expect(next).toHaveBeenCalledTimes(1);
});

it('blocks revoked sessions before the guard can reuse the user', async () => {
  jwt.verify.mockReturnValue({ id: 'user-a', sessionVersion: 1 });
  const req = { headers: { authorization: 'Bearer token' } }, res = response(), next = jest.fn();
  await auth(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
  expect(req.currentUser).toBeUndefined();
});

it.each([
  ['unverified owner', { ...user, isEmailVerified: false }, business, 'EMAIL_NOT_VERIFIED'],
  ['staff onboarding', { ...user, role: 'STAFF', mustChangePassword: true }, business, 'STAFF_ONBOARDING_REQUIRED'],
  ['deleted business', user, { ...business, deletedAt: new Date() }, 'BUSINESS_DELETED'],
  ['suspended business', user, { ...business, subscriptionStatus: 'SUSPENDED' }, 'BUSINESS_SUSPENDED'],
])('still blocks %s', async (_label, currentUser, currentBusiness, code) => {
  prisma.user.findUnique.mockResolvedValue(currentUser);
  prisma.business.findUnique.mockResolvedValue(currentBusiness);
  const req = { headers: { authorization: 'Bearer token' } }, res = response(), next = jest.fn();
  await auth(req, res, next);
  next.mockClear();
  await userGuard(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
  expect(next).not.toHaveBeenCalled();
});

it('uses the fresh business from the guard even when the subscription cache is stale', async () => {
  await checkSubscription({ user: { businessId: 'biz-a' } }, response(), jest.fn());
  prisma.business.findUnique.mockResolvedValue({ ...business, subscriptionStatus: 'PENDING_PAYMENT' });
  const req = { headers: { authorization: 'Bearer token' } }, res = response(), next = jest.fn();
  await auth(req, res, next);
  await userGuard(req, res, next);
  await checkSubscription(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ subscriptionStatus: 'PENDING_PAYMENT' }));
});
