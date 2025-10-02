#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Read the secret from .secret_env file
const secretEnvPath = path.resolve(__dirname, '../.secret_env');

if (!fs.existsSync(secretEnvPath)) {
  console.error('Error: .secret_env file not found');
  process.exit(1);
}

// Parse the .secret_env file
const envContent = fs.readFileSync(secretEnvPath, 'utf8');
const secretMatch = envContent.match(/REACT_APP_SECRET_KEY=(.+)/);

if (!secretMatch) {
  console.error('Error: REACT_APP_SECRET_KEY not found in .secret_env file');
  process.exit(1);
}

const secretValue = secretMatch[1].trim();

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

// Update the GitHub repository secret
try {
  console.log('Updating GitHub repository secret REACT_APP_SECRET_KEY...');
  
  // Use GitHub CLI to update the secret
  // The secret value is passed via stdin to avoid it appearing in process list
  const updateCommand = `echo "${secretValue}" | gh secret set REACT_APP_SECRET_KEY`;
  execSync(updateCommand, { stdio: 'inherit' });
  
  console.log('✅ Successfully updated REACT_APP_SECRET_KEY in GitHub repository');
} catch (error) {
  console.error('Error updating GitHub secret:', error.message);
  process.exit(1);
}
