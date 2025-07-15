import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { GeneticSpecialist } from './types';
import './FilterComponent.css';

interface FilterComponentProps {
  specialists: GeneticSpecialist[];
  onFilterChange: (filtered: GeneticSpecialist[]) => void;
  onMapNavigation?: (lat: number, lng: number, zoom: number) => void;
}

// Helper function to clean language strings
const cleanLanguageString = (languageString: string): string => {
  if (!languageString) return '';
  
  return languageString
    .replace(/[.,;!?()\[\]{}"'`]/g, '') // Remove common punctuation marks
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim(); // Remove leading/trailing whitespace
};

// Helper function to get unique values from an array
const getUniqueValues = (arr: (string | undefined)[]): string[] => {
  const cleaned = arr
    .filter(Boolean)
    .map(item => cleanLanguageString(item!))
    .filter(Boolean);
  return [...new Set(cleaned)].sort();
};

// Helper function to convert array to select options
const toSelectOptions = (values: string[]) => {
  return values.map(value => ({ value, label: value }));
};

const FilterComponent: React.FC<FilterComponentProps> = ({ specialists, onFilterChange, onMapNavigation }) => {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 900);
  };

  // Initialize position based on device type
  useEffect(() => {
    if (isMobile()) {
      // On mobile, position at bottom center
      setPosition({ x: 10, y: window.innerHeight - 200 });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    setIsDragging(true);
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMinimized) return;
    setIsDragging(true);
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || isMinimized) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (boxRef.current?.offsetWidth || 300);
    const maxY = window.innerHeight - (boxRef.current?.offsetHeight || 200);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || isMinimized) return;
    e.preventDefault();
    
    const newX = e.touches[0].clientX - dragOffset.x;
    const newY = e.touches[0].clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (boxRef.current?.offsetWidth || 300);
    const maxY = window.innerHeight - (boxRef.current?.offsetHeight || 200);
    
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

  // Add event listeners for dragging
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
  }, [isDragging, dragOffset, isMinimized]);

  // Extract unique values for filters
  const countries = getUniqueValues(specialists.map(s => s.Country));
  const cities = getUniqueValues(specialists.map(s => s.City));
  const allLanguages = specialists
    .map(s => s.language_spoken)
    .filter(Boolean)
    .flatMap(lang => lang!.split(/,|;|\sand\s|\s+/))
    .map(lang => cleanLanguageString(lang))
    .filter(Boolean);
  const availableLanguages = [...new Set(allLanguages)].sort();

  // Filter cities based on selected countries
  const availableCities = selectedCountries.length > 0
    ? getUniqueValues(
        specialists
          .filter(s => selectedCountries.includes(s.Country))
          .map(s => s.City)
      )
    : cities;

  // Apply filters when selections change
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

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // If minimized, show only the floating button
  if (isMinimized) {
    return (
      <button 
        className="filter-floating-btn"
        onClick={toggleMinimize}
        title="Show filters"
      >
        🔍
      </button>
    );
  }

  return (
    <>
      <div 
        ref={boxRef}
        className="topright-filter-container" 
        style={{
          position: isMobile() ? 'fixed' : 'absolute',
          left: isMobile() ? '10px' : position.x,
          right: isMobile() ? '10px' : 'auto',
          top: isMobile() ? 'auto' : position.y,
          bottom: isMobile() ? '10px' : 'auto',
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: 'none'
        }}
      >
        <button 
          className="filter-minimize-btn"
          onClick={toggleMinimize}
          title="Minimize filters"
        >
          −
        </button>
        <div 
          className="filter-drag-handle" 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <span style={{ fontSize: '14px' }}>⋮⋮</span>
        </div>
        <div className="filter-grid">
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
          <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
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
        </div>
      </div>
    </>
  );
};

export default FilterComponent; 