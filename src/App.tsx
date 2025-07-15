import React, { useState, useEffect } from 'react';
import { MapPoint } from './types';
import MapComponent from './MapComponent';
import FilterComponent from './FilterComponent';
import GlobalSearchBar from './GlobalSearchBar';
import { specialistsData } from './specialistsData';
import './App.css';

const SECRET_PASSPHRASE = process.env.REACT_APP_SECRET_PASSPHRASE || '';

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
  const [authAttempts, setAuthAttempts] = useState<number>(0);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPass = urlParams.get('key');
    
    if (urlPass === SECRET_PASSPHRASE) {
      setIsAuthenticated(true);
      setAuthChecked(true);
      return;
    }

    const isInIframe = window !== window.parent;
    
    if (isInIframe) {
      let messageHandler: ((event: MessageEvent) => void) | null = null;
      let timeoutId: number | null = null;
      let retryTimeoutId: number | null = null;
      
      messageHandler = (event: MessageEvent) => {
        if (
          event.data &&
          event.data.type === 'authenticate' &&
          event.data.passphrase === SECRET_PASSPHRASE
        ) {
          setIsAuthenticated(true);
          setAuthChecked(true);
          
          if (messageHandler) window.removeEventListener('message', messageHandler);
          if (timeoutId) window.clearTimeout(timeoutId);
          if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      const timeoutDuration = isMobile() ? 20000 : 15000;
      
      timeoutId = window.setTimeout(() => {
        if (isMobile() && authAttempts < 2) {
          console.log('Mobile authentication timeout, attempting fallback...');
          setAuthAttempts(prev => prev + 1);
          
          try {
            window.parent.postMessage({
              type: 'requestAuthentication',
              passphrase: SECRET_PASSPHRASE
            }, '*');
          } catch (e) {
            console.log('Fallback postMessage failed:', e);
          }
          
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
      setAuthChecked(true);
    }
  }, [authAttempts]);

  useEffect(() => {
    if (isAuthenticated) {
      try {
        setSpecialists(specialistsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load data');
        setLoading(false);
        console.error(err);
      }
    }
  }, [isAuthenticated]);

  const handleLocationSearch = (lat: number, lng: number, name: string, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  };

  const handleFilterMapNavigation = (lat: number, lng: number, zoom: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  };

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
          <p>This application requires authentication to access data.</p>
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
    return <div className="app-container"><div className="header">Loading data...</div></div>;
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
        {!isMobile() && (
          <div className="specialist-counter">
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