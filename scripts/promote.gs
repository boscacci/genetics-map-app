/**
 * Promote Working Copy → Production (Google Apps Script macro).
 * Copy this into your Genetics Map sheet: Extensions → Apps Script.
 * Creates a custom menu "Genetics Map" → "Promote to Production".
 *
 * Applies name cleanup (title-case, Dr. normalization, nan → Anonymous Contributor),
 * phone corruption fix (using Production as fallback), and formula sanitization.
 */

const PLACEHOLDER_NAMES = ['nan', 'n/a', 'na', 'null', 'undefined', '-', '--', ''];
const FORMULA_PREFIXES = ['=', '+', '-', '@'];
const NAME_FIRST_COL = 0;
const NAME_LAST_COL = 1;
const EMAIL_COL = 2;
const PHONE_COL = 3;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Genetics Map')
    .addItem('Promote to Production', 'promoteWorkingCopyToProduction')
    .addToUi();
}

function promoteWorkingCopyToProduction() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const workingCopy = ss.getSheetByName('Working Copy');
  const production = ss.getSheetByName('Production');

  if (!workingCopy || !production) {
    SpreadsheetApp.getUi().alert('Need both "Working Copy" and "Production" sheets.');
    return;
  }

  const wcData = workingCopy.getDataRange().getValues();
  if (wcData.length < 2) {
    SpreadsheetApp.getUi().alert('Working Copy has no data rows.');
    return;
  }

  // Build email -> phone map from Production (fallback for corrupted phones)
  const phoneFallback = new Map();
  const prodData = production.getDataRange().getValues();
  if (prodData.length >= 2) {
    const headerRow = prodData[0];
    const emailIdx = headerRow.findIndex(h => String(h).toLowerCase().includes('email'));
    const phoneIdx = headerRow.findIndex(h => String(h).toLowerCase().includes('phone'));
    if (emailIdx >= 0 && phoneIdx >= 0) {
      for (let r = 1; r < prodData.length; r++) {
        const row = prodData[r];
        const email = String(row[emailIdx] || '').trim().toLowerCase();
        const phone = String(row[phoneIdx] || '').trim();
        if (email && phone && phone.toUpperCase() !== '#ERROR!') {
          phoneFallback.set(email, phone);
        }
      }
    }
  }
  // Fallback to column indices if header lookup fails
  if (phoneFallback.size === 0 && prodData.length >= 2) {
    for (let r = 1; r < prodData.length; r++) {
      const row = prodData[r];
      const email = String(row[EMAIL_COL] || '').trim().toLowerCase();
      const phone = String(row[PHONE_COL] || '').trim();
      if (email && phone && phone.toUpperCase() !== '#ERROR!') {
        phoneFallback.set(email, phone);
      }
    }
  }

  const headerRow = wcData[0];
  const dataRows = wcData.slice(1);

  const cleaned = dataRows.map(row => {
    const newRow = row.map(c => c);
    const nameFirst = String(row[NAME_FIRST_COL] || '').trim();
    const nameLast = String(row[NAME_LAST_COL] || '').trim();
    const { name_first, name_last } = cleanFullName(nameFirst, nameLast);

    let phone = String(row[PHONE_COL] || '').trim();
    if (isLikelyCorrupted(phone)) {
      const email = String(row[EMAIL_COL] || '').trim().toLowerCase();
      phone = phoneFallback.get(email) || '';
    }
    phone = sanitizeForSheets(phone);

    newRow[NAME_FIRST_COL] = name_first;
    newRow[NAME_LAST_COL] = name_last;
    newRow[PHONE_COL] = phone;

    return newRow;
  });

  const values = [headerRow, ...cleaned];
  production.getRange(1, 1, values.length, values[0].length).setValues(values);

  SpreadsheetApp.getUi().alert(`Promoted ${cleaned.length} rows from Working Copy to Production.`);
}

function cleanFullName(nameFirst, nameLast) {
  const first = cleanName(nameFirst);
  const last = cleanName(nameLast);
  if (!first && !last) return { name_first: 'Anonymous Contributor', name_last: '' };
  if (!first) return { name_first: 'Anonymous Contributor', name_last: '' };
  return { name_first: first, name_last: last || '' };
}

function cleanName(val) {
  if (val == null) return '';
  let s = String(val).trim();
  if (PLACEHOLDER_NAMES.includes(s.toLowerCase()) || s === '') return '';
  s = normalizeTitlePrefix(s);
  return titleCase(s);
}

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

function titleCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.trim().split(/\s+/).map(word => {
    if (word.length === 0) return word;
    if (word.includes('-')) {
      return word.split('-').map(part => titleCaseOne(part)).join('-');
    }
    return titleCaseOne(word);
  }).join(' ');
}

function titleCaseOne(word) {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function isLikelyCorrupted(val) {
  if (val == null || val === '') return false;
  const s = String(val).trim();
  if (s.toUpperCase() === '#ERROR!') return true;
  const num = Number(s);
  if (!isNaN(num) && num < 0) return true;
  return false;
}

function sanitizeForSheets(val) {
  if (val == null || val === '') return val;
  const s = String(val).trim();
  if (s === '' || s.toUpperCase() === '#ERROR!') return '';
  const first = s.charAt(0);
  if (FORMULA_PREFIXES.includes(first)) return "'" + s;
  return s;
}
