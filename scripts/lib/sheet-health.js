const { summarizePublishRows } = require('./publish-diagnostics');

function profileSheetRows(rows, expectedHeaders) {
  const headerRow = rows[0] || [];
  const indexByHeader = {};
  headerRow.forEach((header, index) => {
    indexByHeader[String(header || '').trim()] = index;
  });

  const missingHeaders = expectedHeaders.filter((header) => indexByHeader[header] === undefined);
  const records = rows.slice(1).map((row) => Object.fromEntries(
    headerRow.map((header, index) => [String(header || '').trim(), row[index] ?? '']),
  ));
  const summary = summarizePublishRows(records, { maxExamples: 0 });

  return {
    missingHeaders,
    providerRows: summary.totalRows,
    publishableRows: summary.publishableRows,
    skippedRows: summary.skippedRows,
    skippedByReason: summary.skippedByReason,
  };
}

function evaluateSheetSync(workingCopy, production) {
  const problems = [];

  if (workingCopy.missingHeaders.length > 0) {
    problems.push(`Working Copy is missing expected columns: ${workingCopy.missingHeaders.join(', ')}`);
  }
  if (production.missingHeaders.length > 0) {
    problems.push(`Production is missing expected columns: ${production.missingHeaders.join(', ')}`);
  }
  if (workingCopy.providerRows === 0) {
    problems.push('Working Copy has no provider rows');
  }
  if (workingCopy.publishableRows === 0) {
    problems.push('Working Copy has no provider rows with usable coordinates');
  }
  if (production.publishableRows !== workingCopy.publishableRows) {
    problems.push(
      `Production publishable count ${production.publishableRows} does not match Working Copy ${workingCopy.publishableRows}`,
    );
  }

  return {
    healthy: problems.length === 0,
    problems,
  };
}

module.exports = {
  evaluateSheetSync,
  profileSheetRows,
};
