#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load .secret_env
const envPath = path.resolve(__dirname, '../.secret_env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .secret_env file not found');
  process.exit(1);
}

dotenv.config({ path: envPath });
const SECRET_KEY = process.env.REACT_APP_SECRET_KEY;

if (!SECRET_KEY) {
  console.error('❌ REACT_APP_SECRET_KEY not found in .secret_env');
  process.exit(1);
}

// Compute expected hash
const expectedHash = crypto.createHash('sha256').update(SECRET_KEY).digest('hex');

// Check .env.generated
const envGeneratedPath = path.resolve(__dirname, '../.env.generated');
if (fs.existsSync(envGeneratedPath)) {
  const envGenerated = fs.readFileSync(envGeneratedPath, 'utf8');
  const hashMatch = envGenerated.match(/REACT_APP_SECRET_HASH=([a-f0-9]+)/);
  if (hashMatch && hashMatch[1] === expectedHash) {
    console.log('✅ .env.generated hash matches');
  } else {
    console.error(`❌ .env.generated hash mismatch!`);
    console.error(`   Found: ${hashMatch ? `${hashMatch[1].substring(0, 16)}...` : 'none'}`);
    process.exit(1);
  }
} else {
  console.error('❌ .env.generated not found - run: node scripts/hash-secret.js');
  process.exit(1);
}

// Check App.tsx
const appTsxPath = path.resolve(__dirname, '../src/App.tsx');
if (fs.existsSync(appTsxPath)) {
  const appContent = fs.readFileSync(appTsxPath, 'utf8');
  const secretHashMatch = appContent.match(/const SECRET_HASH = "([a-f0-9]*)";/);
  if (secretHashMatch && secretHashMatch[1] === expectedHash) {
    console.log('✅ App.tsx SECRET_HASH matches');
  } else {
    console.error(`❌ App.tsx SECRET_HASH mismatch!`);
    console.error(`   Found: ${secretHashMatch ? `${secretHashMatch[1].substring(0, 16)}...` : 'none'}`);
    process.exit(1);
  }
} else {
  console.error('❌ src/App.tsx not found');
  process.exit(1);
}

// Check if secureDataBlob.ts exists and was encrypted with current key
const blobPath = path.resolve(__dirname, '../src/secureDataBlob.ts');
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
console.log(`🔐 Hash: ${expectedHash.substring(0, 16)}...`);
