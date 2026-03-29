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

// iOS License Key
const IOS_LICENSE_KEY = "eyJhbGciOiJFZERTQSIsImtpZCI6ImVkMjU1MTktbWFpbi12MSJ9.eyJvcyI6ImlvcyIsImFwcF9pZCI6ImNvbS50aHJpZnR5Y3VyYXRvci5hcHAiLCJvcmRlcl9udW1iZXIiOjE1ODQ1LCJyZW5ld2FsX3VybCI6Imh0dHBzOi8vc2hvcC50cmFuc2lzdG9yc29mdC5jb20vY2FydC8zOTM2NzA3MTIzNjE5OToxP25vdGU9MTA1MzciLCJjdXN0b21lcl9pZCI6OTU4NCwicHJvZHVjdCI6ImNhcGFjaXRvci1iYWNrZ3JvdW5kLWdlb2xvY2F0aW9uIiwia2V5X3ZlcnNpb24iOjEsImFsbG93ZWRfc3VmZml4ZXMiOlsiLmRldiIsIi5kZXZlbG9wbWVudCIsIi5zdGFnaW5nIiwiLnN0YWdlIiwiLnFhIiwiLnVhdCIsIi50ZXN0IiwiLmRlYnVnIl0sIm1heF9idWlsZF9zdGFtcCI6MjAyNzA0MjgsImdyYWNlX2J1aWxkcyI6MCwiZW50aXRsZW1lbnRzIjpbImNvcmUiXSwiaWF0IjoxNzc0NzMxNzUyfQ.l4Y2irFhuAPfyN-cRj1Csok7OpJgOOrE0LNeurWqGyAqyl8g72t30GzPDEFnFenJePEnfy9VKZ5h-fF3M_52CA";

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

    // Transistorsoft returns latitude/longitude directly on the location object
    // Standard geolocation uses location.coords.latitude
    const lat = location.latitude ?? location.coords?.latitude;
    const lng = location.longitude ?? location.coords?.longitude;
    const acc = location.accuracy ?? location.coords?.accuracy;
    const spd = location.speed ?? location.coords?.speed;
    
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

    // Skip low accuracy readings (> 100 meters)
    if (point.accuracy && point.accuracy > 100) {
      console.log('[GPS] Skipping low accuracy reading:', point.accuracy, 'meters');
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
  const initBackgroundGeolocation = useCallback(async () => {
    if (!isNative() || bgGeoReadyRef.current) return null;

    try {
      const BackgroundGeolocation = (await import('@transistorsoft/capacitor-background-geolocation')).default;
      
      // Configure the plugin - MOTION DETECTION DISABLED for continuous tracking
      const state = await BackgroundGeolocation.ready({
        // License
        license: IOS_LICENSE_KEY,
        
        // Geolocation Config
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: 5, // meters - smaller for more frequent updates
        stationaryRadius: 5, // meters - very small
        
        // DISABLE ALL MOTION DETECTION
        disableMotionActivityUpdates: true, // Disable motion activity
        disableStopDetection: true, // Don't detect stops
        stopOnStationary: false, // Never stop when stationary
        stopTimeout: 0, // Never timeout
        
        // iOS specific - Keep GPS always on
        preventSuspend: true,
        showsBackgroundLocationIndicator: true, // Show blue bar
        pausesLocationUpdatesAutomatically: false, // Never auto-pause
        locationAuthorizationRequest: 'Always',
        activityType: BackgroundGeolocation.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION, // Hint: we're driving
        
        // Continuous location mode
        locationUpdateInterval: 5000, // Request location every 5 seconds
        fastestLocationUpdateInterval: 2000, // Accept as fast as 2 seconds
        
        // Heartbeat for background
        heartbeatInterval: 30, // Heartbeat every 30 seconds
        
        // Debug
        debug: false, // Disable debug sounds
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
      totalDistanceRef.current = 0;
      setTotalMiles(0);
      setLocationCount(0);
      setIsPaused(false);
      isPausedRef.current = false;

      // Try to use Transistorsoft Background Geolocation on native platforms
      if (isNative()) {
        try {
          const BackgroundGeolocation = await initBackgroundGeolocation();
          
          if (BackgroundGeolocation) {
            // Start tracking
            const state = await BackgroundGeolocation.start();
            console.log('BackgroundGeolocation started:', state);
            
            // Set tracking state
            setIsTracking(true);
            isTrackingRef.current = true;
            
            // Get initial position
            const location = await BackgroundGeolocation.getCurrentPosition({
              samples: 1,
              persist: true
            });
            console.log('[GPS] Initial position:', location.latitude, location.longitude);
            processLocation(location);
            
            // Set up a polling fallback every 5 seconds to catch locations
            // This helps when onLocation events don't fire reliably
            const pollInterval = setInterval(async () => {
              if (!isTrackingRef.current) {
                clearInterval(pollInterval);
                return;
              }
              try {
                const currentLoc = await BackgroundGeolocation.getCurrentPosition({
                  samples: 1,
                  persist: false
                });
                console.log('[GPS] Poll location:', currentLoc.latitude, currentLoc.longitude);
                processLocation(currentLoc);
              } catch (pollErr) {
                console.log('[GPS] Poll error:', pollErr);
              }
            }, 5000);
            
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

        // Start web watch
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
            maximumAge: 5000
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
