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

    const [
      contactsTotalRes,
      contactsByTierRes,
      customersTotalRes,
      customersByTierRes,
      paymentsTodayRes,
      flaggedUnresolvedRes,
      tipsStatsRes,
      packagesRes,
      ...financialResults
    ] = await Promise.all([...sharedQueries, ...financialQueries]);

    // Process tips statistics
    const tipsMap = {};
    tipsStatsRes.rows.forEach((r) => {
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
        total: parseInt(contactsTotalRes.rows[0].count),
        by_tier: contactsByTierRes.rows.map((r) => ({
          tier: r.potential_tier,
          count: parseInt(r.count),
        })),
      },
      customers: {
        total: parseInt(customersTotalRes.rows[0].count),
        by_tier: customersByTierRes.rows.map((r) => ({
          letter: r.tier_letter,
          sub: r.tier_sub_number,
          count: parseInt(r.count),
        })),
      },
      payments: {
        today_count: parseInt(paymentsTodayRes.rows[0].count),
        today_revenue: isAdmin
          ? parseFloat(paymentsTodayRes.rows[0].revenue)
          : null,
        flagged_unresolved: parseInt(flaggedUnresolvedRes.rows[0].count),
      },
      tips: {
        won,
        lost,
        pending,
        total_active: won + lost + pending,
        win_rate: winRate,
      },
      packages: {
        active: packagesRes.rows,
        count: packagesRes.rows.length,
      },
      financials: isAdmin
        ? {
            total_inflow: parseFloat(financialResults[0].rows[0].total || 0),
            total_outflow: parseFloat(financialResults[1].rows[0].total || 0),
            net_profit:
              parseFloat(financialResults[0].rows[0].total || 0) -
              parseFloat(financialResults[1].rows[0].total || 0),
          }
        : null,
      trends: isAdmin ? financialResults[2].rows : [],
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