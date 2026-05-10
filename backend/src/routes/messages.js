const express = require("express");
const router  = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const { getMessages } = require("../controllers/messagesController");

router.get("/", validateToken, syncUser, getMessages);

module.exports = router;