import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapPoint } from './types';
import MapComponent from './MapComponent';
import FilterComponent from './FilterComponent';
import { loadSecureData, publicData } from './secureData';
import { ENCRYPTED_SPECIALISTS_DATA } from './secureDataBlob';
import './App.css';
import { sha256Hex } from './utils';

// Remove all .env, salt, hash, and fallback logic

const App: React.FC = () => {
  const [specialists, setSpecialists] = useState<MapPoint[]>([]);
  const [filteredSpecialists, setFilteredSpecialists] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([15, 30]);
  const [mapZoom, setMapZoom] = useState<number>(3);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [decryptionKey, setDecryptionKey] = useState<string>('');
  const [activeFilteredIndex, setActiveFilteredIndex] = useState<number>(0);

  // Add the hash of the secret key (from .env.generated)
  const SECRET_HASH = "ceab1bbbeeb4fba30a0284b5246f4977a4d51bf0fec451c54a421eb7eeb78ccd";

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get('key');
    if (urlKey && urlKey.trim().length > 0) {
      // Hash the key and compare to stored hash
      const keyHash = sha256Hex(urlKey.trim());
      if (keyHash === SECRET_HASH) {
        setIsAuthenticated(true);
        setAuthChecked(true);
        setDecryptionKey(urlKey);
      } else {
        setIsAuthenticated(false);
        setAuthChecked(true);
        setError('Incorrect key provided in URL. Please check your ?key= value.');
      }
    } else {
      setIsAuthenticated(false);
      setAuthChecked(true);
      setError('No key provided in URL. Please access the app with ?key=YOURSECRET');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && decryptionKey) {
      try {
        const secureData = loadSecureData(decryptionKey);
        if (secureData.length === 0) {
          setError('Failed to decrypt data. The key may be incorrect.');
          setLoading(false);
          return;
        }
        setSpecialists(secureData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading secure data:', err);
        setError('Failed to load secure data. Please check your key and try again.');
        setLoading(false);
      }
    }
  }, [isAuthenticated, decryptionKey]);

  const handleFilterMapNavigation = (lat: number, lng: number, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  };

  // When filters change, update list and reset active index
  const handleFilterChange = (filtered: MapPoint[]) => {
    setFilteredSpecialists(filtered);
    setActiveFilteredIndex(0);
  };

  // Navigate to previous/next filtered specialist without changing filters
  const navigateFiltered = useCallback((direction: 'prev' | 'next') => {
    if (!filteredSpecialists || filteredSpecialists.length === 0) return;
    const count = filteredSpecialists.length;
    const nextIndex = direction === 'next'
      ? (activeFilteredIndex + 1) % count
      : (activeFilteredIndex - 1 + count) % count;
    setActiveFilteredIndex(nextIndex);

    const target = filteredSpecialists[nextIndex];
    if (target && typeof target.Latitude === 'number' && typeof target.Longitude === 'number') {
      // Pan/zoom to the selected specialist at a reasonable detail level
      setMapCenter([target.Latitude, target.Longitude]);
      setMapZoom(Math.max(mapZoom, 8));
    }
  }, [filteredSpecialists, activeFilteredIndex, mapZoom]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (filteredSpecialists.length <= 1) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateFiltered('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateFiltered('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSpecialists, navigateFiltered]);

  const handleFilterDropdownStateChange = (isOpen: boolean) => {
    setIsFilterDropdownOpen(isOpen);
  };

  // Determine if clustering should be disabled based on filter state
  // Clustering is disabled when:
  // 1. Any filters are applied (country, city, language)
  // 2. User has zoomed in significantly (zoom >= 8, likely from location search)
  // This provides better visibility when users have narrowed down their search
  const shouldDisableClustering = useMemo(() => {
    // Disable clustering if any filters are applied
    const hasFilters = filteredSpecialists.length > 0 && filteredSpecialists.length !== specialists.length;
    
    // Also disable clustering if we're zoomed in significantly (likely from a location search)
    const isZoomedIn = mapZoom >= 8;
    
    const shouldDisable = hasFilters || isZoomedIn;
    
    
    return shouldDisable;
  }, [filteredSpecialists.length, specialists.length, mapZoom]);

  if (!authChecked) {
    return (
      <div className="app-container">
        <div className="header" style={{textAlign: 'center', padding: '2rem'}}>
          <h2>Authenticating...</h2>
          <p>Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <div className="header" style={{color:'#b71c1c', textAlign: 'center', padding: '2rem'}}>
          <h2>Authentication Required</h2>
          <p>This application requires a secret key in the URL to access data.</p>
          <p>Example: <code>?key=YOURSECRET</code></p>
          {error && <div style={{color: 'red', marginTop: '1rem'}}>{error}</div>}
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="app-container"><div className="header">Loading data...</div></div>;
  }
  if (error) {
    return <div className="app-container"><div className="header">Error: {error}</div></div>;
  }

  return (
    <div className="app-container">
      <div className="map-container">
        <MapComponent
          specialists={specialists}
          filteredSpecialists={filteredSpecialists}
          center={mapCenter}
          zoom={mapZoom}
          disableClustering={shouldDisableClustering}
        />
        <FilterComponent
          specialists={specialists}
          onFilterChange={handleFilterChange}
          onMapNavigation={handleFilterMapNavigation}
          onDropdownStateChange={handleFilterDropdownStateChange}
        />
        {!isMobile() && (
          <div className={`specialist-counter ${isFilterDropdownOpen ? 'filter-dropdown-open' : ''}`}>
            <span className="counter-text">
              {filteredSpecialists.length > 0 && filteredSpecialists.length !== specialists.length ? (
                <>
                  <button
                    className="counter-nav-btn"
                    onClick={() => navigateFiltered('prev')}
                    title="Previous (←)"
                    disabled={filteredSpecialists.length <= 1}
                    aria-label="Previous specialist"
                  >
                    ◀
                  </button>
                  <span className="counter-label">Showing:</span> {activeFilteredIndex + 1}
                  <span className="counter-total"> of {filteredSpecialists.length}</span>
                  <button
                    className="counter-nav-btn"
                    onClick={() => navigateFiltered('next')}
                    title="Next (→)"
                    disabled={filteredSpecialists.length <= 1}
                    aria-label="Next specialist"
                  >
                    ▶
                  </button>
                </>
              ) : (
                <>
                  {specialists.length} <span className="counter-label">Professionals</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App; 