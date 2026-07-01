const { parse } = require("csv-parse");

// ----------------------------------------------------------------------
// Normalise a Kenyan phone number to 07XXXXXXXX format
// ----------------------------------------------------------------------
function normalisePhone(raw) {
  if (!raw || raw === "N/A" || raw === "-" || raw === "null") return null;
  let phone = String(raw).trim();
  if (phone.includes(".")) phone = phone.split(".")[0];
  phone = phone.replace(/[^\d+]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("2547") && phone.length === 12) phone = "0" + phone.slice(3);
  if (phone.startsWith("2541") && phone.length === 12) phone = "0" + phone.slice(3);
  const kenyanPattern = /^0[17]\d{8}$/;
  if (!kenyanPattern.test(phone)) return null;
  return phone;
}

// ----------------------------------------------------------------------
// Parse CSV buffer into rows
// ----------------------------------------------------------------------
async function parseCSV(buffer) {
  // Strip UTF-8 BOM if present
  let cleanBuffer = buffer;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    cleanBuffer = buffer.slice(3);
  }

  // Detect delimiter by reading first line
  const firstLine = cleanBuffer.toString('utf8').split(/\r?\n/)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  return new Promise((resolve) => {
    const rows = [];
    const errors = [];
    parse(cleanBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      delimiter,
    })
        .on("data", (row) => rows.push(row))
        .on("error", (err) => errors.push(err.message))
        .on("end", () => resolve({ rows, errors }));
  });
}

// ----------------------------------------------------------------------
// Detect phone column
// ----------------------------------------------------------------------
function detectPhoneColumn(headers) {
  const candidates = [
    "phone", "phone_number", "phonenumber", "mobile", "mobile_number",
    "msisdn", "tel", "telephone", "contact", "number", "cell", "col_0"
  ];
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

// ----------------------------------------------------------------------
// Detect name and text columns
// ----------------------------------------------------------------------
function detectNameColumn(headers) {
  const nameCandidates = [
    "name", "full_name", "fullname", "customer_name", "first_name", "firstname", "client_name", "col_2"
  ];
  const textCandidates = ["text", "message", "msg", "body", "sms", "content"];
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  let nameCol = null;
  let textCol = null;

  for (const candidate of nameCandidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) {
      nameCol = headers[idx];
      break;
    }
  }
  for (const candidate of textCandidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) {
      textCol = headers[idx];
      break;
    }
  }
  return { nameCol, textCol };
}

// ----------------------------------------------------------------------
// Detect date/timestamp column (improved)
// ----------------------------------------------------------------------
function detectDateColumn(headers) {
  const candidates = [
    "date created", "date_created", "created_at", "createdat",
    "timestamp", "datetime", "upload_date", "time", "date", "col_1"
  ];
  for (const header of headers) {
    const normalised = header.toLowerCase().trim().replace(/\s+/g, ' ');
    if (candidates.includes(normalised)) return header;
    if (normalised.includes('date')) return header;
    if (normalised.includes('time')) return header;
  }
  return null;
}

// ----------------------------------------------------------------------
// Validate date/timestamp format
// Returns { valid: boolean, isoString: string|null, error: string|null }
// ----------------------------------------------------------------------
function validateDateTime(rawValue, columnName) {
  if (!rawValue || rawValue.toString().trim() === "") {
    return { valid: false, isoString: null, error: `Missing ${columnName}` };
  }

  const raw = rawValue.toString().trim();

  const hasTimeComponent = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(raw);

  if (!hasTimeComponent) {
    return {
      valid: false,
      isoString: null,
      error: `Invalid ${columnName} format: "${raw}" - must include both date AND time (YYYY-MM-DD HH:MM:SS)`
    };
  }
  
  const parsed = new Date(raw);

  if (isNaN(parsed.getTime())) {
    return { valid: false, isoString: null, error: `Invalid ${columnName} format: "${raw}"` };
  }

  // Normalise to ISO without milliseconds (second precision)
  const isoString = parsed.toISOString().split('.')[0] + 'Z';
  return { valid: true, isoString, error: null };
}

// ----------------------------------------------------------------------
// Extract name from message text (e.g., "Dear John, ...")
// ----------------------------------------------------------------------
function extractNameFromText(text) {
  if (!text || typeof text !== "string") return null;
  const pattern = /^(?:dear|hi|hello)\s+(?:mr\.?\s+|mrs\.?\s+|ms\.?\s+)?([A-Za-z]+),/i;
  const match = text.trim().match(pattern);
  return match ? match[1].trim() : null;
}

// ----------------------------------------------------------------------
// Extract amount from message text (e.g., "Kshs 89.3 received")
// ----------------------------------------------------------------------
function extractAmountFromText(text) {
  if (!text || typeof text !== "string") return null;
  const pattern = /(?:Kshs|KES)\s+([\d,]+(?:\.\d+)?)\s+received/i;
  const match = text.match(pattern);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ""));
  return isNaN(amount) ? null : amount;
}

// ----------------------------------------------------------------------
// Extract contacts from parsed rows, with:
// - intra‑file deduplication by (phone, date_created)
// - date/timestamp validation (REQUIRED)
// - phone validation (REQUIRED)
// - inclusion of date_created for cross‑upload deduplication
// ----------------------------------------------------------------------
function extractContacts(rows) {
  if (rows.length === 0) {
    return { contacts: [], rowErrors: ["File is empty or has no data rows."], duplicateCount: 0 };
  }

  const headers = Object.keys(rows[0]);
  const phoneCol = detectPhoneColumn(headers);
  if (!phoneCol) {
    return {
      contacts: [],
      rowErrors: ["No phone number column detected. Expected a column named: phone, mobile, msisdn, or similar."],
      duplicateCount: 0
    };
  }

  const { nameCol, textCol } = detectNameColumn(headers);
  const dateCol = detectDateColumn(headers);

  // REQUIRE both date and time/timestamp columns
  if (!dateCol) {
    return {
      contacts: [],
      rowErrors: ["No date/timestamp column detected. Expected a column named: date, date_created, timestamp, datetime, or similar."],
      duplicateCount: 0
    };
  }

  const contactMap = new Map();
  const rowErrors = [];
  let duplicateCount = 0;

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +2 because headers are row 1, data starts at row 2

    // 1. Validate phone number
    const rawPhone = row[phoneCol];
    const phone = normalisePhone(rawPhone);
    if (!phone) {
      if (!rawPhone || rawPhone.toString().trim() === "") {
        rowErrors.push(`Row ${rowNumber}: Empty row — skipped.`);
      } else {
        rowErrors.push(`Row ${rowNumber}: "${rawPhone}" is not a valid Kenyan phone number — skipped.`);
      }
      return;
    }

    // 2. Validate date/timestamp (REQUIRED)
    const dateValidation = validateDateTime(row[dateCol], dateCol);
    if (!dateValidation.valid) {
      if (!row[dateCol] || row[dateCol].toString().trim() === "") {
        rowErrors.push(`Row ${rowNumber}: Missing date/timestamp — skipped.`);
      } else {
        rowErrors.push(`Row ${rowNumber}: ${dateValidation.error} — skipped.`);
      }
      return;
    }

    const dateKey = dateValidation.isoString;

    // 3. Intra-file deduplication (same phone + same date in same file)
    const uniqueKey = `${phone}|${dateKey}`;
    if (contactMap.has(uniqueKey)) {
      duplicateCount++;
      return;
    }

    // 4. Extract name
    let name = null;
    let receivedAmount = null;
    let is_jackpot = false;

    if (nameCol) {
      name = (row[nameCol] || "").trim() || null;
    } else if (textCol) {
      name = extractNameFromText(row[textCol]);
    }
    if (name) name = name.replace(/'/g, "''").trim();

    // 5. Extract amount from text column (if available)
    if (textCol && row[textCol]) {
      receivedAmount = extractAmountFromText(row[textCol]);
      // Detect JP BET ID in the text
      const textValue = row[textCol].toString().toLowerCase();
      if (textValue.includes('jp bet id') || textValue.includes('jpbet id')) {
        is_jackpot = true;
      }
    }

    contactMap.set(uniqueKey, {
      phone_number: phone,
      name,
      received_amount: receivedAmount,
      date_created: dateKey,
      is_jackpot: is_jackpot,
    });
  });

  const contacts = Array.from(contactMap.values());
  return { contacts, rowErrors, duplicateCount };
}

module.exports = {
  parseCSV,
  extractContacts,
  normalisePhone,
  extractNameFromText,
  extractAmountFromText,
  validateDateTime,
  detectDateColumn,
};