const { pool } = require("../config/db");

async function getContacts(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = req.query.search || "";

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM contacts
       WHERE phone_number ILIKE $1 OR name ILIKE $1`,
      [`%${search}%`],
    );

    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT phone_number, name, frequency_count,
              total_received_amount, potential_tier, created_at
       FROM contacts
       WHERE phone_number ILIKE $1 OR name ILIKE $1
       ORDER BY frequency_count DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset],
    );

    res.json({
      contacts: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getContacts error:", err.message);
    res.status(500).json({ error: "Failed to fetch contacts." });
  }
}

async function getUploadHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         cu.id, cu.filename, cu.total_rows, cu.new_contacts,
         cu.updated_contacts, cu.error_rows, cu.error_log,
         cu.created_at,
         COALESCE(u.name, u.email, 'Unknown') AS uploaded_by
       FROM csv_uploads cu
       LEFT JOIN users u ON cu.uploaded_by = u.id
       ORDER BY cu.created_at DESC
       LIMIT 50`
    );
    res.json({ uploads: result.rows });
  } catch (err) {
    console.error('getUploadHistory error:', err.message);
    res.status(500).json({ error: 'Failed to fetch upload history.' });
  }
}

module.exports = { getContacts, getUploadHistory };
