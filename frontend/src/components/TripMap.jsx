/**
 * TripMap Component
 * Displays a GPS trip route on an interactive map using Leaflet
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for start and end markers
const startIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background: linear-gradient(135deg, #10B981, #059669);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="color: white; font-size: 12px; font-weight: bold;">S</span>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background: linear-gradient(135deg, #EF4444, #DC2626);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="color: white; font-size: 12px; font-weight: bold;">E</span>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to fit map bounds to the route
function FitBounds({ positions }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, positions]);
  
  return null;
}

export default function TripMap({ 
  locations = [], 
  height = "200px",
  showMarkers = true,
  className = ""
}) {
  const mapRef = useRef(null);
  
  // Convert locations to [lat, lng] format for Leaflet
  const positions = locations
    .filter(loc => loc.latitude && loc.longitude)
    .map(loc => [loc.latitude, loc.longitude]);
  
  // If no positions, show placeholder
  if (positions.length === 0) {
    return (
      <div 
        className={`bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm">No route data</p>
        </div>
      </div>
    );
  }
  
  const startPosition = positions[0];
  const endPosition = positions[positions.length - 1];
  const center = startPosition;
  
  return (
    <div className={`rounded-lg overflow-hidden shadow-md ${className}`} style={{ height }}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        {/* Map tiles - using OpenStreetMap (free) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route line */}
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#10B981',
            weight: 4,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
        
        {/* Start marker */}
        {showMarkers && (
          <Marker position={startPosition} icon={startIcon}>
            <Popup>
              <div className="text-center">
                <strong className="text-green-600">Start</strong>
                <br />
                <span className="text-xs text-gray-500">
                  {locations[0]?.timestamp ? new Date(locations[0].timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* End marker (only if different from start) */}
        {showMarkers && positions.length > 1 && (
          <Marker position={endPosition} icon={endIcon}>
            <Popup>
              <div className="text-center">
                <strong className="text-red-600">End</strong>
                <br />
                <span className="text-xs text-gray-500">
                  {locations[locations.length - 1]?.timestamp 
                    ? new Date(locations[locations.length - 1].timestamp).toLocaleTimeString() 
                    : ''}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Fit bounds to route */}
        <FitBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
