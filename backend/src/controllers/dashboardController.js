const prisma = require('../config/prisma');
const { sendError } = require('../utils/errorResponse');
const { getWibDayBounds } = require('../utils/businessDate');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TREND_DAYS = 366;
const DEFAULT_TZ_OFFSET_MIN = 420; // WIB; klien mengirim tzOffset sendiri
const PAID_METHODS = ['CASH', 'QRIS'];
const ACTIVE_STATUSES = ['PENDING', 'PROSES'];
const REPORTED_STATUSES = ['PENDING', 'PROSES', 'SELESAI', 'DIAMBIL', 'CANCELLED'];
const PAYMENT_METHODS = ['CASH', 'QRIS', 'BAYAR_NANTI'];
const MEMBERSHIP_EXPIRING_DAYS = 7;
const TOP_SERVICES_LIMIT = 5;
const TOP_SERVICES_SCAN_LIMIT = 10000;

const parseRange = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  return { start, end };
};

const parseTzOffset = (value) => {
  const n = Number(value);
  if (value === undefined || value === '' || !Number.isFinite(n)) return DEFAULT_TZ_OFFSET_MIN;
  return Math.max(-720, Math.min(840, Math.round(n)));
};

/** Ringkas hasil groupBy(status, paymentMethod) menjadi angka-angka dashboard. */
const summarizeGroups = (groups) => {
  const summary = {
    totalTransactions: 0,
    paidRevenue: 0,
    grossAmount: 0,
    receivable: { amount: 0, count: 0 },
    cancelled: { count: 0, amount: 0 },
    payments: new Map(PAYMENT_METHODS.map((name) => [name, { name, value: 0, amount: 0 }])),
    statusCounts: new Map(),
  };

  for (const group of groups) {
    const count = group._count._all;
    const amount = group._sum.payableAmount || 0;
    summary.statusCounts.set(group.status, (summary.statusCounts.get(group.status) || 0) + count);

    if (group.status === 'CANCELLED') {
      summary.cancelled.count += count;
      summary.cancelled.amount += amount;
      continue;
    }

    summary.totalTransactions += count;
    summary.grossAmount += amount;
    if (PAID_METHODS.includes(group.paymentMethod)) summary.paidRevenue += amount;
    if (group.paymentMethod === 'BAYAR_NANTI') {
      summary.receivable.count += count;
      summary.receivable.amount += amount;
    }
    const payment = summary.payments.get(group.paymentMethod);
    if (payment) {
      payment.value += count;
      payment.amount += amount;
    }
  }
  return summary;
};

const getDashboardStats = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const range = parseRange(req.query.startDate, req.query.endDate);
    const dateFilter = range ? { startDate: { gte: range.start, lte: range.end } } : {};

    const now = new Date();
    const { start: startOfToday, end: endOfToday } = getWibDayBounds(now);

    let previousFilter = null;
    if (range) {
      const spanMs = range.end.getTime() - range.start.getTime();
      const previousEnd = new Date(range.start.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - spanMs);
      previousFilter = { startDate: { gte: previousStart, lte: previousEnd } };
    }

    const groupArgs = (filter) => ({
      by: ['status', 'paymentMethod'],
      _count: { _all: true },
      _sum: { payableAmount: true },
      where: { businessId, ...filter },
    });

    const [
      groups, previousGroups, todayOrders, activeQueue, overdueCount, totalCustomers,
      newCustomers, activeMembers, expiringMembers, waSession, waQueueGroups,
    ] = await Promise.all([
      prisma.transaction.groupBy(groupArgs(dateFilter)),
      previousFilter ? prisma.transaction.groupBy(groupArgs(previousFilter)) : null,
      prisma.transaction.findMany({
        where: { businessId, startDate: { gte: startOfToday, lte: endOfToday } },
        orderBy: { startDate: 'desc' },
        take: 20,
        select: {
          id: true, startDate: true, customerName: true, serviceName: true,
          totalPrice: true, coveredAmount: true, payableAmount: true,
          status: true, paymentMethod: true,
        },
      }),
      prisma.transaction.count({ where: { businessId, status: { in: ACTIVE_STATUSES } } }),
      prisma.transaction.count({
        where: { businessId, status: { in: ACTIVE_STATUSES }, estimatedCompletionAt: { lt: now } },
      }),
      prisma.customer.count({ where: { businessId } }),
      range
        ? prisma.customer.count({ where: { businessId, createdAt: { gte: range.start, lte: range.end } } })
        : null,
      prisma.customerMembership.count({ where: { businessId, status: 'ACTIVE', endAt: { gte: now } } }),
      prisma.customerMembership.count({
        where: {
          businessId, status: 'ACTIVE',
          endAt: { gte: now, lte: new Date(now.getTime() + MEMBERSHIP_EXPIRING_DAYS * DAY_MS) },
        },
      }),
      prisma.whatsAppSession.findUnique({ where: { businessId }, select: { status: true } }),
      prisma.whatsAppQueue.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { businessId, status: { in: ['PENDING', 'FAILED'] } },
      }),
    ]);

    const current = summarizeGroups(groups);
    const previous = previousGroups ? summarizeGroups(previousGroups) : null;
    const queueCount = (status) => waQueueGroups.find((g) => g.status === status)?._count._all || 0;

    res.json({
      totalTransactions: current.totalTransactions,
      totalRevenue: current.paidRevenue,
      averageOrderValue: current.totalTransactions
        ? Math.round(current.grossAmount / current.totalTransactions)
        : 0,
      receivable: current.receivable,
      cancelled: current.cancelled,
      activeQueue,
      overdueCount,
      totalCustomers,
      newCustomers,
      previous: previous && {
        totalTransactions: previous.totalTransactions,
        totalRevenue: previous.paidRevenue,
      },
      paymentStats: PAYMENT_METHODS.map((name) => current.payments.get(name)),
      statusStats: REPORTED_STATUSES.map((status) => ({
        name: status, value: current.statusCounts.get(status) || 0,
      })),
      membership: { active: activeMembers, expiringSoon: expiringMembers, expiringDays: MEMBERSHIP_EXPIRING_DAYS },
      whatsapp: {
        status: waSession?.status || 'disconnected',
        pending: queueCount('PENDING'),
        failed: queueCount('FAILED'),
      },
      todayOrders,
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// Tren pendapatan harian, dibucket per tanggal lokal klien (tzOffset menit ke timur UTC).
const getRevenueTrend = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const tzOffset = parseTzOffset(req.query.tzOffset);
    const shiftMs = tzOffset * 60000;
    const keyOf = (date) => new Date(date.getTime() + shiftMs).toISOString().slice(0, 10);

    const range = parseRange(req.query.startDate, req.query.endDate);
    const end = range ? range.end : new Date();
    const start = range ? range.start : new Date(end.getTime() - 6 * DAY_MS);

    let firstDay = Date.parse(`${keyOf(start)}T00:00:00Z`);
    const lastDay = Date.parse(`${keyOf(end)}T00:00:00Z`);
    firstDay = Math.max(firstDay, lastDay - (MAX_TREND_DAYS - 1) * DAY_MS);

    const buckets = new Map();
    for (let day = firstDay; day <= lastDay; day += DAY_MS) {
      const key = new Date(day).toISOString().slice(0, 10);
      buckets.set(key, { date: key, revenue: 0, cash: 0, qris: 0, receivable: 0, count: 0 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId,
        startDate: { gte: new Date(firstDay - shiftMs), lte: new Date(lastDay + DAY_MS - 1 - shiftMs) },
        status: { not: 'CANCELLED' },
      },
      select: { startDate: true, payableAmount: true, paymentMethod: true },
    });

    for (const t of transactions) {
      const bucket = buckets.get(keyOf(new Date(t.startDate)));
      if (!bucket) continue;
      const amount = t.payableAmount || 0;
      bucket.count += 1;
      if (t.paymentMethod === 'CASH') bucket.cash += amount;
      if (t.paymentMethod === 'QRIS') bucket.qris += amount;
      if (t.paymentMethod === 'BAYAR_NANTI') bucket.receivable += amount;
    }

    const data = Array.from(buckets.values()).map((b) => ({
      ...b,
      revenue: b.cash + b.qris,
      label: new Date(`${b.date}T00:00:00Z`).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', timeZone: 'UTC',
      }),
    }));

    res.json({ data });
  } catch (error) {
    sendError(res, error, 500);
  }
};

// Layanan terlaris berdasarkan lineItems transaksi non-batal pada periode.
const getTopServices = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const range = parseRange(req.query.startDate, req.query.endDate);

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId,
        status: { not: 'CANCELLED' },
        ...(range ? { startDate: { gte: range.start, lte: range.end } } : {}),
      },
      select: { serviceName: true, lineItems: true, payableAmount: true },
      take: TOP_SERVICES_SCAN_LIMIT,
    });

    const services = new Map();
    const add = (name, unit, amount, qty) => {
      if (!name) return;
      const entry = services.get(name) || { name, unit: unit || null, orders: 0, qty: 0, revenue: 0 };
      entry.orders += 1;
      entry.qty += qty || 0;
      entry.revenue += amount || 0;
      services.set(name, entry);
    };

    for (const t of transactions) {
      const items = Array.isArray(t.lineItems) ? t.lineItems : [];
      if (items.length) {
        for (const item of items) {
          add(item.serviceName, item.unit, item.payableAmount ?? item.lineTotal, Number(item.qty));
        }
      } else {
        add(t.serviceName, null, t.payableAmount, 0);
      }
    }

    const data = [...services.values()]
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
      .slice(0, TOP_SERVICES_LIMIT);

    res.json({ data });
  } catch (error) {
    sendError(res, error, 500);
  }
};

module.exports = { getDashboardStats, getRevenueTrend, getTopServices };
