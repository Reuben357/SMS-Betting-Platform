const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * GET /api/messages
 * Paginated message history.
 * Filters: phone (partial match), message_type, status
 */
async function getMessages(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(10000, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const { phone, message_type, status } = req.query;

  try {
    const conditions = [];
    const params = [];
    let i = 1;

    if (phone) {
      conditions.push(`m.recipient_phone ILIKE $${i++}`);
      params.push(`%${phone}%`);
    }
    if (message_type) {
      conditions.push(`m.message_type = $${i++}`);
      params.push(message_type);
    }
    if (status) {
      conditions.push(`m.status = $${i++}`);
      params.push(status);
    }

    const where = conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")} AND m.deleted_at IS NULL`
        : `WHERE m.deleted_at IS NULL`;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM messages m ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT
         m.id, m.recipient_phone, m.message_type, m.content,
         m.status, m.created_at, m.audience_type,
         COALESCE(u.email, 'System') AS sent_by_email
       FROM messages m
       LEFT JOIN users u ON u.id = m.sent_by
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset],
    );

    res.json({
      messages: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error(`getMessages error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch message history." });
  }
}

module.exports = { getMessages };