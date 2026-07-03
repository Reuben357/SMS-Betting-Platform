// controllers/dashboardController.js
// Staff users get all operational data but NO financial figures.
const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

async function getDashboardData(req, res) {
  const isAdmin = req.user?.role === "admin";

  try {
    // Trend query (last 7 days) – includes resolved flagged payments in inflow
    const trendQuery = `
      WITH date_range AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date AS day
      ),
      inflow_trend AS (
        SELECT DATE(created_at) as day, SUM(amount) as total
        FROM payments 
        WHERE status = 'matched' OR (resolved = true AND status::text LIKE 'flagged%')
        GROUP BY 1
      ),
      outflow_trend AS (
        SELECT DATE(created_at) as day, SUM(amount) as total
        FROM outflow GROUP BY 1
      )
      SELECT
        TO_CHAR(dr.day, 'Dy') as name,
        COALESCE(it.total, 0)::float as inflow,
        COALESCE(ot.total, 0)::float as outflow
      FROM date_range dr
      LEFT JOIN inflow_trend it ON dr.day = it.day
      LEFT JOIN outflow_trend ot ON dr.day = ot.day
      ORDER BY dr.day ASC;
    `;

    // Shared queries (run for all users, staff & admin)
    const sharedQueries = [
      pool.query(`SELECT COUNT(*) FROM contacts`),
      pool.query(
          `SELECT potential_tier, COUNT(*) as count FROM contacts
         WHERE potential_tier IS NOT NULL GROUP BY potential_tier ORDER BY potential_tier ASC`,
      ),
      pool.query(`SELECT COUNT(*) FROM customers WHERE is_active = true`),
      pool.query(
          `SELECT tier_letter, tier_sub_number, COUNT(*) as count
         FROM customers WHERE tier_letter IS NOT NULL
         GROUP BY tier_letter, tier_sub_number ORDER BY tier_letter, tier_sub_number`,
      ),
      // Today's payments: matched + resolved flagged (aligns with accounting inflow)
      pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
         FROM payments 
         WHERE created_at >= CURRENT_DATE 
           AND (status = 'matched' OR (resolved = true AND status::text LIKE 'flagged%'))`,
      ),
      // Flagged unresolved payments (all flagged types that are not resolved)
      pool.query(
          `SELECT COUNT(*) as count FROM payments
         WHERE status::text LIKE 'flagged%' AND resolved = false`,
      ),
      // Tips stats – no is_active column; just group by status
      pool.query(`SELECT status, COUNT(*) as count FROM tips GROUP BY status`),
      // Active packages (is_active = true)
      pool.query(
          `SELECT id, name, price, game_count FROM packages
         WHERE is_active = true ORDER BY price ASC`,
      ),
      // Normal package customers (distinct phone numbers with non‑subscription purchases)
      pool.query(
          `SELECT COUNT(DISTINCT phone_number) as count
         FROM purchases
         WHERE is_subscription = false`,
      ),
    ];

    // Financial queries – only for admin users
    const financialQueries = isAdmin
        ? [
          // Total inflow (matched + resolved flagged)
          pool.query(
              `SELECT COALESCE(SUM(amount), 0) as total FROM payments
             WHERE status = 'matched'
               OR (resolved = true AND status::text LIKE 'flagged%')`,
          ),
          // Total outflow (expenses)
          pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM outflow`),
          // Trend data
          pool.query(trendQuery),
        ]
        : [];

    // Execute all queries
    const results = await Promise.all([...sharedQueries, ...financialQueries]);

    // Helper to safely get the first row value
    const getValue = (result, field, defaultValue = 0) => {
      return result?.rows?.[0]?.[field] ?? defaultValue;
    };

    // Helper to safely get rows array
    const getRows = (result, defaultValue = []) => {
      return result?.rows ?? defaultValue;
    };

    // Extract shared results by index (0–8)
    const contactsTotalRes = results[0];
    const contactsByTierRes = results[1];
    const customersTotalRes = results[2];
    const customersByTierRes = results[3];
    const paymentsTodayRes = results[4];
    const flaggedUnresolvedRes = results[5];
    const tipsStatsRes = results[6];
    const packagesRes = results[7];
    const normalPackageCustomersRes = results[8];

    // Financial results start at index 9 (if admin)
    const financialResults = results.slice(9);

    // Process tips statistics
    const tipsRows = getRows(tipsStatsRes);
    const tipsMap = {};
    tipsRows.forEach((r) => {
      tipsMap[r.status] = parseInt(r.count);
    });
    const won = tipsMap.won ?? 0;
    const lost = tipsMap.lost ?? 0;
    const pending = tipsMap.pending ?? 0;
    const decided = won + lost;
    const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

    // Build response object
    const response = {
      contacts: {
        total: getValue(contactsTotalRes, 'count', 0),
        by_tier: getRows(contactsByTierRes).map((r) => ({
          tier: r.potential_tier,
          count: parseInt(r.count),
        })),
      },
      customers: {
        total: getValue(customersTotalRes, 'count', 0),
        by_tier: getRows(customersByTierRes).map((r) => ({
          letter: r.tier_letter,
          sub: r.tier_sub_number,
          count: parseInt(r.count),
        })),
        normal_package_customers: getValue(normalPackageCustomersRes, 'count', 0),
      },
      payments: {
        today_count: getValue(paymentsTodayRes, 'count', 0),
        today_revenue: isAdmin ? getValue(paymentsTodayRes, 'revenue', 0) : null,
        flagged_unresolved: getValue(flaggedUnresolvedRes, 'count', 0),
      },
      tips: {
        won,
        lost,
        pending,
        total_active: won + lost + pending,
        win_rate: winRate,
      },
      packages: {
        active: getRows(packagesRes),
        count: getRows(packagesRes).length,
      },
      financials: isAdmin
          ? {
            total_inflow: getValue(financialResults[0], 'total', 0),
            total_outflow: getValue(financialResults[1], 'total', 0),
            net_profit:
                getValue(financialResults[0], 'total', 0) -
                getValue(financialResults[1], 'total', 0),
          }
          : null,
      trends: isAdmin ? getRows(financialResults[2]) : [],
      role: req.user.role,
    };

    res.json(response);
  } catch (err) {
    logger.error(`getDashboardData error: ${err.message}`);
    res.status(500).json({
      error: "Failed to fetch dashboard data.",
      details: err.message,
    });
  }
}

module.exports = { getDashboardData };