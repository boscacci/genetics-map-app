import { ENCRYPTED_SPECIALISTS_DATA } from './secureDataBlob';
import { simpleDecrypt } from './utils';
import { MapPoint } from './types';

export function loadSecureData(key: string): MapPoint[] {
  try {
    const decrypted = simpleDecrypt(ENCRYPTED_SPECIALISTS_DATA, key);
    return JSON.parse(decrypted) as MapPoint[];
  } catch (e) {
    console.error('Failed to load secure data:', e);
    return [];
  }
}

export const publicData: MapPoint[] = []; 