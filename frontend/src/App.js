import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/app/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetail from "./pages/InspectionDetail";
import TieDownCalculator from "./pages/TieDownCalculator";
import HazMatWorksheet from "./pages/HazMatWorksheet";
import PhotoAnnotator from "./pages/PhotoAnnotator";
import Level3InspectionTool from "./pages/Level3InspectionTool";
import AdminPage from "./pages/AdminPage";
import BridgeChartPage from "./pages/BridgeChartPage";

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
      <Route path="/photo-annotator" element={<PhotoAnnotator />} />
      <Route path="/level3" element={<Level3InspectionTool />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/bridge-chart" element={<BridgeChartPage />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
