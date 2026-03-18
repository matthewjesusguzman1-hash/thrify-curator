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
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Session timeout in milliseconds (15 minutes)
const SESSION_TIMEOUT = 15 * 60 * 1000;

// Check if running in native app
const isNativeApp = () => {
  return window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative;
};

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
          console.log("Session expired");
          clearSession();
          window.location.href = "/login";
        }
      }
    };

    // Check timeout every minute
    const timeoutInterval = setInterval(checkTimeout, 60000);
    checkTimeout(); // Check immediately

    // Handle app visibility change (for native app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isNativeApp()) {
        // App is being closed/backgrounded on native - clear session
        clearSession();
      }
    };

    // Handle page hide (for iOS)
    const handlePageHide = () => {
      if (isNativeApp()) {
        clearSession();
      }
    };

    // Handle Capacitor app state changes
    const handleAppStateChange = (state) => {
      if (state && !state.isActive && isNativeApp()) {
        clearSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    
    // Listen for Capacitor App state if available
    if (window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('appStateChange', handleAppStateChange);
    }

    return () => {
      clearInterval(timeoutInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (window.Capacitor?.Plugins?.App) {
        window.Capacitor.Plugins.App.removeAllListeners();
      }
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

  // Force push notification request - bypass platform detection
  useEffect(() => {
    const requestPushNotifications = async () => {
      try {
        // Dynamic import to avoid issues on web
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        console.log('Directly requesting push notification permissions...');
        
        // Request permissions
        const permResult = await PushNotifications.requestPermissions();
        console.log('Permission result:', permResult);
        
        if (permResult.receive === 'granted') {
          // Register for push notifications
          await PushNotifications.register();
          console.log('Successfully registered for push notifications!');
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        // Expected to fail on web - that's okay
        console.log('Push notification setup skipped (web or error):', error.message);
      }
    };

    // Wait for app to fully load, then request permissions
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
