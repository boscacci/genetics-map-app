const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

// Load from .secret_env if present (optional)
const envPath = path.resolve(__dirname, '../.secret_env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const outputPath = path.resolve(__dirname, '../.env.generated');

// Single secret name
const secret = process.env.REACT_APP_SECRET_KEY;
if (!secret) {
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath, 'utf8');
    if (/^REACT_APP_SECRET_HASH=[a-f0-9]{64}\s*$/m.test(existing)) {
      console.log('.env.generated already contains REACT_APP_SECRET_HASH; reusing existing hash.');
      process.exit(0);
    }
  }

  console.error('Missing map secret and no generated hash found. Set the map secret or generate .env.generated before building.');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(secret).digest('hex');
const output = `REACT_APP_SECRET_HASH=${hash}\n`;

fs.writeFileSync(outputPath, output);
console.log('Hashed secret written to .env.generated');
