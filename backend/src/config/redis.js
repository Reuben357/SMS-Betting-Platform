const { createClient } = require('redis');
require('dotenv').config();
const { logger } = require('../middleware/errorHandler');


const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('Connected to Redis'));

(async () => { await client.connect(); })();

module.exports = client;