import React, { useState, useEffect } from 'react';
import { GeneticSpecialist } from './types';
import MapComponent from './MapComponent';
import FilterComponent from './FilterComponent';
import GlobalSearchBar from './GlobalSearchBar';
import { specialistsData } from './specialistsData';
import './App.css';

// SECURITY: Use environment variable for passphrase
const SECRET_PASSPHRASE = process.env.REACT_APP_SECRET_PASSPHRASE || '';

const App: React.FC = () => {
  const [specialists, setSpecialists] = useState<GeneticSpecialist[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [filteredSpecialists, setFilteredSpecialists] = useState<GeneticSpecialist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 50]);
  const [mapZoom, setMapZoom] = useState<number>(4);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authAttempts, setAuthAttempts] = useState<number>(0);

  // Detect mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  // Authentication logic
  useEffect(() => {
    // 1. Check URL param for local/test use
    const urlParams = new URLSearchParams(window.location.search);
    const urlPass = urlParams.get('key');
    
    // Debug URL parameter authentication
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[DEBUG] URL parameter key:', urlPass);
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Expected passphrase:', SECRET_PASSPHRASE);
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Authentication match:', urlPass === SECRET_PASSPHRASE);
    }
    
    if (urlPass === SECRET_PASSPHRASE) {
      setIsAuthenticated(true);
      setAuthChecked(true);
      return;
    }

    // 2. Check if we're in an iframe (for Squarespace embedding)
    const isInIframe = window !== window.parent;
    
    if (isInIframe) {
      let messageHandler: ((event: MessageEvent) => void) | null = null;
      let timeoutId: number | null = null;
      let retryTimeoutId: number | null = null;
      
      // Wait for postMessage from parent
      messageHandler = (event: MessageEvent) => {
        if (
          event.data &&
          event.data.type === 'authenticate' &&
          event.data.passphrase === SECRET_PASSPHRASE
        ) {
          setIsAuthenticated(true);
          setAuthChecked(true);
          
          // Clean up
          if (messageHandler) window.removeEventListener('message', messageHandler);
          if (timeoutId) window.clearTimeout(timeoutId);
          if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Mobile-specific timeout: 20 seconds for mobile, 15 for desktop
      const timeoutDuration = isMobile() ? 20000 : 15000;
      
      timeoutId = window.setTimeout(() => {
        // If we're on mobile and postMessage failed, try a fallback
        if (isMobile() && authAttempts < 2) {
          console.log('Mobile authentication timeout, attempting fallback...');
          setAuthAttempts(prev => prev + 1);
          
          // Try sending a message to parent requesting authentication
          try {
            window.parent.postMessage({
              type: 'requestAuthentication',
              passphrase: SECRET_PASSPHRASE
            }, '*');
          } catch (e) {
            console.log('Fallback postMessage failed:', e);
          }
          
          // Wait another 10 seconds for the fallback
          retryTimeoutId = window.setTimeout(() => {
            setAuthChecked(true);
          }, 10000);
        } else {
          setAuthChecked(true);
        }
      }, timeoutDuration);
      
      return () => {
        if (messageHandler) window.removeEventListener('message', messageHandler);
        if (timeoutId) window.clearTimeout(timeoutId);
        if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
      };
    } else {
      // 3. Direct access - show authentication prompt
      setAuthChecked(true);
    }
  }, [authAttempts]);

  // SECURE: Data loading from processed data
  useEffect(() => {
    if (isAuthenticated) {
      try {
        setSpecialists(specialistsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load genetic professionals data');
        setLoading(false);
        console.error(err);
      }
    }
  }, [isAuthenticated]);

  // Handle location search
  const handleLocationSearch = (lat: number, lng: number, name: string, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom); // Use the context-fitting zoom level
  };

  // Handle filter-triggered map navigation
  const handleFilterMapNavigation = (lat: number, lng: number, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  };

  // Conditional rendering - after all hooks
  if (!authChecked) {
    return (
      <div className="app-container">
        <div className="header" style={{textAlign: 'center', padding: '2rem'}}>
          <h2>Authenticating...</h2>
          <p>Please wait while we verify your access.</p>
          {isMobile() && (
            <p style={{fontSize: '0.9rem', opacity: 0.8}}>
              Mobile device detected - this may take a moment longer.
            </p>
          )}
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <div className="header" style={{color:'#b71c1c', textAlign: 'center', padding: '2rem'}}>
          <h2>Authentication Required</h2>
          <p>This application requires authentication to access genetic professionals data.</p>
          {isMobile() && (
            <div style={{marginTop: '1rem', fontSize: '0.9rem'}}>
              <p><strong>Mobile users:</strong> If you're having trouble accessing the map, try:</p>
              <ul style={{textAlign: 'left', display: 'inline-block', margin: '0.5rem 0'}}>
                <li>Refreshing the page</li>
                <li>Using a desktop browser</li>
                <li>Contacting support if the issue persists</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="app-container"><div className="header">Loading genetic professionals data...</div></div>;
  }
  if (error) {
    return <div className="app-container"><div className="header">Error: {error}</div></div>;
  }

  return (
    <div className="app-container">
      <div className="map-container">
        <div className="search-overlay">
          <GlobalSearchBar 
            value={globalSearch} 
            onChange={setGlobalSearch} 
            onLocationSearch={handleLocationSearch}
          />
        </div>
        <MapComponent
          specialists={specialists}
          filteredSpecialists={filteredSpecialists}
          center={mapCenter}
          zoom={mapZoom}
        />
        <FilterComponent
          specialists={specialists}
          onFilterChange={setFilteredSpecialists}
          onMapNavigation={handleFilterMapNavigation}
        />
      </div>
    </div>
  );
};

export default App; 