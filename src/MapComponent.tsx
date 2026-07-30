import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { MapPoint } from './types';
import ContactDetailsModal from './ContactDetailsModal';
import {
  cleanDisplayValue as cleanDisplay,
  displayInstitution,
  displayLocation,
  displayName,
  formatInterpreterServices,
  formatLanguages,
  isFlagTrue,
  shouldShowInstitution,
} from './providerDisplay';

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

  // Do not auto-zoom when a single specialist remains after filtering; keep the
  // current zoom/center unless the parent explicitly requests navigation.

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

  // Function to close all popups except the specified one
  const closeAllPopupsExcept = (exceptIndex: number) => {
    Object.keys(popupRefs.current).forEach(key => {
      const index = parseInt(key);
      if (index !== exceptIndex && popupRefs.current[index]) {
        popupRefs.current[index].close();
      }
    });
  };

  // Effect to ensure only one popup is open at a time
  useEffect(() => {
    if (openPopupIndex !== null) {
      closeAllPopupsExcept(openPopupIndex);
    }
  }, [openPopupIndex]);

  const openContactModal = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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

  const renderTooltipContent = (specialist: MapPoint) => {
    const safeName = isFlagTrue(specialist.hide_name)
      ? 'Anonymous Contributor'
      : displayName(specialist.name_first, specialist.name_last);
    const showInstitution = shouldShowInstitution(specialist);
    const loc = displayLocation(specialist.City, specialist.Country);
    const specialtyText = cleanDisplay(specialist.specialties);
    const languageText = specialist.language_spoken ? formatLanguages(specialist.language_spoken) : '';
    const interpreterServicesText = formatInterpreterServices(specialist.interpreter_services);

    return (
      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", minWidth: 220, maxWidth: 280 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#2c3e50', lineHeight: 1.3 }}>
            {safeName}
          </div>
          {showInstitution && (
            <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 500, marginTop: 8, marginBottom: 5 }}>
              {displayInstitution(specialist.work_institution)}
            </div>
          )}
          <div className="provider-facts tooltip-facts">
          {loc && (
            <div className="provider-fact-item tooltip-location">
              <span className="provider-fact-label">📍 Location:</span>
              <span className="provider-fact-value">{loc}</span>
            </div>
          )}
          {specialtyText && (
            <div className="provider-fact-item tooltip-specialties">
              <span className="provider-fact-label">🧬 Specialty:</span>
              <span className="provider-fact-value">{specialtyText}</span>
            </div>
          )}
          {languageText && (
            <div className="provider-fact-item tooltip-languages">
              <span className="provider-fact-label">🗣️ Languages:</span>
              <span className="provider-fact-value">{languageText}</span>
            </div>
          )}
          <div className="provider-fact-item tooltip-interpreter-services">
            <span className="provider-fact-label">🔄 Interpreter Services:</span>
            <span className="provider-fact-value">{interpreterServicesText}</span>
          </div>
          </div>
        </div>

        <div style={{ padding: '6px 10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 500, textAlign: 'center', marginTop: 6 }}>
          Click to contact
        </div>
      </div>
    );
  };

  return (
    <>
      {specialists.flatMap((specialist, index) => {
        const showInstitution = shouldShowInstitution(specialist);
        const safeName = isFlagTrue(specialist.hide_name)
          ? 'Anonymous Contributor'
          : displayName(specialist.name_first, specialist.name_last);
        const markers = createDatelineMarkers(specialist, index);
        return markers.map((markerData, markerIndex) => {
          const { specialist, lng, index: originalIndex, isDuplicate } = markerData;
          const specialtyText = cleanDisplay(specialist.specialties);
          const jobTitle = cleanDisplay(specialist.job_title);
          const languageText = specialist.language_spoken ? formatLanguages(specialist.language_spoken) : '';
          const interpreterServicesText = formatInterpreterServices(specialist.interpreter_services);
          // Determine tooltip class for mobile popup state
          const tooltipClass = `specialist-tooltip${isMobile() && openPopupIndex === originalIndex ? ' hide-on-mobile-popup' : ''}`;
          
          return (
            <Marker 
              key={`${specialist.Latitude}-${lng}-${originalIndex}-${markerIndex}`}
              position={[specialist.Latitude, lng]}
              eventHandlers={{
                click: () => {
                  // Close all other popups when clicking a marker
                  closeAllPopupsExcept(originalIndex);
                }
              }}
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
                  {renderTooltipContent(specialist)}
                </Tooltip>
              )}
              <Popup
                ref={(ref) => {
                  if (ref) {
                    popupRefs.current[originalIndex] = ref;
                  }
                }}
                eventHandlers={{
                  popupopen: () => {
                    // Close all other popups when this one opens
                    closeAllPopupsExcept(originalIndex);
                    setOpenPopupIndex(originalIndex);
                  },
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
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="popup-header">
                    <h3 className="popup-name">{safeName}</h3>
                    {jobTitle && (
                      <div className="popup-title">{jobTitle}</div>
                    )}
                    {showInstitution && (
                      <div className="popup-institution">{displayInstitution(specialist.work_institution)}</div>
                    )}
                  </div>

                  <div className="popup-details provider-facts">
                    <div className="provider-fact-item">
                      <span className="provider-fact-label">📍 Location:</span>
                      <span className="provider-fact-value">{displayLocation(specialist.City, specialist.Country)}</span>
                    </div>

                    {specialtyText && (
                      <div className="provider-fact-item popup-specialties">
                        <span className="provider-fact-label">🧬 Specialty:</span>
                        <span className="provider-fact-value">{specialtyText}</span>
                      </div>
                    )}
                    
                    {languageText && (
                      <div className="provider-fact-item">
                        <span className="provider-fact-label">🗣️ Languages:</span>
                        <span className="provider-fact-value">{languageText}</span>
                      </div>
                    )}
                    
                    <div className="provider-fact-item">
                      <span className="provider-fact-label">🔄 Interpreter Services:</span>
                      <span className="provider-fact-value">{interpreterServicesText}</span>
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
        showContactModal[index] ? (
          <ContactDetailsModal
            key={`modal-${index}`}
            specialist={specialist}
            onClose={() => closeContactModal(index)}
          />
        ) : null
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
