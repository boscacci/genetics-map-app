const CARTO_LIGHT_BASEMAP_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export function getCartoBasemapUrl(apiKey?: string): string {
  const normalizedKey = apiKey?.trim();

  if (!normalizedKey) {
    return CARTO_LIGHT_BASEMAP_URL;
  }

  return `${CARTO_LIGHT_BASEMAP_URL}?key=${encodeURIComponent(normalizedKey)}`;
}
