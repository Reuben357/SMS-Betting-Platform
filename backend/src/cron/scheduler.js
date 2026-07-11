// Requires: npm install node-cron
const cron = require('node-cron');
const { logger } = require('../middleware/errorHandler');
const { purgeOldPackages, purgeOldMessages } = require('../services/cleanupService');
const { recoverStuckPayments } = require('../services/paymentRecovery');

function startScheduler() {
    // Every day at 02:00 -- old messages. Matches the original inline
    // comment's intent ("run every day at 2 AM"), which setInterval(24h)
    // never actually delivered since it counted from whenever the
    // container last started, not from a fixed clock time.
    cron.schedule('0 2 * * *', () => {
        purgeOldMessages();
    });

    // Every day at 03:00 -- old packages/tips (after the messages job, as
    // the original comment intended -- now actually true).
    cron.schedule('0 3 * * *', () => {
        purgeOldPackages();
    });

    // Every 5 minutes -- stuck payment recovery. No longer runs at server
    // boot (see index.js); first run happens on its own schedule once the
    // process and its DB/Redis connections are stable.
    cron.schedule('*/5 * * * *', () => {
        recoverStuckPayments();
    });

    logger.info(
        'Cron scheduler started (messages: 02:00 daily, packages: 03:00 daily, payment recovery: every 5m)',
    );
}

module.exports = { startScheduler };