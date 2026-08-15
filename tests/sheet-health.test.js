const assert = require('node:assert/strict');
const test = require('node:test');

const {
  evaluateSheetSync,
  profileSheetRows,
} = require('../scripts/lib/sheet-health');

const headers = [
  'name_first',
  'name_last',
  'email',
  'Latitude',
  'Longitude',
];

test('sheet health ignores formatted blank rows and reports publishable providers', () => {
  const profile = profileSheetRows([
    headers,
    ['Ada', 'Lovelace', 'ada@example.test', '42', '-71'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['Grace', 'Hopper', 'grace@example.test', '', ''],
  ], headers);

  assert.deepEqual(profile, {
    missingHeaders: [],
    providerRows: 2,
    publishableRows: 1,
    skippedRows: 1,
    skippedByReason: { missing_coordinates: 1 },
  });
});

test('sheet sync passes when Working Copy and Production publish the same count', () => {
  assert.deepEqual(
    evaluateSheetSync(
      { missingHeaders: [], providerRows: 227, publishableRows: 227 },
      { missingHeaders: [], providerRows: 227, publishableRows: 227 },
    ),
    { healthy: true, problems: [] },
  );
});

test('sheet sync fails closed on missing columns or stale Production coverage', () => {
  const result = evaluateSheetSync(
    { missingHeaders: ['Longitude'], providerRows: 227, publishableRows: 227 },
    { missingHeaders: [], providerRows: 220, publishableRows: 218 },
  );

  assert.equal(result.healthy, false);
  assert.deepEqual(result.problems, [
    'Working Copy is missing expected columns: Longitude',
    'Production publishable count 218 does not match Working Copy 227',
  ]);
});

test('sheet sync fails closed when no providers can be placed on the map', () => {
  const result = evaluateSheetSync(
    { missingHeaders: [], providerRows: 2, publishableRows: 0 },
    { missingHeaders: [], providerRows: 2, publishableRows: 0 },
  );

  assert.deepEqual(result, {
    healthy: false,
    problems: ['Working Copy has no provider rows with usable coordinates'],
  });
});
