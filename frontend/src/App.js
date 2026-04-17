import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetail from "./pages/InspectionDetail";
import TieDownCalculator from "./pages/TieDownCalculator";
import HazMatWorksheet from "./pages/HazMatWorksheet";
import PhotoAnnotator from "./pages/PhotoAnnotator";
import Level3InspectionTool from "./pages/Level3InspectionTool";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/inspections/:id" element={<InspectionDetail />} />
          <Route path="/calculator" element={<TieDownCalculator />} />
          <Route path="/hazmat-worksheet" element={<HazMatWorksheet />} />
          <Route path="/photo-annotator" element={<PhotoAnnotator />} />
          <Route path="/level3" element={<Level3InspectionTool />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
