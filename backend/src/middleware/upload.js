const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'text/csv',
    'text/plain',
    'application/json',
    'application/octet-stream',
  ];
  const allowedExts = ['.csv', '.txt', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedMime = allowedMimes.includes(file.mimetype);
  const isAllowedExt = allowedExts.includes(ext);
  
  if (isAllowedMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Please upload CSV, TXT, or JSON files.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, //50 MB
    fields: 10
  },
});

function rejectEmptyFile(req, res, next) {
  if (!req.file) return next();
  if (req.file.size === 0) {
    return res.status(400).json({ error: 'The uploaded file is empty.' });
  }
  next();
}

module.exports = { upload, rejectEmptyFile };
