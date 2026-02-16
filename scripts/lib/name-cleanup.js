/**
 * Name cleanup for provider data (name_first, name_last).
 * Used when promoting Working Copy → Production.
 */

/** Values that indicate missing/placeholder name */
const PLACEHOLDER_NAMES = new Set(['nan', 'n/a', 'na', 'null', 'undefined', '-', '--', '']);

/**
 * Normalize title prefixes: "Dr " → "Dr.", "Mr " → "Mr.", etc.
 */
function normalizeTitlePrefix(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/\bDr\s+/gi, 'Dr. ')
    .replace(/\bMr\s+/gi, 'Mr. ')
    .replace(/\bMrs\s+/gi, 'Mrs. ')
    .replace(/\bMs\s+/gi, 'Ms. ')
    .replace(/\bProf\s+/gi, 'Prof. ')
    .replace(/\bSr\s+/gi, 'Sr. ')
    .replace(/\bJr\s+/gi, 'Jr. ');
}

/**
 * Title-case a string: first letter of each word uppercase, rest lowercase.
 * Preserves existing punctuation and hyphenated names (e.g., "Cameron-Mackintosh").
 */
function titleCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      if (word.includes('-')) {
        return word.split('-').map(part => titleCaseOne(part)).join('-');
      }
      return titleCaseOne(word);
    })
    .join(' ');
}

function titleCaseOne(word) {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Check if a value is a placeholder (nan, n/a, etc.)
 */
function isPlaceholder(val) {
  if (val == null) return true;
  const s = String(val).trim().toLowerCase();
  return s === '' || PLACEHOLDER_NAMES.has(s);
}

/**
 * Clean a single name field (first or last).
 */
function cleanName(val) {
  if (val == null) return '';
  let s = String(val).trim();
  if (isPlaceholder(s)) return '';
  s = normalizeTitlePrefix(s);
  s = titleCase(s);
  return s;
}

/**
 * Clean name_first and name_last. Handles "nan nan" etc. by returning
 * { name_first: 'Anonymous Contributor', name_last: '' } when both are placeholders.
 */
function cleanFullName(nameFirst, nameLast) {
  const first = cleanName(nameFirst);
  const last = cleanName(nameLast);

  if (!first && !last) {
    return { name_first: 'Anonymous Contributor', name_last: '' };
  }
  if (!first) {
    return { name_first: 'Anonymous Contributor', name_last: '' };
  }
  return { name_first: first, name_last: last || '' };
}

module.exports = {
  cleanName,
  cleanFullName,
  normalizeTitlePrefix,
  titleCase,
  isPlaceholder,
};
