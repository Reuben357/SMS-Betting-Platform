const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { sendBulkSMS, handleOnfonDlrCallback} = require('../controllers/smsController');
const { onfonIpGuard } = require("../middleware/onfonGuard");
const { dlrLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");
const {smsSendSchema} = require("../middleware/validate");


router.post('/send', validateToken, syncUser, validate(smsSendSchema),sendBulkSMS);
router.get('/callback', onfonIpGuard, dlrLimiter, handleOnfonDlrCallback);


module.exports = router;