/**
 * Global Error Handler Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  console.error(`[Error] ${new Date().toISOString()}:`, err.stack || err.message);

  // Jika error dari Zod (Validation Error)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      status: 'fail',
      message: 'Validasi data gagal',
      errors: Array.isArray(err.errors) ? err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      })) : []
    });
  }

  // Jika error Prisma (Database Error)
  if (err.code && err.code.startsWith('P')) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada database',
      // Jangan kirim detail teknis di produksi
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Default Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? message : 'Terjadi kesalahan pada server'
  });
};

module.exports = errorMiddleware;
