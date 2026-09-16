const { pool } = require("../config/db");
const onfonService = require("../services/onfonService");
const { logger } = require("../middleware/errorHandler");

/**
 * If Onfon credentials are missing (e.g., no sender ID), logs the message and stores it as 'sent' (for testing).
 *
 * @param {string} recipientPhone - Phone number (will be formatted automatically)
 * @param {string} content - Message text
 * @param {string} messageType - e.g., 'advertising', 'tips_delivery', 'payment_confirmation', 'subscription_tips'
 * @param {string|null} sessionId - Optional session identifier
 * @param {string|null} sentBy - User ID who triggered the message (for bulk)
 * @returns {Promise<{success: boolean, fake?: boolean, data?: any}>}
 */
async function sendSMS(
  recipientPhone,
  content,
  messageType,
  sessionId = null,
  sentBy = null,
  audienceType = null,
) {
  let messageId = null;

  try {
    // Insert message with status 'processing' (or 'sent' if using fake mode)
    const insertResult = await pool.query(
      `INSERT INTO messages (recipient_phone, message_type, content, status, session_id, sent_by, audience_type)
       VALUES ($1, $2, $3, 'processing', $4, $5, $6)
       RETURNING id`,
      [recipientPhone, messageType, content, sessionId, sentBy, audienceType],
    );
    messageId = insertResult.rows[0].id;
    
    // Check if Onfon is configured (both client ID and sender ID)
    const hasOnfonConfig = process.env.ONFON_CLIENT_ID && process.env.ONFON_SENDER_ID;

    if (!hasOnfonConfig) {
      // Fallback mode: log to console and mark as 'sent' (for testing)
      logger.warn(`[FAKE SMS] To: ${recipientPhone}, Type: ${messageType}, Content: ${content}`);
      await pool.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [messageId]);
      return { success: true, fake: true };
    }

    // Real Onfon sending
    const result = await onfonService.sendSMS(recipientPhone, content);

    // Store message ID
    if (result.providerId) {
      try {
        await pool.query(
            `UPDATE messages SET message_provider_id = $1 WHERE id = $2`,
            [result.providerId, messageId]
        );
      } catch (err) {
        if (err.code === '23505') {
          logger.warn(`Duplicate Onfon message_provider_id "${result.providerId}" - message ${messageId}`);
        } else {
          throw err;
        }
      }
    }
    
    // Update status to 'sent' if successful
    await pool.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [messageId]);
    logger.info(`SMS sent to ${recipientPhone} (${messageType}) via Onfon Media`);
    
    return { success: true, data: result };
  } catch (err) {
    logger.error(`SMS service error for ${recipientPhone}: ${err.message}`);
    
    if (messageId) {
      // Mark as failed in database
      await pool
          .query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [messageId])
          .catch(() => {});
    }
    throw err;
  }
}

/**
 * Send a tips delivery SMS using the stored template.
 * @param {string} recipientPhone
 * @param {string} tipsContent - The actual tips (formatted with numbers)
 * @param {string|null} sessionId
 * @param {string|null} sentBy
 * @param {string|null} audienceType
 * @returns {Promise<{success: boolean}>}
 */
async function sendTipsDelivery(
    recipientPhone,
    tipsContent,
    sessionId = null,
    sentBy = null,
    audienceType = null) {
  //  Fetch the template from system_settings
  const templateResult = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'tips_delivery_template'`
  );
  let template = templateResult.rows[0]?.value || '{tips}'; // fallback

  //  Replace the placeholder with the actual tips
  const content = template.replace(/{tips}/g, tipsContent);

  // Send the SMS using the existing sendSMS function
  return await sendSMS(
      recipientPhone,
      content,
      'tips_delivery',
      sessionId,
      sentBy,
      audienceType);
}

module.exports = { sendSMS, sendTipsDelivery };
