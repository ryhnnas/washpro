const prisma = require('../../src/config/prisma');
const { createTransaction } = require('../../src/controllers/transactionController');
const { syncMembershipPackages } = require('../../src/controllers/settingController');
const { consumeQuotaAndLog, restoreQuotaAndCleanupLogs } = require('../../src/services/membershipService');

jest.mock('../../src/config/prisma', () => ({ $transaction: jest.fn() }));
jest.mock('../../src/services/whatsappService', () => ({}));

const service = { id: 'svc-a', name: 'Cuci', price: 8000, unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' };
const resFixture = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('Batch queries preserve transaction and membership behavior', () => {
  let tx;
  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      customer: { create: jest.fn().mockResolvedValue({ id: 'customer-a' }) },
      service: { findMany: jest.fn().mockResolvedValue([service]), findFirst: jest.fn().mockResolvedValue(service), count: jest.fn().mockResolvedValue(1) },
      customerMembership: { findMany: jest.fn().mockResolvedValue([]) },
      transaction: { create: jest.fn(async ({ data }) => ({ id: 'transaction-a', ...data })) },
      membershipPackageTemplate: { findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue({ id: 'pkg-a' }), update: jest.fn(async ({ where }) => ({ id: where.id })), create: jest.fn() },
      membershipPackageQuotaItem: { deleteMany: jest.fn(), createMany: jest.fn() },
      customerMembershipQuotaBalance: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
      customerMembershipUsageLog: { findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    prisma.$transaction.mockImplementation((fn) => fn(tx));
  });

  it.each([1, 10, 100])('uses one owned service lookup for %i repeated items and calculates the same total', async (n) => {
    const res = resFixture();
    await createTransaction({ user: { businessId: 'biz-a' }, body: { customerName: 'Budi', items: Array.from({ length: n }, () => ({ serviceId: 'svc-a', qty: 1 })) } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalPrice: 8000 * n, payableAmount: 8000 * n, lineItems: [expect.objectContaining({ serviceId: 'svc-a', qty: n })] }));
    expect(tx.service.findMany).toHaveBeenCalledTimes(1);
    expect(tx.service.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'biz-a', id: { in: ['svc-a'] } } }));
    expect(tx.service.findFirst).not.toHaveBeenCalled();
  });

  it('batch-resolves fallback names while keeping valid IDs authoritative', async () => {
    tx.service.findFirst.mockImplementation(async ({ where }) => where.id === 'missing' ? null : { ...service, id: where.id || 'svc-b', name: where.name || 'Cuci' });
    tx.$queryRaw.mockResolvedValue([{ ...service, id: 'svc-b', name: 'Setrika', requestIndex: 0 }]);
    const res = resFixture();
    await createTransaction({ user: { businessId: 'biz-a' }, body: { customerName: 'Budi', items: [
      { serviceId: 'svc-a', serviceName: 'Ignored name', qty: 2 },
      { serviceId: 'missing', serviceName: 'setrika', qty: 3 },
      { serviceName: 'setrika', qty: 1 },
    ] } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalPrice: 48000, lineItems: [expect.objectContaining({ serviceId: 'svc-a', qty: 2 }), expect.objectContaining({ serviceId: 'svc-b', qty: 4 })] }));
    expect(tx.service.findMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.calls[0].slice(1)).toEqual(['["setrika"]', 'biz-a', '["setrika"]']);
  });

  it('rejects a missing or foreign service before creating a transaction', async () => {
    tx.service.findMany.mockResolvedValue([]);
    tx.service.findFirst.mockResolvedValue(null);
    const res = resFixture();
    await createTransaction({ user: { businessId: 'biz-a' }, body: { customerName: 'Budi', items: [{ serviceId: 'foreign', qty: 1 }] } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('validates ten owned packages in two reads and replaces all quotas in two writes', async () => {
    const packages = Array.from({ length: 10 }, (_, i) => ({ id: `pkg-${i}`, name: `Package ${i}`, items: [{ serviceId: 'svc-a', quotaAmount: 5 }] }));
    tx.membershipPackageTemplate.findMany.mockResolvedValue(packages.map(({ id }) => ({ id })));
    await syncMembershipPackages(tx, 'biz-a', packages);
    expect(tx.membershipPackageTemplate.findMany).toHaveBeenCalledTimes(1);
    expect(tx.service.count).toHaveBeenCalledTimes(1);
    expect(tx.service.count).toHaveBeenCalledWith({ where: { businessId: 'biz-a', id: { in: ['svc-a'] } } });
    expect(tx.membershipPackageQuotaItem.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.membershipPackageQuotaItem.createMany).toHaveBeenCalledTimes(1);
    expect(tx.membershipPackageQuotaItem.createMany).toHaveBeenCalledWith({ data: packages.map(({ id }) => ({ templateId: id, serviceId: 'svc-a', quotaAmount: 5, deductionRate: 1 })) });
  });

  it('rejects a foreign package in the batch before mutating any package', async () => {
    tx.membershipPackageTemplate.findMany.mockResolvedValue([{ id: 'pkg-a' }]);
    tx.membershipPackageTemplate.findFirst.mockImplementation(async ({ where }) => where.id === 'pkg-a' ? { id: 'pkg-a' } : null);
    await expect(syncMembershipPackages(tx, 'biz-a', [{ id: 'pkg-a', name: 'Good', items: [] }, { id: 'pkg-foreign', name: 'Foreign' }])).rejects.toMatchObject({ statusCode: 404 });
    expect(tx.membershipPackageTemplate.update).not.toHaveBeenCalled();
    expect(tx.membershipPackageQuotaItem.deleteMany).not.toHaveBeenCalled();
  });

  it('deduplicates UUIDs case-insensitively across package validation', async () => {
    tx.membershipPackageTemplate.findMany.mockResolvedValue([{ id: 'pkg-a' }]);
    await syncMembershipPackages(tx, 'biz-a', [
      { id: 'PKG-A', name: 'First', items: [{ serviceId: 'SVC-A', quotaAmount: 5 }] },
      { id: 'pkg-a', name: 'Second', items: [{ serviceId: 'svc-a', quotaAmount: 6 }] },
    ]);
    expect(tx.membershipPackageTemplate.findMany).toHaveBeenCalledWith({ where: { businessId: 'biz-a', id: { in: ['pkg-a'] } }, select: { id: true } });
    expect(tx.service.count).toHaveBeenCalledWith({ where: { businessId: 'biz-a', id: { in: ['svc-a'] } } });
  });

  it('keeps the last explicitly supplied quota list for duplicate template IDs', async () => {
    tx.membershipPackageTemplate.findMany.mockResolvedValue([{ id: 'pkg-a' }]);
    await syncMembershipPackages(tx, 'biz-a', [
      { id: 'pkg-a', name: 'First', items: [{ serviceId: 'svc-a', quotaAmount: 5 }] },
      { id: 'pkg-a', name: 'Last', items: [] },
      { id: 'pkg-a', name: 'Rename only' },
    ]);
    expect(tx.membershipPackageQuotaItem.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.membershipPackageQuotaItem.createMany).not.toHaveBeenCalled();
  });

  it('decrements equal quota amounts together and inserts usage logs once', async () => {
    tx.customerMembershipQuotaBalance.updateMany.mockResolvedValue({ count: 2 });
    await consumeQuotaAndLog({ tx, businessId: 'biz-a', membershipId: 'mem-a', transactionId: 'transaction-a', items: [
      { serviceId: 'svc-a', isUsingMembership: true, usedQty: 2, coveredAmount: 16000, payableAmount: 0 },
      { serviceId: 'svc-b', isUsingMembership: true, usedQty: 2, coveredAmount: 10000, payableAmount: 0 },
    ] });
    expect(tx.customerMembershipQuotaBalance.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.customerMembershipQuotaBalance.updateMany).toHaveBeenCalledWith({ where: { customerMembershipId: 'mem-a', serviceId: { in: ['svc-a', 'svc-b'] }, remainingQty: { gte: 2 } }, data: { remainingQty: { decrement: 2 } } });
    expect(tx.customerMembershipUsageLog.createMany).toHaveBeenCalledWith({ data: [
      { businessId: 'biz-a', customerMembershipId: 'mem-a', transactionId: 'transaction-a', serviceId: 'svc-a', usedQty: 2, coveredAmount: 16000, payableAmount: 0 },
      { businessId: 'biz-a', customerMembershipId: 'mem-a', transactionId: 'transaction-a', serviceId: 'svc-b', usedQty: 2, coveredAmount: 10000, payableAmount: 0 },
    ] });
  });

  it('throws a conflict and does not log usage when any quota changed concurrently', async () => {
    tx.customerMembershipQuotaBalance.updateMany.mockResolvedValue({ count: 1 });
    await expect(consumeQuotaAndLog({ tx, businessId: 'biz-a', membershipId: 'mem-a', transactionId: 'transaction-a', items: [
      { serviceId: 'svc-a', isUsingMembership: true, usedQty: 2 }, { serviceId: 'svc-b', isUsingMembership: true, usedQty: 2 },
    ] })).rejects.toMatchObject({ statusCode: 409, code: 'MEMBERSHIP_QUOTA_CHANGED' });
    expect(tx.customerMembershipUsageLog.createMany).not.toHaveBeenCalled();
  });

  it('creates the transaction with membership coverage and one batch of quota logs', async () => {
    tx.service.findMany.mockResolvedValue([service, { ...service, id: 'svc-b' }]);
    tx.customerMembership.findMany.mockResolvedValue([{
      id: 'mem-a', status: 'ACTIVE', endAt: new Date('2099-01-01'),
      template: { quotaItems: [{ serviceId: 'svc-a', deductionRate: 1 }, { serviceId: 'svc-b', deductionRate: 1 }] },
      balances: [{ serviceId: 'svc-a', remainingQty: 5 }, { serviceId: 'svc-b', remainingQty: 5 }],
    }]);
    tx.customerMembershipQuotaBalance.updateMany.mockResolvedValue({ count: 2 });
    const res = resFixture();
    await createTransaction({ user: { businessId: 'biz-a' }, body: { customerName: 'Budi', items: [
      { serviceId: 'svc-a', qty: 2 }, { serviceId: 'svc-b', qty: 2 },
    ] } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalPrice: 32000, coveredAmount: 32000, payableAmount: 0 }));
    expect(tx.customerMembershipQuotaBalance.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.customerMembershipUsageLog.createMany).toHaveBeenCalledWith({ data: [
      { businessId: 'biz-a', customerMembershipId: 'mem-a', transactionId: 'transaction-a', serviceId: 'svc-a', usedQty: 2, coveredAmount: 16000, payableAmount: 0 },
      { businessId: 'biz-a', customerMembershipId: 'mem-a', transactionId: 'transaction-a', serviceId: 'svc-b', usedQty: 2, coveredAmount: 16000, payableAmount: 0 },
    ] });
  });

  it('keeps cancellation logs when a quota balance cannot be restored', async () => {
    tx.customerMembershipUsageLog.findMany.mockResolvedValue([{ customerMembershipId: 'mem-a', serviceId: 'svc-a', usedQty: 2 }]);
    tx.customerMembershipQuotaBalance.updateMany.mockResolvedValue({ count: 0 });
    await expect(restoreQuotaAndCleanupLogs(tx, 'transaction-a')).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.customerMembershipUsageLog.deleteMany).not.toHaveBeenCalled();
  });

  it('restores equal amounts together while preserving different amounts and deleting logs last', async () => {
    tx.customerMembershipUsageLog.findMany.mockResolvedValue([
      { customerMembershipId: 'mem-a', serviceId: 'svc-a', usedQty: 1 }, { customerMembershipId: 'mem-a', serviceId: 'svc-a', usedQty: 1 },
      { customerMembershipId: 'mem-a', serviceId: 'svc-b', usedQty: 2 }, { customerMembershipId: 'mem-b', serviceId: 'svc-c', usedQty: 3 },
    ]);
    tx.customerMembershipQuotaBalance.updateMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 1 });
    await restoreQuotaAndCleanupLogs(tx, 'transaction-a');
    expect(tx.customerMembershipQuotaBalance.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.customerMembershipQuotaBalance.updateMany).toHaveBeenNthCalledWith(1, { where: { OR: [{ customerMembershipId: 'mem-a', serviceId: 'svc-a' }, { customerMembershipId: 'mem-a', serviceId: 'svc-b' }] }, data: { remainingQty: { increment: 2 } } });
    expect(tx.customerMembershipQuotaBalance.updateMany).toHaveBeenNthCalledWith(2, { where: { OR: [{ customerMembershipId: 'mem-b', serviceId: 'svc-c' }] }, data: { remainingQty: { increment: 3 } } });
    expect(tx.customerMembershipUsageLog.deleteMany).toHaveBeenCalledWith({ where: { transactionId: 'transaction-a' } });
  });
});
