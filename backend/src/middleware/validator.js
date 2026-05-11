/**
 * Generic Validation Middleware using Zod
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Validasi body, params, dan query jika dibutuhkan
    // Untuk saat ini kita fokus ke req.body
    const validated = schema.parse(req.body);
    req.body = validated; // Gunakan data yang sudah dibersihkan/dicuci oleh Zod
    next();
  } catch (err) {
    // Teruskan ke errorMiddleware
    next(err);
  }
};

module.exports = validate;
