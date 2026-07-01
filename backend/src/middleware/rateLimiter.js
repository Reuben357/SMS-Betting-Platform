// Simple in-process rate limiter using a sliding window counter per IP.
// For production with multiple workers, replace the Map with a Redis store.
const { logger } = require("./errorHandler");


function rateLimit({
  windowMs = 60_000,
  max = 60,
  message = "Too many requests. Please slow down.",
  skipPaths = [],
} = {}) {
  const store = new Map();

  // Periodically clean expired entries to avoid memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, windowMs * 2);
  cleanupInterval.unref(); // does not keep Node process alive

  return function rateLimitMiddleware(req, res, next) {
    // Skip rate limiting for certain paths
    if (skipPaths.includes(req.path)) {
      return next();
    }

    // Get real IP behind proxies (Cloudflare, Nginx, etc.)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      logger.warn(`Rate limit hit — IP ${ip} on ${req.method} ${req.path}`);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Pre‑built limiters
const standardLimiter = rateLimit({
   windowMs: 60_000,
    max: 120,
    skipPaths: ['/api/uploads/csv'],
  });

const mpesaLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: "M-Pesa callback rate limit exceeded.",
});
const smsLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: "SMS send rate limit reached. Wait a minute before sending again.",
});
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: "Too many authentication attempts. Please wait before trying again.",
});

//Upload Limiter with a much higher limit, since uploads can be larger and less frequent
const uploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 1000,
  message: "Upload rate limit exceeded.",
});

module.exports = {
  rateLimit,
  standardLimiter,
  mpesaLimiter,
  uploadLimiter,
  smsLimiter,
  authLimiter,
};
