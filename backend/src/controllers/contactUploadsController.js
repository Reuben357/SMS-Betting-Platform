const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");

/**
 * GET /api/contacts/:phone/uploads
 * Returns all CSV uploads that included this phone number,
 * with the actual filename from csv_uploads.
 */
async function getContactUploads(req, res) {
    const { phone } = req.params;
    const jackpotOnly = req.query.jackpot === 'true';


    if (!phone) {
        return res.status(400).json({ error: "Phone number required." });
    }

    try {
        // Validate phone format
        const phoneRegex = /^0[17]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "Invalid phone number format." });
        }

        // Build query – filter by is_jackpot_event if jackpotOnly
        const filterClause = jackpotOnly ? ' AND ce.is_jackpot_event = true' : '';
        const query = `
            SELECT
                cu.filename,
                ce.amount,
                ce.date_created,
                ce.is_jackpot_event
            FROM contact_events ce
            LEFT JOIN csv_uploads cu ON cu.id = ce.upload_id
            WHERE ce.phone_number = $1 ${filterClause}
            ORDER BY ce.date_created DESC
        `;
        const result = await pool.query(query, [phone]);

        const uploads = result.rows.map(row => ({
            filename: row.filename || `Unknown file (${new Date(row.date_created).toLocaleDateString()})`,
            amount: row.amount,
            date_created: row.date_created,
            is_jackpot_event: row.is_jackpot_event,
        }));

        res.json({ uploads });
    } catch (err) {
        logger.error(`getContactUploads error: ${err.message}`);
        res.status(500).json({ error: "Failed to fetch upload history for contact." });
    }
}

module.exports = { getContactUploads };
