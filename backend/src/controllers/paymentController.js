const { pool } = require("../config/db");
const { acquireLock, releaseLock } = require("../middleware/redisLock");
const { processPayment } = require("../services/paymentService");
const { normalisePhone } = require("../services/csvService");
const { logger } = require("../middleware/errorHandler");
const redis = require("../config/redis");
const { sendSMS } = require("../services/smsService");
const { updateActiveTier } = require("../services/tierService");

/**
 * Handle M-Pesa C2B (Buy Goods) callback.
 * - Validates and inserts payment with status 'processing'.
 * - Responds immediately to Safaricom.
 * - Acquires Redis lock and processes payment asynchronously.
 */
async function mpesaCallback(req, res) {
  const callbackData = req.body;
  logger.info(`M-Pesa callback received: ${JSON.stringify(callbackData)}`);

  try {
    const mpesaRef = callbackData.TransID;
    const rawPhone = callbackData.MSISDN;
    const rawAmount = callbackData.TransAmount;

    // Validate required fields
    if (!mpesaRef || !rawPhone || !rawAmount) {
      logger.error(`Invalid M-Pesa callback — missing fields`);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Normalize phone number
    const phoneNumber = normalisePhone(rawPhone);
    if (!phoneNumber) {
      logger.error(`M-Pesa callback — invalid phone number: ${rawPhone}`);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Validate amount (positive integer)
    const amount = Math.round(parseFloat(rawAmount));
    if (isNaN(amount) || amount <= 0) {
      logger.error(`M-Pesa callback — invalid amount: ${rawAmount}`);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Insert payment (idempotent via mpesa_ref unique)
    let paymentId;
    try {
      const insertResult = await pool.query(
        `INSERT INTO payments (mpesa_ref, phone_number, amount, status, raw_payload)
         VALUES ($1, $2, $3, 'processing', $4)
         RETURNING id`,
        [mpesaRef, phoneNumber, amount, JSON.stringify(callbackData)],
      );

      paymentId = insertResult.rows[0].id;
    } catch (insertErr) {
      if (insertErr.code === "23505") {
        // unique_violation - duplicate transaction
        logger.warn(`Duplicate M-Pesa callback ignored: ${mpesaRef}`);
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
      }
      throw insertErr;
    }

    // Respond immediately to Safaricom (they require fast reply)
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });

    // Acquire Redis lock to prevent concurrent processing
    const lockKey = `mpesa:${mpesaRef}`;
    const locked = await acquireLock(lockKey, 120);
    if (!locked) {
      logger.warn(`Could not acquire lock for ${mpesaRef} — pending_retry`);
      await pool.query(
        `UPDATE payments SET status = 'pending_retry' WHERE id = $1`,
        [paymentId],
      );
      return;
    }

    // Process payment asynchronously (npn-blocking)
    setImmediate(async () => {
      const TIMEOUT_MS = 30_000; // 30 seconds max

      try {
        await Promise.race([
          processPayment(paymentId, { mpesaRef, phoneNumber, amount }),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`processPayment timed out after ${TIMEOUT_MS}ms`),
                ),
              TIMEOUT_MS,
            ),
          ),
        ]);
      } catch (err) {
        logger.error(
          `Async payment processing failed for ${mpesaRef}: ${err.message}`,
        );

        // Ensure it never stays "processing" if it fails or times out
        await pool.query(
          `UPDATE payments SET status = 'failed' WHERE id = $1`,
          [paymentId],
        );
      } finally {
        await releaseLock(lockKey);
      }
    });
  } catch (err) {
    logger.error(`M-Pesa callback handler error: ${err.message}`);

    if (!res.headersSent) {
      res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    }
  }
}

/**
 * M-Pesa validation endpoint (required by Daraja, even if not used)
 * Safaricom calls this before the actual payment. We just accept it.
 */
async function mpesaValidation(req, res) {
  // Accept any validation request
  return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
}

/**
 * GET /api/payments — list payments with filters (admin only)
 * Supports pagination and filtering by status and resolved flag.
 */
async function getPayments(req, res) {
  const { status, resolved, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const conditions = [];
    const params = [];
    let i = 1;

    if (status) {
      conditions.push(`p.status = $${i++}`);
      params.push(status);
    }
    if (resolved !== undefined) {
      conditions.push(`p.resolved = $${i++}`);
      params.push(resolved === "true");
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT
         p.id,
         p.mpesa_ref,
         p.phone_number,
         p.amount,
         p.status,
         p.excess_amount,
         p.resolved,
         p.created_at,
         pkg.name AS package_name
       FROM payments p
       LEFT JOIN packages pkg ON pkg.id = p.matched_package_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset],
    );

    res.json({
      payments: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    logger.error(`getPayments error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch payments." });
  }
}

/**
 * PUT /api/payments/:id/resolve — mark a flagged payment as resolved (admin only)
 *
 * This endpoint is called when an admin manually resolves a flagged payment.
 * It performs:
 * - Underpayment guard (reject if amount < package price).
 * - Package completeness check (total tips must be >= game_count).
 * - Creates purchase, updates customer/contact, recalculates tier.
 * - Sends pending tips to the customer.
 * - Updates payment status to 'matched' and resolved = true.
 * - Clears the accounting summary cache in Redis.
 */
// controllers/paymentController.js – resolvePayment (full updated function)

async function resolvePayment(req, res) {
  const { id } = req.params;
  const adminId = req.user?.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentRes = await client.query(
      `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (paymentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentRes.rows[0];
    if (payment.status === "matched") {
      await client.query("ROLLBACK");
      return res.json({ message: "Already resolved" });
    }

    const { phone_number, amount, status: paymentStatus } = payment;
    // CHANGED: use a mutable variable for the resolved package id
    let resolvedPackageId = payment.matched_package_id;

    // ---- NEW: Try to match by amount if no package linked yet ----
    if (!resolvedPackageId) {
      const matchAttempt = await client.query(
        `SELECT id, price, game_count FROM packages
         WHERE price = $1 AND is_active = true
         LIMIT 1`,
        [amount]
      );

      if (matchAttempt.rows.length === 0) {
        // Genuinely no matching package — count as revenue
        await client.query(
          `UPDATE payments
           SET status = 'matched', resolved = true, resolved_by = $1, resolved_at = NOW()
           WHERE id = $2`,
          [adminId, id]
        );
        await client.query("COMMIT");
        await redis.del("accounting_summary");
        logger.info(`Underpayment ${id} resolved – counted as revenue, no tips sent.`);
        return res.json({ message: "Underpayment resolved as revenue." });
      }

      // Found a matching package — patch the payment record and proceed
      resolvedPackageId = matchAttempt.rows[0].id;
      await client.query(
        `UPDATE payments SET matched_package_id = $1 WHERE id = $2`,
        [resolvedPackageId, id]
      );
    }

    // ---- Full resolution with matched package ----
    const packageRes = await client.query(
      `SELECT price, game_count FROM packages WHERE id = $1`,
      [resolvedPackageId]          // CHANGED: use resolvedPackageId instead of payment.matched_package_id
    );
    if (packageRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Package not found." });
    }
    const { price: packagePrice, game_count: gameCount } = packageRes.rows[0];

    if (amount < packagePrice) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Underpayment cannot be resolved. Customer must pay the remaining amount.",
      });
    }

    // Package completeness check
    const totalTipsRes = await client.query(
      `SELECT COUNT(*) AS total_tips FROM tips WHERE package_id = $1`,
      [resolvedPackageId]          // CHANGED: use resolvedPackageId
    );
    const totalTips = parseInt(totalTipsRes.rows[0].total_tips);
    if (totalTips < gameCount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Package incomplete: has ${totalTips} tips but requires ${gameCount}. Add more tips first.`,
      });
    }

    // Create purchase record
    await client.query(
      `INSERT INTO purchases (phone_number, package_id, payment_id, amount_paid)
       VALUES ($1, $2, $3, $4)`,
      [phone_number, resolvedPackageId, id, amount]   // CHANGED: use resolvedPackageId
    );

    // Upsert customer
    await client.query(
      `INSERT INTO customers (phone_number, total_purchases, is_active)
       VALUES ($1, 1, true)
       ON CONFLICT (phone_number) DO UPDATE
       SET total_purchases = customers.total_purchases + 1,
           is_active = true,
           updated_at = NOW()`,
      [phone_number]
    );

    // Update contact spend (only once)
    await client.query(
      `UPDATE contacts
       SET total_received_amount = total_received_amount + $1
       WHERE phone_number = $2`,
      [amount, phone_number]
    );

    // CHANGED: moved updateActiveTier to after commit (non‑critical) – see below

    // CHANGED: extended shouldSendTips to cover more statuses
    const NO_TIPS_YET_STATUSES = new Set([
      "flagged_incomplete_package",
      "processing",
      "pending_retry",
      "failed",
    ]);
    const shouldSendTips = NO_TIPS_YET_STATUSES.has(paymentStatus);

    if (shouldSendTips) {
      const tipsRes = await client.query(
        `SELECT game_name, prediction FROM tips
         WHERE package_id = $1 AND status = 'pending'
         ORDER BY "order" ASC`,
        [resolvedPackageId]        // CHANGED: use resolvedPackageId
      );
      const tips = tipsRes.rows;
      if (tips.length > 0) {
        const tipsText = tips
          .map((t, i) => `${i + 1}. ${t.game_name} - ${t.prediction}`)
          .join("\n");
        setImmediate(async () => {
          try {
            await sendSMS(phone_number, `Your tips:\n${tipsText}`, "tips_delivery");
            logger.info(`Tips sent to ${phone_number} for resolved payment ${id}`);
          } catch (smsErr) {
            logger.error(`Failed to send tips for resolved payment ${id}: ${smsErr.message}`);
          }
        });
      } else {
        logger.warn(`No pending tips for package ${resolvedPackageId} when resolving payment ${id}`);
      }
    }

    // Mark payment as resolved
    await client.query(
      `UPDATE payments
       SET status = 'matched', resolved = true, resolved_by = $1, resolved_at = NOW()
       WHERE id = $2`,
      [adminId, id]
    );

    await client.query("COMMIT");
    await redis.del("accounting_summary");
    logger.info(`Payment ${id} resolved successfully.`);

    // CHANGED: recalculate tier after commit, non‑critical
    try {
      await updateActiveTier(phone_number);
    } catch (tierErr) {
      logger.error(`Tier update failed for ${phone_number}: ${tierErr.message}`);
    }

    res.json({ message: "Payment resolved and processed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`resolvePayment error for payment ${id}: ${err.message}`, err);
    res.status(500).json({ error: "Failed to resolve payment" });
  } finally {
    client.release();
  }
}

module.exports = {
  mpesaCallback,
  mpesaValidation,
  getPayments,
  resolvePayment,
};
