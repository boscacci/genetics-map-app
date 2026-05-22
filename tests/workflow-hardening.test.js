const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('workflow failure email does not query logs for the still-running workflow run', () => {
  for (const workflow of ['sync-and-deploy.yml', 'promote-only.yml']) {
    const content = read(`.github/workflows/${workflow}`);

    assert.ok(content.includes('bash .github/scripts/capture-failure-log.sh'));
    assert.ok(!content.includes('gh run view'));
    assert.ok(content.includes('actions: read'));
    assert.ok(content.includes('Validate promotion requirements (read-only)'));
    assert.ok(content.includes('genetics-map-sheet-publish'));
  }
});

test('failure log helper targets completed failed jobs', () => {
  const helper = read('.github/scripts/capture-failure-log.sh');

  assert.ok(helper.includes('/actions/runs/${run_id}/jobs?filter=latest&per_page=100'));
  assert.ok(helper.includes('/actions/jobs/${job_id}/logs'));
  assert.ok(helper.includes("job.name !== 'notify-failure'"));
  assert.ok(helper.includes('Could not download logs for completed job'));
});

test('promotion validation can run without writing to Google Sheets', () => {
  const pkg = JSON.parse(read('package.json'));
  const validationScript = read('scripts/validate-promotion.js');
  const promotionScript = read('scripts/promote-to-production.js');

  assert.equal(pkg.scripts['validate:promotion'], 'node scripts/validate-promotion.js');
  assert.ok(validationScript.includes('https://www.googleapis.com/auth/spreadsheets.readonly'));
  assert.ok(!validationScript.includes('spreadsheets.values.update'));
  assert.ok(!validationScript.includes('spreadsheets.values.clear'));
  assert.ok(validationScript.includes('This does not block promotion or deploy'));
  assert.ok(!promotionScript.includes("['job_title']"));
});
