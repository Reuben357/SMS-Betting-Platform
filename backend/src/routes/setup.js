const express = require('express');
const router = express.Router();
const setupGuard = require('../middleware/setupGuard');
const { setupAdmin, checkSetupRequired } = require('../controllers/setupController');

const { validate, setupSchema } = require('../middleware/validate');

// Public — check if setup is needed
router.get('/status', checkSetupRequired);

// Guarded — only works if no admin exists yet
router.post('/admin', setupGuard, validate(setupSchema), setupAdmin);

module.exports = router;