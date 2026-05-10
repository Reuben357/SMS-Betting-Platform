const { pool } = require("../config/db");
const { sendSMS } = require("./smsService");
const { updateActiveTier } = require("./tierService");
const { logger } = require("../middleware/errorHandler");

/**
 * Helper: retrieve a system setting value by key.
 * Used for SMS templates.
 */
async function getTemplate(key) {
  const res = await pool.query(
    `SELECT value FROM system_settings WHERE key = $1`,
    [key],
  );
  return res.rows[0]?.value || null;
}

/**
 * Match payment amount to an active package.
 * Rules:
 * - Exact match → deliver that package.
 * - Overpayment (amount between two packages) → deliver the lower package,
 *   record excess, and count full amount as revenue (auto‑resolved).
 * - Amount above highest active package → deliver highest package,
 *   record excess, auto‑resolved.
 * - Amount below lowest active package → flagged_underpayment (no tips).
 *
 * @param {number} amount - Payment amount in KES
 * @returns {Promise<{status: string, exact: object|null, lower: object|null}>}
 */
async function matchPackage(amount) {
  const res = await pool.query(`
    SELECT id, name, price
    FROM packages
    WHERE is_active = true
    ORDER BY price ASC
  `);
  const packages = res.rows;

  if (packages.length === 0) {
    return { status: "flagged_no_match", exact: null, lower: null };
  }

  // Exact match
  const exact = packages.find((p) => p.price === amount);
  if (exact) {
    return { status: "matched", exact, lower: null };
  }

  // Find nearest lower package (largest price < amount)
  let lower = null;
  for (let i = packages.length - 1; i >= 0; i--) {
    if (packages[i].price < amount) {
      lower = packages[i];
      break;
    }
  }

  //  No lower package → amount below smallest package price
  if (!lower) {
    return { status: "flagged_underpayment", exact: null, lower: null };
  }

  // Check if there exists a package with price > amount
  const hasHigher = packages.some((p) => p.price > amount);
  if (hasHigher) {
    // Overpayment: deliver lower package, flag overpayment
    return { status: "flagged_overpayment", exact: null, lower };
  } else {
    // Amount exceeds the highest package price → deliver highest (which is 'lower')
    return { status: "flagged_no_match", exact: null, lower };
  }
}

/**
 * Retrieve all pending tips for a package, ordered by their original order.
 * @param {import('pg').PoolClient} client - Database client
 * @param {string} packageId - UUID of the package
 * @returns {Promise<Array<{game_name: string, prediction: string}>>}
 */
async function getPendingTips(client, packageId) {
  const result = await client.query(
    `SELECT game_name, prediction
     FROM tips
     WHERE package_id = $1 AND status = 'pending'
     ORDER BY "order" ASC`,
    [packageId],
  );
  return result.rows;
}

/**
 * Main payment processing function.
 * Called asynchronously after M‑Pesa callback.
 */
async function processPayment(paymentId, transaction) {
  const { mpesaRef, phoneNumber, amount } = transaction;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    logger.info(`Processing payment ${paymentId} for ${mpesaRef}`);

    // Ensure contact exists (for leads)
    await client.query(
      `INSERT INTO contacts (phone_number, name, frequency_count, total_received_amount)
       VALUES ($1, NULL, 0, 0)
       ON CONFLICT (phone_number) DO NOTHING`,
      [phoneNumber],
    );

    //  Match package
    const { status, exact, lower } = await matchPackage(amount);
    logger.info(`Match result for ${mpesaRef}: ${status}`, {
      exact: exact?.id,
      lower: lower?.id,
    });

    let packageId = null;
    let excessAmount = null;
    let packageName = null;
    let shouldSendTips = false;
    let finalStatus = status;
    let resolved = false;

    if (status === "matched") {
      // Exact match – auto‑resolve, create purchase, send tips
      packageId = exact.id;
      packageName = exact.name;
      shouldSendTips = true;
      finalStatus = "matched";
      resolved = true;
    } else if (
      status === "flagged_overpayment" ||
      (status === "flagged_no_match" && lower)
    ) {
      // Overpayment / amount above highest – flag, send tips now, but DO NOT resolve yet
      packageId = lower.id;
      packageName = lower.name;
      excessAmount = amount - lower.price;
      shouldSendTips = true;
      finalStatus = status;
      resolved = false;
    }
    // For flagged_underpayment, shouldSendTips stays false

    // Update payment record with initial matching result
    await client.query(
      `UPDATE payments
       SET status = $1, matched_package_id = $2, excess_amount = $3, resolved = $4
       WHERE id = $5`,
      [finalStatus, packageId, excessAmount, resolved, paymentId],
    );

    // If tips should be sent, check package completeness & process
    let pendingTips = [];
    if (shouldSendTips && packageId) {
      // Check package completeness (total tips >= game_count)
      const pkgRes = await client.query(
        `SELECT game_count FROM packages WHERE id = $1`,
        [packageId],
      );
      const gameCount = pkgRes.rows[0]?.game_count;

      // Verify the package has enough total tips (pending + won + lost)
      const totalTipsRes = await client.query(
        `SELECT COUNT(*) FROM tips WHERE package_id = $1`,
        [packageId],
      );
      const totalTips = parseInt(totalTipsRes.rows[0].count);

      if (totalTips < gameCount) {
        logger.warn(
          `Package ${packageId} incomplete for payment ${mpesaRef}: total tips ${totalTips} < ${gameCount}`,
        );
        await client.query(
          `UPDATE payments SET status = 'flagged_incomplete_package', resolved = false WHERE id = $1`,
          [paymentId],
        );
        await client.query("COMMIT");
        return; // Stop here – no purchase, no tips
      }

      // For exact matches only – create purchase, update customer, contact, tier
      if (finalStatus === "matched") {
        await client.query(
          `INSERT INTO purchases (phone_number, package_id, payment_id, amount_paid)
         VALUES ($1, $2, $3, $4)`,
          [phoneNumber, packageId, paymentId, amount],
        );
        //  Upsert customer
        await client.query(
          `INSERT INTO customers (phone_number, total_purchases, is_active)
         VALUES ($1, 1, true)
         ON CONFLICT (phone_number) DO UPDATE
         SET total_purchases = customers.total_purchases + 1,
             is_active = true,
             updated_at = NOW()`,
          [phoneNumber],
        );

        // // Update contact's total received amount (for potential tier)
        // await client.query(
        //   `UPDATE contacts
        //  SET total_received_amount = total_received_amount + $1
        //  WHERE phone_number = $2`,
        //   [amount, phoneNumber],
        // );
      }

      // Fetch pending tips (needed for SMS after commit)
      pendingTips = await getPendingTips(client, packageId);
    }

    await client.query("COMMIT");
    logger.info(`Transaction committed for ${mpesaRef}`);

    if (finalStatus === "matched") {
      try {
        await updateActiveTier(phoneNumber);
      } catch (tierErr) {
        // Non-critical — log and continue
        logger.error(`Tier update failed for ${phoneNumber}: ${tierErr.message}`);
      }
    }

    // Send SMS outside transaction (non‑critical)
    if (shouldSendTips && pendingTips.length > 0) {
      try {
        // Send payment confirmation using template
        const confirmTemplate = await getTemplate(
          "payment_confirmation_template",
        );
        const confirmMsg = confirmTemplate.replace("{amount}", amount);
        await sendSMS(phoneNumber, confirmMsg, "payment_confirmation", null);

        // Send tips delivery using template
        const tipsTemplate = await getTemplate("tips_delivery_template");
        const tipsText = pendingTips
          .map((tip, idx) => `${idx + 1}. ${tip.game_name} - ${tip.prediction}`)
          .join("\n");
        const deliveryMsg = tipsTemplate.replace("{tips}", tipsText);
        await sendSMS(phoneNumber, deliveryMsg, "tips_delivery", null);

        logger.info(
          `SMS sent to ${phoneNumber} for payment ${mpesaRef} (${pendingTips.length} tips)`,
        );
      } catch (smsErr) {
        // Log but do not throw – payment already recorded
        logger.error(
          `SMS sending failed for ${phoneNumber}: ${smsErr.message}`,
        );
      }
    } else if (shouldSendTips && pendingTips.length === 0) {
      logger.warn(
        `No pending tips found for package ${packageId} (payment ${mpesaRef})`,
      );
    }

    logger.info(
      `Payment ${mpesaRef} processed successfully: status=${finalStatus}, package=${packageName || "none"}, amount=${amount}`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`Payment processing error for ${mpesaRef}: ${err.message}`);

    // Mark payment as failed so admin can review
    await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [
      paymentId,
    ]);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Admin endpoint: Get all active packages with their pending tips.
 * Used in the frontend to manage packages.
 */
async function getPackagesWithTips(req, res) {
  try {
    const packages = await pool.query(`
      SELECT * FROM packages WHERE is_active = true ORDER BY price
    `);
    const result = [];
    for (const pkg of packages.rows) {
      const tips = await pool.query(
        `SELECT * FROM tips WHERE package_id = $1 AND status = 'pending' ORDER BY "order"`,
        [pkg.id],
      );
      result.push({ ...pkg, tips: tips.rows });
    }
    res.json({ packages: result });
  } catch (err) {
    logger.error(`getPackagesWithTips error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch packages." });
  }
}

module.exports = {
  processPayment,
  matchPackage,
  getPackagesWithTips,
};
