const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/payments');

/**
 * GET /api/uploads/payments/:filename
 * Serve file bukti pembayaran dengan access control.
 * 
 * Akses diizinkan jika:
 * 1. User adalah tenant yang memiliki file tersebut (businessId cocok di filename)
 * 2. User adalah SuperAdmin
 */
router.get('/payments/:filename', (req, res) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.auth_token;
  const token = headerToken || cookieToken;

  if (!token) return res.status(401).json({ message: 'Akses ditolak' });

  let decoded = null;
  try {
    decoded = jwt.verify(token, process.env.SUPERADMIN_JWT_SECRET);
    if (decoded?.role === 'SUPERADMIN') req.superAdmin = decoded;
  } catch {}

  if (!req.superAdmin) {
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch {
      return res.status(401).json({ message: 'Akses ditolak' });
    }
  }

  const { filename } = req.params;

  // Sanitasi filename — hanya izinkan karakter aman
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    return res.status(400).json({ message: 'Nama file tidak valid' });
  }

  // Cek ownership: filename format = proof_{businessId}_{timestamp}.ext
  if (req.user && !req.superAdmin) {
    const businessId = req.user.businessId;
    if (!filename.includes(businessId)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke file ini' });
    }
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  // Cegah path traversal
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File tidak ditemukan' });
  }

  // Set cache headers
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(filePath);
});

module.exports = router;
