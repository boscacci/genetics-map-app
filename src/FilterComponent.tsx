import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { GeneticSpecialist } from './types';
import './FilterComponent.css';

interface FilterComponentProps {
  specialists: GeneticSpecialist[];
  onFilterChange: (filtered: GeneticSpecialist[]) => void;
  onMapNavigation?: (lat: number, lng: number, zoom: number) => void;
}

// Function to clean up language strings by removing punctuation and normalizing whitespace
const cleanLanguageString = (languageString: string): string => {
  if (!languageString) return '';
  
  return languageString
    .replace(/[.,;!?()\[\]{}"'`]/g, '') // Remove common punctuation marks
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim(); // Remove leading/trailing whitespace
};

// Helper function to get unique values from an array
const getUniqueValues = (arr: (string | undefined)[]): string[] => {
  // Filter out undefined/null values and create a unique set
  const uniqueSet = new Set<string>();
  arr.forEach(item => {
    if (item) uniqueSet.add(item);
  });
  
  // Convert to array and sort
  return Array.from(uniqueSet).sort();
};

// Convert string array to react-select options
const toSelectOptions = (values: string[]) => {
  return values.map(value => ({ value, label: value }));
};

const FilterComponent: React.FC<FilterComponentProps> = ({ specialists, onFilterChange, onMapNavigation }) => {
  // Simple drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Top-left with minimal padding
  const boxRef = useRef<HTMLDivElement>(null);

  // Available filter options
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  // Selected filter values
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Computed city options based on selected countries
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Computed language options based on selected geography
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  // Clean drag handlers - support both mouse and touch
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within bounds
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 200;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while dragging
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    // Keep within bounds
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 200;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Global mouse and touch listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  // Extract unique values for each filter
  useEffect(() => {
    if (specialists.length > 0) {
      // Get unique countries
      const uniqueCountries = getUniqueValues(specialists.map(s => s.Country));
      setCountries(uniqueCountries);

      // Get unique cities
      const uniqueCities = getUniqueValues(specialists.map(s => s.City));
      setCities(uniqueCities);

      // Extract and normalize all languages
      const allLanguages: string[] = [];
      specialists.forEach(s => {
        if (s.language_spoken) {
          // Split by commas, semicolons, 'and', or spaces, then trim whitespace and clean
          const langs = s.language_spoken
            .split(/,|;|\sand\s|\s+/)
            .map(lang => cleanLanguageString(lang))
            .filter(Boolean);
          
          allLanguages.push(...langs);
        }
      });
      
      // Get unique languages and sort
      const uniqueLanguages = getUniqueValues(allLanguages);
      setLanguages(uniqueLanguages);
    }
  }, [specialists]);

  // Update available cities based on selected countries
  useEffect(() => {
    if (selectedCountries.length > 0) {
      // Filter specialists by selected countries
      const specialistsInSelectedCountries = specialists.filter(s => 
        s.Country && selectedCountries.includes(s.Country)
      );
      
      // Get cities from those specialists
      const citiesInSelectedCountries = getUniqueValues(
        specialistsInSelectedCountries.map(s => s.City)
      );
      
      setAvailableCities(citiesInSelectedCountries);
      
      // Clear any selected cities that are no longer available
      const validSelectedCities = selectedCities.filter(city => 
        citiesInSelectedCountries.includes(city)
      );
      
      if (validSelectedCities.length !== selectedCities.length) {
        setSelectedCities(validSelectedCities);
      }
    } else {
      // If no countries selected, show all cities
      setAvailableCities(cities);
    }
  }, [selectedCountries, specialists, cities, selectedCities]);

  // Update available languages based on selected geography
  useEffect(() => {
    if (selectedCountries.length > 0 || selectedCities.length > 0) {
      // Filter specialists by selected geography
      const specialistsInSelectedGeography = specialists.filter(s => {
        // If countries are selected, specialist must be in one of them
        if (selectedCountries.length > 0 && (!s.Country || !selectedCountries.includes(s.Country))) {
          return false;
        }
        // If cities are selected, specialist must be in one of them
        if (selectedCities.length > 0 && (!s.City || !selectedCities.includes(s.City))) {
          return false;
        }
        return true;
      });

      // Extract and normalize all languages spoken by specialists in the filtered geography
      const allLanguagesInFilteredGeography: string[] = [];
      specialistsInSelectedGeography.forEach(s => {
        if (s.language_spoken) {
          const langs = s.language_spoken
            .split(/,|;|\sand\s|\s+/)
            .map(lang => cleanLanguageString(lang))
            .filter(Boolean);
          allLanguagesInFilteredGeography.push(...langs);
        }
      });

      // Get unique languages and sort
      const uniqueLanguagesInFilteredGeography = getUniqueValues(allLanguagesInFilteredGeography);
      setAvailableLanguages(uniqueLanguagesInFilteredGeography);
      
      // Clear any selected languages that are no longer available
      const validSelectedLanguages = selectedLanguages.filter(lang => 
        uniqueLanguagesInFilteredGeography.includes(lang)
      );
      
      if (validSelectedLanguages.length !== selectedLanguages.length) {
        setSelectedLanguages(validSelectedLanguages);
      }
    } else {
      // If no geography filters applied, show all languages
      setAvailableLanguages(languages);
    }
  }, [selectedCountries, selectedCities, specialists, languages, selectedLanguages]);

  // Apply filters whenever selection changes
  useEffect(() => {
    applyFilters();
  }, [selectedCountries, selectedCities, selectedLanguages]);

  const applyFilters = () => {
    let filtered = [...specialists];

    // Filter by country
    if (selectedCountries.length > 0) {
      filtered = filtered.filter(s => 
        s.Country && selectedCountries.includes(s.Country)
      );
    }

    // Filter by city
    if (selectedCities.length > 0) {
      filtered = filtered.filter(s => 
        s.City && selectedCities.includes(s.City)
      );
    }

    // Filter by language
    if (selectedLanguages.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.language_spoken) return false;
        
        // Parse the languages and clean them (same logic as above)
        const specialistLanguages = s.language_spoken
          .split(/,|;|\sand\s|\s+/)
          .map(lang => cleanLanguageString(lang))
          .filter(Boolean);
        
        // Check if any of the selected languages is spoken by this specialist
        return selectedLanguages.some(lang => 
          specialistLanguages.some(sLang => 
            sLang.toLowerCase().includes(lang.toLowerCase())
          )
        );
      });
    }

    // Pass filtered professionals to parent component
    onFilterChange(filtered);

    // Handle map navigation based on filters
    if (onMapNavigation && filtered.length > 0) {
      // If geography filter is applied, navigate to that area
      if (selectedCountries.length > 0 || selectedCities.length > 0) {
        navigateToFilteredArea(filtered);
      }
      // If only language filter is applied, navigate to relevant area
      else if (selectedLanguages.length > 0 && selectedCountries.length === 0 && selectedCities.length === 0) {
        navigateToFilteredArea(filtered);
      }
    }
  };

  // Helper function to navigate to the filtered area
  const navigateToFilteredArea = (filteredSpecialists: GeneticSpecialist[]) => {
    if (!onMapNavigation || filteredSpecialists.length === 0) return;

    // Calculate the center and bounds of filtered specialists
    const validSpecialists = filteredSpecialists.filter(s => s.Latitude && s.Longitude);
    
    if (validSpecialists.length === 0) return;

    const lats = validSpecialists.map(s => s.Latitude!);
    const lngs = validSpecialists.map(s => s.Longitude!);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate appropriate zoom level based on the spread
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 4; // Default zoom
    if (maxDiff > 50) zoom = 2;      // Very wide area
    else if (maxDiff > 20) zoom = 3; // Wide area
    else if (maxDiff > 10) zoom = 4; // Medium area
    else if (maxDiff > 5) zoom = 5;  // Smaller area
    else if (maxDiff > 2) zoom = 6;  // City level
    else if (maxDiff > 1) zoom = 7;  // Neighborhood level
    else zoom = 8;                   // Street level
    
    // Add some padding by adjusting zoom
    zoom = Math.max(zoom - 1, 2);
    
    onMapNavigation(centerLat, centerLng, zoom);
  };

  const handleCountryChange = (selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
    setSelectedCountries(values);
  };

  const handleCityChange = (selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
    setSelectedCities(values);
  };

  const handleLanguageChange = (selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
    setSelectedLanguages(values);
  };

  const handleClearAllFilters = () => {
    setSelectedCountries([]);
    setSelectedCities([]);
    setSelectedLanguages([]);
    setAvailableCities(cities); // Reset to all cities
    setAvailableLanguages(languages); // Reset to all languages
  };

  return (
    <div 
      ref={boxRef}
      className="topright-filter-container" 
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <div 
          className="filter-drag-handle" 
          style={{
            cursor: 'grab',
            fontWeight: 500, 
            color: '#888', 
            fontSize: 13
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <span style={{ fontSize: '16px' }}>⋮⋮</span>
        </div>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: '#333',
          flex: 1,
          textAlign: 'center'
        }}>
          Filters
        </h2>
        <div style={{ width: '20px' }}></div> {/* Spacer to balance the dots */}
      </div>
      <div className="filter-group">
        <label>Country</label>
        <Select
          isMulti
          options={toSelectOptions(countries)}
          onChange={handleCountryChange}
          placeholder="Select countries..."
          className="react-select-container"
          classNamePrefix="react-select"
          isSearchable
          isClearable
        />
      </div>
      <div className="filter-group">
        <label>City</label>
        <Select
          isMulti
          options={toSelectOptions(availableCities)}
          onChange={handleCityChange}
          placeholder="Select cities..."
          className="react-select-container"
          classNamePrefix="react-select"
          isSearchable
          isClearable
        />
      </div>
      <div className="filter-group">
        <label>Language</label>
        <Select
          isMulti
          options={toSelectOptions(availableLanguages)}
          onChange={handleLanguageChange}
          placeholder="Select languages..."
          className="react-select-container"
          classNamePrefix="react-select"
          isSearchable
          isClearable
        />
      </div>
      <div className="filter-group" style={{ marginTop: '16px' }}>
        <button
          onClick={handleClearAllFilters}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e0e0';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default FilterComponent; 