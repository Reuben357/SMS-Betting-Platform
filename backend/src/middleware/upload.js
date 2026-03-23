const multer = require('multer');

// Store the file in memory as a Buffer.
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const isCSVMime = file.mimetype === 'text/csv' ||
                    file.mimetype === 'text/plain' ||
                    file.mimetype === 'application/vnd.ms-excel';
  const isCSVExt = file.originalname.toLowerCase().endsWith('.csv');

  if (isCSVMime || isCSVExt) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Empty file guard
function rejectEmptyFile(req, res, next) {
  if (!req.file) {
    return next(); // Let the controller handle missing file
  }

  if (req.file.size === 0) {
    return res.status(400).json({ error: 'The uploaded file is empty.' });
  }

  next();
}

module.exports = { upload, rejectEmptyFile };
