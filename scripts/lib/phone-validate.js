/**
 * Phone validation and corruption detection for promote workflow.
 * Detects values damaged by Sheets formula interpretation (e.g. +91-044-28296490 → -28296443).
 */

/** Phone numbers are never negative; negative values are formula-evaluation artifacts */
function isLikelyCorrupted(val) {
  if (val == null || val === '') return false;
  const s = String(val).trim();
  if (s.toUpperCase() === '#ERROR!') return true;
  const num = Number(s);
  if (!Number.isNaN(num) && num < 0) return true;
  return false;
}

/**
 * Basic sanity check: does this look like a phone number?
 * Accepts international format: optional +, digits, spaces, dashes, parens, dots.
 */
function looksLikePhone(val) {
  if (val == null || val === '') return false;
  const s = String(val).trim();
  const digitsOnly = s.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

module.exports = { isLikelyCorrupted, looksLikePhone };
