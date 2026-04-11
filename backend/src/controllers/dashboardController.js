const prisma = require('../config/prisma');

const getDashboardStats = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
    }

    // Hitung total transaksi
    const totalTransactions = await prisma.transaction.count({
      where: { businessId, ...dateFilter }
    });

    // Hitung total revenue dari transaksi yang SELESAI atau DIAMBIL
    const revenueAggr = await prisma.transaction.aggregate({
      _sum: { totalPrice: true },
      where: { 
        businessId,
        status: { in: ['SELESAI', 'DIAMBIL'] },
        ...dateFilter
      }
    });
    const totalRevenue = revenueAggr._sum.totalPrice || 0;

    // Hitung perbandingan Cash vs QRIS untuk Pie Chart
    const cashCount = await prisma.transaction.count({
      where: { businessId, paymentMethod: 'CASH', ...dateFilter }
    });
    const qrisCount = await prisma.transaction.count({
      where: { businessId, paymentMethod: 'QRIS', ...dateFilter }
    });

    // Fetch Today's Orders
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayOrders = await prisma.transaction.findMany({
      where: {
        businessId,
        startDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      orderBy: { startDate: 'desc' },
      take: 20
    });

    res.json({
      totalTransactions,
      totalRevenue,
      paymentStats: [
        { name: 'CASH', value: cashCount },
        { name: 'QRIS', value: qrisCount }
      ],
      todayOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardStats };
