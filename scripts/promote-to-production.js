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
  isBlankRequiredValue,
} = require('./lib/promotion-validation');
const { applySheetColumnFormatting } = require('./lib/sheet-formatting');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

const NAME_FIRST_COL = 0;
const NAME_LAST_COL = 1;
const EMAIL_COL = 3;
const PHONE_COL = 5;

function buildHeaderIndex(headerRow) {
  const idxByHeader = {};
  for (let idx = 0; idx < headerRow.length; idx++) {
    const header = String(headerRow[idx] || '').trim();
    if (header) idxByHeader[header] = idx;
  }
  return idxByHeader;
}

function normalizeKeyPart(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function providerRecordKeys(row, idxByHeader) {
  const keys = [];
  const credentialIdx = idxByHeader.credential_link;
  const credentialLink = credentialIdx !== undefined ? normalizeKeyPart(row[credentialIdx]) : '';
  if (credentialLink) keys.push(`credential:${credentialLink}`);

  const emailIdx = idxByHeader.email;
  const email = emailIdx !== undefined ? normalizeKeyPart(row[emailIdx]) : '';
  if (email) keys.push(`email:${email}`);

  const parts = ['name_first', 'name_last', 'work_institution'].map((header) => {
    const idx = idxByHeader[header];
    return idx !== undefined ? normalizeKeyPart(row[idx]) : '';
  });
  const fallback = parts.join('|');
  if (fallback.replace(/\|/g, '')) keys.push(`fallback:${fallback}`);
  return keys;
}

function hasLegacyMissingJobTitle(row, idxByHeader, legacyMissingJobTitleKeys) {
  return providerRecordKeys(row, idxByHeader).some((key) => legacyMissingJobTitleKeys.has(key));
}

/** Build Production context for recovering phones and allowing legacy blank job titles. */
async function loadProductionContext(sheets, spreadsheetId) {
  const context = {
    legacyMissingJobTitleKeys: new Set(),
    phoneFallback: new Map(),
  };

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'Production'!${PRODUCTION_SHEET_RANGE_A1}`,
    });
    const rows = res.data.values || [];
    const headerRow = rows[0] || [];
    const idxByHeader = buildHeaderIndex(headerRow);
    const emailIdx = idxByHeader.email;
    const phoneIdx = idxByHeader.phone_work;
    const jobTitleIdx = idxByHeader.job_title;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const email = (row[emailIdx >= 0 ? emailIdx : EMAIL_COL] || '').toString().trim().toLowerCase();
      const phone = (row[phoneIdx >= 0 ? phoneIdx : PHONE_COL] || '').toString().trim();
      if (email && phone && phone.toUpperCase() !== '#ERROR!') context.phoneFallback.set(email, phone);

      if (jobTitleIdx === undefined || isBlankRequiredValue(row[jobTitleIdx])) {
        for (const key of providerRecordKeys(row, idxByHeader)) {
          context.legacyMissingJobTitleKeys.add(key);
        }
      }
    }
  } catch (err) {
    console.warn('Could not load Production context:', err.message);
  }

  return context;
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

  await applySheetColumnFormatting(sheets, spreadsheetId);
  const { legacyMissingJobTitleKeys, phoneFallback } = await loadProductionContext(sheets, spreadsheetId);

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
  const sourceIdxByHeader = buildHeaderIndex(sourceHeader);
  const dataRows = rows.slice(1);
  const missingRequired = findMissingRequiredFields(dataRows, sourceIdxByHeader, ['job_title'], {
    isRowExempt: ({ row, header }) => (
      header === 'job_title' && hasLegacyMissingJobTitle(row, sourceIdxByHeader, legacyMissingJobTitleKeys)
    ),
  });
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
