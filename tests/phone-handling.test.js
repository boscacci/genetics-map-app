const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizePhoneText,
  stripSheetTextEscape,
} = require('../scripts/lib/phone-validate');
const {
  buildPhoneColumnPlainTextRequests,
  phoneColumnIndex,
} = require('../scripts/lib/sheet-formatting');
const {
  PRODUCTION_HEADERS,
  WORKING_COPY_HEADERS,
} = require('../scripts/lib/sheet-schema');

test('phone normalization removes only the Google Sheets text escape', () => {
  assert.equal(stripSheetTextEscape("'+1 404 555 1212"), '+1 404 555 1212');
  assert.equal(normalizePhoneText("'+91-044-28296490"), '+91-044-28296490');
  assert.equal(normalizePhoneText('+44 20 7946 0958'), '+44 20 7946 0958');
  assert.equal(normalizePhoneText('#ERROR!'), '');
});

test('phone_work is column F in working copy and production schemas', () => {
  assert.equal(phoneColumnIndex(WORKING_COPY_HEADERS), 5);
  assert.equal(phoneColumnIndex(PRODUCTION_HEADERS), 5);
});

test('sheet formatting requests mark phone_work columns as plain text', () => {
  const requests = buildPhoneColumnPlainTextRequests(new Map([
    ['Working Copy', 111],
    ['Production', 222],
  ]));

  assert.deepEqual(requests.map(r => r.repeatCell.range), [
    { sheetId: 111, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 },
    { sheetId: 222, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 },
  ]);
  assert.ok(requests.every(r => r.repeatCell.cell.userEnteredFormat.numberFormat.type === 'TEXT'));
});
