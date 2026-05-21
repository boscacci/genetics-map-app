const assert = require('node:assert/strict');
const test = require('node:test');

const {
  findMissingRequiredFields,
  formatMissingRequiredFields,
} = require('../scripts/lib/promotion-validation');

test('promotion validation requires job title values', () => {
  const missing = findMissingRequiredFields(
    [
      ['Ada', 'Lovelace', 'Genetic Counselor'],
      ['Grace', 'Hopper', ''],
      ['Katherine', 'Johnson', 'n/a'],
    ],
    { name_first: 0, name_last: 1, job_title: 2 },
    ['job_title'],
  );

  assert.deepEqual(missing, [
    { header: 'job_title', rowNumber: 3, reason: 'blank_value' },
    { header: 'job_title', rowNumber: 4, reason: 'blank_value' },
  ]);
});

test('promotion validation can exempt legacy rows while still requiring new rows', () => {
  const rows = [
    ['Ada', 'Lovelace', ''],
    ['Grace', 'Hopper', ''],
  ];
  const missing = findMissingRequiredFields(
    rows,
    { name_first: 0, name_last: 1, job_title: 2 },
    ['job_title'],
    {
      isRowExempt: ({ row }) => row[0] === 'Ada',
    },
  );

  assert.deepEqual(missing, [
    { header: 'job_title', rowNumber: 3, reason: 'blank_value' },
  ]);
});

test('promotion validation reports missing required columns', () => {
  const missing = findMissingRequiredFields(
    [['Ada', 'Lovelace']],
    { name_first: 0, name_last: 1 },
    ['job_title'],
  );

  assert.deepEqual(missing, [
    { header: 'job_title', rowNumber: 1, reason: 'missing_column' },
  ]);
  assert.match(formatMissingRequiredFields(missing), /Missing required column: job_title/);
});
