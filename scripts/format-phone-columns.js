#!/usr/bin/env node
/**
 * Format Google Sheet controls:
 * - phone_work as Plain text in Working Copy and Production
 * - signed_up_for_newsletter as a boolean checkbox in Working Copy
 * - job_title as plain free text, with accidental checkbox validation removed
 * This lets admins type international numbers like +1 404 555 1212 directly.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { applySheetColumnFormatting } = require('./lib/sheet-formatting');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(SHEET_ID_PATH)) {
    console.error('Need .gcp-credentials/genetics-map-sa-key.json and sheet-id.txt');
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
  console.log('Sheet controls formatted: phone_work as Plain text, newsletter signup as boolean, job_title as text.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
