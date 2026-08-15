const assert = require('node:assert/strict');
const test = require('node:test');

const { filterProviderRows } = require('../scripts/promote-to-production');
const { WORKING_COPY_HEADERS } = require('../scripts/lib/sheet-schema');

const row = (overrides = {}) => WORKING_COPY_HEADERS.map((header) => ({
  hide_name: 'FALSE',
  hide_email: 'FALSE',
  hide_phone: 'FALSE',
  hide_workinstitution: 'FALSE',
  hide_institution_address: 'FALSE',
  uses_interpreters: 'FALSE',
  signed_up_for_newsletter: 'FALSE',
  ...overrides,
})[header] || '');

test('promotion drops formatted blank Sheet rows but keeps real providers', () => {
  const provider = row({
    name_first: 'Ada',
    name_last: 'Lovelace',
    Latitude: '42',
    Longitude: '-71',
  });
  const formattedBlank = row();
  const anonymousProvider = row({
    hide_name: 'TRUE',
    work_institution: 'Example Clinic',
    Latitude: '1',
    Longitude: '2',
  });

  assert.deepEqual(
    filterProviderRows([provider, formattedBlank, anonymousProvider], WORKING_COPY_HEADERS),
    [provider, anonymousProvider],
  );
});
