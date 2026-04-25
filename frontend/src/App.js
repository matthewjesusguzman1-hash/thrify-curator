import "@/App.css";
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/app/AuthContext";
import { LiteModeProvider } from "./components/app/LiteModeContext";
import SplashScreen from "./components/app/SplashScreen";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetail from "./pages/InspectionDetail";
import TieDownCalculator from "./pages/TieDownCalculator";
import HazMatWorksheet from "./pages/HazMatWorksheet";
// Photo Annotator hidden for pre-launch — pending full QA. Re-enable when ready.
// import PhotoAnnotator from "./pages/PhotoAnnotator";
// import QuickPhotos from "./pages/QuickPhotos";  // hidden pre-launch
import Level3InspectionTool from "./pages/Level3InspectionTool";
import AdminPage from "./pages/AdminPage";
import BridgeChartPage from "./pages/BridgeChartPage";
import HoursOfServicePage from "./pages/HoursOfServicePage";
import HosTrainingPage from "./pages/HosTrainingPage";
import SplitSleeperPage from "./pages/SplitSleeperPage";
import HosPracticePage from "./pages/HosPracticePage";
import ElpAssessmentPage from "./pages/ElpAssessmentPage";

const SPLASH_KEY = "inspnav_splash_v1";

function AppRoutes() {
  const { isLoggedIn, login } = useAuth();

  if (!isLoggedIn) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/inspections" element={<InspectionsPage />} />
      <Route path="/inspections/:id" element={<InspectionDetail />} />
      <Route path="/calculator" element={<TieDownCalculator />} />
      <Route path="/hazmat-worksheet" element={<HazMatWorksheet />} />
      {/* Photo pages hidden pre-launch — any deep link falls back to Inspections. */}
      <Route path="/photo-annotator" element={<Navigate to="/inspections" replace />} />
      <Route path="/quick-photos" element={<Navigate to="/inspections" replace />} />
      <Route path="/level3" element={<Level3InspectionTool />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/bridge-chart" element={<BridgeChartPage />} />
      <Route path="/hours-of-service" element={<HoursOfServicePage />} />
      <Route path="/hours-of-service/training" element={<HosTrainingPage />} />
      <Route path="/hours-of-service/split-sleeper" element={<SplitSleeperPage />} />
      <Route path="/hours-of-service/practice" element={<HosPracticePage />} />
      <Route path="/elp" element={<ElpAssessmentPage />} />
    </Routes>
  );
}

function App() {
  // Show splash once per tab/session so returning to a tab does not replay it every time.
  const [showSplash, setShowSplash] = useState(() => {
    try { return sessionStorage.getItem(SPLASH_KEY) !== "1"; } catch { return true; }
  });

  const dismissSplash = () => {
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch {}
    setShowSplash(false);
  };

  return (
    <div className="App">
      <AuthProvider>
        <LiteModeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          {showSplash && <SplashScreen onFinish={dismissSplash} />}
        </LiteModeProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
