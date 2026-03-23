const { parse } = require("csv-parse");

// ------------------------------------
// Normalise any Kenyan phone number
// format to 07XXXXXXXX or 01XXXXXXXX
// ------------------------------------
function normalisePhone(raw) {
  if (!raw || raw === "N/A" || raw === "-" || raw === "null") return null;
  let phone = String(raw).trim();
  // Strip decimal part from float representation
  if (phone.includes(".")) phone = phone.split(".")[0];
  // Remove everything except digits and leading +
  phone = phone.replace(/[^\d+]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("2547") && phone.length === 12)
    phone = "0" + phone.slice(3);
  if (phone.startsWith("2541") && phone.length === 12)
    phone = "0" + phone.slice(3);
  const kenyanPattern = /^0[17]\d{8}$/;
  if (!kenyanPattern.test(phone)) return null;
  return phone;
}

// ------------------------------------
// Parse CSV buffer into rows
// ------------------------------------
async function parseCSV(buffer) {
  // Strip UTF-8 BOM if present (common in Excel-exported CSV files)
  let cleanBuffer = buffer;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    cleanBuffer = buffer.slice(3);
  }
  return new Promise((resolve) => {
    const rows = [];
    const errors = [];

    parse(cleanBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })
      .on("data", (row) => rows.push(row))
      .on("error", (err) => errors.push(err.message))
      .on("end", () => resolve({ rows, errors }));
  });
}

// ------------------------------------
// Detect phone column
// ------------------------------------
function detectPhoneColumn(headers) {
  const candidates = [
    "phone",
    "phone_number",
    "phonenumber",
    "mobile",
    "mobile_number",
    "msisdn",
    "tel",
    "telephone",
    "contact",
    "number",
    "cell",
  ];

  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

// ------------------------------------
// Detect name column and text/message
// column for fallback name + amount
// extraction
// ------------------------------------
function detectNameColumn(headers) {
  const nameCandidates = [
    "name",
    "full_name",
    "fullname",
    "customer_name",
    "first_name",
    "firstname",
    "client_name",
  ];

  const textCandidates = ["text", "message", "msg", "body", "sms", "content"];

  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

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

// ------------------------------------
// Extract first name from greeting
// patterns in message text
//
// Handles:
//   "Dear James, ..."
//   "Hi Rodgers, ..."
//   "Hello Mary, ..."
//   "Dear Mr. John, ..."
// ------------------------------------
function extractNameFromText(text) {
  if (!text || typeof text !== "string") return null;

  const pattern =
    /^(?:dear|hi|hello)\s+(?:mr\.?\s+|mrs\.?\s+|ms\.?\s+)?([A-Za-z]+),/i;
  const match = text.trim().match(pattern);

  return match ? match[1].trim() : null;
}

// ------------------------------------
// Extract received amount from message
// text. Returns a float or null.
//
// Handles:
//   "Kshs 89.3 received"
//   "KES 475 received"
//   "Kshs 1,200.50 received"
// ------------------------------------
function extractAmountFromText(text) {
  if (!text || typeof text !== "string") return null;

  const pattern = /(?:Kshs|KES)\s+([\d,]+(?:\.\d+)?)\s+received/i;
  const match = text.match(pattern);

  if (!match) return null;

  // Remove commas from numbers like 1,200.50
  const amount = parseFloat(match[1].replace(/,/g, ""));
  return isNaN(amount) ? null : amount;
}

// ------------------------------------
// Extract contacts from parsed rows
// Returns: { contacts, rowErrors }
// Each contact includes:
//   phone_number, name, received_amount
// ------------------------------------
function extractContacts(rows) {
  if (rows.length === 0) {
    return {
      contacts: [],
      rowErrors: ["File is empty or has no data rows."],
    };
  }

  const headers = Object.keys(rows[0]);
  const phoneCol = detectPhoneColumn(headers);

  if (!phoneCol) {
    return {
      contacts: [],
      rowErrors: [
        "No phone number column detected. Expected a column named: phone, mobile, msisdn, or similar.",
      ],
    };
  }

  const { nameCol, textCol } = detectNameColumn(headers);
  const contacts = [];
  const rowErrors = [];

  rows.forEach((row, i) => {
    const rawPhone = row[phoneCol];
    const phone = normalisePhone(rawPhone);

    if (!phone) {
      rowErrors.push(
        `Row ${i + 2}: "${rawPhone}" is not a valid Kenyan phone number — skipped.`,
      );
      return;
    }

    let name = null;
    let receivedAmount = null;

    if (nameCol) {
      name = (row[nameCol] || "").trim() || null;
    } else if (textCol) {
      name = extractNameFromText(row[textCol]);
    }

    // Sanitise name — remove characters that cause SQL issues
    if (name) {
      name = name.replace(/'/g, "''").trim() || null;
    }

    // Extract amount from text column regardless of whether
    // a dedicated name column exists — the text column may
    // contain the amount even when a separate name column is present
    if (textCol && row[textCol]) {
      receivedAmount = extractAmountFromText(row[textCol]);
    }

    contacts.push({
      phone_number: phone,
      name,
      received_amount: receivedAmount,
    });
  });

  return { contacts, rowErrors };
}

module.exports = {
  parseCSV,
  extractContacts,
  normalisePhone,
  extractNameFromText,
  extractAmountFromText,
};
