const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

const VALID_CATEGORIES = ["Domain", "VPS", "SMS Gateway", "Other"];

/**
 * GET /api/outflow
 * List all expenses, ordered newest first.
 * Joins users table to return entered_by email instead of raw UUID.
 */
async function getOutflow(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM outflow`);
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT o.id, o.amount, o.description, o.category, o.created_at,
              COALESCE(u.email, 'Unknown') AS entered_by_email
       FROM outflow o
       LEFT JOIN users u ON u.id = o.entered_by
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      outflow: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error(`getOutflow error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch outflow." });
  }
}

/**
 * POST /api/outflow
 * Record a new expense.
 */
async function createOutflow(req, res) {
  const { amount, description, category } = req.body;

  if (!amount || !description || !category) {
    return res
      .status(400)
      .json({ error: "Amount, description, and category are required." });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
    });
  }

  const parsedAmount = parseInt(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res
      .status(400)
      .json({ error: "Amount must be a positive integer." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO outflow (amount, description, category, entered_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, amount, description, category, created_at`,
      [parsedAmount, description, category, req.user.id],
    );

    res.status(201).json({ outflow: result.rows[0] });
  } catch (err) {
    logger.error(`createOutflow error: ${err.message}`);
    res.status(500).json({ error: "Failed to record expense." });
  }
}

module.exports = { getOutflow, createOutflow };
