import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  EyeOff,
  Send,
  MessageSquare,
  X,
  Clock3,
  MapPin,
  RefreshCw,
  Lock,
  Key,
  Shield,
  Fingerprint,
  GraduationCap,
  ChevronDown,
  FileSignature,
  Loader2,
  HelpCircle,
  Smartphone,
  Bell,
  BellOff,
  Share,
  Plus,
  Globe,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import axios from "axios";
import { formatHoursToHMS, roundHoursToMinute } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import useBiometricAuth from "@/hooks/useBiometricAuth";
import LiveActivityService from "@/services/LiveActivityService";
import MessagingSection from "@/components/MessagingSection";
import FullScreenMessaging from "@/components/FullScreenMessaging";
import PullToRefresh from "@/components/PullToRefresh";
import EmployeeWalkthrough, { useEmployeeWalkthrough } from "@/components/employee/EmployeeWalkthrough";

// Check if running in Capacitor native app
const isNativePlatform = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative;
};

// Geolocation helper - uses Capacitor on native, browser API on web
const getLocation = async (options = {}) => {
  // Try Capacitor Geolocation first if in native app
  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      
      // Request permission first
      const permResult = await Geolocation.requestPermissions();
      if (permResult.location !== 'granted') {
        throw { code: 1, message: 'Location permission denied' };
      }
      
      // ALWAYS use high accuracy for clock-in location checks
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: options.timeout ?? 15000,
        maximumAge: 0 // Always get fresh location
      });
      
      console.log('[ClockIn GPS] Got position:', position.coords.latitude, position.coords.longitude, 'accuracy:', position.coords.accuracy);
      
      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      };
    } catch (error) {
      console.log('Capacitor Geolocation error:', error);
      // Rethrow with standardized error codes
      if (error.message?.includes('denied') || error.code === 1) {
        throw { code: 1, message: 'Location permission denied' };
      }
      throw error;
    }
  }
  
  // Fallback to browser geolocation
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 0, message: 'Geolocation not supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
  });
};

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Work location coordinates (Omaha, NE area)
const WORK_LOCATION = {
  lat: 41.13063,
  lng: -95.99024,
  radiusMiles: 2.0 // Increased for GPS variance
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

export default function EmployeeDashboard({ 
  adminViewEmployee = null, 
  isAdminView = false,
  initialData = null  // Pre-fetched data from admin dashboard
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [clockedIn, setClockedIn] = useState(initialData?.clockStatus?.is_clocked_in || false);
  const [currentEntry, setCurrentEntry] = useState(initialData?.clockStatus?.current_entry || null);
  const [entries, setEntries] = useState(initialData?.entries || []);
  const [summary, setSummary] = useState(initialData?.summary || { 
    total_hours: 0, 
    week_hours: 0, 
    total_shifts: 0,
    period_hours: 0,
    period_shifts: 0,
    hourly_rate: null, // Don't show a default rate - wait for actual data
    estimated_pay: 0,
    period_start: null,
    period_end: null,
    is_previous_period: false,
    ytd_paid: 0,
    ytd_payment_count: 0
  });
  
  // Check if we should auto-expand messages section (from notification click)
  const autoExpandMessages = searchParams.get('section') === 'messages';
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [locationStatus, setLocationStatus] = useState({ checking: false, withinRange: null, distance: null, denied: false });
  
  // Timezone preference for remote workers (Central Time default, can toggle to Philippine Time)
  const [showPhilippineTime, setShowPhilippineTime] = useState(false);
  
  // Track if Live Activity has been started this session to avoid restarting
  const liveActivityStartedRef = useRef(false);
  
  // Haptic feedback
  const { heavyPress, buttonPress, lightTap, successFeedback, errorFeedback, warningFeedback } = useHaptics();
  
  // W-9 state
  const [w9Status, setW9Status] = useState(initialData?.w9Status || null);
  const [uploadingW9, setUploadingW9] = useState(false);
  const [viewingW9, setViewingW9] = useState(null);
  const [showW9SubmitForm, setShowW9SubmitForm] = useState(false);
  const [w9FormData, setW9FormData] = useState({ file: null, notes: '' });
  const w9InputRef = useRef(null);
  
  // W-8BEN state (for foreign employees)
  const [w8benStatus, setW8benStatus] = useState(initialData?.w8benStatus || null);
  const [uploadingW8ben, setUploadingW8ben] = useState(false);
  const [showW8benSubmitForm, setShowW8benSubmitForm] = useState(false);
  const [showW8benInstructions, setShowW8benInstructions] = useState(false);
  const [w8benFormData, setW8benFormData] = useState({ file: null });
  const w8benInputRef = useRef(null);
  
  // Collapsible tax form sections state
  const [w9Expanded, setW9Expanded] = useState(false);
  const [w8benExpanded, setW8benExpanded] = useState(false);
  const [nec1099Expanded, setNec1099Expanded] = useState(false);
  const [contractorAgreementExpanded, setContractorAgreementExpanded] = useState(false);
  
  // Contractor Agreement state
  const [contractorAgreement, setContractorAgreement] = useState(null);
  const [signingAgreement, setSigningAgreement] = useState(false);
  const [agreementSignature, setAgreementSignature] = useState("");
  const [agreementName, setAgreementName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Auto-expand contractor agreement in admin view when it's signed (approved or pending_review)
  useEffect(() => {
    if (isAdminView && (contractorAgreement?.status === 'approved' || contractorAgreement?.status === 'pending_review')) {
      setContractorAgreementExpanded(true);
    }
  }, [isAdminView, contractorAgreement?.status]);
  
  // Contractor fillable fields
  const [contractorEmail, setContractorEmail] = useState("");
  // Payment fields for Remitly
  const [paymentFirstName, setPaymentFirstName] = useState("");
  const [paymentLastName, setPaymentLastName] = useState("");
  const [paymentEmail, setPaymentEmail] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentCountry, setPaymentCountry] = useState("");
  
  // AnyDesk state for remote workers
  const [anydeskAddress, setAnydeskAddress] = useState("");
  const [savingAnydesk, setSavingAnydesk] = useState(false);
  const [anydeskShared, setAnydeskShared] = useState(false);
  
  // Company AnyDesk info for remote workers to connect to
  const COMPANY_ANYDESK_ID = "1 396 262 135";
  const COMPANY_ANYDESK_PASSWORD = "Thrifty Curator";
  
  // Messaging state for header shortcut and full-screen modal
  const [showFullScreenMessages, setShowFullScreenMessages] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messagesMuted, setMessagesMuted] = useState(() => {
    return localStorage.getItem('thrifty_curator_messages_muted') === 'true';
  });
  
  // Check if desktop (for showing company AnyDesk number)
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    // Check if desktop based on screen width
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  // Onboarding data (pre-populated from job application)
  const [onboardingData, setOnboardingData] = useState(null);
  
  // Determine if user is a remote worker (check onboarding data, user record, or localStorage)
  const isRemoteWorker = () => {
    // Check onboarding data first
    if (onboardingData?.is_remote_worker) return true;
    // Check stored user data
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser?.is_remote_worker) return true;
    // Check admin view employee
    if (adminViewEmployee?.is_remote_worker) return true;
    return false;
  };
  
  // 1099 documents state
  const [my1099s, setMy1099s] = useState(initialData?.my1099s || { documents: [], count: 0 });
  const [loading1099s, setLoading1099s] = useState(false);
  const [viewing1099, setViewing1099] = useState(null);

  // Password management state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Biometric auth for Face ID reset
  const { isAvailable: biometricAvailable, deleteCredentials } = useBiometricAuth();
  const [resettingFaceId, setResettingFaceId] = useState(false);

  // Employee walkthrough/tutorial - skip in admin view
  const { showWalkthrough, triggerWalkthrough, closeWalkthrough } = useEmployeeWalkthrough(isAdminView);

  // PWA Install Prompt State
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Push notification state
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // Check if PWA is installed and set up install prompt
  useEffect(() => {
    // Check if already installed as PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);
    
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
    
    // Check if user dismissed the banner before
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    // Show banner if not installed, not dismissed recently
    if (!isStandaloneMode && (!dismissed || Date.now() - dismissedTime > oneWeek)) {
      setShowInstallBanner(true);
    }
    
    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check push notification permission
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle PWA install
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
        toast.success('App installed!', { description: 'You can now access Thrifty Curator from your home screen' });
      }
      setDeferredPrompt(null);
    }
  };

  // Dismiss install banner
  const dismissInstallBanner = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setShowInstallBanner(false);
  };

  // Request push notification permission and subscribe
  const requestPushPermission = async () => {
    try {
      if (!('Notification' in window)) {
        toast.error('Push notifications not supported', { description: 'Your browser does not support push notifications' });
        return;
      }
      
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        // Register service worker and subscribe to push
        const registration = await navigator.serviceWorker.ready;
        
        // Get VAPID public key from backend (or use a configured one)
        // For now, we'll just show success - actual push subscription would need VAPID keys
        setPushSubscribed(true);
        toast.success('Notifications enabled!', { description: 'You will receive push notifications for new messages' });
        
        // Store preference
        localStorage.setItem('push_notifications_enabled', 'true');
      } else if (permission === 'denied') {
        toast.error('Notifications blocked', { description: 'Please enable notifications in your browser settings' });
      }
    } catch (error) {
      console.error('Failed to request push permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  // Check if push is already subscribed on load
  useEffect(() => {
    const pushEnabled = localStorage.getItem('push_notifications_enabled');
    if (pushEnabled === 'true' && Notification.permission === 'granted') {
      setPushSubscribed(true);
    }
  }, []);

  // Reset Face ID credentials
  const handleResetFaceId = async () => {
    if (!window.confirm("Reset Face ID login? You'll need to log in with your password again to re-enable Face ID.")) {
      return;
    }
    
    setResettingFaceId(true);
    try {
      const result = await deleteCredentials('employee_portal');
      if (result.success) {
        successFeedback();
        toast.success("Face ID reset successfully", {
          description: "Log in with your password to set up Face ID again."
        });
      } else {
        throw new Error(result.error || "Failed to reset");
      }
    } catch (error) {
      errorFeedback();
      toast.error("Failed to reset Face ID", {
        description: error.message || "Please try again"
      });
    } finally {
      setResettingFaceId(false);
    }
  };

  useEffect(() => {
    // If in admin view mode, use the provided employee data
    if (isAdminView && adminViewEmployee) {
      setUser({
        id: adminViewEmployee.id,
        email: adminViewEmployee.email,
        name: adminViewEmployee.name,
        role: 'employee'
      });
      // Only fetch data if not provided as initial data
      if (!initialData) {
        fetchData();
      }
      return;
    }
    
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchData();
    checkPasswordStatus(parsedUser.email);
    
    // When app opens, end any lingering Live Activity if employee is clocked out
    // This handles the case where user taps the "clocked out by admin" widget
    const cleanupLiveActivity = async () => {
      try {
        const statusRes = await axios.get(`${API}/time/status`, getAuthHeader());
        if (!statusRes.data.clocked_in) {
          // Employee is clocked out, end any lingering Live Activity
          console.log('App opened while clocked out, ending any lingering Live Activity');
          liveActivityStartedRef.current = false;
          
          // Try to end the activity aggressively - multiple attempts with increasing delays
          const attempts = [0, 500, 1500, 3000]; // Immediate, 0.5s, 1.5s, 3s
          for (const delay of attempts) {
            setTimeout(async () => {
              console.log(`Live Activity cleanup attempt (delay: ${delay}ms)...`);
              try {
                await LiveActivityService.endEmployeeActivity(parsedUser.id);
              } catch (e) {
                console.log('Cleanup attempt failed:', e);
              }
            }, delay);
          }
        }
      } catch (e) {
        console.log('Cleanup Live Activity check failed:', e);
      }
    };
    cleanupLiveActivity();
    
    // Register for push notifications as employee
    const registerPush = async () => {
      try {
        await LiveActivityService.registerForPushNotifications(parsedUser.id, "employee");
        console.log("Employee registered for push notifications");
      } catch (e) {
        console.log("Push registration skipped:", e);
      }
    };
    registerPush();
    
    // Refresh data periodically to keep pay summary up to date (every 60 seconds)
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 60000);
    
    // Poll more frequently to detect admin clock-outs (every 10 seconds)
    // This is a workaround since Live Activity push tokens aren't working for employees
    const clockStatusInterval = setInterval(async () => {
      try {
        const statusRes = await axios.get(`${API}/time/status`, getAuthHeader());
        const serverClockedIn = statusRes.data.clocked_in;
        
        // If we think we're clocked in but server says we're not, admin clocked us out
        if (liveActivityStartedRef.current && !serverClockedIn) {
          console.log('Detected admin clock-out, updating Live Activity to show message');
          liveActivityStartedRef.current = false;
          
          // Get the total hours from the last entry
          const totalHours = statusRes.data.entry?.total_hours || 0;
          
          // Format the current time
          const clockOutTime = new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          
          // Create message with time and instructions
          const message = `You have been clocked out at ${clockOutTime}. Tap to open app or swipe to dismiss.`;
          
          // Update the widget to show the message - it will stay visible until user dismisses or taps it
          await LiveActivityService.markClockedOutByAdmin(totalHours, message);
          
          // Refresh full data to update UI
          fetchData();
        }
      } catch (e) {
        console.log('Clock status poll error:', e);
      }
    }, 10000); // Check every 10 seconds
    
    // Also cleanup Live Activity when app becomes visible (user returns to foreground)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, checking Live Activity status...');
        try {
          const statusRes = await axios.get(`${API}/time/status`, getAuthHeader());
          if (!statusRes.data.clocked_in && liveActivityStartedRef.current) {
            console.log('App visible + clocked out, ending Live Activity');
            liveActivityStartedRef.current = false;
            await LiveActivityService.endEmployeeActivity(parsedUser.id);
          }
        } catch (e) {
          console.log('Visibility change Live Activity check failed:', e);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockStatusInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  // Handle pending shortcut actions (from iOS Quick Actions)
  useEffect(() => {
    const handlePendingShortcut = async () => {
      const pendingAction = localStorage.getItem('pendingShortcutAction');
      if (pendingAction === 'ClockIn') {
        console.log('[EmployeeDashboard] Handling ClockIn shortcut');
        localStorage.removeItem('pendingShortcutAction');
        
        // Wait for data to load and component to be ready
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check current clock status from the UI
        const clockButton = document.querySelector('[data-testid="clock-action-btn"]');
        const clockStatus = document.querySelector('[data-testid="clock-status"]');
        const isCurrentlyNotClockedIn = clockStatus?.textContent?.includes('Not Clocked In');
        
        console.log('[EmployeeDashboard] Clock status check:', { clockedIn, isCurrentlyNotClockedIn });
        
        // Scroll to the clock section first
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // If not clocked in, click the clock button
        if (isCurrentlyNotClockedIn && clockButton) {
          toast.success('Clocking you in...');
          setTimeout(() => {
            clockButton.click();
          }, 300);
        } else if (!clockedIn && clockButton) {
          // Fallback: click the button anyway
          toast.success('Clocking you in...');
          setTimeout(() => {
            clockButton.click();
          }, 300);
        } else {
          toast.info('You are already clocked in');
        }
      }
    };
    
    // Longer delay to ensure component and data are fully loaded
    const timer = setTimeout(handlePendingShortcut, 800);
    return () => clearTimeout(timer);
  }, [clockedIn]);

  // Check if employee has a password set
  const checkPasswordStatus = async (email) => {
    try {
      const res = await axios.get(`${API}/auth/employee/has-password/${encodeURIComponent(email)}`);
      setHasPassword(res.data.has_password || false);
    } catch (error) {
      console.error("Error checking password status:", error);
    }
  };

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
      // Skip if not clocked in, user is admin, or user is a remote worker
      if (!clockedIn || user?.role === 'admin' || user?.is_remote_worker) return;
      
      try {
        const position = await getLocation({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
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
      } catch (error) {
        // If we can't get location, just skip this check
        console.log("Location check failed:", error.message || error);
      }
    };
    
    if (clockedIn && user?.role !== 'admin' && !user?.is_remote_worker) {
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
    const checkLocationOnLoad = async () => {
      // Skip if not clocked in, user is admin, or user is a remote worker
      if (!clockedIn || user?.role === 'admin' || user?.is_remote_worker) return;
      
      try {
        const position = await getLocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
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
      } catch (error) {
        // If GPS is denied or unavailable, just skip auto clock out
        console.log("Initial location check failed:", error.message || error);
      }
    };
    
    // Small delay to let the page settle
    const timeout = setTimeout(checkLocationOnLoad, 1000);
    
    return () => clearTimeout(timeout);
  }, [clockedIn, user]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  
  // Get user ID for API calls - use adminViewEmployee when in admin view mode
  const getEffectiveUserId = () => {
    if (isAdminView && adminViewEmployee) {
      return adminViewEmployee.id;
    }
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return storedUser.id;
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (isRefreshing || isAdminView) return; // Disable refresh in admin view
    setIsRefreshing(true);
    lightTap();
    try {
      await fetchData();
      toast.success("Data refreshed", { duration: 1500 });
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchData = async () => {
    try {
      // Get user info for API calls - use adminViewEmployee in admin view mode
      const effectiveUserId = getEffectiveUserId();
      
      // Use the SAME endpoints for both employee and admin view
      // Admin just passes user_id parameter to view employee data
      const userIdParam = isAdminView && adminViewEmployee ? `?user_id=${adminViewEmployee.id}` : '';
      
      let statusRes, entriesRes, summaryRes, w9Res, w8benRes;
      
      [statusRes, entriesRes, summaryRes, w9Res, w8benRes] = await Promise.all([
        axios.get(`${API}/time/status${userIdParam}`, getAuthHeader()),
        axios.get(`${API}/time/entries${userIdParam}`, getAuthHeader()),
        axios.get(`${API}/time/summary${userIdParam}`, getAuthHeader()),
        axios.get(`${API}/time/w9/status${userIdParam}`, getAuthHeader()).catch(() => ({ data: { has_w9: false, w9_documents: [] } })),
        axios.get(`${API}/time-tracking/w8ben/status${userIdParam}`, getAuthHeader()).catch(() => ({ data: { status: 'not_applicable' } }))
      ]);
      
      // Fetch 1099s separately (for current and previous tax years)
      const currentYear = new Date().getFullYear();
      try {
        const [current1099s, previous1099s] = await Promise.all([
          axios.get(`${API}/financials/my-1099s/${currentYear - 1}?user_id=${effectiveUserId}`, getAuthHeader()),
          axios.get(`${API}/financials/my-1099s/${currentYear - 2}?user_id=${effectiveUserId}`, getAuthHeader())
        ]);
        const allDocs = [
          ...(current1099s.data.documents || []),
          ...(previous1099s.data.documents || [])
        ];
        setMy1099s({
          documents: allDocs,
          count: allDocs.length,
          total_amount: allDocs.reduce((sum, d) => sum + (d.amount_paid || 0), 0)
        });
      } catch (err) {
        console.log('No 1099s found or error fetching:', err);
      }

      const isNowClocked = statusRes.data.clocked_in;
      
      setClockedIn(isNowClocked);
      setCurrentEntry(statusRes.data.entry);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
      setW9Status(w9Res.data);
      setW8benStatus(w8benRes.data);
      
      // Fetch contractor agreement status - same endpoint with user_id param
      try {
        const agreementRes = await axios.get(`${API}/contractor-agreement/status${userIdParam}`, getAuthHeader());
        setContractorAgreement(agreementRes.data);
      } catch (err) {
        console.log('Error fetching contractor agreement:', err);
        setContractorAgreement({ status: 'pending' });
      }
      
      // Fetch onboarding data to pre-populate contractor agreement fields
      // In admin view, fetch for the employee being viewed; otherwise fetch for current user
      try {
        const onboardingUrl = isAdminView && adminViewEmployee
          ? `${API}/forms/admin/onboarding-data/${encodeURIComponent(adminViewEmployee.email)}`
          : `${API}/forms/my-onboarding-data`;
        const onboardingRes = await axios.get(onboardingUrl, getAuthHeader());
        if (onboardingRes.data.found) {
          setOnboardingData(onboardingRes.data);
          // Pre-populate contractor agreement fields if not already signed
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          const userEmail = isAdminView ? adminViewEmployee?.email : storedUser?.email;
          const userName = isAdminView ? adminViewEmployee?.name : storedUser?.name;
          setContractorEmail(onboardingRes.data.email || userEmail || "");
          setAgreementName(onboardingRes.data.full_name || userName || "");
          
          // Pre-populate payment info if remote worker
          if (onboardingRes.data.is_remote_worker) {
            // Remitly payment fields
            if (onboardingRes.data.payment_first_name) {
              setPaymentFirstName(onboardingRes.data.payment_first_name);
            }
            if (onboardingRes.data.payment_last_name) {
              setPaymentLastName(onboardingRes.data.payment_last_name);
            }
            if (onboardingRes.data.payment_email) {
              setPaymentEmail(onboardingRes.data.payment_email);
            }
            if (onboardingRes.data.payment_phone) {
              setPaymentPhone(onboardingRes.data.payment_phone);
            }
            if (onboardingRes.data.payment_country) {
              setPaymentCountry(onboardingRes.data.payment_country);
            }
          }
        }
      } catch (err) {
        console.log('No onboarding data found:', err);
      }
      
      // Start Live Activity ONCE when clocked in (avoid restarting on every fetchData) - skip in admin view
      if (!isAdminView && isNowClocked && !liveActivityStartedRef.current && statusRes.data.entry?.clock_in) {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        console.log('Starting Live Activity for clocked-in employee');
        liveActivityStartedRef.current = true;
        LiveActivityService.startEmployeeActivity({
          employeeName: storedUser?.name || storedUser?.email || 'Employee',
          userId: storedUser?.id,
          clockInTime: new Date(statusRes.data.entry.clock_in)
        });
      } else if (!isNowClocked && liveActivityStartedRef.current) {
        // Reset the flag when clocked out so next clock-in starts a new activity
        liveActivityStartedRef.current = false;
      }
      
      // Fetch unread message count for header badge
      if (!isAdminView) {
        try {
          const msgRes = await axios.get(`${API}/conversations/employee/my-conversation`, getAuthHeader());
          const messages = msgRes.data?.messages || [];
          const unread = messages.filter(m => m.sender_type === 'admin' && !m.read).length;
          setUnreadMessageCount(unread);
        } catch (err) {
          // No conversation yet, that's ok
        }
      }
    } catch (error) {
      if (error.response?.status === 401 && !isAdminView) {
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

  // W-8BEN handlers (for foreign employees)
  const handleW8benSubmit = async () => {
    if (!w8benFormData.file) {
      toast.error("Please select a W-8BEN file to submit");
      return;
    }
    
    setUploadingW8ben(true);
    const formData = new FormData();
    formData.append('file', w8benFormData.file);
    
    try {
      await axios.post(`${API}/time-tracking/w8ben/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("W-8BEN submitted for review!");
      setW8benFormData({ file: null });
      setShowW8benSubmitForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit W-8BEN");
    } finally {
      setUploadingW8ben(false);
    }
  };

  // Contractor Agreement handler
  const handleSignContractorAgreement = async () => {
    if (!agreementName || !agreementSignature) {
      toast.error("Please enter your full name and signature");
      return;
    }
    if (!agreedToTerms) {
      toast.error("You must agree to the terms to sign");
      return;
    }
    if (!contractorEmail) {
      toast.error("Please enter your contact email");
      return;
    }
    
    setSigningAgreement(true);
    try {
      await axios.post(`${API}/contractor-agreement/sign`, {
        full_name: agreementName,
        signature_text: agreementSignature,
        agreed_to_terms: agreedToTerms,
        contact_email: contractorEmail,
        // Payment info for Remitly
        payment_first_name: paymentFirstName || null,
        payment_last_name: paymentLastName || null,
        payment_email: paymentEmail || null,
        payment_phone: paymentPhone || null,
        payment_country: paymentCountry || null
      }, getAuthHeader());
      
      toast.success("Contractor Agreement submitted for review!");
      setAgreementName("");
      setAgreementSignature("");
      setAgreedToTerms(false);
      setContractorEmail("");
      setPaymentFirstName("");
      setPaymentLastName("");
      setPaymentEmail("");
      setPaymentPhone("");
      setPaymentCountry("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to sign agreement");
    } finally {
      setSigningAgreement(false);
    }
  };

  // Share AnyDesk address with employer
  const handleShareAnydeskAddress = async () => {
    if (!anydeskAddress.trim()) {
      toast.error("Please enter your AnyDesk address first");
      return;
    }
    
    setSavingAnydesk(true);
    try {
      await axios.post(`${API}/time/employees/me/anydesk`, {
        anydesk_address: anydeskAddress.trim()
      }, getAuthHeader());
      
      setAnydeskShared(true);
      toast.success("AnyDesk address shared with your employer!", {
        description: "Your manager can now see your AnyDesk address in the admin dashboard"
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to share AnyDesk address");
    } finally {
      setSavingAnydesk(false);
    }
  };

  // Copy company AnyDesk ID to clipboard
  const copyCompanyAnydesk = () => {
    navigator.clipboard.writeText("1396262135");
    toast.success("Company AnyDesk ID copied!", {
      description: "1 396 262 135"
    });
  };

  const handleDownloadBlankW8ben = () => {
    // Download both the form AND the instructions
    const formLink = document.createElement('a');
    formLink.href = "https://www.irs.gov/pub/irs-pdf/fw8ben.pdf";
    formLink.target = '_blank';
    formLink.rel = 'noopener noreferrer';
    document.body.appendChild(formLink);
    formLink.click();
    document.body.removeChild(formLink);
    
    // Also open the instructions in a new tab
    setTimeout(() => {
      const instructionsLink = document.createElement('a');
      instructionsLink.href = "https://www.irs.gov/pub/irs-pdf/iw8ben.pdf";
      instructionsLink.target = '_blank';
      instructionsLink.rel = 'noopener noreferrer';
      document.body.appendChild(instructionsLink);
      instructionsLink.click();
      document.body.removeChild(instructionsLink);
    }, 500);
  };

  const handleDownloadW8benInstructions = () => {
    const link = document.createElement('a');
    link.href = "https://www.irs.gov/pub/irs-pdf/iw8ben.pdf";
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if user is within range of work location
  const checkLocation = async () => {
    // If user is admin, bypass location check
    if (user?.role === 'admin') {
      return { withinRange: true, distance: 0 };
    }

    setLocationStatus({ checking: true, withinRange: null, distance: null, denied: false });

    try {
      const position = await getLocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      
      console.log('[ClockIn] Got GPS position:', position.coords.latitude, position.coords.longitude);
      console.log('[ClockIn] Work location:', WORK_LOCATION.lat, WORK_LOCATION.lng);
      
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        WORK_LOCATION.lat,
        WORK_LOCATION.lng
      );
      
      console.log('[ClockIn] Calculated distance:', distance, 'miles, radius:', WORK_LOCATION.radiusMiles);
      
      const withinRange = distance <= WORK_LOCATION.radiusMiles;
      setLocationStatus({ checking: false, withinRange, distance: distance.toFixed(2), denied: false });
      return { withinRange, distance: distance.toFixed(2) };
    } catch (error) {
      console.log('checkLocation error:', error);
      if (error.code === 1) {
        // PERMISSION_DENIED
        setLocationStatus({ checking: false, withinRange: false, distance: 'denied', denied: true });
        return { withinRange: false, denied: true };
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        toast.error("GPS is turned off. Please enable Location Services in your device settings.");
        setLocationStatus({ checking: false, withinRange: false, distance: 'unavailable', denied: false });
        return { withinRange: false, error: "GPS unavailable" };
      } else if (error.code === 0) {
        toast.error("Geolocation is not supported");
        setLocationStatus({ checking: false, withinRange: false, distance: 'unsupported', denied: false });
        return { withinRange: false, error: "Geolocation not supported" };
      } else {
        // TIMEOUT or other error
        toast.error("Location request timed out. Please try again.");
        setLocationStatus({ checking: false, withinRange: false, error: "timeout", denied: false });
        return { withinRange: false, error: "timeout" };
      }
    }
  };

  const handleClock = async (action) => {
    // Reset denied state to allow re-requesting location
    if (locationStatus.denied) {
      setLocationStatus({ checking: false, withinRange: null, distance: null, denied: false });
    }
    
    setLoading(true);
    
    // Admin viewing employee portal - use admin endpoint to clock them in/out
    if (isAdminView && adminViewEmployee) {
      try {
        await axios.post(
          `${API}/admin/employee/${adminViewEmployee.id}/clock`,
          { action },
          getAuthHeader()
        );
        heavyPress();
        successFeedback();
        toast.success(action === "in" ? `${adminViewEmployee.name} clocked in!` : `${adminViewEmployee.name} clocked out!`);
        
        // Update local state
        setClockedIn(action === "in");
        if (action === "out") {
          setCurrentEntry(null);
        }
        
        // Refresh data
        fetchData();
        setElapsedTime(0);
      } catch (error) {
        errorFeedback();
        toast.error(error.response?.data?.detail || `Failed to clock ${action}`);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Only check location for clock IN - allow clock out from anywhere
    // Admins bypass location check entirely
    // Remote workers still need location check on clock-in (to verify remote computer is at work)
    if (action === "in" && user?.role !== 'admin') {
      setLocationStatus({ checking: true, withinRange: null, distance: null, denied: false });
      
      try {
        const position = await getLocation({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000
        });
        
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
        
        // Location verified - proceed with clock in with coordinates
        try {
          await axios.post(`${API}/time/clock`, { 
            action: "in",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }, getAuthHeader());
          heavyPress(); // Strong haptic for clock in
          successFeedback();
          toast.success("Clocked in!");
          
          // Start Live Activity for Lock Screen timer
          liveActivityStartedRef.current = true;
          LiveActivityService.startEmployeeActivity({
            employeeName: user?.name || user?.email || 'Employee',
            userId: user?.id,
            clockInTime: new Date()
          });
          
          fetchData();
          setElapsedTime(0);
        } catch (error) {
          errorFeedback();
          toast.error(error.response?.data?.detail || "Failed to clock in");
        } finally {
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
        errorFeedback();
        console.log('Location error:', error);
        if (error.code === 1) {
          // Permission denied
          const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
          if (isStandalone || isNativePlatform()) {
            toast.error("Please enable location for this app in Settings → Privacy → Location Services", { duration: 5000 });
          } else {
            toast.error("Location permission denied. Please allow location access.");
          }
          setLocationStatus({ checking: false, withinRange: false, distance: null, denied: true });
        } else if (error.code === 2) {
          toast.error("GPS is turned off. Please enable Location Services in your device settings.");
          setLocationStatus({ checking: false, withinRange: false, distance: null, denied: false });
        } else if (error.code === 0) {
          toast.error("Geolocation is not supported");
          setLocationStatus({ checking: false, withinRange: false, distance: null, denied: false });
        } else {
          toast.error("Location request failed. Please try again.");
          setLocationStatus({ checking: false, withinRange: false, error: "timeout", denied: false });
        }
      }
      return; // Exit here - the async code handles the rest
    }
    
    // For clock out, admin clock in, or admin clock out - no location check needed
    try {
      await axios.post(`${API}/time/clock`, { action }, getAuthHeader());
      heavyPress(); // Strong haptic for clock actions
      successFeedback();
      toast.success(action === "in" ? "Clocked in!" : "Clocked out!");
      
      // Handle Live Activity based on action
      if (action === "in") {
        // Admin clock in - start Live Activity
        liveActivityStartedRef.current = true;
        LiveActivityService.startEmployeeActivity({
          employeeName: user?.name || user?.email || 'Employee',
          userId: user?.id,
          clockInTime: new Date()
        });
      } else {
        // Clock out - end Live Activity
        liveActivityStartedRef.current = false;
        LiveActivityService.endEmployeeActivity(user?.id);
      }
      
      fetchData();
      setElapsedTime(0);
    } catch (error) {
      errorFeedback();
      toast.error(error.response?.data?.detail || `Failed to clock ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    lightTap(); // Light haptic for navigation
    
    // Deactivate push token on logout to stop receiving notifications
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser.id || currentUser.email) {
        await axios.post(`${API}/live-activity/deactivate-device-token`, {
          user_id: currentUser.id || currentUser.email,
          user_type: "employee"
        });
      }
    } catch (e) {
      console.log("Failed to deactivate push token:", e);
    }
    
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Set flag to prevent auto Face ID on login page
    sessionStorage.setItem("justLoggedOut", "true");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // Password management handlers
  const handleSetPassword = async () => {
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setSavingPassword(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/auth/employee/set-password`, 
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password set successfully! You'll need to enter it next time you log in.");
      setHasPassword(true);
      resetPasswordForm();
      setShowPasswordModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to set password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    setSavingPassword(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/auth/employee/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password changed successfully!");
      resetPasswordForm();
      setShowPasswordModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (isoString) => {
    // For remote workers, respect the timezone toggle
    // Central Time: America/Chicago (UTC-6 or UTC-5 with DST)
    // Philippine Time: Asia/Manila (UTC+8, 13-14 hours ahead of CT)
    const timezone = isRemoteWorker() && showPhilippineTime ? 'Asia/Manila' : 'America/Chicago';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    // For remote workers, respect the timezone toggle for dates too
    const timezone = isRemoteWorker() && showPhilippineTime ? 'Asia/Manila' : 'America/Chicago';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]" data-testid="employee-dashboard">
      {/* Header */}
      <header 
        className="bg-[#1A1A2E] border-b border-white/20 px-4 pb-3 flex-shrink-0" 
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Name centered on top */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-white truncate max-w-[200px]" data-testid="user-name">{user.name}</p>
          </div>
          {/* Navigation buttons below, centered */}
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <Link to="/" onClick={() => lightTap()}>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 px-2" data-testid="home-btn">
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            {user.role === "admin" && (
              <Link to="/admin" onClick={() => lightTap()}>
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 px-2" data-testid="admin-btn">
                  Admin
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-white/70 hover:text-white hover:bg-white/10 px-2"
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '...' : 'Refresh'}
            </Button>
            {/* Hide Security and Logout in admin view */}
            {!isAdminView && (
              <>
                {/* Messages shortcut with unread badge */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    lightTap();
                    setShowFullScreenMessages(true);
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/10 px-2 relative"
                  data-testid="messages-shortcut-btn"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    lightTap();
                    setShowPasswordModal(true);
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/10 px-2"
                  data-testid="security-btn"
                >
                  <Lock className="w-4 h-4 mr-1" />
                  Security
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    lightTap(); // Haptic on logout
                    handleLogout();
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/10 px-2"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    lightTap();
                    triggerWalkthrough();
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/10 px-2"
                  data-testid="help-btn"
                  title="Show walkthrough"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Timezone Toggle for Remote Workers */}
      {isRemoteWorker() && !isAdminView && (
        <div className="bg-[#1A1A2E]/80 border-b border-white/10 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
            <span className="text-white/60 text-xs">Display times in:</span>
            <div className="flex items-center bg-white/10 rounded-full p-0.5">
              <button
                onClick={() => {
                  lightTap();
                  setShowPhilippineTime(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  !showPhilippineTime 
                    ? 'bg-[#00D4FF] text-white shadow-md' 
                    : 'text-white/60 hover:text-white'
                }`}
                data-testid="timezone-ct-btn"
              >
                🇺🇸 Central
              </button>
              <button
                onClick={() => {
                  lightTap();
                  setShowPhilippineTime(true);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  showPhilippineTime 
                    ? 'bg-[#8B5CF6] text-white shadow-md' 
                    : 'text-white/60 hover:text-white'
                }`}
                data-testid="timezone-ph-btn"
              >
                🇵🇭 Philippine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Walkthrough Modal - Never show in admin view */}
      {!isAdminView && (
        <EmployeeWalkthrough 
          show={showWalkthrough} 
          onClose={closeWalkthrough}
          onComplete={() => toast.success("You're all set! Explore your dashboard.")}
        />
      )}

      <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-auto">
        <main className="max-w-2xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
          
          {/* PWA Install Banner - Only show on MOBILE, if not installed and not in admin view */}
          {!isAdminView && !isDesktop && showInstallBanner && !isStandalone && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Save to Home Screen (Mobile Only)</h3>
                    <p className="text-white/80 text-xs mt-0.5">
                      This feature is for mobile devices only. Save this website to your phone's home screen to enable push notifications.
                    </p>
                  </div>
                </div>
                <button onClick={dismissInstallBanner} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {isIOS ? (
                // iOS Safari instructions
                <div className="mt-3 bg-white/10 rounded-lg p-3">
                  <p className="text-white text-xs font-medium mb-3">How to save to your Home Screen (iPhone/iPad):</p>
                  <ol className="text-white/90 text-xs space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                      <span>Tap the <Share className="w-4 h-4 inline mx-1" /> <strong>Share</strong> button at the bottom of your screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                      <span>Scroll down in the menu and tap <strong>"Add to Home Screen"</strong> <Plus className="w-4 h-4 inline mx-1" /></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                      <span>Tap <strong>"Add"</strong> in the top right corner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">4</span>
                      <span>Open the app from your Home Screen to enable push notifications</span>
                    </li>
                  </ol>
                  <p className="text-white/60 text-xs mt-3 italic">
                    Note: Push notifications only work when you open the app from your home screen bookmark, not from the browser.
                  </p>
                </div>
              ) : deferredPrompt ? (
                // Android/Chrome install button
                <div className="mt-3">
                  <Button 
                    onClick={handleInstallPWA}
                    className="w-full bg-white text-[#8B5CF6] hover:bg-white/90 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Home Screen
                  </Button>
                  <p className="text-white/70 text-xs mt-2 text-center">
                    This enables push notifications for messages (mobile only)
                  </p>
                </div>
              ) : (
                // Generic Android instructions
                <div className="mt-3 bg-white/10 rounded-lg p-3">
                  <p className="text-white text-xs font-medium mb-3">How to save to your Home Screen (Android):</p>
                  <ol className="text-white/90 text-xs space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                      <span>Tap the <strong>menu</strong> button (⋮) in your browser</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                      <span>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                      <span>Open the app from your Home Screen to enable notifications</span>
                    </li>
                  </ol>
                  <p className="text-white/60 text-xs mt-3 italic">
                    Note: Push notifications only work on mobile devices when using the home screen bookmark.
                  </p>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Push Notification Banner - Only show if not subscribed, app is installed or native, and not admin view */}
          {!isAdminView && !pushSubscribed && pushPermission !== 'denied' && (isStandalone || isNativePlatform()) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#FFE66D]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-[#FFE66D]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">Enable Notifications</h3>
                  <p className="text-white/60 text-xs mt-0.5">
                    Get notified when you receive messages from your manager
                  </p>
                  <Button 
                    onClick={requestPushPermission}
                    size="sm"
                    className="mt-2 bg-[#FFE66D] text-[#1A1A2E] hover:bg-[#FFE66D]/90 font-medium"
                  >
                    <Bell className="w-3 h-3 mr-1.5" />
                    Turn On Notifications
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Clock In/Out Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
            <div className="p-6 text-center">
              {/* Clock status and button - shown for all employees including remote workers */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                    clockedIn 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`} data-testid="clock-status">
                    <span className={`w-2 h-2 rounded-full ${clockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {clockedIn ? 'Currently Working' : 'Not Clocked In'}
                  </div>

              {/* Location Status Indicator - Only show when there's a status to display, hide in admin view */}
              {!isAdminView && locationStatus.denied ? (
                <div className="mb-4 p-4 bg-[#1A1A2E]/10 border border-[#8B5CF6]/30 rounded-xl">
                  <div className="flex items-center justify-center gap-2 text-[#8B5CF6] mb-3">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">Location Access Required</span>
                  </div>
                  {/* Check if running in Capacitor native app */}
                  {(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative) ? (
                    // Native iOS/Android app instructions
                    <div className="text-sm text-gray-600 text-center mb-4 space-y-3">
                      <p>Location permission was blocked.</p>
                      <p className="font-medium text-[#1A1A2E]">To enable location access:</p>
                      <div className="bg-white/80 rounded-lg p-3 text-left space-y-2">
                        <p><strong>1.</strong> Open your iPhone <strong>Settings</strong> app</p>
                        <p><strong>2.</strong> Scroll down and tap <strong>Thrifty Curator</strong></p>
                        <p><strong>3.</strong> Tap <strong>Location</strong></p>
                        <p><strong>4.</strong> Select <strong>"While Using the App"</strong></p>
                        <p><strong>5.</strong> Return here and tap "Reload Page"</p>
                      </div>
                    </div>
                  ) : (
                    // Web browser instructions
                    <div className="text-sm text-gray-600 text-center mb-4 space-y-3">
                      <p>Location permission was blocked.</p>
                      <p className="font-medium text-[#1A1A2E]">Tap "Reload Page" below, then allow location access when prompted.</p>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      onClick={() => window.location.reload()}
                      className="w-full max-w-xs bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] hover:from-[#7C3AED] hover:to-[#00A8CC] text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative) 
                        ? "Reload After Enabling" 
                        : "Reload Page"}
                    </Button>
                    {/* Only show the expandable settings help for web browsers */}
                    {!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative) && (
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
                    )}
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
              ) : !isAdminView && locationStatus.withinRange === true ? (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Location verified</span>
                </div>
              ) : !isAdminView && locationStatus.withinRange === false && !locationStatus.denied ? (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Too far ({locationStatus.distance} miles away)</span>
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

              {/* Clock In/Out button */}
              <button
                onClick={() => {
                  buttonPress(); // Haptic on button press
                  handleClock(clockedIn ? "out" : "in");
                }}
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

          {/* Messages - Quick Access - Hide in admin view */}
          {!isAdminView && (
            <MessagingSection
              userType="employee"
              userId={user?.id || user?.email}
              userName={user?.name || user?.email}
              userEmail={user?.email}
              getAuthHeader={() => ({
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
              })}
              autoExpand={autoExpandMessages}
            />
          )}

          {/* Pay Period Summary Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6]" />
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-1">
                <h2 className="font-poppins text-base sm:text-lg font-semibold text-[#1A1A2E]">
                  {summary.is_previous_period ? 'Previous Pay Period' : 'Current Pay Period'}
                </h2>
                <span className="text-xs sm:text-sm text-gray-500">
                  {formatDate(summary.period_start)} - {formatDate(summary.period_end)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Hours */}
                <div className="bg-gradient-to-br from-[#00D4FF]/10 to-[#00D4FF]/5 rounded-xl p-3 sm:p-4 text-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D4FF] mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-2xl font-bold text-[#1A1A2E]" data-testid="period-hours">
                    {formatHoursToHMS(summary.period_hours)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Hours</p>
                </div>
                
                {/* Shifts */}
                <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 rounded-xl p-3 sm:p-4 text-center">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#8B5CF6] mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-2xl font-bold text-[#1A1A2E]" data-testid="period-shifts">
                    {summary.period_shifts}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Shifts</p>
                </div>
                
                {/* Estimated Pay */}
                <div className="bg-gradient-to-br from-[#FF1493]/10 to-[#FF1493]/5 rounded-xl p-3 sm:p-4 text-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF1493] mx-auto mb-1 sm:mb-2" />
                  <p className="text-sm sm:text-2xl font-bold text-[#1A1A2E]" data-testid="estimated-pay">
                    {formatCurrency(summary.estimated_pay)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Est. Pay</p>
                </div>
              </div>

              {/* Rate Info */}
              {summary.hourly_rate !== null && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Rate: <span className="font-semibold text-[#1A1A2E]">{formatCurrency(summary.hourly_rate)}/hr</span>
                  </p>
                </div>
              )}

              {/* YTD Paid */}
              {summary.ytd_paid > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-gray-500">Year-to-Date Paid:</p>
                    <p className="font-semibold text-[#1A1A2E]" data-testid="ytd-paid">
                      {formatCurrency(summary.ytd_paid)}
                      <span className="text-xs text-gray-400 font-normal ml-1">
                        ({summary.ytd_payment_count} payment{summary.ytd_payment_count !== 1 ? 's' : ''})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Shifts */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
            <div className="p-4 sm:p-6">
              <h2 className="font-poppins text-sm sm:text-lg font-semibold text-[#1A1A2E] mb-4">
                {(() => {
                  if (!summary?.period_start || !summary?.period_end) return "Recent Shifts";
                  const periodStart = new Date(summary.period_start);
                  const periodEnd = new Date(summary.period_end);
                  // Check if any entries in current period
                  const currentPeriodEntries = entries.filter(entry => {
                    const clockIn = new Date(entry.clock_in);
                    return clockIn >= periodStart && clockIn <= periodEnd;
                  });
                  const startStr = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const endStr = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  if (currentPeriodEntries.length > 0) {
                    return (
                      <span className="block">
                        <span className="block sm:inline">Pay Period Shifts</span>
                        <span className="block sm:inline text-xs sm:text-sm font-normal text-gray-500 sm:ml-2">({startStr} - {endStr})</span>
                      </span>
                    );
                  }
                  // Show previous period label
                  const prevStart = new Date(periodStart);
                  prevStart.setDate(prevStart.getDate() - 14);
                  const prevEnd = new Date(periodEnd);
                  prevEnd.setDate(prevEnd.getDate() - 14);
                  const prevStartStr = prevStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const prevEndStr = prevEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <span className="block">
                      <span className="block sm:inline">Previous Period</span>
                      <span className="block sm:inline text-xs sm:text-sm font-normal text-gray-500 sm:ml-2">({prevStartStr} - {prevEndStr})</span>
                    </span>
                  );
                })()}
              </h2>
              {(() => {
                // Get shifts for display based on pay period
                let shiftsToShow = [];
                if (summary?.period_start && summary?.period_end) {
                  const periodStart = new Date(summary.period_start);
                  const periodEnd = new Date(summary.period_end);
                  
                  // Get current period entries
                  const currentPeriodEntries = entries.filter(entry => {
                    const clockIn = new Date(entry.clock_in);
                    return clockIn >= periodStart && clockIn <= periodEnd;
                  });
                  
                  if (currentPeriodEntries.length > 0) {
                    shiftsToShow = currentPeriodEntries;
                  } else {
                    // Get previous period entries
                    const prevStart = new Date(periodStart);
                    prevStart.setDate(prevStart.getDate() - 14);
                    const prevEnd = new Date(periodEnd);
                    prevEnd.setDate(prevEnd.getDate() - 14);
                    
                    shiftsToShow = entries.filter(entry => {
                      const clockIn = new Date(entry.clock_in);
                      return clockIn >= prevStart && clockIn <= prevEnd;
                    });
                  }
                } else {
                  shiftsToShow = entries;
                }
                
                // Sort by clock_in descending
                shiftsToShow.sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in));
                
                return shiftsToShow.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No shifts recorded for this pay period</p>
                ) : (
                  <div 
                    className="space-y-3 max-h-[320px] overflow-y-auto pr-2" 
                    style={{ scrollbarWidth: 'thin' }}
                    data-testid="shifts-list"
                  >
                    {shiftsToShow.map((entry) => (
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
                );
              })()}
            </div>
          </div>

          {/* W-9 Tax Form Section - Collapsible (Hidden for remote workers who use W-8BEN instead) */}
          {!isRemoteWorker() && (
          <Collapsible open={w9Expanded} onOpenChange={setW9Expanded}>
            <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl shadow-2xl overflow-hidden border border-white/10" data-testid="w9-section">
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              <CollapsibleTrigger asChild>
                <button 
                  className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  data-testid="w9-collapse-trigger"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#00D4FF]" />
                    <h2 className="font-poppins text-lg font-semibold text-white">
                      W-9 Tax Form
                    </h2>
                    {w9Status?.total_documents > 0 && (
                      <span className="bg-[#8B5CF6]/30 text-[#8B5CF6] px-2 py-0.5 rounded-full text-xs font-medium">
                        {w9Status.total_documents}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-200 ${w9Expanded ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-2">
                  <div className="flex justify-end mb-4">
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
                        {w9Status.w9_documents.filter(doc => doc && doc.id).map((doc, index) => {
                          // Use pre-computed status styles
                          const statusStyles = {
                            approved: {
                              bg: 'bg-[#00D4FF]/10 border-[#00D4FF]/30',
                              icon: 'text-[#00D4FF]',
                              badge: 'bg-[#00D4FF]/20 text-[#00D4FF]',
                              text: 'Approved'
                            },
                            needs_correction: {
                              bg: 'bg-red-500/10 border-red-500/30',
                              icon: 'text-red-400',
                              badge: 'bg-red-500/20 text-red-400',
                              text: 'Denied'
                            },
                            default: {
                              bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30',
                              icon: 'text-[#8B5CF6]',
                              badge: 'bg-[#8B5CF6]/20 text-[#8B5CF6]',
                              text: 'Pending Review'
                            }
                          };
                          const statusStyle = statusStyles[doc.status] || statusStyles.default;
                          
                          return (
                          <div 
                            key={doc.id} 
                            className={`p-4 rounded-xl border ${statusStyle.bg}`}
                            data-testid={`w9-submission-${doc.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className={`w-4 h-4 ${statusStyle.icon}`} />
                                  <span className="font-medium text-white truncate">
                                    {doc.filename || `W-9 #${index + 1}`}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.badge}`}>
                                    {statusStyle.text}
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
                                
                                {/* Show rejection reason if status is needs_correction */}
                                {doc.status === 'needs_correction' && doc.rejection_reason && (
                                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <p className="text-xs text-yellow-400 font-medium mb-1 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Action Required
                                    </p>
                                    <p className="text-sm text-white/80">{doc.rejection_reason}</p>
                                    <p className="text-xs text-white/50 mt-2">
                                      Please submit a corrected W-9 form using the button above.
                                    </p>
                                  </div>
                                )}
                                
                                {/* Show generic message if needs correction but no reason */}
                                {doc.status === 'needs_correction' && !doc.rejection_reason && (
                                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <p className="text-xs text-yellow-400 font-medium mb-1 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Action Required
                                    </p>
                                    <p className="text-sm text-white/80">Your W-9 form needs to be corrected and resubmitted.</p>
                                    <p className="text-xs text-white/50 mt-2">
                                      Please submit a corrected W-9 form using the button above.
                                    </p>
                                  </div>
                                )}
                                
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
                              {/* Delete button - available for admins and for non-approved documents */}
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
                          );
                        })}
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
              </CollapsibleContent>
            </div>
          </Collapsible>
          )}

          {/* AnyDesk Setup Section - Only for Remote Workers - Placed BEFORE Agreement and W-8BEN */}
          {isRemoteWorker() && (
            <Collapsible defaultOpen={true}>
              <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl shadow-2xl overflow-hidden border border-white/10" data-testid="anydesk-section">
                <div className="h-1.5 bg-gradient-to-r from-[#EC4899] via-[#8B5CF6] to-[#00D4FF]" />
                <CollapsibleTrigger asChild>
                  <button 
                    className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    data-testid="anydesk-collapse-trigger"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-[#EC4899]" />
                      <h2 className="font-poppins text-lg font-semibold text-white">
                        Remote Work Setup
                      </h2>
                      <span className="bg-[#EC4899]/20 text-[#EC4899] px-2 py-0.5 rounded-full text-xs font-medium">
                        Required
                      </span>
                    </div>
                    <ChevronDown className="w-5 h-5 text-white/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-2 space-y-6">
                    {/* AnyDesk Setup */}
                    <div className="bg-white/5 rounded-xl p-4 border border-[#EC4899]/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#EC4899]/20 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-[#EC4899]" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">AnyDesk Remote Desktop</h3>
                          <p className="text-white/60 text-sm">Required for remote work tasks</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-white/70 text-sm">
                          AnyDesk allows you to securely access the company computer remotely to perform your work tasks.
                        </p>
                        
                        {/* Step 1: Download */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#EC4899]/20 rounded-full flex items-center justify-center text-xs text-[#EC4899] font-bold">1</span>
                            Download AnyDesk
                          </h4>
                          <a
                            href="https://anydesk.com/en/downloads"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EC4899]/20 hover:bg-[#EC4899]/30 text-[#EC4899] rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download AnyDesk
                          </a>
                          <p className="text-white/50 text-xs mt-2">
                            Available for Windows, Mac, Linux, iOS, and Android
                          </p>
                        </div>
                        
                        {/* Step 2: Share Your Address (Optional) */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#EC4899]/20 rounded-full flex items-center justify-center text-xs text-[#EC4899] font-bold">2</span>
                            Share Your AnyDesk Address (Optional)
                          </h4>
                          <p className="text-white/50 text-xs mb-3">Find your address in AnyDesk after installing, then share it with your manager</p>
                          
                          {/* AnyDesk Address Input with Share Button */}
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="Your AnyDesk Address (e.g., 123 456 789)"
                              value={anydeskAddress}
                              onChange={(e) => setAnydeskAddress(e.target.value)}
                              className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/40"
                              disabled={anydeskShared}
                            />
                            <Button
                              onClick={handleShareAnydeskAddress}
                              disabled={savingAnydesk || !anydeskAddress.trim() || anydeskShared}
                              className={`${anydeskShared ? 'bg-green-500' : 'bg-[#EC4899] hover:bg-[#EC4899]/80'} text-white`}
                            >
                              {savingAnydesk ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : anydeskShared ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Shared
                                </>
                              ) : (
                                <>
                                  <Share className="w-4 h-4 mr-1" />
                                  Share
                                </>
                              )}
                            </Button>
                          </div>
                          {anydeskShared && (
                            <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Your AnyDesk address has been shared with your manager
                            </p>
                          )}
                        </div>
                        
                        {/* Step 3: Connect to Work - Primary Action */}
                        <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-[#EC4899]/20 rounded-lg p-4 border border-[#8B5CF6]/40">
                          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#8B5CF6]/30 rounded-full flex items-center justify-center text-xs text-[#8B5CF6] font-bold">3</span>
                            Connect to Work Computer
                          </h4>
                          
                          {/* Quick Connect Button - Primary */}
                          <a
                            href={`anydesk:${COMPANY_ANYDESK_ID.replace(/\s/g, '')}`}
                            className="w-full mb-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
                            data-testid="anydesk-quick-connect"
                          >
                            <Globe className="w-5 h-5" />
                            Connect to Work Computer
                          </a>
                          
                          {/* Collapsible Connection Info */}
                          <Collapsible defaultOpen={false}>
                            <CollapsibleTrigger className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors w-full justify-between mb-3">
                              <span>Manual Connection Details</span>
                              <ChevronDown className="w-4 h-4" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="bg-black/20 rounded-lg p-4 mb-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-white/50 text-sm">AnyDesk Address:</span>
                                  <div className="flex items-center gap-2">
                                    <code className="text-[#8B5CF6] font-mono text-lg font-bold">{COMPANY_ANYDESK_ID}</code>
                                    <Button
                                      onClick={copyCompanyAnydesk}
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[#8B5CF6] hover:bg-[#8B5CF6]/20"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white/50 text-sm">Password:</span>
                                  <div className="flex items-center gap-2">
                                    <code className="text-[#EC4899] font-mono text-lg font-bold">{COMPANY_ANYDESK_PASSWORD}</code>
                                    <Button
                                      onClick={() => {
                                        navigator.clipboard.writeText(COMPANY_ANYDESK_PASSWORD);
                                        toast.success("Password copied!");
                                      }}
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[#EC4899] hover:bg-[#EC4899]/20"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-white/50 text-xs">
                                  Enter the address and password above. Check &quot;Log in automatically from now on&quot; to connect without entering the password next time.
                                </p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                        
                        {/* Important Tips */}
                        <div className="bg-[#FFE66D]/10 border border-[#FFE66D]/30 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-[#FFE66D] flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-[#FFE66D] font-medium mb-1">Important Tips</h4>
                              <ul className="text-white/70 text-sm space-y-1">
                                <li>• Ensure you have a stable internet connection</li>
                                <li>• Always log out when done with your shift</li>
                                <li>• Contact your manager if you have connection issues</li>
                                <li>• Do not share the company AnyDesk address with others</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Contractor Agreement Section - Only for Remote Workers */}
          {isRemoteWorker() && (
          <Collapsible open={contractorAgreementExpanded} onOpenChange={setContractorAgreementExpanded}>
            <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl shadow-2xl overflow-hidden border border-white/10" data-testid="contractor-agreement-section">
              <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B]" />
              <CollapsibleTrigger asChild>
                <button 
                  className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  data-testid="contractor-agreement-collapse-trigger"
                >
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-[#EC4899]" />
                    <h2 className="font-poppins text-lg font-semibold text-white">
                      Contractor Agreement
                    </h2>
                    {contractorAgreement?.status === 'approved' && (
                      <span className="bg-green-500/30 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                    {contractorAgreement?.status === 'pending_review' && (
                      <span className="bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Review
                      </span>
                    )}
                    {contractorAgreement?.status === 'needs_correction' && (
                      <span className="bg-red-500/30 text-red-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Needs Correction
                      </span>
                    )}
                    {(!contractorAgreement?.status || contractorAgreement?.status === 'not_submitted') && (
                      <span className="bg-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-medium">
                        Action Required
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-200 ${contractorAgreementExpanded ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-2">
                  {contractorAgreement?.status === 'approved' ? (
                    /* Approved Agreement - Read Only View */
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="font-semibold text-green-400">Agreement Approved</span>
                        </div>
                        <p className="text-sm text-white/70">
                          Signed by <span className="text-white font-medium">{contractorAgreement.signed_name}</span> on{' '}
                          {new Date(contractorAgreement.signed_at).toLocaleDateString('en-US', {
                            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </p>
                        {contractorAgreement.reviewed_by && (
                          <p className="text-xs text-white/50 mt-1">
                            Approved by {contractorAgreement.reviewed_by}
                          </p>
                        )}
                      </div>
                      
                      {/* Agreement Text (Read Only) */}
                      <div className="bg-white/5 rounded-lg border border-white/10">
                        <div className="p-3 border-b border-white/10 bg-white/5">
                          <h3 className="font-semibold text-white text-sm">Agreement Terms</h3>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                          <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
                            {contractorAgreement.agreement_text}
                          </pre>
                        </div>
                      </div>
                      
                      {/* Signature Display */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-xs text-white/50 mb-2">Digital Signature</p>
                        <p className="text-lg font-script italic text-[#EC4899]">
                          {contractorAgreement.signature_text}
                        </p>
                      </div>
                      
                      {/* Contractor Details (Read Only) */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-xs text-white/50 mb-3 uppercase tracking-wider">Payment Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-white/50">Contact Email</p>
                            <p className="text-white font-medium">{contractorAgreement.contact_email || '-'}</p>
                          </div>
                          {contractorAgreement.payment_first_name && (
                            <div>
                              <p className="text-white/50">Name (on ID)</p>
                              <p className="text-white font-medium">{contractorAgreement.payment_first_name} {contractorAgreement.payment_last_name}</p>
                            </div>
                          )}
                          {contractorAgreement.payment_email && (
                            <div>
                              <p className="text-white/50">Payment Email</p>
                              <p className="text-white font-medium">{contractorAgreement.payment_email}</p>
                            </div>
                          )}
                          {contractorAgreement.payment_phone && (
                            <div>
                              <p className="text-white/50">Phone</p>
                              <p className="text-white font-medium">{contractorAgreement.payment_phone}</p>
                            </div>
                          )}
                          {contractorAgreement.payment_country && (
                            <div>
                              <p className="text-white/50">Country</p>
                              <p className="text-white font-medium">{contractorAgreement.payment_country}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : contractorAgreement?.status === 'pending_review' ? (
                    /* Pending Review - Show submitted info */
                    <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-blue-400" />
                          <span className="font-semibold text-blue-400">Pending Admin Review</span>
                        </div>
                        <p className="text-sm text-white/70">
                          Signed by <span className="text-white font-medium">{contractorAgreement.signed_name}</span> on{' '}
                          {new Date(contractorAgreement.signed_at).toLocaleDateString('en-US', {
                            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </p>
                        {!isAdminView && (
                          <p className="text-sm text-white/50 mt-2">
                            An administrator will review and approve your agreement shortly.
                          </p>
                        )}
                      </div>
                      
                      {/* Agreement Text (Read Only) */}
                      <div className="bg-white/5 rounded-lg border border-white/10">
                        <div className="p-3 border-b border-white/10 bg-white/5">
                          <h3 className="font-semibold text-white text-sm">Agreement Terms</h3>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                          <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
                            {contractorAgreement.agreement_text}
                          </pre>
                        </div>
                      </div>
                      
                      {/* Signature Display */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-xs text-white/50 mb-2">Digital Signature</p>
                        <p className="text-lg font-script italic text-[#EC4899]">
                          {contractorAgreement.signature_text}
                        </p>
                      </div>
                      
                      {/* Payment Information */}
                      {(contractorAgreement.payment_first_name || contractorAgreement.payment_email || contractorAgreement.payment_phone) && (
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h4 className="text-xs text-white/50 mb-3 uppercase tracking-wider">Payment Information (Remitly)</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-white/50">Contact Email</p>
                              <p className="text-white font-medium">{contractorAgreement.contact_email || '-'}</p>
                            </div>
                            {contractorAgreement.payment_first_name && (
                              <div>
                                <p className="text-white/50">Name (on ID)</p>
                                <p className="text-white font-medium">{contractorAgreement.payment_first_name} {contractorAgreement.payment_last_name}</p>
                              </div>
                            )}
                            {contractorAgreement.payment_email && (
                              <div>
                                <p className="text-white/50">Payment Email</p>
                                <p className="text-white font-medium">{contractorAgreement.payment_email}</p>
                              </div>
                            )}
                            {contractorAgreement.payment_phone && (
                              <div>
                                <p className="text-white/50">Phone</p>
                                <p className="text-white font-medium">{contractorAgreement.payment_phone}</p>
                              </div>
                            )}
                            {contractorAgreement.payment_country && (
                              <div>
                                <p className="text-white/50">Country</p>
                                <p className="text-white font-medium">{contractorAgreement.payment_country}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Not submitted or Needs Correction - Sign Form */
                    <div className="space-y-4">
                      {contractorAgreement?.status === 'needs_correction' && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="font-semibold text-red-400">Correction Required</span>
                          </div>
                          <p className="text-sm text-white/70">
                            Your previous submission was not approved. Please review the feedback and sign again.
                          </p>
                          {contractorAgreement.admin_feedback && (
                            <p className="text-sm text-yellow-400 mt-2 p-2 bg-yellow-500/10 rounded">
                              <strong>Admin Feedback:</strong> {contractorAgreement.admin_feedback}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <p className="text-sm text-white/60">
                        Please read and sign the contractor agreement below. This is required to complete your onboarding.
                      </p>
                      
                      {/* Agreement Text */}
                      <div className="bg-white/5 rounded-lg border border-white/10">
                        <div className="p-3 border-b border-white/10 bg-white/5">
                          <h3 className="font-semibold text-white text-sm">Independent Contractor Agreement</h3>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                          <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
                            {contractorAgreement?.agreement_text || 'Loading agreement...'}
                          </pre>
                        </div>
                      </div>
                      
                      {/* Agreement Checkbox */}
                      <div className="flex items-start gap-3 p-4 bg-[#EC4899]/10 rounded-lg border border-[#EC4899]/30">
                        <input
                          type="checkbox"
                          id="agree-terms"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-5 h-5 mt-0.5 accent-[#EC4899]"
                        />
                        <label htmlFor="agree-terms" className="text-sm text-white cursor-pointer">
                          I have read, understood, and agree to all terms of this Independent Contractor Agreement.
                        </label>
                      </div>
                      
                      {/* Contractor Details Section */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                        <h4 className="font-semibold text-white text-sm border-b border-white/10 pb-2">
                          Contractor Information
                        </h4>
                        
                        {/* Contact Email */}
                        <div>
                          <label className="text-sm text-white/70 block mb-2">Contact Email *</label>
                          <input
                            type="email"
                            value={contractorEmail}
                            onChange={(e) => setContractorEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                          />
                        </div>
                        
                        {/* Payment Method Selection - Remitly */}
                        <div>
                          <label className="text-sm text-white/70 block mb-2">Payment Information (via Remitly)</label>
                          <p className="text-xs text-white/40 mb-2">We use Remitly to send payments. Upon processing your payment, you will receive a notification to select your preferred disbursement method.</p>
                          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 mb-4">
                            <p className="text-xs text-amber-300 font-medium">
                              ⚠️ Important: Your first and last name must match your government-issued ID exactly to receive payment.
                            </p>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Name Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-white/70 block mb-2">First Name (as on ID) *</label>
                                <input
                                  type="text"
                                  value={paymentFirstName}
                                  onChange={(e) => setPaymentFirstName(e.target.value)}
                                  placeholder="First name exactly as on ID"
                                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70 block mb-2">Last Name (as on ID) *</label>
                                <input
                                  type="text"
                                  value={paymentLastName}
                                  onChange={(e) => setPaymentLastName(e.target.value)}
                                  placeholder="Last name exactly as on ID"
                                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                                />
                              </div>
                            </div>
                            
                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-white/70 block mb-2">Email *</label>
                                <input
                                  type="email"
                                  value={paymentEmail}
                                  onChange={(e) => setPaymentEmail(e.target.value)}
                                  placeholder="Email for payment notifications"
                                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70 block mb-2">Phone Number *</label>
                                <input
                                  type="tel"
                                  value={paymentPhone}
                                  onChange={(e) => setPaymentPhone(e.target.value)}
                                  placeholder="Include country code (e.g., +63...)"
                                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                                />
                              </div>
                            </div>
                            
                            {/* Country */}
                            <div>
                              <label className="text-sm text-white/70 block mb-2">Country *</label>
                              <input
                                type="text"
                                value={paymentCountry}
                                onChange={(e) => setPaymentCountry(e.target.value)}
                                placeholder="Country where you will receive payment"
                                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Signature Fields */}
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                        <h4 className="font-semibold text-white text-sm border-b border-white/10 pb-2">
                          Electronic Signature
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-white/70 block mb-2">Full Legal Name *</label>
                            <input
                              type="text"
                              value={agreementName}
                              onChange={(e) => setAgreementName(e.target.value)}
                              placeholder="Enter your full legal name"
                              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-white/70 block mb-2">Signature (Type your name) *</label>
                            <input
                              type="text"
                              value={agreementSignature}
                              onChange={(e) => setAgreementSignature(e.target.value)}
                              placeholder="Type your signature"
                              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-[#EC4899] focus:outline-none font-script italic"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-white/40 text-center">
                          By typing your signature above, you agree that this constitutes a legal electronic signature.
                        </p>
                      </div>
                      
                      {/* Sign Button */}
                      <Button
                        onClick={handleSignContractorAgreement}
                        disabled={signingAgreement || !agreedToTerms || !agreementName || !agreementSignature || !contractorEmail}
                        className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {signingAgreement ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {contractorAgreement?.status === 'needs_correction' ? 'Re-submitting...' : 'Submitting...'}
                          </>
                        ) : (
                          <>
                            <FileSignature className="w-4 h-4 mr-2" />
                            {contractorAgreement?.status === 'needs_correction' ? 'Re-sign & Submit for Review' : 'Sign & Submit for Review'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          )}

          {/* W-8BEN Tax Form Section - Only show for remote workers */}
          {isRemoteWorker() && (
          <Collapsible open={w8benExpanded} onOpenChange={setW8benExpanded}>
            <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl shadow-2xl overflow-hidden border border-white/10" data-testid="w8ben-section">
              <div className="h-1.5 bg-gradient-to-r from-[#FF6B6B] via-[#FFE66D] to-[#4ECDC4]" />
              <CollapsibleTrigger asChild>
                <button 
                  className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  data-testid="w8ben-collapse-trigger"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#FFE66D]" />
                    <h2 className="font-poppins text-lg font-semibold text-white">
                      W-8BEN Tax Form
                    </h2>
                    {/* Action Required badge for remote workers without submitted W-8BEN */}
                    {isRemoteWorker() && (!w8benStatus?.status || w8benStatus?.status === 'not_submitted' || w8benStatus?.status === 'not_applicable') && (
                      <span className="bg-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-medium">
                        Action Required
                      </span>
                    )}
                    {w8benStatus?.total_documents > 0 && (
                      <span className="bg-[#FFE66D]/30 text-[#FFE66D] px-2 py-0.5 rounded-full text-xs font-medium">
                        {w8benStatus.total_documents}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-200 ${w8benExpanded ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-2">
                  <p className="text-sm text-white/60 mb-4">
                    If you are a foreign individual working for this company, submit your W-8BEN form here to certify your foreign status for U.S. tax purposes.
                  </p>

                  {/* W-8BEN Status and Links - Following W-9 pattern */}
                  <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FFE66D]" />
                        W-8BEN Form
                      </h3>
                      {w8benStatus?.status === 'submitted' || w8benStatus?.status === 'approved' ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                          Submitted
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-[#FFE66D]/20 text-[#FFE66D] rounded-full text-sm font-medium">
                          Not Submitted
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-sm text-white/70">
                        {w8benStatus?.status === 'submitted' || w8benStatus?.status === 'approved' 
                          ? "Your W-8BEN has been submitted. You can submit an updated form if needed."
                          : "No W-8BEN submissions yet. Download the form, fill it out, and upload it below."
                        }
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://www.irs.gov/pub/irs-pdf/fw8ben.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFE66D]/20 hover:bg-[#FFE66D]/30 text-[#FFE66D] rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download W-8BEN Form
                        </a>
                        <button
                          onClick={() => setShowW8benInstructions(!showW8benInstructions)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          {showW8benInstructions ? 'Hide Instructions' : 'View Instructions'}
                        </button>
                      </div>
                      
                      {/* Inline W-8BEN Instructions */}
                      {showW8benInstructions && (
                        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-[#FFE66D]/30">
                          <h4 className="text-[#FFE66D] font-semibold mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            W-8BEN Instructions for Foreign Contractors
                          </h4>
                          
                          <div className="space-y-4 text-sm text-white/80">
                            <div className="p-3 bg-[#FFE66D]/10 rounded-lg border-l-4 border-[#FFE66D]">
                              <p className="font-medium text-[#FFE66D] mb-1">Who needs this form?</p>
                              <p>If you are a foreign individual working as an independent contractor outside the United States, you must complete Form W-8BEN to certify your foreign status.</p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-white mb-2">Key Fields to Complete:</p>
                              <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                  <span className="text-[#FFE66D] font-bold">Line 1:</span>
                                  <span>Your full legal name as shown on your passport</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#FFE66D] font-bold">Line 2:</span>
                                  <span>Country of citizenship</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#FFE66D] font-bold">Line 3:</span>
                                  <span>Your permanent residence address (NOT a P.O. Box)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#FFE66D] font-bold">Line 4:</span>
                                  <span>Mailing address (if different from Line 3)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#FFE66D] font-bold">Line 6:</span>
                                  <span>Foreign tax ID number (if you have one - NOT required)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-[#FFE66D] font-bold">Line 8:</span>
                                  <span>Date of birth (MM-DD-YYYY format)</span>
                                </li>
                              </ul>
                            </div>
                            
                            <div className="p-3 bg-blue-500/10 rounded-lg border-l-4 border-blue-400">
                              <p className="font-medium text-blue-400 mb-1">Part II - Tax Treaty (Optional)</p>
                              <p>If your country has a tax treaty with the US, you may claim reduced withholding. Most contractors can skip this section if unsure.</p>
                            </div>
                            
                            <div className="p-3 bg-green-500/10 rounded-lg border-l-4 border-green-400">
                              <p className="font-medium text-green-400 mb-1">Certification (Required)</p>
                              <p>Sign and date the form at the bottom. Your signature certifies that the information is accurate.</p>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <a
                                href="https://www.irs.gov/pub/irs-pdf/iw8ben.pdf#page=6"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#FFE66D] hover:underline text-sm"
                              >
                                View full IRS instructions (Page 6 - Line-by-Line Instructions) →
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit W-8BEN Button */}
                  {!showW8benSubmitForm && (
                    <Button
                      onClick={() => setShowW8benSubmitForm(true)}
                      className="w-full mb-4 bg-gradient-to-r from-[#FFE66D] to-[#FF6B6B] hover:from-[#FF6B6B] hover:to-[#FFE66D] text-gray-900 font-semibold"
                      data-testid="submit-w8ben-btn"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit W-8BEN to Admin
                    </Button>
                  )}

                  {/* W-8BEN Submit Form */}
                  {showW8benSubmitForm && (
                    <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-white">Submit W-8BEN</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowW8benSubmitForm(false);
                            setW8benFormData({ file: null });
                          }}
                          className="text-white/60 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* File Upload */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-white/80 mb-1">
                          W-8BEN Document *
                        </label>
                        <div 
                          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                            w8benFormData.file 
                              ? 'border-[#FFE66D] bg-[#FFE66D]/10' 
                              : 'border-white/20 hover:border-[#FFE66D]/50'
                          }`}
                          onClick={() => w8benInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={w8benInputRef}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => setW8benFormData({ ...w8benFormData, file: e.target.files[0] })}
                          />
                          {w8benFormData.file ? (
                            <div className="flex items-center justify-center gap-2 text-[#FFE66D]">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-medium">{w8benFormData.file.name}</span>
                            </div>
                          ) : (
                            <div className="text-white/60">
                              <Upload className="w-6 h-6 mx-auto mb-1" />
                              <p className="text-sm">Click to select W-8BEN file</p>
                              <p className="text-xs text-white/40">PDF, JPG, or PNG</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        onClick={handleW8benSubmit}
                        disabled={!w8benFormData.file || uploadingW8ben}
                        className="w-full bg-gradient-to-r from-[#FFE66D] to-[#FF6B6B] hover:from-[#FF6B6B] hover:to-[#FFE66D] text-gray-900 font-semibold"
                        data-testid="submit-w8ben-form-btn"
                      >
                        {uploadingW8ben ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {uploadingW8ben ? "Submitting..." : "Submit W-8BEN"}
                      </Button>
                    </div>
                  )}

                  {/* W-8BEN Status Display */}
                  {w8benStatus?.has_w8ben && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-[#FFE66D]" />
                          Your W-8BEN Submissions
                        </h3>
                        <span className="bg-[#FFE66D]/30 text-[#FFE66D] px-2 py-0.5 rounded-full text-xs font-medium">
                          {w8benStatus.total_documents} document(s)
                        </span>
                      </div>

                      {w8benStatus.w8ben_documents?.map((doc) => (
                        <div key={doc.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#FFE66D]" />
                              <span className="text-sm text-white">{doc.filename}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              doc.status === 'approved' 
                                ? 'bg-green-500/20 text-green-400'
                                : doc.status === 'rejected' || doc.status === 'needs_correction'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-[#FFE66D]/20 text-[#FFE66D]'
                            }`}>
                              {doc.status === 'needs_correction' ? 'Needs Correction' : doc.status?.charAt(0).toUpperCase() + doc.status?.slice(1) || 'Submitted'}
                            </span>
                          </div>
                          <p className="text-xs text-white/40 mt-1">
                            Submitted: {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                          {/* View/Download button for employee */}
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  // Use admin endpoint when in admin view mode
                                  const endpoint = isAdminView && adminViewEmployee
                                    ? `${API}/admin/employees/${adminViewEmployee.id}/w8ben/${doc.id}/view`
                                    : `${API}/time/w8ben/${doc.id}/download`;
                                  const response = await axios.get(
                                    endpoint,
                                    { ...getAuthHeader(), responseType: 'blob' }
                                  );
                                  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                                  const url = window.URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                } catch (err) {
                                  console.error('Failed to open W-8BEN:', err);
                                  toast.error('Failed to open document');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#FFE66D]/20 hover:bg-[#FFE66D]/30 text-[#FFE66D] rounded-lg text-xs font-medium transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  // Use admin endpoint when in admin view mode
                                  const endpoint = isAdminView && adminViewEmployee
                                    ? `${API}/admin/employees/${adminViewEmployee.id}/w8ben/${doc.id}/download`
                                    : `${API}/time/w8ben/${doc.id}/download`;
                                  const response = await axios.get(
                                    endpoint,
                                    { ...getAuthHeader(), responseType: 'blob' }
                                  );
                                  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = doc.filename || 'w8ben.pdf';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } catch (err) {
                                  console.error('Failed to download W-8BEN:', err);
                                  toast.error('Failed to download document');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-xs font-medium transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                          {/* Show rejection feedback if needs correction */}
                          {doc.status === 'needs_correction' && doc.status_notes && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-xs text-red-400 font-medium">Admin Feedback:</p>
                              <p className="text-xs text-white/70 mt-1">{doc.status_notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!w8benStatus?.has_w8ben && !showW8benSubmitForm && (
                    <div className="text-center py-4 bg-white/5 rounded-xl border border-white/10">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-white/20" />
                      <p className="text-sm text-white/60">No W-8BEN submitted</p>
                      <p className="text-xs text-white/40 mt-1">Foreign employees should submit W-8BEN above</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          )}
          
          {/* 1099-NEC Forms Section - Collapsible */}
          {my1099s.count > 0 && (
            <Collapsible open={nec1099Expanded} onOpenChange={setNec1099Expanded}>
              <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl shadow-2xl overflow-hidden border border-white/10" data-testid="my-1099s-section">
                <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
                <CollapsibleTrigger asChild>
                  <button 
                    className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    data-testid="1099-collapse-trigger"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-[#00D4FF]" />
                      <h2 className="font-poppins text-lg font-semibold text-white">
                        1099-NEC Forms
                      </h2>
                      <span className="bg-[#00D4FF]/30 text-[#00D4FF] px-2 py-0.5 rounded-full text-xs font-medium">
                        {my1099s.count}
                      </span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-200 ${nec1099Expanded ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-2 space-y-3">
                    {my1099s.documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-4 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/30"
                        data-testid={`1099-doc-${doc.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#00D4FF]" />
                            <span className="font-medium text-white">1099-NEC - Tax Year {doc.year}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.status === 'filed' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                          }`}>
                            {doc.status === 'filed' ? 'Filed' : 'Draft'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-white/60 mb-3">
                          <span>Amount: </span>
                          <span className="text-[#00D4FF] font-semibold">
                            ${(doc.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="text-xs text-white/40 mb-3">
                          From: {doc.contractor_name || 'Thrifty Curator'}
                          {doc.created_at && ` • Issued ${new Date(doc.created_at).toLocaleDateString()}`}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                              const response = await axios.get(
                                `${API}/financials/my-1099s/${doc.id}/download?user_id=${storedUser.id}`,
                                { ...getAuthHeader(), responseType: 'blob' }
                              );
                              const contentType = response.headers['content-type'] || 'application/pdf';
                              const blob = new Blob([response.data], { type: contentType });
                              const url = window.URL.createObjectURL(blob);
                              setViewing1099({
                                url,
                                contentType,
                                docId: doc.id,
                                filename: `1099_NEC_${doc.year}.${contentType.includes('pdf') ? 'pdf' : contentType.includes('image') ? 'jpg' : 'file'}`,
                                year: doc.year,
                                amount: doc.amount_paid,
                                status: doc.status
                              });
                            } catch (error) {
                              console.error('Error loading 1099:', error);
                              toast.error("Failed to load 1099 document");
                            }
                          }}
                          className="w-full text-white/80 border-white/20 hover:bg-white/10 bg-transparent"
                          data-testid={`view-1099-${doc.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
          
        </motion.div>
      </main>
      </PullToRefresh>

      {/* 1099 Viewer Modal */}
      {viewing1099 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (viewing1099.url) window.URL.revokeObjectURL(viewing1099.url);
            setViewing1099(null);
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
                <h3 className="font-semibold text-white">1099-NEC Tax Document</h3>
                <p className="text-sm text-gray-300">
                  Tax Year {viewing1099.year} • ${(viewing1099.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  {viewing1099.status === 'filed' && <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Filed</span>}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (viewing1099.url) window.URL.revokeObjectURL(viewing1099.url);
                  setViewing1099(null);
                }}
                className="text-white hover:bg-white/20"
              >
                ✕
              </Button>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {viewing1099.contentType?.includes('pdf') ? (
                <iframe
                  src={viewing1099.url}
                  className="w-full h-full min-h-[500px] rounded-lg border border-gray-200"
                  title="1099-NEC Document"
                />
              ) : viewing1099.contentType?.includes('image') ? (
                <div className="flex items-center justify-center">
                  <img
                    src={viewing1099.url}
                    alt="1099-NEC Document"
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
                  if (viewing1099.url) window.URL.revokeObjectURL(viewing1099.url);
                  setViewing1099(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                    const response = await axios.get(
                      `${API}/financials/my-1099s/${viewing1099.docId}/download?user_id=${storedUser.id}`,
                      { ...getAuthHeader(), responseType: 'blob' }
                    );
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', viewing1099.filename || '1099_NEC.pdf');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success("1099-NEC downloaded!");
                  } catch (error) {
                    toast.error("Failed to download 1099-NEC");
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

      {/* Password Management Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowPasswordModal(false); resetPasswordForm(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              data-testid="password-modal"
            >
              {/* Header */}
              <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#1A1A2E]">Security Settings</h2>
                      <p className="text-sm text-gray-500">
                        {hasPassword ? "Manage your login password" : "Set up password protection"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowPasswordModal(false); resetPasswordForm(); }}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Password Status */}
                <div className={`p-4 rounded-xl mb-6 ${
                  hasPassword 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {hasPassword ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Password Protected</p>
                          <p className="text-sm text-green-600">Your account requires a password to login</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-amber-800">No Password Set</p>
                          <p className="text-sm text-amber-600">Set a password to secure your account</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Face ID / Biometric Section - Only show on native platform */}
                {isNativePlatform() && biometricAvailable && (
                  <div className="p-4 rounded-xl mb-6 bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-800">Face ID / Touch ID</p>
                          <p className="text-sm text-blue-600">Quick login with biometrics</p>
                        </div>
                      </div>
                      <button
                        onClick={handleResetFaceId}
                        disabled={resettingFaceId}
                        className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 rounded-lg transition-colors disabled:opacity-50"
                        style={{ touchAction: 'manipulation' }}
                        data-testid="reset-faceid-btn"
                      >
                        {resettingFaceId ? "Resetting..." : "Reset"}
                      </button>
                    </div>
                    <p className="text-xs text-blue-500 mt-2">
                      Reset if Face ID isn't working or you want to use a different account
                    </p>
                  </div>
                )}

                {/* Password Form */}
                <div className="space-y-4">
                  {/* Current Password - only shown if user already has password */}
                  {hasPassword && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="pr-10"
                          data-testid="current-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      {hasPassword ? "New Password" : "Password"}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={hasPassword ? "Enter new password" : "Create a password"}
                        className="pr-10"
                        data-testid="new-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Minimum 4 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Confirm Password</Label>
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      data-testid="confirm-password-input"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500">Passwords don't match</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => { setShowPasswordModal(false); resetPasswordForm(); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={hasPassword ? handleChangePassword : handleSetPassword}
                    disabled={
                      savingPassword || 
                      newPassword.length < 4 || 
                      newPassword !== confirmPassword ||
                      (hasPassword && !currentPassword)
                    }
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    data-testid="save-password-btn"
                  >
                    {savingPassword ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    {savingPassword ? "Saving..." : (hasPassword ? "Change Password" : "Set Password")}
                  </Button>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-purple-500" />
                    About Password Protection
                  </h4>
                  <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                    <li>Once set, you'll need to enter your password every time you log in</li>
                    <li>If you forget your password, contact your admin to reset it</li>
                    <li>Use a password that's easy for you to remember but hard for others to guess</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Full-Screen Messages Modal */}
      <AnimatePresence>
        {showFullScreenMessages && !isAdminView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1A1A2E] z-50 flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-[#00D4FF]" />
                <h2 className="text-xl font-bold text-white">Messages</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Mute toggle */}
                <button
                  onClick={() => {
                    const newMuted = !messagesMuted;
                    setMessagesMuted(newMuted);
                    localStorage.setItem('thrifty_curator_messages_muted', newMuted.toString());
                    toast.success(newMuted ? "Message notifications muted" : "Message notifications unmuted");
                  }}
                  className={`p-2 rounded-lg ${messagesMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70'} hover:bg-white/20`}
                  title={messagesMuted ? "Unmute notifications" : "Mute notifications"}
                  data-testid="mute-messages-btn"
                >
                  {messagesMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </button>
                {/* Close button */}
                <button
                  onClick={() => setShowFullScreenMessages(false)}
                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                  data-testid="close-fullscreen-messages-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Full-screen messaging content */}
            <div className="flex-1 overflow-hidden">
              <FullScreenMessaging
                userType="employee"
                userId={user?.id || user?.email}
                userName={user?.name || user?.email}
                userEmail={user?.email}
                getAuthHeader={() => ({
                  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                })}
                muted={messagesMuted}
                onUnreadChange={setUnreadMessageCount}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
