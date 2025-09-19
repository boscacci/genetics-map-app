import React, { useState, useRef, useEffect } from 'react';
import { MapPoint } from './types';
import './GlobalSearchBar.css';

interface GlobalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSearch: (lat: number, lng: number, name: string, zoom: number) => void;
  isFilterDropdownOpen?: boolean;
  specialists: MapPoint[];
}

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox?: string[];
  type?: string;
  class?: string;
}

interface ProfessionalResult {
  type: 'professional';
  specialist: MapPoint;
  display_name: string;
  subtitle: string;
}

interface LocationResult {
  type: 'location';
  result: GeocodingResult;
}

type SearchResult = ProfessionalResult | LocationResult;

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ value, onChange, onLocationSearch, isFilterDropdownOpen = false, specialists }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Search for professionals by name, institution, or city
  const searchProfessionals = (query: string): ProfessionalResult[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    const results: ProfessionalResult[] = [];
    
    specialists.forEach(specialist => {
      const fullName = `${specialist.name_first} ${specialist.name_last}`.toLowerCase();
      const institution = specialist.work_institution?.toLowerCase() || '';
      const city = specialist.City?.toLowerCase() || '';
      const country = specialist.Country?.toLowerCase() || '';
      
      // Check if query matches name, institution, city, or country
      if (fullName.includes(searchTerm) || 
          institution.includes(searchTerm) || 
          city.includes(searchTerm) || 
          country.includes(searchTerm)) {
        
        const subtitle = [specialist.work_institution, specialist.City, specialist.Country]
          .filter(Boolean)
          .join(', ');
        
        results.push({
          type: 'professional',
          specialist,
          display_name: `${specialist.name_first} ${specialist.name_last}`,
          subtitle
        });
      }
    });
    
    // Sort by relevance (exact name matches first, then institution, then city)
    return results.sort((a, b) => {
      const aName = a.display_name.toLowerCase();
      const bName = b.display_name.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Exact name matches first
      if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
      if (!aName.startsWith(searchLower) && bName.startsWith(searchLower)) return 1;
      
      // Then by name similarity
      return aName.localeCompare(bName);
    }).slice(0, 5); // Limit to 5 results
  };

  // Geocoding function using Nominatim
  const searchLocation = async (query: string): Promise<LocationResult[]> => {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`
      );
      const data = await response.json();
      return data.map((result: GeocodingResult) => ({
        type: 'location' as const,
        result
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  };

  // Combined search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search professionals synchronously
      const professionalResults = searchProfessionals(query);
      
      // Search locations asynchronously
      const locationResults = await searchLocation(query);
      
      // Combine results with professionals first
      const combinedResults = [...professionalResults, ...locationResults];
      
      setSearchResults(combinedResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Enter key press - search for both professionals and locations
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch(value);
    }
  };

  // Handle professional selection
  const handleProfessionalSelect = (professional: MapPoint) => {
    const lat = professional.Latitude;
    const lng = professional.Longitude;
    const name = `${professional.name_first} ${professional.name_last}`;
    const zoom = 12; // Zoom in to show the professional's location clearly
    
    onLocationSearch(lat, lng, name, zoom);
    setShowResults(false);
    onChange(name);
  };

  // Handle location selection
  const handleLocationSelect = (result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Calculate appropriate zoom level based on location type and bounding box
    let zoom = 4; // default country level
    
    if (result.boundingbox && result.boundingbox.length === 4) {
      const [minLat, maxLat, minLon, maxLon] = result.boundingbox.map(parseFloat);
      const latDiff = maxLat - minLat;
      const lonDiff = maxLon - minLon;
      const maxDiff = Math.max(latDiff, lonDiff);
      
      // More zoomed-in levels for better screen filling
      if (maxDiff > 100) zoom = 2;       // World
      else if (maxDiff > 50) zoom = 3;   // Continent
      else if (maxDiff > 20) zoom = 4;   // Large country (like Russia, Canada)
      else if (maxDiff > 10) zoom = 5;   // Large country (like India, China)
      else if (maxDiff > 5) zoom = 6;    // Medium country
      else if (maxDiff > 2) zoom = 7;    // Small country/State
      else if (maxDiff > 1) zoom = 8;    // Large city
      else if (maxDiff > 0.5) zoom = 9;  // City
      else if (maxDiff > 0.2) zoom = 10; // District
      else if (maxDiff > 0.1) zoom = 11; // Neighborhood
      else if (maxDiff > 0.05) zoom = 12; // Small neighborhood
      else if (maxDiff > 0.02) zoom = 13; // Street level
      else zoom = 14;                    // Building level
    } else {
      // Fallback based on location type with more zoomed-in levels
      const type = result.type || result.class || '';
      if (type.includes('country')) zoom = 5; // More zoomed in for countries
      else if (type.includes('state') || type.includes('province')) zoom = 6;
      else if (type.includes('region') || type.includes('county')) zoom = 7;
      else if (type.includes('city') || type.includes('town')) zoom = 9;
      else if (type.includes('suburb') || type.includes('district')) zoom = 10;
      else if (type.includes('neighbourhood') || type.includes('neighborhood')) zoom = 11;
      else if (type.includes('quarter') || type.includes('area')) zoom = 12;
      else if (type.includes('street') || type.includes('road')) zoom = 13;
      else zoom = 8; // default to city level
    }
    
    onLocationSearch(lat, lng, result.display_name, zoom);
    setShowResults(false);
    onChange(result.display_name);
  };

  // Handle search result selection
  const handleResultSelect = (searchResult: SearchResult) => {
    if (searchResult.type === 'professional') {
      handleProfessionalSelect(searchResult.specialist);
    } else {
      handleLocationSelect(searchResult.result);
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className="global-search-container">
      <div className="global-search-bar">
        <input
          type="text"
          className="global-search-input"
          placeholder="Search professionals or locations"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowResults(searchResults.length > 0)}
        />
        {isSearching && (
          <div className="search-spinner">🔍</div>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className={`search-results ${isFilterDropdownOpen ? 'filter-dropdown-open' : ''}`}>
          {searchResults.map((searchResult, index) => (
            <div
              key={index}
              className={`search-result-item ${searchResult.type === 'professional' ? 'professional-result' : 'location-result'}`}
              onClick={() => handleResultSelect(searchResult)}
            >
              {searchResult.type === 'professional' ? (
                <>
                  <div className="result-name">
                    👨‍⚕️ {searchResult.display_name}
                  </div>
                  <div className="result-subtitle">
                    {searchResult.subtitle}
                  </div>
                </>
              ) : (
                <>
                  <div className="result-name">
                    📍 {searchResult.result.display_name}
                  </div>
                  <div className="result-coords">
                    {parseFloat(searchResult.result.lat).toFixed(4)}, {parseFloat(searchResult.result.lon).toFixed(4)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar; 