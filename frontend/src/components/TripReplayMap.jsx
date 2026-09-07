/**
 * TripReplayMap - Animated route replay using Leaflet
 * Shows a car marker traveling along the OSRM route geometry
 * with progressive polyline reveal and playback controls.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

// Marker icons
const startIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background: linear-gradient(135deg, #10B981, #059669);
    width: 22px; height: 22px; border-radius: 50%;
    border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "><span style="color: white; font-size: 11px; font-weight: bold;">S</span></div>`,
  iconSize: [22, 22], iconAnchor: [11, 11],
});

const endIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background: linear-gradient(135deg, #EF4444, #DC2626);
    width: 22px; height: 22px; border-radius: 50%;
    border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "><span style="color: white; font-size: 11px; font-weight: bold;">E</span></div>`,
  iconSize: [22, 22], iconAnchor: [11, 11],
});

const carIcon = new L.DivIcon({
  className: 'car-marker',
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #3B82F6; border: 3px solid white;
    box-shadow: 0 3px 12px rgba(59,130,246,0.5);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s ease;
  "><span style="font-size: 14px;">🚗</span></div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    } else if (positions?.length === 1) {
      map.setView(positions[0], 15);
    }
  }, [map, positions]);
  return null;
}

function PanToMarker({ position, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && position) {
      map.panTo(position, { animate: true, duration: 0.3 });
    }
  }, [map, position, enabled]);
  return null;
}

// Interpolate between two points
function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// Get cumulative distances along the route for even-speed animation
function getCumulativeDistances(points) {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return dists;
}

export default function TripReplayMap({
  routeGeometry = [],
  startAddress = "",
  endAddress = "",
  totalMiles = 0,
  height = "350px",
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [speed, setSpeed] = useState(1);
  const [hasStarted, setHasStarted] = useState(false);
  const [followCar, setFollowCar] = useState(true);
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const progressRef = useRef(0);

  // Duration in seconds for 1x speed
  const baseDuration = Math.max(5, Math.min(30, routeGeometry.length * 0.15));

  const cumulDists = useRef([]);
  const totalDist = useRef(0);

  useEffect(() => {
    if (routeGeometry.length > 1) {
      cumulDists.current = getCumulativeDistances(routeGeometry);
      totalDist.current = cumulDists.current[cumulDists.current.length - 1];
    }
  }, [routeGeometry]);

  const animate = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const increment = (dt * speed) / baseDuration;
    progressRef.current = Math.min(1, progressRef.current + increment);
    setProgress(progressRef.current);

    if (progressRef.current >= 1) {
      setIsPlaying(false);
      return;
    }
    animRef.current = requestAnimationFrame(animate);
  }, [speed, baseDuration]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      animRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, animate]);

  const handlePlay = () => {
    if (progress >= 1) {
      progressRef.current = 0;
      setProgress(0);
    }
    setHasStarted(true);
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    progressRef.current = 0;
    setProgress(0);
    setHasStarted(false);
  };

  const cycleSpeed = () => {
    setSpeed(prev => prev >= 4 ? 1 : prev * 2);
  };

  // Get the current position along the route based on progress
  const getCurrentPos = () => {
    if (routeGeometry.length < 2 || !hasStarted) return routeGeometry[0];
    const targetDist = progress * totalDist.current;
    const dists = cumulDists.current;

    // Find the segment
    let i = 1;
    while (i < dists.length && dists[i] < targetDist) i++;
    if (i >= routeGeometry.length) return routeGeometry[routeGeometry.length - 1];

    const segStart = dists[i - 1];
    const segEnd = dists[i];
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    return lerp(routeGeometry[i - 1], routeGeometry[i], t);
  };

  // Get the visible portion of the route (revealed so far)
  const getRevealedRoute = () => {
    if (!hasStarted || routeGeometry.length < 2) return [];
    const targetDist = progress * totalDist.current;
    const dists = cumulDists.current;
    const revealed = [routeGeometry[0]];
    for (let i = 1; i < routeGeometry.length; i++) {
      if (dists[i] <= targetDist) {
        revealed.push(routeGeometry[i]);
      } else {
        // Interpolate the final point
        const segStart = dists[i - 1];
        const segLen = dists[i] - segStart;
        const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
        revealed.push(lerp(routeGeometry[i - 1], routeGeometry[i], t));
        break;
      }
    }
    return revealed;
  };

  if (!routeGeometry || routeGeometry.length < 2) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-400" style={{ height }}>
        <div className="text-center p-4">
          <p className="text-sm font-medium">No route data available</p>
          <p className="text-xs mt-1">Route geometry is only stored for new trips</p>
        </div>
      </div>
    );
  }

  const carPos = getCurrentPos();
  const revealedPath = getRevealedRoute();
  const milesProgress = (totalMiles * progress).toFixed(1);

  return (
    <div className="space-y-0" data-testid="trip-replay-map">
      {/* Map */}
      <div className="rounded-t-lg overflow-hidden" style={{ height }}>
        <MapContainer
          center={routeGeometry[0]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Full route (ghost line) */}
          <Polyline
            positions={routeGeometry}
            pathOptions={{ color: '#CBD5E1', weight: 4, opacity: 0.5, dashArray: '8 8' }}
          />

          {/* Revealed route (solid green) */}
          {revealedPath.length > 1 && (
            <Polyline
              positions={revealedPath}
              pathOptions={{ color: '#10B981', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
            />
          )}

          {/* Start marker */}
          <Marker position={routeGeometry[0]} icon={startIcon}>
            <Popup><strong className="text-green-600">Start</strong><br/><span className="text-xs">{startAddress}</span></Popup>
          </Marker>

          {/* End marker */}
          <Marker position={routeGeometry[routeGeometry.length - 1]} icon={endIcon}>
            <Popup><strong className="text-red-600">End</strong><br/><span className="text-xs">{endAddress}</span></Popup>
          </Marker>

          {/* Animated car marker */}
          {hasStarted && carPos && (
            <Marker position={carPos} icon={carIcon} zIndexOffset={1000}>
              <Popup>{milesProgress} mi</Popup>
            </Marker>
          )}

          <FitBounds positions={routeGeometry} />
          {followCar && hasStarted && carPos && (
            <PanToMarker position={carPos} enabled={isPlaying} />
          )}
        </MapContainer>
      </div>

      {/* Controls */}
      <div className="bg-gray-50 rounded-b-lg border-t border-gray-200 p-3">
        {/* Progress bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full mb-3 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const clamped = Math.max(0, Math.min(1, x));
            progressRef.current = clamped;
            setProgress(clamped);
            if (!hasStarted) setHasStarted(true);
          }}
          data-testid="replay-progress-bar"
        >
          <div
            className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full shadow-md"
            style={{ left: `calc(${progress * 100}% - 8px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
              data-testid="replay-play-btn"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-all"
              title="Reset"
              data-testid="replay-reset-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Speed */}
            <button
              onClick={cycleSpeed}
              className="h-8 px-2.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold flex items-center gap-1 transition-all"
              title="Change speed"
              data-testid="replay-speed-btn"
            >
              <FastForward className="w-3 h-3" />
              {speed}x
            </button>
          </div>

          {/* Progress info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={followCar}
                onChange={(e) => setFollowCar(e.target.checked)}
                className="w-3 h-3 rounded accent-emerald-600"
              />
              Follow
            </label>
            <span className="font-mono font-medium text-emerald-700">
              {milesProgress} / {totalMiles} mi
            </span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
