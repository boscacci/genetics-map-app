#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const {
  PRODUCTION_HEADERS,
  PRODUCTION_SHEET_RANGE_A1,
  WORKING_COPY_HEADERS,
  WORKING_COPY_SHEET_RANGE_A1,
} = require('./lib/sheet-schema');
const { evaluateSheetSync, profileSheetRows } = require('./lib/sheet-health');

const repoRoot = path.resolve(__dirname, '..');
const credentialsPath = process.env.GCP_CREDENTIALS_PATH
  ? path.resolve(process.env.GCP_CREDENTIALS_PATH)
  : path.join(repoRoot, '.gcp-credentials', 'genetics-map-sa-key.json');
const sheetIdPath = process.env.SHEET_ID_PATH
  ? path.resolve(process.env.SHEET_ID_PATH)
  : path.join(repoRoot, '.gcp-credentials', 'sheet-id.txt');

function formatProfile(label, profile) {
  const skipped = Object.entries(profile.skippedByReason)
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(', ');
  const suffix = skipped ? `; skipped ${profile.skippedRows} (${skipped})` : '';
  return `${label}: ${profile.publishableRows}/${profile.providerRows} provider rows publishable${suffix}`;
}

async function readProfile(sheets, spreadsheetId, title, range, headers) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!${range}`,
  });
  return profileSheetRows(response.data.values || [], headers);
}

async function main() {
  const requireSync = process.argv.includes('--require-sync');
  const githubSummary = process.argv.includes('--github-summary');

  if (!fs.existsSync(credentialsPath) || !fs.existsSync(sheetIdPath)) {
    throw new Error('Sheet health check requires GCP credentials and a Sheet ID');
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const spreadsheetId = fs.readFileSync(sheetIdPath, 'utf8').trim();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const workingCopy = await readProfile(
    sheets,
    spreadsheetId,
    'Working Copy',
    WORKING_COPY_SHEET_RANGE_A1,
    WORKING_COPY_HEADERS,
  );
  const production = await readProfile(
    sheets,
    spreadsheetId,
    'Production',
    PRODUCTION_SHEET_RANGE_A1,
    PRODUCTION_HEADERS,
  );
  const sync = evaluateSheetSync(workingCopy, production);
  const lines = [
    formatProfile('Working Copy', workingCopy),
    formatProfile('Production', production),
    `Sheet publish health: ${sync.healthy ? 'healthy' : 'unhealthy'}`,
  ];

  lines.forEach((line) => console.log(line));
  if (githubSummary && process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## Map data freshness',
      '',
      ...lines.map((line) => `- ${line}`),
      '',
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
  }

  if (requireSync && !sync.healthy) {
    sync.problems.forEach((problem) => console.error(`❌ ${problem}`));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ Sheet health check failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  formatProfile,
  readProfile,
};
