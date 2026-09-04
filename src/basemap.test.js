import { getCartoBasemapUrl } from './basemap';

describe('getCartoBasemapUrl', () => {
  test('adds an encoded CARTO key to the raster tile URL', () => {
    expect(getCartoBasemapUrl(' test/key+value ')).toBe(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=test%2Fkey%2Bvalue',
    );
  });

  test('keeps credential-free local and CI builds possible', () => {
    expect(getCartoBasemapUrl(undefined)).toBe(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    );
  });
});
