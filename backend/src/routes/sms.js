const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { sendBulkSMS } = require('../controllers/smsController');

// Admin only (we can also allow staff? according to SRS, staff can send advertising SMS)
// We'll allow both for now, but restrict later if needed.
router.post('/send', validateToken, syncUser, sendBulkSMS);

module.exports = router;