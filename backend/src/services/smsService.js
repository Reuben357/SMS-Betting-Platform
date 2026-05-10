const axios = require("axios");
const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");
const isTestMode =
  !process.env.ONFON_API_KEY || process.env.NODE_ENV === "development";

async function sendSMS(
  recipientPhone,
  content,
  messageType,
  sessionId = null,
  sentBy = null,
) {
  const client = await pool.connect();
  let messageId = null;

  try {
    // Insert message with status 'queued'
    const insertResult = await client.query(
      `INSERT INTO messages (recipient_phone, message_type, content, status, session_id, sent_by)
       VALUES ($1, $2, $3, 'queued', $4, $5)
       RETURNING id`,
      [recipientPhone, messageType, content, sessionId, sentBy],
    );
    messageId = insertResult.rows[0].id;

    // Format phone for OnfonMedia: 2547...
    let phone = recipientPhone;
    if (phone.startsWith("0")) {
      phone = "254" + phone.slice(1);
    } else if (phone.startsWith("+")) {
      phone = phone.slice(1);
    }

    const payload = {
      api_key: process.env.ONFON_API_KEY,
      sender_id: process.env.ONFON_SENDER_ID,
      recipient: phone,
      message: content,
    };

    if (isTestMode) {
      logger.info(`[TEST MODE] SMS to ${recipientPhone}: ${content}`);
      await client.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [
        messageId,
      ]);
      return;
    }

    const response = await axios.post(process.env.ONFON_API_URL, payload, {
      timeout: 10000,
    });
    const success = response.data && response.data.status === "success";

    if (success) {
      await client.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [
        messageId,
      ]);
      logger.info(`SMS sent to ${recipientPhone} (${messageType})`);
    } else {
      await client.query(
        `UPDATE messages SET status = 'failed' WHERE id = $1`,
        [messageId],
      );
      logger.error(
        `SMS send failed: ${response.data?.message || "Unknown error"}`,
      );
    }
  } catch (err) {
    logger.error(`SMS service error: ${err.message}`);
    if (messageId) {
      await client.query(
        `UPDATE messages SET status = 'failed' WHERE id = $1`,
        [messageId],
      );
    } else {
      // Fallback: try to update the most recent message for this phone (rare)
      logger.warn(
        `No messageId, could not update status for ${recipientPhone}`,
      );
    }
  } finally {
    client.release();
  }
}

module.exports = { sendSMS };
