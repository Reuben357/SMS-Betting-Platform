const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * Check if a package can accept a new tip.
 * A package is at capacity when the total number of tips (any status)
 * equals or exceeds the package's game_count.
 */
async function canAddTip(packageId) {
  const pkgRes = await pool.query(
    `SELECT game_count FROM packages WHERE id = $1`,
    [packageId],
  );
  if (!pkgRes.rows.length) return false;
  const gameCount = pkgRes.rows[0].game_count;

  const tipCountRes = await pool.query(
    `SELECT COUNT(*) FROM tips WHERE package_id = $1`,
    [packageId],
  );
  const totalTips = parseInt(tipCountRes.rows[0].count);
  return totalTips < gameCount;
}

/**
 * POST /api/tips
 * Create a new tip with status 'pending'.
 */
async function createTip(req, res) {
  const { game_name, prediction, match_datetime, package_id } = req.body;
  const userId = req.user.id;

  if (!game_name || !prediction || !match_datetime || !package_id) {
    return res.status(400).json({ error: "All fields required." });
  }

  const canAdd = await canAddTip(package_id);
  if (!canAdd) {
    return res.status(400).json({
      error: "Cannot add more tips. Package game limit reached.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `SELECT COALESCE(MAX("order"), 0) + 1 AS next_order
       FROM tips WHERE package_id = $1`,
      [package_id],
    );
    const nextOrder = orderRes.rows[0].next_order;

    // Use string 'pending' and correct placeholder count (7 values)
    const tipResult = await client.query(
      `INSERT INTO tips (game_name, prediction, match_datetime, created_by, package_id, "order", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [game_name, prediction, match_datetime, userId, package_id, nextOrder],
    );

    await client.query("COMMIT");
    res.status(201).json(tipResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`createTip error: ${err.message}`);
    res.status(500).json({ error: "Failed to create tip." });
  } finally {
    client.release();
  }
}
/**
 * GET /api/tips
 * Retrieve ALL tips (pending, won, lost) for admin management.
 * No status filter – admin needs to see everything.
 */
async function getTips(req, res) {
  const { package_id } = req.query;
  try {
    let query = `
      SELECT t.*, p.name AS package_name
      FROM tips t
      JOIN packages p ON p.id = t.package_id
      WHERE t.deleted_at IS NULL
    `;
    const params = [];
    if (package_id) {
      query += ` AND t.package_id = $1`;
      params.push(package_id);
    }
    query += ` ORDER BY t.package_id, t."order"`;
    const result = await pool.query(query, params);
    res.json({ tips: result.rows });
  } catch (err) {
    logger.error(`getTips error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch tips." });
  }
}

/**
 * PUT /api/tips/:id/outcome
 * Mark a tip as 'won' or 'lost'.
 * If the package has no pending tips left, deactivate it.
 */
async function updateTipOutcome(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!["won", "lost"].includes(status)) {
    return res.status(400).json({ error: 'Status must be "won" or "lost".' });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tipRes = await client.query(
      `SELECT package_id FROM tips WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (tipRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Tip not found." });
    }
    const packageId = tipRes.rows[0].package_id;

    await client.query(`UPDATE tips SET status = $1 WHERE id = $2`, [
      status,
      id,
    ]);

    const pendingRes = await client.query(
      `SELECT COUNT(*) FROM tips WHERE package_id = $1 AND status = 'pending' AND deleted_at IS NULL `,
      [packageId],
    );
    const pendingCount = parseInt(pendingRes.rows[0].count);

    let softDeleted = false;
    let packageName = null;

    if (pendingCount === 0) {
      // Get package name before soft‑delete
      const pkgNameRes = await client.query(
          `SELECT name FROM packages WHERE id = $1`,
          [packageId]
      );
      packageName = pkgNameRes.rows[0]?.name || 'Package';

      // Soft-delete the package
      await client.query(
        `UPDATE packages SET is_active = false, deleted_at = NOW() WHERE id = $1`,
        [packageId],
      );

      // Soft-delete all tips belonging to this package
      await client.query(
          `UPDATE tips SET deleted_at = NOW() WHERE package_id = $1 AND deleted_at IS NULL`,
          [packageId]
      );
      softDeleted = true;
      logger.info(`Package ${packageId} deactivated – no pending tips left.`);
    }

    await client.query("COMMIT");

    res.json({
      message: "Tip outcome updated.",
      softDeleted,
      packageName,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`updateTipOutcome error: ${err.message}`);
    res.status(500).json({ error: "Failed to update tip." });
  } finally {cd
    client.release();
  }


}

/**
 * DELETE /api/tips/:id
 * Permanently delete a tip.
 */
async function deleteTip(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tipRes = await client.query(
      `SELECT package_id FROM tips WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (tipRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Tip not found." });
    }
    const packageId = tipRes.rows[0].package_id;

    await client.query(`DELETE FROM tips WHERE id = $1`, [id]);

    // No automatic deactivation; package may become incomplete but remains active.
    await client.query("COMMIT");
    res.json({ message: "Tip permanently deleted." });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`deleteTip error: ${err.message}`);
    res.status(500).json({ error: "Failed to delete tip." });
  } finally {
    client.release();
  }
}

module.exports = { createTip, getTips, updateTipOutcome, deleteTip };
