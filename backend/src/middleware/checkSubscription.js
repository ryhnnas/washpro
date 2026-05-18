const prisma = require('../config/prisma');

/**
 * Middleware: Cek apakah status langganan toko AKTIF (TRIAL atau ACTIVE).
 * Jika EXPIRED, PENDING_PAYMENT, atau SUSPENDED → tolak akses dengan 403.
 * Tidak ada masa tenggang — langsung dikunci begitu status bukan TRIAL/ACTIVE.
 */
const checkSubscription = async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(401).json({ message: 'Akses ditolak, businessId tidak ditemukan' });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        subscriptionStatus: true,
        trialEndAt: true,
        subscriptionEndAt: true,
      },
    });

    if (!business) return res.status(404).json({ message: 'Data bisnis tidak ditemukan' });

    const now = new Date();
    const { subscriptionStatus, trialEndAt, subscriptionEndAt } = business;

    // Cek apakah trial sudah habis tapi belum diupdate
    if (subscriptionStatus === 'TRIAL' && trialEndAt && now > trialEndAt) {
      // Auto-expire: Update status di DB
      await prisma.business.update({
        where: { id: businessId },
        data: { subscriptionStatus: 'EXPIRED' },
      });
      return res.status(403).json({
        message: 'Masa uji coba (trial) telah berakhir. Silakan berlangganan untuk melanjutkan.',
        subscriptionStatus: 'EXPIRED',
        action: 'SUBSCRIBE',
      });
    }

    // Cek apakah langganan berbayar sudah habis
    if (subscriptionStatus === 'ACTIVE' && subscriptionEndAt && now > subscriptionEndAt) {
      await prisma.business.update({
        where: { id: businessId },
        data: { subscriptionStatus: 'EXPIRED' },
      });
      return res.status(403).json({
        message: 'Masa langganan Anda telah berakhir. Silakan melakukan perpanjangan.',
        subscriptionStatus: 'EXPIRED',
        action: 'RENEW',
      });
    }

    // Status yang diizinkan mengakses
    if (subscriptionStatus === 'TRIAL' || subscriptionStatus === 'ACTIVE') {
      // Attach info subscription ke req untuk dipakai controller jika perlu
      req.subscription = { subscriptionStatus, trialEndAt, subscriptionEndAt };
      return next();
    }

    // EXPIRED, PENDING_PAYMENT, SUSPENDED
    const messages = {
      EXPIRED: 'Masa langganan Anda telah berakhir. Silakan melakukan pembayaran.',
      PENDING_PAYMENT: 'Pembayaran Anda sedang diverifikasi oleh Admin. Mohon tunggu konfirmasi.',
      SUSPENDED: 'Akun Anda ditangguhkan oleh Admin. Silakan hubungi layanan dukungan.',
    };

    return res.status(403).json({
      message: messages[subscriptionStatus] || 'Akses tidak diizinkan.',
      subscriptionStatus,
      action: subscriptionStatus === 'PENDING_PAYMENT' ? 'WAIT' : 'SUBSCRIBE',
    });
  } catch (err) {
    console.error('[checkSubscription] Error:', err.message);
    return res.status(500).json({ message: 'Gagal memeriksa status langganan' });
  }
};

module.exports = checkSubscription;
