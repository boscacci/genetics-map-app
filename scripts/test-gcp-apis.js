#!/usr/bin/env node
/**
 * Test Phase 1: Verify Google Sheets API and Geocoding API are working.
 * Run: node scripts/test-gcp-apis.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');
const GEO_KEY_PATH = path.resolve(__dirname, '../.gcp-credentials/geocoding-api-key.txt');

async function testGeocoding() {
  if (!fs.existsSync(GEO_KEY_PATH)) {
    return { ok: false, error: 'Geocoding API key not found at .gcp-credentials/geocoding-api-key.txt' };
  }
  const key = fs.readFileSync(GEO_KEY_PATH, 'utf8').trim();
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${key}`
  );
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) {
    return { ok: false, error: data.error_message || data.status || 'No results' };
  }
  const loc = data.results[0].geometry.location;
  return { ok: true, lat: loc.lat, lng: loc.lng };
}

async function testSheets() {
  if (!fs.existsSync(SHEET_ID_PATH)) {
    return {
      ok: false,
      error: 'Sheet ID not found. Create a sheet, share with genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com, run configure-existing-sheet.js',
    };
  }
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return { ok: false, error: 'Service account key not found' };
  }
  const spreadsheetId = fs.readFileSync(SHEET_ID_PATH, 'utf8').trim();
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Production'!A1:N5",
  });
  const rows = res.data.values || [];
  const hasHeaders = rows.length >= 1 && rows[0]?.[0];
  return { ok: true, rowCount: rows.length, hasHeaders };
}

async function main() {
  console.log('Testing GCP APIs (Phase 1)...\n');

  console.log('1. Geocoding API:');
  try {
    const geo = await testGeocoding();
    if (geo.ok) {
      console.log('   ✅ OK - Sample address geocoded to', geo.lat, geo.lng);
    } else {
      console.log('   ❌', geo.error);
    }
  } catch (e) {
    console.log('   ❌', e.message);
  }

  console.log('\n2. Google Sheets API:');
  try {
    const sheet = await testSheets();
    if (sheet.ok) {
      console.log('   ✅ OK - Read', sheet.rowCount, 'rows from Production tab');
    } else {
      console.log('   ❌', sheet.error);
    }
  } catch (e) {
    console.log('   ❌', e.message);
  }

  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
