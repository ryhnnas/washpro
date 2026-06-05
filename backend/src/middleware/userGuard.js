const prisma = require('../config/prisma');

const userGuard = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const businessIdFromToken = req.user?.businessId;
    if (!userId) return res.status(401).json({ message: 'Akses ditolak, user tidak ditemukan' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        businessId: true,
        isEmailVerified: true,
        mustChangePassword: true,
      },
    });

    if (!user) return res.status(401).json({ message: 'Akses ditolak, user tidak ditemukan' });
    if (businessIdFromToken && user.businessId !== businessIdFromToken) {
      return res.status(401).json({ message: 'Akses ditolak, token tidak valid' });
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { subscriptionStatus: true, deletedAt: true },
    });

    if (business?.deletedAt) {
      return res.status(403).json({
        message: 'Akun bisnis ini telah dihapus. Hubungi layanan dukungan.',
        subscriptionStatus: 'SUSPENDED',
        action: 'CONTACT_SUPPORT',
        code: 'BUSINESS_DELETED',
      });
    }

    if (business?.subscriptionStatus === 'SUSPENDED') {
      return res.status(403).json({
        message: 'Akun Anda ditangguhkan. Mohon chat admin untuk informasi lebih lanjut.',
        subscriptionStatus: 'SUSPENDED',
        action: 'SUSPENDED',
        code: 'BUSINESS_SUSPENDED',
      });
    }

    if (user.role === 'OWNER' && !user.isEmailVerified) {
      return res.status(403).json({
        message: 'Email Anda belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    if (user.role === 'STAFF' && (!user.isEmailVerified || user.mustChangePassword)) {
      return res.status(403).json({
        message: 'Setup akun staf diperlukan sebelum masuk ke dashboard.',
        code: 'STAFF_ONBOARDING_REQUIRED',
        flags: { isEmailVerified: user.isEmailVerified, mustChangePassword: user.mustChangePassword },
        email: user.email,
      });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = userGuard;
