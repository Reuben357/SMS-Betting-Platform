const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * GET /api/settings/templates
 * Returns the current message templates for payment confirmation and tips delivery.
 */
async function getTemplates(req, res) {
  try {
    const result = await pool.query(
      `SELECT key, value FROM system_settings WHERE key IN ('payment_confirmation_template', 'tips_delivery_template')`,
    );
    const templates = {
      payment_confirmation:
        "Thank you for your payment of KES {amount}. Your tips will arrive shortly.",
      tips_delivery: "Your tips:\n{tips}",
    };
    for (const row of result.rows) {
      if (row.key === "payment_confirmation_template")
        templates.payment_confirmation = row.value;
      if (row.key === "tips_delivery_template")
        templates.tips_delivery = row.value;
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
  const { payment_confirmation, tips_delivery } = req.body;
  if (!payment_confirmation || !tips_delivery) {
    return res.status(400).json({ error: "Both templates are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ["payment_confirmation_template", payment_confirmation],
    );
    await client.query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ["tips_delivery_template", tips_delivery],
    );
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

module.exports = { getTemplates, updateTemplates };
