const PLACEHOLDER_VALUES = new Set(['', 'nan', 'n/a', 'na', 'null', 'undefined', '-', '--']);

function isBlankRequiredValue(value) {
  if (value === null || value === undefined) return true;
  return PLACEHOLDER_VALUES.has(String(value).trim().toLowerCase());
}

function findMissingRequiredFields(dataRows, idxByHeader, requiredHeaders, options = {}) {
  const missing = [];
  const isRowExempt = options.isRowExempt || (() => false);

  for (const header of requiredHeaders) {
    const columnIndex = idxByHeader[header];
    if (columnIndex === undefined) {
      missing.push({ header, rowNumber: 1, reason: 'missing_column' });
      continue;
    }

    dataRows.forEach((row, rowIndex) => {
      if (isBlankRequiredValue(row[columnIndex]) && !isRowExempt({ row, rowIndex, header, columnIndex })) {
        missing.push({ header, rowNumber: rowIndex + 2, reason: 'blank_value' });
      }
    });
  }

  return missing;
}

function formatMissingRequiredFields(missing) {
  const missingColumns = missing.filter((item) => item.reason === 'missing_column');
  const blankValues = missing.filter((item) => item.reason === 'blank_value');
  const messages = [];

  for (const item of missingColumns) {
    messages.push(`Missing required column: ${item.header}`);
  }

  if (blankValues.length > 0) {
    const examples = blankValues.slice(0, 10).map((item) => `${item.header} row ${item.rowNumber}`).join(', ');
    const suffix = blankValues.length > 10 ? `, and ${blankValues.length - 10} more` : '';
    messages.push(`Missing required values: ${examples}${suffix}`);
  }

  return messages.join('\n');
}

module.exports = {
  findMissingRequiredFields,
  formatMissingRequiredFields,
  isBlankRequiredValue,
};
