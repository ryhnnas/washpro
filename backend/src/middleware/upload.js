const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/payments');

// Pastikan direktori ada saat module di-load
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // Sanitasi: gunakan businessId (UUID) + timestamp, abaikan nama file asli
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const safeName = `proof_${req.user.businessId}_${Date.now()}${ext || '.jpg'}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak diizinkan. Hanya JPG, PNG, WEBP, atau GIF.'), false);
  }
};

/**
 * Middleware upload bukti pembayaran.
 * Field name: proofOfPayment
 * Max size: 3MB (setelah encoding multipart, lebih efisien dari base64)
 */
const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
}).single('proofOfPayment');

/**
 * Wrapper untuk handle multer error dengan response JSON yang konsisten.
 */
const handleUpload = (req, res, next) => {
  uploadPaymentProof(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Ukuran file terlalu besar. Maksimal 3MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = { handleUpload };
