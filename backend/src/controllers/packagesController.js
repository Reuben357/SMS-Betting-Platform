const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * GET /api/packages
 * Returns all packages with:
 * - is_active (boolean)
 * - count of pending tips (status = 'pending')
 * - total tips (any status)
 */
async function getPackages(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.game_count,
        p.is_active,
        p.created_at,
        COUNT(t.id) FILTER (WHERE t.status = 'pending') AS pending_tips,
        COUNT(t.id) AS total_tips
      FROM packages p
      LEFT JOIN tips t ON t.package_id = p.id
      GROUP BY p.id
      ORDER BY p.price ASC
    `);

    res.json({ packages: result.rows });

  } catch (err) {
    logger.error("getPackages error:", err.message);
    res.status(500).json({ error: "Failed to fetch packages." });
  }
}


/**
 * POST /api/packages
 * Create a new active package.
 * Price must be unique among active packages (enforced by partial unique index).
 */
async function createPackage(req, res) {
  const { name, price, game_count } = req.body;

  if (!name || !price == null || !game_count == null) {
    return res
      .status(400)
      .json({ error: "Name, price, and game count are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO packages (name, price, game_count, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name, price, game_count],
    );
    res.status(201).json({ package: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      // Unique violation from partial index on price WHERE is_active = true
      return res.status(409).json({
        error: `An active package already exists with a price of KES ${price}. Each package must have a unique price.`,
      });
    }
    logger.error(`createPackage error: ${err.message}`, err);
    res.status(500).json({ error: "Failed to create package." });
  }
}


/**
 * PUT /api/packages/:id
 * Update package name, price, or game_count.
 * Prevents reducing game_count below the number of pending tips.
 */
async function updatePackage(req, res) {
  const { id } = req.params;
  const { name, price, game_count } = req.body;

  if (!name || !price == null || !game_count == null) {
    return res
      .status(400)
      .json({ error: "Name, price, and game count are required." });
  }

  try {
    // Check if reducing game_count conflicts with existing active tips
    const existingTips = await pool.query(
      `SELECT COUNT(*) FROM tips WHERE package_id = $1 AND status = 'pending'`,
      [id],
    );

    // PostgreSQL count returns a string; use Number() or parseInt() for comparison
    const currentTipCount = Number(existingTips.rows[0].count);

    if (currentTipCount > game_count) {
      return res.status(400).json({
        error: `Cannot reduce game_count to ${game_count} because ${currentTipCount} active tips already exist.`,
      });
    }

    const result = await pool.query(
      `UPDATE packages
       SET name = $1, price = $2, game_count = $3
       WHERE id = $4
       RETURNING *`,
      [name, price, game_count, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found." });
    }

    res.json({ package: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: `Another active package already has a price of KES ${price}. Each package must have a unique price.`,
      });
    }

    logger.error("updatePackage error:", err.message);
    res.status(500).json({ error: "Failed to update package." });
  }
}


/**
 * PUT /api/packages/:id/deactivate
 * Deactivates a package (is_active = false) and marks all its pending tips as lost.
 * This prevents the package from being sold and removes pending tips from future purchases.
 */
async function deactivatePackage(req, res) {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Deactivate the package
    const deactivateRes = await client.query(
      `UPDATE packages SET is_active = false WHERE id = $1 RETURNING id`,
      [id],
    );
    if (deactivateRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Package not found." });
    }

    // Mark all pending tips as lost (so they are not sent to future buyers)
    // const tipsUpdateRes = await client.query(
    //   `UPDATE tips SET status = 'lost' WHERE package_id = $1 AND status = 'pending'`,
    //   [id],
    // );

    await client.query("COMMIT");
    res.json({
      message: "Package deactivated successfully",
      // affected_tips: tipsUpdateRes.rowCount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`deactivatePackage error: ${err.message}`);
    res.status(500).json({ error: "Failed to deactivate package." });
  } finally {
    client.release();
  }
}


/**
 * PUT /api/packages/:id/reactivate
 * Reactivates a package (is_active = true).
 * The package must have a unique price among active packages.
 * Tips remain as they are (lost tips stay lost; admin may add new pending tips).
 */
async function reactivatePackage(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE packages SET is_active = true WHERE id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found." });
    }

    res.json({ package: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error:
          "Cannot reactivate — another active package already has this price.",
      });
    }

    logger.error("reactivatePackage error:", err.message);
    res.status(500).json({ error: "Failed to reactivate package." });
  }
}

module.exports = {
  getPackages,
  createPackage,
  updatePackage,
  deactivatePackage,
  reactivatePackage,
};
