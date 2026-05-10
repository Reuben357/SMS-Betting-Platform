const express = require('express');
const router = express.Router();
const {
  mpesaCallback,
  mpesaValidation,
  getPayments,
  resolvePayment,
} = require('../controllers/paymentController');
const { requireAdmin, validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { mpesaLimiter } = require('../middleware/rateLimiter');


// Public endpoint for M-Pesa C2B callbacks (Buy Goods), Safaricom calls this directly
router.post('/c2b-validation', mpesaValidation);   // validation endpoint (public)
router.post('/c2b-confirmation', mpesaLimiter, mpesaCallback);



// List payments with filters (status, resolved, pagination)
router.get('/', validateToken, syncUser, getPayments);

// Mark a flagged or failed payment as resolved
router.put('/:id/resolve', validateToken, syncUser, resolvePayment);

module.exports = router;