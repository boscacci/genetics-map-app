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
const { WORKING_COPY_HEADERS, WORKING_COPY_SHEET_RANGE_A1 } = require('./lib/sheet-schema');
const { isBlankRequiredValue } = require('./lib/promotion-validation');
const { buildHeaderIndex } = require('./promote-to-production');

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

  console.log('Checking Working Copy structure...');
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
  const missingHeaders = WORKING_COPY_HEADERS.filter((header) => sourceIdxByHeader[header] === undefined);

  if (missingHeaders.length > 0) {
    console.error(`❌ Working Copy is missing expected columns: ${missingHeaders.join(', ')}`);
    process.exit(1);
  }

  const jobTitleIndex = sourceIdxByHeader.job_title;
  const missingJobTitles = jobTitleIndex === undefined
    ? 0
    : dataRows.filter((row) => isBlankRequiredValue(row[jobTitleIndex])).length;

  if (missingJobTitles > 0) {
    console.warn(`⚠️ job_title is blank in ${missingJobTitles} Working Copy rows. This does not block promotion or deploy.`);
  }

  console.log(`✅ Working Copy structure preflight passed (${dataRows.length} rows checked)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
