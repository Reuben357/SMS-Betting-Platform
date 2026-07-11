const { logger } = require('./errorHandler');
const { isIPv4InCIDR } = require('./ipUtils');
const { readSecret } = require('../config/secrets');
const { timingSafeEqual } = require('./secureCompare');
const crypto = require('crypto');

const MALIPO_CALLBACK_SECRET_PATH = readSecret(
    'MALIPO_CALLBACK_SECRET_PATH_FILE',
    'MALIPO_CALLBACK_SECRET_PATH'
);
const MALIPO_WEBHOOK_SECRET = readSecret(
    'MALIPO_WEBHOOK_SECRET_FILE',
    'MALIPO_WEBHOOK_SECRET'
);

if (!MALIPO_WEBHOOK_SECRET) {
    logger.warn(
        'MALIPO_WEBHOOK_SECRET is not set — Malipo callbacks are protected only by path token and IP allowlist, not signature verification.'
    );
}

function malipoIpGuard(req, res, next) {
    const allowedCidrs = (process.env.MALIPO_ALLOWED_CIDRS || '')
        .split(',').map(s => s.trim()).filter(Boolean);
    if (allowedCidrs.length === 0) return next();

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (!allowedCidrs.some(cidr => isIPv4InCIDR(ip, cidr))) {
        logger.warn(`Rejected Malipo callback — untrusted IP ${ip}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

function malipoPathGuard(req, res, next) {
    if (!MALIPO_CALLBACK_SECRET_PATH) {
        logger.error('MALIPO_CALLBACK_SECRET_PATH is not set — refusing all Malipo callbacks.');
        return res.status(503).json({ error: 'Integration not configured.' });
    }
    if (!timingSafeEqual(req.params.token, MALIPO_CALLBACK_SECRET_PATH)) {
        logger.warn(`Rejected Malipo callback — invalid path token from ${req.ip}`);
        return res.status(404).end();
    }
    next();
}

function malipoSignatureGuard(req, res, next) {
    if (!MALIPO_WEBHOOK_SECRET) return next();

    const signature = req.headers['x-malipo-signature'];
    if (!signature) {
        logger.warn(`Rejected Malipo callback — missing signature header from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const expected = crypto
        .createHmac('sha256', MALIPO_WEBHOOK_SECRET)
        .update(req.rawBody || Buffer.alloc(0))
        .digest('hex');

    if (!timingSafeEqual(signature, expected)) {
        logger.warn(`Rejected Malipo callback — signature mismatch from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

module.exports = { malipoIpGuard, malipoPathGuard, malipoSignatureGuard };