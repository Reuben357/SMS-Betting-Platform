// services/paymentRecovery.js
const { pool } = require("../config/db");
const { processPayment } = require("./paymentService");
const { acquireLock, releaseLock } = require("../middleware/redisLock");
const { logger } = require("../middleware/errorHandler");

/**
 * Recovers payments stuck in 'processing' or 'pending_retry'.
 * Call this on server startup and/or via a periodic cron.
 */
async function recoverStuckPayments() {
  try {
    const result = await pool.query(
      `SELECT id, mpesa_ref, phone_number, amount, status
       FROM payments
       WHERE status IN ('processing', 'pending_retry', 'failed')
         AND created_at < NOW() - INTERVAL '3 minutes'
         AND resolved = false
       ORDER BY created_at ASC
       LIMIT 50`
    );

    if (result.rows.length === 0) return;

    logger.info(`Payment recovery: found ${result.rows.length} stuck payments`);

    for (const payment of result.rows) {
      const { id, mpesa_ref, phone_number, amount, status } = payment;
      const lockKey = `mpesa:${mpesa_ref}`;

      const locked = await acquireLock(lockKey, 120);
      if (!locked) {
        logger.warn(`Recovery: could not lock ${mpesa_ref} (status: ${status}), skipping`);
        continue;
      }

      try {
        logger.info(`Recovery: reprocessing payment ${id} (${mpesa_ref}, was: ${status})`);
        await processPayment(id, {
          mpesaRef: mpesa_ref,
          phoneNumber: phone_number,
          amount,
        });
      } catch (err) {
        logger.error(`Recovery: failed for payment ${id}: ${err.message}`);
        await pool.query(
          `UPDATE payments SET status = 'failed' WHERE id = $1`,
          [id]
        );
      } finally {
        await releaseLock(lockKey);
      }
    }
  } catch (err) {
    logger.error(`recoverStuckPayments error: ${err.message}`);
  }
}

module.exports = { recoverStuckPayments };