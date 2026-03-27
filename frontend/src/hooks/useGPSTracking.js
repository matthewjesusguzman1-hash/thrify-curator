/**
 * useGPSTracking Hook
 * Optimized GPS tracking for Capacitor native apps with proper start/stop control
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

export default function useGPSTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [totalMiles, setTotalMiles] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const [error, setError] = useState(null);
  
  // Use refs to track state that shouldn't trigger re-renders
  const watchIdRef = useRef(null);
  const locationsRef = useRef([]);
  const lastLocationRef = useRef(null);
  const totalDistanceRef = useRef(0);
  const isTrackingRef = useRef(false); // Mirror of isTracking for callbacks
  const isPausedRef = useRef(false); // Mirror of isPaused for callbacks

  // Update refs when state changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Process new location point
  const processLocation = useCallback((location) => {
    // Don't process if not tracking or paused
    if (!isTrackingRef.current || isPausedRef.current) {
      console.log('Skipping location - tracking:', isTrackingRef.current, 'paused:', isPausedRef.current);
      return;
    }

    const point = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      timestamp: new Date().toISOString()
    };

    // Filter out inaccurate readings (accuracy > 50 meters on native, > 100 on web)
    const maxAccuracy = isNative() ? 50 : 100;
    if (point.accuracy && point.accuracy > maxAccuracy) {
      console.log('Skipping inaccurate reading:', point.accuracy);
      return;
    }

    // Calculate distance from last point
    if (lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        point.latitude,
        point.longitude
      );

      // Filter out GPS jumps (> 0.3 miles in one reading is unrealistic)
      // Also filter tiny movements < 0.001 miles (about 5 feet) to reduce noise
      if (distance > 0.001 && distance < 0.3) {
        totalDistanceRef.current += distance;
        setTotalMiles(totalDistanceRef.current);
        console.log('Added distance:', distance.toFixed(4), 'Total:', totalDistanceRef.current.toFixed(4));
      }
    }

    lastLocationRef.current = point;
    locationsRef.current.push(point);
    setCurrentLocation(point);
    setLocationCount(prev => prev + 1);
  }, []);

  // Get current position (one-time)
  const getCurrentPosition = useCallback(async () => {
    try {
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
      } else {
        // Web fallback
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString()
            }),
            reject,
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Clear the GPS watch
  const clearWatch = useCallback(async () => {
    const watchId = watchIdRef.current;
    
    // Clear the ref immediately to prevent double-clearing
    watchIdRef.current = null;
    
    if (watchId !== null) {
      console.log('Clearing GPS watch ID:', watchId);
      try {
        if (isNative()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          await Geolocation.clearWatch({ id: watchId });
          console.log('Native GPS watch cleared successfully');
        } else {
          navigator.geolocation.clearWatch(watchId);
          console.log('Web GPS watch cleared successfully');
        }
      } catch (err) {
        console.error('Error clearing watch:', err);
      }
    } else {
      console.log('No GPS watch to clear');
    }
  }, []);

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      // Request permissions on native
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const status = await Geolocation.requestPermissions();
        if (status.location !== 'granted') {
          setError('Location permission denied');
          toast.error('Please enable location permissions');
          return false;
        }
      }

      // Reset state
      locationsRef.current = [];
      lastLocationRef.current = null;
      totalDistanceRef.current = 0;
      setTotalMiles(0);
      setLocationCount(0);
      setIsPaused(false);
      isPausedRef.current = false;

      // Get initial position
      const initialPosition = await getCurrentPosition();
      
      // Set tracking state BEFORE starting watch
      setIsTracking(true);
      isTrackingRef.current = true;
      
      // Process initial position
      processLocation(initialPosition);

      // Start watching
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const callbackId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          },
          (position, err) => {
            if (err) {
              console.error('Watch error:', err);
              return;
            }
            if (position) {
              processLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed
              });
            }
          }
        );
        watchIdRef.current = callbackId;
        console.log('Native GPS watch started, ID:', callbackId);
      } else {
        // Web fallback
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            processLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed
            });
          },
          (err) => {
            console.error('Watch error:', err);
            setError(err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
          }
        );
        watchIdRef.current = watchId;
        console.log('Web GPS watch started, ID:', watchId);
      }

      return true;
    } catch (err) {
      console.error('Start tracking error:', err);
      setError(err.message);
      setIsTracking(false);
      isTrackingRef.current = false;
      toast.error('Failed to start GPS tracking');
      return false;
    }
  }, [getCurrentPosition, processLocation]);

  // Stop tracking completely
  const stopTracking = useCallback(async () => {
    console.log('Stopping GPS tracking - setting refs FIRST');
    
    // CRITICAL: Set refs IMMEDIATELY before any async operations
    // This prevents the callback from processing any more locations
    isTrackingRef.current = false;
    isPausedRef.current = false;
    
    // Clear the watch BEFORE updating React state (to prevent race conditions)
    await clearWatch();
    
    // Now update React state for UI
    setIsTracking(false);
    setIsPaused(false);
    
    console.log('GPS tracking stopped completely');
  }, [clearWatch]);

  // Pause tracking (keeps watch but ignores updates)
  const pauseTracking = useCallback(async () => {
    console.log('Pausing GPS tracking - setting refs FIRST');
    
    // CRITICAL: Set paused ref IMMEDIATELY to stop processing locations
    isPausedRef.current = true;
    
    // Clear the watch to save battery (also stops callbacks)
    await clearWatch();
    
    // Now update React state for UI
    setIsPaused(true);
    
    console.log('GPS tracking paused completely');
  }, [clearWatch]);

  // Resume tracking
  const resumeTracking = useCallback(async () => {
    console.log('Resuming GPS tracking');
    
    try {
      setError(null);
      setIsPaused(false);
      isPausedRef.current = false;
      setIsTracking(true);
      isTrackingRef.current = true;

      // Restart watching
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const callbackId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          },
          (position, err) => {
            if (err) {
              console.error('Watch error:', err);
              return;
            }
            if (position) {
              processLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed
              });
            }
          }
        );
        watchIdRef.current = callbackId;
        console.log('Native GPS watch resumed, ID:', callbackId);
      } else {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            processLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed
            });
          },
          (err) => {
            console.error('Watch error:', err);
            setError(err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
          }
        );
        watchIdRef.current = watchId;
        console.log('Web GPS watch resumed, ID:', watchId);
      }

      return true;
    } catch (err) {
      console.error('Resume tracking error:', err);
      setError(err.message);
      return false;
    }
  }, [processLocation]);

  // Get all recorded locations
  const getLocations = useCallback(() => {
    return [...locationsRef.current];
  }, []);

  // Reset all data
  const reset = useCallback(async () => {
    await stopTracking();
    locationsRef.current = [];
    lastLocationRef.current = null;
    totalDistanceRef.current = 0;
    setTotalMiles(0);
    setLocationCount(0);
    setCurrentLocation(null);
    setError(null);
    setIsPaused(false);
    isPausedRef.current = false;
  }, [stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        console.log('Cleanup: clearing GPS watch');
        if (isNative()) {
          import('@capacitor/geolocation').then(({ Geolocation }) => {
            Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {});
          });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
    };
  }, []);

  return {
    isTracking,
    isPaused,
    currentLocation,
    totalMiles,
    locationCount,
    error,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    getCurrentPosition,
    getLocations,
    reset,
    isNative: isNative()
  };
}
