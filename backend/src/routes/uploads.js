const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/auth');
const syncUser = require('../middleware/syncUser');
const { uploadCSV } = require('../controllers/uploadController');

const { upload, rejectEmptyFile } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');


// All upload routes require a valid token
// syncUser attaches req.user from the DB
router.post(
  '/csv',
  validateToken,
  syncUser,
  uploadLimiter,
  upload.single('file'),
  rejectEmptyFile,
  uploadCSV
);

module.exports = router;