// backend/src/services/superAdminStatsService.js
const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MIN = 420;
const BUSINESS_STATUSES = ['TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'SUSPENDED'];
const EXPIRING_DAYS = 7;
const INACTIVE_DAYS = 14;
const COHORT_DAYS = 90;
const REVENUE_MONTHS = 6;
const LIST_LIMIT = 10;

const shiftMs = WIB_OFFSET_MIN * 60000;

/** 'YYYY-MM' untuk instan `date` menurut kalender WIB. */
const monthKey = (date) => new Date(date.getTime() + shiftMs).toISOString().slice(0, 7);

/** Instan 00:00 WIB tanggal 1 bulan (bulan `date` + offsetMonths). */
const startOfMonthWib = (date, offsetMonths = 0) => {
  const local = new Date(date.getTime() + shiftMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offsetMonths, 1) - shiftMs);
};

const buildPlatformStats = async (prisma, now = new Date()) => {
  const monthStart = startOfMonthWib(now);
  const prevMonthStart = startOfMonthWib(now, -1);
  const trendStart = startOfMonthWib(now, -(REVENUE_MONTHS - 1));
  const expiringUntil = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS);
  const inactiveSince = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
  const cohortStart = new Date(now.getTime() - COHORT_DAYS * DAY_MS);

  const live = { deletedAt: null };
  const expiringWhere = (status, field) => ({
    ...live, subscriptionStatus: status, [field]: { gte: now, lte: expiringUntil },
  });
  const inactiveWhere = {
    ...live,
    subscriptionStatus: 'ACTIVE',
    createdAt: { lt: inactiveSince },
    transactions: { none: { startDate: { gte: inactiveSince } } },
  };
  const cohortWhere = { ...live, createdAt: { gte: cohortStart } };

  const [
    statusGroups, lapsedActive, lapsedTrial,
    pendingPayments, oldestPending, approvedPayments,
    newThisMonth, newPreviousMonth,
    expiringActiveCount, expiringTrialCount, expiringActiveList, expiringTrialList,
    inactiveCount, inactiveList,
    cohortTotal, cohortConverted,
    waSessionGroups, waQueueGroups,
  ] = await Promise.all([
    prisma.business.groupBy({ by: ['subscriptionStatus'], _count: { _all: true }, where: live }),
    prisma.business.count({ where: { ...live, subscriptionStatus: 'ACTIVE', subscriptionEndAt: { lt: now } } }),
    prisma.business.count({ where: { ...live, subscriptionStatus: 'TRIAL', trialEndAt: { lt: now } } }),
    prisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
    prisma.subscriptionPayment.findFirst({
      where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: 'APPROVED', approvedAt: { gte: trendStart } },
      select: { amount: true, approvedAt: true, plan: { select: { name: true } } },
    }),
    prisma.business.count({ where: { ...live, createdAt: { gte: monthStart } } }),
    prisma.business.count({ where: { ...live, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.business.count({ where: expiringWhere('ACTIVE', 'subscriptionEndAt') }),
    prisma.business.count({ where: expiringWhere('TRIAL', 'trialEndAt') }),
    prisma.business.findMany({
      where: expiringWhere('ACTIVE', 'subscriptionEndAt'),
      select: { id: true, name: true, subscriptionEndAt: true },
      orderBy: { subscriptionEndAt: 'asc' },
      take: LIST_LIMIT,
    }),
    prisma.business.findMany({
      where: expiringWhere('TRIAL', 'trialEndAt'),
      select: { id: true, name: true, trialEndAt: true },
      orderBy: { trialEndAt: 'asc' },
      take: LIST_LIMIT,
    }),
    prisma.business.count({ where: inactiveWhere }),
    prisma.business.findMany({
      where: inactiveWhere, select: { id: true, name: true }, orderBy: { createdAt: 'asc' }, take: LIST_LIMIT,
    }),
    prisma.business.count({ where: cohortWhere }),
    prisma.business.count({ where: { ...cohortWhere, subscriptionPayments: { some: { status: 'APPROVED' } } } }),
    prisma.whatsAppSession.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.whatsAppQueue.groupBy({
      by: ['status'], _count: { _all: true }, where: { status: { in: ['PENDING', 'FAILED'] } },
    }),
  ]);

  // Status efektif: toko ACTIVE/TRIAL yang masa aktifnya lewat tapi belum di-flip ke EXPIRED
  // (flip terjadi lazy saat toko itu membuat request) dihitung sebagai Kadaluarsa.
  const statusCounts = Object.fromEntries(BUSINESS_STATUSES.map((s) => [s, 0]));
  let totalBusinesses = 0;
  for (const group of statusGroups) {
    statusCounts[group.subscriptionStatus] = group._count._all;
    totalBusinesses += group._count._all;
  }
  statusCounts.ACTIVE -= lapsedActive;
  statusCounts.TRIAL -= lapsedTrial;
  statusCounts.EXPIRED += lapsedActive + lapsedTrial;

  const currentKey = monthKey(monthStart);
  const previousKey = monthKey(prevMonthStart);
  const trend = new Map();
  for (let i = REVENUE_MONTHS - 1; i >= 0; i -= 1) {
    const key = monthKey(startOfMonthWib(now, -i));
    trend.set(key, { month: key, revenue: 0, count: 0 });
  }
  const plans = new Map();
  for (const payment of approvedPayments) {
    const key = monthKey(new Date(payment.approvedAt));
    const bucket = trend.get(key);
    if (!bucket) continue;
    bucket.revenue += payment.amount;
    bucket.count += 1;
    if (key === currentKey) {
      const name = payment.plan?.name || 'Tanpa paket';
      const entry = plans.get(name) || { name, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += payment.amount;
      plans.set(name, entry);
    }
  }

  const expiringItems = [
    ...expiringActiveList.map((b) => ({ id: b.id, name: b.name, status: 'ACTIVE', endsAt: b.subscriptionEndAt })),
    ...expiringTrialList.map((b) => ({ id: b.id, name: b.name, status: 'TRIAL', endsAt: b.trialEndAt })),
  ]
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, LIST_LIMIT);

  const sessions = { connected: 0, disconnected: 0, error: 0 };
  for (const group of waSessionGroups) {
    if (Object.hasOwn(sessions, group.status)) sessions[group.status] = group._count._all;
  }
  const queueCount = (status) => waQueueGroups.find((g) => g.status === status)?._count._all || 0;

  const thisMonth = trend.get(currentKey)?.revenue || 0;

  return {
    totalBusinesses,
    activeBusinesses: statusCounts.ACTIVE,
    trialBusinesses: statusCounts.TRIAL,
    pendingPayments,
    monthlyRevenue: thisMonth,
    statusCounts,
    oldestPendingPaymentAt: oldestPending?.createdAt || null,
    revenue: { thisMonth, previousMonth: trend.get(previousKey)?.revenue || 0, trend: [...trend.values()] },
    growth: { newThisMonth, newPreviousMonth },
    conversion: {
      cohortDays: COHORT_DAYS,
      total: cohortTotal,
      converted: cohortConverted,
      rate: cohortTotal ? Math.round((cohortConverted / cohortTotal) * 1000) / 10 : 0,
    },
    expiringSoon: { days: EXPIRING_DAYS, total: expiringActiveCount + expiringTrialCount, items: expiringItems },
    inactive: { days: INACTIVE_DAYS, total: inactiveCount, items: inactiveList },
    planBreakdown: [...plans.values()].sort((a, b) => b.revenue - a.revenue),
    platform: {
      whatsappSessions: sessions,
      queue: { pending: queueCount('PENDING'), failed: queueCount('FAILED') },
    },
  };
};

module.exports = { buildPlatformStats };
