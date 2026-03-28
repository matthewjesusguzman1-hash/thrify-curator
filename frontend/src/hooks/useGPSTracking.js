/**
 * useGPSTracking Hook
 * GPS tracking with background location support for iOS/Android
 * Uses @capacitor-community/background-geolocation for continuous tracking
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
  const isTrackingRef = useRef(false);
  const isPausedRef = useRef(false);
  const backgroundWatcherRef = useRef(null);
  const usingBackgroundGeoRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Process incoming location
  const processLocation = useCallback((point) => {
    // Ignore if not tracking or paused
    if (!isTrackingRef.current || isPausedRef.current) {
      return;
    }

    // Basic validation
    if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
      console.log('Invalid location point:', point);
      return;
    }

    // Skip low accuracy readings (> 100 meters)
    if (point.accuracy && point.accuracy > 100) {
      console.log('Skipping low accuracy reading:', point.accuracy, 'meters');
      return;
    }

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

      // Filter out extreme GPS jumps (> 5 miles in one reading)
      // Also filter tiny movements < 0.001 miles (about 5 feet) to reduce noise
      if (distance > 0.001 && distance < 5.0) {
        totalDistanceRef.current += distance;
        setTotalMiles(totalDistanceRef.current);
        console.log('Added distance:', distance.toFixed(4), 'Total:', totalDistanceRef.current.toFixed(4));
      } else if (distance >= 5.0) {
        console.log('Skipping extreme GPS jump:', distance.toFixed(4), 'miles');
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

  // Stop all tracking methods
  const stopAllTracking = useCallback(async () => {
    console.log('Stopping all tracking...');
    
    // Stop background geolocation if active
    if (usingBackgroundGeoRef.current) {
      try {
        const BackgroundGeolocation = (await import('@capacitor-community/background-geolocation')).BackgroundGeolocation;
        await BackgroundGeolocation.removeWatcher({ id: backgroundWatcherRef.current });
        console.log('Background geolocation stopped');
      } catch (err) {
        console.log('Error stopping background geo:', err);
      }
      usingBackgroundGeoRef.current = false;
      backgroundWatcherRef.current = null;
    }
    
    // Stop standard watch if active
    if (watchIdRef.current !== null) {
      try {
        if (isNative()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          await Geolocation.clearWatch({ id: watchIdRef.current });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        console.log('Standard geolocation watch stopped');
      } catch (err) {
        console.log('Error stopping standard geo:', err);
      }
      watchIdRef.current = null;
    }
  }, []);

  // Start tracking with background support
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      // Reset state
      locationsRef.current = [];
      lastLocationRef.current = null;
      totalDistanceRef.current = 0;
      setTotalMiles(0);
      setLocationCount(0);
      setIsPaused(false);
      isPausedRef.current = false;

      // Try to use background geolocation on native platforms
      if (isNative()) {
        try {
          const BackgroundGeolocation = (await import('@capacitor-community/background-geolocation')).BackgroundGeolocation;
          
          // Add watcher with background capability
          const watcherId = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "Tracking your mileage for tax deductions",
              backgroundTitle: "GPS Tracking Active",
              requestPermissions: true,
              stale: false,
              distanceFilter: 10 // Get updates every 10 meters
            },
            (location, error) => {
              if (error) {
                if (error.code === "NOT_AUTHORIZED") {
                  toast.error("Please enable 'Always' location access for background tracking");
                  console.log("Location not authorized");
                }
                return;
              }
              
              if (location) {
                console.log('Background location:', location.latitude, location.longitude);
                processLocation({
                  latitude: location.latitude,
                  longitude: location.longitude,
                  accuracy: location.accuracy,
                  speed: location.speed,
                  timestamp: new Date().toISOString()
                });
              }
            }
          );
          
          backgroundWatcherRef.current = watcherId;
          usingBackgroundGeoRef.current = true;
          console.log('Background geolocation started, watcher ID:', watcherId);
          
          // Set tracking state
          setIsTracking(true);
          isTrackingRef.current = true;
          
          // Get initial position
          const initialPosition = await getCurrentPosition();
          processLocation(initialPosition);
          
          return true;
          
        } catch (bgError) {
          console.log('Background geolocation not available, falling back to standard:', bgError);
          // Fall through to standard geolocation
        }
      }

      // Standard geolocation (foreground only)
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        
        // Request permissions
        const status = await Geolocation.requestPermissions();
        if (status.location === 'denied') {
          setError('Location permission denied');
          toast.error('Please enable location permissions in Settings');
          return false;
        }
        
        // Set tracking state
        setIsTracking(true);
        isTrackingRef.current = true;
        
        // Get initial position
        const initialPosition = await getCurrentPosition();
        processLocation(initialPosition);

        // Start watching
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
        console.log('Standard GPS watch started, ID:', callbackId);
        
        // Warn about background limitations
        toast.info('Keep the app open for continuous tracking', { duration: 5000 });
        
      } else {
        // Web fallback
        setIsTracking(true);
        isTrackingRef.current = true;
        
        const initialPosition = await getCurrentPosition();
        processLocation(initialPosition);

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
      console.error('Failed to start tracking:', err);
      setError(err.message);
      return false;
    }
  }, [getCurrentPosition, processLocation]);

  // Pause tracking
  const pauseTracking = useCallback(() => {
    if (!isTrackingRef.current) return;
    setIsPaused(true);
    isPausedRef.current = true;
    console.log('Tracking paused');
  }, []);

  // Resume tracking
  const resumeTracking = useCallback(() => {
    if (!isTrackingRef.current) return;
    setIsPaused(false);
    isPausedRef.current = false;
    console.log('Tracking resumed');
  }, []);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    console.log('stopTracking called, isTracking:', isTrackingRef.current);
    
    if (!isTrackingRef.current) {
      console.log('Not tracking, nothing to stop');
      return;
    }

    await stopAllTracking();
    
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    
    console.log('Tracking stopped. Total distance:', totalDistanceRef.current);
  }, [stopAllTracking]);

  // Reset all state
  const reset = useCallback(() => {
    locationsRef.current = [];
    lastLocationRef.current = null;
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
      if (isTrackingRef.current) {
        stopAllTracking();
      }
    };
  }, [stopAllTracking]);

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
