const assert = require('node:assert/strict');
const test = require('node:test');

require('ts-node/register');

const {
  cleanDisplayValue,
  formatInterpreterServices,
  hasPrivateContactDetails,
} = require('../src/providerDisplay');

const provider = (overrides = {}) => ({
  name_first: 'Ada',
  name_last: 'Lovelace',
  email: 'ada@example.test',
  phone_work: '+1 555 0100',
  work_website: 'https://example.test',
  work_institution: 'Example Hospital',
  job_title: 'Genetic Counselor',
  work_address: '1 Main St',
  language_spoken: 'English',
  Latitude: 42,
  Longitude: -71,
  City: 'Boston',
  Country: 'United States',
  interpreter_services: 'TRUE',
  specialties: 'Cancer genetics',
  ...overrides,
});

test('display sanitizer removes actual and stringified null-like values', () => {
  [Number.NaN, 'NaN', null, undefined, 'null', 'undefined', 'n/a', 'NA', '-', '--'].forEach((value) => {
    assert.equal(cleanDisplayValue(value), '');
  });
  assert.equal(cleanDisplayValue('  public value  '), 'public value');
});

test('interpreter services retain explicit three-state display text', () => {
  assert.equal(formatInterpreterServices(true), 'Available');
  assert.equal(formatInterpreterServices('TRUE'), 'Available');
  assert.equal(formatInterpreterServices(false), 'Not available');
  assert.equal(formatInterpreterServices('false'), 'Not available');
  assert.equal(formatInterpreterServices('NaN'), 'Not specified');
  assert.equal(formatInterpreterServices(undefined), 'Not specified');
});

test('private contact note is triggered by privacy flags and legacy null-like values', () => {
  assert.equal(hasPrivateContactDetails(provider()), false);
  assert.equal(hasPrivateContactDetails(provider({ hide_email: 'TRUE', email: '' })), true);
  assert.equal(hasPrivateContactDetails(provider({ hide_phone: true, phone_work: '' })), true);
  assert.equal(hasPrivateContactDetails(provider({ hide_workinstitution: 'TRUE', work_institution: '' })), true);
  assert.equal(hasPrivateContactDetails(provider({ hide_institution_address: 'TRUE', work_address: '' })), true);
  assert.equal(hasPrivateContactDetails(provider({ email: 'NaN' })), true);
  assert.equal(hasPrivateContactDetails(provider({ phone_work: Number.NaN })), true);
  assert.equal(hasPrivateContactDetails(provider({ email: '', phone_work: '' })), false);
});
