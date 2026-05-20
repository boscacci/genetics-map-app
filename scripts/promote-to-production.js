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
const {
  isLikelyCorrupted: isPhoneCorrupted,
  normalizePhoneText,
} = require('./lib/phone-validate');
const {
  PRODUCTION_HEADERS,
  PRODUCTION_SHEET_RANGE_A1,
  WORKING_COPY_SHEET_RANGE_A1,
} = require('./lib/sheet-schema');
const {
  findMissingRequiredFields,
  formatMissingRequiredFields,
} = require('./lib/promotion-validation');
const { applyPhoneColumnPlainTextFormat } = require('./lib/sheet-formatting');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

const NAME_FIRST_COL = 0;
const NAME_LAST_COL = 1;
const EMAIL_COL = 3;
const PHONE_COL = 5;

/** Build email -> phone map from Production tab for recovering #ERROR! cells. Sheet is source of truth. */
async function loadPhoneFallback(sheets, spreadsheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'Production'!${PRODUCTION_SHEET_RANGE_A1}`,
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

  await applyPhoneColumnPlainTextFormat(sheets, spreadsheetId);
  const phoneFallback = await loadPhoneFallback(sheets, spreadsheetId);

  console.log('Reading Working Copy...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Working Copy'!${WORKING_COPY_SHEET_RANGE_A1}`,
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
  const dataRows = rows.slice(1);
  const missingRequired = findMissingRequiredFields(dataRows, sourceIdxByHeader, ['job_title']);
  if (missingRequired.length > 0) {
    console.error(`❌ Cannot promote Working Copy:\n${formatMissingRequiredFields(missingRequired)}`);
    process.exit(1);
  }

  const headerRow = [...PRODUCTION_HEADERS];

  const cleaned = dataRows.map((row) => {
    const padded = PRODUCTION_HEADERS.map((header) => {
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
    phone = normalizePhoneText(phone);

    const newRow = [...padded];
    newRow[NAME_FIRST_COL] = name_first;
    newRow[NAME_LAST_COL] = name_last;
    newRow[PHONE_COL] = phone;
    return newRow;
  });

  const values = [headerRow, ...cleaned];

  console.log('Writing to Production...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'Production'!${WORKING_COPY_SHEET_RANGE_A1}`,
    requestBody: {},
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'Production'!A1",
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  console.log(`✅ Promoted ${cleaned.length} rows from Working Copy to Production (with name cleanup)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
