#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const secretEnvPath = path.resolve(repoRoot, '.secret_env');
const dataCsvPath = path.resolve(repoRoot, 'data.csv');

function exitWith(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(secretEnvPath)) exitWith('Error: .secret_env file not found');
if (!fs.existsSync(dataCsvPath)) exitWith('Error: data.csv file not found');

const envContent = fs.readFileSync(secretEnvPath, 'utf8');
const match = envContent.match(/REACT_APP_SECRET_KEY=(.+)/);
if (!match) exitWith('Error: REACT_APP_SECRET_KEY not found in .secret_env');
const passphrase = match[1].trim();
const csvContent = fs.readFileSync(dataCsvPath, 'utf8');

try {
  execSync('gh --version', { stdio: 'ignore' });
} catch (e) {
  exitWith('Error: GitHub CLI (gh) not installed. Install from https://cli.github.com/');
}

try {
  execSync('gh auth status', { stdio: 'ignore' });
} catch (e) {
  exitWith('Error: Not authenticated with GitHub CLI. Run: gh auth login');
}

function setSecret(name, value) {
  console.log(`Updating GitHub repository secret ${name}...`);
  execSync(`gh secret set ${name}`, { stdio: 'inherit', input: Buffer.from(value) });
  console.log(`✅ Updated ${name}`);
}

setSecret('REACT_APP_SECRET_KEY', passphrase);
setSecret('DATA_CSV_CONTENT', csvContent);

console.log('All secrets synced.');


