const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  // 57P01 = connection terminated by administrator (pg_terminate_backend)
  // 57014 = query cancelled
  // Pool will create a new connection automatically
  const recoverableCodes = ['57P01', '57014', 'ECONNRESET', 'EPIPE'];

  if (recoverableCodes.includes(err.code)) {
    console.error(`PostgreSQL recoverable error (${err.code}): ${err.message}`);
    return; // Pool handles reconnection automatically — do not exit
  }

  // Only exit on genuinely fatal errors
  console.error('PostgreSQL fatal error:', err.message);
  gracefulShutdown('PostgreSQL fatal error');
});

async function gracefulShutdown(reason) {
  console.error(`Shutting down gracefully. Reason: ${reason}`);
  try {
    await pool.end();
    console.log('PostgreSQL pool closed.');
  } catch (err) {
    console.error('Error closing PostgreSQL pool:', err.message);
  }
  process.exit(1);
}

module.exports = { pool, gracefulShutdown };