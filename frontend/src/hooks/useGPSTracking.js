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
  if (!startPoint || recentPoints.length < 3) return false;
  
  const distFromStart = calculateDistance(
    startPoint.latitude, startPoint.longitude,
    newPoint.latitude, newPoint.longitude
  );
  
  // Get the furthest point from start in recent history
  let maxDistFromStart = 0;
  for (const pt of recentPoints.slice(-10)) { // Check last 10 points
    const dist = calculateDistance(
      startPoint.latitude, startPoint.longitude,
      pt.latitude, pt.longitude
    );
    if (dist > maxDistFromStart) {
      maxDistFromStart = dist;
    }
  }
  
  // If we've traveled at least 0.1 miles from start, and new point
  // is significantly closer to start (jumped back more than 50% of progress)
  if (maxDistFromStart > 0.1 && distFromStart < maxDistFromStart * 0.5) {
    console.log(`[GPS] BOUNCE-BACK detected! New point is ${distFromStart.toFixed(3)}mi from start, but we reached ${maxDistFromStart.toFixed(3)}mi`);
    return true;
  }
  
  // Also check if point is very close to any of the last 5-10 points (excluding last 2)
  // This catches the case where GPS jumps back to a recent position
  const pointsToCheck = recentPoints.slice(-10, -2);
  for (const oldPoint of pointsToCheck) {
    const distToOld = calculateDistance(
      oldPoint.latitude, oldPoint.longitude,
      newPoint.latitude, newPoint.longitude
    );
    // If new point is within 0.02 miles (100 feet) of an old point, likely a bounce
    if (distToOld < 0.02) {
      console.log(`[GPS] BOUNCE-BACK to old point detected! Distance to old point: ${(distToOld * 5280).toFixed(0)} feet`);
      return true;
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
  
  // Use refs to track state that shouldn't trigger re-renders
  const locationsRef = useRef([]);
  const lastLocationRef = useRef(null);
  const startPointRef = useRef(null); // Track the starting point for bounce-back detection
  const totalDistanceRef = useRef(0);
  const isTrackingRef = useRef(false);
  const isPausedRef = useRef(false);
  const bgGeoReadyRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Process incoming location
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
    
    const point = {
      latitude: lat,
      longitude: lng,
      accuracy: acc,
      speed: spd,
      timestamp: location.timestamp || location.time || new Date().toISOString()
    };

    console.log('[GPS] Parsed point:', point.latitude, point.longitude, 'accuracy:', point.accuracy);

    // Basic validation
    if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
      console.log('[GPS] Invalid location - lat/lng not numbers:', typeof point.latitude, typeof point.longitude);
      return;
    }

    // Skip low accuracy readings (> 20 meters is unreliable for navigation)
    if (point.accuracy && point.accuracy > 20) {
      console.log('[GPS] Skipping low accuracy reading:', point.accuracy, 'meters (threshold: 20m)');
      return;
    }

    // Store first point as start point for bounce-back detection
    if (!startPointRef.current && locationsRef.current.length === 0) {
      startPointRef.current = point;
      console.log('[GPS] Start point recorded:', point.latitude, point.longitude);
    }

    // Check for bounce-back to earlier position
    if (isBounceBack(point, locationsRef.current, startPointRef.current)) {
      console.log('[GPS] REJECTED - bounce-back detected, not adding to route');
      return;
    }

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

      // Filter out extreme GPS jumps (> 2 miles in one reading)
      // Also filter tiny movements < 0.01 miles (~50 feet) to reduce GPS jitter/noise
      // GPS accuracy indoors or with obstructions can cause phantom movements
      if (distance > 0.01 && distance < 2.0) {
        totalDistanceRef.current += distance;
        setTotalMiles(totalDistanceRef.current);
        console.log('Added distance:', distance.toFixed(4), 'Total:', totalDistanceRef.current.toFixed(4));
      } else if (distance >= 2.0) {
        console.log('Skipping extreme GPS jump:', distance.toFixed(4), 'miles');
      } else {
        console.log('Skipping tiny movement (GPS jitter):', distance.toFixed(4), 'miles');
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
      
      // Reset state
      locationsRef.current = [];
      lastLocationRef.current = null;
      startPointRef.current = null; // Reset start point for bounce-back detection
      totalDistanceRef.current = 0;
      setTotalMiles(0);
      setLocationCount(0);
      setIsPaused(false);
      isPausedRef.current = false;

      // Try to use Transistorsoft Background Geolocation on native platforms
      if (isNative()) {
        try {
          // Force reinitialize listeners to ensure fresh callbacks
          const BackgroundGeolocation = await initBackgroundGeolocation(true);
          
          if (BackgroundGeolocation) {
            // Start tracking
            const state = await BackgroundGeolocation.start();
            console.log('BackgroundGeolocation started:', state);
            
            // FORCE the plugin into "moving" mode to prevent auto-stop
            await BackgroundGeolocation.changePace(true);
            console.log('BackgroundGeolocation forced to moving pace');
            
            // Set tracking state
            setIsTracking(true);
            isTrackingRef.current = true;
            
            // Get initial position
            const location = await BackgroundGeolocation.getCurrentPosition({
              samples: 1,
              persist: true
            });
            console.log('[GPS] Initial position:', location.coords?.latitude, location.coords?.longitude);
            processLocation(location);
            
            // Set up a polling fallback every 2 seconds to catch locations
            // This helps when onLocation events don't fire reliably
            const pollInterval = setInterval(async () => {
              if (!isTrackingRef.current) {
                clearInterval(pollInterval);
                return;
              }
              try {
                const currentLoc = await BackgroundGeolocation.getCurrentPosition({
                  samples: 1,
                  persist: false,
                  desiredAccuracy: 10, // Request high accuracy for polling too
                  maximumAge: 1000 // Don't use cached positions older than 1 second
                });
                console.log('[GPS] Poll location:', currentLoc.coords?.latitude, currentLoc.coords?.longitude);
                processLocation(currentLoc);
              } catch (pollErr) {
                console.log('[GPS] Poll error:', pollErr);
              }
            }, 2000); // Poll every 2 seconds for more responsive tracking
            
            // Store interval ID for cleanup
            window._gpsPollingInterval = pollInterval;
            
            toast.success('GPS tracking started - works in background!');
            return true;
          }
        } catch (bgError) {
          console.log('BackgroundGeolocation not available:', bgError);
          toast.error('Background GPS not available. Please try again.');
          return false;
        }
        
      } else {
        // Web fallback
        setIsTracking(true);
        isTrackingRef.current = true;
        
        const initialPosition = await getCurrentPosition();
        processLocation({
          coords: initialPosition,
          timestamp: initialPosition.timestamp
        });

        // Start web watch with maximum accuracy
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
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
            console.error('Watch error:', err);
            setError(err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0 // Never use cached positions - always get fresh GPS
          }
        );
        console.log('Web GPS watch started, ID:', watchId);
        toast.info('Web tracking started (foreground only)');
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
    console.log('stopTracking called, isTracking:', isTrackingRef.current);
    
    if (!isTrackingRef.current) {
      console.log('Not tracking, nothing to stop');
      return;
    }

    // Clear polling interval
    if (window._gpsPollingInterval) {
      clearInterval(window._gpsPollingInterval);
      window._gpsPollingInterval = null;
    }

    // Stop Transistorsoft Background Geolocation
    if (isNative() && bgGeoReadyRef.current) {
      try {
        const BackgroundGeolocation = (await import('@transistorsoft/capacitor-background-geolocation')).default;
        await BackgroundGeolocation.stop();
        console.log('BackgroundGeolocation stopped');
      } catch (err) {
        console.log('Error stopping BackgroundGeolocation:', err);
      }
    }
    
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    
    console.log('Tracking stopped. Total distance:', totalDistanceRef.current);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    locationsRef.current = [];
    lastLocationRef.current = null;
    startPointRef.current = null; // Reset start point for bounce-back detection
    totalDistanceRef.current = 0;
    setTotalMiles(0);
    setLocationCount(0);
    setCurrentLocation(null);
    setError(null);
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    console.log('GPS tracking reset');
  }, []);

  // Get all recorded locations
  const getLocations = useCallback(() => {
    return [...locationsRef.current];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTrackingRef.current && isNative() && bgGeoReadyRef.current) {
        import('@transistorsoft/capacitor-background-geolocation').then(({ default: BackgroundGeolocation }) => {
          BackgroundGeolocation.stop();
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
    
    // Actions
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    getCurrentPosition,
    getLocations,
    reset
  };
}
