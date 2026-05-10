const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { pool } = require('../config/db');
const { logger } = require('../middleware/errorHandler');

router.get('/', validateToken, syncUser, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM purchases');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT pu.id, pu.phone_number, pu.amount_paid, pu.created_at,
              pkg.name as package_name, pay.mpesa_ref
       FROM purchases pu
       LEFT JOIN packages pkg ON pkg.id = pu.package_id
       LEFT JOIN payments pay ON pay.id = pu.payment_id
       ORDER BY pu.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    res.json({
      purchases: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    logger.error(`GET /api/purchases error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch purchases.' });
  }
});

module.exports = router;