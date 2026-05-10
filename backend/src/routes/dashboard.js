const express = require("express");
const router  = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const { getDashboardData } = require("../controllers/dashboardController");

router.get("/", validateToken, syncUser, getDashboardData);

module.exports = router;