const express = require("express");
const router = express.Router();
const {malipoPathGuard, malipoSignatureGuard, malipoIpGuard} = require("../middleware/malipoGuard");
const {malipoCallback} = require("../controllers/malipoController");
const {mpesaLimiter} = require("../middleware/rateLimiter");

router.post(
    "/callback/:token",
    malipoPathGuard,
    malipoSignatureGuard,
    malipoIpGuard,
    mpesaLimiter,
    malipoCallback
);

module.exports = router;