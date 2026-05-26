export const cleanSpecialtyString = (specialtyString: string): string => {
  if (!specialtyString) return '';

  return specialtyString
    .replace(/[.,;!?()[\]{}"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const splitSpecialtyTokens = (specialties: string): string[] => {
  if (!specialties) return [];
  return specialties
    .split(',')
    .map(token => cleanSpecialtyString(token))
    .filter(Boolean);
};

const hasAny = (value: string, needles: string[]): boolean => {
  return needles.some(needle => value.includes(needle));
};

export const getSpecialtyBucketsForToken = (specialty: string): string[] => {
  const normalized = cleanSpecialtyString(specialty).toLowerCase();
  const buckets: string[] = [];

  if (normalized.length < 3 || normalized === 'na' || normalized === 'n/a') {
    return ['Other'];
  }

  if (hasAny(normalized, ['cancer', 'oncology'])) {
    buckets.push('Cancer Genetics');
  }

  if (hasAny(normalized, ['prenatal', 'perinatal', 'preconception', 'premarital', 'reproductive', 'pgt'])) {
    buckets.push('Prenatal & Reproductive Genetics');
  }

  if (
    hasAny(normalized, [
      'pediatric',
      'paediatric',
      'newborn screening',
      'pediatric neurology',
      'paediatric neurology',
      'pediatrics',
      'paediatrics',
    ])
  ) {
    buckets.push('Pediatric Genetics');
  }

  if (hasAny(normalized, ['neurogenetic', 'neurodegenerative', 'neuromuscular', 'neuro'])) {
    buckets.push('Neurogenetics');
  }

  if (hasAny(normalized, ['laboratory', 'molecular genetic', 'dtc']) || normalized === 'lab' || normalized.includes('lab ')) {
    buckets.push('Laboratory/Diagnostic Genetics');
  }

  if (hasAny(normalized, ['cardiology', 'cardiac'])) {
    buckets.push('Cardiology Genetics');
  }

  if (hasAny(normalized, ['ophthalmic', 'eye'])) {
    buckets.push('Ophthalmic Genetics');
  }

  if (hasAny(normalized, ['rare disease', 'rare genetic', 'undiagnosed'])) {
    buckets.push('Rare Disease/Undiagnosed');
  }

  const generalMatch = (
    hasAny(normalized, [
      'clinical genetic',
      'general genetics',
      'human genetic',
      'genomic medicine',
      'medical genetic',
      'genetic counseling',
      'genetic counsell',
      'all clinical',
      'clinical and metabolic genetics',
      'multi speciality',
    ]) ||
    normalized === 'clinical genetics' ||
    normalized === 'general' ||
    normalized === 'adult'
  );
  if (generalMatch || (normalized.includes('adult') && buckets.length === 0)) {
    buckets.push('General/Clinical Genetics');
  }

  if (normalized.includes('research') && buckets.length === 0) {
    buckets.push('Other');
  }

  if (buckets.length === 0) {
    buckets.push('Other');
  }

  return Array.from(new Set(buckets));
};

export const getSpecialtyBuckets = (specialties: string): string[] => {
  const buckets = splitSpecialtyTokens(specialties).flatMap(token => getSpecialtyBucketsForToken(token));
  return Array.from(new Set(buckets));
};
