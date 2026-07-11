const { pool } = require('../config/db');
const { logger } = require('../middleware/errorHandler');

/**
 * Soft-delete packages (and their tips) that were deactivated more than
 * 90 days ago. Moved out of index.js, where it was previously an inline
 * function driven by setInterval(24h) counted from container boot time
 * rather than a fixed clock time. Logic is unchanged -- see cron/scheduler.js
 * for when this now actually runs.
 */
async function purgeOldPackages() {
    try {
        await pool.query(
            `UPDATE tips
       SET deleted_at = NOW()
       FROM packages pkg
       WHERE tips.package_id = pkg.id
         AND pkg.deleted_at IS NULL
         AND pkg.is_active = false
         AND pkg.deactivated_at < NOW() - INTERVAL '90 days'`,
        );

        const result = await pool.query(
            `UPDATE packages
       SET deleted_at = NOW()
       WHERE is_active = false
         AND deleted_at IS NULL
         AND deactivated_at < NOW() - INTERVAL '90 days'`,
        );

        if (result.rowCount > 0) {
            logger.info(`Soft-deleted ${result.rowCount} old packages (and their tips)`);
        }
    } catch (err) {
        logger.error({ err }, 'Package soft delete error');
    }
}

/**
 * Soft-delete messages older than 90 days that are already sent/failed.
 * Moved out of index.js for the same reason as purgeOldPackages above.
 */
async function purgeOldMessages() {
    try {
        const result = await pool.query(
            `UPDATE messages
       SET deleted_at = NOW()
       WHERE status IN ('sent', 'failed')
         AND created_at < NOW() - INTERVAL '90 days'
         AND deleted_at IS NULL`,
        );

        if (result.rowCount > 0) {
            logger.info(`Soft-deleted ${result.rowCount} old messages`);
        }
    } catch (err) {
        logger.error({ err }, 'Message soft delete error');
    }
}

module.exports = { purgeOldPackages, purgeOldMessages };