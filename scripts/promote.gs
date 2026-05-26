/**
 * Promote Working Copy → Production (Google Apps Script macro).
 * Copy this into your Genetics Map sheet: Extensions → Apps Script.
 * Creates a custom menu "Genetics Map" → "Promote to Production".
 *
 * Applies name cleanup (title-case, Dr. normalization, nan → Anonymous Contributor),
 * phone corruption fix (using Production as fallback), and formula sanitization.
 */

const PLACEHOLDER_NAMES = ['nan', 'n/a', 'na', 'null', 'undefined', '-', '--', ''];
const NAME_FIRST_COL = 0;
const NAME_LAST_COL = 1;
const EMAIL_COL = 3;
const PHONE_COL = 5;
const PRODUCTION_HEADERS = [
  'name_first', 'name_last', 'hide_name',
  'email', 'hide_email',
  'phone_work', 'hide_phone',
  'work_website', 'work_institution', 'hide_workinstitution', 'job_title', 'work_address', 'hide_institution_address',
  'language_spoken', 'uses_interpreters', 'specialties',
  'Latitude', 'Longitude', 'City', 'Country',
  'credential_link',
  'address_street', 'address_state', 'address_zip',
];

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
  formatSheetControls(workingCopy, production);

  const wcData = workingCopy.getDataRange().getValues();
  if (wcData.length < 2) {
    SpreadsheetApp.getUi().alert('Working Copy has no data rows.');
    return;
  }

  // Build Production context for phone fallback.
  const prodData = production.getDataRange().getValues();
  const productionContext = buildProductionContext(prodData);
  const phoneFallback = productionContext.phoneFallback;

  const headerRow = wcData[0];
  const sourceIdxByHeader = buildHeaderIndex(headerRow);
  const dataRows = wcData.slice(1);

  const cleaned = dataRows.map(row => {
    const newRow = PRODUCTION_HEADERS.map(header => {
      const srcIdx = sourceIdxByHeader[header];
      return srcIdx !== undefined ? (row[srcIdx] || '') : '';
    });
    const nameFirst = String(newRow[NAME_FIRST_COL] || '').trim();
    const nameLast = String(newRow[NAME_LAST_COL] || '').trim();
    const { name_first, name_last } = cleanFullName(nameFirst, nameLast);

    let phone = String(newRow[PHONE_COL] || '').trim();
    if (isLikelyCorrupted(phone)) {
      const email = String(newRow[EMAIL_COL] || '').trim().toLowerCase();
      phone = phoneFallback.get(email) || '';
    }
    phone = normalizePhoneText(phone);

    newRow[NAME_FIRST_COL] = name_first;
    newRow[NAME_LAST_COL] = name_last;
    newRow[PHONE_COL] = phone;

    return newRow;
  });

  const values = [PRODUCTION_HEADERS, ...cleaned];
  production.clearContents();
  production.getRange(1, 1, values.length, values[0].length).setValues(values);

  SpreadsheetApp.getUi().alert(`Promoted ${cleaned.length} rows from Working Copy to Production.`);
}

function buildHeaderIndex(headerRow) {
  const idxByHeader = {};
  headerRow.forEach((header, idx) => {
    idxByHeader[String(header || '').trim()] = idx;
  });
  return idxByHeader;
}

function buildProductionContext(prodData) {
  const context = {
    phoneFallback: new Map(),
  };

  if (prodData.length < 2) return context;

  const headerRow = prodData[0];
  const idxByHeader = buildHeaderIndex(headerRow);
  const emailIdx = idxByHeader.email;
  const phoneIdx = idxByHeader.phone_work;

  for (let r = 1; r < prodData.length; r++) {
    const row = prodData[r];
    const email = String(emailIdx !== undefined ? row[emailIdx] : '').trim().toLowerCase();
    const phone = String(phoneIdx !== undefined ? row[phoneIdx] : '').trim();
    if (email && phone && phone.toUpperCase() !== '#ERROR!') {
      context.phoneFallback.set(email, phone);
    }
  }

  // Fallback to column indices if header lookup fails.
  if (context.phoneFallback.size === 0) {
    for (let r = 1; r < prodData.length; r++) {
      const row = prodData[r];
      const email = String(row[EMAIL_COL] || '').trim().toLowerCase();
      const phone = String(row[PHONE_COL] || '').trim();
      if (email && phone && phone.toUpperCase() !== '#ERROR!') {
        context.phoneFallback.set(email, phone);
      }
    }
  }

  return context;
}

function formatSheetControls(workingCopy, production) {
  [workingCopy, production].forEach(function(sheet) {
    getColumnBodyRange(sheet, 'phone_work').setNumberFormat('@');
    setBooleanTextValidation(getColumnBodyRange(sheet, 'hide_workinstitution'));
    setBooleanTextValidation(getColumnBodyRange(sheet, 'hide_institution_address'));
    setBooleanTextValidation(getColumnBodyRange(sheet, 'uses_interpreters'));
    getColumnBodyRange(sheet, 'job_title').clearDataValidations();
  });

  setBooleanTextValidation(getColumnBodyRange(workingCopy, 'signed_up_for_newsletter'));
}

function setBooleanTextValidation(range) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  range.setDataValidation(rule);
}

function getColumnBodyRange(sheet, header) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.findIndex(function(value) {
    return String(value || '').trim() === header;
  });
  if (index === -1) {
    throw new Error('Missing required sheet column: ' + header);
  }
  const rowCount = Math.max(sheet.getMaxRows() - 1, 1);
  return sheet.getRange(2, index + 1, rowCount, 1);
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

function normalizePhoneText(val) {
  if (val == null || val === '') return '';
  let s = String(val).trim();
  if (/^'[=+\-@]/.test(s)) s = s.slice(1);
  if (s === '' || s.toUpperCase() === '#ERROR!') return '';
  return s.replace(/\s+/g, ' ');
}
