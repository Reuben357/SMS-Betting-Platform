const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getTemplates,
  updateTemplates,
} = require("../controllers/settingsController");

router.get("/templates", requireAdmin, syncUser, getTemplates);
router.put("/templates", requireAdmin, syncUser, updateTemplates);

module.exports = router;
