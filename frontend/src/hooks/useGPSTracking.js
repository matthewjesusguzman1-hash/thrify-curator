/**
 * useGPSTracking Hook
 * GPS tracking with background location support for iOS/Android
 * Uses @transistorsoft/capacitor-background-geolocation for reliable background tracking
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Check if running in native Capacitor app
const isNative = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative;
};

// LocalStorage key to persist tracking state
const TRACKING_STATE_KEY = 'gps_tracking_active';

// Simple Kalman filter for GPS smoothing
class GPSKalmanFilter {
  constructor() {
    this.Q = 0.00001; // Process noise - how much we trust the model
    this.R = 0.01;    // Measurement noise - how much we trust GPS readings
    this.P = 1;       // Estimation error
    this.X = null;    // State (lat/lng)
    this.K = 0;       // Kalman gain
  }

  filter(lat, lng, accuracy) {
    // Adjust R based on reported accuracy (higher accuracy = lower noise)
    const dynamicR = accuracy ? Math.max(0.001, accuracy / 1000) : this.R;
    
    if (this.X === null) {
      // First reading - initialize state
      this.X = { lat, lng };
      this.P = 1;
      return { lat, lng };
    }

    // Prediction step (assume stationary model for simplicity)
    this.P = this.P + this.Q;

    // Update step
    this.K = this.P / (this.P + dynamicR);
    
    this.X = {
      lat: this.X.lat + this.K * (lat - this.X.lat),
      lng: this.X.lng + this.K * (lng - this.X.lng)
    };
    
    this.P = (1 - this.K) * this.P;

    return { lat: this.X.lat, lng: this.X.lng };
  }

  reset() {
    this.X = null;
    this.P = 1;
  }
}

// Save tracking state to localStorage for recovery
const saveTrackingState = (isActive, tripId = null) => {
  try {
    if (isActive && tripId) {
      localStorage.setItem(TRACKING_STATE_KEY, JSON.stringify({ active: true, tripId, timestamp: Date.now() }));
    } else {
      localStorage.removeItem(TRACKING_STATE_KEY);
    }
  } catch (e) {
    console.log('[GPS] Error saving tracking state:', e);
  }
};

// Get saved tracking state
const getSavedTrackingState = () => {
  try {
    const saved = localStorage.getItem(TRACKING_STATE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      // Only valid if saved within last 24 hours
      if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
        return state;
      }
      localStorage.removeItem(TRACKING_STATE_KEY);
    }
  } catch (e) {
    console.log('[GPS] Error reading tracking state:', e);
  }
  return null;
};

// Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if a new point is a "bounce-back" to an earlier location
// This happens when GPS reports stale/cached coordinates
const isBounceBack = (newPoint, recentPoints, startPoint) => {
  if (!startPoint || recentPoints.length < 5) return false; // Need more points before filtering
  
  const distFromStart = calculateDistance(
    startPoint.latitude, startPoint.longitude,
    newPoint.latitude, newPoint.longitude
  );
  
  // Get the furthest point from start in recent history
  let maxDistFromStart = 0;
  for (const pt of recentPoints.slice(-15)) { // Check last 15 points
    const dist = calculateDistance(
      startPoint.latitude, startPoint.longitude,
      pt.latitude, pt.longitude
    );
    if (dist > maxDistFromStart) {
      maxDistFromStart = dist;
    }
  }
  
  // If we've traveled at least 0.2 miles from start, and new point
  // is significantly closer to start (jumped back more than 70% of progress)
  // Made more lenient: 0.2 mile threshold and 30% (0.3) instead of 50%
  if (maxDistFromStart > 0.2 && distFromStart < maxDistFromStart * 0.3) {
    console.log(`[GPS] BOUNCE-BACK detected! New point is ${distFromStart.toFixed(3)}mi from start, but we reached ${maxDistFromStart.toFixed(3)}mi`);
    return true;
  }
  
  // Check if point is very close to any of the last 8-15 points (excluding last 3)
  // This catches the case where GPS jumps back to a recent position
  // Reduced threshold to 0.01 miles (50 feet) to be less aggressive
  const pointsToCheck = recentPoints.slice(-15, -3);
  for (const oldPoint of pointsToCheck) {
    const distToOld = calculateDistance(
      oldPoint.latitude, oldPoint.longitude,
      newPoint.latitude, newPoint.longitude
    );
    // If new point is within 0.01 miles (50 feet) of an old point AND
    // that old point is NOT close to the last point (to allow normal driving)
    if (distToOld < 0.01) {
      const lastPoint = recentPoints[recentPoints.length - 1];
      const distOldToLast = calculateDistance(
        oldPoint.latitude, oldPoint.longitude,
        lastPoint.latitude, lastPoint.longitude
      );
      // Only reject if the old point is far from current position (actual bounce-back)
      if (distOldToLast > 0.05) { // Old point is more than 250 feet from where we are now
        console.log(`[GPS] BOUNCE-BACK to old point detected! Distance to old point: ${(distToOld * 5280).toFixed(0)} feet`);
        return true;
      }
    }
  }
  
  return false;
};

// Note: iOS license key is configured in Info.plist (TSLocationManagerLicense)
// Note: Android license key is configured in AndroidManifest.xml

export default function useGPSTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [totalMiles, setTotalMiles] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const [error, setError] = useState(null);
  const [gpsQuality, setGpsQuality] = useState('unknown'); // 'excellent', 'good', 'fair', 'poor'
  
  // Use refs to track state that shouldn't trigger re-renders
  const locationsRef = useRef([]);
  const lastLocationRef = useRef(null);
  const startPointRef = useRef(null); // Track the starting point for bounce-back detection
  const totalDistanceRef = useRef(0);
  const isTrackingRef = useRef(false);
  const isPausedRef = useRef(false);
  const bgGeoReadyRef = useRef(false);
  const kalmanFilterRef = useRef(new GPSKalmanFilter());
  const lastValidSpeedRef = useRef(0); // Track last known valid speed
  const consecutiveRejectsRef = useRef(0); // Track consecutive rejected points
  const webWatchIdRef = useRef(null); // Track web geolocation watch ID

  // Update refs when state changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Process incoming location with improved filtering
  const processLocation = useCallback((location) => {
    console.log('[GPS] Raw location received:', JSON.stringify(location).substring(0, 500));
    
    // Ignore if not tracking or paused
    if (!isTrackingRef.current || isPausedRef.current) {
      console.log('[GPS] Ignoring - tracking:', isTrackingRef.current, 'paused:', isPausedRef.current);
      return;
    }

    // Transistorsoft v5.x returns location.coords.latitude (same as standard geolocation)
    // Support both formats for compatibility
    const lat = location.coords?.latitude ?? location.latitude;
    const lng = location.coords?.longitude ?? location.longitude;
    const acc = location.coords?.accuracy ?? location.accuracy;
    const spd = location.coords?.speed ?? location.speed;
    const timestamp = location.timestamp || location.time || new Date().toISOString();

    // Basic validation
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.log('[GPS] Invalid location - lat/lng not valid numbers');
      return;
    }

    // Dynamic accuracy threshold based on movement and history
    // Be more lenient if we have few points or haven't moved much
    const pointCount = locationsRef.current.length;
    let accuracyThreshold = 30; // Default: 30 meters
    
    if (pointCount < 5) {
      accuracyThreshold = 50; // More lenient at start
    } else if (lastValidSpeedRef.current > 10) {
      accuracyThreshold = 40; // More lenient when moving fast (highway)
    } else if (consecutiveRejectsRef.current > 5) {
      accuracyThreshold = 60; // Accept lower quality if we've been rejecting too many
      console.log('[GPS] Relaxing accuracy threshold due to consecutive rejects');
    }

    // Update GPS quality indicator
    if (acc) {
      if (acc <= 5) setGpsQuality('excellent');
      else if (acc <= 15) setGpsQuality('good');
      else if (acc <= 30) setGpsQuality('fair');
      else setGpsQuality('poor');
    }

    // Skip very low accuracy readings
    if (acc && acc > accuracyThreshold) {
      console.log(`[GPS] Skipping low accuracy: ${acc}m (threshold: ${accuracyThreshold}m)`);
      consecutiveRejectsRef.current++;
      return;
    }

    // Apply Kalman filter to smooth GPS noise
    const filtered = kalmanFilterRef.current.filter(lat, lng, acc);
    
    const point = {
      latitude: filtered.lat,
      longitude: filtered.lng,
      rawLatitude: lat,
      rawLongitude: lng,
      accuracy: acc,
      speed: spd,
      timestamp: timestamp
    };

    console.log('[GPS] Filtered point:', point.latitude.toFixed(6), point.longitude.toFixed(6), 'accuracy:', point.accuracy);

    // Store first point as start point for bounce-back detection
    if (!startPointRef.current && locationsRef.current.length === 0) {
      startPointRef.current = point;
      console.log('[GPS] Start point recorded:', point.latitude, point.longitude);
    }

    // Check for bounce-back to earlier position (less aggressive)
    if (pointCount > 10 && isBounceBack(point, locationsRef.current, startPointRef.current)) {
      console.log('[GPS] REJECTED - bounce-back detected, not adding to route');
      consecutiveRejectsRef.current++;
      return;
    }

    // Reset consecutive rejects on successful point
    consecutiveRejectsRef.current = 0;
    
    console.log('[GPS] Point accepted! Updating state...');
    
    // Update current location
    setCurrentLocation(point);

    // Calculate distance from last point
    if (lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        point.latitude,
        point.longitude
      );

      // Calculate time difference for speed-based validation
      let timeDiffSeconds = 0;
      try {
        const prevTime = new Date(lastLocationRef.current.timestamp).getTime();
        const currTime = new Date(point.timestamp).getTime();
        timeDiffSeconds = (currTime - prevTime) / 1000;
      } catch (e) {
        timeDiffSeconds = 5; // Default assumption
      }

      // Calculate implied speed (mph)
      const impliedSpeed = timeDiffSeconds > 0 ? (distance / timeDiffSeconds) * 3600 : 0;
      
      // Update last valid speed if reasonable
      if (impliedSpeed > 0 && impliedSpeed < 100) {
        lastValidSpeedRef.current = impliedSpeed;
      }

      // More nuanced distance filtering:
      // - Minimum: 0.001 miles (~5 feet) to filter GPS jitter
      // - Maximum: Based on time and realistic max speed (100 mph)
      const maxReasonableDistance = timeDiffSeconds > 0 ? (100 * timeDiffSeconds / 3600) : 0.5;
      const minDistance = 0.001; // ~5 feet

      if (distance >= minDistance && distance <= maxReasonableDistance) {
        // Additional sanity check: if implied speed is way higher than last known speed
        // and we're not accelerating from stop, might be GPS jump
        const speedJumpRatio = lastValidSpeedRef.current > 5 ? impliedSpeed / lastValidSpeedRef.current : 1;
        
        if (speedJumpRatio > 3 && impliedSpeed > 60) {
          console.log(`[GPS] Skipping suspicious speed jump: ${impliedSpeed.toFixed(1)}mph vs last ${lastValidSpeedRef.current.toFixed(1)}mph`);
        } else {
          totalDistanceRef.current += distance;
          setTotalMiles(totalDistanceRef.current);
          console.log(`[GPS] Added ${distance.toFixed(4)}mi at ${impliedSpeed.toFixed(1)}mph. Total: ${totalDistanceRef.current.toFixed(4)}mi`);
        }
      } else if (distance > maxReasonableDistance) {
        console.log(`[GPS] Skipping unrealistic jump: ${distance.toFixed(4)}mi in ${timeDiffSeconds.toFixed(1)}s (max: ${maxReasonableDistance.toFixed(4)}mi)`);
      } else {
        console.log(`[GPS] Skipping tiny movement (GPS jitter): ${distance.toFixed(4)}mi`);
      }
    }

    // Store location
    const locationData = {
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy || 0,
      speed: point.speed || 0,
      timestamp: point.timestamp || new Date().toISOString()
    };
    
    locationsRef.current.push(locationData);
    lastLocationRef.current = point;
    setLocationCount(locationsRef.current.length);
  }, []);

  // Get current position (one-time) - uses web API
  const getCurrentPosition = useCallback(async () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString()
        }),
        (err) => {
          setError(err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Initialize Transistorsoft Background Geolocation
  const initBackgroundGeolocation = useCallback(async (forceReinit = false) => {
    if (!isNative()) return null;
    
    // If already initialized and not forcing reinit, just return the plugin
    if (bgGeoReadyRef.current && !forceReinit) {
      const BackgroundGeolocation = (await import('@transistorsoft/capacitor-background-geolocation')).default;
      return BackgroundGeolocation;
    }

    try {
      const BackgroundGeolocation = (await import('@transistorsoft/capacitor-background-geolocation')).default;
      
      // Remove any existing listeners before re-adding
      if (bgGeoReadyRef.current) {
        await BackgroundGeolocation.removeListeners();
        console.log('[BackgroundGeolocation] Removed old listeners');
      }
      
      // Configure the plugin - MOTION DETECTION DISABLED for continuous tracking
      // Note: License is read from Info.plist (iOS) and AndroidManifest.xml (Android)
      const state = await BackgroundGeolocation.ready({
        // Geolocation Config - MAXIMUM ACCURACY
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_NAVIGATION, // Best for navigation (kCLLocationAccuracyBestForNavigation)
        distanceFilter: 1, // 1 meter - update on ANY movement
        stationaryRadius: 1, // meters - minimum possible
        
        // FORCE CONTINUOUS TRACKING - Disable ALL motion/stop detection
        disableMotionActivityUpdates: true,
        disableStopDetection: true,
        stopOnStationary: false,
        stopTimeout: 525600, // 1 year in minutes
        isMoving: true, // FORCE moving state on start
        
        // iOS specific - Maximum background persistence & accuracy
        preventSuspend: true,
        showsBackgroundLocationIndicator: true,
        pausesLocationUpdatesAutomatically: false,
        locationAuthorizationRequest: 'Always',
        activityType: BackgroundGeolocation.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION,
        
        // AGGRESSIVE location updates - faster polling
        locationUpdateInterval: 1000, // Every 1 second
        fastestLocationUpdateInterval: 500, // Accept every 0.5 seconds
        
        // Heartbeat keeps plugin alive in background - more frequent
        heartbeatInterval: 5, // Every 5 seconds
        
        // Enable debug temporarily to see what's happening
        debug: false, // Disable debug sounds for production
        logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,
        
        // Notification (Android)
        notification: {
          title: "Thrifty Curator",
          text: "Tracking mileage for tax deductions"
        }
      });

      console.log('BackgroundGeolocation ready:', state);
      bgGeoReadyRef.current = true;

      // Add location listener - this fires for EVERY location update
      BackgroundGeolocation.onLocation((location) => {
        console.log('[BackgroundGeolocation] *** LOCATION RECEIVED ***');
        console.log('[BackgroundGeolocation] Lat:', location.coords?.latitude || location.latitude);
        console.log('[BackgroundGeolocation] isTracking:', isTrackingRef.current);
        processLocation(location);
      }, (error) => {
        console.log('[BackgroundGeolocation] Location Error:', error);
      });
      
      console.log('[BackgroundGeolocation] onLocation listener registered');

      // Heartbeat listener for periodic updates when stationary
      BackgroundGeolocation.onHeartbeat((event) => {
        console.log('[BackgroundGeolocation] Heartbeat - forcing location update');
        // Get current position on heartbeat since motion is disabled
        BackgroundGeolocation.getCurrentPosition({
          samples: 1,
          persist: false
        }).then(location => {
          console.log('[BackgroundGeolocation] Heartbeat location:', location.coords?.latitude || location.latitude);
          processLocation(location);
        }).catch(err => {
          console.log('[BackgroundGeolocation] Heartbeat getCurrentPosition error:', err);
        });
      });

      // Provider change listener
      BackgroundGeolocation.onProviderChange((event) => {
        console.log('[BackgroundGeolocation] Provider change:', event);
      });

      return BackgroundGeolocation;
    } catch (err) {
      console.log('BackgroundGeolocation init error:', err);
      return null;
    }
  }, [processLocation]);

  // Start tracking with background support
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      // Reset state COMPLETELY before starting new tracking
      locationsRef.current = [];
      lastLocationRef.current = null;
      startPointRef.current = null; // Reset start point for bounce-back detection
      totalDistanceRef.current = 0;
      lastValidSpeedRef.current = 0;
      consecutiveRejectsRef.current = 0;
      kalmanFilterRef.current.reset(); // Reset Kalman filter
      setTotalMiles(0);
      setLocationCount(0);
      setCurrentLocation(null); // Also reset current location display
      setIsPaused(false);
      isPausedRef.current = false;
      setGpsQuality('unknown');

      // Try to use Transistorsoft Background Geolocation on native platforms
      const useNative = isNative();
      console.log('[GPS] Platform check - isNative:', useNative);
      
      let nativeStarted = false;
      
      if (useNative) {
        try {
          // Force reinitialize listeners to ensure fresh callbacks
          const BackgroundGeolocation = await initBackgroundGeolocation(true);
          
          if (BackgroundGeolocation) {
            // CRITICAL: Set tracking state BEFORE starting the plugin
            // Otherwise onLocation callbacks are ignored (isTrackingRef.current is false)
            setIsTracking(true);
            isTrackingRef.current = true;
            console.log('[GPS] Tracking state set to true BEFORE plugin start');
            
            // Start tracking
            const state = await BackgroundGeolocation.start();
            console.log('BackgroundGeolocation started:', state);
            
            // FORCE the plugin into "moving" mode to prevent auto-stop
            await BackgroundGeolocation.changePace(true);
            console.log('BackgroundGeolocation forced to moving pace');
            
            // Get initial position with reasonable settings
            try {
              const location = await BackgroundGeolocation.getCurrentPosition({
                samples: 1,
                persist: true,
                timeout: 30000,
                maximumAge: 10000, // Accept positions up to 10 seconds old
                desiredAccuracy: 10
              });
              console.log('[GPS] Initial position:', location.coords?.latitude, location.coords?.longitude);
              processLocation(location);
            } catch (initErr) {
              console.log('[GPS] Initial position error (non-fatal, will use onLocation):', initErr);
            }
            
            // The plugin's onLocation callback (set up in initBackgroundGeolocation) 
            // handles continuous tracking. No polling needed - trust the plugin.
            
            toast.success('GPS tracking started - works in background!');
            nativeStarted = true;
          }
        } catch (bgError) {
          console.log('[GPS] BackgroundGeolocation not available, falling back to web:', bgError);
          // Don't return - fall through to web fallback
        }
      }
      
      // Web fallback - use if not native OR if native failed
      if (!nativeStarted) {
        console.log('[GPS] Using web geolocation fallback');
        
        // Check if geolocation is supported
        if (!navigator.geolocation) {
          toast.error('GPS not supported in this browser');
          return false;
        }
        
        // Set tracking state FIRST
        setIsTracking(true);
        isTrackingRef.current = true;
        
        // Try to get initial position (but don't fail if it doesn't work immediately)
        try {
          const initialPosition = await getCurrentPosition();
          console.log('[GPS] Web initial position:', initialPosition.latitude, initialPosition.longitude);
          processLocation({
            coords: initialPosition,
            timestamp: initialPosition.timestamp
          });
        } catch (initErr) {
          console.log('[GPS] Web initial position failed (will rely on watchPosition):', initErr.message);
          // Don't fail - watchPosition will still work
        }

        // Start web watch with maximum accuracy
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            console.log('[GPS] Web watchPosition update:', position.coords.latitude, position.coords.longitude, 'accuracy:', position.coords.accuracy);
            processLocation({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed
              },
              timestamp: new Date().toISOString()
            });
          },
          (err) => {
            console.error('[GPS] Web watch error:', err.code, err.message);
            setError(err.message);
            if (err.code === 1) {
              toast.error('Location permission denied. Please enable in browser settings.');
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // Increased timeout
            maximumAge: 5000 // Allow slightly cached positions for better responsiveness
          }
        );
        webWatchIdRef.current = watchId;
        console.log('[GPS] Web watch started, ID:', watchId);
        toast.success('GPS tracking started');
      }

      return true;
    } catch (err) {
      console.error('Failed to start tracking:', err);
      setError(err.message);
      toast.error('Failed to start GPS tracking');
      return false;
    }
  }, [getCurrentPosition, processLocation, initBackgroundGeolocation]);

  // Pause tracking
  const pauseTracking = useCallback(() => {
    if (!isTrackingRef.current) return;
    setIsPaused(true);
    isPausedRef.current = true;
    console.log('Tracking paused');
    toast.info('Tracking paused');
  }, []);

  // Resume tracking
  const resumeTracking = useCallback(() => {
    if (!isTrackingRef.current) return;
    setIsPaused(false);
    isPausedRef.current = false;
    console.log('Tracking resumed');
    toast.success('Tracking resumed');
  }, []);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    console.log('[GPS] stopTracking called, isTracking:', isTrackingRef.current);
    
    // Clear tracking state from localStorage
    saveTrackingState(false);

    // Clear polling interval
    if (window._gpsPollingInterval) {
      clearInterval(window._gpsPollingInterval);
      window._gpsPollingInterval = null;
    }
    
    // Clear web geolocation watch if active
    if (webWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      console.log('[GPS] Web watch cleared, ID:', webWatchIdRef.current);
      webWatchIdRef.current = null;
    }

    // ALWAYS try to stop Transistorsoft Background Geolocation on native, even if we think we're not tracking
    // This handles edge cases where the plugin is running but our state got out of sync
    if (isNative()) {
      try {
        const BackgroundGeolocation = (await import('@transistorsoft/capacitor-background-geolocation')).default;
        await BackgroundGeolocation.stop();
        await BackgroundGeolocation.removeListeners();
        console.log('[GPS] BackgroundGeolocation stopped and listeners removed');
      } catch (err) {
        console.log('[GPS] Error stopping BackgroundGeolocation:', err);
      }
    }
    
    bgGeoReadyRef.current = false; // Force re-init on next start
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    
    console.log('[GPS] Tracking stopped. Total distance:', totalDistanceRef.current);
  }, []);

  // FORCE STOP - Aggressively stop all GPS tracking regardless of state
  // Use this when you need to guarantee GPS is stopped (e.g., on app resume with no active trip)
  const forceStop = useCallback(async () => {
    console.log('[GPS] FORCE STOP initiated');
    
    // Clear tracking state from localStorage
    saveTrackingState(false);
    
    // Clear polling interval
    if (window._gpsPollingInterval) {
      clearInterval(window._gpsPollingInterval);
      window._gpsPollingInterval = null;
    }
    
    // Aggressively stop native GPS tracking
    if (isNative()) {
      try {
        const BackgroundGeolocation = (await import('@transistorsoft/capacitor-background-geolocation')).default;
        
        // Remove all listeners first
        await BackgroundGeolocation.removeListeners();
        console.log('[GPS] All listeners removed');
        
        // Stop tracking
        await BackgroundGeolocation.stop();
        console.log('[GPS] BackgroundGeolocation stopped');
        
        // Also try changePace to stationary in case stop didn't fully work
        try {
          await BackgroundGeolocation.changePace(false);
        } catch (e) {
          // Ignore - might not be in a state where this works
        }
      } catch (err) {
        console.log('[GPS] Error during force stop:', err);
      }
    }
    
    // Reset all state
    bgGeoReadyRef.current = false;
    locationsRef.current = [];
    lastLocationRef.current = null;
    startPointRef.current = null;
    totalDistanceRef.current = 0;
    lastValidSpeedRef.current = 0;
    consecutiveRejectsRef.current = 0;
    kalmanFilterRef.current.reset();
    setTotalMiles(0);
    setLocationCount(0);
    setCurrentLocation(null);
    setError(null);
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setGpsQuality('unknown');
    
    console.log('[GPS] FORCE STOP complete - all GPS tracking stopped');
  }, []);

  // Reset all state - called when canceling/discarding a trip
  const reset = useCallback(async () => {
    console.log('[GPS] Reset initiated');
    
    // Use forceStop to ensure everything is cleaned up
    await forceStop();
    
    console.log('[GPS] GPS tracking fully reset - ready for new trip');
  }, [forceStop]);

  // Get all recorded locations
  const getLocations = useCallback(() => {
    return [...locationsRef.current];
  }, []);

  // Cleanup on unmount - aggressively stop GPS
  useEffect(() => {
    return () => {
      console.log('[GPS] Hook unmounting - cleaning up');
      // Clear tracking state
      saveTrackingState(false);
      
      // Clear polling interval
      if (window._gpsPollingInterval) {
        clearInterval(window._gpsPollingInterval);
        window._gpsPollingInterval = null;
      }
      
      if (isNative()) {
        import('@transistorsoft/capacitor-background-geolocation').then(({ default: BackgroundGeolocation }) => {
          BackgroundGeolocation.removeListeners().catch(() => {});
          BackgroundGeolocation.stop().catch(() => {});
        });
      }
    };
  }, []);

  return {
    // State
    isTracking,
    isPaused,
    currentLocation,
    totalMiles,
    locationCount,
    error,
    isNative: isNative(),
    gpsQuality, // NEW: 'excellent', 'good', 'fair', 'poor', 'unknown'
    
    // Actions
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    getCurrentPosition,
    getLocations,
    reset,
    forceStop  // New: Force stop all GPS tracking regardless of state
  };
}
