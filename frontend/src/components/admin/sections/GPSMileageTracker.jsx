/**
 * GPS Mileage Tracker Component
 * Real-time GPS tracking for business mileage with IRS deduction calculations
 */
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  Play,
  Pause,
  Square,
  MapPin,
  DollarSign,
  Clock,
  Upload,
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
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

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
  
  // Location tracking state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationCount, setLocationCount] = useState(0);
  const watchIdRef = useRef(null);
  const locationBufferRef = useRef([]);
  const syncIntervalRef = useRef(null);
  const completionFormRef = useRef(null);
  
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

  // Auto-expand and scroll when completing
  useEffect(() => {
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
    
    try {
      const response = await axios.get(`${API}/admin/gps-trips/active`, getAuthHeader());
      if (response.data.active_trip) {
        setActiveTrip(response.data.active_trip);
        setTrackingStatus(response.data.active_trip.status === "paused" ? "paused" : "tracking");
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
      const response = await axios.get(`${API}/admin/gps-trips/summary`, getAuthHeader());
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  }, [getAuthHeader]);

  // Load data when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchActiveTrip();
      fetchTripHistory();
      fetchSummary();
    }
  }, [isExpanded, fetchActiveTrip, fetchTripHistory, fetchSummary]);

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
        setShowCompletionForm(false);
        
        // Start continuous tracking
        await startLocationTracking(tripId);
        
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
      
      const response = await axios.post(
        `${API}/admin/gps-trips/pause/${activeTrip.id}`,
        {},
        getAuthHeader()
      );
      
      if (response.data.success) {
        setTrackingStatus("paused");
        setActiveTrip(prev => ({ ...prev, status: "paused" }));
        await stopLocationTracking();
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
        await startLocationTracking(activeTrip.id);
        toast.success("Trip resumed");
      }
    } catch (error) {
      console.error("Failed to resume trip:", error);
      toast.error("Failed to resume trip");
    }
  };

  // Stop trip (show completion form)
  const handleStopTrip = async () => {
    if (!activeTrip) return;
    
    try {
      // Sync final locations
      await syncLocations(activeTrip.id);
      await stopLocationTracking();
      
      setShowCompletionForm(true);
      setTrackingStatus("idle");
      
      // Scroll to completion form
      setTimeout(() => {
        completionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (error) {
      console.error("Error stopping trip:", error);
    }
  };

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
      await axios.delete(`${API}/admin/gps-trips/${activeTrip.id}`, getAuthHeader());
      
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
                `${summary.total_miles?.toFixed(1) || 0} mi this year • $${summary.tax_deduction?.toFixed(2) || "0.00"} deduction`
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
                  
                  {/* Control Buttons */}
                  {!showCompletionForm && (
                    <div className="flex gap-2">
                      {trackingStatus === "tracking" ? (
                        <>
                          <Button
                            onClick={handlePauseTrip}
                            variant="outline"
                            className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                            data-testid="pause-trip-btn"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                          <Button
                            onClick={handleStopTrip}
                            variant="outline"
                            className="flex-1 border-red-400 text-red-700 hover:bg-red-50"
                            data-testid="stop-trip-btn"
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : trackingStatus === "paused" ? (
                        <>
                          <Button
                            onClick={handleResumeTrip}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            data-testid="resume-trip-btn"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                          <Button
                            onClick={handleStopTrip}
                            variant="outline"
                            className="flex-1 border-red-400 text-red-700 hover:bg-red-50"
                            data-testid="stop-trip-btn-paused"
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : null}
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
              
              {/* Start New Trip Button */}
              {!activeTrip && !showCompletionForm && (
                <Button
                  onClick={handleStartTrip}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white py-6 text-lg"
                  data-testid="start-trip-btn"
                >
                  {loading ? (
                    "Getting location..."
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start New Trip
                    </>
                  )}
                </Button>
              )}
              
              {/* Location Error */}
              {locationError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}
              
              {/* Year Summary */}
              {summary && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-800">{summary.year} Summary</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{summary.total_trips}</p>
                      <p className="text-xs text-amber-600">Trips</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{summary.total_miles?.toFixed(1)}</p>
                      <p className="text-xs text-amber-600">Miles</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">${summary.tax_deduction?.toFixed(0)}</p>
                      <p className="text-xs text-amber-600">Deduction</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    IRS Rate: ${summary.irs_rate}/mile
                  </p>
                </div>
              )}
              
              {/* Trip History */}
              {tripHistory.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Recent Trips</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tripHistory.map(trip => {
                      const PurposeIcon = getPurposeIcon(trip.purpose);
                      return (
                        <div
                          key={trip.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                              <PurposeIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-800">
                                {getPurposeLabel(trip.purpose)}
                                {trip.notes && <span className="text-gray-500 font-normal"> - {trip.notes}</span>}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(trip.start_time)} • {trip.total_miles?.toFixed(2)} mi • ${trip.tax_deduction?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {trip.receipt_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(`${API.replace('/api', '')}${trip.receipt_url}`, '_blank')}
                                className="text-gray-500"
                              >
                                <Receipt className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTrip(trip.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default GPSMileageTracker;
