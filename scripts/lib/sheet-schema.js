const PRODUCTION_HEADERS = [
  'name_first', 'name_last', 'hide_name',
  'email', 'hide_email',
  'phone_work', 'hide_phone',
  'work_website', 'work_institution', 'hide_workinstitution', 'job_title', 'work_address', 'hide_institution_address',
  'language_spoken', 'uses_interpreters', 'specialties',
  'Latitude', 'Longitude', 'City', 'Country',
  'credential_link',
  'address_street', 'address_state', 'address_zip',
];

const WORKING_COPY_HEADERS = [
  ...PRODUCTION_HEADERS,
  'signed_up_for_newsletter',
];

function columnName(index) {
  let n = index + 1;
  let name = '';

  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }

  return name;
}

function sheetRange(headers) {
  return `A:${columnName(headers.length - 1)}`;
}

function headerRowRange(headers) {
  return `A1:${columnName(headers.length - 1)}1`;
}

const PRODUCTION_LAST_COLUMN = columnName(PRODUCTION_HEADERS.length - 1);
const PRODUCTION_SHEET_RANGE_A1 = sheetRange(PRODUCTION_HEADERS);
const PRODUCTION_HEADER_ROW_RANGE_A1 = headerRowRange(PRODUCTION_HEADERS);
const WORKING_COPY_LAST_COLUMN = columnName(WORKING_COPY_HEADERS.length - 1);
const WORKING_COPY_SHEET_RANGE_A1 = sheetRange(WORKING_COPY_HEADERS);
const WORKING_COPY_HEADER_ROW_RANGE_A1 = headerRowRange(WORKING_COPY_HEADERS);
const PUBLIC_HEADERS = PRODUCTION_HEADERS.filter((header) => header !== 'credential_link');

module.exports = {
  HEADER_ROW_RANGE_A1: PRODUCTION_HEADER_ROW_RANGE_A1,
  LAST_COLUMN: PRODUCTION_LAST_COLUMN,
  PRODUCTION_HEADER_ROW_RANGE_A1,
  PRODUCTION_HEADERS,
  PRODUCTION_LAST_COLUMN,
  PRODUCTION_SHEET_RANGE_A1,
  PUBLIC_HEADERS,
  SHEET_HEADERS: PRODUCTION_HEADERS,
  SHEET_RANGE_A1: PRODUCTION_SHEET_RANGE_A1,
  WORKING_COPY_HEADER_ROW_RANGE_A1,
  WORKING_COPY_HEADERS,
  WORKING_COPY_LAST_COLUMN,
  WORKING_COPY_SHEET_RANGE_A1,
  columnName,
  headerRowRange,
  sheetRange,
};
