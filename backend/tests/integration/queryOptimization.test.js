// Opt in only against a migrated, isolated MySQL 8 test database.
const enabled = process.env.WASHPRO_QUERY_DB_TESTS === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) ||
      !['/washpro_ci', '/washpro_test'].includes(url.pathname)) {
    throw new Error('Query integration tests require a local washpro_ci or washpro_test database');
  }
}

const { resolveTransactionServices } = require('../../src/services/transactionService');
const { consumeQuotaAndLog, restoreQuotaAndCleanupLogs } = require('../../src/services/membershipService');

(enabled ? describe : describe.skip)('Query optimization on MySQL 8', () => {
  let prisma, fixture;
  const queries = [];
  beforeAll(async () => {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
    prisma.$on('query', ({ query }) => queries.push(query));
    await prisma.$connect();
  });

  beforeEach(async () => {
    fixture = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: 'Query test tenant' } });
      const foreignBusiness = await tx.business.create({ data: { name: 'Other query test tenant' } });
      const services = [];
      for (const name of ['Café Cuci', "Setrika ' OR 1=1 --", 'Sepatu']) {
        services.push(await tx.service.create({ data: { businessId: business.id, name, price: 8000, type: 'KILOAN' } }));
      }
      const foreignService = await tx.service.create({ data: { businessId: foreignBusiness.id, name: 'Foreign only', price: 10000, type: 'KILOAN' } });
      const customer = await tx.customer.create({ data: { businessId: business.id, name: 'Test customer' } });
      const template = await tx.membershipPackageTemplate.create({ data: { businessId: business.id, name: 'Test package' } });
      const membership = await tx.customerMembership.create({ data: {
        businessId: business.id, customerId: customer.id, templateId: template.id,
        startAt: new Date(), endAt: new Date(Date.now() + 86400000),
      } });
      await tx.customerMembershipQuotaBalance.createMany({ data: services.map(({ id }) => ({
        customerMembershipId: membership.id, serviceId: id, initialQty: 10, remainingQty: 10,
      })) });
      const transaction = await tx.transaction.create({ data: {
        businessId: business.id, customerId: customer.id, customerMembershipId: membership.id,
        customerName: customer.name, serviceName: 'Test', weight: 1, totalPrice: 8000, paymentMethod: 'CASH',
      } });
      return { business, foreignBusiness, services, foreignService, membership, transaction };
    });
    queries.length = 0;
  });

  afterEach(async () => {
    if (!fixture) return;
    const businessIds = [fixture.business.id, fixture.foreignBusiness.id];
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.customer.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.membershipPackageTemplate.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.service.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.business.deleteMany({ where: { id: { in: businessIds } } });
    });
    fixture = undefined;
  });
  afterAll(async () => { if (prisma) await prisma.$disconnect(); });

  it('reads 100 repeated service IDs in one SQL SELECT', async () => {
    const items = Array.from({ length: 100 }, () => ({ serviceId: fixture.services[0].id, qty: 1 }));
    const result = await prisma.$transaction((tx) => resolveTransactionServices(tx, fixture.business.id, items));
    expect(result).toHaveLength(100);
    expect(result.every(({ service }) => service.id === fixture.services[0].id)).toBe(true);
    expect(queries.filter((query) => /^SELECT\b/i.test(query))).toHaveLength(1);
  });

  it('preserves name collation, literal quotes, ID precedence and tenant isolation', async () => {
    const [cafe, quoted] = fixture.services;
    const result = await prisma.$transaction((tx) => resolveTransactionServices(tx, fixture.business.id, [
      { serviceName: 'CAFE CUCI', qty: 1 },
      { serviceName: quoted.name, qty: 1 },
      { serviceId: cafe.id.toUpperCase(), serviceName: quoted.name, qty: 1 },
    ]));
    expect(result.map(({ service }) => service.id)).toEqual([cafe.id, quoted.id, cafe.id]);
    expect(queries.filter((query) => /^SELECT\b/i.test(query))).toHaveLength(2);
    await expect(prisma.$transaction((tx) => resolveTransactionServices(tx, fixture.business.id, [
      { serviceId: fixture.foreignService.id, serviceName: fixture.foreignService.name, qty: 1 },
    ]))).rejects.toMatchObject({ statusCode: 404, code: 'SERVICE_NOT_FOUND' });
  });

  const usageItems = (amounts) => amounts.map((usedQty, index) => ({
    serviceId: fixture.services[index].id, isUsingMembership: true, usedQty,
    coveredAmount: usedQty * 8000, payableAmount: 0,
  }));
  const consume = (tx, items) => consumeQuotaAndLog({
    tx, businessId: fixture.business.id, membershipId: fixture.membership.id,
    transactionId: fixture.transaction.id, items,
  });
  const balances = () => prisma.customerMembershipQuotaBalance.findMany({
    where: { customerMembershipId: fixture.membership.id },
  });

  it('consumes mixed quota amounts atomically and restores every balance on cancellation', async () => {
    await prisma.$transaction((tx) => consume(tx, usageItems([2, 2, 3])));
    expect((await balances()).map(({ remainingQty }) => remainingQty).sort()).toEqual([7, 8, 8]);
    expect(await prisma.customerMembershipUsageLog.count({ where: { transactionId: fixture.transaction.id } })).toBe(3);
    await prisma.$transaction((tx) => restoreQuotaAndCleanupLogs(tx, fixture.transaction.id));
    expect((await balances()).map(({ remainingQty }) => remainingQty)).toEqual([10, 10, 10]);
    expect(await prisma.customerMembershipUsageLog.count({ where: { transactionId: fixture.transaction.id } })).toBe(0);
  });

  it('rolls back earlier deductions if a later quota group has insufficient balance', async () => {
    await expect(prisma.$transaction((tx) => consume(tx, usageItems([2, 20]))))
      .rejects.toMatchObject({ statusCode: 409, code: 'MEMBERSHIP_QUOTA_CHANGED' });
    expect((await balances()).map(({ remainingQty }) => remainingQty)).toEqual([10, 10, 10]);
    expect(await prisma.customerMembershipUsageLog.count({ where: { transactionId: fixture.transaction.id } })).toBe(0);
  });
});
