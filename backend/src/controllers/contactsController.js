const { pool } = require("../config/db");

/**
 * GET /api/contacts/jackpot
 * Returns contacts where is_jackpot = true, with pagination and search.
 * Similar to getContacts but with filter.
 */
async function getJackpotContacts(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(10000, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const jpTier = req.query.jp_tier;

  try {
    let queryParams = [`%${search}%`];
    let whereClause = `is_jackpot = true AND (phone_number ILIKE $1 OR name ILIKE $1)`;

    if (jpTier) {
      whereClause += ` AND jt.tier_number = $${queryParams.length + 1}`;
      queryParams.push(jpTier);
    }

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM contacts c
        LEFT JOIN tiers_jp_potential jt
        ON c.jackpot_frequency >= jt.min_jp_frequency
        AND c.jackpot_frequency <= jt.max_jp_frequency
         WHERE ${whereClause}`,
        queryParams
    );

    const total = parseInt(countResult.rows[0].count);

    const finalParams = [...queryParams, limit, offset];
    const limitIdx = queryParams.length + 1;
    const offsetIdx = queryParams.length + 2;

    const result = await pool.query(
        `SELECT c.phone_number, c.name, c.jackpot_frequency AS frequency_count,
                c.created_at, c.total_received_amount, c.potential_tier, c.is_jackpot,
                jt.tier_number AS jp_tier_number,
                (
                  SELECT json_agg(DISTINCT cu.filename)
                  FROM contact_events ce
                  JOIN csv_uploads cu ON cu.id = ce.upload_id
                  WHERE ce.phone_number = c.phone_number
                ) AS csv_files
         FROM contacts c
                LEFT JOIN tiers_jp_potential jt
                          ON c.jackpot_frequency >= jt.min_jp_frequency
                            AND c.jackpot_frequency <= jt.max_jp_frequency
         WHERE ${whereClause}
         ORDER BY c.jackpot_frequency DESC, c.total_received_amount DESC
           LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        finalParams
    );

    const contacts = result.rows.map(row => ({
      ...row,
      csv_files: row.csv_files || []  // ensure it's always an array
    }));

    res.json({
      contacts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getJackpotContacts error:", err.message);
    res.status(500).json({ error: "Failed to fetch jackpot customers." });
  }
}

async function getContacts(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(10000, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const tier = req.query.tier || null;

  try {
    let queryParams = [`%${search}%`];
    let whereClause = `(phone_number ILIKE $1 OR name ILIKE $1)`;

    if (tier === 'untiered') {
      whereClause += ` AND potential_tier IS NULL`;
    } else if (tier) {
      whereClause += ` AND potential_tier = $2`;
      queryParams.push(tier);
    }

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM contacts WHERE ${whereClause}`,
        queryParams,
    );

    const total = parseInt(countResult.rows[0].count);

    // Add limit/offset to params
    const finalParams = [...queryParams, limit, offset];
    const limitIdx = queryParams.length + 1;
    const offsetIdx = queryParams.length + 2;

    const result = await pool.query(
        `SELECT phone_number, name, frequency_count,
                total_received_amount, potential_tier, created_at
         FROM contacts
         WHERE ${whereClause}
         ORDER BY total_received_amount DESC, frequency_count DESC
           LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        finalParams,
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
    // Get pagination params from query string
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(1000, parseInt(req.query.limit) || 15);
    const offset = (page - 1) * limit;

    // Get totals across ALL uploads (no limit)
    const totalsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_files,
        COALESCE(SUM(total_rows), 0) AS total_rows,
        COALESCE(SUM(new_contacts), 0) AS total_new_contacts,
        COALESCE(SUM(updated_contacts), 0) AS total_updated_contacts,
        COALESCE(SUM(error_rows), 0) AS total_errors
      FROM csv_uploads
    `);
    const totals = totalsRes.rows[0];

    const totalFiles = parseInt(totals.total_files);
    const totalPages = Math.ceil(totalFiles / limit);

    // Get paginated uploads
    const result = await pool.query(
        `SELECT
           cu.id, cu.filename, cu.total_rows, cu.new_contacts,
           cu.updated_contacts, cu.error_rows, cu.error_log,
           cu.created_at,
           COALESCE(u.name, u.email, 'Unknown') AS uploaded_by
         FROM csv_uploads cu
                LEFT JOIN users u ON cu.uploaded_by = u.id
         ORDER BY cu.created_at DESC
           LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    res.json({
      uploads: result.rows,
      totalFiles: parseInt(totals.total_files),
      totalPages: totalPages,
      currentPage: page,
      totalRows: parseInt(totals.total_rows),
      totalNewContacts: parseInt(totals.total_new_contacts),
      totalUpdatedContacts: parseInt(totals.total_updated_contacts),
      totalErrors: parseInt(totals.total_errors),
    });
  } catch (err) {
    console.error("getUploadHistory error:", err.message);
    res.status(500).json({ error: "Failed to fetch upload history." });
  }
}

async function getTierCounts(req, res) {
  try {
    const result = await pool.query(
        `SELECT potential_tier, COUNT(*) FROM contacts WHERE potential_tier IS NOT NULL GROUP BY potential_tier ORDER BY potential_tier`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tier counts." });
  }
}

async function getLeadStats(req, res) {
  const tier = req.query.tier || null;

  try {
    // Active customers = exist in customers table (made at least 1 purchase)
    const activeRes = await pool.query(`SELECT COUNT(*) FROM customers`);

    // Total contacts matching current tier filter
    let contactCountQuery = `SELECT COUNT(*) FROM contacts`;
    let contactCountParams = [];


    if (tier === 'untiered') {
      contactCountQuery += ` WHERE potential_tier IS NULL`;
    } else if (tier) {
      contactCountQuery += ` WHERE potential_tier = $1`;
      contactCountParams = [tier];
    }

    const contactsRes = await pool.query(contactCountQuery, contactCountParams);

    // New contacts added this month
    const newThisMonthRes = await pool.query(
        `SELECT COUNT(*) FROM contacts
         WHERE created_at >= date_trunc('month', NOW())`,
    );

    // Contacts with no tier assigned yet
    const untieredRes = await pool.query(
        `SELECT COUNT(*) FROM contacts WHERE potential_tier IS NULL`,
    );

    res.json({
      active_customers: parseInt(activeRes.rows[0].count),
      total_contacts: parseInt(contactsRes.rows[0].count),
      new_this_month: parseInt(newThisMonthRes.rows[0].count),
      untiered_contacts: parseInt(untieredRes.rows[0].count),
    });
  } catch (err) {
    console.error("getLeadStats error:", err.message);
    res.status(500).json({ error: "Failed to fetch lead stats." });
  }
}

module.exports = { getContacts, getUploadHistory, getTierCounts, getLeadStats, getJackpotContacts };