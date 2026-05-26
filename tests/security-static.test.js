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

test('app preserves access for previous deployed map key', () => {
  const app = read('src/App.tsx');

  assert.ok(app.includes('LEGACY_SECRET_HASH'));
  assert.ok(app.includes('LEGACY_ENCRYPTED_SPECIALISTS_DATA'));
  assert.ok(app.includes('ACCESS_PROFILES'));
});

test('geocoding scripts do not log Working Copy address details', () => {
  const pythonGeocoder = read('scripts/geocode_working_copy.py');
  const appsScriptGeocoder = read('scripts/geocoding.gs');

  assert.ok(pythonGeocoder.includes('format_geocode_log_summary'));
  assert.ok(!pythonGeocoder.includes("f\"({geo['lat']}, {geo['lng']})"));
  assert.ok(!pythonGeocoder.includes("geo.get('street', '')"));
  assert.ok(!pythonGeocoder.includes("geo.get('zip', '')"));
  assert.ok(!pythonGeocoder.includes('Geocode error: {e}'));

  assert.ok(appsScriptGeocoder.includes('redactedGeocodeSummary'));
  assert.ok(!appsScriptGeocoder.includes('institution="${inst}", address="${addr}"'));
  assert.ok(!appsScriptGeocoder.includes('console.log({row:i + 1, inst, addr});'));
  assert.ok(!appsScriptGeocoder.includes('Attempt ${i + 1}: "${query}"'));
  assert.ok(!appsScriptGeocoder.includes('error.message'));
  assert.ok(!appsScriptGeocoder.includes('already has geocoding data ('));
  assert.ok(!appsScriptGeocoder.includes('lat=${result.lat}, lng=${result.lng}'));
});
