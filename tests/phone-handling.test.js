const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  normalizePhoneText,
  stripSheetTextEscape,
} = require('../scripts/lib/phone-validate');
const {
  BOOLEAN_SHARED_HEADERS,
  BOOLEAN_WORKING_COPY_HEADERS,
  buildBooleanColumnValidationRequests,
  buildPhoneColumnPlainTextRequests,
  buildTextColumnValidationClearRequests,
  phoneColumnIndex,
  TEXT_VALIDATION_CLEAR_HEADERS,
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

test('sheet formatting makes boolean-ish admin columns TRUE/FALSE dropdowns', () => {
  const requests = buildBooleanColumnValidationRequests(new Map([
    ['Working Copy', 111],
    ['Production', 222],
  ]));

  assert.deepEqual(BOOLEAN_SHARED_HEADERS, ['hide_workinstitution', 'hide_institution_address', 'uses_interpreters']);
  assert.deepEqual(BOOLEAN_WORKING_COPY_HEADERS, ['signed_up_for_newsletter']);
  assert.ok(!BOOLEAN_SHARED_HEADERS.includes('job_title'));
  assert.ok(!BOOLEAN_WORKING_COPY_HEADERS.includes('job_title'));
  assert.deepEqual(requests.map(r => r.setDataValidation.range), [
    { sheetId: 111, startRowIndex: 1, startColumnIndex: 9, endColumnIndex: 10 },
    { sheetId: 111, startRowIndex: 1, startColumnIndex: 12, endColumnIndex: 13 },
    { sheetId: 111, startRowIndex: 1, startColumnIndex: 14, endColumnIndex: 15 },
    { sheetId: 222, startRowIndex: 1, startColumnIndex: 9, endColumnIndex: 10 },
    { sheetId: 222, startRowIndex: 1, startColumnIndex: 12, endColumnIndex: 13 },
    { sheetId: 222, startRowIndex: 1, startColumnIndex: 14, endColumnIndex: 15 },
    { sheetId: 111, startRowIndex: 1, startColumnIndex: 24, endColumnIndex: 25 },
  ]);
  assert.ok(requests.every(r => r.setDataValidation.rule.condition.type === 'ONE_OF_LIST'));
  assert.ok(requests.every(r => !Object.hasOwn(r.setDataValidation.rule, 'strict')));
  assert.ok(requests.every(r => r.setDataValidation.rule.showCustomUi === true));
  assert.deepEqual(
    requests.map(r => r.setDataValidation.rule.condition.values),
    [
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
      [{ userEnteredValue: 'TRUE' }, { userEnteredValue: 'FALSE' }],
    ],
  );
});

test('sheet formatting clears strict validation from free-entry columns', () => {
  const requests = buildTextColumnValidationClearRequests(new Map([
    ['Working Copy', 111],
    ['Production', 222],
  ]));

  assert.deepEqual(TEXT_VALIDATION_CLEAR_HEADERS, ['job_title']);
  assert.deepEqual(requests.map(r => r.setDataValidation.range), [
    { sheetId: 111, startRowIndex: 1, startColumnIndex: 10, endColumnIndex: 11 },
    { sheetId: 222, startRowIndex: 1, startColumnIndex: 10, endColumnIndex: 11 },
  ]);
  assert.ok(requests.every(r => !Object.hasOwn(r.setDataValidation, 'rule')));
});

test('sheet macro formats admin booleans as TRUE/FALSE dropdowns instead of checkboxes', () => {
  const macro = fs.readFileSync(path.resolve(__dirname, '../scripts/promote.gs'), 'utf8');

  assert.match(
    macro,
    /setBooleanTextValidation\(getColumnBodyRange\(sheet, 'hide_workinstitution'\)\)/,
  );
  assert.match(
    macro,
    /setBooleanTextValidation\(getColumnBodyRange\(sheet, 'hide_institution_address'\)\)/,
  );
  assert.match(
    macro,
    /setBooleanTextValidation\(getColumnBodyRange\(sheet, 'uses_interpreters'\)\)/,
  );
  assert.match(
    macro,
    /setBooleanTextValidation\(getColumnBodyRange\(workingCopy, 'signed_up_for_newsletter'\)\)/,
  );
  assert.match(
    macro,
    /requireValueInList\(\['TRUE', 'FALSE'\], true\)/,
  );
  assert.doesNotMatch(
    macro,
    /requireCheckbox\(\)/,
  );
});
