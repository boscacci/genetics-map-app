const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: '.secret_env' });

const secret = process.env.REACT_APP_SECRET_KEY;
if (!secret) {
  console.error('REACT_APP_SECRET_KEY not found in .secret_env');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(secret).digest('hex');
const output = `REACT_APP_SECRET_HASH=${hash}\n`;

fs.writeFileSync('.env.generated', output);
console.log('Hashed secret written to .env.generated'); 