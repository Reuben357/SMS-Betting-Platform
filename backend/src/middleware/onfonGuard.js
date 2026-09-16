const { logger } = require('./errorHandler');
const { isIPv4InCIDR } = require('./ipUtils');

const allowedCidrs = (process.env.ONFON_ALLOWED_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);


if (allowedCidrs.length === 0)  {
    logger.warn('ONFON_ALLOWED_CIDRS not set - callback is open');
}

function onfonIpGuard(req, res, next) {
    if (allowedCidrs.length === 0) return next(); //pass-through if empty

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (!allowedCidrs.some((cidr) => isIPv4InCIDR(ip, cidr))) {
    logger.warn(`Rejected Onfon DRL callback - untrusted IP ${ip}`);
    return res.status(401).json({error: 'Unauthorized'});
    }
    next();
}

module.exports = {onfonIpGuard};