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

// Custom marker icons
const createIcon = (color) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const startIcon = createIcon('#22c55e'); // Green
const endIcon = createIcon('#ef4444');   // Red
const currentIcon = createIcon('#3b82f6'); // Blue (for live tracking)

// Component to auto-fit bounds when waypoints change
function FitBounds({ waypoints }) {
  const map = useMap();
  
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(wp => [wp.latitude, wp.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [waypoints, map]);
  
  return null;
}

// Component to center on current location during live tracking
function CenterOnLocation({ location, follow }) {
  const map = useMap();
  
  useEffect(() => {
    if (location && follow) {
      map.setView([location.latitude, location.longitude], map.getZoom());
    }
  }, [location, follow, map]);
  
  return null;
}

export default function TripMap({ 
  waypoints = [], 
  matchedCoordinates = [],  // Road-snapped coordinates (preferred)
  isRoadMatched = false,
  matchConfidence = 0,
  currentLocation = null,
  isLiveTracking = false,
  followLocation = true,
  height = '300px',
  showWaypoints = false 
}) {
  const mapRef = useRef(null);
  
  // Determine center point
  const getCenter = () => {
    if (currentLocation) {
      return [currentLocation.latitude, currentLocation.longitude];
    }
    // Prefer matched coordinates for center if available
    const coordsToUse = (isRoadMatched && matchedCoordinates.length > 0) ? matchedCoordinates : waypoints;
    if (coordsToUse.length > 0) {
      return [coordsToUse[0].latitude, coordsToUse[0].longitude];
    }
    return [37.7749, -122.4194]; // Default to San Francisco
  };

  // Use road-matched coordinates if available, otherwise use raw waypoints
  const displayCoordinates = (isRoadMatched && matchedCoordinates.length > 0) ? matchedCoordinates : waypoints;
  
  // Create polyline coordinates
  const polylinePositions = displayCoordinates.map(wp => [wp.latitude, wp.longitude]);
  
  // Also create raw waypoints polyline for comparison (semi-transparent)
  const rawPolylinePositions = waypoints.map(wp => [wp.latitude, wp.longitude]);
  
  // Add current location to polyline if live tracking
  if (isLiveTracking && currentLocation) {
    polylinePositions.push([currentLocation.latitude, currentLocation.longitude]);
  }

  const center = getCenter();

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Auto-fit bounds for completed trips */}
        {!isLiveTracking && displayCoordinates.length > 1 && (
          <FitBounds waypoints={displayCoordinates} />
        )}
        
        {/* Center on location for live tracking */}
        {isLiveTracking && currentLocation && (
          <CenterOnLocation location={currentLocation} follow={followLocation} />
        )}
        
        {/* Raw GPS polyline (shown faded when road-matched route is available) */}
        {isRoadMatched && rawPolylinePositions.length > 1 && (
          <Polyline
            positions={rawPolylinePositions}
            color="#94a3b8"
            weight={2}
            opacity={0.4}
            dashArray="5, 10"
          />
        )}
        
        {/* Main route polyline (road-matched if available) */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color={isRoadMatched ? "#22c55e" : "#FF1493"}
            weight={4}
            opacity={0.8}
          />
        )}
        
        {/* Start marker */}
        {displayCoordinates.length > 0 && (
          <Marker 
            position={[displayCoordinates[0].latitude, displayCoordinates[0].longitude]} 
            icon={startIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>Start</strong>
                {displayCoordinates[0].timestamp && (
                  <>
                    <br />
                    {new Date(displayCoordinates[0].timestamp).toLocaleTimeString()}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* End marker (for completed trips) */}
        {!isLiveTracking && displayCoordinates.length > 1 && (
          <Marker 
            position={[displayCoordinates[displayCoordinates.length - 1].latitude, displayCoordinates[displayCoordinates.length - 1].longitude]} 
            icon={endIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>End</strong>
                {displayCoordinates[displayCoordinates.length - 1].timestamp && (
                  <>
                    <br />
                    {new Date(displayCoordinates[displayCoordinates.length - 1].timestamp).toLocaleTimeString()}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Current location marker (for live tracking) */}
        {isLiveTracking && currentLocation && (
          <Marker 
            position={[currentLocation.latitude, currentLocation.longitude]} 
            icon={currentIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>Current Location</strong>
                <br />
                Accuracy: {Math.round(currentLocation.accuracy || 0)}m
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Optional: Show all waypoints */}
        {showWaypoints && waypoints.slice(1, -1).map((wp, index) => (
          <Marker
            key={index}
            position={[wp.latitude, wp.longitude]}
            icon={new L.DivIcon({
              className: 'waypoint-marker',
              html: `<div style="
                background-color: #8B5CF6;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                border: 2px solid white;
              "></div>`,
              iconSize: [8, 8],
              iconAnchor: [4, 4],
            })}
          />
        ))}
        
        {/* Road-matched indicator badge */}
        {isRoadMatched && matchConfidence > 0 && (
          <div 
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              zIndex: 1000,
              backgroundColor: 'rgba(34, 197, 94, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ✓ Road-Matched ({Math.round(matchConfidence * 100)}%)
          </div>
        )}
      </MapContainer>
    </div>
  );
}
