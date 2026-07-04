const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { sendBulkSMS } = require('../controllers/smsController');
const { logger } = require("../middleware/errorHandler");
const {pool} = require('../config/db');

router.post('/send', validateToken, syncUser, sendBulkSMS);

router.post('/callback', async (req, res) => {
  // Emalify sends delivery reports here
  const { messageId, status, recipient, error } = req.body;
try {
  await pool.query(
    `UPDATE messages 
     SET status = $1, 
         delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE NULL END,
         failure_reason = $2
     WHERE message_provider_id = $3`,
    [status === 'delivered' ? 'sent' : 'failed', error, messageId]
  );
  
  res.status(200).json({ received: true });
} catch (err) {
  logger.error('Emalify delivery callback database processing error:', err.message);
  res.status(200).json({ received: false, error: 'Failed to process callback' });
}
});

module.exports = router;