function geocodeInstitutionAddresses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Map column names to their indices for easy lookup
  const colIndex = {};
  headers.forEach((header, idx) => {
    colIndex[header.trim()] = idx;
  });

  // These are the columns we care about, by name
  const WORK_INSTITUTION = 'work_institution';
  const WORK_ADDRESS = 'work_address';

  // We'll write geocoding results to columns after the last column in the sheet
  // But for compatibility, let's check if the columns already exist, else append
  // We'll use: Latitude, Longitude, City, Country
  const geoHeaders = ['Latitude', 'Longitude', 'City', 'Country'];
  let geoStartCol = headers.length + 1; // 1-based for getRange

  // If the headers already exist, use their positions
  geoHeaders.forEach((h, i) => {
    const idx = headers.indexOf(h);
    if (idx !== -1) geoStartCol = Math.min(geoStartCol, idx + 1);
  });

  // Write header row for geocoding columns
  sheet.getRange(1, geoStartCol, 1, geoHeaders.length).setValues([geoHeaders]);

  // Conservative settings to avoid API limits
  const MAX_ROWS_TO_PROCESS = 50; // Process only first 50 rows at a time
  const DELAY_BETWEEN_CALLS = 200; // 1 second delay between API calls

  const geocoder = Maps.newGeocoder().setLanguage('en');

  Logger.log('Starting geocodeInstitutionAddresses – total rows: ' + (data.length - 1));
  console.log({message:'Start geocoding','totalRows':data.length - 1});

  // Helper function to extract location data from geocoding result
  function extractLocationData(result) {
    let lat = '', lng = '', city = '', country = '';
    
    if (result && result.geometry && result.geometry.location) {
      lat = result.geometry.location.lat;
      lng = result.geometry.location.lng;
    }
    
    if (result && result.address_components) {
      result.address_components.forEach(comp => {
        if (comp.types.includes('locality')) {
          city = comp.long_name; // Use long_name instead of short_name for better city names
        } else if (comp.types.includes('administrative_area_level_1') && !city) {
          // If no locality found, try administrative_area_level_1 (state/province)
          // but only if it looks like a city name
          if (isValidCity(comp.long_name)) {
            city = comp.long_name;
          }
        } else if (comp.types.includes('country')) {
          country = comp.long_name;
        }
      });
    }
    
    // Validate the extracted city
    if (city && !isValidCity(city)) {
      city = ''; // Clear invalid city names
    }
    
    return { lat, lng, city, country };
  }

  // Helper function to check if a value is effectively empty or "nan"
  function isEmptyOrNan(value) {
    if (!value) return true;
    const str = String(value).trim().toLowerCase();
    return str === '' || str === 'nan' || str === 'null' || str === 'undefined';
  }

  // Helper function to check if we have complete data
  function isCompleteData(data) {
    return data.lat && data.lng && data.city && data.country;
  }

  // Helper function to validate if a string is a reasonable city name
  function isValidCity(city) {
    if (!city || city.length < 2 || city.length > 50) return false;
    
    // Reject if it's just numbers
    if (/^\d+$/.test(city)) return false;
    
    // Reject common non-city terms
    const rejectTerms = [
      'usa', 'united states', 'canada', 'uk', 'united kingdom', 'australia', 
      'india', 'pakistan', 'south africa', 'new zealand', 'ireland', 'germany',
      'france', 'spain', 'italy', 'brazil', 'china', 'japan', 'korea',
      'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr', 
      'boulevard', 'blvd', 'lane', 'ln', 'way', 'place', 'pl', 'court', 'ct',
      'hospital', 'medical center', 'clinic', 'center', 'centre', 'university',
      'college', 'school', 'institute', 'foundation', 'building', 'tower',
      'box', 'po box', 'p.o. box', 'suite', 'unit', 'floor', 'level',
      'north', 'south', 'east', 'west', 'central', 'western', 'eastern',
      'northern', 'southern', 'upper', 'lower', 'new', 'old'
    ];
    
    const lowerCity = city.toLowerCase();
    for (const term of rejectTerms) {
      if (lowerCity.includes(term)) return false;
    }
    
    // Reject if it contains numbers (likely street address)
    if (/\d/.test(city)) return false;
    
    // Reject if it contains postal codes
    if (/\b\d{5}(-\d{4})?\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/.test(city)) return false;
    
    return true;
  }

  // Helper function to extract city from work_address field
  function extractCityFromAddress(address) {
    if (!address || isEmptyOrNan(address)) return '';
    
    const addr = String(address).trim();
    
    // Split by commas and analyze each part
    const parts = addr.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    // Strategy 1: Look for the last part that looks like a city (before country/state)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (isValidCity(part)) {
        return part;
      }
    }
    
    // Strategy 2: Look for city patterns in the middle parts
    for (let i = 1; i < parts.length - 1; i++) {
      const part = parts[i];
      if (isValidCity(part)) {
        return part;
      }
    }
    
    // Strategy 3: If no commas, check if the whole thing is a valid city
    if (!addr.includes(',') && isValidCity(addr)) {
      return addr;
    }
    
    return '';
  }

  // Helper function to perform geocoding with retries (conservative approach)
  function smartGeocode(geocoder, inst, addr) {
    // Filter out empty and "nan" values before creating attempts
    const validInst = isEmptyOrNan(inst) ? '' : inst;
    const validAddr = isEmptyOrNan(addr) ? '' : addr;
    
    // Conservative: try 3 attempts maximum to reduce API calls
    const attempts = [
      // Primary: full combined address
      [validInst, validAddr].filter(Boolean).join(', '),
      // Secondary: just work address (often contains city info)
      validAddr,
      // Fallback: just institution name (most likely to be unique)
      validInst
    ].filter(Boolean); // Remove empty strings
    
    let bestResult = { lat: '', lng: '', city: '', country: '' };
    let bestScore = 0;
    
    for (let i = 0; i < attempts.length; i++) {
      const query = attempts[i];
      if (!query) continue;
      
      Logger.log(`Attempt ${i + 1}: "${query}"`);
      
      try {
        const resp = geocoder.geocode(query);
        
        if (resp.status === 'OK' && resp.results && resp.results[0]) {
          const result = resp.results[0];
          const data = extractLocationData(result);
          
          // Score the result (higher is better)
          let score = 0;
          if (data.lat && data.lng) score += 2; // Coordinates are most important
          if (data.city) score += 1;
          if (data.country) score += 1;
          
          // Prefer results that match our original query better
          if (i === 0) score += 0.5; // Bonus for primary attempt (full address)
          if (i === 1 && validAddr) score += 0.3; // Bonus for work address attempt
          
          // If geocoding didn't provide city but we have coordinates, try to extract city from address
          if (data.lat && data.lng && !data.city && validAddr) {
            const extractedCity = extractCityFromAddress(validAddr);
            if (extractedCity) {
              data.city = extractedCity;
              score += 1; // Boost score for having city data
              Logger.log(`Extracted city from address: "${extractedCity}"`);
            }
          }
          
          Logger.log(`Attempt ${i + 1} result: lat=${data.lat}, lng=${data.lng}, city="${data.city}", country="${data.country}", score=${score}`);
          
          if (score > bestScore) {
            bestResult = data;
            bestScore = score;
          }
          
          // If we have complete data, we can stop early
          if (isCompleteData(data)) {
            Logger.log(`Complete data found on attempt ${i + 1}, stopping early`);
            break;
          }
        }
        
        // Conservative rate limiting between attempts
        if (i < attempts.length - 1) {
          Utilities.sleep(500); // Increased delay between attempts
        }
        
      } catch (error) {
        Logger.log(`Attempt ${i + 1} failed: ${error.message}`);
      }
    }
    
    // Final fallback: if we have coordinates but no city, try to extract from address
    if (bestResult.lat && bestResult.lng && !bestResult.city && validAddr) {
      const extractedCity = extractCityFromAddress(validAddr);
      if (extractedCity) {
        bestResult.city = extractedCity;
        Logger.log(`Final fallback: extracted city from address: "${extractedCity}"`);
      }
    }
    
    return bestResult;
  }

  let processedCount = 0;
  let skippedCount = 0;
  
  for (let i = 1; i < data.length && processedCount < MAX_ROWS_TO_PROCESS; i++) {
    const row = data[i];
    const inst = row[colIndex[WORK_INSTITUTION]] || '';
    const addr = row[colIndex[WORK_ADDRESS]] || '';
    
    // Check if this row already has geocoding data
    const existingLat = row[colIndex['Latitude']] || '';
    const existingLng = row[colIndex['Longitude']] || '';
    
    if (existingLat && existingLng && !isEmptyOrNan(existingLat) && !isEmptyOrNan(existingLng)) {
      Logger.log(`Row ${i + 1}: already has geocoding data (${existingLat}, ${existingLng})—skipped`);
      skippedCount++;
      continue;
    }
    
    Logger.log(`Row ${i + 1}: institution="${inst}", address="${addr}"`);
    console.log({row:i + 1, inst, addr});
    
    let result = { lat: '', lng: '', city: '', country: '' };
    
    // Check if we have valid (non-empty, non-nan) values to geocode
    if (!isEmptyOrNan(inst) || !isEmptyOrNan(addr)) {
      result = smartGeocode(geocoder, inst, addr);
      Logger.log(`Row ${i + 1} final result: lat=${result.lat}, lng=${result.lng}, city="${result.city}", country="${result.country}"`);
      console.log({row:i + 1, lat: result.lat, lng: result.lng, city: result.city, country: result.country});
      processedCount++;
    } else {
      Logger.log(`Row ${i + 1}: both institution and address are empty/nan—skipped`);
    }
    
    // Write geocoding results to the geo columns for this row (i+1)
    sheet.getRange(i + 1, geoStartCol, 1, geoHeaders.length).setValues([[result.lat, result.lng, result.city, result.country]]);
    
    // Conservative rate limiting between rows
    Utilities.sleep(DELAY_BETWEEN_CALLS);
  }

  Logger.log(`Geocoding complete. Processed: ${processedCount} rows, Skipped: ${skippedCount} rows (already had data or empty)`);
  console.log({message:'Complete', processed: processedCount, skipped: skippedCount});
}
