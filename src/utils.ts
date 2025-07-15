import { GeneticSpecialist } from './types';
import Papa from 'papaparse';

// Function to clean up language strings by removing punctuation and normalizing whitespace
const cleanLanguageString = (languageString: string): string => {
  if (!languageString) return '';
  
  return languageString
    .replace(/[.,;!?()\[\]{}"'`]/g, '') // Remove common punctuation marks
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim(); // Remove leading/trailing whitespace
};

// Synchronous version for embedded data
export const parseCSVString = (csvString: string): GeneticSpecialist[] => {
  try {
    // Use Papa Parse to handle CSV parsing properly
    const { data, errors } = Papa.parse(csvString, {
      header: true,
      dynamicTyping: true, // Automatically convert strings to numbers where appropriate
      skipEmptyLines: true
    });
    
    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
    }
    
    console.log(`Total records parsed: ${data.length}`);
    
    // Type as any[] first since Papa Parse returns a generic object array
    const parsedData = data as any[];
    
    // Filter specialists with valid coordinates and clean up language strings
    const specialists = parsedData.filter(item => {
      return item.Latitude && item.Longitude && 
             !isNaN(item.Latitude) && !isNaN(item.Longitude);
    }).map(item => ({
      ...item,
      language_spoken: cleanLanguageString(item.Languages || '')
    }));
    
    // Log specialists without coordinates
    const specialistsWithoutCoords = parsedData.filter(item => {
      return !item.Latitude || !item.Longitude || 
             isNaN(item.Latitude) || isNaN(item.Longitude);
    });
    
    console.log(`Total specialists with coordinates: ${specialists.length}`);
    console.log(`Total specialists without coordinates: ${specialistsWithoutCoords.length}`);
    
    // Let's log the first few specialists with coordinates to see what they look like
    console.log("First few specialists with coordinates:", specialists.slice(0, 3));
    console.log("First few specialists without coordinates:", specialistsWithoutCoords.slice(0, 3));
    
    return specialists as GeneticSpecialist[];
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

export const parseCSV = async (url: string): Promise<GeneticSpecialist[]> => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Use Papa Parse to handle CSV parsing properly
    const { data, errors } = Papa.parse(text, {
      header: true,
      dynamicTyping: true, // Automatically convert strings to numbers where appropriate
      skipEmptyLines: true
    });
    
    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
    }
    
    console.log(`Total records parsed: ${data.length}`);
    
    // Type as any[] first since Papa Parse returns a generic object array
    const parsedData = data as any[];
    
    // Filter specialists with valid coordinates and clean up language strings
    const specialists = parsedData.filter(item => {
      return item.Latitude && item.Longitude && 
             !isNaN(item.Latitude) && !isNaN(item.Longitude);
    }).map(item => ({
      ...item,
      language_spoken: cleanLanguageString(item.language_spoken || '')
    }));
    
    // Log specialists without coordinates
    const specialistsWithoutCoords = parsedData.filter(item => {
      return !item.Latitude || !item.Longitude || 
             isNaN(item.Latitude) || isNaN(item.Longitude);
    });
    
    console.log(`Total specialists with coordinates: ${specialists.length}`);
    console.log(`Total specialists without coordinates: ${specialistsWithoutCoords.length}`);
    
    // Let's log the first few specialists with coordinates to see what they look like
    console.log("First few specialists with coordinates:", specialists.slice(0, 3));
    console.log("First few specialists without coordinates:", specialistsWithoutCoords.slice(0, 3));
    
    return specialists as GeneticSpecialist[];
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}; 