import { MapPoint } from './types';

const NULL_LIKE_DISPLAY_VALUES = new Set([
  'nan',
  'null',
  'undefined',
  'n/a',
  'na',
  '-',
  '--',
]);

const cleanLanguageText = (language: string): string => {
  return language
    .replace(/[.,;!?()[\]{}"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const isNullLikeValue = (value: unknown): boolean => {
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (value === null || value === undefined) return false;

  const text = String(value).trim();
  return text.length > 0 && NULL_LIKE_DISPLAY_VALUES.has(text.toLowerCase());
};

export const cleanDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isNaN(value)) return '';

  const text = String(value).trim();
  return NULL_LIKE_DISPLAY_VALUES.has(text.toLowerCase()) ? '' : text;
};

export const isFlagTrue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  return String(value ?? '').trim().toUpperCase() === 'TRUE';
};

export const displayName = (first: unknown, last: unknown): string => {
  const parts = [cleanDisplayValue(first), cleanDisplayValue(last)].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Anonymous Contributor';
};

export const displayInstitution = (institution: unknown): string => {
  return cleanDisplayValue(institution) || 'Institution Unknown';
};

export const displayLocation = (city: unknown, country: unknown): string => {
  return [cleanDisplayValue(city), cleanDisplayValue(country)].filter(Boolean).join(', ');
};

export const formatLanguages = (languages: unknown): string => {
  const displayValue = cleanDisplayValue(languages);
  if (!displayValue) return '';

  return displayValue
    .split(/,|;|\sand\s|\s+/)
    .map((language) => cleanLanguageText(language))
    .filter(Boolean)
    .join(', ');
};

export const formatInterpreterServices = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Available' : 'Not available';

  const normalized = cleanDisplayValue(value).toUpperCase();
  if (normalized === 'TRUE') return 'Available';
  if (normalized === 'FALSE') return 'Not available';
  return 'Not specified';
};

export const shouldShowInstitution = (specialist: MapPoint): boolean => {
  return !isFlagTrue(specialist.hide_workinstitution)
    && !isFlagTrue(specialist.hide_institution_address);
};

const normalizeAddressToken = (value: unknown): string => {
  return cleanDisplayValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '');
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getCountryVariants = (country: unknown): string[] => {
  const value = cleanDisplayValue(country);
  const normalized = normalizeAddressToken(value);
  const variants = new Set<string>();

  if (value) variants.add(value);
  if (normalized === 'united states') {
    variants.add('USA');
    variants.add('US');
    variants.add('U.S.A.');
    variants.add('United States of America');
  }
  if (normalized === 'united kingdom') {
    variants.add('UK');
    variants.add('U.K.');
    variants.add('Great Britain');
  }

  return Array.from(variants);
};

const cleanAddressFragment = (fragment: string, variants: string[]): string => {
  let cleaned = cleanDisplayValue(fragment);
  if (!cleaned) return '';

  const orderedVariants = variants
    .map((variant) => cleanDisplayValue(variant))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  for (let pass = 0; pass < 2; pass += 1) {
    for (const variant of orderedVariants) {
      const escaped = escapeRegExp(variant);
      cleaned = cleaned.replace(new RegExp(`^${escaped}(?:[\\s,./-]+|$)`, 'i'), '');
      cleaned = cleaned.replace(new RegExp(`(?:[\\s,./-]+|^)${escaped}$`, 'i'), '');
    }
  }

  return cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^[,.\s/-]+|[,.\s/-]+$/g, '')
    .trim();
};

export interface DisplayAddress {
  detailLine: string;
  structuredLine: string;
  copyValue: string;
}

export const displayFullAddress = (specialist: MapPoint): DisplayAddress => {
  const street = cleanDisplayValue(specialist.address_street);
  const city = cleanDisplayValue(specialist.City);
  const state = cleanDisplayValue(specialist.address_state);
  const zip = cleanDisplayValue(specialist.address_zip);
  const country = cleanDisplayValue(specialist.Country);
  const stateZip = [state, zip].filter(Boolean).join(' ');
  const cityLine = [city, stateZip].filter(Boolean).join(', ');
  const structuredLine = [street, cityLine, country].filter(Boolean).join(', ');
  const cityNoArticle = city.replace(/^the\s+/i, '').trim();
  const variants = [
    street,
    city,
    cityNoArticle,
    state,
    zip,
    stateZip,
    cityLine,
    ...getCountryVariants(country),
  ].filter(Boolean);
  const variantSet = new Set(variants.map((variant) => normalizeAddressToken(variant)));
  const rawFreeText = cleanDisplayValue(specialist.work_address);

  let detailLine = rawFreeText
    ? rawFreeText
      .split(',')
      .map((fragment) => cleanAddressFragment(fragment, variants))
      .filter(Boolean)
      .filter((fragment) => !variantSet.has(normalizeAddressToken(fragment)))
      .filter((fragment, index, all) => {
        const normalized = normalizeAddressToken(fragment);
        return all.findIndex((item) => normalizeAddressToken(item) === normalized) === index;
      })
      .join(', ')
    : '';

  if (!detailLine && rawFreeText) {
    const whole = cleanAddressFragment(rawFreeText, variants);
    if (whole && !variantSet.has(normalizeAddressToken(whole))) {
      detailLine = whole;
    }
  }

  if (!detailLine) {
    const normalizedStructured = normalizeAddressToken(structuredLine);
    if (rawFreeText && normalizeAddressToken(rawFreeText) !== normalizedStructured) {
      detailLine = rawFreeText;
    }
  }

  return {
    detailLine,
    structuredLine,
    copyValue: [detailLine, structuredLine].filter(Boolean).join('\n'),
  };
};

export interface WebsiteDetails {
  displayValue: string;
  href: string | null;
}

export const getWebsiteDetails = (website: unknown): WebsiteDetails => {
  const displayValue = cleanDisplayValue(website);
  if (!displayValue) return { displayValue: '', href: null };

  const candidate = /^https?:\/\//i.test(displayValue) ? displayValue : `https://${displayValue}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { displayValue, href: null };
    }
    return { displayValue, href: url.toString() };
  } catch {
    return { displayValue, href: null };
  }
};

export const hasPrivateContactDetails = (specialist: MapPoint): boolean => {
  const privacyFlags = [
    specialist.hide_email,
    specialist.hide_phone,
    specialist.hide_workinstitution,
    specialist.hide_institution_address,
  ];
  if (privacyFlags.some((value) => isFlagTrue(value))) return true;

  const rawContactValues: unknown[] = [
    specialist.email,
    specialist.phone_work,
    specialist.work_website,
    specialist.work_institution,
    specialist.work_address,
    specialist.address_street,
    specialist.address_state,
    specialist.address_zip,
  ];
  return rawContactValues.some((value) => isNullLikeValue(value));
};
