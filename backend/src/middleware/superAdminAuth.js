const jwt = require('jsonwebtoken');

/**
 * Middleware: Validasi token JWT khusus SuperAdmin.
 * Token SuperAdmin dibuat dengan payload { id, role: 'SUPERADMIN' }.
 */
const requireSuperAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Akses ditolak, token superadmin tidak ada' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Akses ditolak, bukan SuperAdmin' });
    }
    req.superAdmin = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token superadmin tidak valid' });
  }
};

module.exports = requireSuperAdmin;
