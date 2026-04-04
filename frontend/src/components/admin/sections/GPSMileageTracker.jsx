/**
 * GPS Mileage Tracker Component
 * Real-time GPS tracking for business mileage with IRS deduction calculations
 * 
 * Refactored: Mar 28, 2026 - Extracted sub-components to gps-tracker/ folder
 */
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, lazy, Suspense } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  Play,
  Pause,
  Square,
  MapPin,
  DollarSign,
  Camera,
  ChevronDown,
  ChevronUp,
  Trash2,
  Receipt,
  Car,
  Building2,
  ShoppingBag,
  FileText,
  X,
  Check,
  AlertCircle,
  Map,
  Calendar,
  CalendarDays,
  TrendingUp,
  Settings2,
  Plus,
  Minus,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

// Import refactored sub-components
import {
  MileageSummaryTabs,
  HierarchicalTripList,
  ManualTripForm,
  EditTripModal,
  TripMapModal,
  MileageAdjustmentModal,
  TripRow
} from "./gps-tracker";

// Lazy load the map component
const TripMap = lazy(() => import("@/components/TripMap"));

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Check if running in Capacitor native app
const isNativePlatform = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative;
};

// Trip purposes
const TRIP_PURPOSES = [
  { value: "post_office", label: "Post Office", icon: Building2 },
  { value: "sourcing", label: "Sourcing", icon: ShoppingBag },
  { value: "other", label: "Other", icon: FileText }
];

// IRS rate for display
const IRS_RATE_2026 = 0.725;

const GPSMileageTracker = forwardRef(function GPSMileageTracker({ 
  getAuthHeader,
  externalTrip,
  externalTrackingStatus,
  onTripCompleted,
  setExternalTrip,
  setExternalTrackingStatus,
  gpsTracker: externalGpsTracker
}, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tripHistory, setTripHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryView, setSummaryView] = useState("year"); // "today", "month", "year"
  
  // Collapsible state for hierarchical trip view
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  
  // Mileage adjustment state (used by MileageAdjustmentModal)
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    miles: "",
    reason: ""
  });
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  
  // Use external state if provided, otherwise internal
  const activeTrip = externalTrip;
  const setActiveTrip = setExternalTrip || (() => {});
  const trackingStatus = externalTrackingStatus || "idle";
  const setTrackingStatus = setExternalTrackingStatus || (() => {});
  
  // Use external GPS tracker if provided
  const gpsTracker = externalGpsTracker;
  
  // Determine if completion form should show
  const showCompletionForm = trackingStatus === "completing";
  
  // Completion form data
  const [completionData, setCompletionData] = useState({
    purpose: "",
    notes: "",
    receipt: null
  });
  
  // Manual trip entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTripData, setManualTripData] = useState({
    date: new Date().toISOString().split('T')[0],
    miles: "",
    purpose: "",
    notes: "",
    receipt: null
  });
  const [savingManualTrip, setSavingManualTrip] = useState(false);
  const manualEntryRef = useRef(null);
  
  // Scroll to manual entry form when it opens
  useEffect(() => {
    if (showManualEntry && manualEntryRef.current) {
      setTimeout(() => {
        manualEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showManualEntry]);
  
  // Edit trip state (used by EditTripModal)
  const [editingTrip, setEditingTrip] = useState(null);
  const [editTripData, setEditTripData] = useState({
    date: "",
    miles: "",
    purpose: "",
    notes: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Location tracking state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationCount, setLocationCount] = useState(0);
  const watchIdRef = useRef(null);
  const locationBufferRef = useRef([]);
  const syncIntervalRef = useRef(null);
  const completionFormRef = useRef(null);
  const isCompletingRef = useRef(false); // Ref to prevent stale closure issues
  
  // Map viewing state (used by TripMapModal)
  const [viewingTripMap, setViewingTripMap] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  
  // Background geolocation (native only)
  const backgroundGeoRef = useRef(null);
  const containerRef = useRef(null);

  // Expose scrollIntoView via ref
  useImperativeHandle(ref, () => ({
    scrollIntoView: (options) => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView(options);
      }
    }
  }));

  // Auto-expand when tracking is active or completing
  useEffect(() => {
    if (trackingStatus === "tracking" || trackingStatus === "paused") {
      setIsExpanded(true);
    }
    if (trackingStatus === "completing") {
      setIsExpanded(true);
      // Scroll to completion form after a short delay
      setTimeout(() => {
        if (completionFormRef.current) {
          completionFormRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [trackingStatus]);

  // Fetch active trip on mount (only if no external trip provided)
  const fetchActiveTrip = useCallback(async () => {
    // Skip if external state is managing the trip
    if (externalTrip !== undefined) return;
    
    // Skip if we're in "completing" state - use REF to avoid stale closure
    if (isCompletingRef.current) {
      console.log("Skipping fetchActiveTrip - isCompletingRef is true");
      return;
    }
    
    try {
      const response = await axios.get(`${API}/admin/gps-trips/active`, getAuthHeader());
      if (response.data.active_trip) {
        setActiveTrip(response.data.active_trip);
        // Only update status if not already completing (check ref again)
        if (!isCompletingRef.current) {
          setTrackingStatus(response.data.active_trip.status === "paused" ? "paused" : "tracking");
        }
        setLocationCount(response.data.active_trip.location_count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch active trip:", error);
    }
  }, [getAuthHeader, externalTrip, setActiveTrip, setTrackingStatus]);

  // Fetch trip history
  const fetchTripHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/gps-trips/history`, {
        params: { limit: 20 },
        ...getAuthHeader()
      });
      setTripHistory(response.data.trips || []);
    } catch (error) {
      console.error("Failed to fetch trip history:", error);
    }
  }, [getAuthHeader]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      // Pass timezone offset so backend can calculate "today" in client's local time
      const tzOffset = new Date().getTimezoneOffset(); // Minutes behind UTC (e.g., -300 for US Central)
      const response = await axios.get(`${API}/admin/gps-trips/summary?tz_offset=${tzOffset}`, getAuthHeader());
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  }, [getAuthHeader]);

  // Load data when expanded
  useEffect(() => {
    // Only fetch if expanded AND not in completing state
    // (to prevent overwriting the completing status when scrolling/expanding)
    if (isExpanded && trackingStatus !== "completing") {
      fetchActiveTrip();
      fetchTripHistory();
      fetchSummary();
    }
  }, [isExpanded, trackingStatus, fetchActiveTrip, fetchTripHistory, fetchSummary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Get current position
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };

  // Start location tracking
  const startLocationTracking = async (tripId) => {
    try {
      // Try to use background geolocation on native platforms
      if (isNativePlatform()) {
        try {
          const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
          backgroundGeoRef.current = BackgroundGeolocation;
          
          await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "Tracking your trip mileage",
              backgroundTitle: "Thrifty Curator",
              requestPermissions: true,
              stale: false,
              distanceFilter: 10 // meters
            },
            (location, error) => {
              if (error) {
                console.error("Background location error:", error);
                return;
              }
              
              if (location) {
                const point = {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  timestamp: new Date().toISOString(),
                  accuracy: location.accuracy,
                  speed: location.speed
                };
                
                setCurrentLocation(point);
                locationBufferRef.current.push(point);
                setLocationCount(prev => prev + 1);
              }
            }
          ).then(watcherId => {
            watchIdRef.current = watcherId;
          });
          
          console.log("Background geolocation started");
        } catch (bgError) {
          console.log("Background geolocation not available, using standard:", bgError);
          startStandardTracking();
        }
      } else {
        startStandardTracking();
      }
      
      // Start sync interval to send locations to server
      syncIntervalRef.current = setInterval(() => {
        syncLocations(tripId);
      }, 30000); // Sync every 30 seconds
      
    } catch (error) {
      console.error("Failed to start location tracking:", error);
      setLocationError(error.message);
    }
  };

  // Standard browser geolocation tracking
  const startStandardTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
          speed: position.coords.speed
        };
        
        setCurrentLocation(point);
        locationBufferRef.current.push(point);
        setLocationCount(prev => prev + 1);
      },
      (error) => {
        console.error("Location error:", error);
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  };

  // Sync buffered locations to server
  const syncLocations = async (tripId) => {
    if (locationBufferRef.current.length === 0) return;
    
    const locationsToSync = [...locationBufferRef.current];
    locationBufferRef.current = [];
    
    try {
      const response = await axios.post(
        `${API}/admin/gps-trips/update-locations`,
        {
          trip_id: tripId,
          locations: locationsToSync
        },
        getAuthHeader()
      );
      
      if (response.data.success) {
        setActiveTrip(prev => ({
          ...prev,
          total_miles: response.data.total_miles,
          location_count: response.data.location_count
        }));
      }
    } catch (error) {
      // Re-add failed locations to buffer
      locationBufferRef.current = [...locationsToSync, ...locationBufferRef.current];
      console.error("Failed to sync locations:", error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = async () => {
    // Clear sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    // Stop background geolocation
    if (backgroundGeoRef.current && watchIdRef.current) {
      try {
        await backgroundGeoRef.current.removeWatcher({ id: watchIdRef.current });
      } catch (error) {
        console.error("Error stopping background geo:", error);
      }
    }
    
    // Stop standard geolocation
    if (watchIdRef.current && !backgroundGeoRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = null;
  };

  // Start a new trip
  const handleStartTrip = async () => {
    setLoading(true);
    setLocationError(null);
    
    try {
      // Get current location first
      const position = await getCurrentPosition();
      
      const response = await axios.post(
        `${API}/admin/gps-trips/start`,
        {
          start_latitude: position.coords.latitude,
          start_longitude: position.coords.longitude
        },
        getAuthHeader()
      );
      
      if (response.data.success) {
        const tripId = response.data.trip_id;
        setActiveTrip({
          id: tripId,
          status: "active",
          start_time: response.data.start_time,
          total_miles: 0
        });
        setTrackingStatus("tracking");
        setLocationCount(1);
        
        // If external GPS tracker is provided, use ONLY that (avoid duplicate tracking)
        if (externalGpsTracker?.startTracking) {
          await externalGpsTracker.startTracking();
          // Don't start internal tracking - external handles it
        } else {
          // Fallback to internal tracking only if no external tracker
          await startLocationTracking(tripId);
        }
        
        toast.success("Trip started! GPS tracking is active.", {
          description: "Drive safely. Tracking continues in background."
        });
      }
    } catch (error) {
      console.error("Failed to start trip:", error);
      const message = error.response?.data?.detail || error.message || "Failed to start trip";
      toast.error(message);
      
      if (error.code === 1) {
        setLocationError("Location permission denied. Please enable location services.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Pause trip
  const handlePauseTrip = async () => {
    if (!activeTrip) return;
    
    try {
      // Sync any pending locations first
      await syncLocations(activeTrip.id);
      
      // If using external GPS tracker, pause that. Otherwise pause internal.
      if (externalGpsTracker?.pauseTracking) {
        await externalGpsTracker.pauseTracking();
      } else {
        await stopLocationTracking();
      }
      
      const response = await axios.post(
        `${API}/admin/gps-trips/pause/${activeTrip.id}`,
        {},
        getAuthHeader()
      );
      
      if (response.data.success) {
        setTrackingStatus("paused");
        setActiveTrip(prev => ({ ...prev, status: "paused" }));
        toast.info("Trip paused");
      }
    } catch (error) {
      console.error("Failed to pause trip:", error);
      toast.error("Failed to pause trip");
    }
  };

  // Resume trip
  const handleResumeTrip = async () => {
    if (!activeTrip) return;
    
    try {
      const response = await axios.post(
        `${API}/admin/gps-trips/resume/${activeTrip.id}`,
        {},
        getAuthHeader()
      );
      
      if (response.data.success) {
        setTrackingStatus("tracking");
        setActiveTrip(prev => ({ ...prev, status: "active" }));
        
        // If using external GPS tracker, resume that. Otherwise resume internal.
        if (externalGpsTracker?.resumeTracking) {
          await externalGpsTracker.resumeTracking();
        } else {
          await startLocationTracking(activeTrip.id);
        }
        
        toast.success("Trip resumed");
      }
    } catch (error) {
      console.error("Failed to resume trip:", error);
      toast.error("Failed to resume trip");
    }
  };

  // Stop trip (show completion form)
  const handleStopTrip = useCallback(async () => {
    // Use props directly to avoid stale closure issues
    const trip = externalTrip;
    const setStatus = setExternalTrackingStatus;
    
    if (!trip) {
      console.log("No active trip to stop - externalTrip is:", externalTrip);
      return;
    }
    
    if (!setStatus) {
      console.log("No setExternalTrackingStatus provided");
      return;
    }
    
    console.log("Stopping trip, trip id:", trip.id);
    
    // CRITICAL: Set the ref FIRST to prevent any fetchActiveTrip from running
    isCompletingRef.current = true;
    
    // IMMEDIATELY set status to completing - this is the most important thing
    // Do this BEFORE any async operations to prevent race conditions
    setStatus("completing");
    console.log("Status set to completing");
    
    // Scroll to completion form right away
    setTimeout(() => {
      completionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    
    // Now do cleanup in the background (non-blocking)
    // These are "fire and forget" - we don't wait for them
    (async () => {
      try {
        // Try to sync final locations
        await syncLocations(trip.id);
      } catch (syncError) {
        console.log("Sync locations error (non-fatal):", syncError);
      }
      
      try {
        // Stop whichever tracking method is active
        if (externalGpsTracker?.stopTracking) {
          await externalGpsTracker.stopTracking();
        } else {
          await stopLocationTracking();
        }
      } catch (stopError) {
        console.log("Stop tracking error (non-fatal):", stopError);
      }
    })();
  }, [externalTrip, setExternalTrackingStatus, externalGpsTracker, syncLocations, stopLocationTracking]);

  // Complete trip with details
  const handleCompleteTrip = async () => {
    if (!activeTrip || !completionData.purpose) {
      toast.error("Please select a trip purpose");
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload receipt if provided
      if (completionData.receipt) {
        const formData = new FormData();
        formData.append("receipt", completionData.receipt);
        
        await axios.post(
          `${API}/admin/gps-trips/upload-receipt/${activeTrip.id}`,
          formData,
          {
            ...getAuthHeader(),
            headers: {
              ...getAuthHeader().headers,
              "Content-Type": "multipart/form-data"
            }
          }
        );
      }
      
      // Complete the trip
      const response = await axios.post(
        `${API}/admin/gps-trips/complete`,
        {
          trip_id: activeTrip.id,
          purpose: completionData.purpose,
          notes: completionData.purpose === "other" ? completionData.notes : null
        },
        getAuthHeader()
      );
      
      if (response.data.success) {
        toast.success(
          `Trip completed! ${response.data.total_miles} miles tracked.`,
          { description: `Tax deduction: $${response.data.tax_deduction}` }
        );
        
        // Reset state
        isCompletingRef.current = false; // Reset the completing flag
        setActiveTrip(null);
        setTrackingStatus("idle");
        setCompletionData({ purpose: "", notes: "", receipt: null });
        setLocationCount(0);
        
        // Notify parent
        if (onTripCompleted) {
          onTripCompleted();
        }
        
        // Refresh data
        await fetchTripHistory();
        await fetchSummary();
      }
    } catch (error) {
      console.error("Failed to complete trip:", error);
      toast.error("Failed to complete trip");
    } finally {
      setLoading(false);
    }
  };

  // Cancel trip completion (discard trip)
  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    
    if (!window.confirm("Discard this trip? All tracking data will be lost.")) {
      return;
    }
    
    try {
      // Stop the external GPS tracker if provided
      // Stop whichever tracking method is active
      if (externalGpsTracker?.stopTracking) {
        await externalGpsTracker.stopTracking();
        if (externalGpsTracker?.reset) {
          externalGpsTracker.reset();
        }
      } else {
        await stopLocationTracking();
      }
      
      await axios.delete(`${API}/admin/gps-trips/${activeTrip.id}`, getAuthHeader());
      
      // Reset state
      isCompletingRef.current = false; // Reset the completing flag
      setActiveTrip(null);
      setTrackingStatus("idle");
      setCompletionData({ purpose: "", notes: "", receipt: null });
      setLocationCount(0);
      
      // Notify parent
      if (onTripCompleted) {
        onTripCompleted();
      }
      
      toast.info("Trip discarded");
    } catch (error) {
      console.error("Failed to delete trip:", error);
      toast.error("Failed to discard trip");
    }
  };

  // Delete a completed trip
  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm("Delete this trip record?")) return;
    
    try {
      await axios.delete(`${API}/admin/gps-trips/${tripId}`, getAuthHeader());
      toast.success("Trip deleted");
      await fetchTripHistory();
      await fetchSummary();
    } catch (error) {
      console.error("Failed to delete trip:", error);
      toast.error("Failed to delete trip");
    }
  };

  // Save a manually entered trip (can receive form data from ManualTripForm component or use internal state)
  const handleSaveManualTrip = async (formData = null) => {
    // Use passed formData or fall back to internal state
    const data = formData || manualTripData;
    
    // Robust validation - handle both string and number types
    const milesValue = data.miles ? parseFloat(String(data.miles).trim()) : 0;
    
    if (!milesValue || milesValue <= 0 || isNaN(milesValue)) {
      toast.error("Please enter the miles driven");
      return;
    }
    if (!data.purpose) {
      toast.error("Please select a trip purpose");
      return;
    }
    
    setSavingManualTrip(true);
    
    try {
      const response = await axios.post(
        `${API}/admin/gps-trips/manual`,
        {
          date: data.date,
          total_miles: milesValue, // Use the validated numeric value
          purpose: data.purpose,
          notes: data.purpose === "other" ? data.notes : null
        },
        getAuthHeader()
      );
      
      if (response.data.success) {
        // Upload receipt if provided
        if (data.receipt && response.data.trip_id) {
          try {
            const receiptFormData = new FormData();
            receiptFormData.append("receipt", data.receipt);
            await axios.post(
              `${API}/admin/gps-trips/upload-receipt/${response.data.trip_id}`,
              receiptFormData,
              {
                ...getAuthHeader(),
                headers: {
                  ...getAuthHeader().headers,
                  "Content-Type": "multipart/form-data"
                }
              }
            );
          } catch (uploadError) {
            console.log("Receipt upload failed:", uploadError);
          }
        }
        
        toast.success(
          `Trip logged! ${response.data.total_miles} miles.`,
          { description: `Tax deduction: $${response.data.tax_deduction}` }
        );
        
        // Reset internal state
        setManualTripData({
          date: new Date().toISOString().split('T')[0],
          miles: "",
          purpose: "",
          notes: "",
          receipt: null
        });
        setShowManualEntry(false);
        
        // Refresh data
        await fetchTripHistory();
        await fetchSummary();
      }
    } catch (error) {
      console.error("Failed to save manual trip:", error);
      toast.error(error.response?.data?.detail || "Failed to save trip");
    } finally {
      setSavingManualTrip(false);
    }
  };

  // Open edit modal for a trip
  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setEditTripData({
      date: trip.start_time ? trip.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
      miles: trip.total_miles?.toString() || "",
      purpose: trip.purpose || "",
      notes: trip.notes || ""
    });
  };

  // Save edited trip
  const handleSaveEditTrip = async () => {
    if (!editingTrip) return;
    
    if (!editTripData.miles || parseFloat(editTripData.miles) <= 0) {
      toast.error("Please enter valid miles");
      return;
    }
    if (!editTripData.purpose) {
      toast.error("Please select a trip purpose");
      return;
    }
    
    setSavingEdit(true);
    
    try {
      const response = await axios.put(
        `${API}/admin/gps-trips/${editingTrip.id}`,
        {
          date: editTripData.date,
          total_miles: parseFloat(editTripData.miles),
          purpose: editTripData.purpose,
          notes: editTripData.purpose === "other" ? editTripData.notes : null
        },
        getAuthHeader()
      );
      
      if (response.data.success) {
        toast.success("Trip updated successfully");
        setEditingTrip(null);
        setEditTripData({ date: "", miles: "", purpose: "", notes: "" });
        
        // Refresh data
        await fetchTripHistory();
        await fetchSummary();
      }
    } catch (error) {
      console.error("Failed to update trip:", error);
      toast.error(error.response?.data?.detail || "Failed to update trip");
    } finally {
      setSavingEdit(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTrip(null);
    setEditTripData({ date: "", miles: "", purpose: "", notes: "" });
  };

  // Handle mileage adjustment
  const handleSaveAdjustment = async () => {
    const miles = parseFloat(adjustmentData.miles);
    if (isNaN(miles) || miles === 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }
    
    setSavingAdjustment(true);
    
    try {
      // Determine the date based on current summary view
      let adjustDate;
      const now = new Date();
      if (summaryView === "today") {
        adjustDate = now.toISOString().split('T')[0];
      } else if (summaryView === "month") {
        adjustDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      } else {
        adjustDate = `${now.getFullYear()}-01-01`;
      }
      
      const response = await axios.post(
        `${API}/admin/gps-trips/adjust`,
        {
          period: summaryView === "today" ? "day" : summaryView,
          date: adjustDate,
          adjustment_miles: miles,
          reason: adjustmentData.reason || null
        },
        getAuthHeader()
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAdjustModal(false);
        setAdjustmentData({ miles: "", reason: "" });
        
        // Refresh summary
        await fetchSummary();
      }
    } catch (error) {
      console.error("Failed to adjust mileage:", error);
      toast.error(error.response?.data?.detail || "Failed to adjust mileage");
    } finally {
      setSavingAdjustment(false);
    }
  };

  // View trip on map
  const handleViewTripMap = async (tripId) => {
    setLoadingMap(true);
    try {
      const response = await axios.get(
        `${API}/admin/gps-trips/trip/${tripId}?include_locations=true`,
        getAuthHeader()
      );
      
      if (response.data.trip) {
        setViewingTripMap({
          trip: response.data.trip,
          locations: response.data.trip.locations || []
        });
      }
    } catch (error) {
      console.error("Failed to load trip map:", error);
      toast.error("Failed to load trip map");
    } finally {
      setLoadingMap(false);
    }
  };

  // Close trip map modal
  const closeTripMap = () => {
    setViewingTripMap(null);
  };

  // Format duration
  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end - start) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Get purpose label
  const getPurposeLabel = (purpose) => {
    const found = TRIP_PURPOSES.find(p => p.value === purpose);
    return found ? found.label : purpose;
  };

  // Get purpose icon
  const getPurposeIcon = (purpose) => {
    const found = TRIP_PURPOSES.find(p => p.value === purpose);
    return found ? found.icon : FileText;
  };

  return (
    <div ref={containerRef} className="dashboard-card" data-testid="gps-mileage-tracker">
      {/* Header - Always Visible */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center ${trackingStatus === "tracking" ? "animate-pulse" : ""}`}>
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#333]">GPS Mileage Tracker</h3>
            <p className="text-xs text-[#888]">
              {activeTrip ? (
                <span className={`font-medium ${trackingStatus === "completing" ? "text-amber-600" : "text-green-600"}`}>
                  {trackingStatus === "paused" ? "Trip paused" : 
                   trackingStatus === "completing" ? "Complete your trip below" :
                   "Tracking active"} • {activeTrip.total_miles?.toFixed(2) || "0.00"} mi
                </span>
              ) : summary ? (
                <span>
                  Today: {summary.today?.miles?.toFixed(1) || 0} mi • 
                  {summary.this_month?.name}: {summary.this_month?.miles?.toFixed(1) || 0} mi • 
                  YTD: {summary.total_miles?.toFixed(1) || 0} mi
                </span>
              ) : (
                "Track business mileage for IRS deductions"
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Hide quick action buttons since we have header buttons */}
          <Button variant="ghost" size="sm" className="text-[#888]">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {/* Active Trip Panel */}
              {(activeTrip || showCompletionForm) && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        trackingStatus === "tracking" ? "bg-green-500 animate-pulse" :
                        trackingStatus === "paused" ? "bg-amber-500" : "bg-gray-400"
                      }`} />
                      <span className="font-medium text-green-800">
                        {showCompletionForm ? "Complete Your Trip" :
                         trackingStatus === "paused" ? "Trip Paused" : "Trip in Progress"}
                      </span>
                    </div>
                    {activeTrip && !showCompletionForm && (
                      <span className="text-sm text-green-600">
                        {formatDuration(activeTrip.start_time)}
                      </span>
                    )}
                  </div>
                  
                  {/* Live Stats */}
                  {!showCompletionForm && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/60 rounded-lg p-3 text-center">
                        <Car className={`w-5 h-5 text-green-600 mx-auto mb-1 ${trackingStatus === "tracking" ? "animate-pulse" : ""}`} />
                        <p className="text-xl font-bold text-green-700">
                          {gpsTracker?.totalMiles?.toFixed(2) || activeTrip?.total_miles?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-xs text-green-600">Miles</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 text-center">
                        <MapPin className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-xl font-bold text-green-700">{gpsTracker?.locationCount || locationCount || 0}</p>
                        <p className="text-xs text-green-600">Points</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 text-center">
                        <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-xl font-bold text-green-700">
                          ${((gpsTracker?.totalMiles || activeTrip?.total_miles || 0) * IRS_RATE_2026).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600">Deduction</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Collapsible Live Map - View Route in Real-Time */}
                  {!showCompletionForm && (trackingStatus === "tracking" || trackingStatus === "paused") && (
                    <div className="mb-4">
                      <button
                        onClick={() => setShowLiveMap(!showLiveMap)}
                        className="w-full flex items-center justify-between p-2 bg-white/40 hover:bg-white/60 rounded-lg transition-colors text-sm"
                        data-testid="toggle-live-map-btn"
                      >
                        <span className="flex items-center gap-2 text-green-700 font-medium">
                          <Map className="w-4 h-4" />
                          {showLiveMap ? "Hide Route Map" : "View Route Map"}
                        </span>
                        {showLiveMap ? (
                          <ChevronUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {showLiveMap && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 rounded-lg overflow-hidden border border-green-200">
                              {gpsTracker?.getLocations && gpsTracker.getLocations().length > 0 ? (
                                <Suspense fallback={
                                  <div className="h-[200px] bg-gray-100 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                  </div>
                                }>
                                  <TripMap 
                                    locations={gpsTracker.getLocations()} 
                                    height="200px"
                                    showCurrentPosition={true}
                                  />
                                </Suspense>
                              ) : (
                                <div className="h-[200px] bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                                  <div className="text-center">
                                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p>Waiting for GPS points...</p>
                                    <p className="text-xs mt-1">Start moving to see your route</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {gpsTracker?.getLocations && gpsTracker.getLocations().length > 0 && (
                              <p className="text-xs text-green-600 mt-1 text-center">
                                {gpsTracker.getLocations().length} points tracked • Map updates as you move
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  
                  {/* Completion Form */}
                  {showCompletionForm && (
                    <div ref={completionFormRef} className="space-y-4">
                      {/* Trip Summary */}
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Distance:</span>
                            <span className="ml-2 font-semibold">{gpsTracker?.totalMiles?.toFixed(2) || activeTrip?.total_miles?.toFixed(2) || "0.00"} miles</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2 font-semibold">{formatDuration(activeTrip?.start_time)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">IRS Deduction:</span>
                            <span className="ml-2 font-semibold text-green-600">
                              ${((gpsTracker?.totalMiles || activeTrip?.total_miles || 0) * IRS_RATE_2026).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">@ ${IRS_RATE_2026}/mi</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Trip Route Map */}
                      {gpsTracker?.getLocations && gpsTracker.getLocations().length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                            <Map className="w-4 h-4" />
                            Your Route
                          </Label>
                          <Suspense fallback={
                            <div className="h-[200px] bg-gray-100 rounded-lg flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                          }>
                            <TripMap 
                              locations={gpsTracker.getLocations()} 
                              height="200px"
                            />
                          </Suspense>
                        </div>
                      )}
                      
                      {/* Purpose Selection */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Trip Purpose *</Label>
                        <Select
                          value={completionData.purpose}
                          onValueChange={(value) => setCompletionData(prev => ({ ...prev, purpose: value }))}
                        >
                          <SelectTrigger className="mt-1" data-testid="trip-purpose-select">
                            <SelectValue placeholder="Select purpose..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TRIP_PURPOSES.map(purpose => (
                              <SelectItem key={purpose.value} value={purpose.value}>
                                <div className="flex items-center gap-2">
                                  <purpose.icon className="w-4 h-4" />
                                  {purpose.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Notes (shown when "Other" is selected) */}
                      {completionData.purpose === "other" && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Trip Notes</Label>
                          <Textarea
                            value={completionData.notes}
                            onChange={(e) => setCompletionData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Describe the purpose of this trip..."
                            className="mt-1"
                            rows={2}
                            data-testid="trip-notes-input"
                          />
                        </div>
                      )}
                      
                      {/* Receipt Upload */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Receipt (Optional)</Label>
                        <div className="mt-1">
                          {completionData.receipt ? (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Receipt className="w-5 h-5 text-green-600" />
                              <span className="text-sm text-gray-700 flex-1 truncate">
                                {completionData.receipt.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCompletionData(prev => ({ ...prev, receipt: null }))}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                              <Camera className="w-5 h-5 text-gray-400" />
                              <span className="text-sm text-gray-500">Tap to upload receipt</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    setCompletionData(prev => ({ ...prev, receipt: e.target.files[0] }));
                                  }
                                }}
                                data-testid="receipt-upload-input"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleCancelTrip}
                          variant="outline"
                          className="flex-1 border-gray-300"
                          data-testid="discard-trip-btn"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Discard
                        </Button>
                        <Button
                          onClick={handleCompleteTrip}
                          disabled={loading || !completionData.purpose}
                          className="flex-1 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white"
                          data-testid="complete-trip-btn"
                        >
                          {loading ? (
                            "Saving..."
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Complete Trip
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Manual Entry Button - only show when no active trip */}
              {!activeTrip && !showCompletionForm && !showManualEntry && (
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowManualEntry(true)}
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 py-4"
                    data-testid="manual-entry-btn"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Log Trip Manually
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Use the GPS controls at the top of the dashboard to start tracking
                  </p>
                </div>
              )}
              
              {/* Manual Trip Entry Form */}
              {!activeTrip && !showCompletionForm && showManualEntry && (
                <div ref={manualEntryRef} className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-800 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Manual Trip Entry
                    </h4>
                    <button
                      onClick={() => {
                        setShowManualEntry(false);
                        setManualTripData({
                          date: new Date().toISOString().split('T')[0],
                          miles: "",
                          purpose: "",
                          notes: "",
                          receipt: null
                        });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-blue-600">
                    Log a trip you took without GPS tracking
                  </p>
                  
                  {/* Date */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Trip Date *</Label>
                    <Input
                      type="date"
                      value={manualTripData.date}
                      onChange={(e) => setManualTripData(prev => ({ ...prev, date: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                      data-testid="manual-trip-date"
                    />
                  </div>
                  
                  {/* Miles */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Miles Driven *</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0.1"
                        max="1000"
                        placeholder="e.g., 15.5"
                        value={manualTripData.miles}
                        onChange={(e) => setManualTripData(prev => ({ ...prev, miles: e.target.value }))}
                        className="pr-16"
                        data-testid="manual-trip-miles"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">miles</span>
                    </div>
                    {manualTripData.miles && parseFloat(manualTripData.miles) > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Tax Deduction: ${(parseFloat(manualTripData.miles) * IRS_RATE_2026).toFixed(2)}
                      </p>
                    )}
                  </div>
                  
                  {/* Purpose */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Trip Purpose *</Label>
                    <Select
                      value={manualTripData.purpose}
                      onValueChange={(value) => setManualTripData(prev => ({ ...prev, purpose: value }))}
                    >
                      <SelectTrigger className="mt-1" data-testid="manual-trip-purpose">
                        <SelectValue placeholder="Select purpose..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIP_PURPOSES.map(purpose => (
                          <SelectItem key={purpose.value} value={purpose.value}>
                            <div className="flex items-center gap-2">
                              <purpose.icon className="w-4 h-4" />
                              {purpose.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Notes (for "Other" purpose) */}
                  {manualTripData.purpose === "other" && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Trip Notes</Label>
                      <Textarea
                        value={manualTripData.notes}
                        onChange={(e) => setManualTripData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Describe the purpose of this trip..."
                        className="mt-1"
                        rows={2}
                        data-testid="manual-trip-notes"
                      />
                    </div>
                  )}
                  
                  {/* Receipt Upload */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Receipt (Optional)</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setManualTripData(prev => ({ 
                        ...prev, 
                        receipt: e.target.files?.[0] || null 
                      }))}
                      className="mt-1"
                      data-testid="manual-trip-receipt"
                    />
                    {manualTripData.receipt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {manualTripData.receipt.name}
                      </p>
                    )}
                  </div>
                  
                  {/* Submit Button */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setShowManualEntry(false);
                        setManualTripData({
                          date: new Date().toISOString().split('T')[0],
                          miles: "",
                          purpose: "",
                          notes: "",
                          receipt: null
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSaveManualTrip()}
                      disabled={savingManualTrip || !manualTripData.miles || !manualTripData.purpose}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="save-manual-trip-btn"
                    >
                      {savingManualTrip ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Trip
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Location Error */}
              {locationError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}
              
              {/* Mileage Summary - Day/Month/Year Tabs */}
              {summary && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
                  {/* Tab Headers */}
                  <div className="flex border-b border-blue-200">
                    <button
                      onClick={() => setSummaryView("today")}
                      className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                        summaryView === "today"
                          ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500"
                          : "text-blue-600 hover:bg-blue-50"
                      }`}
                      data-testid="summary-tab-today"
                    >
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Today
                    </button>
                    <button
                      onClick={() => setSummaryView("month")}
                      className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                        summaryView === "month"
                          ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500"
                          : "text-blue-600 hover:bg-blue-50"
                      }`}
                      data-testid="summary-tab-month"
                    >
                      <CalendarDays className="w-4 h-4 inline mr-1" />
                      {summary.this_month?.name || "Month"}
                    </button>
                    <button
                      onClick={() => setSummaryView("year")}
                      className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                        summaryView === "year"
                          ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500"
                          : "text-blue-600 hover:bg-blue-50"
                      }`}
                      data-testid="summary-tab-year"
                    >
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      {summary.year}
                    </button>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="p-4">
                    {summaryView === "today" && (
                      <div className="text-center">
                        <p className="text-xs text-blue-600 mb-2">Today's Mileage</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">{summary.today?.trips || 0}</p>
                            <p className="text-xs text-blue-600">Trips</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">{summary.today?.miles?.toFixed(1) || "0.0"}</p>
                            <p className="text-xs text-blue-600">Miles</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">${summary.today?.deduction?.toFixed(2) || "0.00"}</p>
                            <p className="text-xs text-blue-600">Deduction</p>
                          </div>
                        </div>
                        {summary.today?.trips === 0 && (
                          <p className="text-xs text-blue-500 mt-3">No trips recorded today</p>
                        )}
                      </div>
                    )}
                    
                    {summaryView === "month" && (
                      <div className="text-center">
                        <p className="text-xs text-blue-600 mb-2">{summary.this_month?.name} Mileage</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">{summary.this_month?.trips || 0}</p>
                            <p className="text-xs text-blue-600">Trips</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">{summary.this_month?.miles?.toFixed(1) || "0.0"}</p>
                            <p className="text-xs text-blue-600">Miles</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">${summary.this_month?.deduction?.toFixed(2) || "0.00"}</p>
                            <p className="text-xs text-blue-600">Deduction</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {summaryView === "year" && (
                      <div className="text-center">
                        <p className="text-xs text-blue-600 mb-2">{summary.year} Year-to-Date</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">{summary.total_trips || 0}</p>
                            <p className="text-xs text-blue-600">Trips</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">{summary.total_miles?.toFixed(1) || "0.0"}</p>
                            <p className="text-xs text-blue-600">Miles</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-2xl font-bold text-blue-700">${summary.total_deduction?.toFixed(0) || "0"}</p>
                            <p className="text-xs text-blue-600">Deduction</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Adjust Button and IRS Rate */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-100">
                      <p className="text-xs text-blue-600">
                        IRS Rate: ${summary.irs_rate}/mile
                      </p>
                      <button
                        onClick={() => setShowAdjustModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        data-testid="adjust-mileage-btn"
                      >
                        <Settings2 className="w-3 h-3" />
                        Adjust
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Adjustment Modal */}
              <AnimatePresence>
                {showAdjustModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowAdjustModal(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-2xl shadow-xl max-w-sm w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Settings2 className="w-5 h-5 text-blue-600" />
                          Adjust {summaryView === "today" ? "Today's" : summaryView === "month" ? summary?.this_month?.name : summary?.year} Mileage
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Add or subtract miles without creating a trip entry
                        </p>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Miles Adjustment</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => setAdjustmentData(prev => ({
                                ...prev,
                                miles: prev.miles.startsWith('-') ? prev.miles.slice(1) : `-${prev.miles}`
                              }))}
                              className={`p-2 rounded-lg border ${
                                adjustmentData.miles.startsWith('-') 
                                  ? 'bg-red-50 border-red-200 text-red-600' 
                                  : 'bg-green-50 border-green-200 text-green-600'
                              }`}
                            >
                              {adjustmentData.miles.startsWith('-') ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="100"
                              placeholder="0.0"
                              value={adjustmentData.miles.replace('-', '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const isNeg = adjustmentData.miles.startsWith('-');
                                setAdjustmentData(prev => ({
                                  ...prev,
                                  miles: isNeg ? `-${val}` : val
                                }));
                              }}
                              className="flex-1"
                              data-testid="adjustment-miles-input"
                            />
                            <span className="text-gray-500">miles</span>
                          </div>
                          {adjustmentData.miles && parseFloat(adjustmentData.miles) !== 0 && (
                            <p className={`text-xs mt-1 ${parseFloat(adjustmentData.miles) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Tax impact: {parseFloat(adjustmentData.miles) > 0 ? '+' : ''}${(parseFloat(adjustmentData.miles) * (summary?.irs_rate || 0.70)).toFixed(2)}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Reason (Optional)</Label>
                          <Input
                            type="text"
                            placeholder="e.g., GPS tracking error correction"
                            value={adjustmentData.reason}
                            onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                            className="mt-1"
                            data-testid="adjustment-reason-input"
                          />
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => {
                              setShowAdjustModal(false);
                              setAdjustmentData({ miles: "", reason: "" });
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveAdjustment}
                            disabled={savingAdjustment || !adjustmentData.miles || parseFloat(adjustmentData.miles) === 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            data-testid="save-adjustment-btn"
                          >
                            {savingAdjustment ? "Saving..." : "Apply Adjustment"}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Hierarchical Trip History - Changes based on selected tab */}
              {tripHistory.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-700 text-sm">
                      {summaryView === "today" ? "Today's Trips" : 
                       summaryView === "month" ? `${summary?.this_month?.name || "This Month"}'s Trips` :
                       `${summary?.year || new Date().getFullYear()} Trips`}
                    </h4>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {/* TODAY VIEW - Simple list of today's trips */}
                    {summaryView === "today" && (() => {
                      // Get today's date in local timezone (YYYY-MM-DD format)
                      const now = new Date();
                      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      
                      const todayTrips = tripHistory.filter(trip => {
                        if (!trip.start_time) return false;
                        // Parse the trip's start_time and compare in local timezone
                        const tripDate = new Date(trip.start_time);
                        const tripDateStr = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
                        return tripDateStr === today;
                      });
                      
                      if (todayTrips.length === 0) {
                        return (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No trips recorded today
                          </div>
                        );
                      }
                      
                      return todayTrips.map(trip => (
                        <TripRow key={trip.id} trip={trip} onViewMap={handleViewTripMap} onEdit={handleEditTrip} onDelete={handleDeleteTrip} getPurposeIcon={getPurposeIcon} getPurposeLabel={getPurposeLabel} formatDate={formatDate} API={API} />
                      ));
                    })()}
                    
                    {/* MONTH VIEW - Days collapsible, then trips */}
                    {summaryView === "month" && (() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth(); // 0-indexed
                      
                      // Group trips by day for current month
                      const tripsByDay = {};
                      tripHistory.forEach(trip => {
                        if (!trip.start_time) return;
                        const tripDate = new Date(trip.start_time);
                        // Check if trip is in current month (local timezone)
                        if (tripDate.getFullYear() === currentYear && tripDate.getMonth() === currentMonth) {
                          const dateKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
                          if (!tripsByDay[dateKey]) {
                            tripsByDay[dateKey] = { trips: [], miles: 0 };
                          }
                          tripsByDay[dateKey].trips.push(trip);
                          tripsByDay[dateKey].miles += trip.total_miles || 0;
                        }
                      });
                      
                      const sortedDays = Object.keys(tripsByDay).sort().reverse();
                      
                      if (sortedDays.length === 0) {
                        return (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No trips this month
                          </div>
                        );
                      }
                      
                      return sortedDays.map(day => (
                        <div key={day} className="border-b border-gray-100 last:border-b-0">
                          <button
                            onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-sm text-gray-700">
                                {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {tripsByDay[day].trips.length} trip{tripsByDay[day].trips.length !== 1 ? 's' : ''} • {tripsByDay[day].miles.toFixed(1)} mi
                              </span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedDays[day] ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {expandedDays[day] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-gray-50"
                              >
                                {tripsByDay[day].trips.map(trip => (
                                  <TripRow key={trip.id} trip={trip} onViewMap={handleViewTripMap} onEdit={handleEditTrip} onDelete={handleDeleteTrip} getPurposeIcon={getPurposeIcon} getPurposeLabel={getPurposeLabel} formatDate={formatDate} API={API} compact />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ));
                    })()}
                    
                    {/* YEAR VIEW - Months collapsible, then days, then trips */}
                    {summaryView === "year" && (() => {
                      const currentYear = summary?.year || new Date().getFullYear();
                      
                      // Group trips by month
                      const tripsByMonth = {};
                      tripHistory.forEach(trip => {
                        if (!trip.start_time) return;
                        const tripDate = new Date(trip.start_time);
                        // Check if trip is in the current year (local timezone)
                        if (tripDate.getFullYear() === currentYear) {
                          const monthKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
                          const dayKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
                          
                          if (!tripsByMonth[monthKey]) {
                            tripsByMonth[monthKey] = { trips: [], miles: 0, byDay: {} };
                          }
                          tripsByMonth[monthKey].trips.push(trip);
                          tripsByMonth[monthKey].miles += trip.total_miles || 0;
                          
                          // Also group by day within month
                          if (!tripsByMonth[monthKey].byDay[dayKey]) {
                            tripsByMonth[monthKey].byDay[dayKey] = { trips: [], miles: 0 };
                          }
                          tripsByMonth[monthKey].byDay[dayKey].trips.push(trip);
                          tripsByMonth[monthKey].byDay[dayKey].miles += trip.total_miles || 0;
                        }
                      });
                      
                      const sortedMonths = Object.keys(tripsByMonth).sort().reverse();
                      
                      if (sortedMonths.length === 0) {
                        return (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No trips this year
                          </div>
                        );
                      }
                      
                      return sortedMonths.map(month => {
                        const monthName = new Date(month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        const sortedDays = Object.keys(tripsByMonth[month].byDay).sort().reverse();
                        
                        return (
                          <div key={month} className="border-b border-gray-100 last:border-b-0">
                            {/* Month Header */}
                            <button
                              onClick={() => setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }))}
                              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-sm text-gray-700">{monthName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {tripsByMonth[month].trips.length} trip{tripsByMonth[month].trips.length !== 1 ? 's' : ''} • {tripsByMonth[month].miles.toFixed(1)} mi
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedMonths[month] ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                            
                            {/* Days within Month */}
                            <AnimatePresence>
                              {expandedMonths[month] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  {sortedDays.map(day => (
                                    <div key={day} className="border-t border-gray-100 bg-gray-50">
                                      {/* Day Header */}
                                      <button
                                        onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))}
                                        className="w-full flex items-center justify-between p-2 pl-8 hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3 h-3 text-gray-400" />
                                          <span className="text-sm text-gray-600">
                                            {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-400">
                                            {tripsByMonth[month].byDay[day].trips.length} • {tripsByMonth[month].byDay[day].miles.toFixed(1)} mi
                                          </span>
                                          <ChevronDown className={`w-3 h-3 text-gray-300 transition-transform ${expandedDays[day] ? 'rotate-180' : ''}`} />
                                        </div>
                                      </button>
                                      
                                      {/* Trips within Day */}
                                      <AnimatePresence>
                                        {expandedDays[day] && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-white"
                                          >
                                            {tripsByMonth[month].byDay[day].trips.map(trip => (
                                              <TripRow key={trip.id} trip={trip} onViewMap={handleViewTripMap} onEdit={handleEditTrip} onDelete={handleDeleteTrip} getPurposeIcon={getPurposeIcon} getPurposeLabel={getPurposeLabel} formatDate={formatDate} API={API} compact nested />
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Trip Modal - Using Portal to render at body level */}
      {editingTrip && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '16px',
            paddingTop: '60px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
          onClick={handleCancelEdit}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '400px',
              width: '100%',
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Edit Trip
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
              
              <div className="p-4 space-y-4">
                {/* Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Trip Date</Label>
                  <Input
                    type="date"
                    value={editTripData.date}
                    onChange={(e) => setEditTripData(prev => ({ ...prev, date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                    data-testid="edit-trip-date"
                  />
                </div>
                
                {/* Miles */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Miles Driven</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="1000"
                      value={editTripData.miles}
                      onChange={(e) => setEditTripData(prev => ({ ...prev, miles: e.target.value }))}
                      className="pr-16"
                      data-testid="edit-trip-miles"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">miles</span>
                  </div>
                  {editTripData.miles && parseFloat(editTripData.miles) > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Tax Deduction: ${(parseFloat(editTripData.miles) * IRS_RATE_2026).toFixed(2)}
                    </p>
                  )}
                </div>
                
                {/* Purpose */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Trip Purpose</Label>
                  <Select
                    value={editTripData.purpose}
                    onValueChange={(value) => setEditTripData(prev => ({ ...prev, purpose: value }))}
                  >
                    <SelectTrigger className="mt-1" data-testid="edit-trip-purpose">
                      <SelectValue placeholder="Select purpose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_PURPOSES.map(purpose => (
                        <SelectItem key={purpose.value} value={purpose.value}>
                          <div className="flex items-center gap-2">
                            <purpose.icon className="w-4 h-4" />
                            {purpose.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Notes (for "Other" purpose) */}
                {editTripData.purpose === "other" && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Trip Notes</Label>
                    <Textarea
                      value={editTripData.notes}
                      onChange={(e) => setEditTripData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Describe the purpose of this trip..."
                      className="mt-1"
                      rows={2}
                      data-testid="edit-trip-notes"
                    />
                  </div>
                )}
                
                {/* GPS Info */}
                {editingTrip.location_count > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <p>This trip has {editingTrip.location_count} GPS points recorded.</p>
                    <p className="text-xs text-gray-400 mt-1">GPS data cannot be edited.</p>
                  </div>
                )}
                
                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEditTrip}
                    disabled={savingEdit || !editTripData.miles || !editTripData.purpose}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="save-edit-trip-btn"
                  >
                    {savingEdit ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      
      {/* Trip Map Modal */}
      <AnimatePresence>
        {viewingTripMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeTripMap}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">Trip Route</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeTripMap}
                    className="text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Trip Info */}
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <span className="ml-1 font-medium">{formatDate(viewingTripMap.trip.start_time)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Distance:</span>
                    <span className="ml-1 font-medium">{viewingTripMap.trip.total_miles?.toFixed(2)} mi</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Purpose:</span>
                    <span className="ml-1 font-medium">{getPurposeLabel(viewingTripMap.trip.purpose)}</span>
                  </div>
                </div>
              </div>
              
              {/* Map */}
              <div className="p-4">
                {loadingMap ? (
                  <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                  </div>
                ) : (
                  <Suspense fallback={
                    <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    </div>
                  }>
                    <TripMap 
                      locations={viewingTripMap.locations} 
                      height="300px"
                    />
                  </Suspense>
                )}
              </div>
              
              {/* Trip Stats */}
              <div className="p-4 border-t bg-gray-50">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">{viewingTripMap.trip.total_miles?.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Miles</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">${viewingTripMap.trip.tax_deduction?.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">IRS Deduction</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{viewingTripMap.locations?.length || 0}</p>
                    <p className="text-xs text-gray-500">GPS Points</p>
                  </div>
                </div>
                
                {viewingTripMap.trip.notes && (
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-500">Notes:</p>
                    <p className="text-sm">{viewingTripMap.trip.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default GPSMileageTracker;
