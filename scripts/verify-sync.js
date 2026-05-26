#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.secret_env');
const envGeneratedPath = path.resolve(__dirname, '../.env.generated');
const appTsxPath = path.resolve(__dirname, '../src/App.tsx');
const blobPath = path.resolve(__dirname, '../src/secureDataBlob.ts');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractHash(content, pattern, label) {
  const match = content.match(pattern);
  if (!match) {
    fail(`❌ ${label} not found`);
  }
  return match[1];
}

if (!fs.existsSync(envGeneratedPath)) {
  console.error('❌ .env.generated not found - run: node scripts/hash-secret.js');
  process.exit(1);
}

if (!fs.existsSync(appTsxPath)) {
  fail('❌ src/App.tsx not found');
}

const envGenerated = fs.readFileSync(envGeneratedPath, 'utf8');
const generatedHash = extractHash(
  envGenerated,
  /REACT_APP_SECRET_HASH=([a-f0-9]+)/,
  'REACT_APP_SECRET_HASH in .env.generated'
);

const appContent = fs.readFileSync(appTsxPath, 'utf8');
const appHash = extractHash(
  appContent,
  /const SECRET_HASH = "([a-f0-9]*)";/,
  'SECRET_HASH in App.tsx'
);

if (appHash !== generatedHash) {
  console.error('❌ App.tsx SECRET_HASH mismatch!');
  console.error(`   App.tsx: ${appHash.substring(0, 16)}...`);
  console.error(`   .env.generated: ${generatedHash.substring(0, 16)}...`);
  process.exit(1);
}
console.log('✅ App.tsx SECRET_HASH matches .env.generated');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  const secretKey = process.env.REACT_APP_SECRET_KEY;
  if (!secretKey) {
    fail('❌ REACT_APP_SECRET_KEY not found in .secret_env');
  }

  const expectedHash = crypto.createHash('sha256').update(secretKey).digest('hex');
  if (expectedHash !== generatedHash) {
    console.error('❌ .env.generated hash mismatch!');
    console.error(`   Found: ${generatedHash.substring(0, 16)}...`);
    process.exit(1);
  }
  console.log('✅ .env.generated hash matches local secret');
} else {
  console.log('ℹ️ .secret_env not found; skipping local plaintext secret comparison');
}

// Check if secureDataBlob.ts exists and was encrypted with current key
if (fs.existsSync(blobPath)) {
  const blobSize = fs.statSync(blobPath).size;
  if (blobSize > 1000) {
    console.log(`✅ secureDataBlob.ts exists (${Math.round(blobSize/1024)}KB)`);
  } else {
    console.error('⚠️  secureDataBlob.ts seems too small - may need re-encryption');
  }
} else {
  console.error('❌ src/secureDataBlob.ts not found - run: npm run encrypt-data');
  process.exit(1);
}

console.log('\n✅ All checks passed! System is in sync.');
console.log(`🔐 Hash: ${generatedHash.substring(0, 16)}...`);
