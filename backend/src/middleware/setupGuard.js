const { pool } = require('../config/db');


// Blocks the setup route if an admin already exists in the system
async function setupGuard(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (result.rows.length > 0) {
      return res.status(403).json({
        error: 'System already initialised. Setup is no longer available.',
      });
    }

    next();
  } catch (err) {
    console.error('Setup guard error:', err.message);
    res.status(500).json({ error: 'Setup check failed.' });
  }
}

module.exports = setupGuard;