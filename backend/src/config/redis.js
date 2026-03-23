const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.error('Redis error:', err.message));
client.on('connect', () => console.log('Connected to Redis'));

client.connect().catch((err) => {
  console.error('Redis initial connection failed:', err.message);
});

module.exports = client;
