// backend/tests/unit/superAdminStatsService.test.js
const { buildPlatformStats } = require('../../src/services/superAdminStatsService');

const NOW = new Date('2026-10-15T05:00:00Z');
const MONTH_START = new Date('2026-09-30T17:00:00.000Z'); // 1 Okt 00:00 WIB
const TREND_START = new Date('2026-04-30T17:00:00.000Z'); // 1 Mei 00:00 WIB

const makePrisma = () => ({
  business: {
    groupBy: jest.fn().mockResolvedValue([
      { subscriptionStatus: 'TRIAL', _count: { _all: 4 } },
      { subscriptionStatus: 'ACTIVE', _count: { _all: 10 } },
      { subscriptionStatus: 'EXPIRED', _count: { _all: 2 } },
      { subscriptionStatus: 'SUSPENDED', _count: { _all: 1 } },
    ]),
    count: jest.fn(async ({ where }) => {
      if (where.transactions) return 4;                                              // inactive
      if (where.subscriptionPayments) return 2;                                      // cohort converted
      if (where.subscriptionStatus === 'ACTIVE' && where.subscriptionEndAt?.lt) return 3; // lapsed active
      if (where.subscriptionStatus === 'TRIAL' && where.trialEndAt?.lt) return 1;         // lapsed trial
      if (where.subscriptionStatus === 'ACTIVE' && where.subscriptionEndAt?.gte) return 2; // expiring active
      if (where.subscriptionStatus === 'TRIAL' && where.trialEndAt?.gte) return 1;         // expiring trial
      if (where.createdAt?.lt && where.createdAt?.gte) return 2;                     // new previous month
      if (where.createdAt?.gte?.getTime() === MONTH_START.getTime()) return 3;       // new this month
      if (where.createdAt?.gte) return 8;                                            // cohort total
      throw new Error(`unexpected business.count where: ${JSON.stringify(where)}`);
    }),
    findMany: jest.fn(async ({ where }) => {
      if (where.transactions) return [{ id: 'b3', name: 'Toko C' }];
      if (where.subscriptionStatus === 'ACTIVE') {
        return [{ id: 'b1', name: 'Toko A', subscriptionEndAt: new Date('2026-10-17T00:00:00Z') }];
      }
      if (where.subscriptionStatus === 'TRIAL') {
        return [{ id: 'b2', name: 'Toko B', trialEndAt: new Date('2026-10-16T00:00:00Z') }];
      }
      throw new Error(`unexpected business.findMany where: ${JSON.stringify(where)}`);
    }),
  },
  subscriptionPayment: {
    count: jest.fn().mockResolvedValue(5),
    findFirst: jest.fn().mockResolvedValue({ createdAt: new Date('2026-10-10T00:00:00Z') }),
    findMany: jest.fn().mockResolvedValue([
      { amount: 100000, approvedAt: new Date('2026-10-02T03:00:00Z'), plan: { name: 'Bulanan' } },
      { amount: 50000, approvedAt: new Date('2026-09-30T18:00:00Z'), plan: { name: 'Bulanan' } }, // 1 Okt 01:00 WIB
      { amount: 200000, approvedAt: new Date('2026-09-15T03:00:00Z'), plan: { name: 'Tahunan' } },
      { amount: 30000, approvedAt: new Date('2026-05-10T03:00:00Z'), plan: { name: 'Bulanan' } },
    ]),
  },
  whatsAppSession: {
    groupBy: jest.fn().mockResolvedValue([
      { status: 'connected', _count: { _all: 5 } },
      { status: 'error', _count: { _all: 1 } },
    ]),
  },
  whatsAppQueue: {
    groupBy: jest.fn().mockResolvedValue([
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'FAILED', _count: { _all: 3 } },
    ]),
  },
});

describe('buildPlatformStats', () => {
  it('counts stores excluding soft-deleted and moves lapsed stores to EXPIRED', async () => {
    const prisma = makePrisma();
    const stats = await buildPlatformStats(prisma, NOW);

    expect(prisma.business.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
    expect(stats.totalBusinesses).toBe(17);
    expect(stats.statusCounts).toEqual({ TRIAL: 3, ACTIVE: 7, PENDING_PAYMENT: 0, EXPIRED: 6, SUSPENDED: 1 });
    expect(stats.activeBusinesses).toBe(7);
    expect(stats.trialBusinesses).toBe(3);
  });

  it('computes revenue per WIB month, a 6-month trend and plan breakdown', async () => {
    const prisma = makePrisma();
    const stats = await buildPlatformStats(prisma, NOW);

    expect(prisma.subscriptionPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED', approvedAt: { gte: TREND_START } } }),
    );
    expect(stats.revenue.thisMonth).toBe(150000);
    expect(stats.monthlyRevenue).toBe(150000);
    expect(stats.revenue.previousMonth).toBe(200000);
    expect(stats.revenue.trend).toEqual([
      { month: '2026-05', revenue: 30000, count: 1 },
      { month: '2026-06', revenue: 0, count: 0 },
      { month: '2026-07', revenue: 0, count: 0 },
      { month: '2026-08', revenue: 0, count: 0 },
      { month: '2026-09', revenue: 200000, count: 1 },
      { month: '2026-10', revenue: 150000, count: 2 },
    ]);
    expect(stats.planBreakdown).toEqual([{ name: 'Bulanan', count: 2, revenue: 150000 }]);
  });

  it('reports pending queue, growth, conversion, expiring and inactive stores', async () => {
    const prisma = makePrisma();
    const stats = await buildPlatformStats(prisma, NOW);

    expect(stats.pendingPayments).toBe(5);
    expect(stats.oldestPendingPaymentAt).toEqual(new Date('2026-10-10T00:00:00Z'));
    expect(stats.growth).toEqual({ newThisMonth: 3, newPreviousMonth: 2 });
    expect(stats.conversion).toEqual({ cohortDays: 90, total: 8, converted: 2, rate: 25 });
    expect(stats.expiringSoon.total).toBe(3);
    expect(stats.expiringSoon.days).toBe(7);
    expect(stats.expiringSoon.items.map((i) => [i.id, i.status])).toEqual([['b2', 'TRIAL'], ['b1', 'ACTIVE']]);
    expect(stats.inactive).toEqual({ days: 14, total: 4, items: [{ id: 'b3', name: 'Toko C' }] });
  });

  it('reports tenant WhatsApp health across the platform', async () => {
    const stats = await buildPlatformStats(makePrisma(), NOW);
    expect(stats.platform).toEqual({
      whatsappSessions: { connected: 5, disconnected: 0, error: 1 },
      queue: { pending: 2, failed: 3 },
    });
  });

  it('returns a zero conversion rate for an empty cohort', async () => {
    const prisma = makePrisma();
    const original = prisma.business.count.getMockImplementation();
    prisma.business.count.mockImplementation(async (args) => {
      if (args.where.subscriptionPayments) return 0;
      if (args.where.createdAt?.gte && !args.where.createdAt.lt
        && args.where.createdAt.gte.getTime() !== MONTH_START.getTime()) return 0;
      return original(args);
    });
    const stats = await buildPlatformStats(prisma, NOW);
    expect(stats.conversion.rate).toBe(0);
  });
});
