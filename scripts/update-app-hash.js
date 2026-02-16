#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envGeneratedPath = path.resolve(__dirname, '../.env.generated');
const appTsxPath = path.resolve(__dirname, '../src/App.tsx');

// Read the generated hash
if (!fs.existsSync(envGeneratedPath)) {
  console.error('Error: .env.generated not found. Run "node scripts/hash-secret.js" first.');
  process.exit(1);
}

const envContent = fs.readFileSync(envGeneratedPath, 'utf8');
const hashMatch = envContent.match(/REACT_APP_SECRET_HASH=([a-f0-9]+)/);

if (!hashMatch) {
  console.error('Error: REACT_APP_SECRET_HASH not found in .env.generated');
  process.exit(1);
}

const newHash = hashMatch[1];

// Read App.tsx
if (!fs.existsSync(appTsxPath)) {
  console.error('Error: src/App.tsx not found');
  process.exit(1);
}

let appContent = fs.readFileSync(appTsxPath, 'utf8');

// Replace the SECRET_HASH line
const updatedContent = appContent.replace(
  /const SECRET_HASH = "[a-f0-9]*";/,
  `const SECRET_HASH = "${newHash}";`
);

if (appContent === updatedContent) {
  console.log('SECRET_HASH in App.tsx is already up to date.');
} else {
  fs.writeFileSync(appTsxPath, updatedContent, 'utf8');
  console.log(`Updated SECRET_HASH in App.tsx to: ${newHash}`);
}

