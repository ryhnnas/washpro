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
 * Validasi file signature (magic bytes) untuk memastikan file benar-benar gambar.
 * MIME type dari client bisa di-spoof, tapi magic bytes tidak bisa dipalsukan
 * tanpa mengubah isi file.
 */
const FILE_SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: starts with RIFF....WEBP
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset4: [0x57, 0x45, 0x42, 0x50] },
];

const validateFileSignature = (filePath) => {
  return new Promise((resolve, reject) => {
    // Baca 12 byte pertama (cukup untuk semua signature di atas)
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 12, 0);
    } finally {
      fs.closeSync(fd);
    }

    for (const sig of FILE_SIGNATURES) {
      const headerMatch = sig.bytes.every((byte, i) => buffer[i] === byte);
      if (headerMatch) {
        // WebP memerlukan validasi tambahan di offset 8-11
        if (sig.offset4) {
          const offset4Match = sig.offset4.every((byte, i) => buffer[8 + i] === byte);
          if (offset4Match) return resolve(true);
        } else {
          return resolve(true);
        }
      }
    }

    resolve(false);
  });
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
 * Termasuk validasi magic bytes setelah file tersimpan.
 */
const handleUpload = (req, res, next) => {
  uploadPaymentProof(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Ukuran file terlalu besar. Maksimal 3MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Validasi file signature (magic bytes) setelah upload
    if (req.file) {
      try {
        const isValidImage = await validateFileSignature(req.file.path);
        if (!isValidImage) {
          // Hapus file yang bukan gambar valid
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({
            message: 'File yang diunggah bukan gambar valid. Pastikan file adalah JPG, PNG, WebP, atau GIF.',
          });
        }
      } catch (validationErr) {
        // Jika validasi gagal, hapus file dan return error
        fs.unlink(req.file.path, () => {});
        return res.status(500).json({ message: 'Gagal memvalidasi file yang diunggah.' });
      }
    }

    next();
  });
};

module.exports = { handleUpload };
