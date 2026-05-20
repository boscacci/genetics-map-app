const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PRODUCTION_HEADERS,
  PRODUCTION_SHEET_RANGE_A1,
  PUBLIC_HEADERS,
  WORKING_COPY_HEADERS,
  WORKING_COPY_SHEET_RANGE_A1,
} = require('../scripts/lib/sheet-schema');

test('working copy schema keeps institution privacy and job title columns together', () => {
  const institutionIndex = WORKING_COPY_HEADERS.indexOf('work_institution');

  assert.notEqual(institutionIndex, -1);
  assert.equal(WORKING_COPY_HEADERS[institutionIndex + 1], 'hide_workinstitution');
  assert.equal(WORKING_COPY_HEADERS[institutionIndex + 2], 'job_title');
  assert.equal(WORKING_COPY_HEADERS[institutionIndex + 3], 'work_address');
});

test('working copy has the internal newsletter flag but production does not', () => {
  assert.equal(WORKING_COPY_HEADERS.length, 25);
  assert.equal(WORKING_COPY_HEADERS.at(-1), 'signed_up_for_newsletter');
  assert.equal(WORKING_COPY_SHEET_RANGE_A1, 'A:Y');

  assert.equal(PRODUCTION_HEADERS.length, 24);
  assert.ok(!PRODUCTION_HEADERS.includes('signed_up_for_newsletter'));
  assert.equal(PRODUCTION_SHEET_RANGE_A1, 'A:X');
});

test('public export keeps job title but never exposes credential links', () => {
  assert.ok(PUBLIC_HEADERS.includes('job_title'));
  assert.ok(!PUBLIC_HEADERS.includes('credential_link'));
  assert.ok(!PUBLIC_HEADERS.includes('signed_up_for_newsletter'));
});
