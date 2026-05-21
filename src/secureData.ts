import { ENCRYPTED_SPECIALISTS_DATA } from './secureDataBlob';
import { simpleDecrypt } from './utils';
import { MapPoint } from './types';

export function loadSecureData(key: string, encryptedData = ENCRYPTED_SPECIALISTS_DATA): MapPoint[] {
  try {
    const decrypted = simpleDecrypt(encryptedData, key);
    return JSON.parse(decrypted) as MapPoint[];
  } catch (e) {
    console.error('Failed to load secure data:', e);
    return [];
  }
}

export const publicData: MapPoint[] = [];
