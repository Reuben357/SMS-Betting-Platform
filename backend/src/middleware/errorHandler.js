// Structured logger – provides consistent log format
const logger = {
  info: (msg) => console.log(`[${new Date().toISOString()}] [INFO]  ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] [WARN]  ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`),
  debug: (msg) => console.log(`[${new Date().toISOString()}] [DEBUG] ${msg}`),
};

// PostgreSQL error codes mapping
const PG_ERROR_CODES = {
  23505: "A record with this value already exists.",
  23503: "This record references a value that does not exist.",
  23502: "A required field is missing.",
  "22P02": "Invalid data format provided.",
  "42P01": "Database table not found.",
  53300: "Too many database connections.",
  "08006": "Database connection failed.",
};

function errorHandler(err, req, res, next) {
  // Auth errors
  if (err.status === 401 || err.name === "UnauthorizedError") {
    logger.warn(`401 Unauthorized — ${req.method} ${req.path}`);
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (err.status === 403) {
    logger.warn(`403 Forbidden — ${req.method} ${req.path}`);
    return res
      .status(403)
      .json({ error: "Forbidden — insufficient permissions" });
  }

  // Multer file errors
  if (err.code === "LIMIT_FILE_SIZE") {
    logger.warn(`413 File too large — ${req.method} ${req.path}`);
    return res
      .status(413)
      .json({ error: "File too large. Maximum size is 10MB." });
  }
  if (err.message === "Only CSV files are accepted.") {
    logger.warn(`415 Unsupported file type — ${req.method} ${req.path}`);
    return res.status(415).json({ error: err.message });
  }

  // PostgreSQL known errors
  if (err.code && PG_ERROR_CODES[err.code]) {
    logger.error(
      `PostgreSQL ${err.code} — ${req.method} ${req.path} — ${err.message}`,
    );
    return res.status(400).json({ error: PG_ERROR_CODES[err.code] });
  }

  // Catch-all – never expose stack traces
  logger.error(`Unhandled error — ${req.method} ${req.path} — ${err.message}`);
  if (err.stack) logger.error(err.stack);
  return res.status(500).json({ error: "An unexpected error occurred." });
}

module.exports = { errorHandler, logger };
