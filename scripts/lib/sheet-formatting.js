const {
  PRODUCTION_HEADERS,
  WORKING_COPY_HEADERS,
} = require('./sheet-schema');

const PHONE_HEADER = 'phone_work';

function phoneColumnIndex(headers) {
  const index = headers.indexOf(PHONE_HEADER);
  if (index === -1) {
    throw new Error(`Missing ${PHONE_HEADER} column in sheet headers`);
  }
  return index;
}

function buildPlainTextColumnRequest(sheetId, columnIndex) {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
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

async function applyPhoneColumnPlainTextFormat(sheets, spreadsheetId) {
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

  const requests = buildPhoneColumnPlainTextRequests(sheetIdByTitle);
  if (requests.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

module.exports = {
  PHONE_HEADER,
  applyPhoneColumnPlainTextFormat,
  buildPhoneColumnPlainTextRequests,
  buildPlainTextColumnRequest,
  phoneColumnIndex,
};
