const {
  PRODUCTION_HEADERS,
  WORKING_COPY_HEADERS,
} = require('./sheet-schema');

const PHONE_HEADER = 'phone_work';
const BOOLEAN_WORKING_COPY_HEADERS = ['signed_up_for_newsletter'];
const TEXT_VALIDATION_CLEAR_HEADERS = ['job_title'];

function columnIndex(headers, header) {
  const index = headers.indexOf(header);
  if (index === -1) {
    throw new Error(`Missing ${header} column in sheet headers`);
  }
  return index;
}

function phoneColumnIndex(headers) {
  return columnIndex(headers, PHONE_HEADER);
}

function columnRange(sheetId, columnIndex) {
  return {
    sheetId,
    startRowIndex: 1,
    startColumnIndex: columnIndex,
    endColumnIndex: columnIndex + 1,
  };
}

function buildPlainTextColumnRequest(sheetId, columnIndex) {
  return {
    repeatCell: {
      range: columnRange(sheetId, columnIndex),
      cell: {
        userEnteredFormat: {
          numberFormat: {
            type: 'TEXT',
          },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  };
}

function buildPhoneColumnPlainTextRequests(sheetIdByTitle) {
  const requests = [];
  const targets = [
    ['Working Copy', WORKING_COPY_HEADERS],
    ['Production', PRODUCTION_HEADERS],
  ];

  for (const [title, headers] of targets) {
    const sheetId = sheetIdByTitle.get(title);
    if (sheetId === undefined) continue;
    requests.push(buildPlainTextColumnRequest(sheetId, phoneColumnIndex(headers)));
  }

  return requests;
}

function buildBooleanColumnValidationRequests(sheetIdByTitle) {
  const sheetId = sheetIdByTitle.get('Working Copy');
  if (sheetId === undefined) return [];

  return BOOLEAN_WORKING_COPY_HEADERS.map((header) => ({
    setDataValidation: {
      range: columnRange(sheetId, columnIndex(WORKING_COPY_HEADERS, header)),
      rule: {
        condition: {
          type: 'BOOLEAN',
        },
        strict: true,
        showCustomUi: true,
      },
    },
  }));
}

function buildTextColumnValidationClearRequests(sheetIdByTitle) {
  const requests = [];
  const targets = [
    ['Working Copy', WORKING_COPY_HEADERS],
    ['Production', PRODUCTION_HEADERS],
  ];

  for (const [title, headers] of targets) {
    const sheetId = sheetIdByTitle.get(title);
    if (sheetId === undefined) continue;
    for (const header of TEXT_VALIDATION_CLEAR_HEADERS) {
      requests.push({
        setDataValidation: {
          range: columnRange(sheetId, columnIndex(headers, header)),
        },
      });
    }
  }

  return requests;
}

function buildSheetFormattingRequests(sheetIdByTitle) {
  return [
    ...buildPhoneColumnPlainTextRequests(sheetIdByTitle),
    ...buildBooleanColumnValidationRequests(sheetIdByTitle),
    ...buildTextColumnValidationClearRequests(sheetIdByTitle),
  ];
}

async function applySheetColumnFormatting(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });
  const sheetIdByTitle = new Map();
  for (const sheet of res.data.sheets || []) {
    const props = sheet.properties || {};
    if (props.title && props.sheetId !== undefined) {
      sheetIdByTitle.set(props.title, props.sheetId);
    }
  }

  const requests = buildSheetFormattingRequests(sheetIdByTitle);
  if (requests.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

module.exports = {
  BOOLEAN_WORKING_COPY_HEADERS,
  PHONE_HEADER,
  TEXT_VALIDATION_CLEAR_HEADERS,
  applyPhoneColumnPlainTextFormat,
  applySheetColumnFormatting,
  buildBooleanColumnValidationRequests,
  buildPhoneColumnPlainTextRequests,
  buildPlainTextColumnRequest,
  buildSheetFormattingRequests,
  buildTextColumnValidationClearRequests,
  columnIndex,
  phoneColumnIndex,
};

async function applyPhoneColumnPlainTextFormat(sheets, spreadsheetId) {
  return applySheetColumnFormatting(sheets, spreadsheetId);
}
