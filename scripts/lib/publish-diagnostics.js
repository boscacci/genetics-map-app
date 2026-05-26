function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function coordinateSkipReason(row) {
  if (isBlank(row.Latitude) || isBlank(row.Longitude)) {
    return 'missing_coordinates';
  }

  if (!Number.isFinite(Number(row.Latitude)) || !Number.isFinite(Number(row.Longitude))) {
    return 'invalid_coordinates';
  }

  return null;
}

function buildPublishRows(rows) {
  return rows.filter((row) => !coordinateSkipReason(row));
}

function summarizePublishRows(rows, options = {}) {
  const maxExamples = options.maxExamples ?? 10;
  const skippedByReason = {};
  const examples = [];

  rows.forEach((row, index) => {
    const reason = coordinateSkipReason(row);
    if (!reason) return;

    skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
    if (examples.length < maxExamples) {
      examples.push({ rowNumber: index + 2, reason });
    }
  });

  const skippedRows = Object.values(skippedByReason).reduce((sum, count) => sum + count, 0);
  return {
    totalRows: rows.length,
    publishableRows: rows.length - skippedRows,
    skippedRows,
    skippedByReason,
    examples,
  };
}

function formatPublishSummary(summary) {
  const parts = Object.entries(summary.skippedByReason)
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(', ');
  const suffix = parts ? ` (${parts})` : '';
  return `Map publish rows: ${summary.publishableRows}/${summary.totalRows} rows have usable coordinates; skipped ${summary.skippedRows}${suffix}.`;
}

function formatSkippedExamples(summary) {
  if (!summary.examples.length) return '';
  return `Skipped row examples: ${summary.examples
    .map((item) => `row ${item.rowNumber} ${item.reason}`)
    .join(', ')}.`;
}

module.exports = {
  buildPublishRows,
  coordinateSkipReason,
  formatPublishSummary,
  formatSkippedExamples,
  summarizePublishRows,
};
