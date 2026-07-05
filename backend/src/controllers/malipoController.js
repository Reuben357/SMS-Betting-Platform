const {pool} = require("../config/db");
const {acquireLock, releaseLock} = require("../middleware/redisLock");
const {processPayment} = require("../services/paymentService");
const {normalisePhone} = require("../services/csvService");
const {logger} = require("../middleware/errorHandler");
const {MIN_PACKAGE_PRICE, MAX_REASONABLE_AMOUNT} = require("../config/constants");

const PROCESS_TIMEOUT_MS = 30_000;


/**
 * Handle a payment confirmation forwarded by Malipo.
 */
async function malipoCallback(req, res) {
    const rawBodyStr = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
    logger.info(`Malipo callback received: ${rawBodyStr}`);

    const {TransID, TransAmount, BusinessShortCode, MSISDN} = req.body || {};

    if (!TransID || !TransAmount || !BusinessShortCode || !MSISDN) {
        logger.warn(`Malipo callback rejected — missing required fields: ${rawBodyStr}`);
        return res.status(400).json({error: "Missing required fields."});
    }
              
    const phoneNumber = normalisePhone(MSISDN);
    if (!phoneNumber) {
        logger.warn(`Malipo callback rejected — MSISDN doesn't look like a valid decoded number: ${MSISDN}`);
        return res.status(400).json({error: "Invalid phone number format."});
    }

    const amount = Math.round(parseFloat(TransAmount));
    if (isNaN(amount) || amount < MIN_PACKAGE_PRICE || amount > MAX_REASONABLE_AMOUNT) {
        logger.warn(`Malipo callback rejected — amount out of bounds: ${TransAmount}`);
        return res.status(400).json({error: "Invalid amount."});
    }

    let paymentId;
    try {
        const insertResult = await pool.query(
            `INSERT INTO payments (mpesa_ref, phone_number, amount, status, raw_payload)
             VALUES ($1, $2, $3, 'processing', $4) RETURNING id`,
            [TransID, phoneNumber, amount, JSON.stringify({...req.body, source: "malipo"})]
        );
        paymentId = insertResult.rows[0].id;
    } catch (err) {
        if (err.code === "23505") {
            logger.info(`Malipo callback — duplicate TransID ${TransID}, ignoring.`);
            return res.status(200).json({received: true});
        }
        logger.error(`Malipo callback insert error: ${err.message}`);
        return res.status(200).json({received: true}); // our failure, not Malipo's
    }

    res.status(200).json({received: true});

    const lockKey = `mpesa:${TransID}`;
    const locked = await acquireLock(lockKey, 120);
    if (!locked) {
        logger.warn(`Could not acquire lock for Malipo TransID ${TransID} — pending_retry`);
        await pool.query(`UPDATE payments
                          SET status = 'pending_retry'
                          WHERE id = $1`, [paymentId]);
        return;
    }

    setImmediate(async () => {
        try {
            await Promise.race([
                processPayment(paymentId, {mpesaRef: TransID, phoneNumber, amount}),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`processPayment timed out after ${PROCESS_TIMEOUT_MS}ms`)), PROCESS_TIMEOUT_MS)
                ),
            ]);
        } catch (err) {
            logger.error(`Async payment processing failed for Malipo TransID ${TransID}: ${err.message}`);
            await pool.query(`UPDATE payments
                              SET status = 'failed'
                              WHERE id = $1`, [paymentId]);
        } finally {
            await releaseLock(lockKey);
        }
    });
}

module.exports = {malipoCallback};