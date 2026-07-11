const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('../middleware/errorHandler');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
  logger.info('Database Pool initialized: Connected to PostgreSQL.');
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL background pool client error occurred');
});

async function gracefulShutdown(signal) {
  try {
    logger.info(`(${signal}) Closing PostgreSQL pool...`);
    await pool.end();
    logger.info('PostgreSQL pool closed.');
  } catch (err) {
    logger.error({ err }, 'Error while closing PostgreSQL pool');
  }
}

module.exports = { pool, gracefulShutdown };