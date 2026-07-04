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
const mpesaSourceGuard = require('../middleware/mpesaSourceGuard');


// Protect endpoints by appending the secret token validation rule
router.post('/c2b-validation/:token', mpesaSourceGuard, mpesaValidation);
router.post('/c2b-confirmation/:token',mpesaSourceGuard,  mpesaLimiter ,mpesaCallback);



// List payments with filters (status, resolved, pagination)
router.get('/', validateToken, syncUser, requireAdmin, getPayments);

// Mark a flagged or failed payment as resolved
router.put('/:id/resolve', validateToken, syncUser, requireAdmin ,resolvePayment);

module.exports = router;