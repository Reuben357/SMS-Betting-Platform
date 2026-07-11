const { logger } = require('./logger');
const PG_ERROR_CODES = require('./pgErrorCodes');

function errorHandler(err, req, res, next) {
  const reqId = req.id; // set by pino-http, ties this line to the request log

  // Auth errors
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    logger.warn({ reqId, path: req.path, method: req.method }, '401 Unauthorized');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.status === 403) {
    logger.warn({ reqId, path: req.path, method: req.method }, '403 Forbidden');
    return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
  }

  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn({ reqId, path: req.path }, '413 File too large');
    return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  if (err.message === 'Only CSV files are accepted.') {
    logger.warn({ reqId, path: req.path }, '415 Unsupported file type');
    return res.status(415).json({ error: err.message });
  }

  // PostgreSQL known errors
  if (err.code && PG_ERROR_CODES[err.code]) {
    logger.error(
        { reqId, path: req.path, method: req.method, pgCode: err.code, detail: err.detail },
        `PostgreSQL error ${err.code}: ${err.message}`,
    );
    return res.status(400).json({ error: PG_ERROR_CODES[err.code] });
  }

  // Catch-all -- never expose stack traces to the client, but always log
  // the full error server-side with a timestamp and request id.
  logger.error(
      { reqId, path: req.path, method: req.method, err },
      `Unhandled error: ${err.message}`,
  );
  return res.status(500).json({ error: 'An unexpected error occurred.' });
}

module.exports = { errorHandler, logger };