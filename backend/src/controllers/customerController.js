const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * GET /api/customers/stats
 * Fetches high-level metrics for the customer dashboard:
 * - Total active customers (is_active = true)
 * - Today's revenue from purchases
 * - Distribution of customers by active tier (letter + sub‑tier)
 */
async function getCustomerStats(req, res) {
  try {
    // 1. Total active customers (have made at least one purchase and not deactivated)
    const activeRes = await pool.query(
      `SELECT COUNT(*) FROM customers WHERE is_active = true`,
    );

    // 2. Revenue today from purchases (all successful purchases, including auto‑resolved overpayments)
    const revenueRes = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total 
       FROM purchases 
       WHERE created_at >= CURRENT_DATE`,
    );

    // 3. Sub‑tier distribution (letter + sub‑number) among active customers
    const subTierRes = await pool.query(
      `SELECT tier_letter, tier_sub_number, COUNT(*) 
       FROM customers 
       GROUP BY tier_letter, tier_sub_number 
       ORDER BY tier_letter, tier_sub_number`,
    );

    res.json({
      totalActiveCustomers: parseInt(activeRes.rows[0].count),
      revenueToday: parseFloat(revenueRes.rows[0].total),
      subTierDistribution: subTierRes.rows,
    });
  } catch (err) {
    logger.error("getCustomerStats error:", err.message);
    res.status(500).json({ error: "Failed to fetch customer stats." });
  }
}

/**
 * GET /api/customers/tiers
 * Returns a list of active customers with their total purchases, tier letter,
 * sub‑tier number, and total amount spent (sum of all purchases).
 * Ordered by total spent descending.
 */
async function getCustomersWithTiers(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(10000, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = (req.query.search || "").trim();

  try {
    const searchClause = search
        ? `AND (c.phone_number ILIKE $1 OR (c.tier_letter || c.tier_sub_number::text) ILIKE $1)`
        : "";
       const searchParam = search ? [`%${search}%`] : [];
       
       const countRes = await pool.query(
         `SELECT COUNT(*) FROM customers c WHERE c.is_active = true ${searchClause}`,
          searchParam,
       );

    const total = parseInt(countRes.rows[0].count);

    const limitParamIdx = searchParam.length + 1;
    const offsetParamIdx = searchParam.length + 2;

    const result = await pool.query(`
      SELECT
        c.phone_number,
        c.total_purchases,
        c.tier_letter,
        c.tier_sub_number,
        COALESCE(SUM(pu.amount_paid), 0) AS total_spent
      FROM customers c
             LEFT JOIN purchases pu ON pu.phone_number = c.phone_number
      WHERE c.is_active = true ${searchClause}
      GROUP BY c.phone_number, c.total_purchases, c.tier_letter, c.tier_sub_number
      ORDER BY total_spent DESC
        LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `, [...searchParam, limit, offset]);

    res.json({
      customers: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error("getCustomersWithTiers error:", err.message);
    res.status(500).json({ error: "Failed to fetch customers." });
  }
}


/**
 * GET /api/customers/subscriptions
 * Returns list of customers who have made at least one subscription purchase,
 * with total subscriptions, total amount spent, and last subscription date.
 */
async function getSubscriptionCustomers(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM customers WHERE total_subscriptions > 0`);
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(`
      SELECT 
        c.phone_number,
        c.total_subscriptions,
        c.total_subscription_amount,
        MAX(pu.created_at) AS last_subscription_date
      FROM customers c
      JOIN purchases pu ON pu.phone_number = c.phone_number AND pu.is_subscription = true
      WHERE c.total_subscriptions > 0
      GROUP BY c.phone_number, c.total_subscriptions, c.total_subscription_amount
      ORDER BY last_subscription_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      customers: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error("getSubscriptionCustomers error:", err.message);
    res.status(500).json({ error: "Failed to fetch subscription customers." });
  }
}

module.exports = { getCustomerStats, getCustomersWithTiers, getSubscriptionCustomers };