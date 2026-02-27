import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Navigation,
  MapPinned,
  PlayCircle,
  StopCircle,
  PauseCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Route,
  Check,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Zap,
  Map,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import NoSleep from "nosleep.js";
import TripMap from "@/components/TripMap";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ACTIVE_TRIP_KEY = "thrifty_curator_active_trip";

// GPS tracking configuration for improved accuracy
const GPS_CONFIG = {
  HIGH_ACCURACY: {
    enableHighAccuracy: true,
    timeout: 15000,        // 15 second timeout for better mobile GPS lock
    maximumAge: 0          // Always get fresh position
  },
  WATCH_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 2000       // Accept positions up to 2 seconds old during continuous tracking
  },
  POLLING_INTERVAL: 5000,  // Poll every 5 seconds for more accurate tracking
  MIN_ACCURACY_METERS: 100, // Ignore readings with accuracy worse than 100m
  MIN_DISTANCE_METERS: 5    // Minimum distance to record a new waypoint (reduces noise)
};

export default function MileageTrackingSection({ getAuthHeader, onTripStatusChange, forceExpand, headerTripActive, headerTripPaused }) {
  // Section visibility
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Mileage tracking state
  const [mileageEntries, setMileageEntries] = useState([]);
  const [loadingMileage, setLoadingMileage] = useState(false);
  const [activeTripData, setActiveTripData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingWatchId, setTrackingWatchId] = useState(null);
  const [showMileageEntries, setShowMileageEntries] = useState(false);
  const [cumulativeMiles, setCumulativeMiles] = useState(0);
  const [waypointCount, setWaypointCount] = useState(0);
  
  // Enhanced tracking state
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isScreenAwake, setIsScreenAwake] = useState(false);
  const [trackingWarning, setTrackingWarning] = useState(null);
  
  // Map state
  const [showLiveMap, setShowLiveMap] = useState(true);
  const [tripWaypoints, setTripWaypoints] = useState([]);
  const [followLocation, setFollowLocation] = useState(true);
  const [viewingTripMap, setViewingTripMap] = useState(null);
  
  // Multi-select state
  const [selectedTrips, setSelectedTrips] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  // Refs for tracking
  const locationUpdateInterval = useRef(null);
  const noSleepRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastLocationRef = useRef(null);
  const visibilityHandlerRef = useRef(null);
  
  // Modal states
  const [showAddMileageModal, setShowAddMileageModal] = useState(false);
  const [showEditMileageModal, setShowEditMileageModal] = useState(false);
  const [editingMileageEntry, setEditingMileageEntry] = useState(null);
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  
  // Form data
  const [mileageFormData, setMileageFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_address: "",
    end_address: "",
    total_miles: "",
    purpose: "thrifting",
    purpose_other: "",
    notes: ""
  });
  
  const [mileageSummary, setMileageSummary] = useState({
    total_miles: 0,
    total_trips: 0,
    by_purpose: {},
    monthly_totals: {}
  });
  
  const [endTripData, setEndTripData] = useState({
    purpose: "thrifting",
    purpose_other: "",
    notes: ""
  });

  // Calculate distance between two GPS coordinates in meters
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Enable screen wake lock to prevent device from sleeping
  const enableWakeLock = useCallback(async () => {
    try {
      // Try native Wake Lock API first (Chrome 84+, Edge 84+)
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsScreenAwake(true);
        console.log('Wake Lock activated');
        
        // Re-acquire wake lock if released (e.g., when tab becomes visible again)
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
          setIsScreenAwake(false);
        });
      }
    } catch (err) {
      console.log('Wake Lock API not available or failed:', err);
    }
    
    // Also use NoSleep.js as fallback for broader compatibility
    try {
      if (!noSleepRef.current) {
        noSleepRef.current = new NoSleep();
      }
      await noSleepRef.current.enable();
      setIsScreenAwake(true);
      console.log('NoSleep enabled');
    } catch (err) {
      console.error('NoSleep failed:', err);
    }
  }, []);

  // Disable screen wake lock
  const disableWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }
    setIsScreenAwake(false);
    console.log('Wake Lock disabled');
  }, []);

  // Fetch current cumulative distance from server - MUST be defined before handleVisibilityChange
  const fetchCumulativeDistance = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/mileage/active-trip/distance`, getAuthHeader());
      setCumulativeMiles(response.data.cumulative_miles || 0);
      setWaypointCount(response.data.waypoint_count || 0);
    } catch (error) {
      console.error("Failed to fetch cumulative distance:", error);
    }
  }, [getAuthHeader]);

  // Fetch waypoints for active trip (for map display)
  const fetchTripWaypoints = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/mileage/active-trip/waypoints`, getAuthHeader());
      setTripWaypoints(response.data.waypoints || []);
    } catch (error) {
      console.error("Failed to fetch waypoints:", error);
    }
  }, [getAuthHeader]);

  // Fetch waypoints for a completed trip
  const fetchCompletedTripWaypoints = useCallback(async (tripId) => {
    try {
      const response = await axios.get(`${API}/admin/mileage/${tripId}/waypoints`, getAuthHeader());
      return {
        waypoints: response.data.waypoints || [],
        matchedCoordinates: response.data.matched_coordinates || [],
        isRoadMatched: response.data.is_road_matched || false,
        matchConfidence: response.data.match_confidence || 0,
        totalMiles: response.data.total_miles || 0,
        startAddress: response.data.start_address,
        endAddress: response.data.end_address
      };
    } catch (error) {
      console.error("Failed to fetch trip waypoints:", error);
      return { waypoints: [], matchedCoordinates: [], isRoadMatched: false, matchConfidence: 0 };
    }
  }, [getAuthHeader]);

  // Handle visibility change - resume tracking when app comes back to foreground
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && isTracking && !isPaused) {
      console.log('App returned to foreground - resuming GPS tracking');
      setTrackingWarning(null);
      
      // Re-enable wake lock
      enableWakeLock();
      
      // Force an immediate location update
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLocation = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString()
            };
            
            // Only record if accuracy is acceptable
            if (pos.coords.accuracy <= GPS_CONFIG.MIN_ACCURACY_METERS) {
              setCurrentLocation(newLocation);
              setGpsAccuracy(pos.coords.accuracy);
              setLastUpdateTime(new Date());
              
              axios.post(`${API}/admin/mileage/update-location`, {
                location: newLocation
              }, getAuthHeader()).then(() => {
                fetchCumulativeDistance();
              }).catch(console.error);
            }
          },
          (error) => console.error("Visibility change location error:", error),
          GPS_CONFIG.HIGH_ACCURACY
        );
      }
    } else if (document.visibilityState === 'hidden' && isTracking && !isPaused) {
      setTrackingWarning('App in background - tracking may be limited. Keep app open for best accuracy.');
    }
  }, [isTracking, isPaused, enableWakeLock, getAuthHeader, fetchCumulativeDistance]);

  // Set up visibility change listener
  useEffect(() => {
    visibilityHandlerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      disableWakeLock();
    };
  }, [disableWakeLock]);

  // Update "Updated X seconds ago" display every second when tracking
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (isTracking && !isPaused && lastUpdateTime) {
      const timer = setInterval(() => {
        forceUpdate(n => n + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTracking, isPaused, lastUpdateTime]);

  // Fetch mileage entries
  const fetchMileageEntries = useCallback(async () => {
    setLoadingMileage(true);
    try {
      const [entriesRes, summaryRes, activeTripRes] = await Promise.all([
        axios.get(`${API}/admin/mileage/entries`, getAuthHeader()),
        axios.get(`${API}/admin/mileage/summary`, getAuthHeader()),
        axios.get(`${API}/admin/mileage/active-trip`, getAuthHeader())
      ]);
      setMileageEntries(entriesRes.data);
      setMileageSummary(summaryRes.data);
      
      // Check for active trip from server
      if (activeTripRes.data) {
        setActiveTripData(activeTripRes.data);
        setIsTracking(true);
        setIsPaused(activeTripRes.data.is_paused || false);
        // Store in localStorage for persistence
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(activeTripRes.data));
        // Resume tracking only if not paused
        if (!activeTripRes.data.is_paused) {
          resumeTracking();
        }
        // Fetch current distance and waypoints
        fetchCumulativeDistance();
        fetchTripWaypoints();
      } else {
        // Clear localStorage if no active trip on server
        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setIsTracking(false);
        setIsPaused(false);
        setActiveTripData(null);
        setTripWaypoints([]);
      }
    } catch (error) {
      console.error("Failed to fetch mileage data:", error);
    } finally {
      setLoadingMileage(false);
    }
  }, [getAuthHeader, fetchCumulativeDistance, fetchTripWaypoints]);

  // Reprocess a trip with OSRM road-matching
  const reprocessTripRoute = useCallback(async (tripId) => {
    try {
      toast.info("Processing route with road-matching...");
      const response = await axios.post(`${API}/admin/mileage/${tripId}/reprocess-route`, {}, getAuthHeader());
      
      if (response.data.is_road_matched) {
        let message = `Route matched! Distance: ${response.data.road_matched_miles.toFixed(2)} mi (${Math.round(response.data.confidence * 100)}% confidence)`;
        
        // Show gap filling info if any gaps were detected
        if (response.data.gaps_detected > 0) {
          message += ` • ${response.data.gaps_filled}/${response.data.gaps_detected} GPS gaps filled`;
        }
        
        toast.success(message);
        fetchMileageEntries(); // Refresh the list
        return response.data;
      } else {
        toast.warning("Could not match route to roads. Using original GPS distance.");
        return response.data;
      }
    } catch (error) {
      console.error("Failed to reprocess trip:", error);
      toast.error(error.response?.data?.detail || "Failed to reprocess route");
      return null;
    }
  }, [getAuthHeader, fetchMileageEntries]);

  // Periodically fetch waypoints during live tracking for map updates
  useEffect(() => {
    if (isTracking && !isPaused && showLiveMap) {
      // Fetch waypoints every 10 seconds for map updates
      const interval = setInterval(() => {
        fetchTripWaypoints();
      }, 10000);
      
      // Also fetch immediately
      fetchTripWaypoints();
      
      return () => clearInterval(interval);
    }
  }, [isTracking, isPaused, showLiveMap, fetchTripWaypoints]);

  // Auto-expand when forceExpand prop changes to true
  useEffect(() => {
    if (forceExpand) {
      setIsExpanded(true);
      // Refresh data when forced to expand (e.g., when End Trip clicked in header)
      fetchMileageEntries();
    }
  }, [forceExpand, fetchMileageEntries]);
  
  // Sync with header trip state
  useEffect(() => {
    if (headerTripActive) {
      // Header says there's an active trip, refresh our data
      fetchMileageEntries();
    }
    // Sync paused state from header
    if (headerTripPaused !== undefined) {
      setIsPaused(headerTripPaused);
    }
  }, [headerTripActive, headerTripPaused, fetchMileageEntries]);

  // Resume tracking for an existing trip - IMPROVED with accuracy filtering
  const resumeTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      setTrackingWarning("Geolocation not supported on this device");
      return;
    }

    // Enable wake lock to keep screen awake
    enableWakeLock();

    // Get current position first with high accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Filter out inaccurate readings
        if (position.coords.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
          console.log(`Ignoring inaccurate GPS reading: ${position.coords.accuracy}m`);
          return;
        }

        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        setCurrentLocation(newLocation);
        setGpsAccuracy(position.coords.accuracy);
        setLastUpdateTime(new Date());
        lastLocationRef.current = newLocation;
        
        // Send to server
        axios.post(`${API}/admin/mileage/update-location`, {
          location: newLocation
        }, getAuthHeader()).catch(console.error);
      },
      (error) => {
        console.error("Failed to get current position:", error);
        setTrackingWarning("GPS signal weak - move to open area");
      },
      GPS_CONFIG.HIGH_ACCURACY
    );

    // Start watching position with improved options
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Filter out inaccurate readings
        if (pos.coords.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
          console.log(`Ignoring inaccurate GPS: ${pos.coords.accuracy}m`);
          return;
        }

        // Check minimum distance to reduce noise
        if (lastLocationRef.current) {
          const distance = calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            pos.coords.latitude,
            pos.coords.longitude
          );
          if (distance < GPS_CONFIG.MIN_DISTANCE_METERS) {
            // Still update UI but don't send to server
            setGpsAccuracy(pos.coords.accuracy);
            setLastUpdateTime(new Date());
            return;
          }
        }

        const newLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        setCurrentLocation(newLocation);
        setGpsAccuracy(pos.coords.accuracy);
        setLastUpdateTime(new Date());
        lastLocationRef.current = newLocation;
        setTrackingWarning(null);
        
        // Send waypoint to server
        axios.post(`${API}/admin/mileage/update-location`, {
          location: newLocation
        }, getAuthHeader()).then(() => {
          fetchCumulativeDistance();
        }).catch(console.error);
      },
      (error) => {
        console.error("Location tracking error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setTrackingWarning("Location permission denied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setTrackingWarning("GPS signal lost - move to open area");
        } else if (error.code === error.TIMEOUT) {
          setTrackingWarning("GPS taking too long - retrying...");
        }
      },
      GPS_CONFIG.WATCH_OPTIONS
    );
    
    setTrackingWatchId(watchId);
    
    // Backup interval polling every 5 seconds (reduced from 10)
    const intervalId = setInterval(async () => {
      if (navigator.geolocation && document.visibilityState === 'visible') {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // Filter out inaccurate readings
            if (pos.coords.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
              return;
            }

            // Check minimum distance
            if (lastLocationRef.current) {
              const distance = calculateDistance(
                lastLocationRef.current.latitude,
                lastLocationRef.current.longitude,
                pos.coords.latitude,
                pos.coords.longitude
              );
              if (distance < GPS_CONFIG.MIN_DISTANCE_METERS) {
                setGpsAccuracy(pos.coords.accuracy);
                setLastUpdateTime(new Date());
                return;
              }
            }

            const newLocation = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString()
            };
            setCurrentLocation(newLocation);
            setGpsAccuracy(pos.coords.accuracy);
            setLastUpdateTime(new Date());
            lastLocationRef.current = newLocation;
            
            axios.post(`${API}/admin/mileage/update-location`, {
              location: newLocation
            }, getAuthHeader()).then(() => {
              fetchCumulativeDistance();
            }).catch(console.error);
          },
          (error) => console.error("Interval location error:", error),
          GPS_CONFIG.HIGH_ACCURACY
        );
      }
    }, GPS_CONFIG.POLLING_INTERVAL);
    
    localStorage.setItem('mileage_interval_id', intervalId.toString());
  }, [getAuthHeader, fetchCumulativeDistance, enableWakeLock, calculateDistance]);

  // Start GPS tracking - IMPROVED with wake lock and accuracy filtering
  const startMileageTracking = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    try {
      // Enable wake lock first to keep screen awake
      await enableWakeLock();
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GPS_CONFIG.HIGH_ACCURACY);
      });
      
      // Warn if initial accuracy is poor
      if (position.coords.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
        toast.warning(`GPS accuracy is ${Math.round(position.coords.accuracy)}m - move to open area for better tracking`);
      }
      
      const startLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };
      
      let startAddress = `${startLocation.latitude.toFixed(4)}, ${startLocation.longitude.toFixed(4)}`;
      
      const response = await axios.post(`${API}/admin/mileage/start-trip`, {
        start_location: startLocation,
        start_address: startAddress
      }, getAuthHeader());
      
      const tripData = response.data;
      setActiveTripData(tripData);
      setIsTracking(true);
      setCurrentLocation(startLocation);
      setGpsAccuracy(position.coords.accuracy);
      setLastUpdateTime(new Date());
      lastLocationRef.current = startLocation;
      setCumulativeMiles(0);
      setWaypointCount(0);
      
      // Store in localStorage for persistence across sessions
      localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(tripData));
      
      // Start watching position with improved accuracy filtering
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // Filter out inaccurate readings
          if (pos.coords.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
            console.log(`Ignoring inaccurate GPS: ${pos.coords.accuracy}m`);
            return;
          }

          // Check minimum distance to reduce noise
          if (lastLocationRef.current) {
            const distance = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              pos.coords.latitude,
              pos.coords.longitude
            );
            if (distance < GPS_CONFIG.MIN_DISTANCE_METERS) {
              setGpsAccuracy(pos.coords.accuracy);
              setLastUpdateTime(new Date());
              return;
            }
          }

          const newLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          setCurrentLocation(newLocation);
          setGpsAccuracy(pos.coords.accuracy);
          setLastUpdateTime(new Date());
          lastLocationRef.current = newLocation;
          setTrackingWarning(null);
          
          // Send waypoint to server for accurate mileage calculation
          axios.post(`${API}/admin/mileage/update-location`, {
            location: newLocation
          }, getAuthHeader()).then(() => {
            fetchCumulativeDistance();
          }).catch(console.error);
        },
        (error) => {
          console.error("Location tracking error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setTrackingWarning("Location permission denied");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setTrackingWarning("GPS signal lost - move to open area");
          } else if (error.code === error.TIMEOUT) {
            setTrackingWarning("GPS taking too long - retrying...");
          }
        },
        GPS_CONFIG.WATCH_OPTIONS
      );
      
      setTrackingWatchId(watchId);
      
      // Backup interval polling every 5 seconds (improved from 10)
      const intervalId = setInterval(async () => {
        if (navigator.geolocation && document.visibilityState === 'visible') {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (pos.coords.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) return;

              if (lastLocationRef.current) {
                const distance = calculateDistance(
                  lastLocationRef.current.latitude,
                  lastLocationRef.current.longitude,
                  pos.coords.latitude,
                  pos.coords.longitude
                );
                if (distance < GPS_CONFIG.MIN_DISTANCE_METERS) {
                  setGpsAccuracy(pos.coords.accuracy);
                  setLastUpdateTime(new Date());
                  return;
                }
              }

              const newLocation = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: new Date().toISOString()
              };
              setCurrentLocation(newLocation);
              setGpsAccuracy(pos.coords.accuracy);
              setLastUpdateTime(new Date());
              lastLocationRef.current = newLocation;
              
              axios.post(`${API}/admin/mileage/update-location`, {
                location: newLocation
              }, getAuthHeader()).then(() => {
                fetchCumulativeDistance();
              }).catch(console.error);
            },
            (error) => console.error("Interval location error:", error),
            GPS_CONFIG.HIGH_ACCURACY
          );
        }
      }, GPS_CONFIG.POLLING_INTERVAL);
      
      // Store interval ID for cleanup
      localStorage.setItem('mileage_interval_id', intervalId.toString());
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: true, isPaused: false });
      }
      
      toast.success("Trip tracking started! Keep app open for continuous tracking. Screen will stay awake.");
      
    } catch (error) {
      console.error("Failed to start tracking:", error);
      disableWakeLock(); // Disable wake lock if start failed
      toast.error(error.response?.data?.detail || "Failed to start trip tracking");
    }
  };

  // Stop tracking - show end trip modal
  const stopMileageTracking = () => {
    setShowEndTripModal(true);
  };

  // Confirm end trip
  const confirmEndTrip = async () => {
    if (!currentLocation) {
      toast.error("Unable to get current location. Please wait for GPS.");
      return;
    }
    
    try {
      const endAddress = `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
      
      // Server will calculate the actual cumulative distance from waypoints
      const response = await axios.post(`${API}/admin/mileage/end-trip`, {
        end_location: currentLocation,
        end_address: endAddress,
        total_miles: cumulativeMiles, // Server will override with actual calculation
        purpose: endTripData.purpose,
        purpose_other: endTripData.purpose === "other" ? endTripData.purpose_other : null,
        notes: endTripData.notes
      }, getAuthHeader());
      
      // Stop watching position
      if (trackingWatchId) {
        navigator.geolocation.clearWatch(trackingWatchId);
        setTrackingWatchId(null);
      }
      
      // Clear interval
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
        locationUpdateInterval.current = null;
      }
      
      // Clear backup interval from localStorage
      const savedIntervalId = localStorage.getItem('mileage_interval_id');
      if (savedIntervalId) {
        clearInterval(parseInt(savedIntervalId));
        localStorage.removeItem('mileage_interval_id');
      }
      
      // Disable wake lock
      disableWakeLock();
      
      // Clear localStorage
      localStorage.removeItem(ACTIVE_TRIP_KEY);
      
      setIsTracking(false);
      setActiveTripData(null);
      setCurrentLocation(null);
      setCumulativeMiles(0);
      setWaypointCount(0);
      setShowEndTripModal(false);
      setEndTripData({ purpose: "thrifting", purpose_other: "", notes: "" });
      setIsPaused(false);
      setGpsAccuracy(null);
      setLastUpdateTime(null);
      setTrackingWarning(null);
      lastLocationRef.current = null;
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: false, isPaused: false });
      }
      
      const totalMiles = response.data.total_miles || cumulativeMiles;
      toast.success(`Trip ended! ${totalMiles.toFixed(1)} miles recorded from route tracking.`);
      fetchMileageEntries();
      
    } catch (error) {
      console.error("Failed to end trip:", error);
      toast.error(error.response?.data?.detail || "Failed to end trip");
    }
  };

  // Cancel trip
  const cancelTrip = async () => {
    try {
      await axios.post(`${API}/admin/mileage/cancel-trip`, {}, getAuthHeader());
      
      if (trackingWatchId) {
        navigator.geolocation.clearWatch(trackingWatchId);
        setTrackingWatchId(null);
      }
      
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
        locationUpdateInterval.current = null;
      }
      
      // Clear backup interval from localStorage
      const savedIntervalId = localStorage.getItem('mileage_interval_id');
      if (savedIntervalId) {
        clearInterval(parseInt(savedIntervalId));
        localStorage.removeItem('mileage_interval_id');
      }
      
      // Disable wake lock
      disableWakeLock();
      
      localStorage.removeItem(ACTIVE_TRIP_KEY);
      
      setIsTracking(false);
      setIsPaused(false);
      setActiveTripData(null);
      setCurrentLocation(null);
      setCumulativeMiles(0);
      setWaypointCount(0);
      setGpsAccuracy(null);
      setLastUpdateTime(null);
      setTrackingWarning(null);
      lastLocationRef.current = null;
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: false, isPaused: false });
      }
      
      toast.info("Trip cancelled");
      
    } catch (error) {
      console.error("Failed to cancel trip:", error);
      toast.error("Failed to cancel trip");
    }
  };

  // Pause trip tracking
  const pauseTrip = async () => {
    try {
      await axios.post(`${API}/admin/mileage/pause-trip`, {}, getAuthHeader());
      
      // Stop watching position while paused
      if (trackingWatchId) {
        navigator.geolocation.clearWatch(trackingWatchId);
        setTrackingWatchId(null);
      }
      
      // Clear backup interval while paused
      const savedIntervalId = localStorage.getItem('mileage_interval_id');
      if (savedIntervalId) {
        clearInterval(parseInt(savedIntervalId));
        localStorage.removeItem('mileage_interval_id');
      }
      
      // Disable wake lock while paused to save battery
      disableWakeLock();
      
      setIsPaused(true);
      setTrackingWarning(null);
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: true, isPaused: true });
      }
      
      toast.success("Trip paused - GPS tracking stopped, screen can sleep");
      
    } catch (error) {
      console.error("Failed to pause trip:", error);
      toast.error(error.response?.data?.detail || "Failed to pause trip");
    }
  };

  // Resume trip tracking
  const resumeTripFromPause = async () => {
    try {
      await axios.post(`${API}/admin/mileage/resume-trip`, {}, getAuthHeader());
      
      setIsPaused(false);
      
      // Resume GPS tracking (this also re-enables wake lock)
      resumeTracking();
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: true, isPaused: false });
      }
      
      toast.success("Trip resumed - GPS tracking restarted, screen will stay awake");
      
    } catch (error) {
      console.error("Failed to resume trip:", error);
      toast.error(error.response?.data?.detail || "Failed to resume trip");
    }
  };

  // Add manual mileage entry
  const handleAddMileageEntry = async () => {
    if (!mileageFormData.total_miles || !mileageFormData.start_address || !mileageFormData.end_address) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      await axios.post(`${API}/admin/mileage/entries`, {
        date: mileageFormData.date,
        start_address: mileageFormData.start_address,
        end_address: mileageFormData.end_address,
        total_miles: parseFloat(mileageFormData.total_miles),
        purpose: mileageFormData.purpose,
        purpose_other: mileageFormData.purpose === "other" ? mileageFormData.purpose_other : null,
        notes: mileageFormData.notes
      }, getAuthHeader());
      
      toast.success("Mileage entry added!");
      setShowAddMileageModal(false);
      setMileageFormData({
        date: new Date().toISOString().split('T')[0],
        start_address: "",
        end_address: "",
        total_miles: "",
        purpose: "thrifting",
        purpose_other: "",
        notes: ""
      });
      fetchMileageEntries();
      
    } catch (error) {
      console.error("Failed to add mileage entry:", error);
      toast.error("Failed to add mileage entry");
    }
  };

  // Edit mileage entry
  const handleEditMileageEntry = async () => {
    if (!editingMileageEntry) return;
    
    try {
      await axios.put(`${API}/admin/mileage/entries/${editingMileageEntry.id}`, {
        date: mileageFormData.date,
        start_address: mileageFormData.start_address,
        end_address: mileageFormData.end_address,
        total_miles: parseFloat(mileageFormData.total_miles),
        purpose: mileageFormData.purpose,
        purpose_other: mileageFormData.purpose === "other" ? mileageFormData.purpose_other : null,
        notes: mileageFormData.notes
      }, getAuthHeader());
      
      toast.success("Mileage entry updated!");
      setShowEditMileageModal(false);
      setEditingMileageEntry(null);
      fetchMileageEntries();
      
    } catch (error) {
      console.error("Failed to update mileage entry:", error);
      toast.error("Failed to update mileage entry");
    }
  };

  // Delete mileage entry
  const handleDeleteMileageEntry = async (entryId) => {
    if (!confirm("Are you sure you want to delete this mileage entry?")) return;
    
    try {
      await axios.delete(`${API}/admin/mileage/entries/${entryId}`, getAuthHeader());
      toast.success("Mileage entry deleted");
      fetchMileageEntries();
    } catch (error) {
      console.error("Failed to delete mileage entry:", error);
      toast.error("Failed to delete mileage entry");
    }
  };

  // Toggle trip selection
  const toggleTripSelection = (tripId) => {
    setSelectedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  // Select all trips
  const selectAllTrips = () => {
    const allIds = mileageEntries.map(e => e.id);
    setSelectedTrips(new Set(allIds));
  };

  // Deselect all
  const deselectAllTrips = () => {
    setSelectedTrips(new Set());
  };

  // Bulk delete trips
  const handleBulkDelete = async () => {
    if (selectedTrips.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedTrips.size} trip(s)?`)) return;
    
    try {
      const promises = Array.from(selectedTrips).map(id =>
        axios.delete(`${API}/admin/mileage/entries/${id}`, getAuthHeader())
      );
      await Promise.all(promises);
      toast.success(`${selectedTrips.size} trip(s) deleted`);
      setSelectedTrips(new Set());
      setSelectMode(false);
      fetchMileageEntries();
    } catch (error) {
      console.error("Error deleting trips:", error);
      toast.error("Failed to delete trips");
    }
  };

  // Open edit modal
  const openEditMileageModal = (entry) => {
    setEditingMileageEntry(entry);
    setMileageFormData({
      date: entry.date,
      start_address: entry.start_address,
      end_address: entry.end_address,
      total_miles: entry.total_miles.toString(),
      purpose: entry.purpose,
      purpose_other: entry.purpose_other || "",
      notes: entry.notes || ""
    });
    setShowEditMileageModal(true);
  };

  // Check for active trip on mount and when section is expanded
  useEffect(() => {
    if (isExpanded) {
      fetchMileageEntries();
    }
  }, [isExpanded, fetchMileageEntries]);

  // Check localStorage for active trip on initial mount
  useEffect(() => {
    const storedTrip = localStorage.getItem(ACTIVE_TRIP_KEY);
    if (storedTrip) {
      try {
        const tripData = JSON.parse(storedTrip);
        setActiveTripData(tripData);
        setIsTracking(true);
        // Will be verified against server when section is expanded
      } catch (e) {
        localStorage.removeItem(ACTIVE_TRIP_KEY);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackingWatchId) {
        navigator.geolocation.clearWatch(trackingWatchId);
      }
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [trackingWatchId]);

  // Purpose badge colors
  const getPurposeBadge = (purpose, purposeOther) => {
    const badges = {
      thrifting: { bg: "bg-purple-100", text: "text-purple-700", label: "Thrifting" },
      post_office: { bg: "bg-blue-100", text: "text-blue-700", label: "Post Office" },
      other: { bg: "bg-gray-100", text: "text-gray-700", label: purposeOther || "Other" }
    };
    const badge = badges[purpose] || badges.other;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Mileage form field change handlers using functional updates to prevent re-render focus loss
  const handleFormFieldChange = (field, value) => {
    setMileageFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Main Section */}
      <div className="dashboard-card" data-testid="mileage-section">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="mileage-section-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#333]">Mileage Tracking</h2>
              <p className="text-sm text-[#888]">Track business miles for tax purposes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isTracking && (
              isPaused ? (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" />
                  Paused
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Tracking
                </span>
              )
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#888]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#888]" />
            )}
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              data-testid="mileage-section-content"
            >
              <div className="pt-6 space-y-6">
                {/* GPS Tracking Controls */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Navigation className="w-6 h-6 text-emerald-600" />
                      <div>
                        <p className="font-medium text-[#333]">GPS Route Tracking</p>
                        <p className="text-sm text-[#888]">
                          {isTracking 
                            ? `Tracking since ${activeTripData?.start_time ? new Date(activeTripData.start_time).toLocaleTimeString() : 'N/A'}`
                            : 'Tracks actual route traveled, not just start/end points'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isTracking ? (
                        <Button
                          onClick={startMileageTracking}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                          data-testid="start-tracking-btn"
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Trip
                        </Button>
                      ) : (
                        <>
                          {isPaused ? (
                            <Button
                              onClick={resumeTripFromPause}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                              data-testid="resume-tracking-btn"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Resume
                            </Button>
                          ) : (
                            <Button
                              onClick={pauseTrip}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                              data-testid="pause-tracking-btn"
                            >
                              <PauseCircle className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                          )}
                          <Button
                            onClick={stopMileageTracking}
                            className="bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600"
                            data-testid="stop-tracking-btn"
                          >
                            <StopCircle className="w-4 h-4 mr-2" />
                            End Trip
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelTrip}
                            className="text-[#888] hover:text-red-500"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Active Trip Info */}
                  {isTracking && (
                    <div className={`mt-4 p-3 rounded-lg space-y-2 ${isPaused ? 'bg-amber-50' : 'bg-white/60'}`}>
                      {isPaused && (
                        <div className="flex items-center gap-2 text-amber-600 font-medium mb-2">
                          <PauseCircle className="w-4 h-4" />
                          <span>Trip Paused</span>
                        </div>
                      )}
                      
                      {/* Warning Banner */}
                      {trackingWarning && !isPaused && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-xs mb-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>{trackingWarning}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Route className={`w-4 h-4 ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`} />
                          <span className="text-sm font-medium text-[#333]">Route Distance:</span>
                        </div>
                        <span className={`text-lg font-bold ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>{cumulativeMiles.toFixed(2)} mi</span>
                      </div>
                      
                      {/* GPS Status Indicators */}
                      {!isPaused && (
                        <div className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg">
                          <div className="flex items-center gap-3">
                            {/* GPS Signal Indicator */}
                            <div className="flex items-center gap-1">
                              <Zap className={`w-3 h-3 ${gpsAccuracy && gpsAccuracy <= 20 ? 'text-green-500' : gpsAccuracy && gpsAccuracy <= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
                              <span className="text-[#666]">
                                GPS: {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : 'Acquiring...'}
                              </span>
                            </div>
                            {/* Screen Wake Status */}
                            <div className="flex items-center gap-1">
                              <Smartphone className={`w-3 h-3 ${isScreenAwake ? 'text-green-500' : 'text-gray-400'}`} />
                              <span className={isScreenAwake ? 'text-green-600' : 'text-gray-500'}>
                                {isScreenAwake ? 'Screen Locked' : 'May Sleep'}
                              </span>
                            </div>
                          </div>
                          {lastUpdateTime && (
                            <span className="text-[#999]">
                              Updated {Math.round((new Date() - lastUpdateTime) / 1000)}s ago
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-[#666]">
                        <span>Waypoints recorded: {waypointCount}</span>
                        {currentLocation && !isPaused && (
                          <span>
                            <MapPinned className="w-3 h-3 inline mr-1" />
                            {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs p-2 rounded ${isPaused ? 'text-amber-600 bg-amber-100' : 'text-emerald-600 bg-emerald-50'}`}>
                        {isPaused 
                          ? 'GPS tracking paused. Click Resume to continue tracking your route.'
                          : 'Keep app open & screen on for best accuracy. Tracking continues while app is visible.'}
                      </p>
                      
                      {/* Live Map Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <button
                          onClick={() => setShowLiveMap(!showLiveMap)}
                          className="flex items-center gap-2 text-sm text-[#00D4FF] hover:text-[#00A8CC] transition-colors"
                        >
                          <Map className="w-4 h-4" />
                          {showLiveMap ? 'Hide Map' : 'Show Live Map'}
                        </button>
                        {showLiveMap && (
                          <button
                            onClick={() => setFollowLocation(!followLocation)}
                            className={`flex items-center gap-1 text-xs ${followLocation ? 'text-emerald-600' : 'text-gray-500'}`}
                          >
                            {followLocation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {followLocation ? 'Following' : 'Manual'}
                          </button>
                        )}
                      </div>
                      
                      {/* Live Map */}
                      {showLiveMap && !isPaused && (
                        <div className="mt-2">
                          <TripMap
                            waypoints={tripWaypoints}
                            currentLocation={currentLocation}
                            isLiveTracking={true}
                            followLocation={followLocation}
                            height="250px"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-[#888]">Total Miles (This Year)</p>
                    <p className="text-2xl font-bold text-emerald-600">{mileageSummary.total_miles.toFixed(1)}</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-[#888]">Total Trips</p>
                    <p className="text-2xl font-bold text-teal-600">{mileageSummary.total_trips}</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-[#888]">IRS Rate (2026)</p>
                    <p className="text-2xl font-bold text-[#333]">$0.725<span className="text-sm font-normal">/mile</span></p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Est. Deduction: ${(mileageSummary.total_miles * 0.725).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <p className="text-xs text-[#888]">
                    For mileage reports, use the Reports section
                  </p>
                  <Button
                    onClick={() => setShowAddMileageModal(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    data-testid="add-mileage-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </div>

                {/* Recent Trips - Collapsible */}
                <div>
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-3"
                    onClick={() => setShowMileageEntries(!showMileageEntries)}
                  >
                    <h3 className="text-sm font-semibold text-[#333]">Recent Trips ({mileageEntries.length})</h3>
                    {showMileageEntries ? (
                      <ChevronUp className="w-4 h-4 text-[#888]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#888]" />
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showMileageEntries && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {/* Bulk Actions Bar */}
                        {mileageEntries.length > 0 && (
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectMode) {
                                  setSelectMode(false);
                                  setSelectedTrips(new Set());
                                } else {
                                  setSelectMode(true);
                                }
                              }}
                              className={`text-sm ${selectMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'text-[#888]'}`}
                            >
                              {selectMode ? 'Cancel Selection' : 'Select Trips'}
                            </Button>
                            
                            {selectMode && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (selectedTrips.size === mileageEntries.length) {
                                      deselectAllTrips();
                                    } else {
                                      selectAllTrips();
                                    }
                                  }}
                                  className="text-sm text-[#888]"
                                >
                                  {selectedTrips.size === mileageEntries.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                
                                {selectedTrips.size > 0 && (
                                  <>
                                    <span className="text-sm text-[#888]">
                                      {selectedTrips.size} selected
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleBulkDelete}
                                      className="text-sm text-red-500 border-red-300 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {loadingMileage ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                          </div>
                        ) : mileageEntries.length === 0 ? (
                          <p className="text-center text-[#888] py-4">No trips recorded yet</p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {mileageEntries.map((entry) => {
                              const isSelected = selectedTrips.has(entry.id);
                              return (
                                <div 
                                  key={entry.id} 
                                  className={`flex items-center justify-between border rounded-lg p-3 transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-emerald-50 border-emerald-400' 
                                      : 'bg-white border-gray-100 hover:shadow-sm'
                                  }`}
                                  onClick={() => {
                                    if (selectMode) {
                                      toggleTripSelection(entry.id);
                                    }
                                  }}
                                >
                                  {/* Checkbox for selection mode */}
                                  {selectMode && (
                                    <div 
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mr-3 transition-all ${
                                        isSelected 
                                          ? 'bg-emerald-500 border-emerald-500' 
                                          : 'border-gray-300 hover:border-emerald-500'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTripSelection(entry.id);
                                      }}
                                    >
                                      {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      {getPurposeBadge(entry.purpose, entry.purpose_other)}
                                      <span className="text-xs text-[#888]">{entry.date}</span>
                                      {entry.user_name && (
                                        <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 text-[#8B5CF6] rounded-full font-medium">
                                          {entry.user_name}
                                        </span>
                                      )}
                                      {entry.waypoint_count > 0 && (
                                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                                          <Route className="w-3 h-3" />
                                          {entry.waypoint_count} pts
                                        </span>
                                      )}
                                      {/* Road-matched indicator */}
                                      {entry.is_road_matched ? (
                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          Road-Matched
                                          {entry.gaps_filled > 0 && (
                                            <span className="ml-1 text-blue-600" title={`${entry.gaps_filled} GPS gaps were automatically filled`}>
                                              +{entry.gaps_filled} gaps
                                            </span>
                                          )}
                                        </span>
                                      ) : entry.waypoint_count > 0 && (
                                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                                          GPS Only
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-[#666]">
                                      {entry.start_address} → {entry.end_address}
                                    </p>
                                    {entry.notes && (
                                      <p className="text-xs text-[#aaa] mt-1">{entry.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-emerald-600">{entry.total_miles.toFixed(1)} mi</span>
                                    {!selectMode && (
                                      <div className="flex gap-1">
                                        {/* Reprocess Route Button (only for GPS trips not yet road-matched) */}
                                        {entry.waypoint_count > 0 && !entry.is_road_matched && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await reprocessTripRoute(entry.id);
                                            }}
                                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                            title="Reprocess with road-matching"
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                          </Button>
                                        )}
                                        {/* View Map Button */}
                                        {entry.waypoint_count > 0 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              const tripData = await fetchCompletedTripWaypoints(entry.id);
                                              setViewingTripMap({
                                                ...entry,
                                                ...tripData
                                              });
                                            }}
                                            className="h-8 w-8 p-0 text-[#00D4FF]"
                                            title="View trip map"
                                          >
                                            <Map className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditMileageModal(entry);
                                          }}
                                          className="h-8 w-8 p-0 text-blue-600"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMileageEntry(entry.id);
                                          }}
                                          className="h-8 w-8 p-0 text-red-500"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Mileage Entry Modal */}
      {showAddMileageModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddMileageModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#333]">Add Mileage Entry</h3>
              <button 
                onClick={() => setShowAddMileageModal(false)}
                className="text-[#888] hover:text-[#333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={mileageFormData.date}
                  onChange={(e) => handleFormFieldChange('date', e.target.value)}
                  data-testid="mileage-date-input"
                />
              </div>
              <div>
                <Label>Start Location</Label>
                <Input
                  type="text"
                  placeholder="e.g., Home, 123 Main St"
                  value={mileageFormData.start_address}
                  onChange={(e) => handleFormFieldChange('start_address', e.target.value)}
                  data-testid="mileage-start-input"
                />
              </div>
              <div>
                <Label>End Location</Label>
                <Input
                  type="text"
                  placeholder="e.g., Goodwill, Thrift Store"
                  value={mileageFormData.end_address}
                  onChange={(e) => handleFormFieldChange('end_address', e.target.value)}
                  data-testid="mileage-end-input"
                />
              </div>
              <div>
                <Label>Total Miles</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={mileageFormData.total_miles}
                  onChange={(e) => handleFormFieldChange('total_miles', e.target.value)}
                  data-testid="mileage-miles-input"
                />
              </div>
              <div>
                <Label>Purpose</Label>
                <Select
                  value={mileageFormData.purpose}
                  onValueChange={(value) => handleFormFieldChange('purpose', value)}
                >
                  <SelectTrigger data-testid="mileage-purpose-select">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thrifting">Thrifting</SelectItem>
                    <SelectItem value="post_office">Post Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mileageFormData.purpose === "other" && (
                <div>
                  <Label>Specify Purpose</Label>
                  <Input
                    type="text"
                    placeholder="Enter purpose"
                    value={mileageFormData.purpose_other}
                    onChange={(e) => handleFormFieldChange('purpose_other', e.target.value)}
                    data-testid="mileage-purpose-other-input"
                  />
                </div>
              )}
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  type="text"
                  placeholder="Any additional notes"
                  value={mileageFormData.notes}
                  onChange={(e) => handleFormFieldChange('notes', e.target.value)}
                  data-testid="mileage-notes-input"
                />
              </div>
              <Button
                onClick={handleAddMileageEntry}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                data-testid="save-mileage-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Entry
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Mileage Entry Modal */}
      {showEditMileageModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditMileageModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#333]">Edit Mileage Entry</h3>
              <button 
                onClick={() => setShowEditMileageModal(false)}
                className="text-[#888] hover:text-[#333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={mileageFormData.date}
                  onChange={(e) => handleFormFieldChange('date', e.target.value)}
                  data-testid="edit-mileage-date-input"
                />
              </div>
              <div>
                <Label>Start Location</Label>
                <Input
                  type="text"
                  placeholder="e.g., Home, 123 Main St"
                  value={mileageFormData.start_address}
                  onChange={(e) => handleFormFieldChange('start_address', e.target.value)}
                  data-testid="edit-mileage-start-input"
                />
              </div>
              <div>
                <Label>End Location</Label>
                <Input
                  type="text"
                  placeholder="e.g., Goodwill, Thrift Store"
                  value={mileageFormData.end_address}
                  onChange={(e) => handleFormFieldChange('end_address', e.target.value)}
                  data-testid="edit-mileage-end-input"
                />
              </div>
              <div>
                <Label>Total Miles</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={mileageFormData.total_miles}
                  onChange={(e) => handleFormFieldChange('total_miles', e.target.value)}
                  data-testid="edit-mileage-miles-input"
                />
              </div>
              <div>
                <Label>Purpose</Label>
                <Select
                  value={mileageFormData.purpose}
                  onValueChange={(value) => handleFormFieldChange('purpose', value)}
                >
                  <SelectTrigger data-testid="edit-mileage-purpose-select">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thrifting">Thrifting</SelectItem>
                    <SelectItem value="post_office">Post Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mileageFormData.purpose === "other" && (
                <div>
                  <Label>Specify Purpose</Label>
                  <Input
                    type="text"
                    placeholder="Enter purpose"
                    value={mileageFormData.purpose_other}
                    onChange={(e) => handleFormFieldChange('purpose_other', e.target.value)}
                    data-testid="edit-mileage-purpose-other-input"
                  />
                </div>
              )}
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  type="text"
                  placeholder="Any additional notes"
                  value={mileageFormData.notes}
                  onChange={(e) => handleFormFieldChange('notes', e.target.value)}
                  data-testid="edit-mileage-notes-input"
                />
              </div>
              <Button
                onClick={handleEditMileageEntry}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                data-testid="update-mileage-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Update Entry
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* End Trip Modal */}
      {showEndTripModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEndTripModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#333]">End Trip</h3>
              <button 
                onClick={() => setShowEndTripModal(false)}
                className="text-[#888] hover:text-[#333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700">Route Distance:</span>
                  <span className="text-xl font-bold text-emerald-600">{cumulativeMiles.toFixed(2)} mi</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Calculated from {waypointCount} GPS waypoints (more waypoints = more accurate)
                </p>
              </div>
              <div>
                <Label>Purpose</Label>
                <Select
                  value={endTripData.purpose}
                  onValueChange={(value) => setEndTripData({ ...endTripData, purpose: value })}
                >
                  <SelectTrigger data-testid="end-trip-purpose-select">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thrifting">Thrifting</SelectItem>
                    <SelectItem value="post_office">Post Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {endTripData.purpose === "other" && (
                <div>
                  <Label>Specify Purpose</Label>
                  <Input
                    type="text"
                    placeholder="Enter purpose"
                    value={endTripData.purpose_other}
                    onChange={(e) => setEndTripData({ ...endTripData, purpose_other: e.target.value })}
                    data-testid="end-trip-purpose-other-input"
                  />
                </div>
              )}
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  type="text"
                  placeholder="Any additional notes"
                  value={endTripData.notes}
                  onChange={(e) => setEndTripData({ ...endTripData, notes: e.target.value })}
                  data-testid="end-trip-notes-input"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEndTripModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmEndTrip}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white"
                  data-testid="confirm-end-trip-btn"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  End Trip
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Trip Map Modal */}
      <AnimatePresence>
        {viewingTripMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingTripMap(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      <Map className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Trip Route</h3>
                      <p className="text-white/60 text-sm">
                        {viewingTripMap.date} • {viewingTripMap.total_miles?.toFixed(1)} miles
                        {viewingTripMap.isRoadMatched && (
                          <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
                            Road-Matched
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingTripMap(null)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="p-4">
                {viewingTripMap.waypoints && viewingTripMap.waypoints.length > 0 ? (
                  <TripMap
                    waypoints={viewingTripMap.waypoints}
                    matchedCoordinates={viewingTripMap.matchedCoordinates || []}
                    isRoadMatched={viewingTripMap.isRoadMatched || false}
                    matchConfidence={viewingTripMap.matchConfidence || 0}
                    isLiveTracking={false}
                    height="400px"
                    showWaypoints={!viewingTripMap.isRoadMatched}
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-xl">
                    <div className="text-center">
                      <Map className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No route data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Trip Details */}
              <div className="px-4 pb-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Start</p>
                    <p className="text-[#333] font-medium">{viewingTripMap.startAddress || viewingTripMap.start_address || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">End</p>
                    <p className="text-[#333] font-medium">{viewingTripMap.endAddress || viewingTripMap.end_address || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Road-matching status */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${viewingTripMap.isRoadMatched ? 'bg-green-50' : 'bg-emerald-50'}`}>
                  <div className="flex items-center gap-2">
                    {viewingTripMap.isRoadMatched ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">
                          Road-matched ({Math.round((viewingTripMap.matchConfidence || 0) * 100)}% confidence)
                        </span>
                      </>
                    ) : (
                      <>
                        <Route className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-emerald-700">
                          {viewingTripMap.waypoints?.length || 0} GPS waypoints
                        </span>
                      </>
                    )}
                  </div>
                  <span className={`font-bold ${viewingTripMap.isRoadMatched ? 'text-green-600' : 'text-emerald-600'}`}>
                    {(viewingTripMap.totalMiles || viewingTripMap.total_miles)?.toFixed(2)} mi
                  </span>
                </div>

                {/* Legend for road-matched routes */}
                {viewingTripMap.isRoadMatched && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-1 bg-green-500 rounded"></div>
                      <span>Road-matched route</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-0.5 bg-gray-400 rounded" style={{ borderStyle: 'dashed' }}></div>
                      <span>Original GPS path</span>
                    </div>
                  </div>
                )}

                {viewingTripMap.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">Notes</p>
                    <p className="text-[#333] text-sm">{viewingTripMap.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200">
                <Button
                  onClick={() => setViewingTripMap(null)}
                  className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
