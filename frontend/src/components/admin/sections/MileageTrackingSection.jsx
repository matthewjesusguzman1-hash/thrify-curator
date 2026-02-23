import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Navigation,
  MapPinned,
  PlayCircle,
  StopCircle,
  PauseCircle,
  Download,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Route,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ACTIVE_TRIP_KEY = "thrifty_curator_active_trip";

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
  const [showMileageEntries, setShowMileageEntries] = useState(true);
  const [cumulativeMiles, setCumulativeMiles] = useState(0);
  const [waypointCount, setWaypointCount] = useState(0);
  
  // Refs for tracking
  const locationUpdateInterval = useRef(null);
  
  // Modal states
  const [showAddMileageModal, setShowAddMileageModal] = useState(false);
  const [showEditMileageModal, setShowEditMileageModal] = useState(false);
  const [editingMileageEntry, setEditingMileageEntry] = useState(null);
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Export report state
  const [exportOptions, setExportOptions] = useState({
    period: "month",
    format: "pdf",
    customStart: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    customEnd: new Date().toISOString().split('T')[0]
  });
  const [exporting, setExporting] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [reportBlobUrl, setReportBlobUrl] = useState(null);
  
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

  // Fetch current cumulative distance from server
  const fetchCumulativeDistance = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/mileage/active-trip/distance`, getAuthHeader());
      setCumulativeMiles(response.data.cumulative_miles || 0);
      setWaypointCount(response.data.waypoint_count || 0);
    } catch (error) {
      console.error("Failed to fetch cumulative distance:", error);
    }
  }, [getAuthHeader]);

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
        // Fetch current distance
        fetchCumulativeDistance();
      } else {
        // Clear localStorage if no active trip on server
        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setIsTracking(false);
        setIsPaused(false);
        setActiveTripData(null);
      }
    } catch (error) {
      console.error("Failed to fetch mileage data:", error);
    } finally {
      setLoadingMileage(false);
    }
  }, [getAuthHeader, fetchCumulativeDistance]);

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
  }, [headerTripActive, fetchMileageEntries]);

  // Resume tracking for an existing trip
  const resumeTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    // Get current position first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        };
        setCurrentLocation(newLocation);
        
        // Send to server
        axios.post(`${API}/admin/mileage/update-location`, {
          location: newLocation
        }, getAuthHeader()).catch(console.error);
      },
      (error) => console.error("Failed to get current position:", error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toISOString()
        };
        setCurrentLocation(newLocation);
        
        // Send waypoint to server
        axios.post(`${API}/admin/mileage/update-location`, {
          location: newLocation
        }, getAuthHeader()).then(() => {
          // Update cumulative distance
          fetchCumulativeDistance();
        }).catch(console.error);
      },
      (error) => console.error("Location tracking error:", error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
    
    setTrackingWatchId(watchId);
  }, [getAuthHeader, fetchCumulativeDistance]);

  // Start GPS tracking
  const startMileageTracking = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      const startLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
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
      setCumulativeMiles(0);
      setWaypointCount(0);
      
      // Store in localStorage for persistence across sessions
      localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(tripData));
      
      // Start watching position
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: new Date().toISOString()
          };
          setCurrentLocation(newLocation);
          
          // Send waypoint to server
          axios.post(`${API}/admin/mileage/update-location`, {
            location: newLocation
          }, getAuthHeader()).then(() => {
            fetchCumulativeDistance();
          }).catch(console.error);
        },
        (error) => console.error("Location tracking error:", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
      
      setTrackingWatchId(watchId);
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: true, isPaused: false });
      }
      
      toast.success("Trip tracking started! Route will be tracked even if you leave the app.");
      
    } catch (error) {
      console.error("Failed to start tracking:", error);
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
      
      localStorage.removeItem(ACTIVE_TRIP_KEY);
      
      setIsTracking(false);
      setIsPaused(false);
      setActiveTripData(null);
      setCurrentLocation(null);
      setCumulativeMiles(0);
      setWaypointCount(0);
      
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
      
      setIsPaused(true);
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: true, isPaused: true });
      }
      
      toast.success("Trip paused - GPS tracking stopped");
      
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
      
      // Resume GPS tracking
      resumeTracking();
      
      // Notify parent component
      if (onTripStatusChange) {
        onTripStatusChange({ isActive: true, isPaused: false });
      }
      
      toast.success("Trip resumed - GPS tracking restarted");
      
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

  // Get date range based on export period selection
  const getExportDateRange = () => {
    const { period, customStart, customEnd } = exportOptions;
    const now = new Date();
    
    switch (period) {
      case "week": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return {
          start: weekStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          label: "Last 7 Days"
        };
      }
      case "month": {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0],
          label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      }
      case "year": {
        return {
          start: `${now.getFullYear()}-01-01`,
          end: `${now.getFullYear()}-12-31`,
          label: `Year ${now.getFullYear()}`
        };
      }
      case "custom":
      default:
        return {
          start: customStart,
          end: customEnd,
          label: `${customStart} to ${customEnd}`
        };
    }
  };

  // View report - generates and shows preview
  const handleViewReport = async () => {
    setExporting(true);
    try {
      const dateRange = getExportDateRange();
      const { format } = exportOptions;
      const endpoint = format === "csv" ? "csv" : "pdf";
      
      const response = await axios.get(
        `${API}/admin/mileage/export/${endpoint}?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        {
          ...getAuthHeader(),
          responseType: 'blob'
        }
      );
      
      const mimeType = format === "csv" ? "text/csv" : "application/pdf";
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      
      setReportBlobUrl(url);
      setReportPreview({
        format,
        dateRange,
        blob
      });
      
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  // Download the viewed report
  const handleDownloadReport = () => {
    if (!reportPreview || !reportBlobUrl) return;
    
    const { format, dateRange } = reportPreview;
    const link = document.createElement('a');
    link.href = reportBlobUrl;
    link.setAttribute('download', `mileage_report_${dateRange.start}_${dateRange.end}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.success(`${format.toUpperCase()} report downloaded!`);
  };

  // Close report modal and cleanup
  const handleCloseReportModal = () => {
    if (reportBlobUrl) {
      window.URL.revokeObjectURL(reportBlobUrl);
    }
    setReportBlobUrl(null);
    setReportPreview(null);
    setShowExportModal(false);
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

  // Mileage Form Component
  const MileageForm = ({ isEdit = false }) => (
    <div className="space-y-4">
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={mileageFormData.date}
          onChange={(e) => setMileageFormData({ ...mileageFormData, date: e.target.value })}
          data-testid="mileage-date-input"
        />
      </div>
      <div>
        <Label>Start Location</Label>
        <Input
          type="text"
          placeholder="e.g., Home, 123 Main St"
          value={mileageFormData.start_address}
          onChange={(e) => setMileageFormData({ ...mileageFormData, start_address: e.target.value })}
          data-testid="mileage-start-input"
        />
      </div>
      <div>
        <Label>End Location</Label>
        <Input
          type="text"
          placeholder="e.g., Goodwill, Thrift Store"
          value={mileageFormData.end_address}
          onChange={(e) => setMileageFormData({ ...mileageFormData, end_address: e.target.value })}
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
          onChange={(e) => setMileageFormData({ ...mileageFormData, total_miles: e.target.value })}
          data-testid="mileage-miles-input"
        />
      </div>
      <div>
        <Label>Purpose</Label>
        <Select
          value={mileageFormData.purpose}
          onValueChange={(value) => setMileageFormData({ ...mileageFormData, purpose: value })}
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
            onChange={(e) => setMileageFormData({ ...mileageFormData, purpose_other: e.target.value })}
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
          onChange={(e) => setMileageFormData({ ...mileageFormData, notes: e.target.value })}
          data-testid="mileage-notes-input"
        />
      </div>
      <Button
        onClick={isEdit ? handleEditMileageEntry : handleAddMileageEntry}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
        data-testid="save-mileage-btn"
      >
        <Save className="w-4 h-4 mr-2" />
        {isEdit ? "Update Entry" : "Save Entry"}
      </Button>
    </div>
  );

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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Route className={`w-4 h-4 ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`} />
                          <span className="text-sm font-medium text-[#333]">Route Distance:</span>
                        </div>
                        <span className={`text-lg font-bold ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>{cumulativeMiles.toFixed(2)} mi</span>
                      </div>
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
                          : 'Tracking continues in background. Return to this page to end your trip.'}
                      </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportModal(true)}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    data-testid="export-report-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Reports
                  </Button>
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
                        {loadingMileage ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                          </div>
                        ) : mileageEntries.length === 0 ? (
                          <p className="text-center text-[#888] py-4">No trips recorded yet</p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {mileageEntries.map((entry) => (
                              <div 
                                key={entry.id} 
                                className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {getPurposeBadge(entry.purpose, entry.purpose_other)}
                                    <span className="text-xs text-[#888]">{entry.date}</span>
                                    {entry.waypoint_count > 0 && (
                                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                                        <Route className="w-3 h-3" />
                                        {entry.waypoint_count} pts
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
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditMileageModal(entry)}
                                      className="h-8 w-8 p-0 text-blue-600"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteMileageEntry(entry.id)}
                                      className="h-8 w-8 p-0 text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
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
            <MileageForm isEdit={false} />
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
            <MileageForm isEdit={true} />
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
                  Calculated from {waypointCount} GPS waypoints along your route
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

      {/* Reports Modal */}
      {showExportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={handleCloseReportModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`bg-white rounded-2xl shadow-xl my-4 sm:my-8 ${reportPreview ? 'w-full max-w-4xl max-h-[95vh] flex flex-col' : 'w-full max-w-md p-6'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - always visible with prominent close button */}
            <div className={`flex items-center justify-between ${reportPreview ? 'p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10' : 'mb-4'}`}>
              <h3 className="text-lg font-semibold text-[#333]">
                {reportPreview ? 'Mileage Report' : 'Generate Report'}
              </h3>
              <button 
                onClick={handleCloseReportModal}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                data-testid="close-report-modal-btn"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {!reportPreview ? (
              <div className="p-6 pt-0">
              {/* Step 1: Select options */}
              <div className="space-y-4">
                {/* Period Selection */}
                <div>
                  <Label>Date Range</Label>
                  <Select
                    value={exportOptions.period}
                    onValueChange={(value) => setExportOptions({ ...exportOptions, period: value })}
                  >
                    <SelectTrigger data-testid="export-period-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {exportOptions.period === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={exportOptions.customStart}
                        onChange={(e) => setExportOptions({ ...exportOptions, customStart: e.target.value })}
                        data-testid="export-start-date"
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={exportOptions.customEnd}
                        onChange={(e) => setExportOptions({ ...exportOptions, customEnd: e.target.value })}
                        data-testid="export-end-date"
                      />
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-[#666]">
                    Report period: <span className="font-medium text-[#333]">{getExportDateRange().label}</span>
                  </p>
                </div>

                {/* Format Selection */}
                <div>
                  <Label>Report Format</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setExportOptions({ ...exportOptions, format: "pdf" })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        exportOptions.format === "pdf" 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-semibold">PDF</p>
                      <p className="text-xs text-[#888]">For printing</p>
                    </button>
                    <button
                      onClick={() => setExportOptions({ ...exportOptions, format: "csv" })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        exportOptions.format === "csv" 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-semibold">CSV</p>
                      <p className="text-xs text-[#888]">For spreadsheets</p>
                    </button>
                  </div>
                </div>

                {/* View Report Button */}
                <Button
                  onClick={handleViewReport}
                  disabled={exporting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  data-testid="view-report-btn"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      View Report
                    </>
                  )}
                </Button>
              </div>
              </div>
            ) : (
              // Step 2: View report and download
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Report Preview Content */}
                <div className="flex-1 p-4 overflow-auto min-h-0">
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-[50vh] sm:h-[55vh]">
                    {reportPreview.format === "pdf" ? (
                      <iframe
                        src={reportBlobUrl}
                        className="w-full h-full"
                        title="Mileage Report PDF"
                      />
                    ) : (
                      <iframe
                        src={reportBlobUrl}
                        className="w-full h-full bg-white"
                        title="Mileage Report CSV"
                      />
                    )}
                  </div>
                </div>

                {/* Sticky Footer with Download Button - always visible */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3 sticky bottom-0">
                  {/* Report Info */}
                  <div className="bg-emerald-50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        {reportPreview.format.toUpperCase()} Report
                      </p>
                      <p className="text-xs text-emerald-600">{reportPreview.dateRange.label}</p>
                    </div>
                  </div>
                  
                  {/* Download Button - large and prominent */}
                  <Button
                    onClick={handleDownloadReport}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
                    data-testid="download-report-btn"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download {reportPreview.format.toUpperCase()} Report
                  </Button>

                  {/* Back Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (reportBlobUrl) window.URL.revokeObjectURL(reportBlobUrl);
                      setReportBlobUrl(null);
                      setReportPreview(null);
                    }}
                    className="w-full"
                  >
                    ← Back to Options
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
