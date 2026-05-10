const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

// Compressing the file before writing to save disk space, especially for large CSVs.
async function storeRawFile(buffer, originalFilename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const baseDir = path.resolve(
    process.env.STORAGE_PATH || './storage/uploads'
  );
  const dir = path.join(baseDir, String(year), month);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${safeName}.gz`;
  const filePath = path.join(dir, filename);

  const compressed = await gzip(buffer);
  fs.writeFileSync(filePath, compressed);

  // Return relative path for storage in DB
  return path.join(String(year), month, filename);
}

module.exports = { storeRawFile };