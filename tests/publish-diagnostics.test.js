const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildPublishRows,
  summarizePublishRows,
} = require('../scripts/lib/publish-diagnostics');

test('publish diagnostics explains rows skipped for missing or invalid coordinates', () => {
  const rows = [
    { name_first: 'Ada', Latitude: '42.0', Longitude: '-71.0' },
    { name_first: 'Grace', Latitude: '', Longitude: '-71.0' },
    { name_first: 'Rosalind', Latitude: 'not-a-number', Longitude: '0' },
  ];
  const summary = summarizePublishRows(rows);

  assert.equal(summary.totalRows, 3);
  assert.equal(summary.publishableRows, 1);
  assert.equal(summary.skippedRows, 2);
  assert.deepEqual(summary.skippedByReason, {
    missing_coordinates: 1,
    invalid_coordinates: 1,
  });
  assert.deepEqual(summary.examples, [
    { rowNumber: 3, reason: 'missing_coordinates' },
    { rowNumber: 4, reason: 'invalid_coordinates' },
  ]);
});

test('publish rows include only records with usable coordinates', () => {
  const rows = [
    { Latitude: '42.0', Longitude: '-71.0' },
    { Latitude: '', Longitude: '-71.0' },
  ];

  assert.deepEqual(buildPublishRows(rows), [{ Latitude: '42.0', Longitude: '-71.0' }]);
});

test('publish diagnostics ignore completely blank trailing sheet rows', () => {
  const rows = [
    { name_first: 'Ada', Latitude: '42.0', Longitude: '-71.0' },
    { name_first: '', Latitude: '', Longitude: '' },
    { name_first: 'Grace', Latitude: '', Longitude: '-71.0' },
  ];
  const summary = summarizePublishRows(rows);

  assert.equal(summary.totalRows, 2);
  assert.equal(summary.publishableRows, 1);
  assert.equal(summary.skippedRows, 1);
  assert.deepEqual(summary.examples, [
    { rowNumber: 4, reason: 'missing_coordinates' },
  ]);
});
