const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeProviderRecord } = require('../scripts/lib/provider-record');

test('hide_workinstitution hides only the public institution field', () => {
  const record = normalizeProviderRecord({
    name_first: 'Ada',
    name_last: 'Lovelace',
    email: 'ada@example.test',
    phone_work: '+1 555 0100',
    work_website: 'https://example.test',
    work_institution: 'Example Hospital',
    hide_workinstitution: 'TRUE',
    job_title: 'Genetic Counselor',
    work_address: '1 Main St',
    hide_institution_address: 'FALSE',
    language_spoken: 'English, Spanish',
    uses_interpreters: 'FALSE',
    Latitude: '42.0',
    Longitude: '-71.0',
    City: 'Boston',
    Country: 'United States',
  });

  assert.equal(record.work_institution, '');
  assert.equal(record.work_address, '1 Main St');
  assert.equal(record.job_title, 'Genetic Counselor');
  assert.equal(record.hide_workinstitution, 'TRUE');
  assert.equal(record.hide_institution_address, 'FALSE');
});

test('legacy hide_institution_address still hides institution and address', () => {
  const record = normalizeProviderRecord({
    name_first: 'Grace',
    name_last: 'Hopper',
    work_institution: 'Example Clinic',
    hide_workinstitution: 'FALSE',
    work_address: '2 Main St',
    hide_institution_address: 'TRUE',
    Latitude: '42.0',
    Longitude: '-71.0',
  });

  assert.equal(record.work_institution, '');
  assert.equal(record.work_address, '');
  assert.equal(record.address_street, '');
  assert.equal(record.address_state, '');
  assert.equal(record.address_zip, '');
});

test('provider normalization strips old phone apostrophe escapes before publishing', () => {
  const record = normalizeProviderRecord({
    name_first: 'Rosalind',
    name_last: 'Franklin',
    phone_work: "'+44 20 7946 0958",
    Latitude: '51.5',
    Longitude: '-0.1',
  });

  assert.equal(record.phone_work, '+44 20 7946 0958');
});
