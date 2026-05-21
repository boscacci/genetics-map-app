const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('map UI does not render Sheet-controlled data through raw HTML', () => {
  assert.ok(!read('src/MapComponent.tsx').includes('dangerouslySetInnerHTML'));
});

test('verification scripts do not print the map secret', () => {
  assert.ok(!read('scripts/verify-sync.js').includes('Secret key:'));
});

test('hash update script does not print the full app hash', () => {
  assert.ok(read('scripts/update-app-hash.js').includes('substring(0, 16)'));
});

test('GitHub secret sync does not pass secret values through shell command text', () => {
  const syncSecrets = read('scripts/sync-secrets.js');
  assert.ok(!syncSecrets.includes('execSync(`gh secret set'));
});

test('unused vulnerable router dependency stays removed', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['react-router-dom'], undefined);
});
