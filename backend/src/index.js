require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { logger } = require("./middleware/errorHandler");


const uploadRoutes = require('./routes/uploads');
const setupRoutes = require('./routes/setup');
const contactRoutes = require('./routes/contacts');
const { errorHandler } = require('./middleware/errorHandler');
const { gracefulShutdown } = require('./config/db');
const packageRoutes = require('./routes/packages');
const tierRoutes = require('./routes/tiers');
const tipsRoutes = require("./routes/tips");
// const sessionRoutes = require('./routes/sessions');
const paymentRoutes = require("./routes/payments");
const purchaseRoutes = require("./routes/purchases");
const smsRoutes = require("./routes/sms");
const customersRoutes = require("./routes/customers");
const outflowRoutes = require("./routes/outflows");
const accountingRoutes = require("./routes/accounting");
const messagesRoutes = require("./routes/messages");
const dashboardRoutes = require("./routes/dashboard");
const settingsRoutes = require("./routes/settings");
const { recoverStuckPayments } = require("./services/paymentRecovery");

const {
  standardLimiter,
  mpesaLimiter,
  smsLimiter,
  authLimiter,
} = require("./middleware/rateLimiter");


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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check — public, no auth required
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// / ── Public: M-Pesa callback — own strict limiter, no auth ────────────────────
// mpesaLimiter is applied directly in the payments router on the specific route.
// Apply the standard limiter at app level for everything else, then override below.
app.use(standardLimiter);

// Routes
app.use('/api/uploads', uploadRoutes);
app.use("/api/setup", authLimiter, setupRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/tiers', tierRoutes);
app.use("/api/tips", tipsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/sms", smsLimiter, smsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/outflows", outflowRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);



// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  await recoverStuckPayments();
  setInterval(recoverStuckPayments, 5 * 60 * 1000);
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