const cheerio = require('cheerio');

/**
 * Parse HTML buffer into array of row objects (similar to CSV parser).
 * Extracts data from the first <table> found.
 * @param {Buffer} buffer
 * @returns {Promise<{rows: Array, errors: Array}>}
 */
async function parseHTML(buffer) {
  const errors = [];
  let rows = [];
  try {
    const html = buffer.toString('utf8');
    const $ = cheerio.load(html);
    const tables = $('table');
    if (tables.length === 0) {
      errors.push('No <table> element found in HTML file.');
      return { rows, errors };
    }
    // Use the first table
    const $table = tables.first();
    const headers = [];
    $table.find('tr').first().find('th, td').each((i, cell) => {
      headers.push($(cell).text().trim());
    });
    if (headers.length === 0) {
      errors.push('No headers found in HTML table.');
      return { rows, errors };
    }
    $table.find('tr').each((i, row) => {
      if (i === 0 && headers.length > 0) return; // skip header row
      const rowData = {};
      $(row).find('td').each((j, cell) => {
        const key = headers[j] || `col_${j}`;
        rowData[key] = $(cell).text().trim();
      });
      if (Object.keys(rowData).length > 0) rows.push(rowData);
    });
    if (rows.length === 0) errors.push('No data rows found in HTML table.');
  } catch (err) {
    errors.push(`HTML parsing failed: ${err.message}`);
  }
  return { rows, errors };
}

module.exports = { parseHTML };