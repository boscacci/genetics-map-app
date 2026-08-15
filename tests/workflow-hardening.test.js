const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
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
    assert.ok(content.includes('Validate Working Copy structure (read-only)'));
    assert.ok(content.includes('genetics-map-sheet-publish'));
    assert.ok(content.includes('check:sheet-health -- --require-sync --github-summary'));
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

test('deploy workflow passes cleaned CSV by file instead of oversized environment variable', () => {
  const workflow = read('.github/workflows/sync-and-deploy.yml');

  assert.ok(workflow.includes('cp /tmp/cleaned.csv data/data.csv'));
  assert.ok(!workflow.includes('DATA_CSV_BASE64=$(base64'));
});

test('deploy workflow scopes map decrypt key to the steps that need it', () => {
  const workflow = read('.github/workflows/sync-and-deploy.yml');

  assert.ok(!workflow.includes('env:\n      REACT_APP_SECRET_KEY: ${{ secrets.REACT_APP_SECRET_KEY }}'));
  assert.match(
    workflow,
    /name: Encrypt data \(from Production via clean script output\)[\s\S]*?env:\n\s+REACT_APP_SECRET_KEY: \$\{\{ secrets\.REACT_APP_SECRET_KEY \}\}/,
  );
  assert.match(
    workflow,
    /name: Generate secret hash for App\.tsx[\s\S]*?env:\n\s+REACT_APP_SECRET_KEY: \$\{\{ secrets\.REACT_APP_SECRET_KEY \}\}/,
  );
  assert.ok(workflow.includes('./node_modules/.bin/react-scripts build'));
  const finalBuildStep = workflow.match(
    /- name: Build app\n[\s\S]*?(?=\n\s+- name: Deploy to GitHub Pages)/,
  );
  assert.ok(finalBuildStep);
  assert.doesNotMatch(
    finalBuildStep[0],
    /REACT_APP_SECRET_KEY: \$\{\{ secrets\.REACT_APP_SECRET_KEY \}\}/,
  );
});

test('verify command works without a local plaintext map secret', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'genetics-map-verify-'));
  try {
    fs.mkdirSync(path.join(tempRoot, 'scripts'));
    fs.mkdirSync(path.join(tempRoot, 'src'));
    fs.copyFileSync(path.join(repoRoot, 'scripts/verify-sync.js'), path.join(tempRoot, 'scripts/verify-sync.js'));
    fs.copyFileSync(path.join(repoRoot, 'src/App.tsx'), path.join(tempRoot, 'src/App.tsx'));
    fs.copyFileSync(path.join(repoRoot, 'src/secureDataBlob.ts'), path.join(tempRoot, 'src/secureDataBlob.ts'));
    fs.copyFileSync(path.join(repoRoot, '.env.generated'), path.join(tempRoot, '.env.generated'));

    const result = spawnSync('node', ['scripts/verify-sync.js'], {
      cwd: tempRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_PATH: path.join(repoRoot, 'node_modules'),
        REACT_APP_SECRET_KEY: '',
      },
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /\.secret_env not found/);
    assert.match(result.stdout, /App\.tsx SECRET_HASH matches \.env\.generated/);
    assert.doesNotMatch(result.stdout + result.stderr, /REACT_APP_SECRET_KEY=/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('hash prebuild reuses generated hash without a local plaintext map secret', () => {
  const result = spawnSync('node', ['scripts/hash-secret.js'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      REACT_APP_SECRET_KEY: '',
    },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /\.env\.generated already contains REACT_APP_SECRET_HASH/);
  assert.doesNotMatch(result.stdout + result.stderr, /REACT_APP_SECRET_KEY=/);
});

test('deploy workflow completes code preflight before creating credentials or writing Sheet data', () => {
  const workflow = read('.github/workflows/sync-and-deploy.yml');
  const scriptTests = workflow.indexOf('Run script tests');
  const componentTests = workflow.indexOf('Run React component tests');
  const typeCheck = workflow.indexOf('Type-check app');
  const preflightBuild = workflow.indexOf('Build app preflight');
  const pythonTests = workflow.indexOf('Run Python tests');
  const credentials = workflow.indexOf('Create GCP credentials');
  const geocode = workflow.indexOf('- name: Geocode Working Copy');
  const promote = workflow.indexOf('- name: Promote Working Copy');

  [scriptTests, componentTests, typeCheck, preflightBuild, pythonTests, credentials, geocode, promote].forEach((index) => {
    assert.ok(index > -1, 'expected all preflight and deployment steps');
  });
  assert.ok(scriptTests < credentials);
  assert.ok(componentTests < credentials);
  assert.ok(typeCheck < credentials);
  assert.ok(preflightBuild < credentials);
  assert.ok(pythonTests < credentials);
  assert.ok(credentials < geocode);
  assert.ok(pythonTests < geocode);
  assert.ok(pythonTests < promote);
  assert.ok(geocode < promote);
});

test('promote-only workflow runs Python tests before creating credentials or writing Sheet data', () => {
  const workflow = read('.github/workflows/promote-only.yml');
  const pythonTests = workflow.indexOf('Run Python tests');
  const credentials = workflow.indexOf('Create GCP credentials');
  const geocode = workflow.indexOf('- name: Geocode Working Copy');
  const promote = workflow.indexOf('- name: Promote Working Copy');

  [pythonTests, credentials, geocode, promote].forEach((index) => {
    assert.ok(index > -1, 'expected Python tests and Sheet mutation steps');
  });
  assert.ok(pythonTests < credentials);
  assert.ok(credentials < geocode);
  assert.ok(geocode < promote);
});

test('pull requests and main run the complete credential-free CI suite', () => {
  const workflow = read('.github/workflows/ci.yml');

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /npm run test:scripts/);
  assert.match(workflow, /CI=true npm test -- --watchAll=false/);
  assert.match(workflow, /npx tsc --noEmit/);
  assert.match(workflow, /react-scripts build/);
  assert.match(workflow, /python -m pytest -q tests/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.|GCP_SA_KEY|SHEET_ID|Create GCP credentials/);
});

test('production publishing is SemVer-tag-only and validates main CI before approval', () => {
  const workflow = read('.github/workflows/sync-and-deploy.yml');

  assert.match(workflow, /tags:\s*\n\s*- ['"]v\*['"]/);
  assert.doesNotMatch(workflow, /\n\s+schedule:/);
  assert.doesNotMatch(workflow, /\n\s+workflow_dispatch:/);
  assert.match(workflow, /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$/);
  assert.match(workflow, /Verify tag targets current main with successful CI/);
  assert.match(workflow, /gh run list --workflow CI/);
  assert.match(workflow, /sync-and-deploy:\s*\n\s*needs: validate-release/);
  assert.match(workflow, /environment:\s*\n\s*name: production/);
  assert.ok(
    workflow.indexOf('Verify tag targets current main with successful CI') <
      workflow.indexOf('environment:'),
    'release provenance must be checked before production approval'
  );
});

test('map data refresh runs every four hours using the currently deployed release source', () => {
  const workflow = read('.github/workflows/refresh-map-data.yml');

  assert.match(workflow, /schedule:\s*\n\s*- cron: ['"]0 \*\/4 \* \* \*['"]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /Resolve deployed release provenance/);
  assert.ok(workflow.includes('^deploy:\\ ([0-9a-f]{40})$'));
  assert.ok(workflow.includes('GITHUB_REF') && workflow.includes('refs/heads/main'));
  assert.match(workflow, /gh run list --workflow CI/);
  assert.match(workflow, /ref: \$\{\{ needs\.resolve-release\.outputs\.release_sha \}\}/);
  assert.match(workflow, /commit_message: ['"]deploy: \$\{\{ needs\.resolve-release\.outputs\.release_sha \}\}['"]/);
  assert.match(workflow, /node scripts\/check-sheet-health\.js --require-sync --github-summary/);
  assert.match(workflow, /genetics-map-sheet-publish/);
  assert.match(workflow, /capture-failure-log\.sh/);
  assert.match(workflow, /to: boscacci\.data@gmail\.com/);
  assert.doesNotMatch(workflow, /ref: main/);

  const credentialsStep = workflow.match(
    /- name: Create GCP credentials[\s\S]*?(?=\n\s+- name: Validate Working Copy structure)/,
  );
  assert.ok(credentialsStep);
  assert.match(credentialsStep[0], /GCP_SA_KEY_BASE64: \$\{\{ secrets\.GCP_SA_KEY \}\}/);
  assert.doesNotMatch(credentialsStep[0], /echo ['"]\$\{\{ secrets\./);

  const clean = workflow.indexOf('Clean and validate Production');
  const health = workflow.indexOf('Check Sheet publish health');
  const deploy = workflow.indexOf('Deploy refreshed data to GitHub Pages');
  assert.ok(clean > -1 && health > clean && deploy > health);
});
