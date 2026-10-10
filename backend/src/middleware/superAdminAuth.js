const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * Middleware: Validasi token JWT khusus SuperAdmin.
 * Prioritas: httpOnly cookie, fallback Authorization header (API client).
 */
const requireSuperAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.superadmin_token;
  const token = cookieToken || headerToken;

  if (!token) return res.status(401).json({ message: 'Akses ditolak, token superadmin tidak ada' });

  try {
    const secret = process.env.SUPERADMIN_JWT_SECRET;
    if (!secret) {
      console.error('[SuperAdminAuth] SUPERADMIN_JWT_SECRET tidak dikonfigurasi');
      return res.status(500).json({ message: 'Konfigurasi server tidak lengkap' });
    }
    const verified = jwt.verify(token, secret);
    if (verified.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Akses ditolak, bukan SuperAdmin' });
    }
    const admin = await prisma.superAdmin.findUnique({
      where: { id: verified.id }, select: { id: true, sessionVersion: true },
    });
    if (!admin || admin.sessionVersion !== (verified.sessionVersion ?? 0)) {
      if (cookieToken) res.clearCookie('superadmin_token', { path: '/' });
      return res.status(401).json({ message: 'Sesi telah berakhir. Silakan login ulang.', code: 'SESSION_REVOKED' });
    }
    req.superAdmin = verified;
    next();
  } catch (err) {
    if (cookieToken && !headerToken) {
      res.clearCookie('superadmin_token', { path: '/' });
      res.clearCookie('csrf_token', { path: '/' });
    }
    res.status(403).json({ message: 'Token superadmin tidak valid' });
  }
};

module.exports = requireSuperAdmin;
