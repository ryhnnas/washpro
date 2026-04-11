const prisma = require('../config/prisma');

const getDashboardStats = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    // Hitung total transaksi
    const totalTransactions = await prisma.transaction.count({
      where: { businessId }
    });

    // Hitung total revenue dari transaksi yang SELESAI atau DIAMBIL
    const revenueAggr = await prisma.transaction.aggregate({
      _sum: { totalPrice: true },
      where: { 
        businessId,
        status: { in: ['SELESAI', 'DIAMBIL'] }
      }
    });
    const totalRevenue = revenueAggr._sum.totalPrice || 0;

    // Hitung perbandingan Cash vs QRIS untuk Pie Chart
    const cashCount = await prisma.transaction.count({
      where: { businessId, paymentMethod: 'CASH' }
    });
    const qrisCount = await prisma.transaction.count({
      where: { businessId, paymentMethod: 'QRIS' }
    });

    res.json({
      totalTransactions,
      totalRevenue,
      paymentStats: [
        { name: 'CASH', value: cashCount },
        { name: 'QRIS', value: qrisCount }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardStats };
