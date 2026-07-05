const crypto = require("crypto");
const {logger} = require("./errorHandler");
const {isIPv4InCIDR} = require("./ipUtils");

function timingSafeEqual(a, b) {
    const bufA = Buffer.from(a || "", "utf8");
    const bufB = Buffer.from(b || "", "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

if (!process.env.MALIPO_WEBHOOK_SECRET) {
    logger.warn(
        "MALIPO_WEBHOOK_SECRET is not set — Malipo callbacks are protected only "
)
    ;
}

function malipoPathGuard(req, res, next) {
    const expectedToken = process.env.MALIPO_CALLBACK_SECRET_PATH;
    if (!expectedToken) {
        logger.error("MALIPO_CALLBACK_SECRET_PATH is not set — refusing all Malipo callbacks.");
        return res.status(503).json({error: "Integration not configured."});
    }
    if (req.params.token !== expectedToken) {
        logger.warn(`Rejected Malipo callback — invalid path token from ${req.ip}`);
        return res.status(404).end();
    }
    next();
}

function malipoSignatureGuard(req, res, next) {
    const secret = process.env.MALIPO_WEBHOOK_SECRET;
    if (!secret) return next();

    const signature = req.headers["x-malipo-signature"];
    if (!signature) {
        logger.warn(`Rejected Malipo callback — missing signature header from ${req.ip}`);
        return res.status(401).json({error: "Unauthorized"});
    }

    const expected = crypto
        .createHmac("sha256", secret)
        .update(req.rawBody || Buffer.alloc(0))
        .digest("hex");

    if (!timingSafeEqual(signature, expected)) {
        logger.warn(`Rejected Malipo callback — signature mismatch from ${req.ip}`);
        return res.status(401).json({error: "Unauthorized"});
    }
    next();
}

function malipoIpGuard(req, res, next) {
    const allowedCidrs = (process.env.MALIPO_ALLOWED_CIDRS || "")
        .split(",").map(s => s.trim()).filter(Boolean);
    if (allowedCidrs.length === 0) return next();

    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
    if (!allowedCidrs.some(cidr => isIPv4InCIDR(ip, cidr))) {
        logger.warn(`Rejected Malipo callback — untrusted IP ${ip}`);
        return res.status(401).json({error: "Unauthorized"});
    }
    next();
}

module.exports = {malipoPathGuard, malipoSignatureGuard, malipoIpGuard};