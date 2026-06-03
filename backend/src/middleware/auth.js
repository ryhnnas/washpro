const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Prioritas: 1) Authorization header (API client/mobile), 2) httpOnly cookie (browser)
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.auth_token;

  const token = headerToken || cookieToken;

  if (!token) return res.status(401).json({ message: "Akses ditolak, token tidak ada" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Masukkan data user dan business_id ke objek request
    req.user = verified; 
    next();
  } catch (err) {
    // Jika token dari cookie expired, clear cookie
    if (cookieToken && !headerToken) {
      res.clearCookie('auth_token');
      res.clearCookie('csrf_token');
    }
    res.status(403).json({ message: "Token tidak valid" });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Akses ditolak, role tidak memiliki izin" });
    }
    next();
  };
};

// Export authMiddleware as default, but attach authorizeRole to it for backward compatibility
authMiddleware.authorizeRole = authorizeRole;

module.exports = authMiddleware;
module.exports.authorizeRole = authorizeRole;
