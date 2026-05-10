const express = require("express");
const router = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getContacts,
  getUploadHistory,
  getTierCounts,
  getLeadStats,
} = require("../controllers/contactsController");

router.get('/stats', validateToken, syncUser, getLeadStats); 
router.get("/", validateToken, syncUser, getContacts);
router.get("/uploads", validateToken, syncUser, getUploadHistory);
router.get('/tier-counts', validateToken, syncUser, getTierCounts);

module.exports = router;
