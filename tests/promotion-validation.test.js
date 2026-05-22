const assert = require('node:assert/strict');
const test = require('node:test');

const {
  findMissingRequiredFields,
  formatMissingRequiredFields,
} = require('../scripts/lib/promotion-validation');

test('required-field helper reports blank values for configured required headers', () => {
  const missing = findMissingRequiredFields(
    [
      ['Ada', 'Lovelace', 'Genetic Counselor'],
      ['Grace', 'Hopper', ''],
      ['Katherine', 'Johnson', 'n/a'],
    ],
    { name_first: 0, name_last: 1, required_role: 2 },
    ['required_role'],
  );

  assert.deepEqual(missing, [
    { header: 'required_role', rowNumber: 3, reason: 'blank_value' },
    { header: 'required_role', rowNumber: 4, reason: 'blank_value' },
  ]);
});

test('required-field helper can exempt selected rows', () => {
  const rows = [
    ['Ada', 'Lovelace', ''],
    ['Grace', 'Hopper', ''],
  ];
  const missing = findMissingRequiredFields(
    rows,
    { name_first: 0, name_last: 1, required_role: 2 },
    ['required_role'],
    {
      isRowExempt: ({ row }) => row[0] === 'Ada',
    },
  );

  assert.deepEqual(missing, [
    { header: 'required_role', rowNumber: 3, reason: 'blank_value' },
  ]);
});

test('promotion validation reports missing required columns', () => {
  const missing = findMissingRequiredFields(
    [['Ada', 'Lovelace']],
    { name_first: 0, name_last: 1 },
    ['required_role'],
  );

  assert.deepEqual(missing, [
    { header: 'required_role', rowNumber: 1, reason: 'missing_column' },
  ]);
  assert.match(formatMissingRequiredFields(missing), /Missing required column: required_role/);
});
