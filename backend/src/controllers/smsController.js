const { pool } = require('../config/db');
const { sendSMS } = require('../services/smsService');
const { logger } = require('../middleware/errorHandler');
const {formatName} = require('../utils/stringUtils');
const { resolveOnfonDlrStatus } = require('../services/onfonStatusMap');

/**
 * POST /api/sms/send
 * Send an SMS to a specific phone or all contacts in a potential tier.
 * Body: { tier: number, message: string } OR { phone: string, message: string }
 * Admin only.
 */
async function sendBulkSMS(req, res) {
  const {
    tier,
    phone,
    message,
    active_tier_letter,
    active_sub_number,
    jackpot,
    jackpot_tier,
    subscription_customers,
  } = req.body;

  let audienceType = null;
  if (phone) audienceType = 'phone';
  else if (subscription_customers) audienceType = 'subscription_customers';
  else if (tier) audienceType = `potential_tier_${tier}`;
  else if (active_tier_letter && active_sub_number) audienceType = `active_sub_${active_tier_letter}${active_sub_number}`;
  else if (jackpot) audienceType = 'jackpot';
  else if (jackpot_tier) audienceType = `jackpot_tier_${jackpot_tier}`;

  if (!message) return res.status(400).json({ error: 'Message is required.' });

  try {
    let recipients = [];

    if (phone) {
      // Single number – just send to one person
      recipients = [{ phone_number: phone, name: null }];
    } else if (subscription_customers) {
      const result = await pool.query(
          `SELECT cu.phone_number, c.name
           FROM customers cu
                  JOIN contacts c ON c.phone_number = cu.phone_number
           WHERE cu.is_active = true AND cu.total_subscriptions > 0`
      );
      recipients = result.rows;
    } else if (tier) {
      // Potential Tiers (CSV leads) – no personalisation
      const result = await pool.query(
          `SELECT phone_number FROM contacts WHERE potential_tier = $1`,
          [tier]
      );
      recipients = result.rows.map(row => ({ phone_number: row.phone_number, name: null }));
    } else if (active_tier_letter && active_sub_number) {
      // Active Customer Sub-Tiers (normal package customers) – personalised
      const result = await pool.query(
          `SELECT cu.phone_number, c.name
           FROM customers cu
                  JOIN contacts c ON c.phone_number = cu.phone_number
           WHERE cu.tier_letter = $1 AND cu.tier_sub_number = $2 AND cu.is_active = true`,
          [active_tier_letter, active_sub_number]
      );
      recipients = result.rows;
    } else if (jackpot_tier) {
      // Jackpot leads filtered by JP tier (CSV) – no personalisation (names are mostly NULL)
      const result = await pool.query(
          `SELECT c.phone_number, c.name
           FROM contacts c
                  JOIN tiers_jp_potential jt
                       ON c.jackpot_frequency >= jt.min_jp_frequency
                         AND c.jackpot_frequency <= jt.max_jp_frequency
           WHERE c.is_jackpot = true AND jt.tier_number = $1`,
          [jackpot_tier]
      );
      recipients = result.rows;
    } else if (jackpot) {
      // All jackpot leads (CSV) – no personalisation
      const result = await pool.query(
          `SELECT phone_number, name FROM contacts WHERE is_jackpot = true`
      );
      recipients = result.rows;
    }

    if (recipients.length === 0) {
      return res.status(404).json({ error: 'No recipients found for the selection.' });
    }

    // Process sending – personalise each message if a name is available
    const sendPromises = recipients.map(row => {
      const phoneNumber = row.phone_number;
      // If name exists, use it; otherwise fallback to "there"
      const rawName = row.name;
      const greeting = rawName ? formatName(rawName) : 'there';
      // Replace {name} placeholder with the actual name
      const personalizedMessage = message.replace(/{name}/g, greeting);
      return sendSMS(
          phoneNumber,
          personalizedMessage,
          'advertising',
          null,
          req.user.id,
          audienceType
      );
    });

    await Promise.allSettled(sendPromises);

    return res.json({
      success: true,
      message: `SMS batch started for ${recipients.length} recipients.`,
    });

  } catch (err) {
    logger.error(`sendBulkSMS error: ${err.message}`);
    res.status(500).json({ error: 'Failed to process bulk SMS.' });
  }
}

async function handleOnfonDlrCallback(req, res) {
  // TEMPORARY: keep until you confirm real Onfon values
  logger.info(`Onfon DLR callback raw query: ${JSON.stringify(req.query)}`);

  const { messageId, status, errorCode, shortMessage } = req.query;

  if (!messageId) {
    logger.warn('Onfon DLR callback: missing messageId');
    return res.status(200).send('OK');
  }

  try {
    const resolved = resolveOnfonDlrStatus(status);

    if (resolved === undefined) {
      logger.warn(`Onfon DLR: unmapped status "${status}" (errorCode=${errorCode}) for message ${messageId}`);
      return res.status(200).send('OK');
    }
    if (resolved === null) {
      logger.info(`Onfon DLR: non-terminal status "${status}" for message ${messageId}`);
      return res.status(200).send('OK');
    }

    const dbStatus = resolved; // 'sent' or 'failed'
    let failureReason = null;
    let deliveredAt = null;

    if (dbStatus === 'failed') {
      const cleanShortMessage = String(shortMessage || '').replace(/^'+|'+$/g, '').trim();
      failureReason = cleanShortMessage || `Onfon status: ${status}`;
    } else if (dbStatus === 'sent') {
      deliveredAt = new Date();
    }


    const  result = await pool.query(
        `UPDATE messages
       SET status = $1,
           delivered_at = COALESCE($5, delivered_at),
           failure_reason = $2,
           dlr_payload = $4
       WHERE message_provider_id = $3`,
        [dbStatus, failureReason, messageId, JSON.stringify(req.query), deliveredAt],
    );

    if (result.rowCount === 0) {
      logger.warn(`Onfon DLR callback: no message found for provider id ${messageId}`);
    } else if (result.rowCount > 1) {
      logger.error(`Onfon DLR callback: ${result.rowCount} messages share provider id ${messageId}`);
    }
    else  {
      logger.info(`Onfon DLR callback: updated message ${messageId} to ${dbStatus} (raw status "${status}")`);
    }
    res.status(200).send('OK');
  } catch (err) {
    logger.error(`Onfon DLR callback database processing error:${err.message}`);
    res.status(200).send('OK');
  }
}

module.exports = { sendBulkSMS, handleOnfonDlrCallback };

