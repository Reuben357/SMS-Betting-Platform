const { pool } = require("../config/db");
const emalifyService = require("./emalifyService");
const { logger } = require("../middleware/errorHandler");

/**
 * Send an SMS using Emalify V2 API.
 * If Emalify credentials are missing (e.g., no sender ID), logs the message and stores it as 'sent' (for testing).
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
  const client = await pool.connect();
  let messageId = null;

  try {
    // Insert message with status 'processing' (or 'sent' if using fake mode)
    const insertResult = await client.query(
      `INSERT INTO messages (recipient_phone, message_type, content, status, session_id, sent_by, audience_type)
       VALUES ($1, $2, $3, 'processing', $4, $5, $6)
       RETURNING id`,
      [recipientPhone, messageType, content, sessionId, sentBy, audienceType],
    );
    messageId = insertResult.rows[0].id;
    
    // Check if Emalify is configured (both API key and sender ID)
    const hasEmalifyConfig = process.env.EMALIFY_API_KEY && process.env.EMALIFY_SENDER_ID;

    if (!hasEmalifyConfig) {
      // Fallback mode: log to console and mark as 'sent' (for testing)
      logger.warn(`[FAKE SMS] To: ${recipientPhone}, Type: ${messageType}, Content: ${content}`);
      await client.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [messageId]);
      await client.query("COMMIT");
      return { success: true, fake: true };
    }

    // Real Emalify sending
    const result = await emalifyService.sendSMS(recipientPhone, content);
    
    // Update status to 'sent' if successful
    await client.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [messageId]);
    await client.query("COMMIT");
    logger.info(`SMS sent to ${recipientPhone} (${messageType}) via Emalify`);
    
    return { success: true, data: result };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`SMS service error for ${recipientPhone}: ${err.message}`);
    
    if (messageId) {
      // Mark as failed in database
      await pool.query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [messageId]);
    }
    throw err;
  } finally {
    client.release();
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
  // 1. Fetch the template from system_settings
  const templateResult = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'tips_delivery_template'`
  );
  let template = templateResult.rows[0]?.value || '{tips}'; // fallback

  // 2. Replace the placeholder with the actual tips
  const content = template.replace(/{tips}/g, tipsContent);

  // 3. Send the SMS using the existing sendSMS function
  return await sendSMS(
      recipientPhone,
      content,
      'tips_delivery',
      sessionId,
      sentBy,
      audienceType);
}

module.exports = { sendSMS, sendTipsDelivery };
