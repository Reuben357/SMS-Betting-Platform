const { pool } = require("../config/db");

async function getPackages(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, price, tip_count, game_count, is_active, created_at
       FROM packages
       ORDER BY price ASC`,
    );
    res.json({ packages: result.rows });
  } catch (err) {
    console.error("getPackages error:", err.message);
    res.status(500).json({ error: "Failed to fetch packages." });
  }
}

async function createPackage(req, res) {
  const { name, price, tip_count, game_count } = req.body;

  if (!name || !price || !tip_count || !game_count) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Check for duplicate price among active packages
    const existing = await pool.query(
      `SELECT id FROM packages WHERE price = $1 AND is_active = true`,
      [price],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `An active package already exists with a price of KES ${price}. Each package must have a unique price.`,
      });
    }

    const result = await pool.query(
      `INSERT INTO packages (name, price, tip_count, game_count)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, price, tip_count, game_count],
    );
    res.status(201).json({ package: result.rows[0] });
  } catch (err) {
    console.error("createPackage error:", err.message);
    res.status(500).json({ error: "Failed to create package." });
  }
}

async function updatePackage(req, res) {
  const { id } = req.params;
  const { name, price, tip_count, game_count } = req.body;

  if (!name || !price || !tip_count || !game_count) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Check for duplicate price among other active packages
    const existing = await pool.query(
      `SELECT id FROM packages WHERE price = $1 AND is_active = true AND id != $2`,
      [price, id],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `Another active package already has a price of KES ${price}. Each package must have a unique price.`,
      });
    }

    const result = await pool.query(
      `UPDATE packages
       SET name = $1, price = $2, tip_count = $3, game_count = $4
       WHERE id = $5
       RETURNING *`,
      [name, price, tip_count, game_count, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found." });
    }

    res.json({ package: result.rows[0] });
  } catch (err) {
    console.error("updatePackage error:", err.message);
    res.status(500).json({ error: "Failed to update package." });
  }
}

async function deactivatePackage(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE packages SET is_active = false WHERE id = $1 RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found." });
    }
    res.json({ package: result.rows[0] });
  } catch (err) {
    console.error("deactivatePackage error:", err.message);
    res.status(500).json({ error: "Failed to deactivate package." });
  }
}

async function reactivatePackage(req, res) {
  const { id } = req.params;
  try {
    // Check price uniqueness before reactivating
    const pkg = await pool.query(`SELECT price FROM packages WHERE id = $1`, [
      id,
    ]);
    if (pkg.rows.length === 0)
      return res.status(404).json({ error: "Package not found." });

    const conflict = await pool.query(
      `SELECT id FROM packages WHERE price = $1 AND is_active = true AND id != $2`,
      [pkg.rows[0].price, id],
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error:
          "Cannot reactivate — another active package already has this price.",
      });
    }

    const result = await pool.query(
      `UPDATE packages SET is_active = true WHERE id = $1 RETURNING *`,
      [id],
    );
    res.json({ package: result.rows[0] });
  } catch (err) {
    console.error("reactivatePackage error:", err.message);
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
