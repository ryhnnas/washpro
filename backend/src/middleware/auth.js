const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "Akses ditolak, token tidak ada" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Masukkan data user dan business_id ke objek request
    req.user = verified; 
    next();
  } catch (err) {
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