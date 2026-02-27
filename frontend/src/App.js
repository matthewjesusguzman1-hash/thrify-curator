import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";
import LandingPage from "@/pages/LandingPage";
import JobApplicationForm from "@/pages/JobApplicationForm";
import ConsignmentInquiryForm from "@/pages/ConsignmentInquiryForm";
import ConsignmentAgreementForm from "@/pages/ConsignmentAgreementForm";
import AuthPage from "@/pages/AuthPage";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

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

function App() {
  // Check sessionStorage synchronously on initial render to prevent flicker
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplash');
  });

  return (
    <div className="app-background">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/job-application" element={<JobApplicationForm />} />
          <Route path="/consignment-inquiry" element={<ConsignmentInquiryForm />} />
          <Route path="/consignment-agreement" element={<ConsignmentAgreementForm />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<EmployeeDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
