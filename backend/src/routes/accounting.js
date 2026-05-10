const express = require("express");
const router  = express.Router();
const { requireAdmin } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getAccountingSummary,
  getFlaggedPayments,
  getPurchaseHistory,
} = require("../controllers/accountingController");

router.get("/summary",   requireAdmin, syncUser, getAccountingSummary);
router.get("/flagged",   requireAdmin, syncUser, getFlaggedPayments);
router.get("/purchases", requireAdmin, syncUser, getPurchaseHistory);

module.exports = router;