import React, { useState, useEffect, useMemo } from 'react';
import { MapPoint } from './types';
import MapComponent from './MapComponent';
import FilterComponent from './FilterComponent';
import GlobalSearchBar from './GlobalSearchBar';
import { loadSecureData, publicData } from './secureData';
import { ENCRYPTED_SPECIALISTS_DATA } from './secureDataBlob';
import './App.css';
import { sha256Hex } from './utils';

// Remove all .env, salt, hash, and fallback logic

const App: React.FC = () => {
  const [specialists, setSpecialists] = useState<MapPoint[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [filteredSpecialists, setFilteredSpecialists] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([15, 30]);
  const [mapZoom, setMapZoom] = useState<number>(3);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [decryptionKey, setDecryptionKey] = useState<string>('');

  // Add the hash of the secret key (from .env.generated)
  const SECRET_HASH = "1935f546c8a0ee7eda367bbbec71208946c2351108d13cfa6f57a922b84db251";

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
        setError('Failed to load secure data.');
        setLoading(false);
      }
    }
  }, [isAuthenticated, decryptionKey]);

  const handleLocationSearch = (lat: number, lng: number, name: string, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  };

  const handleFilterMapNavigation = (lat: number, lng: number, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  };

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
    
    // Debug logging
    console.log('Clustering state:', {
      filteredCount: filteredSpecialists.length,
      totalCount: specialists.length,
      hasFilters,
      isZoomedIn,
      mapZoom,
      shouldDisable
    });
    
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
        <div className={`search-overlay ${isFilterDropdownOpen ? 'filter-dropdown-open' : ''}`}>
          <GlobalSearchBar 
            value={globalSearch} 
            onChange={setGlobalSearch} 
            onLocationSearch={handleLocationSearch}
            isFilterDropdownOpen={isFilterDropdownOpen}
          />
        </div>
        <MapComponent
          specialists={specialists}
          filteredSpecialists={filteredSpecialists}
          center={mapCenter}
          zoom={mapZoom}
          disableClustering={shouldDisableClustering}
        />
        <FilterComponent
          specialists={specialists}
          onFilterChange={setFilteredSpecialists}
          onMapNavigation={handleFilterMapNavigation}
          onDropdownStateChange={handleFilterDropdownStateChange}
        />
        {!isMobile() && (
          <div className={`specialist-counter ${isFilterDropdownOpen ? 'filter-dropdown-open' : ''}`}>
            <span className="counter-text">
              {filteredSpecialists.length > 0 && filteredSpecialists.length !== specialists.length ? (
                <>
                  <span className="counter-label">Showing:</span> {filteredSpecialists.length}
                  <span className="counter-total"> of {specialists.length}</span>
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