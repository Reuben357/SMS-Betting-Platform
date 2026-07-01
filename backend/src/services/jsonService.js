/**
 * Parse a JSON file buffer into an array of row objects.
 * The JSON format is expected to be: { "0": { "col_0": "...", "col_1": "...", "col_2": "..." }, ... }
 * We map col_0 -> phone, col_1 -> date, col_2 -> text.
 */
async function parseJSON(buffer) {
  const errors = [];
  let rows = [];
  try {
    const jsonString = buffer.toString('utf8');
    const data = JSON.parse(jsonString);
    // Convert object to array
    const entries = Object.values(data);
    if (entries.length === 0) {
      errors.push('JSON file contains no data.');
      return { rows, errors };
    }
    // Assume each entry has col_0, col_1, col_2
    rows = entries.map(entry => ({
      phone: entry.col_0,
      date_created: entry.col_1,
      text: entry.col_2,
    }));
    if (rows.length === 0) errors.push('No valid rows found in JSON.');
  } catch (err) {
    errors.push(`JSON parsing failed: ${err.message}`);
  }
  return { rows, errors };
}

module.exports = { parseJSON };