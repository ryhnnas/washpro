const prisma = require('../config/prisma');

/**
 * In-memory subscription cache.
 * Key: businessId, Value: { data, expiresAt }
 * TTL: 5 menit — cukup untuk mengurangi DB load tanpa delay terlalu lama saat status berubah.
 */
const subscriptionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

const getSubscriptionData = async (businessId) => {
  const cached = subscriptionCache.get(businessId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionStatus: true,
      trialEndAt: true,
      subscriptionEndAt: true,
      deletedAt: true,
    },
  });

  if (business) {
    subscriptionCache.set(businessId, {
      data: business,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return business;
};

/**
 * Invalidate cache untuk businessId tertentu.
 * Dipanggil setiap kali status subscription berubah.
 */
const invalidateSubscriptionCache = (businessId) => {
  subscriptionCache.delete(businessId);
};

/**
 * Middleware: Cek apakah status langganan toko AKTIF (TRIAL atau ACTIVE).
 * Menggunakan in-memory cache TTL 5 menit untuk mengurangi DB queries.
 */
const checkSubscription = async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(401).json({ message: 'Akses ditolak, businessId tidak ditemukan' });

    const business = await getSubscriptionData(businessId);
    if (!business) return res.status(404).json({ message: 'Data bisnis tidak ditemukan' });

    // Cek soft delete
    if (business.deletedAt) {
      return res.status(403).json({
        message: 'Akun bisnis ini telah dihapus. Hubungi layanan dukungan.',
        subscriptionStatus: 'SUSPENDED',
        action: 'CONTACT_SUPPORT',
      });
    }

    const now = new Date();
    const { subscriptionStatus, trialEndAt, subscriptionEndAt } = business;

    // Cek apakah trial sudah habis tapi belum diupdate
    if (subscriptionStatus === 'TRIAL' && trialEndAt && now > trialEndAt) {
      await prisma.business.update({
        where: { id: businessId },
        data: { subscriptionStatus: 'EXPIRED' },
      });
      invalidateSubscriptionCache(businessId);
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
      invalidateSubscriptionCache(businessId);
      return res.status(403).json({
        message: 'Masa langganan Anda telah berakhir. Silakan melakukan perpanjangan.',
        subscriptionStatus: 'EXPIRED',
        action: 'RENEW',
      });
    }

    // Status yang diizinkan mengakses
    if (subscriptionStatus === 'TRIAL' || subscriptionStatus === 'ACTIVE') {
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
module.exports.invalidateSubscriptionCache = invalidateSubscriptionCache;
