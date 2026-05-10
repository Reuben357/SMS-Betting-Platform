const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");
const redis = require("../config/redis");

/**
 * GET /api/accounting/summary
 * Returns inflow, outflow, net profit, and flagged payment totals.
 * Uses Redis cache with 60‑second TTL.
 */
async function getAccountingSummary(req, res) {
  const now = Date.now();

  try {
    // 1. Try to get cached data from Redis
    const cached = await redis.get("accounting_summary");
    if (cached) {
      const data = JSON.parse(cached);
      logger.debug("Accounting summary served from Redis cache");
      return res.json({ ...data, cached: true });
    }

    logger.debug("Accounting summary cache miss – fetching fresh data");

    // 2. Fetch fresh data
    const [inflowRes, outflowRes, flaggedRes] = await Promise.all([
      // Inflow: matched payments + resolved flagged payments
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM payments
         WHERE status = 'matched' 
            OR (status::text LIKE 'flagged%' AND resolved = true)`
      ),
      // Total outflow (expenses)
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM outflow`),
      // Flagged summary (all flagged payments, regardless of resolved status)
      pool.query(
        `SELECT
           COUNT(*)                                                AS total_count,
           COUNT(*) FILTER (WHERE resolved = false)               AS unresolved_count,
           COALESCE(SUM(amount), 0)                               AS total_amount,
           COALESCE(SUM(amount) FILTER (WHERE resolved = false), 0) AS unresolved_amount
         FROM payments
         WHERE status::text LIKE 'flagged%'`
      ),
    ]);

    const inflow = parseFloat(inflowRes.rows[0].total);
    const outflow = parseFloat(outflowRes.rows[0].total);
    const flagged = flaggedRes.rows[0];

    // 3. Structure response
    const responseData = {
      inflow,
      outflow,
      net_profit: inflow - outflow,
      flagged: {
        total_count: parseInt(flagged.total_count),
        unresolved_count: parseInt(flagged.unresolved_count),
        total_amount: parseFloat(flagged.total_amount),
        unresolved_amount: parseFloat(flagged.unresolved_amount),
      },
      updated_at: new Date(now).toISOString(),
    };

    // 4. Store in Redis with 60‑second expiry
    await redis.setEx("accounting_summary", 60, JSON.stringify(responseData));

    res.json(responseData);
  } catch (err) {
    logger.error(`getAccountingSummary error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch accounting summary." });
  }
}

/**
 * GET /api/accounting/flagged
 * Paginated list of all flagged payments (any status::text LIKE 'flagged%').
 */
async function getFlaggedPayments(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;
  const { resolved } = req.query;

  try {
    const conditions = [`p.status::text LIKE 'flagged%'`];
    const params = [];
    let i = 1;

    if (resolved !== undefined) {
      conditions.push(`p.resolved = $${i++}`);
      params.push(resolved === "true");
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM payments p ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT
         p.id, p.phone_number, p.amount, p.mpesa_ref,
         p.status, p.excess_amount, p.resolved, p.created_at,
         pkg.name AS package_name
       FROM payments p
       LEFT JOIN packages pkg ON pkg.id = p.matched_package_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    res.json({
      payments: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error(`getFlaggedPayments error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch flagged payments." });
  }
}

/**
 * GET /api/accounting/purchases
 * Paginated list of all purchases with package name and M‑Pesa reference.
 */
async function getPurchaseHistory(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM purchases`);
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT
         pu.id, pu.phone_number, pu.amount_paid, pu.created_at,
         pkg.name AS package_name,
         pay.mpesa_ref
       FROM purchases pu
       LEFT JOIN packages pkg ON pkg.id = pu.package_id
       LEFT JOIN payments pay ON pay.id = pu.payment_id
       ORDER BY pu.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      purchases: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error(`getPurchaseHistory error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch purchase history." });
  }
}

module.exports = {
  getAccountingSummary,
  getFlaggedPayments,
  getPurchaseHistory,
};