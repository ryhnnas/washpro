const {
  getDashboardStats, getRevenueTrend, getTopServices,
} = require('../../src/controllers/dashboardController');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  transaction: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  customer: { count: jest.fn() },
  customerMembership: { count: jest.fn() },
  whatsAppSession: { findUnique: jest.fn() },
  whatsAppQueue: { groupBy: jest.fn() },
}));

const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });

const group = (status, paymentMethod, count, amount) => ({
  status, paymentMethod, _count: { _all: count }, _sum: { payableAmount: amount },
});

describe('getDashboardStats', () => {
  afterEach(() => jest.useRealTimers());
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);
    prisma.customer.count.mockResolvedValue(0);
    prisma.customerMembership.count.mockResolvedValue(0);
    prisma.whatsAppSession.findUnique.mockResolvedValue(null);
    prisma.whatsAppQueue.groupBy.mockResolvedValue([]);
  });

  it('separates paid revenue from receivables and excludes cancellations from totals', async () => {
    prisma.transaction.groupBy.mockResolvedValueOnce([
      group('PENDING', 'CASH', 2, 12000),
      group('PROSES', 'CASH', 3, 18000),
      group('SELESAI', 'QRIS', 4, 32000),
      group('SELESAI', 'BAYAR_NANTI', 1, 8000),
      group('CANCELLED', 'CASH', 2, 50000),
    ]);
    const req = { user: { businessId: 'biz-a' }, query: { startDate: '2026-01-11T00:00:00.000Z', endDate: '2026-01-20T23:59:59.999Z' } };
    const res = makeRes();

    await getDashboardStats(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.totalTransactions).toBe(10);
    expect(body.totalRevenue).toBe(62000);
    expect(body.averageOrderValue).toBe(7000);
    expect(body.receivable).toEqual({ amount: 8000, count: 1 });
    expect(body.cancelled).toEqual({ count: 2, amount: 50000 });
    expect(body.paymentStats).toEqual([
      { name: 'CASH', value: 5, amount: 30000 },
      { name: 'QRIS', value: 4, amount: 32000 },
      { name: 'BAYAR_NANTI', value: 1, amount: 8000 },
    ]);
    expect(body.statusStats).toEqual([
      { name: 'PENDING', value: 2 }, { name: 'PROSES', value: 3 }, { name: 'SELESAI', value: 5 },
      { name: 'DIAMBIL', value: 0 }, { name: 'CANCELLED', value: 2 },
    ]);
  });

  it('uses WIB today for orders even on a UTC server and a historical filter', async () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = 'UTC';
    jest.useFakeTimers().setSystemTime(new Date('2026-10-10T17:30:00Z'));
    try {
      await getDashboardStats({ user: { businessId: 'biz-a' }, query: {
        startDate: '2026-09-01T17:00:00Z', endDate: '2026-09-02T16:59:59Z',
      } }, makeRes());
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
        businessId: 'biz-a', startDate: { gte: new Date('2026-10-10T17:00:00Z'), lte: new Date('2026-10-11T16:59:59.999Z') },
      } }));
    } finally { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
  });

  it('queries the previous period of equal length and tenant-scopes every query', async () => {
    const req = { user: { businessId: 'biz-a' }, query: { startDate: '2026-01-11T00:00:00.000Z', endDate: '2026-01-20T23:59:59.999Z' } };
    prisma.transaction.groupBy
      .mockResolvedValueOnce([group('SELESAI', 'CASH', 1, 1000)])
      .mockResolvedValueOnce([group('SELESAI', 'CASH', 4, 4000)]);
    const res = makeRes();

    await getDashboardStats(req, res);

    const [currentCall, previousCall] = prisma.transaction.groupBy.mock.calls.map(([a]) => a);
    const prev = previousCall.where.startDate;
    expect(currentCall.where.businessId).toBe('biz-a');
    expect(previousCall.where.businessId).toBe('biz-a');
    expect(prev.lte.getTime()).toBe(new Date('2026-01-11T00:00:00.000Z').getTime() - 1);
    expect(prev.lte.getTime() - prev.gte.getTime())
      .toBe(new Date('2026-01-20T23:59:59.999Z').getTime() - new Date('2026-01-11T00:00:00.000Z').getTime());
    expect(res.json.mock.calls[0][0].previous).toEqual({ totalTransactions: 4, totalRevenue: 4000 });
  });

  it('omits comparison and new-customer count when no date range is given', async () => {
    const res = makeRes();
    await getDashboardStats({ user: { businessId: 'biz-a' }, query: {} }, res);

    const body = res.json.mock.calls[0][0];
    expect(prisma.transaction.groupBy).toHaveBeenCalledTimes(1);
    expect(body.previous).toBeNull();
    expect(body.newCustomers).toBeNull();
    expect(body.averageOrderValue).toBe(0);
  });

  it('reports overdue, membership and WhatsApp summary', async () => {
    prisma.transaction.count.mockResolvedValueOnce(6).mockResolvedValueOnce(2);
    prisma.customerMembership.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);
    prisma.whatsAppSession.findUnique.mockResolvedValue({ status: 'connected' });
    prisma.whatsAppQueue.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 4 } }, { status: 'FAILED', _count: { _all: 1 } },
    ]);
    const res = makeRes();

    await getDashboardStats({ user: { businessId: 'biz-a' }, query: {} }, res);

    const body = res.json.mock.calls[0][0];
    expect(body.activeQueue).toBe(6);
    expect(body.overdueCount).toBe(2);
    expect(body.membership).toEqual({ active: 12, expiringSoon: 3, expiringDays: 7 });
    expect(body.whatsapp).toEqual({ status: 'connected', pending: 4, failed: 1 });
    expect(prisma.whatsAppSession.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'biz-a' } }));
  });

  it('returns a 500 error response when a query fails', async () => {
    prisma.transaction.groupBy.mockRejectedValueOnce(new Error('db down'));
    const res = makeRes();
    await getDashboardStats({ user: { businessId: 'biz-a' }, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getRevenueTrend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('buckets by the client local day and splits paid vs receivable', async () => {
    // WIB (+420): 2026-01-10T18:00Z is already 2026-01-11 01:00 local.
    prisma.transaction.findMany.mockResolvedValue([
      { startDate: new Date('2026-01-10T18:00:00Z'), payableAmount: 10000, paymentMethod: 'CASH' },
      { startDate: new Date('2026-01-11T03:00:00Z'), payableAmount: 20000, paymentMethod: 'QRIS' },
      { startDate: new Date('2026-01-11T05:00:00Z'), payableAmount: 5000, paymentMethod: 'BAYAR_NANTI' },
    ]);
    const req = {
      user: { businessId: 'biz-a' },
      query: { startDate: '2026-01-09T17:00:00.000Z', endDate: '2026-01-11T16:59:59.999Z', tzOffset: '420' },
    };
    const res = makeRes();

    await getRevenueTrend(req, res);

    const { data } = res.json.mock.calls[0][0];
    expect(data.map((d) => d.date)).toEqual(['2026-01-10', '2026-01-11']);
    expect(data[0]).toMatchObject({ revenue: 0, count: 0 });
    expect(data[1]).toMatchObject({ cash: 10000, qris: 20000, receivable: 5000, revenue: 30000, count: 3 });
    const where = prisma.transaction.findMany.mock.calls[0][0].where;
    expect(where.businessId).toBe('biz-a');
    expect(where.status).toEqual({ not: 'CANCELLED' });
    expect(where.startDate.gte.toISOString()).toBe('2026-01-09T17:00:00.000Z');
    expect(where.startDate.lte.toISOString()).toBe('2026-01-11T16:59:59.999Z');
  });

  it('caps the trend window at 366 days', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    const req = {
      user: { businessId: 'biz-a' },
      query: { startDate: '2020-01-01T00:00:00.000Z', endDate: '2026-01-11T00:00:00.000Z', tzOffset: '0' },
    };
    const res = makeRes();
    await getRevenueTrend(req, res);
    expect(res.json.mock.calls[0][0].data).toHaveLength(366);
  });
});

describe('getTopServices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('aggregates line items and falls back to serviceName for legacy rows', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      { serviceName: 'Multi Layanan (2 item)', payableAmount: 40000, lineItems: [
        { serviceName: 'Cuci Kering', unit: 'kg', qty: 3, payableAmount: 15000 },
        { serviceName: 'Setrika', unit: 'kg', qty: 2, payableAmount: 25000 },
      ] },
      { serviceName: 'Cuci Kering', payableAmount: 10000, lineItems: [
        { serviceName: 'Cuci Kering', unit: 'kg', qty: 2, payableAmount: 10000 },
      ] },
      { serviceName: 'Cuci Satuan', payableAmount: 7000, lineItems: null },
    ]);
    const res = makeRes();

    await getTopServices({ user: { businessId: 'biz-a' }, query: {} }, res);

    expect(res.json).toHaveBeenCalledWith({ data: [
      { name: 'Cuci Kering', unit: 'kg', orders: 2, qty: 5, revenue: 25000 },
      { name: 'Setrika', unit: 'kg', orders: 1, qty: 2, revenue: 25000 },
      { name: 'Cuci Satuan', unit: null, orders: 1, qty: 0, revenue: 7000 },
    ] });
    expect(prisma.transaction.findMany.mock.calls[0][0].where).toMatchObject({
      businessId: 'biz-a', status: { not: 'CANCELLED' },
    });
  });
});
