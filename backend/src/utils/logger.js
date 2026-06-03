/**
 * Structured Logger Utility
 * Provides consistent logging with context (requestId, userId, businessId).
 *
 * Format:
 * - Development: pretty-printed, colorized
 * - Production: JSON (untuk log aggregation tools seperti CloudWatch, Datadog, ELK)
 */

const crypto = require('crypto');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || LOG_LEVELS.info;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Generate short request ID (8 chars)
 */
const generateRequestId = () => crypto.randomBytes(4).toString('hex');

/**
 * Format log entry
 */
const formatEntry = (level, message, context = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  // Remove undefined values
  Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k]);

  return entry;
};

/**
 * Output log entry
 */
const output = (level, entry) => {
  if (IS_PRODUCTION) {
    // JSON format untuk log aggregation
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } else {
    // Pretty format untuk development
    const colors = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' };
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    const ctx = Object.keys(entry)
      .filter((k) => !['timestamp', 'level', 'message'].includes(k))
      .map((k) => `${k}=${typeof entry[k] === 'object' ? JSON.stringify(entry[k]) : entry[k]}`)
      .join(' ');

    const time = entry.timestamp.split('T')[1].replace('Z', '');
    console.log(`${color}[${time}] ${level.toUpperCase().padEnd(5)}${reset} ${entry.message}${ctx ? ` ${color}${ctx}${reset}` : ''}`);
  }
};

/**
 * Create logger instance (optionally with pre-bound context)
 */
const createLogger = (baseContext = {}) => {
  const log = (level, message, context = {}) => {
    if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
    const entry = formatEntry(level, message, { ...baseContext, ...context });
    output(level, entry);
  };

  return {
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),

    /**
     * Create child logger with additional context (e.g., per-request)
     */
    child: (childContext) => createLogger({ ...baseContext, ...childContext }),
  };
};

// Default logger instance
const logger = createLogger();

/**
 * Express middleware: attach requestId dan logger ke req
 */
const requestLogger = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  req.log = logger.child({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
  });

  // Set response header untuk tracing
  res.setHeader('X-Request-Id', req.requestId);

  next();
};

module.exports = { logger, createLogger, requestLogger, generateRequestId };
