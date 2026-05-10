const express = require("express");
const router = express.Router();
const { validateToken, requireAdmin } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const { getCustomerStats, getCustomersWithTiers } = require("../controllers/customerController");

router.get("/stats", validateToken, syncUser, getCustomerStats);

router.get('/', validateToken, syncUser, getCustomersWithTiers);

router.get(
  "/with-tiers",
  validateToken,
  syncUser,
  getCustomersWithTiers
);

module.exports = router;