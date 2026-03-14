import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Clock, 
  LogOut, 
  PlayCircle, 
  StopCircle,
  Calendar,
  DollarSign,
  User,
  Home,
  Briefcase,
  FileText,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  Send,
  MessageSquare,
  X,
  Clock3,
  MapPin,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { formatHoursToHMS, roundHoursToMinute } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Work location coordinates (Omaha, NE area)
const WORK_LOCATION = {
  lat: 41.13056,
  lng: -95.99029,
  radiusMiles: 0.5
};

// Calculate distance between two coordinates in miles using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ 
    total_hours: 0, 
    week_hours: 0, 
    total_shifts: 0,
    period_hours: 0,
    period_shifts: 0,
    hourly_rate: 15.00,
    estimated_pay: 0,
    period_start: null,
    period_end: null
  });
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [locationStatus, setLocationStatus] = useState({ checking: false, withinRange: null, distance: null, denied: false });
  
  // W-9 state
  const [w9Status, setW9Status] = useState(null);
  const [uploadingW9, setUploadingW9] = useState(false);
  const [viewingW9, setViewingW9] = useState(null);
  const [showW9SubmitForm, setShowW9SubmitForm] = useState(false);
  const [w9FormData, setW9FormData] = useState({ file: null, notes: '' });
  const w9InputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchData();
    
    // Refresh data periodically to keep pay summary up to date (every 60 seconds)
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (clockedIn && currentEntry) {
      interval = setInterval(() => {
        const clockInTime = new Date(currentEntry.clock_in);
        const now = new Date();
        const elapsed = Math.floor((now - clockInTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockedIn, currentEntry]);

  // Location monitoring effect - checks location every 30 seconds while clocked in
  useEffect(() => {
    let locationInterval;
    
    const verifyLocationAndAutoClockOut = async () => {
      // Skip if not clocked in or user is admin
      if (!clockedIn || user?.role === 'admin') return;
      
      // Check if geolocation is available
      if (!navigator.geolocation) return;
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            WORK_LOCATION.lat,
            WORK_LOCATION.lng
          );
          const withinRange = distance <= WORK_LOCATION.radiusMiles;
          
          if (withinRange) {
            // User is in range - update the last verified timestamp
            try {
              await axios.post(`${API}/time/verify-location`, {}, getAuthHeader());
              console.log("Location verified - in range");
            } catch (error) {
              console.error("Failed to verify location:", error);
            }
          } else {
            // User left the work area - auto clock out
            console.log("User left work area - auto clocking out");
            try {
              const response = await axios.post(`${API}/time/auto-clock-out`, {}, getAuthHeader());
              toast.warning("You left the work area. Clocked out automatically.", { duration: 5000 });
              fetchData();
            } catch (error) {
              console.error("Auto clock out failed:", error);
            }
          }
        },
        (error) => {
          // If we can't get location, just skip this check
          console.log("Location check failed:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };
    
    if (clockedIn && user?.role !== 'admin') {
      // Check immediately on mount/clock-in
      verifyLocationAndAutoClockOut();
      
      // Then check every 30 seconds
      locationInterval = setInterval(verifyLocationAndAutoClockOut, 30000);
    }
    
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [clockedIn, user]);

  // Check location on page load/focus - auto clock out if outside work area
  useEffect(() => {
    const checkLocationOnLoad = () => {
      // Skip if not clocked in or user is admin
      if (!clockedIn || user?.role === 'admin') return;
      
      if (!navigator.geolocation) return;
      
      // Try to get location - if it fails (denied), just skip auto clock out
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            WORK_LOCATION.lat,
            WORK_LOCATION.lng
          );
          const withinRange = distance <= WORK_LOCATION.radiusMiles;
          
          if (!withinRange) {
            // User opened app while outside work area - auto clock out with adjusted time
            console.log("User opened app outside work area - auto clocking out with adjusted time");
            try {
              const response = await axios.post(`${API}/time/auto-clock-out`, {}, getAuthHeader());
              const usedLastVerified = response.data.used_last_verified;
              if (usedLastVerified) {
                toast.warning("You were clocked out at your last verified location time.", { duration: 6000 });
              } else {
                toast.warning("You left the work area. Clocked out automatically.", { duration: 5000 });
              }
              fetchData();
            } catch (error) {
              console.error("Auto clock out failed:", error);
            }
          }
        },
        (error) => {
          // If GPS is denied or unavailable, just skip auto clock out
          console.log("Initial location check failed:", error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };
    
    // Small delay to let the page settle
    const timeout = setTimeout(checkLocationOnLoad, 1000);
    
    return () => clearTimeout(timeout);
  }, [clockedIn, user]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  const fetchData = async () => {
    try {
      const [statusRes, entriesRes, summaryRes, w9Res] = await Promise.all([
        axios.get(`${API}/time/status`, getAuthHeader()),
        axios.get(`${API}/time/entries`, getAuthHeader()),
        axios.get(`${API}/time/summary`, getAuthHeader()),
        axios.get(`${API}/time/w9/status`, getAuthHeader())
      ]);

      setClockedIn(statusRes.data.clocked_in);
      setCurrentEntry(statusRes.data.entry);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
      setW9Status(w9Res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  const handleW9Submit = async () => {
    if (!w9FormData.file) {
      toast.error("Please select a W-9 file to submit");
      return;
    }
    
    setUploadingW9(true);
    const formData = new FormData();
    formData.append('file', w9FormData.file);
    if (w9FormData.notes) {
      formData.append('notes', w9FormData.notes);
    }
    
    try {
      await axios.post(`${API}/time/w9/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("W-9 submitted for review!");
      setW9FormData({ file: null, notes: '' });
      setShowW9SubmitForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit W-9");
    } finally {
      setUploadingW9(false);
    }
  };

  const handleW9Delete = async () => {
    if (!window.confirm("Are you sure you want to delete your W-9?")) return;
    
    try {
      await axios.delete(`${API}/time/w9`, getAuthHeader());
      toast.success("W-9 deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Cannot delete W-9");
    }
  };

  const handleDownloadBlankW9 = () => {
    // Use link click for better mobile compatibility
    const link = document.createElement('a');
    link.href = "https://www.irs.gov/pub/irs-pdf/fw9.pdf";
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewMyW9 = async () => {
    try {
      const response = await axios.get(`${API}/time/w9/download`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error("Failed to view W-9");
    }
  };

  // Check if user is within range of work location
  const checkLocation = () => {
    return new Promise((resolve) => {
      // If user is admin, bypass location check
      if (user?.role === 'admin') {
        resolve({ withinRange: true, distance: 0 });
        return;
      }

      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        resolve({ withinRange: false, error: "Geolocation not supported" });
        return;
      }

      setLocationStatus({ checking: true, withinRange: null, distance: null, denied: false });

      // Safety timeout - if location check takes more than 15 seconds, reset state
      const safetyTimeout = setTimeout(() => {
        console.log("checkLocation safety timeout triggered");
        setLocationStatus({ checking: false, withinRange: null, distance: null, denied: false });
        resolve({ withinRange: false, error: "timeout" });
      }, 15000);

      // Request location directly - this will prompt the user if not already granted
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(safetyTimeout);
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            WORK_LOCATION.lat,
            WORK_LOCATION.lng
          );
          const withinRange = distance <= WORK_LOCATION.radiusMiles;
          setLocationStatus({ checking: false, withinRange, distance: distance.toFixed(2), denied: false });
          resolve({ withinRange, distance: distance.toFixed(2) });
        },
        (error) => {
          clearTimeout(safetyTimeout);
          if (error.code === 1) {
            // PERMISSION_DENIED
            setLocationStatus({ checking: false, withinRange: false, distance: null, denied: true });
            resolve({ withinRange: false, denied: true });
          } else if (error.code === 2) {
            // POSITION_UNAVAILABLE
            toast.error("GPS is turned off. Please enable Location Services in your device settings.");
            setLocationStatus({ checking: false, withinRange: false, distance: null, denied: false });
            resolve({ withinRange: false, error: "GPS unavailable" });
          } else {
            // TIMEOUT or other error
            toast.error("Location request timed out. Please try again.");
            setLocationStatus({ checking: false, withinRange: false, error: "timeout", denied: false });
            resolve({ withinRange: false, error: "timeout" });
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleClock = async (action) => {
    // Reset denied state to allow re-requesting location
    if (locationStatus.denied) {
      setLocationStatus({ checking: false, withinRange: null, distance: null, denied: false });
    }
    
    setLoading(true);
    
    // Only check location for clock IN - allow clock out from anywhere
    // Admins bypass location check entirely
    if (action === "in" && user?.role !== 'admin') {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        setLoading(false);
        return;
      }
      
      setLocationStatus({ checking: true, withinRange: null, distance: null, denied: false });
      
      // Safety timeout - if location check takes more than 15 seconds, reset state
      const safetyTimeout = setTimeout(() => {
        console.log("Location check safety timeout triggered");
        setLocationStatus({ checking: false, withinRange: null, distance: null, denied: false });
        setLoading(false);
        toast.error("Location check timed out. Please try again or check your location settings.");
      }, 15000);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(safetyTimeout);
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            WORK_LOCATION.lat,
            WORK_LOCATION.lng
          );
          const withinRange = distance <= WORK_LOCATION.radiusMiles;
          setLocationStatus({ checking: false, withinRange, distance: distance.toFixed(2), denied: false });
          
          if (!withinRange) {
            toast.error("You are too far from the work location");
            setLoading(false);
            return;
          }
          
          // Location verified - proceed with clock in
          try {
            await axios.post(`${API}/time/clock`, { action: "in" }, getAuthHeader());
            toast.success("Clocked in!");
            fetchData();
            setElapsedTime(0);
          } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to clock in");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          clearTimeout(safetyTimeout);
          setLoading(false);
          if (error.code === 1) {
            // Check if running as standalone PWA
            const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
            if (isStandalone) {
              toast.error("Please enable location for this app in Settings → Privacy → Location Services", { duration: 5000 });
            }
            setLocationStatus({ checking: false, withinRange: false, distance: null, denied: true });
          } else if (error.code === 2) {
            toast.error("GPS is turned off. Please enable Location Services in your device settings.");
            setLocationStatus({ checking: false, withinRange: false, distance: null, denied: false });
          } else {
            toast.error("Location request timed out. Please try again.");
            setLocationStatus({ checking: false, withinRange: false, error: "timeout", denied: false });
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
      return; // Exit here - the callback will handle the rest
    }
    
    // For clock out, admin clock in, or admin clock out - no location check needed
    try {
      await axios.post(`${API}/time/clock`, { action }, getAuthHeader());
      toast.success(action === "in" ? "Clocked in!" : "Clocked out!");
      fetchData();
      setElapsedTime(0);
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to clock ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    // Parse as UTC and format without timezone conversion
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]" data-testid="employee-dashboard">
      {/* Header */}
      <header 
        className="bg-white/10 backdrop-blur-md border-b border-white/10 px-4 pb-3" 
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white" data-testid="user-name">{user.name}</p>
              <p className="text-sm text-white/60 capitalize">{user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="home-btn">
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            {user.role === "admin" && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="admin-btn">
                  Admin
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Clock In/Out Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
            <div className="p-6 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                clockedIn 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`} data-testid="clock-status">
                <span className={`w-2 h-2 rounded-full ${clockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {clockedIn ? 'Currently Working' : 'Not Clocked In'}
              </div>

              {/* Location Status Indicator - Only show when there's a status to display */}
              {locationStatus.denied ? (
                <div className="mb-4 p-4 bg-[#1A1A2E]/10 border border-[#8B5CF6]/30 rounded-xl">
                  <div className="flex items-center justify-center gap-2 text-[#8B5CF6] mb-3">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">Location Access Required</span>
                  </div>
                  <div className="text-sm text-gray-600 text-center mb-4 space-y-3">
                    <p>Location permission was blocked.</p>
                    <p className="font-medium text-[#1A1A2E]">Tap "Reload Page" below, then allow location access when prompted.</p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      onClick={() => window.location.reload()}
                      className="w-full max-w-xs bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] hover:from-[#7C3AED] hover:to-[#00A8CC] text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reload Page
                    </Button>
                    <details className="w-full max-w-xs text-left">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Still not working? Check your settings
                      </summary>
                      <div className="mt-2 text-xs text-gray-500 space-y-1 pl-2 border-l-2 border-gray-200">
                        {(window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) ? (
                          <>
                            <p><strong>For this app:</strong></p>
                            <p>Settings → Privacy & Security → Location Services → Find this app → Allow</p>
                          </>
                        ) : (
                          <>
                            <p><strong>iPhone/iPad:</strong> Settings → Safari → Location → Allow</p>
                            <p><strong>Android:</strong> ⋮ menu → Settings → Site settings → Location</p>
                            <p><strong>Desktop:</strong> Click lock icon in address bar</p>
                          </>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              ) : locationStatus.checking ? (
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-yellow-500 animate-pulse" />
                    <span className="text-yellow-600">Checking location...</span>
                  </div>
                  <button
                    onClick={() => {
                      setLocationStatus({ checking: false, withinRange: null, distance: null, denied: false });
                      setLoading(false);
                    }}
                    className="text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : locationStatus.withinRange === true ? (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Location verified</span>
                </div>
              ) : locationStatus.withinRange === false && !locationStatus.denied ? (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Too far</span>
                </div>
              ) : null}

              {clockedIn && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Time Elapsed</p>
                  <p className="font-mono text-4xl font-bold text-[#1A1A2E]" data-testid="elapsed-time">
                    {formatTime(elapsedTime)}
                  </p>
                </div>
              )}

              <button
                onClick={() => handleClock(clockedIn ? "out" : "in")}
                disabled={loading || locationStatus.checking}
                className={`w-full max-w-xs mx-auto py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  clockedIn 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white shadow-lg hover:shadow-xl'
                } disabled:opacity-50`}
                data-testid="clock-action-btn"
              >
                {loading || locationStatus.checking ? (
                  locationStatus.checking ? "Checking location..." : "Processing..."
                ) : clockedIn ? (
                  <>
                    <StopCircle className="w-6 h-6" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-6 h-6" />
                    Clock In
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pay Period Summary Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins text-lg font-semibold text-[#1A1A2E]">Current Pay Period</h2>
                <span className="text-sm text-gray-500">
                  {formatDate(summary.period_start)} - {formatDate(summary.period_end)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Hours */}
                <div className="bg-gradient-to-br from-[#00D4FF]/10 to-[#00D4FF]/5 rounded-xl p-4 text-center">
                  <Clock className="w-6 h-6 text-[#00D4FF] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1A1A2E]" data-testid="period-hours">
                    {formatHoursToHMS(summary.period_hours)}
                  </p>
                  <p className="text-xs text-gray-500">Hours</p>
                </div>
                
                {/* Shifts */}
                <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 rounded-xl p-4 text-center">
                  <Briefcase className="w-6 h-6 text-[#8B5CF6] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1A1A2E]" data-testid="period-shifts">
                    {summary.period_shifts}
                  </p>
                  <p className="text-xs text-gray-500">Shifts</p>
                </div>
                
                {/* Estimated Pay */}
                <div className="bg-gradient-to-br from-[#FF1493]/10 to-[#FF1493]/5 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-[#FF1493] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1A1A2E]" data-testid="estimated-pay">
                    {formatCurrency(roundHoursToMinute(summary.period_hours) * summary.hourly_rate)}
                  </p>
                  <p className="text-xs text-gray-500">Est. Pay</p>
                </div>
              </div>

              {/* Rate Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Rate: <span className="font-semibold text-[#1A1A2E]">{formatCurrency(summary.hourly_rate)}/hr</span>
                  <span className="mx-2">•</span>
                  {formatHoursToHMS(summary.period_hours)} × {formatCurrency(summary.hourly_rate)} = {formatCurrency(roundHoursToMinute(summary.period_hours) * summary.hourly_rate)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Shifts */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
            <div className="p-6">
              <h2 className="font-poppins text-lg font-semibold text-[#1A1A2E] mb-4">Recent Shifts</h2>
              {entries.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No shifts recorded yet</p>
              ) : (
                <div className="space-y-3" data-testid="shifts-list">
                  {entries.slice(0, 5).map((entry) => (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      data-testid={`shift-entry-${entry.id}`}
                    >
                      <div>
                        <p className="font-medium text-[#1A1A2E]">
                          {formatDateTime(entry.clock_in)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.clock_out ? `Out: ${formatDateTime(entry.clock_out)}` : 'In progress...'}
                        </p>
                      </div>
                      <div className="text-right">
                        {entry.clock_out ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#00D4FF]/10 rounded-full text-sm font-medium text-[#0891B2]">
                            <Clock className="w-3 h-3" />
                            {formatHoursToHMS(entry.total_hours)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full text-sm font-medium text-green-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* W-9 Tax Form Section - Dark Theme Matching Home Screen */}
          <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl shadow-2xl overflow-hidden border border-white/10">
            <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00D4FF]" />
                  W-9 Tax Form
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to download the IRS W-9 form?")) {
                      handleDownloadBlankW9();
                    }
                  }}
                  className="text-[#00D4FF] border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 bg-transparent"
                  data-testid="get-w9-form-btn"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Get W-9 Form
                </Button>
              </div>

              {/* Submit New W-9 Button */}
              {!showW9SubmitForm && (
                <Button
                  onClick={() => setShowW9SubmitForm(true)}
                  className="w-full mb-4 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#8B5CF6] hover:to-[#00D4FF] text-white font-semibold"
                  data-testid="submit-w9-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit W-9 to Admin
                </Button>
              )}

              {/* W-9 Submission Form */}
              {showW9SubmitForm && (
                <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#00D4FF]" />
                      Submit W-9 Form
                    </h3>
                    <button
                      onClick={() => {
                        setShowW9SubmitForm(false);
                        setW9FormData({ file: null, notes: '' });
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* File Upload */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      W-9 Document *
                    </label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        w9FormData.file 
                          ? 'border-[#00D4FF] bg-[#00D4FF]/10' 
                          : 'border-white/20 hover:border-[#00D4FF]/50'
                      }`}
                      onClick={() => w9InputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={w9InputRef}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setW9FormData({ ...w9FormData, file: e.target.files[0] })}
                      />
                      {w9FormData.file ? (
                        <div className="flex items-center justify-center gap-2 text-[#00D4FF]">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">{w9FormData.file.name}</span>
                        </div>
                      ) : (
                        <div className="text-white/60">
                          <Upload className="w-6 h-6 mx-auto mb-1" />
                          <p className="text-sm">Click to select W-9 file</p>
                          <p className="text-xs text-white/40">PDF, JPG, or PNG</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={w9FormData.notes}
                      onChange={(e) => setW9FormData({ ...w9FormData, notes: e.target.value })}
                      placeholder="Add any notes for the administrator..."
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#00D4FF] focus:border-transparent resize-none text-white placeholder-white/40"
                      rows={2}
                      data-testid="w9-notes-input"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleW9Submit}
                    disabled={!w9FormData.file || uploadingW9}
                    className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#8B5CF6] hover:to-[#00D4FF] text-white font-semibold"
                    data-testid="submit-w9-form-btn"
                  >
                    {uploadingW9 ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {uploadingW9 ? "Submitting..." : "Submit W-9"}
                  </Button>
                </div>
              )}

              {/* Submitted W-9s List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#00D4FF]" />
                    View Submissions
                  </h3>
                  {w9Status?.total_documents > 0 && (
                    <span className="bg-[#8B5CF6]/30 text-[#8B5CF6] px-2 py-0.5 rounded-full text-xs font-medium">
                      {w9Status.total_documents} document(s)
                    </span>
                  )}
                </div>

                {w9Status?.w9_documents && w9Status.w9_documents.filter(doc => doc && doc.id).length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {w9Status.w9_documents.filter(doc => doc && doc.id).map((doc, index) => (
                      <div 
                        key={doc.id} 
                        className={`p-4 rounded-xl border ${
                          doc.status === 'approved' 
                            ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30' 
                            : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                        }`}
                        data-testid={`w9-submission-${doc.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className={`w-4 h-4 ${
                                doc.status === 'approved' ? 'text-[#00D4FF]' : 'text-[#8B5CF6]'
                              }`} />
                              <span className="font-medium text-white truncate">
                                {doc.filename || `W-9 #${index + 1}`}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                doc.status === 'approved' 
                                  ? 'bg-[#00D4FF]/20 text-[#00D4FF]' 
                                  : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                              }`}>
                                {doc.status === 'approved' ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/50">
                              {doc.uploaded_at && new Date(doc.uploaded_at).toString() !== 'Invalid Date' && (
                                <span className="flex items-center gap-1">
                                  <Clock3 className="w-3 h-3" />
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {doc.notes && (
                              <div className="mt-2 p-2 bg-white/5 rounded-lg">
                                <p className="text-xs text-white/60 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="italic">"{doc.notes}"</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await axios.get(`${API}/time/w9/download/${doc.id}`, {
                                  ...getAuthHeader(),
                                  responseType: 'blob'
                                });
                                const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                                const url = window.URL.createObjectURL(blob);
                                setViewingW9({
                                  url,
                                  filename: doc.filename || 'w9.pdf',
                                  contentType: response.headers['content-type'] || 'application/pdf',
                                  docId: doc.id
                                });
                              } catch (error) {
                                toast.error("Failed to view W-9");
                              }
                            }}
                            className="flex-1 text-white/80 border-white/20 hover:bg-white/10 bg-transparent"
                            data-testid={`view-w9-${doc.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          {/* Delete button - available for admins and for pending (non-approved) documents */}
                          {(user?.role === 'admin' || doc.status !== 'approved') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!window.confirm("Are you sure you want to delete this W-9 document?")) return;
                                try {
                                  await axios.delete(`${API}/time/w9/${doc.id}`, getAuthHeader());
                                  toast.success("W-9 deleted");
                                  // Refresh the status
                                  const res = await axios.get(`${API}/time/w9/status`, getAuthHeader());
                                  setW9Status(res.data);
                                } catch (error) {
                                  toast.error(error.response?.data?.detail || "Failed to delete W-9");
                                }
                              }}
                              className="text-red-400 border-red-400/30 hover:bg-red-400/10 bg-transparent"
                              data-testid={`delete-w9-${doc.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-white/20" />
                    <p className="text-sm text-white/60">No W-9 submissions yet</p>
                    <p className="text-xs text-white/40 mt-1">Submit your W-9 form above for review</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* W-9 Viewer Modal */}
      {viewingW9 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (viewingW9.url) window.URL.revokeObjectURL(viewingW9.url);
            setViewingW9(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
              <div>
                <h3 className="font-semibold text-white">W-9 Document</h3>
                <p className="text-sm text-gray-300">{viewingW9.filename}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (viewingW9.url) window.URL.revokeObjectURL(viewingW9.url);
                  setViewingW9(null);
                }}
                className="text-white hover:bg-white/20"
              >
                ✕
              </Button>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {viewingW9.contentType?.includes('pdf') ? (
                <iframe
                  src={viewingW9.url}
                  className="w-full h-full min-h-[500px] rounded-lg border border-gray-200"
                  title="W-9 Document"
                />
              ) : viewingW9.contentType?.includes('image') ? (
                <div className="flex items-center justify-center">
                  <img
                    src={viewingW9.url}
                    alt="W-9 Document"
                    className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Preview not available</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-white">
              <Button
                variant="outline"
                onClick={() => {
                  if (viewingW9.url) window.URL.revokeObjectURL(viewingW9.url);
                  setViewingW9(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to download this W-9?")) return;
                  try {
                    const response = await axios.get(`${API}/time/w9/download/${viewingW9.docId}`, {
                      ...getAuthHeader(),
                      responseType: 'blob'
                    });
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', viewingW9.filename || 'w9.pdf');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success("W-9 downloaded!");
                  } catch (error) {
                    toast.error("Failed to download W-9");
                  }
                }}
                className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
