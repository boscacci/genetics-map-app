#!/usr/bin/env node
/**
 * Phase 1: Create Genetics Map Google Sheet with Working Copy + Production tabs.
 * Run once to set up the sheet structure. Uses service account credentials.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const Papa = require('papaparse');

const CREDENTIALS_PATH = path.resolve(__dirname, '../.gcp-credentials/genetics-map-sa-key.json');
const HEADERS = [
  'name_first', 'name_last', 'email', 'phone_work', 'work_website', 'work_institution',
  'work_address', 'language_spoken', 'uses_interpreters', 'specialties',
  'Latitude', 'Longitude', 'City', 'Country'
];

async function main() {
  // USE_ADC=1 forces Application Default Credentials (for local dev when SA can't create)
  const useAdc = process.env.USE_ADC === '1';
  let auth;
  if (!useAdc && fs.existsSync(CREDENTIALS_PATH)) {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  console.log('Creating spreadsheet...');

  // Create via Drive API (service accounts can create files in their own Drive)
  let spreadsheetId;
  try {
    const fileRes = await drive.files.create({
      requestBody: {
        name: 'Genetics Map - Provider Data',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      },
    });
    spreadsheetId = fileRes.data.id;
  } catch (createErr) {
    if (createErr.message?.includes('permission') || createErr.code === 403) {
      console.error('\n❌ Cannot create spreadsheet. Two options:');
      console.error('   A) Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive');
      console.error('      Then run this script again (browser will open for auth).');
      console.error('   B) Create a blank Google Sheet manually, share it with');
      console.error('      genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com as Editor,');
      console.error('      then put the Sheet ID in .gcp-credentials/sheet-id.txt');
      process.exit(1);
    }
    throw createErr;
  }
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  console.log('✅ Created spreadsheet:', spreadsheetUrl);
  console.log('   Spreadsheet ID:', spreadsheetId);

  // Get default sheet ID, rename to Working Copy, add headers
  const sheetList = createRes.data.sheets || [];
  const defaultSheet = sheetList[0];
  const defaultSheetId = defaultSheet?.properties?.sheetId;

  // Add Production sheet, rename Sheet1 to Working Copy, write headers to both
  const requests = [
    { updateSheetProperties: { properties: { sheetId: defaultSheetId, title: 'Working Copy' }, fields: 'title' } },
    { addSheet: { properties: { title: 'Production' } } },
  ];
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });

  // Write headers to Working Copy (row 0) and Production (row 0)
  const headerValues = [HEADERS];
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: "'Working Copy'!A1:N1", values: headerValues },
        { range: "'Production'!A1:N1", values: headerValues },
      ],
    },
  });
  console.log('   Added Working Copy and Production tabs with column headers');

  // Populate Production with existing data from data.csv if present
  const csvPath = path.resolve(__dirname, '../data/data.csv');
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const { data } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    if (data.length > 0) {
      const values = [HEADERS]; // header row
      data.forEach(row => {
        values.push(HEADERS.map(h => String(row[h] ?? '')));
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "'Production'!A1",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      console.log('   Populated Production with', data.length, 'rows from data/data.csv');
    }
  }

  // Write spreadsheet ID to config for other scripts
  const configPath = path.resolve(__dirname, '../.gcp-credentials/sheet-id.txt');
  fs.writeFileSync(configPath, spreadsheetId, 'utf8');
  console.log('   Sheet ID saved to .gcp-credentials/sheet-id.txt');

  // Share with service account for automation (only if we used user ADC; SA already owns it if we used SA)
  const saEmail = 'genetics-map-automation@global-genetics-directory.iam.gserviceaccount.com';
  const usedSa = fs.existsSync(CREDENTIALS_PATH);
  if (!usedSa) {
  try {
    const permission = {
      type: 'user',
      role: 'reader',
      emailAddress: saEmail,
    };
    await drive.permissions.create({
      fileId: spreadsheetId,
      sendNotificationEmail: false,
      requestBody: permission,
    });
    console.log('   Shared with service account', saEmail, '(Reader)');
  } catch (shareErr) {
    console.warn('   Could not auto-share with service account:', shareErr.message);
    console.log('   Manually share the sheet with', saEmail, 'as Viewer');
  }
  } else {
    console.log('   Sheet owned by service account', saEmail, '(already has full access)');
  }

  console.log('\n📋 Next steps:');
  console.log('   1. Open the URL above → Share → Add Monisha (or admin) as Editor');
  console.log('   2. Admins edit in Working Copy, copy to Production when ready');
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(err.response.data);
  process.exit(1);
});
