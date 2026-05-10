const express = require("express");
const router  = express.Router();
const { requireAdmin } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const { getOutflow, createOutflow } = require("../controllers/outflowController");

router.get("/",  requireAdmin, syncUser, getOutflow);
router.post("/", requireAdmin, syncUser, createOutflow);

module.exports = router;