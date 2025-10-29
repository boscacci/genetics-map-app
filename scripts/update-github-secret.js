#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Paths
const repoRoot = path.resolve(__dirname, '..');
const secretEnvPath = path.resolve(repoRoot, '.secret_env');
const dataCsvPath = path.resolve(repoRoot, 'data.csv');

// Ensure required files exist
if (!fs.existsSync(secretEnvPath)) {
  console.error('Error: .secret_env file not found');
  process.exit(1);
}
if (!fs.existsSync(dataCsvPath)) {
  console.error('Error: data.csv file not found');
  process.exit(1);
}

// Parse the .secret_env file - expecting REACT_APP_SECRET_KEY=...
const envContent = fs.readFileSync(secretEnvPath, 'utf8');
const secretMatch = envContent.match(/REACT_APP_SECRET_KEY=(.+)/);
if (!secretMatch) {
  console.error('Error: REACT_APP_SECRET_KEY not found in .secret_env file');
  process.exit(1);
}
const passphrase = secretMatch[1].trim();

// Read CSV data content
const csvContent = fs.readFileSync(dataCsvPath, 'utf8');

// Check if GitHub CLI is installed
try {
  execSync('gh --version', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: GitHub CLI (gh) is not installed. Please install it first.');
  console.error('Visit: https://cli.github.com/');
  process.exit(1);
}

// Check if user is authenticated with GitHub CLI
try {
  execSync('gh auth status', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: Not authenticated with GitHub CLI. Please run: gh auth login');
  process.exit(1);
}

// Helper to set a GitHub secret via stdin (avoids quoting issues)
function setSecret(name, value) {
  try {
    console.log(`Updating GitHub repository secret ${name}...`);
    execSync(`gh secret set ${name}`, { stdio: 'inherit', input: Buffer.from(value) });
    console.log(`✅ Successfully updated ${name}`);
  } catch (err) {
    console.error(`Error updating ${name}:`, err.message);
    process.exit(1);
  }
}

// Update required secrets for Actions
// Use REACT_APP_SECRET_PASSPHRASE for the app key
setSecret('REACT_APP_SECRET_PASSPHRASE', passphrase);

// Provide CSV data for GitHub Pages build via DATA_CSV_CONTENT
setSecret('DATA_CSV_CONTENT', csvContent);

// Optionally backfill legacy names if present in workflows (no-op if unused)
try {
  setSecret('REACT_APP_SECRET_KEY', passphrase);
} catch (_) {}
try {
  setSecret('DATA_CSV', csvContent);
} catch (_) {}
