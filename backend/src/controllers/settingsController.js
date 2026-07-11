const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * GET /api/settings/payment-confirmation
 * Returns whether payment confirmation SMS is enabled.
 */
async function getPaymentConfirmation(req, res) {
  try {
    const result = await pool.query(
        `SELECT value FROM system_settings WHERE key = 'payment_confirmation_enabled'`
    );
    // Default to true if the setting is missing or not explicitly 'false'
    const enabled = result.rows[0]?.value !== 'false';
    res.json({ enabled });
  } catch (err) {
    logger.error(`getPaymentConfirmation error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch setting." });
  }
}

/**
 * PUT /api/settings/payment-confirmation
 * Updates the payment confirmation toggle.
 * Body: { enabled: boolean }
 */
async function updatePaymentConfirmation(req, res) {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: "enabled must be a boolean." });
  }
  try {
    await pool.query(
        `INSERT INTO system_settings (key, value) VALUES ('payment_confirmation_enabled', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [enabled ? 'true' : 'false']
    );
    res.json({ success: true, enabled });
  } catch (err) {
    logger.error(`updatePaymentConfirmation error: ${err.message}`);
    res.status(500).json({ error: "Failed to update setting." });
  }
}

/**
 * GET /api/settings/templates
 * Returns the current message templates for payment confirmation and tips delivery.
 */
async function getTemplates(req, res) {
  try {
    const result = await pool.query(
        `SELECT key, value FROM system_settings WHERE key IN ('payment_confirmation_template', 'tips_delivery_template', 'tips_preview_example', 'preview_amount')`,
    );
    const templates = {
      payment_confirmation:
          "Thank you for your payment of KES {amount}. Your tips will arrive shortly.",
      tips_delivery: "{tips}",
      preview_tips: "1. Fc Copenhagen v Napoli (o1.5)\n2. Bodoe/Glimt v Man City (2)\n3. Inter Milano v Arsenal (u2.5)\n4. Olympiacos v Leverkusen (GG)\n5. Tottenham v Dortmund (GG)",
      preview_amount: "1000",
    };
    for (const row of result.rows) {
      if (row.key === "payment_confirmation_template")
        templates.payment_confirmation = row.value;
      if (row.key === "tips_delivery_template")
        templates.tips_delivery = row.value;
      if (row.key === "tips_preview_example")
        templates.preview_tips = row.value;
      if (row.key === "preview_amount")
        templates.preview_amount = row.value;

    }
    res.json(templates);
  } catch (err) {
    logger.error(`getTemplates error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch templates." });
  }
}

/**
 * PUT /api/settings/templates
 * Updates the message templates.
 * Body: { payment_confirmation: string, tips_delivery: string }
 */
async function updateTemplates(req, res) {
  const { payment_confirmation, tips_delivery, preview_tips, preview_amount } = req.body;
  if (!payment_confirmation || !tips_delivery) {
    return res.status(400).json({ error: "Both templates are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
        `INSERT INTO system_settings (key, value) VALUES ('payment_confirmation_template', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [payment_confirmation]
    );
    await client.query(
        `INSERT INTO system_settings (key, value) VALUES ('tips_delivery_template', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [tips_delivery]
    );

    if (preview_tips !== undefined && typeof preview_tips === 'string') {
      await client.query(
          `INSERT INTO system_settings (key, value) VALUES ('tips_preview_example', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [preview_tips]
      );

      if (preview_amount !== undefined &&  preview_amount !== null) {
        await client.query(
            `INSERT INTO system_settings (key, value) VALUES ('preview_amount', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [preview_amount.toString()]
        )
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Templates updated successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`updateTemplates error: ${err.message}`);
    res.status(500).json({ error: "Failed to update templates." });
  } finally {
    client.release();
  }
}

/**
 * GET /api/settings/subscription
 * Returns current subscription price, tips template, and enabled status.
 */
async function getSubscriptionSettings(req, res) {
  try {
    const priceRes = await pool.query(
        `SELECT value FROM system_settings WHERE key = 'subscription_price'`
    );
    const tipsRes = await pool.query(
        `SELECT value FROM system_settings WHERE key = 'subscription_tips_template'`
    );
    const enabledRes = await pool.query(
        `SELECT value FROM system_settings WHERE key = 'subscription_enabled'`
    );

    // Default to true if the setting is missing or not explicitly 'false'
    const enabledValue = enabledRes.rows[0]?.value;
    const enabled = enabledValue === 'true' || enabledValue === null || enabledValue === undefined;

    res.json({
      price: parseInt(priceRes.rows[0]?.value) || 15,
      tipsTemplate: tipsRes.rows[0]?.value || "1,2,2,1,x",
      enabled,
    });
  } catch (err) {
    logger.error(`getSubscriptionSettings error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch subscription settings." });
  }
}

/**
 * PUT /api/settings/subscription
 * Updates subscription price, tips template, and enabled status.
 * Also auto‑manages packages with the same price:
 * - When enabled → deactivate any active package with that price.
 * - When disabled → reactivate any inactive package with that price.
 * Body: { price?: number, tipsTemplate?: string, enabled?: boolean }
 */
async function updateSubscriptionSettings(req, res) {
  const { price, tipsTemplate, enabled } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Update price if provided
    if (price !== undefined && !isNaN(price) && price > 0) {
      await client.query(
          `INSERT INTO system_settings (key, value) VALUES ('subscription_price', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [price.toString()]
      );
      // Log price change history
      await client.query(
          `INSERT INTO subscription_price_history (price, set_by) VALUES ($1, $2)`,
          [price, req.user?.id]
      );
    }

    // 2. Update tips template if provided
    if (tipsTemplate !== undefined && typeof tipsTemplate === 'string') {
      await client.query(
          `INSERT INTO system_settings (key, value) VALUES ('subscription_tips_template', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [tipsTemplate]
      );
    }

    // 3. Update enabled status and auto‑manage packages
    if (enabled !== undefined && typeof enabled === 'boolean') {
      // 3a. Save the new enabled state
      await client.query(
          `INSERT INTO system_settings (key, value) VALUES ('subscription_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [enabled ? 'true' : 'false']
      );

      // 3b. Get the current subscription price (after any update above)
      const priceResult = await client.query(
          `SELECT value FROM system_settings WHERE key = 'subscription_price'`
      );
      const currentPrice = parseInt(priceResult.rows[0]?.value) || 15;

      // 3c. Auto‑manage packages with the same price
      if (enabled === true) {
        // Turn ON → deactivate any active package with this price
        const deactivated = await client.query(
            `UPDATE packages SET is_active = false
           WHERE price = $1 AND is_active = true AND deleted_at IS NULL
           RETURNING id, name`,
            [currentPrice]
        );
        if (deactivated.rowCount > 0) {
          logger.info(
              `Deactivated ${deactivated.rowCount} package(s) with price ${currentPrice} because subscription was enabled.`
          );
        }
      } else {
        // Turn OFF → reactivate any inactive package with this price (if not soft‑deleted)
        const reactivated = await client.query(
            `UPDATE packages SET is_active = true
           WHERE price = $1 AND is_active = false AND deleted_at IS NULL
           RETURNING id, name`,
            [currentPrice]
        );
        if (reactivated.rowCount > 0) {
          logger.info(
              `Reactivated ${reactivated.rowCount} package(s) with price ${currentPrice} because subscription was disabled.`
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`updateSubscriptionSettings error: ${err.message}`);
    res.status(500).json({ error: "Failed to update subscription settings." });
  } finally {
    client.release();
  }
}

/**
 * GET /api/settings/sms-soft-delete
 * Returns the last soft-delete count and timestamp.
 */
async function getSmsSoftDeleteInfo(req, res) {
  try {
    const countRes = await pool.query(
        `SELECT value FROM system_settings WHERE key = 'sms_soft_delete_count'`
    );
    const timeRes = await pool.query(
        `SELECT value FROM system_settings WHERE key = 'sms_soft_delete_time'`
    );
    res.json({
      count: parseInt(countRes.rows[0]?.value) || 0,
      timestamp: timeRes.rows[0]?.value || null,
    });
  } catch (err) {
    logger.error(`getSmsSoftDeleteInfo error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch soft-delete info." });
  }
}

module.exports = {
  getTemplates,
  updateTemplates,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  getPaymentConfirmation,
  updatePaymentConfirmation,
  getSmsSoftDeleteInfo,
};