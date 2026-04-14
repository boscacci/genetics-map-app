#!/usr/bin/env node
/**
 * Promote Working Copy → Production with name cleanup.
 * Part of the workflow: admins edit Working Copy, run this to copy cleaned data to Production.
 *
 * Run: node scripts/promote-to-production.js
 * Or: npm run promote
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { cleanFullName } = require('./lib/name-cleanup');
const { sanitizeForSheets } = require('./lib/sheet-sanitize');
const { isLikelyCorrupted: isPhoneCorrupted } = require('./lib/phone-validate');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

const EXPECTED_HEADERS = [
  'name_first', 'name_last', 'hide_name',
  'email', 'hide_email',
  'phone_work', 'hide_phone',
  'work_website', 'work_institution', 'work_address', 'hide_institution_address',
  'language_spoken', 'uses_interpreters', 'specialties',
  'Latitude', 'Longitude', 'City', 'Country',
  'credential_link',
  'address_street', 'address_state', 'address_zip',
];

const NAME_FIRST_COL = 0;
const NAME_LAST_COL = 1;
const EMAIL_COL = 3;
const PHONE_COL = 5;

/** Build email -> phone map from Production tab for recovering #ERROR! cells. Sheet is source of truth. */
async function loadPhoneFallback(sheets, spreadsheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Production'!A:V",
    });
    const rows = res.data.values || [];
    const headerRow = rows[0] || [];
    const emailIdx = headerRow.indexOf('email');
    const phoneIdx = headerRow.indexOf('phone_work');
    const map = new Map();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const email = (row[emailIdx >= 0 ? emailIdx : EMAIL_COL] || '').toString().trim().toLowerCase();
      const phone = (row[phoneIdx >= 0 ? phoneIdx : PHONE_COL] || '').toString().trim();
      if (email && phone && phone.toUpperCase() !== '#ERROR!') map.set(email, phone);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(SHEET_ID_PATH)) {
    console.error('❌ Need .gcp-credentials/genetics-map-sa-key.json and sheet-id.txt');
    process.exit(1);
  }

  const spreadsheetId = fs.readFileSync(SHEET_ID_PATH, 'utf8').trim();
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const phoneFallback = await loadPhoneFallback(sheets, spreadsheetId);

  console.log('Reading Working Copy...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Working Copy'!A:V",
  });
  const rows = res.data.values || [];

  if (rows.length < 2) {
    console.error('❌ Working Copy has no data rows (header + at least 1 row)');
    process.exit(1);
  }

  const sourceHeader = rows[0] || [];
  const sourceIdxByHeader = {};
  sourceHeader.forEach((h, idx) => {
    sourceIdxByHeader[String(h || '').trim()] = idx;
  });
  const headerRow = [...EXPECTED_HEADERS];
  const dataRows = rows.slice(1);

  const EXPECTED_COLS = EXPECTED_HEADERS.length;

  const cleaned = dataRows.map((row) => {
    const padded = EXPECTED_HEADERS.map((header) => {
      const srcIdx = sourceIdxByHeader[header];
      return srcIdx !== undefined ? (row[srcIdx] ?? '') : '';
    });
    const nameFirst = padded[NAME_FIRST_COL] ?? '';
    const nameLast = padded[NAME_LAST_COL] ?? '';
    const { name_first, name_last } = cleanFullName(nameFirst, nameLast);

    let phone = (padded[PHONE_COL] ?? '').toString().trim();
    if (isPhoneCorrupted(phone)) {
      const email = (padded[EMAIL_COL] ?? '').toString().trim().toLowerCase();
      phone = phoneFallback.get(email) || '';
    }
    phone = sanitizeForSheets(phone);

    const newRow = [...padded];
    newRow[NAME_FIRST_COL] = name_first;
    newRow[NAME_LAST_COL] = name_last;
    newRow[PHONE_COL] = phone;
    return newRow;
  });

  const values = [headerRow, ...cleaned];

  console.log('Writing to Production...');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'Production'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  console.log(`✅ Promoted ${cleaned.length} rows from Working Copy to Production (with name cleanup)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
