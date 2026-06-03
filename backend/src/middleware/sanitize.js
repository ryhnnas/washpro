/**
 * Input Sanitization Middleware
 * Strip HTML tags dari semua string values di req.body untuk mencegah stored XSS.
 *
 * Catatan:
 * - React sudah auto-escape JSX output, tapi data juga digunakan di WhatsApp templates
 *   dan bisa di-render di konteks lain (PDF export, email, dll)
 * - Field yang dikecualikan: whatsappTemplates (memang boleh mengandung formatting)
 */

// Regex untuk strip HTML tags (termasuk script, style, event handlers)
const STRIP_TAGS_REGEX = /<[^>]*>/g;

// Fields yang dikecualikan dari sanitasi (boleh mengandung formatting/HTML)
const EXCLUDED_FIELDS = new Set([
  'whatsappTemplates',
  'whatsappReceiptTemplate',
  'features', // JSON field di subscription plan
]);

/**
 * Sanitize string: hapus HTML tags dan trim whitespace berlebih.
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(STRIP_TAGS_REGEX, '') // Hapus HTML tags
    .replace(/&lt;/gi, '<')        // Decode common entities yang mungkin di-double-encode
    .replace(/&gt;/gi, '>')
    .replace(STRIP_TAGS_REGEX, '') // Second pass setelah decode
    .trim();
};

/**
 * Recursively sanitize semua string values dalam object/array.
 */
const sanitizeValue = (value, key = '') => {
  if (EXCLUDED_FIELDS.has(key)) return value;

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, idx) => sanitizeValue(item, key));
  }

  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v, k);
    }
    return sanitized;
  }

  return value;
};

/**
 * Express middleware: sanitize req.body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = sanitizeInput;
