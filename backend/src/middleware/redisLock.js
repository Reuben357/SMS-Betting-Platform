const redis = require('../config/redis');

/**
 * Acquire a lock with a given key and TTL (seconds).
 * Returns true if lock acquired, false otherwise.
 */
async function acquireLock(key, ttlSeconds = 60) {
  const result = await redis.set(key, 'locked', {
    NX: true,
    EX: ttlSeconds,
  });
  return result === 'OK';
}

/**
 * Release a lock.
 */
async function releaseLock(key) {
  await redis.del(key);
}

module.exports = { acquireLock, releaseLock };