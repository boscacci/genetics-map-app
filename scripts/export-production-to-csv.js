#!/usr/bin/env node
/**
 * Export Production tab from Google Sheet to CSV (optional, for manual inspection).
 * NOT used in the sync workflow—deploy reads directly from Sheet via clean_and_validate.py.
 *
 * Reads Production → writes data/data.csv
 * Run: node scripts/export-production-to-csv.js (or npm run export:production)
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');
const CSV_OUTPUT_PATH = path.resolve(__dirname, '../data/data.csv');

// Exclude credential_link (admin-only) from export
const PUBLIC_HEADERS = [
  'name_first', 'name_last', 'email', 'phone_work', 'work_website', 'work_institution',
  'work_address', 'language_spoken', 'uses_interpreters', 'specialties',
  'Latitude', 'Longitude', 'City', 'Country'
];

async function main() {
  let credentials;
  let spreadsheetId;

  if (process.env.GCP_SA_KEY && process.env.SHEET_ID) {
    credentials = JSON.parse(process.env.GCP_SA_KEY);
    spreadsheetId = process.env.SHEET_ID.trim();
  } else if (fs.existsSync(CREDENTIALS_PATH) && fs.existsSync(SHEET_ID_PATH)) {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    spreadsheetId = fs.readFileSync(SHEET_ID_PATH, 'utf8').trim();
  } else {
    console.error('❌ Need GCP_SA_KEY + SHEET_ID env vars, or .gcp-credentials/ files');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Production'!A:O",
  });
  const rows = res.data.values || [];

  if (rows.length < 2) {
    console.error('❌ Production has no data rows');
    process.exit(1);
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  const data = dataRows.map((row) => {
    const obj = {};
    PUBLIC_HEADERS.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });

  const csv = Papa.unparse(data, { header: true, columns: PUBLIC_HEADERS });

  fs.mkdirSync(path.dirname(CSV_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(CSV_OUTPUT_PATH, csv, 'utf8');
  console.log(`✅ Exported ${data.length} rows from Production to ${CSV_OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
