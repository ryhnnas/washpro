const prisma = require('../../src/config/prisma');
const { invalidateSubscriptionCache } = require('../../src/middleware/checkSubscription');
const {
  toggleBusiness, deleteBusiness, rejectPayment, getBusinesses, getPayments, getDashboardStats,
} = require('../../src/controllers/superAdminController');

jest.mock('../../src/config/prisma', () => ({
  business: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  user: { findFirst: jest.fn() },
  subscriptionPayment: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
}));
jest.mock('../../src/services/whatsappService', () => ({ sendMessage: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../../src/services/emailService', () => ({ sendEmail: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../../src/middleware/checkSubscription', () => ({ invalidateSubscriptionCache: jest.fn() }));
jest.mock('../../src/middleware/csrf', () => ({ generateCsrfToken: jest.fn(), setCsrfCookie: jest.fn() }));
jest.mock('../../src/services/superAdminStatsService', () => ({
  buildPlatformStats: jest.fn(),
}));
const { buildPlatformStats } = require('../../src/services/superAdminStatsService');

const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });
const DAY = 24 * 60 * 60 * 1000;
const baseBusiness = {
  id: 'biz-1', name: 'Laundry Jaya', phone: null, subscriptionStatus: 'SUSPENDED',
  deletedAt: null, subscriptionEndAt: null, trialEndAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findFirst.mockResolvedValue(null);
  prisma.business.update.mockImplementation(async ({ data }) => ({ ...baseBusiness, ...data }));
});

describe('toggleBusiness', () => {
  const call = (action) => {
    const res = makeRes();
    return toggleBusiness({ params: { businessId: 'biz-1' }, body: { action } }, res).then(() => res);
  };

  it('reactivates a store with a running paid subscription as ACTIVE', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, subscriptionEndAt: new Date(Date.now() + 5 * DAY) });
    const res = await call('ACTIVATE');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'ACTIVE' } }));
    expect(res.json.mock.calls[0][0].message).toContain('Aktif');
  });

  it('never grants ACTIVE to a store that never paid and whose trial is over', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, trialEndAt: new Date(Date.now() - DAY) });
    const res = await call('ACTIVATE');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'EXPIRED' } }));
    expect(res.json.mock.calls[0][0].message).toContain('Kadaluarsa');
  });

  it('restores TRIAL while the trial is still running', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, trialEndAt: new Date(Date.now() + 3 * DAY) });
    await call('ACTIVATE');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'TRIAL' } }));
  });

  it('rejects activating a deleted store', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, deletedAt: new Date() });
    const res = await call('ACTIVATE');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('suspends and invalidates the subscription cache', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, subscriptionStatus: 'ACTIVE' });
    await call('SUSPEND');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'SUSPENDED' } }));
    expect(invalidateSubscriptionCache).toHaveBeenCalledWith('biz-1');
  });
});

describe('deleteBusiness', () => {
  it('soft deletes and invalidates the subscription cache when the name matches', async () => {
    prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', name: 'Laundry Jaya', subscriptionStatus: 'ACTIVE' });
    prisma.business.update.mockResolvedValue({});
    const res = makeRes();
    await deleteBusiness({ params: { businessId: 'biz-1' }, body: { confirmName: ' Laundry Jaya ' } }, res);
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { deletedAt: expect.any(Date), subscriptionStatus: 'SUSPENDED' },
    });
    expect(invalidateSubscriptionCache).toHaveBeenCalledWith('biz-1');
  });

  it('refuses when the typed name does not match', async () => {
    prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', name: 'Laundry Jaya', subscriptionStatus: 'ACTIVE' });
    const res = makeRes();
    await deleteBusiness({ params: { businessId: 'biz-1' }, body: { confirmName: 'laundry' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.business.update).not.toHaveBeenCalled();
    expect(invalidateSubscriptionCache).not.toHaveBeenCalled();
  });
});

describe('rejectPayment', () => {
  it('records the rejector in rejectedById and leaves approvedById untouched', async () => {
    prisma.subscriptionPayment.findUnique.mockResolvedValue({
      id: 'pay-1', businessId: 'biz-1', amount: 50000, status: 'PENDING',
      business: { id: 'biz-1', name: 'Laundry Jaya', phone: null, subscriptionStatus: 'PENDING_PAYMENT' },
      plan: { name: 'Bulanan' },
    });
    prisma.subscriptionPayment.update.mockResolvedValue({ id: 'pay-1', status: 'REJECTED' });
    prisma.business.update.mockResolvedValue({});
    const res = makeRes();

    await rejectPayment(
      { params: { paymentId: 'pay-1' }, body: { reason: 'Nominal tidak sesuai' }, superAdmin: { id: 'sa-1' } },
      res,
    );

    const data = prisma.subscriptionPayment.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      status: 'REJECTED', rejectedById: 'sa-1', rejectedAt: expect.any(Date), rejectionReason: 'Nominal tidak sesuai',
    });
    expect(data).not.toHaveProperty('approvedById');
  });
});

describe('list endpoints', () => {
  beforeEach(() => {
    prisma.business.findMany.mockResolvedValue([]);
    prisma.business.count.mockResolvedValue(45);
    prisma.subscriptionPayment.findMany.mockResolvedValue([]);
    prisma.subscriptionPayment.count.mockResolvedValue(3);
  });

  it('clamps limit, computes skip and totalPages for businesses', async () => {
    const res = makeRes();
    await getBusinesses({ query: { page: '3', limit: '500', search: ' jaya ', status: 'ACTIVE' } }, res);
    const args = prisma.business.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
    expect(args.skip).toBe(200);
    expect(args.where).toEqual({ deletedAt: null, subscriptionStatus: 'ACTIVE', name: { contains: 'jaya' } });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 45, page: 3, limit: 100, totalPages: 1 }));
  });

  it('falls back to page 1 / limit 20 on garbage input', async () => {
    const res = makeRes();
    await getBusinesses({ query: { page: '-4', limit: 'abc' } }, res);
    const args = prisma.business.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  it('rejects an unknown business status', async () => {
    const res = makeRes();
    await getBusinesses({ query: { status: 'DROP TABLE' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.business.findMany).not.toHaveBeenCalled();
  });

  it('filters payments by status and business name', async () => {
    const res = makeRes();
    await getPayments({ query: { status: 'PENDING', search: 'laundry', page: '2', limit: '10' } }, res);
    const args = prisma.subscriptionPayment.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ status: 'PENDING', business: { name: { contains: 'laundry' } } });
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 3, page: 2, limit: 10, totalPages: 1 }));
  });

  it('rejects an unknown payment status', async () => {
    const res = makeRes();
    await getPayments({ query: { status: 'NOPE' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('getDashboardStats', () => {
  it('delegates to buildPlatformStats and returns its result', async () => {
    buildPlatformStats.mockResolvedValue({ totalBusinesses: 17, monthlyRevenue: 150000 });
    const res = makeRes();
    await getDashboardStats({}, res);
    expect(buildPlatformStats).toHaveBeenCalledWith(prisma);
    expect(res.json).toHaveBeenCalledWith({ totalBusinesses: 17, monthlyRevenue: 150000 });
  });

  it('answers 500 when the service fails', async () => {
    buildPlatformStats.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await getDashboardStats({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
