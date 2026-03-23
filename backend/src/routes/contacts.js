const express = require("express");
const router = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getContacts,
  getUploadHistory,
} = require("../controllers/contactsController");

router.get("/", validateToken, syncUser, getContacts);
router.get("/uploads", validateToken, syncUser, getUploadHistory);

module.exports = router;
