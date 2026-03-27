/**
 * TripMap Component
 * Displays a GPS trip route on an interactive map using Leaflet
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
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

// Current position icon (pulsing blue dot)
const currentPositionIcon = new L.DivIcon({
  className: 'current-position-marker',
  html: `<div style="
    position: relative;
    width: 20px;
    height: 20px;
  ">
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      background: #3B82F6;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      animation: pulse 2s ease-in-out infinite;
    "></div>
    <div style="
      position: absolute;
      top: -5px;
      left: -5px;
      width: 30px;
      height: 30px;
      background: rgba(59, 130, 246, 0.3);
      border-radius: 50%;
      animation: ripple 2s ease-out infinite;
    "></div>
  </div>
  <style>
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    @keyframes ripple {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
  </style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
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

// Component to pan to current position when it changes
function PanToPosition({ position, enabled }) {
  const map = useMap();
  
  useEffect(() => {
    if (enabled && position) {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
  }, [map, position, enabled]);
  
  return null;
}

export default function TripMap({ 
  locations = [], 
  height = "200px",
  showMarkers = true,
  showCurrentPosition = false,
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
  const currentPosition = positions[positions.length - 1];
  const center = showCurrentPosition ? currentPosition : startPosition;
  
  return (
    <div className={`rounded-lg overflow-hidden shadow-md ${className}`} style={{ height }}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={15}
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
        
        {/* Current position marker (pulsing) for live tracking */}
        {showCurrentPosition && positions.length > 1 && (
          <Marker position={currentPosition} icon={currentPositionIcon}>
            <Popup>
              <div className="text-center">
                <strong className="text-blue-600">Current Location</strong>
                <br />
                <span className="text-xs text-gray-500">
                  {locations[locations.length - 1]?.timestamp 
                    ? new Date(locations[locations.length - 1].timestamp).toLocaleTimeString() 
                    : 'Now'}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* End marker (only show when NOT live tracking and trip is complete) */}
        {showMarkers && !showCurrentPosition && positions.length > 1 && (
          <Marker position={currentPosition} icon={endIcon}>
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
        
        {/* Pan to current position during live tracking */}
        {showCurrentPosition && (
          <PanToPosition position={currentPosition} enabled={showCurrentPosition} />
        )}
      </MapContainer>
    </div>
  );
}
