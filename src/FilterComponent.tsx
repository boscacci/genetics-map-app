import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { MapPoint } from './types';
import './FilterComponent.css';

interface FilterComponentProps {
  specialists: MapPoint[];
  onFilterChange: (filtered: MapPoint[]) => void;
  onMapNavigation?: (lat: number, lng: number, zoom: number) => void;
  onDropdownStateChange?: (isOpen: boolean) => void;
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

const FilterComponent: React.FC<FilterComponentProps> = ({ specialists, onFilterChange, onMapNavigation, onDropdownStateChange }) => {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 28, y: 28 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAnyDropdownOpen, setIsAnyDropdownOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 900);
  };

  // Only allow dragging on desktop
  const allowDrag = !isMobile();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!allowDrag || isMinimized) return;
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
    if (!allowDrag || isMinimized) return;
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

  // Add event listeners for dragging (desktop only)
  useEffect(() => {
    if (isDragging && allowDrag) {
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
  }, [isDragging, dragOffset, isMinimized, allowDrag]);

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

  // Debug logging
  console.log('FilterComponent Debug:', {
    specialistsCount: specialists.length,
    countriesCount: countries.length,
    citiesCount: cities.length,
    languagesCount: availableLanguages.length,
    sampleCountries: countries.slice(0, 5),
    sampleCities: cities.slice(0, 5),
    sampleLanguages: availableLanguages.slice(0, 5)
  });

  // Fallback options if no data is available
  const fallbackCountries = countries.length > 0 ? countries : ['United States', 'Canada', 'United Kingdom'];
  const fallbackCities = cities.length > 0 ? cities : ['New York', 'Los Angeles', 'Chicago'];
  const fallbackLanguages = availableLanguages.length > 0 ? availableLanguages : ['English', 'Spanish', 'French'];

  // Filter cities based on selected countries
  const availableCities = selectedCountries.length > 0
    ? getUniqueValues(
        specialists
          .filter(s => selectedCountries.includes(s.Country))
          .map(s => s.City)
      )
    : fallbackCities;

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
  const navigateToFilteredArea = (filteredSpecialists: MapPoint[]) => {
    if (!onMapNavigation || filteredSpecialists.length === 0) return;

    let validSpecialists = filteredSpecialists.filter(s => s.Latitude && s.Longitude);

    // Special handling for United States: exclude Alaska and Hawaii from bounds
    if (selectedCountries.includes('United States')) {
      validSpecialists = validSpecialists.filter(s => {
        // Contiguous US: lat 24–50, lng -125 to -66
        return s.Latitude >= 24 && s.Latitude <= 50 && s.Longitude >= -125 && s.Longitude <= -66;
      });
    }

    if (validSpecialists.length === 0) return;

    let lats = validSpecialists.map(s => s.Latitude!);
    let lngs = validSpecialists.map(s => s.Longitude!);

    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    // Add padding to ensure full country visibility
    const latPadding = (maxLat - minLat) * 0.15;
    const lngPadding = (maxLng - minLng) * 0.15;

    minLat = Math.max(minLat - latPadding, -90);
    maxLat = Math.min(maxLat + latPadding, 90);
    minLng = Math.max(minLng - lngPadding, -180);
    maxLng = Math.min(maxLng + lngPadding, 180);

    // Special handling for United States to ensure full contiguous country visibility
    if (selectedCountries.includes('United States')) {
      minLat = Math.min(minLat, 24);
      maxLat = Math.max(maxLat, 50);
      minLng = Math.min(minLng, -125);
      maxLng = Math.max(maxLng, -66);
    }

    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calculate appropriate zoom level based on the spread
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Much more aggressive zoom levels for better country/city focus
    let zoom = 6; // Default zoom

    // Special zoom logic for contiguous US
    if (selectedCountries.includes('United States')) {
      if (maxDiff > 40) zoom = 4;
      else if (maxDiff > 25) zoom = 5;
      else if (maxDiff > 15) zoom = 6;
      else zoom = 7;
    } else {
      if (maxDiff > 100) zoom = 2;
      else if (maxDiff > 50) zoom = 3;
      else if (maxDiff > 25) zoom = 4;
      else if (maxDiff > 15) zoom = 5;
      else if (maxDiff > 8) zoom = 6;
      else if (maxDiff > 4) zoom = 7;
      else if (maxDiff > 2) zoom = 8;
      else if (maxDiff > 1) zoom = 9;
      else zoom = 10;
    }

    // For country filters, ensure we get at least zoom level 5
    if (selectedCountries.length > 0 && zoom < 5) {
      zoom = 5;
    }
    // For city filters, ensure we get at least zoom level 7
    if (selectedCities.length > 0 && zoom < 7) {
      zoom = 7;
    }

    // For mobile, zoom out a bit more for US
    if (selectedCountries.includes('United States') && isMobile()) {
      zoom = Math.max(zoom - 1, 2);
    }

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

  // Handle dropdown state for z-index management
  const handleDropdownOpen = () => {
    setIsAnyDropdownOpen(true);
    onDropdownStateChange?.(true);
  };

  const handleDropdownClose = () => {
    setIsAnyDropdownOpen(false);
    onDropdownStateChange?.(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Show drag handle only on desktop, minimize button on mobile
  const showDragHandle = allowDrag;
  const showMinimizeButton = isMobile();

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
      {/* Backdrop overlay when dropdowns are open */}
      {isAnyDropdownOpen && (
        <div 
          className="filter-dropdown-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 9998,
            pointerEvents: 'none'
          }}
        />
      )}
      
      <div 
        style={{
          position: isMobile() ? 'fixed' : 'absolute',
          left: isMobile() ? '10px' : position.x,
          right: isMobile() ? '10px' : 'auto',
          top: isMobile() ? 80 : position.y, // 80px from top on mobile to make room for search
          bottom: isMobile() ? 'auto' : 'auto',
          zIndex: isAnyDropdownOpen ? 10000 : 2000, // Higher z-index when dropdowns are open
          overflow: 'visible',
          transition: 'none' // No transitions on mobile
        }}
      >
        <div 
          ref={boxRef}
          className={`topright-filter-container`}
          style={{
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: 'none'
          }}
        >
          {showMinimizeButton && (
            <button 
              className={`filter-minimize-btn`}
              onClick={toggleMinimize}
              title="Minimize filters"
            >
              −
            </button>
          )}
          {showDragHandle && (
            <div 
              className="filter-drag-handle" 
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <span style={{ fontSize: '14px' }}>⋮⋮</span>
            </div>
          )}
          <div className="filter-grid">
            <div className="filter-group">
              <label>Country</label>
              <Select
                isMulti
                options={toSelectOptions(fallbackCountries)}
                onChange={handleCountryChange}
                placeholder="Countries..."
                className="react-select-container"
                classNamePrefix="react-select"
                isSearchable
                isClearable
                menuPlacement="auto"
                menuPortalTarget={document.body}
                onMenuOpen={handleDropdownOpen}
                onMenuClose={handleDropdownClose}
                styles={{
                  menu: (base) => ({
                    ...base,
                    zIndex: 999999,
                    position: 'fixed'
                  }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 999999
                  })
                }}
              />
            </div>
            <div className="filter-group">
              <label>City</label>
              <Select
                isMulti
                options={toSelectOptions(availableCities)}
                onChange={handleCityChange}
                placeholder="Cities..."
                className="react-select-container"
                classNamePrefix="react-select"
                isSearchable
                isClearable
                menuPlacement="auto"
                menuPortalTarget={document.body}
                onMenuOpen={handleDropdownOpen}
                onMenuClose={handleDropdownClose}
                styles={{
                  menu: (base) => ({
                    ...base,
                    zIndex: 999999,
                    position: 'fixed'
                  }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 999999
                  })
                }}
              />
            </div>
            <div className="filter-group">
              <label>Language</label>
              <Select
                isMulti
                options={toSelectOptions(fallbackLanguages)}
                onChange={handleLanguageChange}
                placeholder="Languages..."
                className="react-select-container"
                classNamePrefix="react-select"
                isSearchable
                isClearable
                menuPlacement="auto"
                menuPortalTarget={document.body}
                onMenuOpen={handleDropdownOpen}
                onMenuClose={handleDropdownClose}
                styles={{
                  menu: (base) => ({
                    ...base,
                    zIndex: 999999,
                    position: 'fixed'
                  }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 999999
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterComponent; 