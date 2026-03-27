/**
 * useGPSTracking Hook
 * Optimized GPS tracking for Capacitor native apps with background support
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
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
  const [currentLocation, setCurrentLocation] = useState(null);
  const [totalMiles, setTotalMiles] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const [error, setError] = useState(null);
  
  const watchIdRef = useRef(null);
  const locationsRef = useRef([]);
  const lastLocationRef = useRef(null);
  const totalDistanceRef = useRef(0);

  // Request permissions
  const requestPermissions = async () => {
    try {
      if (isNative()) {
        const status = await Geolocation.requestPermissions();
        return status.location === 'granted';
      } else {
        // Web fallback - permissions requested on first use
        return true;
      }
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  };

  // Get current position (one-time)
  const getCurrentPosition = async () => {
    try {
      if (isNative()) {
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
  };

  // Process new location point
  const processLocation = useCallback((location) => {
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
      }
    }

    lastLocationRef.current = point;
    locationsRef.current.push(point);
    setCurrentLocation(point);
    setLocationCount(prev => prev + 1);
  }, []);

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError('Location permission denied');
        toast.error('Please enable location permissions');
        return false;
      }

      // Reset state
      locationsRef.current = [];
      lastLocationRef.current = null;
      totalDistanceRef.current = 0;
      setTotalMiles(0);
      setLocationCount(0);

      // Get initial position
      const initialPosition = await getCurrentPosition();
      processLocation(initialPosition);

      if (isNative()) {
        // Use Capacitor Geolocation for native - more accurate
        watchIdRef.current = await Geolocation.watchPosition(
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
      } else {
        // Web fallback
        watchIdRef.current = navigator.geolocation.watchPosition(
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
      }

      setIsTracking(true);
      return true;
    } catch (err) {
      console.error('Start tracking error:', err);
      setError(err.message);
      toast.error('Failed to start GPS tracking');
      return false;
    }
  }, [processLocation]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      if (watchIdRef.current !== null) {
        if (isNative()) {
          await Geolocation.clearWatch({ id: watchIdRef.current });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
      setIsTracking(false);
    } catch (err) {
      console.error('Stop tracking error:', err);
    }
  }, []);

  // Pause tracking (just stops watch, keeps data)
  const pauseTracking = useCallback(async () => {
    await stopTracking();
  }, [stopTracking]);

  // Resume tracking (restarts watch, continues accumulating)
  const resumeTracking = useCallback(async () => {
    try {
      setError(null);

      if (isNative()) {
        watchIdRef.current = await Geolocation.watchPosition(
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
      } else {
        watchIdRef.current = navigator.geolocation.watchPosition(
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
      }

      setIsTracking(true);
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
  const reset = useCallback(() => {
    locationsRef.current = [];
    lastLocationRef.current = null;
    totalDistanceRef.current = 0;
    setTotalMiles(0);
    setLocationCount(0);
    setCurrentLocation(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        if (isNative()) {
          Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {});
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
    };
  }, []);

  return {
    isTracking,
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
