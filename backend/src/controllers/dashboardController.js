const prisma = require('../config/prisma');

const getDashboardStats = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        startDate: { gte: new Date(startDate), lte: new Date(endDate) },
      };
    }

    const totalTransactions = await prisma.transaction.count({
      where: { businessId, ...dateFilter },
    });

    const revenueAggr = await prisma.transaction.aggregate({
      _sum: { payableAmount: true },
      where: {
        businessId,
        ...dateFilter,
      },
    });
    const totalRevenue = revenueAggr._sum.payableAmount || 0;

    const cashCount = await prisma.transaction.count({
      where: { businessId, paymentMethod: 'CASH', ...dateFilter },
    });
    const qrisCount = await prisma.transaction.count({
      where: { businessId, paymentMethod: 'QRIS', ...dateFilter },
    });

    // Ringkasan status pengerjaan (untuk tahu antrian aktif vs selesai)
    const statusGroups = await prisma.transaction.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { businessId, ...dateFilter },
    });
    const statusStats = ['PENDING', 'PROSES', 'SELESAI', 'DIAMBIL'].map((s) => ({
      name: s,
      value: statusGroups.find((g) => g.status === s)?._count._all || 0,
    }));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayOrders = await prisma.transaction.findMany({
      where: {
        businessId,
        startDate: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { startDate: 'desc' },
      take: 20,
    });

    const activeQueue = await prisma.transaction.count({
      where: { businessId, status: { in: ['PENDING', 'PROSES'] } },
    });

    const totalCustomers = await prisma.customer.count({ where: { businessId } });

    res.json({
      totalTransactions,
      totalRevenue,
      activeQueue,
      totalCustomers,
      paymentStats: [
        { name: 'CASH', value: cashCount },
        { name: 'QRIS', value: qrisCount },
      ],
      statusStats,
      todayOrders,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tren pendapatan harian (sesuai proposal: "grafik pendapatan" pada Dashboard Analitik)
const getRevenueTrend = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        businessId,
        startDate: { gte: start, lte: end },
      },
      select: { startDate: true, payableAmount: true, paymentMethod: true },
    });

    // Bucket per tanggal (YYYY-MM-DD)
    const buckets = new Map();
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.set(key, { date: key, revenue: 0, cash: 0, qris: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    transactions.forEach((t) => {
      const key = new Date(t.startDate).toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (!b) return;
      b.revenue += t.payableAmount || 0;
      b.count += 1;
      if (t.paymentMethod === 'CASH') b.cash += t.payableAmount || 0;
      if (t.paymentMethod === 'QRIS') b.qris += t.payableAmount || 0;
    });

    // Format label tanggal yang ramah UI
    const data = Array.from(buckets.values()).map((b) => ({
      ...b,
      label: new Date(b.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardStats, getRevenueTrend };
