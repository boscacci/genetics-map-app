/**
 * Sanitize values for Google Sheets to prevent formula interpretation.
 * Values starting with =, +, -, @ are treated as formulas; prefix with ' to force text.
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@'];

function sanitizeForSheets(val) {
  if (val == null || val === '') return val;
  const s = String(val).trim();
  if (s === '' || s.toUpperCase() === '#ERROR!') return '';
  const first = s.charAt(0);
  if (FORMULA_PREFIXES.includes(first)) {
    return "'" + s;
  }
  return s;
}

module.exports = { sanitizeForSheets };
