import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { MapPoint } from './types';

interface SelectOption {
  value: string;
  label: string;
}
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

// Helper function to clean specialty strings
const cleanSpecialtyString = (specialtyString: string): string => {
  if (!specialtyString) return '';
  
  return specialtyString
    .replace(/[.,;!?()\[\]{}"'`]/g, '') // Remove common punctuation marks
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim(); // Remove leading/trailing whitespace
};

// Helper function to normalize specialty names into <=10 buckets
const normalizeSpecialty = (specialty: string): string => {
  const normalized = cleanSpecialtyString(specialty).toLowerCase();

  // Treat very short or obviously malformed fragments as Other rather than dropping
  if (normalized.length < 3 || normalized === 'na' || normalized === 'n/a') {
    return 'Other';
  }

  // 1) Cancer Genetics
  if (normalized.includes('cancer') || normalized.includes('oncology')) {
    return 'Cancer Genetics';
  }

  // 2) Prenatal & Reproductive Genetics (includes PGT, premarital, preconception)
  if (
    normalized.includes('prenatal') ||
    normalized.includes('perinatal') ||
    normalized.includes('preconception') ||
    normalized.includes('premarital') ||
    normalized.includes('reproductive') ||
    normalized.includes('pgt')
  ) {
    return 'Prenatal & Reproductive Genetics';
  }

  // 3) Pediatric Genetics (includes newborn screening, pediatric neurology)
  if (
    normalized.includes('pediatric') ||
    normalized.includes('paediatric') ||
    normalized.includes('newborn screening') ||
    normalized.includes('pediatric neurology') ||
    normalized.includes('paediatric neurology') ||
    normalized.includes('pediatrics') ||
    normalized.includes('paediatrics')
  ) {
    return 'Pediatric Genetics';
  }

  // 4) Neurogenetics
  if (
    normalized.includes('neurogenetic') ||
    normalized.includes('neurodegenerative') ||
    normalized.includes('neuromuscular') ||
    normalized.includes('neuro')
  ) {
    return 'Neurogenetics';
  }

  // 5) General/Clinical Genetics (includes clinical, human, genomic medicine, medical geneticist, counseling)
  if (
    normalized.includes('clinical genetic') ||
    normalized === 'clinical genetics' ||
    normalized.includes('general genetics') ||
    normalized === 'general' ||
    normalized.includes('human genetic') ||
    normalized.includes('genomic medicine') ||
    normalized.includes('medical genetic') ||
    normalized.includes('genetic counseling') ||
    normalized.includes('genetic counsell') ||
    normalized.includes('all clinical') ||
    normalized.includes('clinical and metabolic genetics') ||
    normalized.includes('multi speciality') ||
    normalized.includes('adult') // captures mixed entries like "General Adult and Pediatrics"
  ) {
    return 'General/Clinical Genetics';
  }

  // 6) Laboratory/Diagnostic Genetics (includes molecular, lab, DTC)
  if (
    normalized.includes('laboratory') ||
    normalized.includes('lab') ||
    normalized.includes('molecular genetic') ||
    normalized === 'laboratory' ||
    normalized.includes('dtc')
  ) {
    return 'Laboratory/Diagnostic Genetics';
  }

  // 7) Cardiology Genetics
  if (normalized.includes('cardiology') || normalized.includes('cardiac')) {
    return 'Cardiology Genetics';
  }

  // 8) Ophthalmic Genetics
  if (normalized.includes('ophthalmic') || normalized.includes('eye')) {
    return 'Ophthalmic Genetics';
  }

  // 9) Rare Disease/Undiagnosed
  if (normalized.includes('rare disease') || normalized.includes('undiagnosed')) {
    return 'Rare Disease/Undiagnosed';
  }

  // 10) Research-oriented or uncategorized -> Other (fold research/genomic umbrella into Other to keep <=10)
  if (normalized.includes('research')) {
    return 'Other';
  }

  // Default bucket
  return 'Other';
};

// Helper function to get unique values from an array
const getUniqueValues = (arr: (string | undefined)[]): string[] => {
  const cleaned = arr
    .filter(Boolean)
    .map(item => cleanLanguageString(item!))
    .filter(Boolean);
  return [...new Set(cleaned)].sort();
};

// Helper function to get unique specialties from an array
const getUniqueSpecialties = (arr: (string | undefined)[]): string[] => {
  const specialties = new Set<string>();
  
  arr.forEach(item => {
    if (item && item.trim()) {
      // Split by comma and normalize each specialty
      const specialtyList = item.split(',').map(s => normalizeSpecialty(s)).filter(Boolean);
      specialtyList.forEach(specialty => {
        if (specialty.trim()) { // Only add non-empty specialties
          specialties.add(specialty);
        }
      });
    }
  });
  
  return [...specialties].sort();
};

// Helper function to convert array to select options
const toSelectOptions = (values: string[]) => {
  return values.map(value => ({ value, label: value }));
};

const FilterComponent: React.FC<FilterComponentProps> = ({ specialists, onFilterChange, onMapNavigation, onDropdownStateChange }) => {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [nameSearchQuery, setNameSearchQuery] = useState<string>('');
  const [nameInputValue, setNameInputValue] = useState<string>('');
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

  // Helper function to get specialists that would remain after applying a filter
  const getRemainingSpecialists = (additionalFilter: (s: MapPoint) => boolean) => {
    let filtered = [...specialists];

    // Apply existing filters
    if (selectedCountries.length > 0) {
      filtered = filtered.filter(s => s.Country && selectedCountries.includes(s.Country));
    }
    if (selectedCities.length > 0) {
      filtered = filtered.filter(s => s.City && selectedCities.includes(s.City));
    }
    if (selectedLanguages.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.language_spoken) return false;
        const specialistLanguages = s.language_spoken
          .split(/,|;|\sand\s|\s+/)
          .map(lang => cleanLanguageString(lang))
          .filter(Boolean);
        return selectedLanguages.some(lang => 
          specialistLanguages.some(sLang => 
            sLang.toLowerCase().includes(lang.toLowerCase())
          )
        );
      });
    }
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.specialties) return false;
        const specialistSpecialties = s.specialties
          .split(',')
          .map(specialty => normalizeSpecialty(specialty))
          .filter(Boolean);
        return selectedSpecialties.some(selectedSpecialty => 
          specialistSpecialties.includes(selectedSpecialty)
        );
      });
    }
    if (nameSearchQuery.trim()) {
      const q = nameSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(s => {
        if (s.name_first || s.name_last) {
          const fullName = `${s.name_first || ''} ${s.name_last || ''}`.trim().toLowerCase();
          return fullName.includes(q);
        }
        return false;
      });
    }

    // Apply the additional filter
    return filtered.filter(additionalFilter);
  };

  // Get available options based on current filters
  const availableCountries = getRemainingSpecialists(() => true)
    .map(s => s.Country)
    .filter(Boolean);
  const availableCities = getRemainingSpecialists(() => true)
    .map(s => s.City)
    .filter(Boolean);
  const availableLanguages = getRemainingSpecialists(() => true)
    .map(s => s.language_spoken)
    .filter(Boolean)
    .flatMap(lang => lang!.split(/,|;|\sand\s|\s+/))
    .map(lang => cleanLanguageString(lang))
    .filter(Boolean);
  const availableSpecialties = getRemainingSpecialists(() => true)
    .map(s => s.specialties)
    .filter(Boolean);
  // Extract unique values for filters
  const countries = [...new Set(availableCountries)].sort();
  const cities = [...new Set(availableCities)].sort();
  const languages = [...new Set(availableLanguages)].sort();
  const specialties = getUniqueSpecialties(availableSpecialties);

  // Dev-only: log raw and normalized specialty counts to console for bucketing analysis
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;
    if (!specialists || specialists.length === 0) return;

    const rawCounts = new Map<string, number>();
    const normalizedCounts = new Map<string, number>();

    specialists.forEach(s => {
      if (!s.specialties) return;
      // Raw tokens split on commas
      s.specialties.split(',').forEach(token => {
        const raw = cleanSpecialtyString(token);
        if (!raw) return;
        rawCounts.set(raw, (rawCounts.get(raw) || 0) + 1);
      });
      // Normalized tokens using existing rules
      s.specialties.split(',').forEach(token => {
        const norm = normalizeSpecialty(token);
        if (!norm) return;
        normalizedCounts.set(norm, (normalizedCounts.get(norm) || 0) + 1);
      });
    });

    const toSortedArray = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

    // Present in console for quick review
    // eslint-disable-next-line no-console
    console.groupCollapsed('[Dev] Specialty counts');
    // eslint-disable-next-line no-console
    console.log('Raw specialties (tokenized by comma):');
    // eslint-disable-next-line no-console
    console.table(
      toSortedArray(rawCounts).map(([name, count]) => ({ name, count }))
    );
    // eslint-disable-next-line no-console
    console.log('Normalized specialties:');
    // eslint-disable-next-line no-console
    console.table(
      toSortedArray(normalizedCounts).map(([name, count]) => ({ name, count }))
    );
    // eslint-disable-next-line no-console
    console.groupEnd();
  }, [specialists]);


  // Fallback options if no data is available
  const fallbackCountries = countries.length > 0 ? countries : ['United States', 'Canada', 'United Kingdom'];
  const fallbackCities = cities.length > 0 ? cities : ['New York', 'Los Angeles', 'Chicago'];
  const fallbackLanguages = languages.length > 0 ? languages : ['English', 'Spanish', 'French'];

  // Apply filters when selections change
  useEffect(() => {
    applyFilters();
  }, [selectedCountries, selectedCities, selectedLanguages, selectedSpecialties, nameSearchQuery]);

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

    // Filter by specialties
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.specialties) return false;
        
        // Parse the specialties and normalize them
        const specialistSpecialties = s.specialties
          .split(',')
          .map(specialty => normalizeSpecialty(specialty))
          .filter(Boolean);
        
        // Check if any of the selected specialties matches this specialist's normalized specialties
        return selectedSpecialties.some(selectedSpecialty => 
          specialistSpecialties.includes(selectedSpecialty)
        );
      });
    }

    // Filter by name search (applied on Enter)
    if (nameSearchQuery.trim()) {
      const q = nameSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(s => {
        if (s.name_first || s.name_last) {
          const fullName = `${s.name_first || ''} ${s.name_last || ''}`.trim().toLowerCase();
          return fullName.includes(q);
        }
        return false;
      });
    }

    // Pass filtered professionals to parent component
    onFilterChange(filtered);

    // Handle map navigation based on filters
    if (onMapNavigation) {
      if (filtered.length > 0) {
        // Always navigate to show filtered results
        navigateToFilteredArea(filtered);
      } else {
        // No results found - zoom out to show all specialists
        onMapNavigation(15, 30, 3); // Global view
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

  const handleCountryChange = (selectedOptions: SelectOption[] | null) => {
    const values = selectedOptions ? selectedOptions.map((option: SelectOption) => option.value) : [];
    setSelectedCountries(values);
  };

  const handleCityChange = (selectedOptions: SelectOption[] | null) => {
    const values = selectedOptions ? selectedOptions.map((option: SelectOption) => option.value) : [];
    setSelectedCities(values);
  };

  const handleLanguageChange = (selectedOptions: SelectOption[] | null) => {
    const values = selectedOptions ? selectedOptions.map((option: SelectOption) => option.value) : [];
    setSelectedLanguages(values);
  };

  const handleSpecialtyChange = (selectedOptions: SelectOption[] | null) => {
    const values = selectedOptions ? selectedOptions.map((option: SelectOption) => option.value) : [];
    setSelectedSpecialties(values);
  };

  const handleNameSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = (e.target as HTMLInputElement).value;
      setNameSearchQuery(v);
    }
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

  const clearAllFilters = () => {
    setSelectedCountries([]);
    setSelectedCities([]);
    setSelectedLanguages([]);
    setSelectedSpecialties([]);
    setNameSearchQuery('');
    setNameInputValue('');
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
                options={toSelectOptions(countries)}
                onChange={handleCountryChange}
                value={selectedCountries.map(v => ({ value: v, label: v }))}
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
                options={toSelectOptions(cities)}
                onChange={handleCityChange}
                value={selectedCities.map(v => ({ value: v, label: v }))}
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
                options={toSelectOptions(languages)}
                onChange={handleLanguageChange}
                value={selectedLanguages.map(v => ({ value: v, label: v }))}
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
            <div className="filter-group">
              <label>Specialties</label>
              <Select
                isMulti
                options={toSelectOptions(specialties)}
                onChange={handleSpecialtyChange}
                value={selectedSpecialties.map(v => ({ value: v, label: v }))}
                placeholder="Specialties..."
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
              <label>Name</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Search by name, press Enter"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                onKeyDown={handleNameSearchKeyDown}
                aria-label="Search by provider name"
              />
            </div>
          </div>
          <button 
            className="filter-clear-all-btn"
            onClick={clearAllFilters}
            title="Clear all filters"
            aria-label="Clear all filters"
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterComponent; 