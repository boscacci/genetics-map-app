#!/usr/bin/env node
/**
 * Backup Production tab to time-staggered backup sheets (safeguard).
 * Keeps MAX 3 backup copies: "Backup (2 days ago)", "Backup (1 week ago)", "Backup (3 weeks ago)".
 * Each is updated at its interval (2d, 7d, 21d) so they represent the sheet state at those ages.
 * Data types preserved (RAW valueInputOption).
 *
 * Run: node scripts/backup-production.js
 * Called by sync-and-deploy workflow after promote.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

const BACKUP_METADATA_SHEET = '_Backup_Metadata';
const BACKUPS = [
  { key: '2d', title: 'Backup (2 days ago)', intervalMs: 2 * 24 * 60 * 60 * 1000 },
  { key: '1w', title: 'Backup (1 week ago)', intervalMs: 7 * 24 * 60 * 60 * 1000 },
  { key: '3w', title: 'Backup (3 weeks ago)', intervalMs: 21 * 24 * 60 * 60 * 1000 },
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const now = Date.now();
  const allowedBackupTitles = new Set(BACKUPS.map(b => b.title));

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets || [];

  // Remove any backup sheets not in our allowed 3
  const deleteRequests = [];
  for (const s of existingSheets) {
    const title = s.properties?.title || '';
    if (title.startsWith('Backup') && !allowedBackupTitles.has(title)) {
      deleteRequests.push({ deleteSheet: { sheetId: s.properties.sheetId } });
    }
  }
  if (deleteRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: deleteRequests },
    });
  }

  // Ensure _Backup_Metadata sheet exists and read last update times
  const metaSheet = existingSheets.find(s => s.properties?.title === BACKUP_METADATA_SHEET);

  let lastUpdates = { '2d': 0, '1w': 0, '3w': 0 };
  if (metaSheet) {
    try {
      const metaRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${BACKUP_METADATA_SHEET}'!A1:C1`,
      });
      const row = metaRes.data.values?.[0] || [];
      if (row[0]) lastUpdates['2d'] = parseInt(row[0], 10) || 0;
      if (row[1]) lastUpdates['1w'] = parseInt(row[1], 10) || 0;
      if (row[2]) lastUpdates['3w'] = parseInt(row[2], 10) || 0;
    } catch (_) {}
  } else {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: BACKUP_METADATA_SHEET, hidden: true } } }],
      },
    });
  }

  // Read Production
  const prodRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Production'!A:N",
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const prodValues = prodRes.data.values || [];
  if (prodValues.length === 0) {
    console.log('Production is empty, skipping backup.');
    return;
  }

  const updates = [];

  for (const backup of BACKUPS) {
    const elapsed = now - lastUpdates[backup.key];
    if (elapsed >= backup.intervalMs || lastUpdates[backup.key] === 0) {
      // Create backup sheet if needed
      const backupSheet = existingSheets.find(s => s.properties?.title === backup.title);
      if (!backupSheet) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: backup.title } } }],
          },
        });
        // Refresh sheet list for range
      }

      const range = `'${backup.title}'!A:N`;
      await sheets.spreadsheets.values.clear({ spreadsheetId, range }).catch(() => {});
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${backup.title}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: prodValues },
      });

      lastUpdates[backup.key] = now;
      updates.push(backup.title);
    }
  }

  // Write updated metadata
  const metaRange = `'${BACKUP_METADATA_SHEET}'!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: metaRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[String(lastUpdates['2d']), String(lastUpdates['1w']), String(lastUpdates['3w'])]],
    },
  });

  if (updates.length > 0) {
    console.log(`✅ Backed up Production to: ${updates.join(', ')}`);
  } else {
    console.log('Backup intervals not yet reached (no updates).');
  }
}

main().catch(err => {
  console.error('Backup error:', err.message);
  process.exit(1);
});
