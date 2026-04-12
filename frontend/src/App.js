import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetail from "./pages/InspectionDetail";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/inspections/:id" element={<InspectionDetail />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
