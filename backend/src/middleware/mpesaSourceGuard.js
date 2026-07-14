const { logger } = require('./errorHandler');
const { isIPv4InCIDR } = require('./ipUtils');
const { readSecret } = require('../config/secrets');
const { timingSafeEqual } = require('./secureCompare');

// Safaricom's official server network ranges (CIDRs) provided in their dashboard
const ALLOWED_CIDRS = (process.env.MPESA_ALLOWED_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const MPESA_CALLBACK_SECRET_PATH = readSecret(
    'MPESA_CALLBACK_SECRET_PATH_FILE',
    'MPESA_CALLBACK_SECRET_PATH'
);

function mpesaSourceGuard(req, res, next) {
    // Get the real IP address of the caller (handling proxy setups like Nginx)
    const ip = (req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress;

    // Check 1: Does the secret token in the URL match our environment configuration?
    const tokenFromPath = req.params.token;
    if (!timingSafeEqual(tokenFromPath, MPESA_CALLBACK_SECRET_PATH)) {
        logger.warn(`Rejected M-Pesa callback — Bad token path attempted from IP: ${ip}`);
        // Return a fake 200 Success so hackers don't know they got blocked, but stop processing immediately
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // Check 2: If we configured safe IP ranges, is this incoming IP on the guest list?
    if (ALLOWED_CIDRS.length && !ALLOWED_CIDRS.some((cidr) => isIPv4InCIDR(ip, cidr))) {
        logger.warn(`Rejected M-Pesa callback — Untrusted IP source: ${ip}`);
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // If both checks pass, it's safe! Move to the actual controller.
    next();
}

module.exports = mpesaSourceGuard;