import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Clock, 
  LogOut, 
  TrendingUp,
  Calendar,
  User,
  Home,
  Shield,
  UserPlus,
  UserMinus,
  UserCog,
  X,
  Trash2,
  FileText,
  Download,
  Bell,
  CheckCheck,
  LogIn,
  LogOutIcon,
  Edit3,
  DollarSign,
  Settings,
  CalendarDays,
  Mail,
  Eye,
  Briefcase,
  Package,
  FileSignature,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [summary, setSummary] = useState({ 
    total_employees: 0, 
    total_hours: 0, 
    total_shifts: 0,
    by_employee: []
  });
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showRemoveEmployee, setShowRemoveEmployee] = useState(false);
  const [selectedEmployeeToRemove, setSelectedEmployeeToRemove] = useState("");
  const [newEmployee, setNewEmployee] = useState({ name: "", email: "" });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [removingEmployee, setRemovingEmployee] = useState(false);
  
  // Employee details modal state
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState(false);
  
  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [emailingReport, setEmailingReport] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    employee_id: ""
  });
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
  // Edit time entry state
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({
    clock_in: "",
    clock_out: "",
    total_hours: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Add time entry state
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntryData, setNewEntryData] = useState({
    employee_id: "",
    clock_in: "",
    clock_out: ""
  });
  const [addingEntry, setAddingEntry] = useState(false);
  
  // Payroll state
  const [showPayroll, setShowPayroll] = useState(false);
  const [payrollSettings, setPayrollSettings] = useState({
    pay_period_start_date: "",
    default_hourly_rate: 15.00
  });
  const [payrollFilters, setPayrollFilters] = useState({
    period_type: "biweekly",
    period_index: 0,
    hourly_rate: "",
    employee_id: "",
    custom_start: "",
    custom_end: ""
  });
  const [payrollReport, setPayrollReport] = useState(null);
  const [emailingPayroll, setEmailingPayroll] = useState(false);
  
  // Employee rate editing state
  const [editingRateId, setEditingRateId] = useState(null);
  const [editingRateValue, setEditingRateValue] = useState("");
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [showPayrollSettings, setShowPayrollSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Edit employee modal state
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editEmployeeData, setEditEmployeeData] = useState({
    name: "",
    email: "",
    role: "employee",
    hourly_rate: ""
  });
  const [savingEmployee, setSavingEmployee] = useState(false);

  // Form submissions state
  const [formSubmissions, setFormSubmissions] = useState({
    jobApplications: [],
    consignmentInquiries: [],
    consignmentAgreements: []
  });
  const [formsSummary, setFormsSummary] = useState({
    job_applications: { total: 0, new: 0 },
    consignment_inquiries: { total: 0, new: 0 },
    consignment_agreements: { total: 0, new: 0 }
  });
  const [activeFormTab, setActiveFormTab] = useState("job_applications");
  const [loadingForms, setLoadingForms] = useState(false);
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showFormsSection, setShowFormsSection] = useState(false);

  // Collapsible sections state
  const [showStatsSection, setShowStatsSection] = useState(true);
  const [showHoursByEmployee, setShowHoursByEmployee] = useState(true);
  const [showAllEmployees, setShowAllEmployees] = useState(true);
  const [showTimeEntries, setShowTimeEntries] = useState(true);

  const getAuthHeader = useCallback(() => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  }), []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/notifications`, getAuthHeader());
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [getAuthHeader]);

  const fetchPayrollSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/payroll/settings`, getAuthHeader());
      setPayrollSettings(response.data);
      setPayrollFilters(prev => ({
        ...prev,
        hourly_rate: response.data.default_hourly_rate?.toString() || "15.00"
      }));
    } catch (error) {
      console.error("Failed to fetch payroll settings:", error);
    }
  }, [getAuthHeader]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      toast.error("Admin access required");
      navigate("/dashboard");
      return;
    }

    setUser(parsedUser);
    fetchData();
    fetchNotifications();
    fetchPayrollSettings();
    
    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollInterval);
  }, [navigate, fetchNotifications, fetchPayrollSettings]);

  const fetchData = async () => {
    try {
      const [employeesRes, entriesRes, summaryRes] = await Promise.all([
        axios.get(`${API}/admin/employees`, getAuthHeader()),
        axios.get(`${API}/admin/time-entries`, getAuthHeader()),
        axios.get(`${API}/admin/summary`, getAuthHeader())
      ]);

      setEmployees(employeesRes.data);
      setTimeEntries(entriesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  const fetchFormSubmissions = useCallback(async () => {
    setLoadingForms(true);
    try {
      const [jobAppsRes, inquiriesRes, agreementsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/admin/forms/job-applications`, getAuthHeader()),
        axios.get(`${API}/admin/forms/consignment-inquiries`, getAuthHeader()),
        axios.get(`${API}/admin/forms/consignment-agreements`, getAuthHeader()),
        axios.get(`${API}/admin/forms/summary`, getAuthHeader())
      ]);

      setFormSubmissions({
        jobApplications: jobAppsRes.data,
        consignmentInquiries: inquiriesRes.data,
        consignmentAgreements: agreementsRes.data
      });
      setFormsSummary(summaryRes.data);
    } catch (error) {
      console.error("Failed to fetch form submissions:", error);
      toast.error("Failed to load form submissions");
    } finally {
      setLoadingForms(false);
    }
  }, [getAuthHeader]);

  // Fetch form submissions when section is opened
  useEffect(() => {
    if (showFormsSection) {
      fetchFormSubmissions();
    }
  }, [showFormsSection, fetchFormSubmissions]);

  const handleUpdateSubmissionStatus = async (formType, submissionId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const endpoint = formType === "job_applications" 
        ? "job-applications" 
        : formType === "consignment_inquiries" 
          ? "consignment-inquiries" 
          : "consignment-agreements";
      
      await axios.put(
        `${API}/admin/forms/${endpoint}/${submissionId}/status`,
        { status: newStatus },
        getAuthHeader()
      );
      
      toast.success("Status updated successfully");
      fetchFormSubmissions();
      
      // Update selected submission if viewing details
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteSubmission = async (formType, submissionId) => {
    if (!window.confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
      return;
    }
    
    try {
      const endpoint = formType === "job_applications" 
        ? "job-applications" 
        : formType === "consignment_inquiries" 
          ? "consignment-inquiries" 
          : "consignment-agreements";
      
      await axios.delete(
        `${API}/admin/forms/${endpoint}/${submissionId}`,
        getAuthHeader()
      );
      
      toast.success("Submission deleted successfully");
      setShowSubmissionDetails(false);
      setSelectedSubmission(null);
      fetchFormSubmissions();
    } catch (error) {
      toast.error("Failed to delete submission");
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { bg: "bg-blue-100", text: "text-blue-700", icon: AlertCircle },
      reviewed: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Eye },
      contacted: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      archived: { bg: "bg-gray-100", text: "text-gray-700", icon: Archive }
    };
    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status || "new"}
      </span>
    );
  };

  const formatSubmissionDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API}/admin/notifications/mark-read`, {}, getAuthHeader());
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleClearNotifications = async () => {
    try {
      await axios.delete(`${API}/admin/notifications`, getAuthHeader());
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const formatNotificationTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddingEmployee(true);

    try {
      await axios.post(`${API}/admin/create-employee`, newEmployee, getAuthHeader());
      toast.success(`Employee ${newEmployee.name} created successfully!`);
      setNewEmployee({ name: "", email: "" });
      setShowAddEmployee(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create employee");
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleRemoveEmployeeSubmit = async () => {
    if (!selectedEmployeeToRemove) {
      toast.error("Please select an employee");
      return;
    }
    
    const emp = employees.find(e => e.id === selectedEmployeeToRemove);
    if (!emp) return;
    
    setRemovingEmployee(true);
    try {
      await axios.delete(`${API}/admin/employees/${selectedEmployeeToRemove}`, getAuthHeader());
      toast.success(`${emp.name} has been removed`);
      setShowRemoveEmployee(false);
      setSelectedEmployeeToRemove("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete employee");
    } finally {
      setRemovingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to delete ${employeeName}? This will also delete all their time entries.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/employees/${employeeId}`, getAuthHeader());
      toast.success(`${employeeName} has been removed`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete employee");
    }
  };

  const handleViewEmployeeDetails = async (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetails(true);
    setLoadingEmployeeDetails(true);
    
    try {
      // Get employee's shifts
      const shiftsForEmployee = timeEntries.filter(e => e.user_id === employee.id);
      setEmployeeShifts(shiftsForEmployee);
    } catch (error) {
      console.error("Failed to load employee details:", error);
    } finally {
      setLoadingEmployeeDetails(false);
    }
  };

  const getEmployeeStats = (employeeId) => {
    const empEntries = timeEntries.filter(e => e.user_id === employeeId && e.total_hours);
    const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const totalShifts = empEntries.length;
    return { totalHours: totalHours.toFixed(2), totalShifts };
  };

  // Edit time entry handlers
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    // Convert ISO strings to local datetime-local input format
    const formatForInput = (isoString) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    };
    setEditFormData({
      clock_in: formatForInput(entry.clock_in),
      clock_out: formatForInput(entry.clock_out),
      total_hours: entry.total_hours?.toString() || ""
    });
    setShowEditEntry(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);

    try {
      const updateData = {};
      if (editFormData.clock_in) {
        updateData.clock_in = new Date(editFormData.clock_in).toISOString();
      }
      if (editFormData.clock_out) {
        updateData.clock_out = new Date(editFormData.clock_out).toISOString();
      }

      await axios.put(
        `${API}/admin/time-entries/${editingEntry.id}`,
        updateData,
        getAuthHeader()
      );
      
      toast.success("Time entry updated successfully!");
      setShowEditEntry(false);
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update time entry");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this time entry?")) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/time-entries/${entryId}`, getAuthHeader());
      toast.success("Time entry deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete time entry");
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setAddingEntry(true);

    try {
      const entryPayload = {
        employee_id: newEntryData.employee_id,
        clock_in: new Date(newEntryData.clock_in).toISOString()
      };
      
      if (newEntryData.clock_out) {
        entryPayload.clock_out = new Date(newEntryData.clock_out).toISOString();
      }

      await axios.post(`${API}/admin/time-entries`, entryPayload, getAuthHeader());
      
      toast.success("Time entry created successfully!");
      setShowAddEntry(false);
      setNewEntryData({ employee_id: "", clock_in: "", clock_out: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create time entry");
    } finally {
      setAddingEntry(false);
    }
  };

  // Payroll handlers
  const handleGeneratePayrollReport = async () => {
    setPayrollLoading(true);
    try {
      const payload = {
        period_type: payrollFilters.period_type,
        period_index: parseInt(payrollFilters.period_index) || 0,
        hourly_rate: parseFloat(payrollFilters.hourly_rate) || null,
        employee_id: payrollFilters.employee_id || null
      };
      
      if (payrollFilters.period_type === "custom") {
        payload.start_date = payrollFilters.custom_start;
        payload.end_date = payrollFilters.custom_end;
      }

      const response = await axios.post(`${API}/admin/payroll/report`, payload, getAuthHeader());
      setPayrollReport(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate payroll report");
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleDownloadPayrollPDF = async () => {
    try {
      const payload = {
        period_type: payrollFilters.period_type,
        period_index: parseInt(payrollFilters.period_index) || 0,
        hourly_rate: parseFloat(payrollFilters.hourly_rate) || null,
        employee_id: payrollFilters.employee_id || null
      };
      
      if (payrollFilters.period_type === "custom") {
        payload.start_date = payrollFilters.custom_start;
        payload.end_date = payrollFilters.custom_end;
      }

      const response = await axios.post(`${API}/admin/payroll/report/pdf`, payload, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const handleSavePayrollSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await axios.put(`${API}/admin/payroll/settings`, {
        id: "payroll_settings",
        pay_period_start_date: payrollSettings.pay_period_start_date,
        default_hourly_rate: parseFloat(payrollSettings.default_hourly_rate) || 15.00
      }, getAuthHeader());
      
      toast.success("Payroll settings saved!");
      setShowPayrollSettings(false);
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const getPeriodLabel = (periodType, periodIndex) => {
    const index = parseInt(periodIndex);
    if (periodType === "biweekly") {
      if (index === 0) return "Current Pay Period";
      if (index === -1) return "Last Pay Period";
      if (index === -2) return "2 Periods Ago";
      return `${Math.abs(index)} Periods ${index > 0 ? 'From Now' : 'Ago'}`;
    }
    if (periodType === "monthly") {
      const date = new Date();
      date.setMonth(date.getMonth() + index);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (periodType === "yearly") {
      return (new Date().getFullYear() + index).toString();
    }
    return "Custom Period";
  };

  const handleUpdateEmployeeRate = async (employeeId) => {
    const rate = parseFloat(editingRateValue);
    if (isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }
    
    try {
      await axios.put(`${API}/admin/employees/${employeeId}/rate`, {
        hourly_rate: rate
      }, getAuthHeader());
      
      toast.success("Hourly rate updated!");
      setEditingRateId(null);
      setEditingRateValue("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update rate");
    }
  };

  // Edit employee handlers
  const handleOpenEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEditEmployeeData({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      hourly_rate: employee.hourly_rate?.toString() || ""
    });
    setShowEditEmployee(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setSavingEmployee(true);
    try {
      const updatePayload = {
        name: editEmployeeData.name,
        email: editEmployeeData.email,
        role: editEmployeeData.role
      };
      
      // Only include hourly_rate if it's a valid number
      if (editEmployeeData.hourly_rate !== "") {
        const rate = parseFloat(editEmployeeData.hourly_rate);
        if (!isNaN(rate) && rate >= 0) {
          updatePayload.hourly_rate = rate;
        }
      }
      
      await axios.put(`${API}/admin/employees/${editingEmployee.id}`, updatePayload, getAuthHeader());
      
      toast.success(`${editEmployeeData.name}'s details updated successfully!`);
      setShowEditEmployee(false);
      setEditingEmployee(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update employee");
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const response = await axios.post(`${API}/admin/reports`, {
        start_date: reportFilters.start_date,
        end_date: reportFilters.end_date,
        employee_id: reportFilters.employee_id || null
      }, getAuthHeader());
      setReportData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const handleEmailShiftReport = async () => {
    if (!reportData) return;
    
    const email = prompt("Enter email address to send the report:", user?.email || ADMIN_EMAIL);
    if (!email) return;
    
    setEmailingReport(true);
    try {
      await axios.post(`${API}/admin/reports/email`, {
        recipient_email: email,
        report_data: reportData
      }, getAuthHeader());
      
      toast.success(`Report sent to ${email}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send report");
    } finally {
      setEmailingReport(false);
    }
  };

  const handleEmailPayrollReport = async () => {
    if (!payrollReport) return;
    
    const email = prompt("Enter email address to send the report:", user?.email || ADMIN_EMAIL);
    if (!email) return;
    
    setEmailingPayroll(true);
    try {
      await axios.post(`${API}/admin/payroll/report/email`, {
        recipient_email: email,
        report_data: payrollReport
      }, getAuthHeader());
      
      toast.success(`Payroll report sent to ${email}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send payroll report");
    } finally {
      setEmailingPayroll(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
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
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!user) return null;

  return (
    <div className="dashboard-container" data-testid="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C5A065]/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#C5A065]" />
          </div>
          <div>
            <p className="font-semibold text-[#333]" data-testid="admin-name">{user.name}</p>
            <p className="text-sm text-[#C5A065] font-medium">Administrator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#666] relative"
              onClick={() => setShowNotifications(!showNotifications)}
              data-testid="notification-bell"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium" data-testid="notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#eee] z-50 overflow-hidden"
                  data-testid="notification-dropdown"
                >
                  <div className="p-3 border-b border-[#eee] flex items-center justify-between">
                    <h3 className="font-semibold text-[#333] text-sm">Notifications</h3>
                    <div className="flex gap-1">
                      {unreadCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-[#666]"
                          onClick={handleMarkAllRead}
                          data-testid="mark-all-read-btn"
                        >
                          <CheckCheck className="w-3 h-3 mr-1" />
                          Mark all read
                        </Button>
                      )}
                      {notifications.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-red-500 hover:text-red-600"
                          onClick={handleClearNotifications}
                          data-testid="clear-notifications-btn"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-[#888] text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-3 border-b border-[#f5f5f5] last:border-0 hover:bg-[#faf7f2] transition-colors ${!notification.read ? 'bg-[#F8C8DC]/10' : ''}`}
                          data-testid={`notification-item-${notification.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              notification.type === 'clock_in' 
                                ? 'bg-green-100' 
                                : 'bg-red-100'
                            }`}>
                              {notification.type === 'clock_in' 
                                ? <LogIn className="w-4 h-4 text-green-600" />
                                : <LogOutIcon className="w-4 h-4 text-red-600" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#333] font-medium">{notification.message}</p>
                              {notification.details?.total_hours && (
                                <p className="text-xs text-[#666] mt-1">
                                  Today: {notification.details.today_hours}h • Week: {notification.details.week_hours}h
                                </p>
                              )}
                              <p className="text-xs text-[#aaa] mt-1">
                                {formatNotificationTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-[#F8C8DC] rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/">
            <Button variant="ghost" size="sm" className="text-[#666]" data-testid="home-btn">
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-[#666]" data-testid="my-dashboard-btn">
              My Dashboard
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-[#666]"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      <main className="dashboard-content min-h-screen">
        {/* Bold Gradient Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493] -mx-8 -mt-8 mb-6 rounded-b-lg" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="font-poppins text-2xl md:text-3xl font-bold text-[#1A1A2E]">Admin Dashboard</h1>
            <div className="flex gap-3">
              {/* Reports Stack */}
              <div className="flex flex-col gap-1">
                <Button 
                  onClick={() => setShowPayroll(true)}
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#00D4FF]/30 transition-all border-0"
                  data-testid="payroll-btn"
                >
                  <DollarSign className="w-4 h-4" />
                  Payroll
                </Button>
                <Button 
                  onClick={() => setShowReport(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-2 border-[#1A1A2E] text-[#1A1A2E] font-semibold hover:bg-[#1A1A2E] hover:text-white transition-all"
                  data-testid="run-report-btn"
                >
                  <FileText className="w-4 h-4" />
                  Run Report
                </Button>
              </div>
              {/* Employee Management Stack */}
              <div className="flex flex-col gap-1">
                <Button 
                  onClick={() => setShowAddEmployee(true)}
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#FF1493]/30 transition-all border-0"
                  data-testid="add-employee-btn"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Employee
                </Button>
                <Button 
                  onClick={() => setShowRemoveEmployee(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-2 border-red-500 text-red-500 font-semibold hover:bg-red-500 hover:text-white transition-all"
                  data-testid="remove-employee-btn"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove Employee
                </Button>
              </div>
              {/* Edit Employee */}
              <Button 
                onClick={() => setShowEditEmployee(true)}
                size="sm"
                className="flex items-center gap-2 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#8B5CF6]/30 transition-all border-0 self-start"
                data-testid="edit-employee-btn"
              >
                <UserCog className="w-4 h-4" />
                Edit Employee
              </Button>
            </div>
          </div>

          {/* Add Employee Modal */}
          {showAddEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddEmployee(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-xl overflow-hidden w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="add-employee-modal"
              >
                <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#E91E8C]" />
                <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Add New Employee</h2>
                  <button
                    onClick={() => setShowAddEmployee(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddEmployee}>
                  <div className="form-group">
                    <Label className="form-label">Full Name *</Label>
                    <Input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      required
                      placeholder="Employee name"
                      className="form-input"
                      data-testid="new-employee-name"
                    />
                  </div>

                  <div className="form-group">
                    <Label className="form-label">Email *</Label>
                    <Input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      required
                      placeholder="employee@email.com"
                      className="form-input"
                      data-testid="new-employee-email"
                    />
                    <p className="text-xs text-[#888] mt-1">This email will be used for login</p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddEmployee(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addingEmployee}
                      className="btn-primary flex-1"
                      data-testid="submit-new-employee-btn"
                    >
                      {addingEmployee ? "Creating..." : "Create Employee"}
                    </Button>
                  </div>
                </form>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Remove Employee Modal */}
          {showRemoveEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowRemoveEmployee(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="remove-employee-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Remove Employee</h2>
                  <button
                    onClick={() => setShowRemoveEmployee(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-red-600">
                    Warning: This will permanently delete the employee and all their time entries. This action cannot be undone.
                  </p>
                </div>

                <div className="form-group">
                  <Label className="form-label">Select Employee to Remove</Label>
                  <Select
                    value={selectedEmployeeToRemove}
                    onValueChange={setSelectedEmployeeToRemove}
                  >
                    <SelectTrigger className="form-input" data-testid="remove-employee-select">
                      <SelectValue placeholder="Select an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.role !== 'admin').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedEmployeeToRemove && (
                  <div className="mt-4 p-3 bg-[#F9F6F7] rounded-xl">
                    {(() => {
                      const emp = employees.find(e => e.id === selectedEmployeeToRemove);
                      const stats = getEmployeeStats(selectedEmployeeToRemove);
                      return emp ? (
                        <div className="text-sm">
                          <p className="font-medium text-[#333]">{emp.name}</p>
                          <p className="text-[#666]">{emp.email}</p>
                          <p className="text-[#888] mt-2">
                            {stats.totalShifts} shifts • {stats.totalHours} hours logged
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRemoveEmployee(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRemoveEmployeeSubmit}
                    disabled={removingEmployee || !selectedEmployeeToRemove}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    data-testid="confirm-remove-employee-btn"
                  >
                    {removingEmployee ? "Removing..." : "Remove Employee"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Edit Employee Modal */}
          {showEditEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowEditEmployee(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="edit-employee-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Edit Employee</h2>
                  <button
                    onClick={() => setShowEditEmployee(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Employee Selection (when not editing a specific employee) */}
                {!editingEmployee ? (
                  <div className="form-group">
                    <Label className="form-label">Select Employee to Edit</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const emp = employees.find(e => e.id === value);
                        if (emp) handleOpenEditEmployee(emp);
                      }}
                    >
                      <SelectTrigger className="form-input" data-testid="edit-employee-select">
                        <SelectValue placeholder="Select an employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.role !== 'admin').map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateEmployee}>
                    <div className="mb-4 p-3 bg-[#F9F6F7] rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#D48C9E]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#333]">{editingEmployee.name}</p>
                        <p className="text-xs text-[#888]">Editing employee details</p>
                      </div>
                    </div>

                    <div className="form-group">
                      <Label className="form-label">Full Name *</Label>
                      <Input
                        type="text"
                        value={editEmployeeData.name}
                        onChange={(e) => setEditEmployeeData({ ...editEmployeeData, name: e.target.value })}
                        required
                        placeholder="Employee name"
                        className="form-input"
                        data-testid="edit-employee-name"
                      />
                    </div>

                    <div className="form-group">
                      <Label className="form-label">Email *</Label>
                      <Input
                        type="email"
                        value={editEmployeeData.email}
                        onChange={(e) => setEditEmployeeData({ ...editEmployeeData, email: e.target.value })}
                        required
                        placeholder="employee@email.com"
                        className="form-input"
                        data-testid="edit-employee-email"
                      />
                    </div>

                    <div className="form-group">
                      <Label className="form-label">Role *</Label>
                      <Select
                        value={editEmployeeData.role}
                        onValueChange={(value) => setEditEmployeeData({ ...editEmployeeData, role: value })}
                      >
                        <SelectTrigger className="form-input" data-testid="edit-employee-role">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#888] mt-1">Changing to Admin gives full dashboard access</p>
                    </div>

                    <div className="form-group">
                      <Label className="form-label">Hourly Rate</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[#666] text-sm font-medium">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editEmployeeData.hourly_rate}
                          onChange={(e) => setEditEmployeeData({ ...editEmployeeData, hourly_rate: e.target.value })}
                          placeholder={payrollSettings.default_hourly_rate?.toFixed(2) || "15.00"}
                          className="form-input flex-1"
                          data-testid="edit-employee-rate"
                        />
                      </div>
                      <p className="text-xs text-[#888] mt-1">
                        Default rate: ${payrollSettings.default_hourly_rate?.toFixed(2) || "15.00"}/hr (used if empty)
                      </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditEmployee(false);
                          setEditingEmployee(null);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={savingEmployee}
                        className="btn-primary flex-1"
                        data-testid="save-employee-btn"
                      >
                        {savingEmployee ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Employee Details Modal */}
          {showEmployeeDetails && selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
              onClick={() => setShowEmployeeDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8"
                onClick={(e) => e.stopPropagation()}
                data-testid="employee-details-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedEmployee.role === 'admin' ? 'bg-[#C5A065]/20' : 'bg-[#F8C8DC]/30'
                    }`}>
                      {selectedEmployee.role === 'admin' ? (
                        <Shield className="w-6 h-6 text-[#C5A065]" />
                      ) : (
                        <User className="w-6 h-6 text-[#D48C9E]" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-playfair text-xl font-bold text-[#333]">{selectedEmployee.name}</h2>
                      <p className="text-sm text-[#888]">{selectedEmployee.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEmployeeDetails(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-[#F9F6F7] rounded-xl">
                    <div className="flex items-center gap-2 text-[#888] mb-1">
                      <Mail className="w-4 h-4" />
                      <span className="text-xs">Email</span>
                    </div>
                    <p className="font-medium text-[#333]">{selectedEmployee.email}</p>
                  </div>
                  <div className="p-4 bg-[#F9F6F7] rounded-xl">
                    <div className="flex items-center gap-2 text-[#888] mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs">Hourly Rate</span>
                    </div>
                    <p className="font-medium text-[#333]">
                      {selectedEmployee.hourly_rate ? `$${selectedEmployee.hourly_rate.toFixed(2)}/hr` : 'Not set'}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F9F6F7] rounded-xl">
                    <div className="flex items-center gap-2 text-[#888] mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Joined</span>
                    </div>
                    <p className="font-medium text-[#333]">{formatDateTime(selectedEmployee.created_at)}</p>
                  </div>
                  <div className="p-4 bg-[#C5A065]/10 rounded-xl">
                    <div className="flex items-center gap-2 text-[#888] mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Total Hours</span>
                    </div>
                    <p className="font-bold text-[#C5A065] text-lg">
                      {getEmployeeStats(selectedEmployee.id).totalHours} hrs
                    </p>
                  </div>
                </div>

                {/* Recent Shifts */}
                <div>
                  <h3 className="font-semibold text-[#333] mb-3">Recent Shifts</h3>
                  {loadingEmployeeDetails ? (
                    <p className="text-center text-[#888] py-4">Loading...</p>
                  ) : employeeShifts.length === 0 ? (
                    <p className="text-center text-[#888] py-4">No shifts recorded</p>
                  ) : (
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Hours</th>
                            <th>Edit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeShifts.slice(0, 10).map((shift) => (
                            <tr key={shift.id}>
                              <td>{new Date(shift.clock_in).toLocaleDateString()}</td>
                              <td>{new Date(shift.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                              <td>
                                {shift.clock_out 
                                  ? new Date(shift.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                  : <span className="text-green-500">Active</span>
                                }
                              </td>
                              <td>
                                {shift.total_hours 
                                  ? `${shift.total_hours.toFixed(2)} hrs`
                                  : '-'
                                }
                              </td>
                              <td>
                                <button
                                  onClick={() => {
                                    setShowEmployeeDetails(false);
                                    handleEditEntry(shift);
                                  }}
                                  className="text-[#C5A065] hover:text-[#9A7B4F] p-1"
                                  title="Edit shift"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {selectedEmployee.role !== 'admin' && (
                  <div className="mt-6 pt-4 border-t border-[#eee] flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowEmployeeDetails(false);
                        setEditingRateId(selectedEmployee.id);
                        setEditingRateValue(selectedEmployee.hourly_rate?.toString() || "");
                      }}
                      className="flex items-center gap-1"
                    >
                      <DollarSign className="w-3 h-3" />
                      Edit Rate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowEmployeeDetails(false);
                        setShowAddEntry(true);
                        setNewEntryData({ ...newEntryData, employee_id: selectedEmployee.id });
                      }}
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      Add Shift
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowEmployeeDetails(false);
                        handleDeleteEmployee(selectedEmployee.id, selectedEmployee.name);
                      }}
                      className="flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Report Modal */}
          {showReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
              onClick={() => { setShowReport(false); setReportData(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl my-8"
                onClick={(e) => e.stopPropagation()}
                data-testid="report-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Shift Report</h2>
                  <button
                    onClick={() => { setShowReport(false); setReportData(null); }}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Report Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label className="form-label">Start Date</Label>
                    <Input
                      type="date"
                      value={reportFilters.start_date}
                      onChange={(e) => setReportFilters({ ...reportFilters, start_date: e.target.value })}
                      className="form-input"
                      data-testid="report-start-date"
                    />
                  </div>
                  <div>
                    <Label className="form-label">End Date</Label>
                    <Input
                      type="date"
                      value={reportFilters.end_date}
                      onChange={(e) => setReportFilters({ ...reportFilters, end_date: e.target.value })}
                      className="form-input"
                      data-testid="report-end-date"
                    />
                  </div>
                  <div>
                    <Label className="form-label">Employee (Optional)</Label>
                    <Select
                      value={reportFilters.employee_id || "all"}
                      onValueChange={(value) => setReportFilters({ ...reportFilters, employee_id: value === "all" ? "" : value })}
                    >
                      <SelectTrigger className="form-input" data-testid="report-employee-select">
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.filter(e => e.role !== 'admin').map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  className="btn-primary w-full mb-6"
                  data-testid="generate-report-btn"
                >
                  {reportLoading ? "Generating..." : "Generate Report"}
                </Button>

                {/* Report Results */}
                {reportData && (
                  <div className="space-y-6">
                    {/* Email Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleEmailShiftReport}
                        disabled={emailingReport}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-[#8BA88E] text-[#8BA88E]"
                        data-testid="email-shift-report-btn"
                      >
                        <Mail className="w-4 h-4" />
                        {emailingReport ? "Sending..." : "Email Report"}
                      </Button>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-[#F9F6F7] rounded-xl p-4">
                      <h3 className="font-semibold text-[#333] mb-3">Report Summary</h3>
                      <p className="text-sm text-[#666] mb-2">
                        Period: {formatDate(reportData.period.start)} - {formatDate(reportData.period.end)}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#333]">{reportData.summary.total_hours}</p>
                          <p className="text-xs text-[#888]">Total Hours</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#333]">{reportData.summary.total_shifts}</p>
                          <p className="text-xs text-[#888]">Total Shifts</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#333]">{reportData.summary.employee_count}</p>
                          <p className="text-xs text-[#888]">Employees</p>
                        </div>
                      </div>
                    </div>

                    {/* By Employee Breakdown */}
                    {reportData.by_employee.length > 0 ? (
                      <div>
                        <h3 className="font-semibold text-[#333] mb-3">By Employee</h3>
                        <div className="space-y-4">
                          {reportData.by_employee.map((emp) => (
                            <div key={emp.user_id} className="border border-[#F8C8DC]/30 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-[#D48C9E]" />
                                  </div>
                                  <span className="font-medium text-[#333]">{emp.name}</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-[#333]">{emp.total_hours.toFixed(2)} hrs</p>
                                  <p className="text-xs text-[#888]">{emp.shift_count} shifts</p>
                                </div>
                              </div>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {emp.shifts.map((shift, idx) => (
                                  <div key={idx} className="flex justify-between text-sm bg-[#F9F6F7] rounded-lg px-3 py-2">
                                    <span className="text-[#666]">
                                      {formatDateTime(shift.clock_in)} → {formatDateTime(shift.clock_out)}
                                    </span>
                                    <span className="font-medium text-[#333]">{shift.hours.toFixed(2)} hrs</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-[#888] py-4">No shifts found for this period</p>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Stats Grid - Collapsible */}
          <div className="dashboard-card">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowStatsSection(!showStatsSection)}
              data-testid="stats-section-toggle"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#F8C8DC] to-[#D48C9E] rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-playfair text-xl font-semibold text-[#333]">Overview Stats</h2>
              </div>
              {showStatsSection ? (
                <ChevronUp className="w-5 h-5 text-[#888]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#888]" />
              )}
            </div>
            <AnimatePresence>
              {showStatsSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#eee]">
                    <div className="p-4 bg-[#F9F6F7] rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#F8C8DC]/30 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-[#D48C9E]" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#333]" data-testid="total-employees">
                            {summary.total_employees}
                          </p>
                          <p className="text-sm text-[#888]">Total Employees</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-[#F9F6F7] rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#8BA88E]/20 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-[#8BA88E]" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#333]" data-testid="total-hours">
                            {summary.total_hours}
                          </p>
                          <p className="text-sm text-[#888]">Total Hours</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-[#F9F6F7] rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#C5A065]/20 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-[#C5A065]" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#333]" data-testid="total-shifts">
                            {summary.total_shifts}
                          </p>
                          <p className="text-sm text-[#888]">Total Shifts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hours by Employee - Collapsible */}
          <div className="dashboard-card">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowHoursByEmployee(!showHoursByEmployee)}
              data-testid="hours-section-toggle"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#8BA88E] to-[#6B8E6B] rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-playfair text-xl font-semibold text-[#333]">Hours by Employee</h2>
              </div>
              {showHoursByEmployee ? (
                <ChevronUp className="w-5 h-5 text-[#888]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#888]" />
              )}
            </div>
            <AnimatePresence>
              {showHoursByEmployee && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[#eee]">
                    {summary.by_employee.length === 0 ? (
                      <p className="text-center text-[#888] py-8">No employee data yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table" data-testid="employee-hours-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Total Hours</th>
                              <th>Shifts</th>
                              <th>Avg Hours/Shift</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.by_employee.map((emp) => (
                              <tr key={emp.user_id} data-testid={`employee-row-${emp.user_id}`}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-[#D48C9E]" />
                                    </div>
                                    {emp.name}
                                  </div>
                                </td>
                                <td className="font-medium">{emp.hours.toFixed(2)} hrs</td>
                                <td>{emp.shifts}</td>
                                <td>{(emp.hours / emp.shifts).toFixed(2)} hrs</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* All Employees - Collapsible */}
          <div className="dashboard-card">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowAllEmployees(!showAllEmployees)}
              data-testid="employees-section-toggle"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#C5A065] to-[#9A7B4F] rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-playfair text-xl font-semibold text-[#333]">All Employees</h2>
                  <p className="text-sm text-[#888]">{employees.length} total</p>
                </div>
              </div>
              {showAllEmployees ? (
                <ChevronUp className="w-5 h-5 text-[#888]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#888]" />
              )}
            </div>
            <AnimatePresence>
              {showAllEmployees && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[#eee]">
                    {employees.length === 0 ? (
                      <p className="text-center text-[#888] py-8">No employees registered</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table" data-testid="employees-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Hourly Rate</th>
                              <th>Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((emp) => (
                              <tr key={emp.id} data-testid={`all-employee-row-${emp.id}`}>
                                <td>
                                  <div 
                                    className="flex items-center gap-2 cursor-pointer hover:bg-[#F9F6F7] rounded-lg px-2 py-1 -mx-2 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleViewEmployeeDetails(emp); }}
                                    data-testid={`employee-name-${emp.id}`}
                                  >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      emp.role === 'admin' ? 'bg-[#C5A065]/20' : 'bg-[#F8C8DC]/30'
                                    }`}>
                                      {emp.role === 'admin' ? (
                                        <Shield className="w-4 h-4 text-[#C5A065]" />
                                      ) : (
                                        <User className="w-4 h-4 text-[#D48C9E]" />
                                      )}
                                    </div>
                                    <span className="text-[#333] hover:text-[#C5A065] font-medium">{emp.name}</span>
                                    <Eye className="w-3 h-3 text-[#aaa] opacity-0 group-hover:opacity-100" />
                                  </div>
                                </td>
                                <td>{emp.email}</td>
                                <td>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    emp.role === 'admin' 
                                      ? 'bg-[#C5A065]/20 text-[#9A7B4F]' 
                                      : 'bg-[#F8C8DC]/30 text-[#5D4037]'
                                  }`}>
                                    {emp.role}
                                  </span>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  {emp.role !== 'admin' ? (
                                    editingRateId === emp.id ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[#888]">$</span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={editingRateValue}
                                          onChange={(e) => setEditingRateValue(e.target.value)}
                                          className="w-20 h-7 text-sm"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleUpdateEmployeeRate(emp.id);
                                            if (e.key === 'Escape') { setEditingRateId(null); setEditingRateValue(""); }
                                          }}
                                          data-testid={`rate-input-${emp.id}`}
                                        />
                                        <button
                                          onClick={() => handleUpdateEmployeeRate(emp.id)}
                                          className="text-green-500 hover:text-green-600 p-1"
                                          title="Save"
                                        >
                                          <CheckCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => { setEditingRateId(null); setEditingRateValue(""); }}
                                          className="text-red-400 hover:text-red-500 p-1"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-1 cursor-pointer hover:bg-[#F9F6F7] rounded px-2 py-1 -mx-2"
                                onClick={() => {
                                  setEditingRateId(emp.id);
                                  setEditingRateValue(emp.hourly_rate?.toString() || "");
                                }}
                                data-testid={`rate-display-${emp.id}`}
                                title="Click to edit"
                              >
                                <DollarSign className="w-3 h-3 text-[#C5A065]" />
                                <span className={emp.hourly_rate ? 'font-medium text-[#333]' : 'text-[#888]'}>
                                  {emp.hourly_rate 
                                    ? `${emp.hourly_rate.toFixed(2)}/hr` 
                                    : `${payrollSettings.default_hourly_rate?.toFixed(2) || '15.00'}/hr`}
                                </span>
                                {!emp.hourly_rate && <span className="text-[#aaa] text-xs ml-1">(default)</span>}
                                <Edit3 className="w-3 h-3 text-[#aaa] ml-1" />
                              </div>
                            )
                          ) : (
                            <span className="text-[#888]">-</span>
                          )}
                                </td>
                                <td>{formatDateTime(emp.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent Time Entries - Collapsible */}
          <div className="dashboard-card">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowTimeEntries(!showTimeEntries)}
              data-testid="time-entries-section-toggle"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-playfair text-xl font-semibold text-[#333]">Recent Time Entries</h2>
                  <p className="text-sm text-[#888]">{timeEntries.length} entries</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={(e) => { e.stopPropagation(); setShowAddEntry(true); }}
                  size="sm"
                  className="btn-secondary flex items-center gap-2"
                  data-testid="add-time-entry-btn"
                >
                  <Clock className="w-4 h-4" />
                  Add Entry
                </Button>
                {showTimeEntries ? (
                  <ChevronUp className="w-5 h-5 text-[#888]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#888]" />
                )}
              </div>
            </div>
            <AnimatePresence>
              {showTimeEntries && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[#eee]">
                    {timeEntries.length === 0 ? (
                      <p className="text-center text-[#888] py-8">No time entries yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table" data-testid="time-entries-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Clock In</th>
                              <th>Clock Out</th>
                              <th>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timeEntries.slice(0, 20).map((entry) => (
                              <tr key={entry.id} data-testid={`time-entry-row-${entry.id}`}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-[#D48C9E]" />
                                    </div>
                                    {entry.user_name}
                                  </div>
                                </td>
                                <td>{formatDateTime(entry.clock_in)}</td>
                                <td>{entry.clock_out ? formatDateTime(entry.clock_out) : '-'}</td>
                                <td>
                                  {entry.total_hours ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F8C8DC]/20 rounded-full text-sm font-medium text-[#5D4037]">
                                      <Clock className="w-3 h-3" />
                                      {entry.total_hours} hrs
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#8BA88E]/20 rounded-full text-sm font-medium text-[#5A8A5E]">
                                      Active
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Submissions Section */}
          <div className="dashboard-card">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowFormsSection(!showFormsSection)}
              data-testid="form-submissions-toggle"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-playfair text-xl font-semibold text-[#333]">Form Submissions</h2>
                  <p className="text-sm text-[#888]">
                    {formsSummary.job_applications.total + formsSummary.consignment_inquiries.total + formsSummary.consignment_agreements.total} total submissions
                    {(formsSummary.job_applications.new + formsSummary.consignment_inquiries.new + formsSummary.consignment_agreements.new) > 0 && (
                      <span className="ml-2 text-blue-600 font-medium">
                        ({formsSummary.job_applications.new + formsSummary.consignment_inquiries.new + formsSummary.consignment_agreements.new} new)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchFormSubmissions();
                  }}
                  disabled={loadingForms}
                  className="text-[#888] hover:text-[#333]"
                >
                  {loadingForms ? "Loading..." : "Refresh"}
                </Button>
                {showFormsSection ? (
                  <ChevronUp className="w-5 h-5 text-[#888]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#888]" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {showFormsSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 pt-6 border-t border-[#eee]">
                    {/* Form Type Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <button
                        onClick={() => setActiveFormTab("job_applications")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          activeFormTab === "job_applications"
                            ? "bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white shadow-md"
                            : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                        }`}
                        data-testid="tab-job-applications"
                      >
                        <Briefcase className="w-4 h-4" />
                        Job Applications
                        {formsSummary.job_applications.new > 0 && (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {formsSummary.job_applications.new}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveFormTab("consignment_inquiries")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          activeFormTab === "consignment_inquiries"
                            ? "bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white shadow-md"
                            : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                        }`}
                        data-testid="tab-consignment-inquiries"
                      >
                        <Package className="w-4 h-4" />
                        Consignment Inquiries
                        {formsSummary.consignment_inquiries.new > 0 && (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {formsSummary.consignment_inquiries.new}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveFormTab("consignment_agreements")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          activeFormTab === "consignment_agreements"
                            ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md"
                            : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                        }`}
                        data-testid="tab-consignment-agreements"
                      >
                        <FileSignature className="w-4 h-4" />
                        Agreements
                        {formsSummary.consignment_agreements.new > 0 && (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {formsSummary.consignment_agreements.new}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Job Applications Tab */}
                    {activeFormTab === "job_applications" && (
                      <div data-testid="job-applications-list">
                        {loadingForms ? (
                          <p className="text-center text-[#888] py-8">Loading...</p>
                        ) : formSubmissions.jobApplications.length === 0 ? (
                          <p className="text-center text-[#888] py-8">No job applications yet</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Phone</th>
                                  <th>Submitted</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {formSubmissions.jobApplications.map((app) => (
                                  <tr key={app.id} data-testid={`job-app-row-${app.id}`}>
                                    <td className="font-medium">{app.full_name}</td>
                                    <td>{app.email}</td>
                                    <td>{app.phone}</td>
                                    <td className="text-sm text-[#888]">{formatSubmissionDate(app.submitted_at)}</td>
                                    <td>{getStatusBadge(app.status)}</td>
                                    <td>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedSubmission({ ...app, formType: "job_applications" });
                                            setShowSubmissionDetails(true);
                                          }}
                                          className="text-[#8B5CF6] hover:text-[#6D28D9]"
                                          data-testid={`view-job-app-${app.id}`}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSubmission("job_applications", app.id)}
                                          className="text-red-500 hover:text-red-700"
                                          data-testid={`delete-job-app-${app.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consignment Inquiries Tab */}
                    {activeFormTab === "consignment_inquiries" && (
                      <div data-testid="consignment-inquiries-list">
                        {loadingForms ? (
                          <p className="text-center text-[#888] py-8">Loading...</p>
                        ) : formSubmissions.consignmentInquiries.length === 0 ? (
                          <p className="text-center text-[#888] py-8">No consignment inquiries yet</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Item Types</th>
                                  <th>Submitted</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {formSubmissions.consignmentInquiries.map((inquiry) => (
                                  <tr key={inquiry.id} data-testid={`inquiry-row-${inquiry.id}`}>
                                    <td className="font-medium">{inquiry.full_name}</td>
                                    <td>{inquiry.email}</td>
                                    <td className="text-sm">
                                      {inquiry.item_types?.slice(0, 2).join(", ")}
                                      {inquiry.item_types?.length > 2 && "..."}
                                    </td>
                                    <td className="text-sm text-[#888]">{formatSubmissionDate(inquiry.submitted_at)}</td>
                                    <td>{getStatusBadge(inquiry.status)}</td>
                                    <td>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedSubmission({ ...inquiry, formType: "consignment_inquiries" });
                                            setShowSubmissionDetails(true);
                                          }}
                                          className="text-[#00D4FF] hover:text-[#00A8CC]"
                                          data-testid={`view-inquiry-${inquiry.id}`}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSubmission("consignment_inquiries", inquiry.id)}
                                          className="text-red-500 hover:text-red-700"
                                          data-testid={`delete-inquiry-${inquiry.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consignment Agreements Tab */}
                    {activeFormTab === "consignment_agreements" && (
                      <div data-testid="consignment-agreements-list">
                        {loadingForms ? (
                          <p className="text-center text-[#888] py-8">Loading...</p>
                        ) : formSubmissions.consignmentAgreements.length === 0 ? (
                          <p className="text-center text-[#888] py-8">No consignment agreements yet</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Percentage</th>
                                  <th>Signed</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {formSubmissions.consignmentAgreements.map((agreement) => (
                                  <tr key={agreement.id} data-testid={`agreement-row-${agreement.id}`}>
                                    <td className="font-medium">{agreement.full_name}</td>
                                    <td>{agreement.email}</td>
                                    <td>{agreement.agreed_percentage}</td>
                                    <td className="text-sm text-[#888]">{formatSubmissionDate(agreement.submitted_at)}</td>
                                    <td>{getStatusBadge(agreement.status)}</td>
                                    <td>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedSubmission({ ...agreement, formType: "consignment_agreements" });
                                            setShowSubmissionDetails(true);
                                          }}
                                          className="text-[#8B5CF6] hover:text-[#6D28D9]"
                                          data-testid={`view-agreement-${agreement.id}`}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSubmission("consignment_agreements", agreement.id)}
                                          className="text-red-500 hover:text-red-700"
                                          data-testid={`delete-agreement-${agreement.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submission Details Modal */}
          {showSubmissionDetails && selectedSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
              onClick={() => setShowSubmissionDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                data-testid="submission-details-modal"
              >
                {/* Modal Header */}
                <div className={`p-6 ${
                  selectedSubmission.formType === "job_applications" 
                    ? "bg-gradient-to-r from-[#FF1493] to-[#E91E8C]"
                    : selectedSubmission.formType === "consignment_inquiries"
                      ? "bg-gradient-to-r from-[#00D4FF] to-[#00A8CC]"
                      : "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]"
                } text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedSubmission.formType === "job_applications" ? (
                        <Briefcase className="w-6 h-6" />
                      ) : selectedSubmission.formType === "consignment_inquiries" ? (
                        <Package className="w-6 h-6" />
                      ) : (
                        <FileSignature className="w-6 h-6" />
                      )}
                      <div>
                        <h2 className="font-playfair text-xl font-bold">{selectedSubmission.full_name}</h2>
                        <p className="text-sm opacity-80">
                          {selectedSubmission.formType === "job_applications" 
                            ? "Job Application"
                            : selectedSubmission.formType === "consignment_inquiries"
                              ? "Consignment Inquiry"
                              : "Consignment Agreement"
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSubmissionDetails(false)}
                      className="text-white/80 hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {/* Status Update */}
                  <div className="mb-6 p-4 bg-[#F9F6F7] rounded-xl">
                    <Label className="text-sm font-medium text-[#666] mb-2 block">Update Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {["new", "reviewed", "contacted", "archived"].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateSubmissionStatus(selectedSubmission.formType, selectedSubmission.id, status)}
                          disabled={updatingStatus}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedSubmission.status === status || (!selectedSubmission.status && status === "new")
                              ? "bg-[#333] text-white"
                              : "bg-white text-[#666] hover:bg-[#eee] border border-[#ddd]"
                          }`}
                          data-testid={`status-btn-${status}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-[#F9F6F7] rounded-xl">
                      <Mail className="w-5 h-5 text-[#888]" />
                      <div>
                        <p className="text-xs text-[#888]">Email</p>
                        <a href={`mailto:${selectedSubmission.email}`} className="text-[#333] hover:text-[#8B5CF6]">
                          {selectedSubmission.email}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#F9F6F7] rounded-xl">
                      <Phone className="w-5 h-5 text-[#888]" />
                      <div>
                        <p className="text-xs text-[#888]">Phone</p>
                        <a href={`tel:${selectedSubmission.phone}`} className="text-[#333] hover:text-[#8B5CF6]">
                          {selectedSubmission.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {selectedSubmission.address && (
                    <div className="flex items-start gap-3 p-3 bg-[#F9F6F7] rounded-xl mb-6">
                      <MapPin className="w-5 h-5 text-[#888] mt-0.5" />
                      <div>
                        <p className="text-xs text-[#888]">Address</p>
                        <p className="text-[#333]">{selectedSubmission.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Job Application Details */}
                  {selectedSubmission.formType === "job_applications" && (
                    <div className="space-y-4">
                      {selectedSubmission.resume_text && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Resume / Experience</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{selectedSubmission.resume_text}</p>
                        </div>
                      )}
                      {selectedSubmission.why_join && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Why Join Us?</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{selectedSubmission.why_join}</p>
                        </div>
                      )}
                      {selectedSubmission.availability && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Availability</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{selectedSubmission.availability}</p>
                        </div>
                      )}
                      {selectedSubmission.tasks_able_to_perform?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Tasks Able to Perform</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedSubmission.tasks_able_to_perform.map((task) => (
                              <span key={task} className="px-3 py-1 bg-[#F8C8DC]/30 text-[#5D4037] rounded-full text-sm">
                                {task}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[#F9F6F7] rounded-xl">
                          <p className="text-xs text-[#888]">Background Check Consent</p>
                          <p className={`font-medium ${selectedSubmission.background_check_consent ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedSubmission.background_check_consent ? "Yes" : "No"}
                          </p>
                        </div>
                        <div className="p-3 bg-[#F9F6F7] rounded-xl">
                          <p className="text-xs text-[#888]">Reliable Transportation</p>
                          <p className={`font-medium ${selectedSubmission.has_reliable_transportation ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedSubmission.has_reliable_transportation ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consignment Inquiry Details */}
                  {selectedSubmission.formType === "consignment_inquiries" && (
                    <div className="space-y-4">
                      {selectedSubmission.item_types?.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Item Types</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedSubmission.item_types.map((type) => (
                              <span key={type} className="px-3 py-1 bg-[#00D4FF]/20 text-[#00A8CC] rounded-full text-sm">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedSubmission.other_item_type && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Other Item Type</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{selectedSubmission.other_item_type}</p>
                        </div>
                      )}
                      {selectedSubmission.item_description && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Item Description</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{selectedSubmission.item_description}</p>
                        </div>
                      )}
                      {selectedSubmission.item_condition && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Item Condition</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{selectedSubmission.item_condition}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[#F9F6F7] rounded-xl">
                          <p className="text-xs text-[#888]">Smoke-Free Environment</p>
                          <p className={`font-medium ${selectedSubmission.smoke_free ? 'text-green-600' : 'text-orange-600'}`}>
                            {selectedSubmission.smoke_free ? "Yes" : "No"}
                          </p>
                        </div>
                        <div className="p-3 bg-[#F9F6F7] rounded-xl">
                          <p className="text-xs text-[#888]">Pet-Free Environment</p>
                          <p className={`font-medium ${selectedSubmission.pet_free ? 'text-green-600' : 'text-orange-600'}`}>
                            {selectedSubmission.pet_free ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consignment Agreement Details */}
                  {selectedSubmission.formType === "consignment_agreements" && (
                    <div className="space-y-4">
                      {selectedSubmission.items_description && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Items Description</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{selectedSubmission.items_description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[#C5A065]/10 rounded-xl">
                          <p className="text-xs text-[#888]">Agreed Percentage</p>
                          <p className="font-bold text-[#C5A065] text-lg">{selectedSubmission.agreed_percentage}</p>
                        </div>
                        <div className="p-3 bg-[#F9F6F7] rounded-xl">
                          <p className="text-xs text-[#888]">Signature Date</p>
                          <p className="font-medium text-[#333]">{selectedSubmission.signature_date || "N/A"}</p>
                        </div>
                      </div>
                      {selectedSubmission.signature && (
                        <div>
                          <Label className="text-sm font-medium text-[#666] mb-2 block">Signature</Label>
                          <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl font-signature text-xl italic">{selectedSubmission.signature}</p>
                        </div>
                      )}
                      <div className="p-3 bg-[#F9F6F7] rounded-xl">
                        <p className="text-xs text-[#888]">Agreed to Terms</p>
                        <p className={`font-medium ${selectedSubmission.agreed_to_terms ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedSubmission.agreed_to_terms ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Submission Meta */}
                  <div className="mt-6 pt-4 border-t border-[#eee] flex items-center justify-between text-sm text-[#888]">
                    <span>Submitted: {formatSubmissionDate(selectedSubmission.submitted_at)}</span>
                    <span>ID: {selectedSubmission.id.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-[#F9F6F7] flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteSubmission(selectedSubmission.formType, selectedSubmission.id)}
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    data-testid="delete-submission-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setShowSubmissionDetails(false)}
                    className="btn-primary"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Edit Time Entry Modal */}
          {showEditEntry && editingEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowEditEntry(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="edit-entry-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Edit Time Entry</h2>
                  <button
                    onClick={() => setShowEditEntry(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-[#F9F6F7] rounded-xl">
                  <p className="text-sm text-[#666]">Employee</p>
                  <p className="font-semibold text-[#333]">{editingEntry.user_name}</p>
                </div>

                <form onSubmit={handleSaveEdit}>
                  <div className="form-group">
                    <Label className="form-label">Clock In *</Label>
                    <Input
                      type="datetime-local"
                      value={editFormData.clock_in}
                      onChange={(e) => setEditFormData({ ...editFormData, clock_in: e.target.value })}
                      required
                      className="form-input"
                      data-testid="edit-clock-in"
                    />
                  </div>

                  <div className="form-group">
                    <Label className="form-label">Clock Out</Label>
                    <Input
                      type="datetime-local"
                      value={editFormData.clock_out}
                      onChange={(e) => setEditFormData({ ...editFormData, clock_out: e.target.value })}
                      className="form-input"
                      data-testid="edit-clock-out"
                    />
                    <p className="text-xs text-[#888] mt-1">Leave empty if still active</p>
                  </div>

                  <div className="p-3 bg-[#faf7f2] rounded-xl mb-4">
                    <p className="text-xs text-[#888]">
                      Total hours will be automatically calculated based on clock in/out times.
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditEntry(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingEdit}
                      className="btn-primary flex-1"
                      data-testid="save-edit-btn"
                    >
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Add Time Entry Modal */}
          {showAddEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddEntry(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="add-entry-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Add Time Entry</h2>
                  <button
                    onClick={() => setShowAddEntry(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[#666] mb-4">
                  Create a manual time entry for an employee who forgot to clock in or worked off-site.
                </p>

                <form onSubmit={handleAddEntry}>
                  <div className="form-group">
                    <Label className="form-label">Employee *</Label>
                    <Select
                      value={newEntryData.employee_id}
                      onValueChange={(value) => setNewEntryData({ ...newEntryData, employee_id: value })}
                    >
                      <SelectTrigger className="form-input" data-testid="add-entry-employee-select">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.role !== 'admin').map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="form-group">
                    <Label className="form-label">Clock In *</Label>
                    <Input
                      type="datetime-local"
                      value={newEntryData.clock_in}
                      onChange={(e) => setNewEntryData({ ...newEntryData, clock_in: e.target.value })}
                      required
                      className="form-input"
                      data-testid="add-entry-clock-in"
                    />
                  </div>

                  <div className="form-group">
                    <Label className="form-label">Clock Out</Label>
                    <Input
                      type="datetime-local"
                      value={newEntryData.clock_out}
                      onChange={(e) => setNewEntryData({ ...newEntryData, clock_out: e.target.value })}
                      className="form-input"
                      data-testid="add-entry-clock-out"
                    />
                    <p className="text-xs text-[#888] mt-1">Leave empty to create an active shift</p>
                  </div>

                  <div className="p-3 bg-[#faf7f2] rounded-xl mb-4">
                    <p className="text-xs text-[#888]">
                      Total hours will be automatically calculated if clock out is provided.
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddEntry(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addingEntry || !newEntryData.employee_id || !newEntryData.clock_in}
                      className="btn-primary flex-1"
                      data-testid="submit-add-entry-btn"
                    >
                      {addingEntry ? "Creating..." : "Create Entry"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Payroll Modal */}
          {showPayroll && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
              onClick={() => setShowPayroll(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-xl my-8"
                onClick={(e) => e.stopPropagation()}
                data-testid="payroll-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C5A065]/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-[#C5A065]" />
                    </div>
                    <div>
                      <h2 className="font-playfair text-xl font-bold text-[#333]">Payroll Reports</h2>
                      <p className="text-sm text-[#888]">Generate payroll-ready reports</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPayrollSettings(true)}
                      className="text-[#666]"
                      data-testid="payroll-settings-btn"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Settings
                    </Button>
                    <button
                      onClick={() => setShowPayroll(false)}
                      className="text-[#999] hover:text-[#666]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Period Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="form-group">
                    <Label className="form-label">Period Type</Label>
                    <Select
                      value={payrollFilters.period_type}
                      onValueChange={(value) => setPayrollFilters({ ...payrollFilters, period_type: value })}
                    >
                      <SelectTrigger className="form-input" data-testid="payroll-period-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {payrollFilters.period_type !== "custom" ? (
                    <div className="form-group">
                      <Label className="form-label">Period</Label>
                      <Select
                        value={payrollFilters.period_index.toString()}
                        onValueChange={(value) => setPayrollFilters({ ...payrollFilters, period_index: parseInt(value) })}
                      >
                        <SelectTrigger className="form-input" data-testid="payroll-period-index">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{getPeriodLabel(payrollFilters.period_type, 0)}</SelectItem>
                          <SelectItem value="-1">{getPeriodLabel(payrollFilters.period_type, -1)}</SelectItem>
                          <SelectItem value="-2">{getPeriodLabel(payrollFilters.period_type, -2)}</SelectItem>
                          <SelectItem value="-3">{getPeriodLabel(payrollFilters.period_type, -3)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <Label className="form-label">Start Date</Label>
                        <Input
                          type="date"
                          value={payrollFilters.custom_start}
                          onChange={(e) => setPayrollFilters({ ...payrollFilters, custom_start: e.target.value })}
                          className="form-input"
                          data-testid="payroll-custom-start"
                        />
                      </div>
                      <div className="form-group">
                        <Label className="form-label">End Date</Label>
                        <Input
                          type="date"
                          value={payrollFilters.custom_end}
                          onChange={(e) => setPayrollFilters({ ...payrollFilters, custom_end: e.target.value })}
                          className="form-input"
                          data-testid="payroll-custom-end"
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <Label className="form-label">Default Hourly Rate ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payrollFilters.hourly_rate}
                      onChange={(e) => setPayrollFilters({ ...payrollFilters, hourly_rate: e.target.value })}
                      className="form-input"
                      placeholder="15.00"
                      data-testid="payroll-hourly-rate"
                    />
                    <p className="text-xs text-[#888] mt-1">Used for employees without individual rates</p>
                  </div>

                  <div className="form-group">
                    <Label className="form-label">Employee (Optional)</Label>
                    <Select
                      value={payrollFilters.employee_id || "all"}
                      onValueChange={(value) => setPayrollFilters({ ...payrollFilters, employee_id: value === "all" ? "" : value })}
                    >
                      <SelectTrigger className="form-input" data-testid="payroll-employee-filter">
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.filter(e => e.role !== 'admin').map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Button
                    onClick={handleGeneratePayrollReport}
                    disabled={payrollLoading || (payrollFilters.period_type === "custom" && (!payrollFilters.custom_start || !payrollFilters.custom_end))}
                    className="btn-primary flex items-center gap-2"
                    data-testid="generate-payroll-btn"
                  >
                    <CalendarDays className="w-4 h-4" />
                    {payrollLoading ? "Generating..." : "Generate Report"}
                  </Button>
                  {payrollReport && (
                    <>
                      <Button
                        onClick={handleDownloadPayrollPDF}
                        variant="outline"
                        className="flex items-center gap-2 border-[#C5A065] text-[#C5A065]"
                        data-testid="download-payroll-pdf-btn"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                      <Button
                        onClick={handleEmailPayrollReport}
                        disabled={emailingPayroll}
                        variant="outline"
                        className="flex items-center gap-2 border-[#8BA88E] text-[#8BA88E]"
                        data-testid="email-payroll-report-btn"
                      >
                        <Mail className="w-4 h-4" />
                        {emailingPayroll ? "Sending..." : "Email Report"}
                      </Button>
                    </>
                  )}
                </div>

                {/* Payroll Report Results */}
                {payrollReport && (
                  <div className="space-y-6" data-testid="payroll-report-results">
                    {/* Period Header */}
                    <div className="bg-gradient-to-r from-[#C5A065]/10 to-[#F8C8DC]/10 rounded-xl p-4">
                      <h3 className="font-semibold text-[#333]">
                        {payrollReport.period.start_formatted} - {payrollReport.period.end_formatted}
                      </h3>
                      <p className="text-sm text-[#666]">
                        Default Rate: ${payrollReport.settings.default_hourly_rate?.toFixed(2) || '15.00'}/hr
                        {payrollReport.settings.uses_individual_rates && (
                          <span className="ml-2 text-[#C5A065]">(individual rates applied)</span>
                        )}
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-[#333]">{payrollReport.summary.total_employees}</p>
                        <p className="text-sm text-[#888]">Employees</p>
                      </div>
                      <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-[#333]">{payrollReport.summary.total_hours.toFixed(2)}</p>
                        <p className="text-sm text-[#888]">Total Hours</p>
                      </div>
                      <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-[#333]">{payrollReport.summary.total_shifts}</p>
                        <p className="text-sm text-[#888]">Total Shifts</p>
                      </div>
                      <div className="bg-[#C5A065]/10 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-[#C5A065]">${payrollReport.summary.total_wages.toFixed(2)}</p>
                        <p className="text-sm text-[#888]">Total Wages</p>
                      </div>
                    </div>

                    {/* Employee Breakdown */}
                    {payrollReport.employees.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Hours</th>
                              <th>Shifts</th>
                              <th>Rate</th>
                              <th>Gross Wages</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payrollReport.employees.map((emp) => (
                              <tr key={emp.user_id}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-[#D48C9E]" />
                                    </div>
                                    <div>
                                      <span>{emp.name}</span>
                                      {emp.has_custom_rate && (
                                        <span className="ml-1 text-xs text-[#C5A065]">★</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>{emp.total_hours.toFixed(2)} hrs</td>
                                <td>{emp.total_shifts}</td>
                                <td className={emp.has_custom_rate ? 'text-[#C5A065] font-medium' : ''}>
                                  ${emp.hourly_rate.toFixed(2)}
                                </td>
                                <td className="font-semibold text-[#C5A065]">${emp.gross_wages.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-[#888] py-8">No data found for this period</p>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Payroll Settings Modal */}
          {showPayrollSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowPayrollSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="payroll-settings-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Payroll Settings</h2>
                  <button
                    onClick={() => setShowPayrollSettings(false)}
                    className="text-[#999] hover:text-[#666]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePayrollSettings}>
                  <div className="form-group">
                    <Label className="form-label">Pay Period Start Date</Label>
                    <Input
                      type="date"
                      value={payrollSettings.pay_period_start_date}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, pay_period_start_date: e.target.value })}
                      required
                      className="form-input"
                      data-testid="payroll-settings-start-date"
                    />
                    <p className="text-xs text-[#888] mt-1">
                      This date is used to calculate biweekly pay periods. Choose the first day of any pay period.
                    </p>
                  </div>

                  <div className="form-group">
                    <Label className="form-label">Default Hourly Rate ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payrollSettings.default_hourly_rate}
                      onChange={(e) => setPayrollSettings({ ...payrollSettings, default_hourly_rate: parseFloat(e.target.value) || 0 })}
                      required
                      className="form-input"
                      data-testid="payroll-settings-hourly-rate"
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPayrollSettings(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="btn-primary flex-1"
                      data-testid="save-payroll-settings-btn"
                    >
                      {savingSettings ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
