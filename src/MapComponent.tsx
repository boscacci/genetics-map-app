import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { MapPoint } from './types';
import { cleanLanguageString } from './utils';

// Fix icon paths issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Utility function to normalize longitude for world wrapping
const normalizeLongitude = (lng: number): number => {
  // Normalize longitude to [-180, 180] range
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
};

interface MapComponentProps {
  specialists: MapPoint[];
  filteredSpecialists: MapPoint[];
  center: [number, number];
  zoom: number;
  disableClustering?: boolean; // Add this line
}

// Component to access the map instance
const MapController: React.FC<{ 
  filteredSpecialists: MapPoint[];
  center: [number, number];
  zoom: number;
}> = ({ filteredSpecialists, center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (filteredSpecialists.length === 1) {
      const specialist = filteredSpecialists[0];
      map.setView(
        [specialist.Latitude, normalizeLongitude(specialist.Longitude)],
        8
      );
    }
  }, [filteredSpecialists, map]);

  useEffect(() => {
    map.setView([center[0], normalizeLongitude(center[1])], zoom);
  }, [center, zoom, map]);

  return null;
};

// Custom Zoom Control Component (must be inside MapContainer)
const CustomZoomControl: React.FC = () => {
  const map = useMap();

  const zoomIn = () => {
    map.zoomIn();
  };

  const zoomOut = () => {
    map.zoomOut();
  };

  return (
    <div className="custom-zoom-control">
      <button onClick={zoomIn} className="zoom-btn zoom-in">+</button>
      <button onClick={zoomOut} className="zoom-btn zoom-out">−</button>
    </div>
  );
};

// Memoized marker component to prevent unnecessary re-renders
const SpecialistMarkers: React.FC<{ specialists: MapPoint[] }> = React.memo(({ specialists }) => {
  // Utility to detect mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 900);
  };

  const [openPopupIndex, setOpenPopupIndex] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState<{ [key: number]: boolean }>({});
  const popupRefs = useRef<{ [key: number]: L.Popup | null }>({});

  const openContactModal = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Contact button clicked, opening modal for index:', index);
    setShowContactModal(prev => ({
      ...prev,
      [index]: true
    }));
  };

  const closeContactModal = (index: number) => {
    setShowContactModal(prev => ({
      ...prev,
      [index]: false
    }));
  };

  // Create markers that span the dateline by duplicating ALL points
  const createDatelineMarkers = (specialist: MapPoint, index: number) => {
    const markers = [];
    const normalizedLng = normalizeLongitude(specialist.Longitude);
    
    // Always add the primary marker
    markers.push({ specialist, lng: normalizedLng, index, isDuplicate: false });
    
    // Add a duplicate on the other side of the dateline for ALL points
    // This ensures visibility regardless of map center
    const duplicateLng = normalizedLng > 0 ? normalizedLng - 360 : normalizedLng + 360;
    markers.push({ specialist, lng: duplicateLng, index, isDuplicate: true });
    
    return markers;
  };

  const getWebsiteLink = (website: string) => {
    if (!website) return null;
    
    // Add http if it doesn't exist
    let url = website;
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {website}
      </a>
    );
  };

  // Utility to format languages with commas
  const formatLanguages = (languages: string) => {
    if (!languages) return '';
    // Split on common delimiters: comma, semicolon, ' and ', or whitespace
    return languages
      .split(/,|;|\sand\s|\s+/)
      .map(lang => cleanLanguageString(lang))
      .filter(Boolean)
      .join(', ');
  };

  const createTooltipContent = (specialist: MapPoint) => {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px; font-size: 13px;">
          ${specialist.name_first} ${specialist.name_last}
        </div>
        <div style="color: #555; margin-bottom: 2px;">
          <strong>Institution:</strong> ${specialist.work_institution}
        </div>
        <div style="color: #555; margin-bottom: 2px;">
          <strong>Location:</strong> ${specialist.City}, ${specialist.Country}
        </div>
        ${specialist.language_spoken ? `<div style="color: #555; margin-bottom: 2px;"><strong>Languages:</strong> ${formatLanguages(specialist.language_spoken)}</div>` : ''}
        <div style="color: #555; margin-top: 2px;"><strong>Interpreter Services:</strong> ${specialist.interpreter_services || 'unknown'}</div>
      </div>
    `;
  };

  return (
    <>
      {specialists.flatMap((specialist, index) => {
        const markers = createDatelineMarkers(specialist, index);
        return markers.map((markerData, markerIndex) => {
          const { specialist, lng, index: originalIndex, isDuplicate } = markerData;
          // Determine tooltip class for mobile popup state
          const tooltipClass = `specialist-tooltip${isMobile() && openPopupIndex === originalIndex ? ' hide-on-mobile-popup' : ''}`;
          
          return (
            <Marker 
              key={`${specialist.Latitude}-${lng}-${originalIndex}-${markerIndex}`}
              position={[specialist.Latitude, lng]}
            >
              {/* Only show tooltip if not mobile with popup open */}
              {!(isMobile() && openPopupIndex === originalIndex) && (
                <Tooltip 
                  direction="top" 
                  offset={[0, -10]}
                  opacity={1}
                  permanent={false}
                  className={tooltipClass}
                >
                  <div dangerouslySetInnerHTML={{ __html: createTooltipContent(specialist) }} />
                </Tooltip>
              )}
              <Popup
                ref={(ref) => {
                  if (ref) {
                    popupRefs.current[originalIndex] = ref;
                  }
                }}
                eventHandlers={{
                  popupopen: () => setOpenPopupIndex(originalIndex),
                  popupclose: () => {
                    setOpenPopupIndex(null);
                    // Close contact modal when popup closes
                    setShowContactModal(prev => ({
                      ...prev,
                      [originalIndex]: false
                    }));
                  },
                }}
                closeOnClick={false}
                autoClose={false}
              >
                <div 
                  className="specialist-popup"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <div className="popup-header">
                    <h3 className="popup-name">{specialist.name_first} {specialist.name_last}</h3>
                    <div className="popup-institution">{specialist.work_institution}</div>
                    <button 
                      className="popup-close-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const popup = popupRefs.current[originalIndex];
                        if (popup) {
                          popup.close();
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="popup-details">
                    <div className="detail-item">
                      <span className="detail-label">📍 Location:</span>
                      <span className="detail-value">{specialist.City}, {specialist.Country}</span>
                    </div>
                    
                    {specialist.language_spoken && (
                      <div className="detail-item">
                        <span className="detail-label">🗣️ Languages:</span>
                        <span className="detail-value">{formatLanguages(specialist.language_spoken)}</span>
                      </div>
                    )}
                    
                    <div className="detail-item">
                      <span className="detail-label">🔄 Interpreter Services:</span>
                      <span className="detail-value">{specialist.interpreter_services || 'unknown'}</span>
                    </div>
                  </div>
                  
                  <button 
                    className="contact-me-btn"
                    onClick={(e) => openContactModal(originalIndex, e)}
                  >
                    Contact Me
                  </button>
                  
                </div>
              </Popup>
            </Marker>
          );
        });
      })}
      
      {/* Contact Info Modals */}
      {specialists.map((specialist, index) => (
        showContactModal[index] && (
          <div 
            key={`modal-${index}`} 
            className="contact-modal-overlay"
            onClick={() => closeContactModal(index)}
          >
            <div 
              className="contact-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="contact-modal-header">
                <h3>Contact {specialist.name_first} {specialist.name_last}</h3>
                <button 
                  className="modal-close-btn"
                  onClick={() => closeContactModal(index)}
                >
                  ×
                </button>
              </div>
              
              <div className="contact-modal-content">
                <div className="contact-item">
                  <span className="contact-icon">🏢</span>
                  <span className="contact-text">{specialist.work_institution}</span>
                </div>
                
                {specialist.email && (
                  <div className="contact-item">
                    <span className="contact-icon">📧</span>
                    <a href={`mailto:${specialist.email}`} className="contact-link">
                      {specialist.email}
                    </a>
                  </div>
                )}
                
                {specialist.phone_work && (
                  <div className="contact-item">
                    <span className="contact-icon">📞</span>
                    <a href={`tel:${specialist.phone_work}`} className="contact-link">
                      {specialist.phone_work}
                    </a>
                  </div>
                )}
                
                {specialist.work_website && (
                  <div className="contact-item">
                    <span className="contact-icon">🌐</span>
                    {getWebsiteLink(specialist.work_website)}
                  </div>
                )}
                
                <div className="contact-item">
                  <span className="contact-icon">📍</span>
                  <span className="contact-text">
                    {specialist.work_address ? `${specialist.work_address}, ` : ''}
                    {specialist.City}, {specialist.Country}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      ))}
    </>
  );
});

const MapComponent: React.FC<MapComponentProps> = ({ specialists, filteredSpecialists, center, zoom, disableClustering = false }) => {
  // Memoize the professionals to show based on filtering
  const specialistsToShow = useMemo(() => {
    return filteredSpecialists.length > 0 ? filteredSpecialists : specialists;
  }, [filteredSpecialists, specialists]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // Disable default zoom control
        worldCopyJump={true} // Enable seamless world wrapping
        maxBounds={[[-90, -Infinity], [90, Infinity]]} // Allow horizontal infinite panning
        maxBoundsViscosity={0.0} // No bounds restriction
        minZoom={1} // Allow very zoomed out view to see whole world
      >
        <MapController 
          filteredSpecialists={filteredSpecialists} 
          center={center}
          zoom={zoom}
        />
        <CustomZoomControl />
        <TileLayer
          attribution="©OpenStreetMap contributors ©CartoDB"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {disableClustering ? (
          <SpecialistMarkers key="no-cluster" specialists={specialistsToShow} />
        ) : (
          <MarkerClusterGroup 
            key="with-cluster"
            removeOutsideVisibleBounds={false}
          >
            <SpecialistMarkers specialists={specialistsToShow} />
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent; 