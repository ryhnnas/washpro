const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.auth_token;

  const token = headerToken || cookieToken;

  if (!token) return res.status(401).json({ message: 'Akses ditolak, token tidak ada' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: verified.id },
      select: { id: true, businessId: true, role: true, sessionVersion: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'User tidak ditemukan', code: 'SESSION_REVOKED' });
    }

    const tokenSessionVersion = verified.sessionVersion ?? 0;
    if (user.sessionVersion !== tokenSessionVersion) {
      if (cookieToken && !headerToken) {
        res.clearCookie('auth_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth' });
        res.clearCookie('csrf_token', { path: '/' });
      }
      return res.status(401).json({ message: 'Sesi telah berakhir. Silakan login ulang.', code: 'SESSION_REVOKED' });
    }

    req.user = {
      id: user.id,
      businessId: user.businessId,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
    next();
  } catch (err) {
    if (cookieToken && !headerToken) {
      res.clearCookie('auth_token', { path: '/' });
      res.clearCookie('csrf_token', { path: '/' });
    }
    res.status(403).json({ message: 'Token tidak valid' });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak, role tidak memiliki izin' });
    }
    next();
  };
};

authMiddleware.authorizeRole = authorizeRole;

module.exports = authMiddleware;
module.exports.authorizeRole = authorizeRole;
