const assert = require('node:assert/strict');
const test = require('node:test');

require('ts-node/register');

const {
  getSpecialtyBuckets,
  splitSpecialtyTokens,
} = require('../src/specialtyUtils');

test('specialties are separated by commas, not by the word and', () => {
  const tokens = splitSpecialtyTokens('Cancer genetics, prenatal genetics, pediatric and adult rare genetics');

  assert.deepEqual(tokens, [
    'Cancer genetics',
    'prenatal genetics',
    'pediatric and adult rare genetics',
  ]);
});

test('compound specialty phrases can match multiple relevant buckets', () => {
  const buckets = getSpecialtyBuckets('Cancer genetics, prenatal genetics, pediatric and adult rare genetics');

  assert.deepEqual(buckets, [
    'Cancer Genetics',
    'Prenatal & Reproductive Genetics',
    'Pediatric Genetics',
    'Rare Disease/Undiagnosed',
  ]);
});
