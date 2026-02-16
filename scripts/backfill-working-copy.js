#!/usr/bin/env node
/**
 * One-time backfill: Copy Production tab → Working Copy tab.
 * Run: node scripts/backfill-working-copy.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Production'!A:N",
  });
  const values = res.data.values || [];
  if (values.length === 0) {
    console.log('Production is empty, nothing to copy.');
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'Working Copy'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  console.log(`✅ Backfilled Working Copy with ${values.length} rows from Production`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
