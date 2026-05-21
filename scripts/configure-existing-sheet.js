#!/usr/bin/env node
/**
 * Configure an existing Google Sheet with Working Copy + Production tabs.
 * Use when setup-google-sheet.js cannot create (service account lacks create permission).
 *
 * Prerequisites:
 * 1. Create a new Google Sheet at https://sheets.google.com
 * 2. Share it with genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com as Editor
 * 3. Copy the Sheet ID from the URL: docs.google.com/spreadsheets/d/SHEET_ID/edit
 * 4. Run: node scripts/configure-existing-sheet.js SHEET_ID
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const Papa = require('papaparse');
const {
  PRODUCTION_HEADER_ROW_RANGE_A1,
  PRODUCTION_HEADERS,
  WORKING_COPY_HEADER_ROW_RANGE_A1,
  WORKING_COPY_HEADERS,
} = require('./lib/sheet-schema');
const { applySheetColumnFormatting } = require('./lib/sheet-formatting');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');

async function main() {
  const spreadsheetId = process.argv[2];
  if (!spreadsheetId) {
    console.error('Usage: node scripts/configure-existing-sheet.js <SHEET_ID>');
    console.error('');
    console.error('1. Create a new Sheet at https://sheets.google.com');
    console.error('2. Share with genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com (Editor)');
    console.error('3. Get ID from URL: .../d/SHEET_ID/edit');
    process.exit(1);
  }

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ Service account key not found at', CREDENTIALS_PATH);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Fetching existing spreadsheet...');
  const getRes = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetList = getRes.data.sheets || [];
  const defaultSheet = sheetList[0];
  const defaultSheetId = defaultSheet?.properties?.sheetId;

  console.log('Configuring tabs...');
  const requests = [
    { updateSheetProperties: { properties: { sheetId: defaultSheetId, title: 'Working Copy' }, fields: 'title' } },
    { addSheet: { properties: { title: 'Production' } } },
  ];
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'Working Copy'!${WORKING_COPY_HEADER_ROW_RANGE_A1}`, values: [WORKING_COPY_HEADERS] },
        { range: `'Production'!${PRODUCTION_HEADER_ROW_RANGE_A1}`, values: [PRODUCTION_HEADERS] },
      ],
    },
  });
  console.log('   Added Working Copy and Production tabs with column headers');
  await applySheetColumnFormatting(sheets, spreadsheetId);
  console.log('   Formatted sheet controls');

  const csvPath = path.resolve(__dirname, '../data/data.csv');
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const { data } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    if (data.length > 0) {
      const values = [PRODUCTION_HEADERS];
      data.forEach(row => {
        values.push(PRODUCTION_HEADERS.map(h => String(row[h] ?? '')));
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "'Production'!A1",
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      console.log('   Populated Production with', data.length, 'rows from data/data.csv');
      // Backfill Working Copy so admins have same data to start from
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "'Working Copy'!A1",
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            WORKING_COPY_HEADERS,
            ...data.map(row => WORKING_COPY_HEADERS.map(h => String(row[h] ?? ''))),
          ],
        },
      });
      console.log('   Backfilled Working Copy with same data');
    }
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt'),
    spreadsheetId,
    'utf8'
  );
  console.log('✅ Sheet configured:', `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(err.response.data);
  process.exit(1);
});
