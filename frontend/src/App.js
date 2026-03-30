import "@/App.css";
import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";
import PageTransition from "@/components/PageTransition";
import LandingPage from "@/pages/LandingPage";
import JobApplicationForm from "@/pages/JobApplicationForm";
import ConsignmentInquiryForm from "@/pages/ConsignmentInquiryForm";
import ConsignmentAgreementForm from "@/pages/ConsignmentAgreementForm";
import AuthPage from "@/pages/AuthPage";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ContactPage from "@/pages/ContactPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import TaxPrepPage from "@/pages/TaxPrepPage";
import TaxPrepStepPage from "@/pages/TaxPrepStepPage";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// App version - increment this on each release to force cache clear
const APP_VERSION = "1.0.5";

// Session timeout in milliseconds (1 hour)
const SESSION_TIMEOUT = 60 * 60 * 1000;

// Check if running in native app
const isNativeApp = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative;
};

// Clear all caches on version change
const clearCachesOnVersionChange = async () => {
  const storedVersion = localStorage.getItem("app_version");
  
  if (storedVersion !== APP_VERSION) {
    console.log(`[App] Version changed from ${storedVersion} to ${APP_VERSION}, clearing caches...`);
    
    // Clear service worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cache => caches.delete(cache)));
        console.log('[App] All caches cleared');
      } catch (e) {
        console.log('[App] Cache clear error:', e);
      }
    }
    
    // Tell service worker to update
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Force update check
        await registration.update();
        console.log('[App] Service worker update triggered');
      } catch (e) {
        console.log('[App] Service worker update error:', e);
      }
    }
    
    // Store new version
    localStorage.setItem("app_version", APP_VERSION);
    
    // Reload to get fresh content (only if we're not already in a reload loop)
    const reloadCount = parseInt(sessionStorage.getItem("reload_count") || "0");
    if (reloadCount < 1) {
      sessionStorage.setItem("reload_count", (reloadCount + 1).toString());
      window.location.reload(true);
    } else {
      sessionStorage.removeItem("reload_count");
    }
  }
};

// Run cache clear on app start
clearCachesOnVersionChange();

// Session management hook
const useSessionManager = () => {
  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("sessionStart");
  }, []);

  useEffect(() => {
    // Set session start time on login
    const token = localStorage.getItem("token");
    if (token && !localStorage.getItem("sessionStart")) {
      localStorage.setItem("sessionStart", Date.now().toString());
    }

    // Check session timeout
    const checkTimeout = () => {
      const sessionStart = localStorage.getItem("sessionStart");
      const token = localStorage.getItem("token");
      
      if (token && sessionStart) {
        const elapsed = Date.now() - parseInt(sessionStart);
        if (elapsed > SESSION_TIMEOUT) {
          console.log("Session expired after", SESSION_TIMEOUT / 60000, "minutes of inactivity");
          clearSession();
          window.location.href = "/login";
        }
      }
    };

    // Check timeout every minute
    const timeoutInterval = setInterval(checkTimeout, 60000);
    checkTimeout(); // Check immediately

    // NOTE: We no longer clear session on visibility change or app backgrounding
    // This was causing users to be logged out just from checking the lock screen
    // The session timeout (15 min) handles security instead

    return () => {
      clearInterval(timeoutInterval);
    };
  }, [clearSession]);

  // Reset session timer on user activity
  const resetSession = useCallback(() => {
    const token = localStorage.getItem("token");
    if (token) {
      localStorage.setItem("sessionStart", Date.now().toString());
    }
  }, []);

  return { clearSession, resetSession };
};

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, refresh recommended
              console.log('New content available, refresh for updates');
            }
          });
        });
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// Animated Routes component
function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <LandingPage />
          </PageTransition>
        } />
        <Route path="/job-application" element={
          <PageTransition>
            <JobApplicationForm />
          </PageTransition>
        } />
        <Route path="/consignment-inquiry" element={
          <PageTransition>
            <ConsignmentInquiryForm />
          </PageTransition>
        } />
        <Route path="/consignment-agreement" element={
          <PageTransition>
            <ConsignmentAgreementForm />
          </PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition>
            <AuthPage />
          </PageTransition>
        } />
        <Route path="/dashboard" element={
          <PageTransition>
            <EmployeeDashboard />
          </PageTransition>
        } />
        <Route path="/admin" element={
          <PageTransition>
            <AdminDashboard />
          </PageTransition>
        } />
        <Route path="/contact" element={
          <PageTransition>
            <ContactPage />
          </PageTransition>
        } />
        <Route path="/privacy-policy" element={
          <PageTransition>
            <PrivacyPolicyPage />
          </PageTransition>
        } />
        <Route path="/reset-password/:token" element={
          <PageTransition>
            <ResetPasswordPage />
          </PageTransition>
        } />
        <Route path="/admin/tax-prep" element={
          <PageTransition>
            <TaxPrepPage />
          </PageTransition>
        } />
        <Route path="/admin/tax-prep/step/:step" element={
          <PageTransition>
            <TaxPrepStepPage />
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  // Check sessionStorage synchronously on initial render to prevent flicker
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplash');
  });

  // Initialize session manager
  const { resetSession } = useSessionManager();

  // Reset session timer on user activity (clicks, key presses, touches)
  useEffect(() => {
    const handleActivity = () => {
      resetSession();
    };

    // Listen for user activity events
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [resetSession]);

  // Request push notifications only for logged-in users (employees/consignors/admins)
  useEffect(() => {
    const requestPushNotifications = async () => {
      try {
        // Only request notifications if user is logged in
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const consignorEmail = localStorage.getItem('consignorEmail');
        
        // Skip if no user is logged in (casual visitors don't need notifications)
        if (!user.id && !consignorEmail) {
          console.log('Skipping push notifications - no logged in user');
          return;
        }
        
        // Dynamic import to avoid issues on web
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const axios = (await import('axios')).default;
        
        console.log('Requesting push notification permissions for logged-in user...');
        
        // Request permissions
        const permResult = await PushNotifications.requestPermissions();
        console.log('Permission result:', permResult);
        
        if (permResult.receive === 'granted') {
          // First, try to get existing token directly (works on iOS even if registration event doesn't fire)
          try {
            const existingToken = await PushNotifications.getToken();
            if (existingToken?.value) {
              console.log('Got existing device push token via getToken():', existingToken.value);
              localStorage.setItem('devicePushToken', existingToken.value);
              localStorage.setItem('pendingPushToken', existingToken.value);
              
              // Try to register immediately if user is logged in
              if (user.id) {
                try {
                  const API = process.env.REACT_APP_BACKEND_URL;
                  await axios.post(`${API}/api/live-activity/register-device-token`, {
                    user_id: user.id,
                    device_token: existingToken.value
                  });
                  console.log('Device push token registered for notifications!');
                } catch (err) {
                  console.error('Failed to register device token:', err);
                }
              }
              return; // Got token, we're done
            }
          } catch (getTokenErr) {
            console.log('getToken() not available, falling back to registration event...');
          }
          
          // Fallback: Set up listener BEFORE registering to capture the token
          PushNotifications.addListener('registration', async (tokenData) => {
            console.log('DEVICE PUSH TOKEN received via registration event:', tokenData.value);
            
            // ALWAYS save to localStorage - iOS only fires this once!
            localStorage.setItem('devicePushToken', tokenData.value);
            localStorage.setItem('pendingPushToken', tokenData.value);
            console.log('Device push token saved to localStorage');
            
            // Try to register immediately if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (currentUser.id) {
              try {
                const API = process.env.REACT_APP_BACKEND_URL;
                await axios.post(`${API}/api/live-activity/register-device-token`, {
                  user_id: currentUser.id,
                  device_token: tokenData.value
                });
                console.log('Device token registered for push notifications!');
              } catch (err) {
                console.error('Failed to register device token:', err);
              }
            }
          });
          
          // Register for push notifications (may trigger registration event on first time)
          await PushNotifications.register();
          console.log('PushNotifications.register() called');
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        // Expected to fail on web - that's okay
        console.log('Push notification setup skipped (web or error):', error.message);
      }
    };

    // Wait for app to fully load, then request permissions (only if logged in)
    const timer = setTimeout(requestPushNotifications, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="app-background"
      style={{ 
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        backgroundColor: '#1A1A2E',
        minHeight: '100vh'
      }}
    >
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
      <Toaster 
        position="top-center" 
        richColors 
        toastOptions={{
          style: {
            marginTop: 'env(safe-area-inset-top, 50px)',
          },
        }}
        style={{
          top: 'env(safe-area-inset-top, 50px)',
        }}
      />
    </div>
  );
}

export default App;
