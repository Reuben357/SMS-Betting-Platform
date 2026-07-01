const { pool } = require('../config/db');
const { parseCSV, extractContacts } = require('../services/csvService');
const { storeRawFile } = require('../services/fileStorageService');
const { logger } = require('../middleware/errorHandler');
const { parseJSON } = require('../services/jsonService');
const path = require('path');

const BATCH_SIZE = 200;

// ----------------------------------------------------------------------
// Process a batch of contacts (insert new, update existing)
// ----------------------------------------------------------------------
async function processBatch(client, batch) {
  // Fetch all existing phone numbers from DB
  const phoneNumbers = batch.map(c => c.phone_number);
  const existingResult = await client.query(
      `SELECT phone_number FROM contacts WHERE phone_number = ANY($1)`,
      [phoneNumbers]
  );
  const existingSet = new Set(existingResult.rows.map(r => r.phone_number));


  const toInsert = [];
  const toUpdate = [];
  const insertedThisBatch = new Set();   // track phones we insert in this batch

  for (const contact of batch) {
    if (existingSet.has(contact.phone_number) || insertedThisBatch.has(contact.phone_number)) {
      toUpdate.push(contact);
    } else {
      toInsert.push(contact);
      insertedThisBatch.add(contact.phone_number);
    }
  }

  // Insert new contacts
  if (toInsert.length > 0) {
    const insertValues = toInsert
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, 1, $${i * 3 + 3})`)
        .join(', ');
    const insertParams = toInsert.flatMap(c => [c.phone_number, c.name, c.received_amount ?? 0]);
    await client.query(
        `INSERT INTO contacts (phone_number, name, frequency_count, total_received_amount)
         VALUES ${insertValues}
           ON CONFLICT (phone_number) DO NOTHING`,
        insertParams
    );
  }

  // Update existing contacts (include those inserted earlier in this batch)
  if (toUpdate.length > 0) {
    const updateValues = toUpdate
        .map((_, i) => `($${i * 3 + 1}::varchar, $${i * 3 + 2}::numeric, $${i * 3 + 3}::varchar)`)
        .join(', ');
    const updateParams = toUpdate.flatMap(c => [c.phone_number, c.received_amount ?? 0, c.name]);

    await client.query(
        `UPDATE contacts
         SET frequency_count = contacts.frequency_count + 1,
             total_received_amount = contacts.total_received_amount + v.amount,
             name = COALESCE(contacts.name, v.name),  -- Only set name if currently NULL
             updated_at = NOW()
           FROM (VALUES ${updateValues}) AS v(phone, amount, name)
         WHERE contacts.phone_number = v.phone`,
        updateParams
    );
  }

  return { inserted: toInsert.length, updated: toUpdate.length };
}


// Filter contacts against contact_events to find those that have never been processed
// (cross‑upload deduplication)
async function filterExistingEvents(client, contacts) {
  if (!contacts || contacts.length === 0) return { newContacts: [], duplicateCount: 0 };

  const contactsWithDate = contacts.filter(c => c.date_created);
  if (contactsWithDate.length === 0) {
    // No date info – can't check cross‑upload duplicates; process all
    return { newContacts: contacts, duplicateCount: 0 };
  }

  const placeholders = contactsWithDate.map((_, i) => `($${i*2+1}, $${i*2+2}::timestamptz)`).join(',');
  const params = contactsWithDate.flatMap(c => [c.phone_number, c.date_created]);

  const res = await client.query(
      `SELECT phone_number, date_created FROM contact_events
       WHERE (phone_number, date_created) IN (VALUES ${placeholders})`,
      params
  );

  // pg returns date_created as a JS Date object; normalise to the same ISO string
  // format that csvService produces (second precision, no milliseconds) so the
  // key comparison with contact.date_created actually matches.
  const existingSet = new Set(
      res.rows.map(r => {
        const iso = (r.date_created instanceof Date)
            ? r.date_created.toISOString().split('.')[0] + 'Z'
            : String(r.date_created);
        return `${r.phone_number}|${iso}`;
      })
  );
  const newContacts = [];
  let duplicateCount = 0;

  for (const contact of contacts) {
    if (!contact.date_created) {
      newContacts.push(contact);
      continue;
    }
    const key = `${contact.phone_number}|${contact.date_created}`;
    if (existingSet.has(key)) {
      duplicateCount++;
    } else {
      newContacts.push(contact);
    }
  }
  return { newContacts, duplicateCount };
}

// TEMPORARY: record events with upload_id for fact‑checking
// CHANGED: added uploadId parameter and include it in the INSERT
async function recordProcessedEvents(client, contacts, uploadId) {
  if (!contacts || !Array.isArray(contacts)) return 0;
  const contactsWithDate = contacts.filter(c => c && c.date_created);
  if (contactsWithDate.length === 0) return 0;

  // Include is_jackpot in the INSERT (5 placeholders)
  const values = contactsWithDate
      .map((_, i) => `($${i*5+1}, $${i*5+2}::timestamptz, $${i*5+3}, $${i*5+4}, $${i*5+5})`)
      .join(',');
  const params = contactsWithDate.flatMap(c => [
    c.phone_number,
    c.date_created,
    c.received_amount ?? 0,
    uploadId,
    c.is_jackpot || false
  ]);

  const result = await client.query(
      `INSERT INTO contact_events (phone_number, date_created, amount, upload_id, is_jackpot_event)
       VALUES ${values}
         ON CONFLICT (phone_number, date_created) DO NOTHING`,
      params
  );
  return result.rowCount;
}


// Detect file type and parse accordingly
function getParserForFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.csv') return parseCSV;
  if (ext === '.txt') return parseCSV;
  if (ext === '.json') return parseJSON;
  return null;
}


// Main upload handler
async function uploadCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  const uploadedBy = req.user.id;
  const filename = req.file.originalname;

  const parser = getParserForFile(filename);
  if (!parser) {
    return res.status(400).json({ error: 'Unsupported file type.' });
  }
  const { rows, errors: fileErrors } = await parser(req.file.buffer);

  const { contacts, rowErrors, duplicateCount: intraDupCount } = extractContacts(rows);
  if (contacts.length === 0) {
    return res.status(422).json({ error: rowErrors[0] || 'No valid contacts found.' });
  }

  let rawFilePath = null;
  try {
    rawFilePath = await storeRawFile(req.file.buffer, filename);
  } catch (err) {
    logger.warn(`File storage warning: ${err.message}`);
  }

  const client = await pool.connect();
  let totalNew = 0, totalUpdated = 0;
  let crossUploadDupCount = 0;
  let processedContacts = [];

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '300s'");

    // 1. Filter out contacts already seen in any previous upload
    const { newContacts, duplicateCount: existingDup } = await filterExistingEvents(client, contacts);
    crossUploadDupCount = existingDup;

    if (newContacts.length === 0) {
      // Still log the upload even if nothing new
      await client.query(
          `INSERT INTO csv_uploads (filename, uploaded_by, total_rows, new_contacts, updated_contacts,
                                   error_rows, error_log, raw_file_path)
         VALUES ($1, $2, $3, 0, 0, $4, $5, $6)`,
          [filename, uploadedBy, rows.length, rowErrors.length,
            rowErrors.length > 0 ? JSON.stringify(rowErrors) : null, rawFilePath]
      );
      await client.query('COMMIT');
      return res.status(200).json({
        message: 'No new contacts to process (all rows already seen).',
        filename,
        total_rows: rows.length,
        new_contacts: 0,
        updated_contacts: 0,
        skipped_rows: rowErrors.length,
        duplicate_rows: intraDupCount + crossUploadDupCount,
        errors: rowErrors,
      });
    }

    // 2. Log the upload and get ID
    const uploadLog = await client.query(
        `INSERT INTO csv_uploads (filename, uploaded_by, total_rows, new_contacts, updated_contacts,
                                 error_rows, error_log, raw_file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
        [filename, uploadedBy, rows.length, 0, 0,
          rowErrors.length, rowErrors.length > 0 ? JSON.stringify(rowErrors) : null, rawFilePath]
    );
    // TEMPORARY: store uploadId to pass to recordProcessedEvents
    const uploadId = uploadLog.rows[0].id;

    // 3. Process contacts in batches (only those that are truly new)
    for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
      const batch = newContacts.slice(i, i + BATCH_SIZE);
      const result = await processBatch(client, batch);
      totalNew += result.inserted;
      totalUpdated += result.updated;
      processedContacts.push(...batch);
    }

    // 4. Recalculate potential tiers only for touched contacts
    const allPhoneNumbers = [...new Set(processedContacts.map(c => c.phone_number))];
    if (allPhoneNumbers.length > 0) {
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
    }

// 5. Mark jackpot customers (is_jackpot)
    const jackpotPhones = processedContacts
        .filter(c => c.is_jackpot)
        .map(c => c.phone_number);
    if (jackpotPhones.length > 0) {
      await client.query(
          `UPDATE contacts SET is_jackpot = true WHERE phone_number = ANY($1)`,
          [jackpotPhones]
      );
    }

// 6. Record processed events into contact_events (NOW BEFORE FREQUENCY UPDATE)
    const eventsInserted = await recordProcessedEvents(client, processedContacts, uploadId);

// 7. Update jackpot_frequency based on the events just recorded
    if (jackpotPhones.length > 0) {
      await client.query(
          `UPDATE contacts
           SET jackpot_frequency = (
             SELECT COUNT(*)
             FROM contact_events ce
             WHERE ce.phone_number = contacts.phone_number
               AND ce.is_jackpot_event = true
           )
           WHERE phone_number = ANY($1)`,
          [jackpotPhones]
      );
    }

// 8. Update upload log with final counts
    await client.query(
        `UPDATE csv_uploads
         SET new_contacts = $1, updated_contacts = $2
         WHERE id = $3`,
        [totalNew, totalUpdated, uploadId]
    );

    await client.query('COMMIT');

    logger.info(`Upload complete: ${filename} – ${totalNew} new, ${totalUpdated} updated, ` +
        `${intraDupCount} intra‑file dup, ${crossUploadDupCount} cross‑file dup`);

    return res.status(200).json({
      message: 'Upload complete.',
      filename,
      total_rows: rows.length,
      new_contacts: totalNew,
      updated_contacts: totalUpdated,
      skipped_rows: rowErrors.length,
      duplicate_rows: intraDupCount + crossUploadDupCount,
      errors: rowErrors,
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error(`Upload failed: ${err.message}`);
    return res.status(500).json({ error: 'Upload failed. No changes were saved.' });
  } finally {
    client.release();
  }
}

module.exports = { uploadCSV };