// Structured logger
const logger = {
  info: (msg) => console.log(`[${new Date().toISOString()}] [INFO]  ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] [WARN]  ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`),
};

// PostgreSQL error codes
//
// pg throws errors with a .code property
// containing a 5-character SQLSTATE code.
// Mapping these to human-readable messages
// lets us return specific, useful errors
// to the client instead of a generic 500.
//
// Full list: https://www.postgresql.org/docs/current/errcodes-appendix.html
// ------------------------------------
const PG_ERROR_CODES = {
  '23505': 'A record with this value already exists.',        // unique_violation
  '23503': 'This record references a value that does not exist.', // foreign_key_violation
  '23502': 'A required field is missing.',                    // not_null_violation
  '22P02': 'Invalid data format provided.',                   // invalid_text_representation
  '42P01': 'Database table not found.',                       // undefined_table
  '53300': 'Too many database connections.',                  // too_many_connections
  '08006': 'Database connection failed.',                     // connection_failure
};

// ------------------------------------
// Global error handler
//
// Must be the LAST app.use() in index.js.
// Express identifies error handlers by
// their 4-parameter signature.
// All unhandled errors bubble up here.
// ------------------------------------
function errorHandler(err, req, res, next) {
  // --- Auth0 JWT errors ---
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    logger.warn(`401 Unauthorized — ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.status === 403) {
    logger.warn(`403 Forbidden — ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
  }

  // --- Multer file errors ---
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn(`413 File too large — ${req.method} ${req.path}`);
    return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  if (err.message === 'Only CSV files are accepted.') {
    logger.warn(`415 Unsupported file type — ${req.method} ${req.path}`);
    return res.status(415).json({ error: err.message });
  }

  // --- PostgreSQL errors ---
  // pg errors carry a .code property with a SQLSTATE code.
  // Map known codes to specific messages; fall through to 500 for unknown ones.
  if (err.code && PG_ERROR_CODES[err.code]) {
    logger.error(`PostgreSQL ${err.code} — ${req.method} ${req.path} — ${err.message}`);
    return res.status(400).json({ error: PG_ERROR_CODES[err.code] });
  }

  // --- Catch-all ---
  // Log the full error internally but never send internal details to the client.
  // Exposing stack traces or internal messages is a security risk.
  logger.error(`Unhandled error — ${req.method} ${req.path} — ${err.message}`);
  if (err.stack) logger.error(err.stack);

  return res.status(500).json({ error: 'An unexpected error occurred.' });
}

module.exports = { errorHandler, logger };
