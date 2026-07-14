require('dotenv').config();
const { createClient } = require('redis');
const { readSecret } = require('./secrets');
const { logger } = require('../middleware/errorHandler');

const redisPassword = readSecret('REDIS_PASSWORD_FILE', 'REDIS_PASSWORD');

const client = createClient({
  password: redisPassword,
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});

client.on('connect', () => {
  logger.info('Connected to Redis.');
});

client.on('error', (err) => {
  logger.error({ err }, 'Redis client error occurred');
});

(async () => {
  await client.connect();
})();

module.exports = client;