import { MapPoint } from './types';
import Papa from 'papaparse';
import CryptoJS from 'crypto-js';

// Function to clean up language strings by removing punctuation and normalizing whitespace
export const cleanLanguageString = (languageString: string): string => {
  if (!languageString) return '';
  
  return languageString
    .replace(/[.,;!?()\[\]{}"'`]/g, '') // Remove common punctuation marks
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim(); // Remove leading/trailing whitespace
};

// Synchronous version for embedded data
export const parseCSVString = (csvString: string): MapPoint[] => {
  try {
    // Use Papa Parse to handle CSV parsing properly
    const { data, errors } = Papa.parse(csvString, {
      header: true, // Use field names
      dynamicTyping: true, // Automatically convert strings to numbers where appropriate
      skipEmptyLines: true
    });
    
    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
    }
    
    console.log(`Total records parsed: ${data.length}`);
    
    // Map each row by field name to MapPoint fields
    const parsedData = data as any[];
    const specialists = parsedData.filter((row: any) => {
      return row.Latitude && row.Longitude && !Number.isNaN(Number(row.Latitude)) && !Number.isNaN(Number(row.Longitude));
    }).map((row: any) => ({
      name_first: row.name_first,
      name_last: row.name_last,
      email: row.email,
      phone_work: row.phone_work,
      work_website: row.work_website,
      work_institution: row.work_institution,
      work_address: row.work_address,
      language_spoken: cleanLanguageString(row.language_spoken),
      Latitude: Number(row.Latitude),
      Longitude: Number(row.Longitude),
      City: row.City,
      Country: row.Country,
      interpreter_services: row.uses_interpreters || 'unknown',
    }));
    
    // Log specialists without coordinates
    const specialistsWithoutCoords = parsedData.filter((item: any) => {
      return !item.Latitude || !item.Longitude || 
             Number.isNaN(Number(item.Latitude)) || Number.isNaN(Number(item.Longitude));
    });
    
    console.log(`Total specialists with coordinates: ${specialists.length}`);
    console.log(`Total specialists without coordinates: ${specialistsWithoutCoords.length}`);
    
    // Let's log the first few specialists with coordinates to see what they look like
    console.log("First few specialists with coordinates:", specialists.slice(0, 3));
    console.log("First few specialists without coordinates:", specialistsWithoutCoords.slice(0, 3));
    
    return specialists as MapPoint[];
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

export const parseCSV = async (url: string): Promise<MapPoint[]> => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Use Papa Parse to handle CSV parsing properly
    const { data, errors } = Papa.parse(text, {
      header: true, // Use field names
      dynamicTyping: true, // Automatically convert strings to numbers where appropriate
      skipEmptyLines: true
    });
    
    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
    }
    
    console.log(`Total records parsed: ${data.length}`);
    
    // Map each row by field name to MapPoint fields
    const parsedData = data as any[];
    const specialists = parsedData.filter((row: any) => {
      return row.Latitude && row.Longitude && !Number.isNaN(Number(row.Latitude)) && !Number.isNaN(Number(row.Longitude));
    }).map((row: any) => ({
      name_first: row.name_first,
      name_last: row.name_last,
      email: row.email,
      phone_work: row.phone_work,
      work_website: row.work_website,
      work_institution: row.work_institution,
      work_address: row.work_address,
      language_spoken: cleanLanguageString(row.language_spoken),
      Latitude: Number(row.Latitude),
      Longitude: Number(row.Longitude),
      City: row.City,
      Country: row.Country,
      interpreter_services: row.uses_interpreters || 'unknown',
    }));
    
    // Log specialists without coordinates
    const specialistsWithoutCoords = parsedData.filter((item: any) => {
      return !item.Latitude || !item.Longitude || 
             Number.isNaN(Number(item.Latitude)) || Number.isNaN(Number(item.Longitude));
    });
    
    console.log(`Total specialists with coordinates: ${specialists.length}`);
    console.log(`Total specialists without coordinates: ${specialistsWithoutCoords.length}`);
    
    // Let's log the first few specialists with coordinates to see what they look like
    console.log("First few specialists with coordinates:", specialists.slice(0, 3));
    console.log("First few specialists without coordinates:", specialistsWithoutCoords.slice(0, 3));
    
    return specialists as MapPoint[];
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}; 

// Encryption utilities for secure data handling
// Removed ENCRYPTION_KEY constant

// XOR encryption (simple but effective for this use case)
function encryptData(data: string, key: string): string {
  if (!key || key.trim().length === 0) {
    console.warn('No encryption key provided, data will not be encrypted');
    return data;
  }
  let result = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode
}

export function simpleDecrypt(ciphertext: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
} 

// Utility to compute SHA-256 hash (hex) of a string
export function sha256Hex(str: string): string {
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
} 