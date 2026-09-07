/**
 * GPS Mileage Tracker Component
 * Quick Start/End trip tracking with OSRM road routing, IRS deductions,
 * Siri Shortcuts integration, manual entry, and trip history.
 *
 * Unified: Single quick-trip system — no legacy continuous tracking.
 */
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, lazy, Suspense } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  Play,
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
  Pencil,
  Mic,
  MicOff,
  Navigation2,
  Download,
  Copy,
  Key,
  Loader2 as Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";

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

// Trip purposes
const TRIP_PURPOSES = [
  { value: "post_office", label: "Post Office", icon: Building2 },
  { value: "sourcing", label: "Sourcing", icon: ShoppingBag },
  { value: "other", label: "Other", icon: FileText }
];

// IRS rate for display
const IRS_RATE_2026 = 0.725;

const GPSMileageTracker = forwardRef(function GPSMileageTracker({ getAuthHeader, onTripStateChange }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tripHistory, setTripHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryView, setSummaryView] = useState("year");

  // Collapsible state for hierarchical trip view
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  // Mileage adjustment state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ miles: "", reason: "" });
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Manual trip entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTripData, setManualTripData] = useState({
    date: new Date().toISOString().split('T')[0],
    miles: "", purpose: "", notes: "", receipt: null
  });
  const [savingManualTrip, setSavingManualTrip] = useState(false);
  const manualEntryRef = useRef(null);

  // Edit trip state
  const [editingTrip, setEditingTrip] = useState(null);
  const [editTripData, setEditTripData] = useState({
    date: "", miles: "", purpose: "", notes: "",
    start_address: "", end_address: "", classification: "business"
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Map viewing state
  const [viewingTripMap, setViewingTripMap] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);

  const containerRef = useRef(null);

  // ========== Quick Trip (Start/End with GPS + voice) ==========
  const [quickTripActive, setQuickTripActive] = useState(false);
  const [quickTripId, setQuickTripId] = useState(null);
  const [quickTripStartAddr, setQuickTripStartAddr] = useState("");
  const [quickTripLoading, setQuickTripLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [lastTripResult, setLastTripResult] = useState(null);

  // Siri API Key state
  const [siriKey, setSiriKey] = useState({ has_key: false, key_prefix: null, newKey: null, loading: false });

  // Notify parent of trip state changes
  useEffect(() => {
    if (onTripStateChange) onTripStateChange(quickTripActive);
  }, [quickTripActive, onTripStateChange]);

  // Voice commands for trip control
  const voiceHandler = useSpeechRecognition({
    onResult: (transcript) => {
      const lower = transcript.toLowerCase().trim();
      if (lower.includes("start trip") || lower.includes("start drive") || lower.includes("begin trip")) {
        handleQuickStart();
      } else if (lower.includes("end trip") || lower.includes("stop trip") || lower.includes("end drive") || lower.includes("stop drive")) {
        handleQuickEnd();
      } else {
        toast.info(`Heard: "${transcript}" -- say "start trip" or "end trip"`);
      }
    },
  });

  const getGPSPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

  const handleQuickStart = async () => {
    if (quickTripActive) return toast.info("Trip already in progress");
    setQuickTripLoading(true);
    setLastTripResult(null);
    try {
      const pos = await getGPSPosition();
      const { data } = await axios.post(`${API}/admin/gps-trips/log-drive`, {
        latitude: pos.latitude,
        longitude: pos.longitude,
        event: "start",
      }, getAuthHeader());
      if (data.success) {
        setQuickTripActive(true);
        setQuickTripId(data.trip_id);
        setQuickTripStartAddr(data.start_address || "");
        toast.success(data.message);
      } else {
        toast.error(data.message || "Failed to start trip");
      }
    } catch (err) {
      const msg = err?.message?.includes("denied") ? "Location permission denied. Please allow GPS access." : "Failed to get location";
      toast.error(msg);
    } finally {
      setQuickTripLoading(false);
    }
  };

  const handleQuickEnd = async () => {
    if (!quickTripActive) return toast.info("No trip in progress");
    setQuickTripLoading(true);
    try {
      const pos = await getGPSPosition();
      const { data } = await axios.post(`${API}/admin/gps-trips/log-drive`, {
        latitude: pos.latitude,
        longitude: pos.longitude,
        event: "end",
      }, getAuthHeader());
      if (data.success) {
        setQuickTripActive(false);
        setQuickTripId(null);
        setQuickTripStartAddr("");
        setLastTripResult({
          start_address: data.start_address || "",
          end_address: data.end_address || "",
          total_miles: data.total_miles,
          tax_deduction: data.tax_deduction,
        });
        toast.success(data.message);
        fetchTripHistory();
        fetchSummary();
        // Auto-clear result after 20 seconds
        setTimeout(() => setLastTripResult(null), 20000);
      } else {
        toast.error(data.message || "Failed to end trip");
      }
    } catch (err) {
      toast.error("Failed to get location");
    } finally {
      setQuickTripLoading(false);
    }
  };

  // ========== Siri API Key ==========
  const fetchSiriKeyStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/gps-trips/siri-key`, getAuthHeader());
      setSiriKey(prev => ({ ...prev, has_key: data.has_key, key_prefix: data.key_prefix || null }));
    } catch {}
  }, [getAuthHeader]);

  const handleGenerateSiriKey = async () => {
    setSiriKey(prev => ({ ...prev, loading: true }));
    try {
      const { data } = await axios.post(`${API}/admin/gps-trips/siri-key`, {}, getAuthHeader());
      if (data.success) {
        setSiriKey({ has_key: true, key_prefix: data.key_prefix, newKey: data.api_key, loading: false });
        toast.success("Siri API key generated! Copy it now.");
      }
    } catch {
      toast.error("Failed to generate key");
      setSiriKey(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeSiriKey = async () => {
    if (!window.confirm("Revoke this key? Your Siri Shortcuts will stop working until you set up a new one.")) return;
    try {
      await axios.delete(`${API}/admin/gps-trips/siri-key`, getAuthHeader());
      setSiriKey({ has_key: false, key_prefix: null, newKey: null, loading: false });
      toast.success("Key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  };

  const handleCopySiriKey = () => {
    if (siriKey.newKey) {
      navigator.clipboard.writeText(siriKey.newKey);
      toast.success("Key copied to clipboard");
    }
  };

  // ========== Data Fetching ==========
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/gps-trips/categories`, getAuthHeader());
      setCategories(data.categories || []);
    } catch {}
  }, [getAuthHeader]);

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

  const fetchSummary = useCallback(async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const response = await axios.get(`${API}/admin/gps-trips/summary?tz_offset=${tzOffset}`, getAuthHeader());
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  }, [getAuthHeader]);

  // ========== Trip Actions ==========
  const handleExportCSV = async () => {
    try {
      const resp = await axios.get(`${API}/admin/gps-trips/export-csv`, { ...getAuthHeader(), responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mileage_log_${new Date().getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleClassifyTrip = async (tripId, classification) => {
    try {
      await axios.put(`${API}/admin/gps-trips/${tripId}/classify?classification=${classification}`, {}, getAuthHeader());
      fetchTripHistory();
      toast.success(`Trip marked as ${classification}`);
    } catch {
      toast.error("Failed to update");
    }
  };

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

  const handleSaveManualTrip = async (formData = null) => {
    const data = formData || manualTripData;
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
        { date: data.date, total_miles: milesValue, purpose: data.purpose, notes: data.purpose === "other" ? data.notes : null },
        getAuthHeader()
      );
      if (response.data.success) {
        if (data.receipt && response.data.trip_id) {
          try {
            const receiptFormData = new FormData();
            receiptFormData.append("receipt", data.receipt);
            await axios.post(
              `${API}/admin/gps-trips/upload-receipt/${response.data.trip_id}`,
              receiptFormData,
              { ...getAuthHeader(), headers: { ...getAuthHeader().headers, "Content-Type": "multipart/form-data" } }
            );
          } catch (uploadError) {
            console.log("Receipt upload failed:", uploadError);
          }
        }
        toast.success(`Trip logged! ${response.data.total_miles} miles.`, { description: `Tax deduction: $${response.data.tax_deduction}` });
        setManualTripData({ date: new Date().toISOString().split('T')[0], miles: "", purpose: "", notes: "", receipt: null });
        setShowManualEntry(false);
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

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setEditTripData({
      date: trip.start_time ? trip.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
      miles: trip.total_miles?.toString() || "",
      purpose: trip.purpose || "",
      notes: trip.notes || "",
      start_address: trip.start_address || "",
      end_address: trip.end_address || "",
      classification: trip.classification || "business",
    });
  };

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
          notes: editTripData.notes || null,
          start_address: editTripData.start_address || null,
          end_address: editTripData.end_address || null,
          classification: editTripData.classification || "business",
        },
        getAuthHeader()
      );
      if (response.data.success) {
        toast.success("Trip updated successfully");
        setEditingTrip(null);
        setEditTripData({ date: "", miles: "", purpose: "", notes: "", start_address: "", end_address: "", classification: "business" });
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

  const handleCancelEdit = () => {
    setEditingTrip(null);
    setEditTripData({ date: "", miles: "", purpose: "", notes: "", start_address: "", end_address: "", classification: "business" });
  };

  const handleSaveAdjustment = async () => {
    const miles = parseFloat(adjustmentData.miles);
    if (isNaN(miles) || miles === 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }
    setSavingAdjustment(true);
    try {
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
        { period: summaryView === "today" ? "day" : summaryView, date: adjustDate, adjustment_miles: miles, reason: adjustmentData.reason || null },
        getAuthHeader()
      );
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAdjustModal(false);
        setAdjustmentData({ miles: "", reason: "" });
        await fetchSummary();
      }
    } catch (error) {
      console.error("Failed to adjust mileage:", error);
      toast.error(error.response?.data?.detail || "Failed to adjust mileage");
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleViewTripMap = async (tripId) => {
    setLoadingMap(true);
    try {
      const response = await axios.get(`${API}/admin/gps-trips/trip/${tripId}?include_locations=true`, getAuthHeader());
      if (response.data.trip) {
        setViewingTripMap({ trip: response.data.trip, locations: response.data.trip.locations || [] });
      }
    } catch (error) {
      console.error("Failed to load trip map:", error);
      toast.error("Failed to load trip map");
    } finally {
      setLoadingMap(false);
    }
  };

  const closeTripMap = () => setViewingTripMap(null);

  // ========== Effects ==========

  // Check for pending active trip on mount
  useEffect(() => {
    const checkPending = async () => {
      try {
        const { data } = await axios.get(`${API}/admin/gps-trips/active`, getAuthHeader());
        if (data && data.active_trip && data.active_trip.status === "active") {
          setQuickTripActive(true);
          setQuickTripId(data.active_trip.id);
          setQuickTripStartAddr(data.active_trip.start_address || "");
        }
      } catch {}
    };
    checkPending();
    fetchCategories();
    fetchSiriKeyStatus();
  }, [getAuthHeader, fetchCategories, fetchSiriKeyStatus]);

  // Load data when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchTripHistory();
      fetchSummary();
    }
  }, [isExpanded, fetchTripHistory, fetchSummary]);

  // Scroll to manual entry form when it opens
  useEffect(() => {
    if (showManualEntry && manualEntryRef.current) {
      setTimeout(() => {
        manualEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showManualEntry]);

  // Expose methods via ref for external control (e.g., iOS Quick Actions)
  useImperativeHandle(ref, () => ({
    scrollIntoView: (options) => {
      if (containerRef.current) containerRef.current.scrollIntoView(options);
    },
    openManualEntry: () => {
      setIsExpanded(true);
      setShowManualEntry(true);
    },
    isManualEntryOpen: () => showManualEntry,
    startTrip: () => handleQuickStart(),
    endTrip: () => handleQuickEnd(),
  }));

  // ========== Helpers ==========
  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getPurposeLabel = (purpose) => {
    const found = TRIP_PURPOSES.find(p => p.value === purpose);
    return found ? found.label : purpose;
  };

  const getPurposeIcon = (purpose) => {
    const found = TRIP_PURPOSES.find(p => p.value === purpose);
    return found ? found.icon : FileText;
  };

  // ========== Render ==========
  return (
    <div ref={containerRef} className="dashboard-card" data-testid="gps-mileage-tracker">
      {/* Header - Always Visible */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center ${quickTripActive ? "animate-pulse" : ""}`}>
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#333]">GPS Mileage Tracker</h3>
            <p className="text-xs text-[#888]">
              {quickTripActive ? (
                <span className="font-medium text-green-600">
                  Trip in progress {quickTripStartAddr ? `\u2022 ${quickTripStartAddr}` : ""}
                </span>
              ) : summary ? (
                <span>
                  Today: {summary.today?.miles?.toFixed(1) || 0} mi {"\u2022 "}
                  {summary.this_month?.name}: {summary.this_month?.miles?.toFixed(1) || 0} mi {"\u2022 "}
                  YTD: {summary.total_miles?.toFixed(1) || 0} mi
                </span>
              ) : (
                "Track business mileage for IRS deductions"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Start/End button in header (the green button) */}
          <Button
            variant="ghost"
            size="sm"
            className={quickTripActive ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
            onClick={(e) => {
              e.stopPropagation();
              if (quickTripActive) handleQuickEnd();
              else handleQuickStart();
            }}
            disabled={quickTripLoading}
            data-testid="header-trip-btn"
          >
            {quickTripLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : quickTripActive ? (
              <><Square className="w-4 h-4 mr-1" /> End</>
            ) : (
              <><Play className="w-4 h-4 mr-1" /> Start</>
            )}
          </Button>
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
              {/* Quick Trip - Start / End with GPS */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200" data-testid="quick-trip-section">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Navigation2 className={`w-5 h-5 ${quickTripActive ? "text-green-600 animate-pulse" : "text-emerald-600"}`} />
                    <h4 className="font-semibold text-emerald-900 text-sm">Quick Trip</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {voiceHandler.isSupported && (
                      <button
                        onClick={voiceHandler.toggle}
                        className={`p-2 rounded-lg transition-all ${voiceHandler.isListening ? "bg-red-100 text-red-500 animate-pulse" : "bg-white/60 text-emerald-600 hover:bg-white"}`}
                        title={voiceHandler.isListening ? 'Listening... say "start trip" or "end trip"' : "Voice command"}
                        data-testid="trip-voice-btn"
                      >
                        {voiceHandler.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={handleExportCSV}
                      className="p-2 rounded-lg bg-white/60 text-emerald-600 hover:bg-white transition-all"
                      title="Export IRS CSV"
                      data-testid="export-csv-btn"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {voiceHandler.isListening && (
                  <p className="text-xs text-red-500 mb-2 text-center animate-pulse">
                    Listening... say "start trip" or "end trip"
                  </p>
                )}

                {quickTripActive ? (
                  <div className="space-y-3">
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 font-medium">Trip in progress</p>
                      <p className="text-sm text-emerald-900 mt-1">{quickTripStartAddr || "Getting address..."}</p>
                    </div>
                    <button
                      onClick={handleQuickEnd}
                      disabled={quickTripLoading}
                      className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="end-trip-btn"
                    >
                      {quickTripLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                      End Trip
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleQuickStart}
                    disabled={quickTripLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="start-trip-btn"
                  >
                    {quickTripLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Start Trip
                  </button>
                )}

                {/* Last Trip Result Feedback */}
                {lastTripResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 bg-white/80 rounded-lg p-3 border border-emerald-200"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-emerald-700">Trip Completed</p>
                      <button onClick={() => setLastTripResult(null)} className="text-gray-400 hover:text-gray-600" data-testid="dismiss-trip-result">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      {lastTripResult.start_address} {"\u2192"} {lastTripResult.end_address}
                    </p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-sm font-bold text-emerald-700">{lastTripResult.total_miles} mi</span>
                      <span className="text-sm font-bold text-emerald-700">${lastTripResult.tax_deduction} deduction</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Siri Shortcuts Setup */}
              <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 select-none" data-testid="siri-shortcuts-guide">
                  <Mic className="w-4 h-4 text-purple-500" />
                  Hands-free: Set up Siri Shortcuts
                  <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 text-sm text-gray-600 space-y-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Track trips with "Hey Siri, start trip" - even when the app is closed.</p>

                  {/* Step 1: API Key */}
                  <div className="space-y-2">
                    <p className="font-medium text-gray-800 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-purple-500" />
                      Step 1: Get your Siri API Key
                    </p>
                    {siriKey.newKey ? (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-600 font-medium">Copy this key now - it won't be shown again:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-gray-100 px-2 py-1.5 rounded font-mono break-all select-all" data-testid="siri-key-value">
                            {siriKey.newKey}
                          </code>
                          <button
                            onClick={handleCopySiriKey}
                            className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all flex-shrink-0"
                            data-testid="copy-siri-key-btn"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : siriKey.has_key ? (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <div className="text-xs text-gray-600">
                          <span className="font-mono">{siriKey.key_prefix}{"*".repeat(20)}</span>
                        </div>
                        <button
                          onClick={handleRevokeSiriKey}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded"
                          data-testid="revoke-siri-key-btn"
                        >
                          Revoke & Regenerate
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateSiriKey}
                        disabled={siriKey.loading}
                        className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        data-testid="generate-siri-key-btn"
                      >
                        {siriKey.loading ? <Loader className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                        Generate Siri API Key
                      </button>
                    )}
                  </div>

                  {/* Step 2: Create Shortcuts */}
                  <div className="space-y-2">
                    <p className="font-medium text-gray-800">Step 2: Create iPhone Shortcuts</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs">
                      <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
                      <li>Tap <strong>+</strong> to create a new shortcut</li>
                      <li>Add action: <strong>Get Current Location</strong></li>
                      <li>Add action: <strong>Get Contents of URL</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 text-gray-500 space-y-0.5">
                          <li>URL: <code className="bg-gray-100 px-1 rounded text-xs break-all">{window.location.origin}/api/admin/gps-trips/log-drive</code></li>
                          <li>Method: <strong>POST</strong></li>
                          <li>Headers: <code className="bg-gray-100 px-1 rounded">Authorization</code> = <code className="bg-gray-100 px-1 rounded">Bearer [paste your Siri API Key]</code></li>
                          <li>Body (JSON): <code className="bg-gray-100 px-1 rounded">latitude</code>, <code className="bg-gray-100 px-1 rounded">longitude</code> (from step 3), <code className="bg-gray-100 px-1 rounded">event</code> = <strong>"start"</strong></li>
                        </ul>
                      </li>
                      <li>Name it <strong>"Start Trip"</strong></li>
                      <li>Duplicate and change event to <strong>"end"</strong>, name it <strong>"End Trip"</strong></li>
                    </ol>
                  </div>

                  {/* Step 3: Optional Bluetooth auto */}
                  <div className="space-y-2">
                    <p className="font-medium text-gray-800">Step 3 (optional): Auto-trigger on car Bluetooth</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to Shortcuts {"\u2192"} <strong>Automation</strong> tab</li>
                      <li>Tap <strong>+</strong> {"\u2192"} <strong>Bluetooth</strong></li>
                      <li>Select your car's Bluetooth {"\u2192"} <strong>When I Connect</strong></li>
                      <li>Run the "Start Trip" shortcut</li>
                      <li>Repeat for <strong>When I Disconnect</strong> {"\u2192"} "End Trip"</li>
                    </ol>
                  </div>

                  <p className="text-xs text-gray-400">Tip: Say "Hey Siri, start trip" from your lock screen, CarPlay, or AirPods.</p>
                </div>
              </details>

              {/* Manual Entry Button - only show when no active quick trip */}
              {!quickTripActive && !showManualEntry && (
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
                </div>
              )}

              {/* Manual Trip Entry Form */}
              {showManualEntry && (
                <div ref={manualEntryRef} className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-800 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Manual Trip Entry
                    </h4>
                    <button
                      onClick={() => {
                        setShowManualEntry(false);
                        setManualTripData({ date: new Date().toISOString().split('T')[0], miles: "", purpose: "", notes: "", receipt: null });
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
                      onChange={(e) => setManualTripData(prev => ({ ...prev, receipt: e.target.files?.[0] || null }))}
                      className="mt-1"
                      data-testid="manual-trip-receipt"
                    />
                    {manualTripData.receipt && (
                      <p className="text-xs text-gray-500 mt-1">{manualTripData.receipt.name}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setShowManualEntry(false);
                        setManualTripData({ date: new Date().toISOString().split('T')[0], miles: "", purpose: "", notes: "", receipt: null });
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
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Saving...</>
                      ) : (
                        <><Check className="w-4 h-4 mr-2" />Save Trip</>
                      )}
                    </Button>
                  </div>
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
                                setAdjustmentData(prev => ({ ...prev, miles: isNeg ? `-${val}` : val }));
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

              {/* Hierarchical Trip History */}
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
                    {/* TODAY VIEW */}
                    {summaryView === "today" && (() => {
                      const now = new Date();
                      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      const todayTrips = tripHistory.filter(trip => {
                        if (!trip.start_time) return false;
                        const tripDate = new Date(trip.start_time);
                        const tripDateStr = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
                        return tripDateStr === today;
                      });
                      if (todayTrips.length === 0) {
                        return <div className="p-4 text-center text-gray-500 text-sm">No trips recorded today</div>;
                      }
                      return todayTrips.map(trip => (
                        <TripRow key={trip.id} trip={trip} onViewMap={handleViewTripMap} onEdit={handleEditTrip} onDelete={handleDeleteTrip} onClassify={handleClassifyTrip} getPurposeIcon={getPurposeIcon} getPurposeLabel={getPurposeLabel} formatDate={formatDate} API={API} />
                      ));
                    })()}

                    {/* MONTH VIEW */}
                    {summaryView === "month" && (() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth();
                      const tripsByDay = {};
                      tripHistory.forEach(trip => {
                        if (!trip.start_time) return;
                        const tripDate = new Date(trip.start_time);
                        if (tripDate.getFullYear() === currentYear && tripDate.getMonth() === currentMonth) {
                          const dateKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
                          if (!tripsByDay[dateKey]) tripsByDay[dateKey] = { trips: [], miles: 0 };
                          tripsByDay[dateKey].trips.push(trip);
                          tripsByDay[dateKey].miles += trip.total_miles || 0;
                        }
                      });
                      const sortedDays = Object.keys(tripsByDay).sort().reverse();
                      if (sortedDays.length === 0) {
                        return <div className="p-4 text-center text-gray-500 text-sm">No trips this month</div>;
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
                                {tripsByDay[day].trips.length} trip{tripsByDay[day].trips.length !== 1 ? 's' : ''} {"\u2022"} {tripsByDay[day].miles.toFixed(1)} mi
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
                                  <TripRow key={trip.id} trip={trip} onViewMap={handleViewTripMap} onEdit={handleEditTrip} onDelete={handleDeleteTrip} onClassify={handleClassifyTrip} getPurposeIcon={getPurposeIcon} getPurposeLabel={getPurposeLabel} formatDate={formatDate} API={API} compact />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ));
                    })()}

                    {/* YEAR VIEW */}
                    {summaryView === "year" && (() => {
                      const currentYear = summary?.year || new Date().getFullYear();
                      const tripsByMonth = {};
                      tripHistory.forEach(trip => {
                        if (!trip.start_time) return;
                        const tripDate = new Date(trip.start_time);
                        if (tripDate.getFullYear() === currentYear) {
                          const monthKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
                          const dayKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}-${String(tripDate.getDate()).padStart(2, '0')}`;
                          if (!tripsByMonth[monthKey]) tripsByMonth[monthKey] = { trips: [], miles: 0, byDay: {} };
                          tripsByMonth[monthKey].trips.push(trip);
                          tripsByMonth[monthKey].miles += trip.total_miles || 0;
                          if (!tripsByMonth[monthKey].byDay[dayKey]) tripsByMonth[monthKey].byDay[dayKey] = { trips: [], miles: 0 };
                          tripsByMonth[monthKey].byDay[dayKey].trips.push(trip);
                          tripsByMonth[monthKey].byDay[dayKey].miles += trip.total_miles || 0;
                        }
                      });
                      const sortedMonths = Object.keys(tripsByMonth).sort().reverse();
                      if (sortedMonths.length === 0) {
                        return <div className="p-4 text-center text-gray-500 text-sm">No trips this year</div>;
                      }
                      return sortedMonths.map(month => {
                        const monthName = new Date(month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        const sortedDays = Object.keys(tripsByMonth[month].byDay).sort().reverse();
                        return (
                          <div key={month} className="border-b border-gray-100 last:border-b-0">
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
                                  {tripsByMonth[month].trips.length} trip{tripsByMonth[month].trips.length !== 1 ? 's' : ''} {"\u2022"} {tripsByMonth[month].miles.toFixed(1)} mi
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedMonths[month] ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
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
                                            {tripsByMonth[month].byDay[day].trips.length} {"\u2022"} {tripsByMonth[month].byDay[day].miles.toFixed(1)} mi
                                          </span>
                                          <ChevronDown className={`w-3 h-3 text-gray-300 transition-transform ${expandedDays[day] ? 'rotate-180' : ''}`} />
                                        </div>
                                      </button>
                                      <AnimatePresence>
                                        {expandedDays[day] && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-white"
                                          >
                                            {tripsByMonth[month].byDay[day].trips.map(trip => (
                                              <TripRow key={trip.id} trip={trip} onViewMap={handleViewTripMap} onEdit={handleEditTrip} onDelete={handleDeleteTrip} onClassify={handleClassifyTrip} getPurposeIcon={getPurposeIcon} getPurposeLabel={getPurposeLabel} formatDate={formatDate} API={API} compact nested />
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

      {/* Edit Trip Modal - Using Portal */}
      {editingTrip && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '16px', paddingTop: '40px',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch'
          }}
          onClick={handleCancelEdit}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            style={{
              backgroundColor: 'white', borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '440px', width: '100%',
              maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Edit Trip
              </h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Date */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Trip Date</Label>
                <Input type="date" value={editTripData.date} onChange={(e) => setEditTripData(prev => ({ ...prev, date: e.target.value }))} max={new Date().toISOString().split('T')[0]} className="mt-1" data-testid="edit-trip-date" />
              </div>

              {/* Start Address */}
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-green-500" /> Start Address
                </Label>
                <Input value={editTripData.start_address || ""} onChange={(e) => setEditTripData(prev => ({ ...prev, start_address: e.target.value }))} placeholder="e.g. 123 Main St, City, State" className="mt-1" data-testid="edit-trip-start-address" />
              </div>

              {/* End Address */}
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> End Address
                </Label>
                <Input value={editTripData.end_address || ""} onChange={(e) => setEditTripData(prev => ({ ...prev, end_address: e.target.value }))} placeholder="e.g. 456 Oak Ave, City, State" className="mt-1" data-testid="edit-trip-end-address" />
              </div>

              {/* Miles */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Miles Driven</Label>
                <div className="relative mt-1">
                  <Input type="number" step="0.1" min="0.1" max="1000" value={editTripData.miles} onChange={(e) => setEditTripData(prev => ({ ...prev, miles: e.target.value }))} className="pr-16" data-testid="edit-trip-miles" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">miles</span>
                </div>
                {editTripData.miles && parseFloat(editTripData.miles) > 0 && (
                  <p className={`text-xs mt-1 ${(editTripData.classification || "business") === "business" ? "text-green-600" : "text-gray-400"}`}>
                    Tax Deduction: ${((editTripData.classification || "business") === "business" ? (parseFloat(editTripData.miles) * IRS_RATE_2026).toFixed(2) : "0.00")}
                  </p>
                )}
              </div>

              {/* Classification */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Classification</Label>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setEditTripData(prev => ({ ...prev, classification: "business" }))} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${(editTripData.classification || "business") === "business" ? "bg-green-100 text-green-700 border-2 border-green-300" : "bg-gray-50 text-gray-500 border border-gray-200"}`} data-testid="edit-trip-business-btn">
                    Business
                  </button>
                  <button type="button" onClick={() => setEditTripData(prev => ({ ...prev, classification: "personal" }))} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${(editTripData.classification || "business") !== "business" ? "bg-gray-200 text-gray-700 border-2 border-gray-400" : "bg-gray-50 text-gray-500 border border-gray-200"}`} data-testid="edit-trip-personal-btn">
                    Personal
                  </button>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Trip Purpose</Label>
                <Select value={editTripData.purpose} onValueChange={(value) => setEditTripData(prev => ({ ...prev, purpose: value }))}>
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

              {/* Notes */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Notes</Label>
                <Textarea value={editTripData.notes || ""} onChange={(e) => setEditTripData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional trip notes..." className="mt-1" rows={2} data-testid="edit-trip-notes" />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCancelEdit} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={handleSaveEditTrip} disabled={savingEdit || !editTripData.miles || !editTripData.purpose} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-edit-trip-btn">
                  {savingEdit ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Saving...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" />Save Changes</>
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
                  <Button variant="ghost" size="sm" onClick={closeTripMap} className="text-gray-500">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
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
