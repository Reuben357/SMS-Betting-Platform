const { pool } = require('../config/db');
const { parseCSV, extractContacts } = require('../services/csvService');
const { storeRawFile } = require('../services/fileStorageService');
const { logger } = require('../middleware/errorHandler');

// Maximum contacts per DB batch.
// Keeps PostgreSQL parameter count well under the 65,535 limit.
// 3 params per insert row + 2 params per update row = safe at 200.
const BATCH_SIZE = 200;

async function processBatch(client, batch) {
  const phoneNumbers = batch.map(c => c.phone_number);

  const existingResult = await client.query(
    `SELECT phone_number FROM contacts WHERE phone_number = ANY($1)`,
    [phoneNumbers]
  );

  const existingSet = new Set(existingResult.rows.map(r => r.phone_number));
  const toInsert = batch.filter(c => !existingSet.has(c.phone_number));
  const toUpdate = batch.filter(c => existingSet.has(c.phone_number));

  if (toInsert.length > 0) {
    const insertValues = toInsert
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, 1, $${i * 3 + 3})`)
      .join(', ');
    const insertParams = toInsert.flatMap(c => [
      c.phone_number,
      c.name,
      c.received_amount ?? 0,
    ]);
    await client.query(
      `INSERT INTO contacts (phone_number, name, frequency_count, total_received_amount)
       VALUES ${insertValues}
       ON CONFLICT (phone_number) DO NOTHING`,
      insertParams
    );
  }

  if (toUpdate.length > 0) {
    const updateValues = toUpdate
      .map((_, i) => `($${i * 2 + 1}::varchar, $${i * 2 + 2}::numeric)`)
      .join(', ');
    const updateParams = toUpdate.flatMap(c => [
      c.phone_number,
      c.received_amount ?? 0,
    ]);
    await client.query(
      `UPDATE contacts
       SET frequency_count       = contacts.frequency_count + 1,
           total_received_amount = contacts.total_received_amount + v.amount,
           updated_at            = NOW()
       FROM (VALUES ${updateValues}) AS v(phone, amount)
       WHERE contacts.phone_number = v.phone`,
      updateParams
    );
  }

  return { inserted: toInsert.length, updated: toUpdate.length, phones: phoneNumbers };
}

async function uploadCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  const uploadedBy = req.user.id;
  const filename = req.file.originalname;

  const { rows, errors: csvErrors } = await parseCSV(req.file.buffer);

  if (csvErrors.length > 0 && rows.length === 0) {
    return res.status(422).json({ error: 'File could not be parsed.', details: csvErrors });
  }

  const { contacts, rowErrors } = extractContacts(rows);

  if (contacts.length === 0) {
    return res.status(422).json({ error: rowErrors[0] || 'No valid contacts found.' });
  }

  // Store raw file (non-fatal)
  let rawFilePath = null;
  try {
    rawFilePath = await storeRawFile(req.file.buffer, filename);
  } catch (err) {
    logger.warn(`File storage warning: ${err.message}`);
  }

  let totalNew = 0;
  let totalUpdated = 0;
  const allPhoneNumbers = [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '300s'");

    // Log the upload first to get the upload ID
    const uploadLog = await client.query(
      `INSERT INTO csv_uploads (
         filename, uploaded_by, total_rows,
         new_contacts, updated_contacts,
         error_rows, error_log, raw_file_path
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        filename, uploadedBy, rows.length, 0, 0,
        rowErrors.length,
        rowErrors.length > 0 ? JSON.stringify(rowErrors) : null,
        rawFilePath,
      ]
    );

    const uploadId = uploadLog.rows[0].id;

    // Process contacts in batches of BATCH_SIZE
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const result = await processBatch(client, batch);
      totalNew += result.inserted;
      totalUpdated += result.updated;
      allPhoneNumbers.push(...result.phones);
    }

    // Recalculate tiers only for contacts in this upload
    await client.query(
      `UPDATE contacts c
       SET potential_tier = (
         SELECT tp.tier_number
         FROM tiers_potential tp
         WHERE c.frequency_count >= tp.min_frequency
           AND c.frequency_count <= tp.max_frequency
         LIMIT 1
       )
       WHERE c.phone_number = ANY($1)`,
      [allPhoneNumbers]
    );

    // Update upload log with final counts
    await client.query(
      `UPDATE csv_uploads
       SET new_contacts = $1, updated_contacts = $2
       WHERE id = $3`,
      [totalNew, totalUpdated, uploadId]
    );

    await client.query('COMMIT');

    logger.info(`Upload complete: ${filename} — ${totalNew} new, ${totalUpdated} updated`);

    return res.status(200).json({
      message: 'Upload complete.',
      filename,
      total_rows: rows.length,
      new_contacts: totalNew,
      updated_contacts: totalUpdated,
      skipped_rows: rowErrors.length,
      errors: rowErrors,
    });

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    logger.error(`Upload failed: ${err.message}`);
    return res.status(500).json({ error: 'Upload failed. No changes were saved.' });
  } finally {
    try { client.release(true); } catch (_) {}
  }
}

module.exports = { uploadCSV };
