const PLACEHOLDER_NAMES = new Set(['nan', 'n/a', 'na', 'null', 'undefined', '-', '--', '']);
const { normalizePhoneText } = require('./phone-validate');

function cleanLanguageString(languageString) {
  if (!languageString) return '';
  return String(languageString)
    .replace(/[.,;!?()[\]{}"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(value) {
  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    return '';
  }

  const s = String(value).trim().toLowerCase();
  if (PLACEHOLDER_NAMES.has(s)) return '';
  return value;
}

function normalizeHideFlag(value) {
  return String(cleanValue(value) || '').toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE';
}

function normalizeInterpreterServices(...values) {
  for (const value of values) {
    const cleaned = cleanValue(value);
    if (cleaned === '') continue;

    const normalized = String(cleaned).trim().toUpperCase();
    if (normalized === 'TRUE') return 'TRUE';
    if (normalized === 'FALSE') return 'FALSE';
    return String(cleaned).trim();
  }

  return 'unknown';
}

function normalizeProviderRecord(item, options = {}) {
  const logger = options.logger || console;
  const hideName = normalizeHideFlag(item.hide_name);
  const hidePhone = normalizeHideFlag(item.hide_phone);
  const hideEmail = normalizeHideFlag(item.hide_email);
  const hideWorkInstitution = normalizeHideFlag(item.hide_workinstitution);
  const hideInstitutionAddress = normalizeHideFlag(item.hide_institution_address);

  let firstName = hideName === 'TRUE' ? 'Anonymous Contributor' : cleanValue(item.name_first);
  let lastName = hideName === 'TRUE' ? '' : cleanValue(item.name_last);
  if (!firstName || firstName === '') {
    firstName = 'Anonymous Contributor';
    lastName = '';
    logger.log('Set anonymous contributor for record with missing or hidden name');
  }

  const scrubInstitutionAddress = hideInstitutionAddress === 'TRUE';
  const scrubWorkInstitution = scrubInstitutionAddress || hideWorkInstitution === 'TRUE';

  return {
    ...item,
    name_first: firstName,
    name_last: lastName,
    email: hideEmail === 'TRUE' ? '' : cleanValue(item.email),
    phone_work: hidePhone === 'TRUE' ? '' : normalizePhoneText(cleanValue(item.phone_work)),
    work_website: cleanValue(item.work_website),
    work_institution: scrubWorkInstitution ? '' : cleanValue(item.work_institution),
    job_title: cleanValue(item.job_title) || cleanValue(item.title),
    work_address: scrubInstitutionAddress ? '' : cleanValue(item.work_address),
    language_spoken: cleanLanguageString(item.language_spoken),
    interpreter_services: normalizeInterpreterServices(item.uses_interpreters, item.interpreter_services),
    City: cleanValue(item.City),
    Country: cleanValue(item.Country),
    address_street: scrubInstitutionAddress ? '' : cleanValue(item.address_street),
    address_state: scrubInstitutionAddress ? '' : cleanValue(item.address_state),
    address_zip: scrubInstitutionAddress ? '' : cleanValue(item.address_zip),
    hide_name: hideName,
    hide_phone: hidePhone,
    hide_email: hideEmail,
    hide_workinstitution: hideWorkInstitution,
    hide_institution_address: hideInstitutionAddress,
  };
}

module.exports = {
  cleanLanguageString,
  cleanValue,
  normalizeHideFlag,
  normalizeInterpreterServices,
  normalizeProviderRecord,
};
