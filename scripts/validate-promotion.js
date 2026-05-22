#!/usr/bin/env node
/**
 * Read-only gate for Working Copy -> Production promotion.
 *
 * This catches required-field problems before workflow steps that write back to
 * Google Sheets, such as geocoding or promotion.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { WORKING_COPY_SHEET_RANGE_A1 } = require('./lib/sheet-schema');
const {
  findMissingRequiredFields,
  formatMissingRequiredFields,
} = require('./lib/promotion-validation');
const {
  buildHeaderIndex,
  hasLegacyMissingJobTitle,
  loadProductionContext,
} = require('./promote-to-production');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(SHEET_ID_PATH)) {
    console.error('❌ Need .gcp-credentials/genetics-map-sa-key.json and sheet-id.txt');
    process.exit(1);
  }

  const spreadsheetId = fs.readFileSync(SHEET_ID_PATH, 'utf8').trim();
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const { legacyMissingJobTitleKeys } = await loadProductionContext(sheets, spreadsheetId);

  console.log('Checking Working Copy promotion requirements...');
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
    console.error(`❌ Working Copy is not ready to promote:\n${formatMissingRequiredFields(missingRequired)}`);
    process.exit(1);
  }

  console.log(`✅ Working Copy promotion preflight passed (${dataRows.length} rows checked)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
