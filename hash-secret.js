const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

// Load from .secret_env if present (optional)
const envPath = path.resolve(__dirname, '.secret_env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Single secret name
const secret = process.env.REACT_APP_SECRET_PASSPHRASE;
if (!secret) {
  console.error('Missing secret: set REACT_APP_SECRET_PASSPHRASE as an environment secret or in .secret_env');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(secret).digest('hex');
const output = `REACT_APP_SECRET_HASH=${hash}\n`;

fs.writeFileSync('.env.generated', output);
console.log('Hashed secret written to .env.generated'); 