const { pool } = require('../config/db');
const { sendSMS } = require('../services/smsService');
const { logger } = require('../middleware/errorHandler');

/**
 * POST /api/sms/send
 * Send an SMS to a specific phone or all contacts in a potential tier.
 * Body: { tier: number, message: string } OR { phone: string, message: string }
 * Admin only.
 */
async function sendBulkSMS(req, res) {
  const { tier, phone, message, active_tier_letter, active_sub_number } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required.' });

  try {
    let phones = [];

    if (phone) {
      phones = [phone];
    } else if (tier) {
      // Potential Tiers (from contacts table)
      const result = await pool.query(
        `SELECT phone_number FROM contacts WHERE potential_tier = $1`,
        [tier]
      );
      phones = result.rows.map(row => row.phone_number);
    } else if (active_tier_letter && active_sub_number) {
      // Active Customer Sub-Tiers (from customers/users table)
      const result = await pool.query(
        `SELECT phone_number FROM customers 
         WHERE tier_letter = $1 AND tier_sub_number = $2 AND is_active = true`,
        [active_tier_letter, active_sub_number]
      );
      phones = result.rows.map(row => row.phone_number);
    }

    if (phones.length === 0) {
      return res.status(404).json({ error: 'No recipients found for the selection.' });
    }

    // Process sending
    const sendPromises = phones.map(p => 
      sendSMS(p, message, 'advertising', null, req.user.id)
    );
    
    // We use Promise.allSettled so one failure doesn't stop the whole batch
    await Promise.allSettled(sendPromises);

    return res.json({
      success: true,
      message: `SMS batch started for ${phones.length} recipients.`
    });

  } catch (err) {
    logger.error(`sendBulkSMS error: ${err.message}`);
    res.status(500).json({ error: 'Failed to process bulk SMS.' });
  }
}

module.exports = { sendBulkSMS };