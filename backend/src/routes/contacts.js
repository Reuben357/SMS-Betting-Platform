const express = require("express");
const router = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getContacts,
  getUploadHistory,
  getTierCounts,
  getLeadStats,
  getJackpotContacts,
} = require("../controllers/contactsController");


const { getContactUploads } = require("../controllers/contactUploadsController");


router.get('/stats', validateToken, syncUser, getLeadStats); 
router.get("/", validateToken, syncUser, getContacts);
router.get("/uploads", validateToken, syncUser, getUploadHistory);
router.get('/tier-counts', validateToken, syncUser, getTierCounts);


router.get("/:phone/uploads", validateToken, syncUser, getContactUploads);

router.get("/jackpot", validateToken, syncUser, getJackpotContacts);




module.exports = router;
