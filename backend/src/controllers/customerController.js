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
  try {
    const result = await pool.query(`
      SELECT 
        c.phone_number,
        c.total_purchases,
        c.tier_letter,
        c.tier_sub_number,
        COALESCE(SUM(pu.amount_paid), 0) AS total_spent
      FROM customers c
      LEFT JOIN purchases pu 
        ON pu.phone_number = c.phone_number
      WHERE c.is_active = true
      GROUP BY 
        c.phone_number,
        c.total_purchases,
        c.tier_letter,
        c.tier_sub_number
      ORDER BY total_spent DESC
    `);

    res.json({ customers: result.rows });
  } catch (err) {
    logger.error("getCustomersWithTiers error:", err.message);
    res.status(500).json({ error: "Failed to fetch customers." });
  }
}

module.exports = { getCustomerStats, getCustomersWithTiers };
