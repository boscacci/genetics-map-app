#!/usr/bin/env node
/**
 * Backup Production tab to separate Google Sheet files in a Drive folder.
 * Keeps 3 copies: "Genetics Map Backup (2 days ago)", "(1 week ago)", "(3 weeks ago)".
 * Each is updated at its interval (2d, 7d, 21d).
 *
 * Requires: BACKUP_FOLDER_ID ( Drive folder; share with service account as Editor )
 * One-time: Create 3 blank sheets in the folder with these exact names; share folder with service account.
 *
 * Run: node scripts/backup-production.js
 * Called by sync-and-deploy workflow after promote.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const SHEET_ID_PATH = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');

const BACKUPS = [
  { key: '2d', name: 'Genetics Map Backup (2 days ago)', intervalMs: 2 * 24 * 60 * 60 * 1000 },
  { key: '1w', name: 'Genetics Map Backup (1 week ago)', intervalMs: 7 * 24 * 60 * 60 * 1000 },
  { key: '3w', name: 'Genetics Map Backup (3 weeks ago)', intervalMs: 21 * 24 * 60 * 60 * 1000 },
];

async function main() {
  let credentials;
  let spreadsheetId;
  let backupFolderId;

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

  backupFolderId = process.env.BACKUP_FOLDER_ID?.trim();
  if (!backupFolderId) {
    console.log('BACKUP_FOLDER_ID not set, skipping backup.');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Read Production from main sheet
  const prodRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Production'!A:O",
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const prodValues = prodRes.data.values || [];
  if (prodValues.length === 0) {
    console.log('Production is empty, skipping backup.');
    return;
  }

  const now = Date.now();
  const allowedNames = new Set(BACKUPS.map((b) => b.name));
  const updates = [];

  // List existing backup files in folder
  const listRes = await drive.files.list({
    q: `'${backupFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
  });
  const existingFiles = listRes.data.files || [];

  for (const backup of BACKUPS) {
    const existing = existingFiles.find((f) => f.name === backup.name);
    if (!existing) {
      console.warn(`   Skipping ${backup.name}: file not found. Create it manually in the folder, share with service account.`);
      continue;
    }
    const modifiedMs = new Date(existing.modifiedTime).getTime();
    const elapsed = now - modifiedMs;
    const isDue = elapsed >= backup.intervalMs;

    let needsPopulate = false;
    if (!isDue) {
      try {
        const got = await sheets.spreadsheets.values.get({
          spreadsheetId: existing.id,
          range: 'A1',
        });
        const rowCount = got.data.values?.length ?? 0;
        needsPopulate = rowCount < 2;
      } catch {
        needsPopulate = true;
      }
    }

    if (isDue || needsPopulate) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: existing.id,
        range: 'A1',
        valueInputOption: 'RAW',
        requestBody: { values: prodValues },
      });
      updates.push(backup.name);
    }
  }

  // Remove any backup files in folder that aren't in our 3
  for (const file of existingFiles) {
    if (!allowedNames.has(file.name)) {
      await drive.files.update({ fileId: file.id, requestBody: { trashed: true } });
      console.log('   Removed old backup:', file.name);
    }
  }

  if (updates.length > 0) {
    console.log(`✅ Backed up Production to Drive folder: ${updates.join(', ')}`);
  } else {
    console.log('Backup intervals not yet reached (no updates).');
  }
}

main().catch((err) => {
  console.error('Backup error:', err.message);
  process.exit(1);
});
