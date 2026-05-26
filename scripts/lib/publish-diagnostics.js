const BLANK_PLACEHOLDERS = new Set(['nan', 'n/a', 'na', 'null', 'undefined', '-', '--']);
const PROVIDER_CONTENT_FIELDS = [
  'name_first',
  'name_last',
  'email',
  'phone_work',
  'work_website',
  'work_institution',
  'job_title',
  'work_address',
  'language_spoken',
  'specialties',
  'Latitude',
  'Longitude',
  'City',
  'Country',
  'address_street',
  'address_state',
  'address_zip',
];

function isBlank(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '' || BLANK_PLACEHOLDERS.has(normalized);
}

function isBlankRow(row) {
  const contentFields = PROVIDER_CONTENT_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(row, field));
  const values = contentFields.length > 0
    ? contentFields.map((field) => row[field])
    : Object.values(row);
  return values.every(isBlank);
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
  return rows.filter((row) => !isBlankRow(row) && !coordinateSkipReason(row));
}

function summarizePublishRows(rows, options = {}) {
  const maxExamples = options.maxExamples ?? 10;
  const skippedByReason = {};
  const examples = [];
  let totalRows = 0;

  rows.forEach((row, index) => {
    if (isBlankRow(row)) return;
    totalRows += 1;

    const reason = coordinateSkipReason(row);
    if (!reason) return;

    skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
    if (examples.length < maxExamples) {
      examples.push({ rowNumber: index + 2, reason });
    }
  });

  const skippedRows = Object.values(skippedByReason).reduce((sum, count) => sum + count, 0);
  return {
    totalRows,
    publishableRows: totalRows - skippedRows,
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
  isBlankRow,
  summarizePublishRows,
};
