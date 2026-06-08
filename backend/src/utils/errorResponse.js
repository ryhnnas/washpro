/**
 * Error Response Utility
 * Mencegah kebocoran informasi internal ke client di production.
 */

const { DomainError } = require('./domainError');

const isDev = () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/**
 * Kirim error response yang aman.
 * - Development: kirim error.message lengkap untuk debugging
 * - Production: kirim pesan generik, log detail ke server
 *
 * @param {object} res - Express response
 * @param {Error|string} error - Error object atau message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {string} userMessage - Pesan yang aman ditampilkan ke user
 */
const sendError = (res, error, statusCode = 500, userMessage = null) => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Selalu log ke server untuk debugging
  if (statusCode >= 500) {
    console.error(`[ERROR ${statusCode}] ${res.req?.method} ${res.req?.originalUrl}:`, errorMessage);
  }

  // Response ke client
  if (isDev()) {
    return res.status(statusCode).json({
      status: 'error',
      message: userMessage || errorMessage,
      // Detail hanya di development
      detail: errorMessage !== (userMessage || errorMessage) ? errorMessage : undefined,
    });
  }

  // Production: pesan generik
  const safeMessages = {
    400: 'Data yang dikirim tidak valid.',
    401: 'Akses ditolak.',
    403: 'Anda tidak memiliki izin untuk aksi ini.',
    404: 'Data tidak ditemukan.',
    409: 'Data konflik dengan data yang sudah ada.',
    413: 'Ukuran data terlalu besar.',
    429: 'Terlalu banyak permintaan, coba lagi nanti.',
    500: 'Terjadi kesalahan pada server. Silakan coba lagi.',
  };

  return res.status(statusCode).json({
    status: 'error',
    message: userMessage || safeMessages[statusCode] || safeMessages[500],
  });
};

/**
 * Handle controller errors — DomainError returns structured 4xx, others fall through to sendError.
 */
const handleControllerError = (res, error, defaultMessage = 'Terjadi kesalahan pada server') => {
  if (error instanceof DomainError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      code: error.code,
    });
  }
  return sendError(res, error, 500, defaultMessage);
};

module.exports = { sendError, handleControllerError };
