const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { createTip, getTips, updateTipOutcome, deleteTip } = require('../controllers/tipsController');

router.post('/', validateToken, syncUser, createTip);
router.get('/', validateToken, syncUser, getTips);
router.put('/:id/outcome', validateToken, syncUser, updateTipOutcome);
router.delete('/:id', validateToken, syncUser, deleteTip);

module.exports = router;