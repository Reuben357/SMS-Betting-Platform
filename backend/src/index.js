require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const uploadRoutes = require('./routes/uploads');
const setupRoutes = require('./routes/setup');
const contactRoutes = require('./routes/contacts');
const { errorHandler } = require('./middleware/errorHandler');
const { gracefulShutdown } = require('./config/db');
const packageRoutes = require('./routes/packages');
const tierRoutes = require('./routes/tiers');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/uploads', uploadRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/tiers', tierRoutes);

// Health check — public, no auth required
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

// Graceful shutdown on OS signals
async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await gracefulShutdown(signal);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch any unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});