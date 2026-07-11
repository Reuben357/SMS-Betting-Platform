require('dotenv').config();
const { Pool } = require('pg');
const { readSecret } = require('./secrets');
const { logger } = require('../middleware/errorHandler');

const dbPassword = readSecret('DB_PASSWORD_FILE', 'DB_PASSWORD');

const pool = new Pool({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: dbPassword,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
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

module.exports = { gracefulShutdown, pool };