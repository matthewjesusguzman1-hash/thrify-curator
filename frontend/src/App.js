import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import JobApplicationForm from "@/pages/JobApplicationForm";
import ConsignmentInquiryForm from "@/pages/ConsignmentInquiryForm";
import ConsignmentAgreementForm from "@/pages/ConsignmentAgreementForm";
import AuthPage from "@/pages/AuthPage";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
  return (
    <div className="app-background">
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
    </div>
  );
}

export default App;
