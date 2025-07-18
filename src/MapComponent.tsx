import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { MapPoint } from './types';

// Fix icon paths issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapComponentProps {
  specialists: MapPoint[];
  filteredSpecialists: MapPoint[];
  center: [number, number];
  zoom: number;
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
        [specialist.Latitude, specialist.Longitude],
        8
      );
    }
  }, [filteredSpecialists, map]);

  useEffect(() => {
    map.setView(center, zoom);
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

  const createTooltipContent = (specialist: MapPoint) => {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px; font-size: 13px;">
          ${specialist.name_first} ${specialist.name_last}
        </div>
        <div style="color: #555; margin-bottom: 2px;">
          <strong>Institution:</strong> ${specialist.work_institution}
        </div>
        ${specialist.email ? `<div style="color: #555; margin-bottom: 2px;"><strong>Email:</strong> ${specialist.email}</div>` : ''}
        ${specialist.phone_work ? `<div style="color: #555; margin-bottom: 2px;"><strong>Phone:</strong> ${specialist.phone_work}</div>` : ''}
        ${specialist.work_website ? `<div style="color: #555; margin-bottom: 2px;"><strong>Website:</strong> ${specialist.work_website}</div>` : ''}
        <div style="color: #555; margin-bottom: 2px;">
          <strong>Address:</strong> ${specialist.work_address || `${specialist.City}, ${specialist.Country}`}
        </div>
        ${specialist.language_spoken ? `<div style="color: #555;"><strong>Languages:</strong> ${specialist.language_spoken}</div>` : ''}
      </div>
    `;
  };

  return (
    <>
      {specialists.map((specialist, index) => (
        <Marker 
          key={`${specialist.Latitude}-${specialist.Longitude}-${index}`}
          position={[specialist.Latitude, specialist.Longitude]}
        >
          <Tooltip 
            direction="top" 
            offset={[0, -10]}
            opacity={1}
            permanent={false}
            className="specialist-tooltip"
          >
            <div dangerouslySetInnerHTML={{ __html: createTooltipContent(specialist) }} />
          </Tooltip>
          <Popup>
            <div>
              <h3>{specialist.name_first} {specialist.name_last}</h3>
              <p><strong>Institution:</strong> {specialist.work_institution}</p>
              {specialist.email && <p><strong>Email:</strong> <a href={`mailto:${specialist.email}`}>{specialist.email}</a></p>}
              {specialist.phone_work && <p><strong>Phone:</strong> {specialist.phone_work}</p>}
              {specialist.work_website && <p><strong>Website:</strong> {getWebsiteLink(specialist.work_website)}</p>}
              <p><strong>Address:</strong> {specialist.work_address || `${specialist.City}, ${specialist.Country}`}</p>
              {specialist.language_spoken && <p><strong>Languages:</strong> {specialist.language_spoken}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

const MapComponent: React.FC<MapComponentProps> = ({ specialists, filteredSpecialists, center, zoom }) => {
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
      >
        <MapController 
          filteredSpecialists={filteredSpecialists} 
          center={center}
          zoom={zoom}
        />
        <CustomZoomControl />
        <TileLayer
          attribution=""
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup>
          <SpecialistMarkers specialists={specialistsToShow} />
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default MapComponent; 