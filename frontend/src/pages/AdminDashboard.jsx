import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Clock,
  Clock3,
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
  Edit2,
  FileText,
  Download,
  Bell,
  CheckCheck,
  LogIn,
  Edit3,
  DollarSign,
  Settings,
  CalendarDays,
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
  Archive,
  ArrowUpDown,
  ArrowUp,
  Upload,
  Camera,
  Image as ImageIcon,
  Pencil,
  Search,
  Filter,
  Monitor,
  Save,
  RefreshCw,
  MessageSquare,
  Mail,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import { toast } from "sonner";
import axios from "axios";
import MonthlyMileageSection from "@/components/admin/sections/MonthlyMileageSection";
import PaymentRecordsSection from "@/components/admin/sections/PaymentRecordsSection";
import FormSubmissionsSection from "@/components/admin/sections/FormSubmissionsSection";
import MessagesSection from "@/components/admin/sections/MessagesSection";
import AllEmployeesSection from "@/components/admin/sections/AllEmployeesSection";
import HoursByEmployeeSection from "@/components/admin/sections/HoursByEmployeeSection";
import ReportsSection from "@/components/admin/sections/ReportsSection";
import ShiftReportModal from "@/components/admin/modals/ShiftReportModal";
import PayrollModal from "@/components/admin/modals/PayrollModal";
import TimeEntryModal from "@/components/admin/modals/TimeEntryModal";
import FormSubmissionModal from "@/components/admin/modals/FormSubmissionModal";
import { AddEmployeeModal, RemoveEmployeeModal } from "@/components/admin/modals/EmployeeModals";
import EmployeePortalViewModal from "@/components/admin/modals/EmployeePortalViewModal";
import W9ViewerModal from "@/components/admin/modals/W9ViewerModal";
import PortalW9Modal from "@/components/admin/modals/PortalW9Modal";
import { formatHoursToHMS, roundHoursToMinute } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeClockStatuses, setEmployeeClockStatuses] = useState({}); // Track which employees are clocked in
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
  const [newEmployee, setNewEmployee] = useState({ name: "", email: "", phone: "", role: "employee", admin_code: "" });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [removingEmployee, setRemovingEmployee] = useState(false);
  const [selectedJobApp, setSelectedJobApp] = useState("");
  const [newEmployeeW9File, setNewEmployeeW9File] = useState(null);
  const [uploadingNewEmployeeW9, setUploadingNewEmployeeW9] = useState(false);
  
  // Employee details modal state
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState(false);
  const [editEmployeeW9File, setEditEmployeeW9File] = useState(null);
  const [uploadingEditW9, setUploadingEditW9] = useState(false);
  
  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    period_type: "custom",
    period_index: 0,
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    employee_id: ""
  });
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
  // Track data updates for real-time sync
  const [lastDataUpdate, setLastDataUpdate] = useState(Date.now());
  
  // Current admin info
  const [currentAdminName, setCurrentAdminName] = useState("Administrator");
  
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
    hourly_rate: "",
    phone: "",
    start_date: "",
    admin_code: ""
  });
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [editEmployeeW9s, setEditEmployeeW9s] = useState([]); // W-9 documents for editing employee
  const [loadingEditW9s, setLoadingEditW9s] = useState(false);
  const [editW9Viewer, setEditW9Viewer] = useState(null); // { url, filename, contentType, docId }
  const [showEditW9Modal, setShowEditW9Modal] = useState(false); // Separate W-9 modal for edit employee

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
  const [paymentMethodChanges, setPaymentMethodChanges] = useState([]);
  const [itemAdditions, setItemAdditions] = useState([]);
  const [activeFormTab, setActiveFormTab] = useState("job_applications");
  const [loadingForms, setLoadingForms] = useState(false);
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showFormsSection, setShowFormsSection] = useState(false);
  const [formSearchQuery, setFormSearchQuery] = useState(""); // Search for form submissions
  const [formStatusFilter, setFormStatusFilter] = useState("all"); // Filter by status

  // W-9 Review state
  const [pendingW9s, setPendingW9s] = useState([]);
  const [loadingPendingW9s, setLoadingPendingW9s] = useState(false);
  const [reviewingW9, setReviewingW9] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showW9ReviewSection, setShowW9ReviewSection] = useState(false);

  // Collapsible sections state - all collapsed by default
  const [showStatsSection, setShowStatsSection] = useState(false);
  const [showHoursByEmployee, setShowHoursByEmployee] = useState(false);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showTimeEntries, setShowTimeEntries] = useState(false);
  
  // Master refresh state
  const [masterRefreshing, setMasterRefreshing] = useState(false);

  // Payroll summary state for overview
  const [payrollSummary, setPayrollSummary] = useState({
    current_period: { amount: 0, hours: 0, start: '', end: '' },
    month_total: 0,
    year_total: 0
  });

  // Sorting state for all tables
  const [sortConfig, setSortConfig] = useState({
    hoursByEmployee: { key: 'hours', direction: 'desc' },
    allEmployees: { key: 'created_at', direction: 'desc' },
    timeEntries: { key: 'clock_in', direction: 'desc' },
    jobApplications: { key: 'submitted_at', direction: 'desc' },
    consignmentInquiries: { key: 'submitted_at', direction: 'desc' },
    consignmentAgreements: { key: 'submitted_at', direction: 'desc' }
  });

  // Employee portal view state
  const [showEmployeePortal, setShowEmployeePortal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [employeePortalData, setEmployeePortalData] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [employeeClockStatus, setEmployeeClockStatus] = useState(null);
  const [showClockConfirm, setShowClockConfirm] = useState(null); // 'in' or 'out'
  const [clockingEmployee, setClockingEmployee] = useState(false);
  const [portalElapsedTime, setPortalElapsedTime] = useState(0); // Timer for admin portal view

  // W-9 Viewer Modal state
  const [showW9ViewerModal, setShowW9ViewerModal] = useState(false);
  const [viewingW9, setViewingW9] = useState(null);
  const [loadingW9Viewer, setLoadingW9Viewer] = useState(false);
  const [employeeW9List, setEmployeeW9List] = useState([]);
  const [selectedW9Index, setSelectedW9Index] = useState(0);
  const [w9ViewerFromPortal, setW9ViewerFromPortal] = useState(false);

  // Portal W-9 Modal state (dark theme)
  const [showPortalW9Modal, setShowPortalW9Modal] = useState(false);
  const [portalW9Docs, setPortalW9Docs] = useState([]);
  const [loadingPortalW9, setLoadingPortalW9] = useState(false);
  const [previewingPortalW9, setPreviewingPortalW9] = useState(null);

  // Employee shifts management state (for Hours by Employee section)
  const [showEmployeeShiftsModal, setShowEmployeeShiftsModal] = useState(null);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showEditShiftModal, setShowEditShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftFormData, setShiftFormData] = useState({
    clock_in: "",
    clock_out: "",
  });

  // W-9 upload state
  const [uploadingW9, setUploadingW9] = useState(null);
  const w9InputRef = useRef(null);

  // Back to top button state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Business owner emails - only these users can assign admin roles
  const OWNER_EMAILS = ["matthewjesusguzman1@gmail.com", "euniceguzman@thriftycurator.com"];

  // Load admin name from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.name) {
          setCurrentAdminName(user.name);
        }
        // Check if current user is a business owner
        if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())) {
          setIsOwner(true);
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  // Handle scroll for back to top button with hysteresis to prevent flickering
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setShowBackToTop(prev => {
            // Show at 400px, hide at 300px (hysteresis buffer)
            if (!prev && scrollY > 400) return true;
            if (prev && scrollY < 300) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to calculate biweekly period from a start date
  // Helper to get the first Monday of a given year
  const getFirstMondayOfYear = (year) => {
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Calculate days to add to get to first Monday
    const daysToAdd = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    return new Date(year, 0, 1 + daysToAdd);
  };

  // Calculate bi-weekly pay period based on first Monday of the year
  // The pay period is ALWAYS anchored to the first Monday of the current year
  const calculateBiweeklyPeriod = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the first Monday of the current year as the anchor
    const firstMonday = getFirstMondayOfYear(today.getFullYear());
    
    // Calculate how many complete 14-day periods have passed since first Monday
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor((today - firstMonday) / msPerDay);
    const periodNumber = Math.floor(daysDiff / 14);
    
    // Calculate the current period's start and end
    const periodStart = new Date(firstMonday.getTime() + (periodNumber * 14 * msPerDay));
    const periodEnd = new Date(periodStart.getTime() + (13 * msPerDay));
    
    return {
      start: periodStart,
      end: periodEnd,
      periodNumber: periodNumber + 1,
      anchorDate: firstMonday
    };
  };

  // Helper to get report date range based on period type
  const getReportDateRange = () => {
    const { period_type, period_index, month, year, start_date, end_date } = reportFilters;
    
    if (period_type === "custom") {
      return { start: start_date, end: end_date };
    }
    
    if (period_type === "pay_period") {
      // Use payroll settings to calculate pay period
      if (!payrollSettings.pay_period_start_date) {
        return { start: start_date, end: end_date };
      }
      
      const startDateStr = payrollSettings.pay_period_start_date;
      const baseStart = new Date(startDateStr + 'T00:00:00');
      const today = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysDiff = Math.floor((today - baseStart) / msPerDay);
      const currentPeriodNum = Math.floor(daysDiff / 14);
      const targetPeriodNum = currentPeriodNum - period_index;
      
      const periodStart = new Date(baseStart.getTime() + (targetPeriodNum * 14 * msPerDay));
      const periodEnd = new Date(periodStart.getTime() + (13 * msPerDay));
      
      return {
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0]
      };
    }
    
    if (period_type === "month") {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0]
      };
    }
    
    if (period_type === "year") {
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`
      };
    }
    
    return { start: start_date, end: end_date };
  };

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

  const fetchPayrollSummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/payroll/summary`, getAuthHeader());
      setPayrollSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch payroll summary:", error);
    }
  }, [getAuthHeader]);

  // Combined refresh function for data that affects payroll
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchData(),
      fetchPayrollSummary()
    ]);
  }, [fetchPayrollSummary]);

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
    } finally {
      setLoadingForms(false);
    }
  }, [getAuthHeader]);

  const fetchPaymentMethodChanges = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/forms/payment-method-changes`, getAuthHeader());
      setPaymentMethodChanges(response.data);
    } catch (error) {
      console.error("Failed to fetch payment method changes:", error);
    }
  }, [getAuthHeader]);

  const fetchItemAdditions = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/forms/consignment-item-additions`, getAuthHeader());
      setItemAdditions(response.data);
    } catch (error) {
      console.error("Failed to fetch item additions:", error);
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

  // Auto-mark notifications as read when panel is opened
  useEffect(() => {
    if (showNotifications && unreadCount > 0) {
      // Mark all as read after a brief delay so user sees them first
      const timer = setTimeout(async () => {
        try {
          await axios.post(`${API}/admin/notifications/mark-read`, {}, getAuthHeader());
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
        } catch (error) {
          console.error("Failed to auto-mark notifications as read:", error);
        }
      }, 500); // 0.5 second delay
      
      return () => clearTimeout(timer);
    }
  }, [showNotifications, unreadCount, getAuthHeader]);

  // Handle notification click - scroll to section and open item
  const handleNotificationClick = async (notification) => {
    // Close the notification panel
    setShowNotifications(false);
    
    // Small delay to let panel close
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Helper function to expand section only if collapsed
    const expandSectionIfNeeded = (sectionSelector, toggleSelector) => {
      const section = document.querySelector(sectionSelector);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Check if section content is visible (expanded)
        // Look for the section's content area - if it has height > 0, it's expanded
        const toggle = document.querySelector(toggleSelector);
        if (toggle) {
          // Check for ChevronDown icon which indicates collapsed state
          const chevronDown = toggle.querySelector('svg.lucide-chevron-down');
          // If ChevronDown is present, section is collapsed - click to expand
          if (chevronDown) {
            setTimeout(() => toggle.click(), 300);
          }
        }
      }
    };
    
    // Determine which section to scroll to and what to open
    switch (notification.type) {
      case 'clock_in':
      case 'clock_out':
        expandSectionIfNeeded('[data-testid="hours-section"]', '[data-testid="hours-by-employee-toggle"]');
        break;
        
      case 'w9_submission':
      case 'w9_submitted':
        expandSectionIfNeeded('[data-testid="employees-section"]', '[data-testid="employees-section-toggle"]');
        break;
        
      case 'new_message':
        expandSectionIfNeeded('[data-testid="messages-section"]', '[data-testid="messages-section-toggle"]');
        break;
        
      case 'job_application':
      case 'consignment_inquiry':
      case 'consignment_agreement':
        // Scroll to Form Submissions section
        const formSection = document.querySelector('[data-testid="form-submissions-section"]');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Check if section is collapsed
          const formToggle = document.querySelector('[data-testid="form-submissions-toggle"]');
          if (formToggle) {
            const chevronDown = formToggle.querySelector('svg.lucide-chevron-down');
            if (chevronDown) {
              await new Promise(resolve => setTimeout(resolve, 300));
              formToggle.click();
            }
          }
          
          // Wait for section to expand then select the appropriate tab
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (notification.type === 'job_application') {
            const jobTab = document.querySelector('[data-testid="tab-job-applications"]');
            if (jobTab) jobTab.click();
          } else if (notification.type === 'consignment_inquiry') {
            const inquiryTab = document.querySelector('[data-testid="tab-consignment-inquiries"]');
            if (inquiryTab) inquiryTab.click();
          } else if (notification.type === 'consignment_agreement') {
            const agreementTab = document.querySelector('[data-testid="tab-consignment-agreements"]');
            if (agreementTab) agreementTab.click();
          }
          
          // Try to open the specific submission by ID
          await new Promise(resolve => setTimeout(resolve, 300));
          const viewBtn = document.querySelector(`[data-testid*="${notification.employee_id}"]`);
          if (viewBtn) {
            viewBtn.click();
          }
        }
        break;
      
      case 'payment_method_change':
        // Scroll to Form Submissions section and open Payment Changes tab
        const paymentFormSection = document.querySelector('[data-testid="form-submissions-section"]');
        if (paymentFormSection) {
          paymentFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Check if section is collapsed
          const paymentFormToggle = document.querySelector('[data-testid="form-submissions-toggle"]');
          if (paymentFormToggle) {
            const chevronDown = paymentFormToggle.querySelector('svg.lucide-chevron-down');
            if (chevronDown) {
              await new Promise(resolve => setTimeout(resolve, 300));
              paymentFormToggle.click();
            }
          }
          
          // Wait for section to expand then select Payment Changes tab
          await new Promise(resolve => setTimeout(resolve, 500));
          const paymentTab = document.querySelector('[data-testid="tab-payment-changes"]');
          if (paymentTab) paymentTab.click();
        }
        break;
      
      case 'consignment_items_added':
        // Scroll to Form Submissions section and open Item Additions tab
        const itemsFormSection = document.querySelector('[data-testid="form-submissions-section"]');
        if (itemsFormSection) {
          itemsFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Check if section is collapsed
          const itemsFormToggle = document.querySelector('[data-testid="form-submissions-toggle"]');
          if (itemsFormToggle) {
            const chevronDown = itemsFormToggle.querySelector('svg.lucide-chevron-down');
            if (chevronDown) {
              await new Promise(resolve => setTimeout(resolve, 300));
              itemsFormToggle.click();
            }
          }
          
          // Wait for section to expand then select Item Additions tab
          await new Promise(resolve => setTimeout(resolve, 500));
          const itemsTab = document.querySelector('[data-testid="tab-item-additions"]');
          if (itemsTab) itemsTab.click();
        }
        break;
        
      default:
        // Default: scroll to top of dashboard
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    fetchPayrollSummary();
    fetchFormSubmissions(); // Auto-fetch form submissions on page load
    
    // Poll for new notifications and data every 30 seconds
    const pollInterval = setInterval(() => {
      fetchNotifications();
      fetchData(); // Also refresh main data to keep all sections in sync
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [navigate, fetchNotifications, fetchPayrollSettings, fetchPayrollSummary, fetchFormSubmissions]);

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
      // Update timestamp to trigger report refresh
      setLastDataUpdate(Date.now());
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  // Master refresh function - refreshes all dashboard data
  const handleMasterRefresh = async () => {
    setMasterRefreshing(true);
    try {
      await Promise.all([
        fetchData(),
        fetchNotifications(),
        fetchPayrollSummary(),
        fetchPendingW9s()
      ]);
      toast.success("Dashboard refreshed");
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
      toast.error("Failed to refresh some data");
    } finally {
      setMasterRefreshing(false);
    }
  };

  // Fetch form submissions when section is opened
  useEffect(() => {
    if (showFormsSection) {
      fetchFormSubmissions();
    }
  }, [showFormsSection, fetchFormSubmissions]);

  // Refresh payroll summary when section is opened
  useEffect(() => {
    if (showStatsSection) {
      fetchPayrollSummary();
    }
  }, [showStatsSection, fetchPayrollSummary]);

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

  // Download form submission as PDF
  const handleDownloadSubmission = async (submission) => {
    try {
      toast.loading("Preparing PDF...", { id: "download-loading" });
      
      const endpoint = submission.formType === "job_applications" 
        ? "job-applications" 
        : submission.formType === "consignment_inquiries" 
          ? "consignment-inquiries" 
          : "consignment-agreements";
      
      const response = await axios.get(
        `${API}/admin/forms/${endpoint}/${submission.id}/pdf`,
        {
          ...getAuthHeader(),
          responseType: 'blob'
        }
      );
      
      toast.dismiss("download-loading");
      
      const formType = submission.formType === "job_applications" 
        ? "Job_Application"
        : submission.formType === "consignment_inquiries"
          ? "Consignment_Inquiry"
          : "Consignment_Agreement";
      const filename = `${submission.full_name.replace(/\s+/g, "_")}_${formType}.pdf`;
      
      // Create download link - same method as ReportsSection
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded");
    } catch (error) {
      toast.dismiss("download-loading");
      console.error("Download error:", error);
      toast.error("Failed to download PDF");
    }
  };

  // Fetch clock status for all employees
  const fetchEmployeeClockStatuses = useCallback(async () => {
    try {
      const statuses = {};
      // Fetch clock status for each employee
      await Promise.all(
        employees.map(async (emp) => {
          try {
            const response = await axios.get(`${API}/admin/employee/${emp.id}/clock-status`, getAuthHeader());
            statuses[emp.id] = response.data.is_clocked_in;
          } catch {
            statuses[emp.id] = false;
          }
        })
      );
      setEmployeeClockStatuses(statuses);
    } catch (error) {
      console.error("Failed to fetch employee clock statuses:", error);
    }
  }, [employees, getAuthHeader]);

  // Fetch clock statuses when employees section is expanded
  useEffect(() => {
    if (showAllEmployees && employees.length > 0) {
      fetchEmployeeClockStatuses();
    }
  }, [showAllEmployees, employees.length, fetchEmployeeClockStatuses]);

  // Refresh time entries when section is opened
  useEffect(() => {
    if (showTimeEntries) {
      fetchData();
    }
  }, [showTimeEntries]);

  // Refresh hours by employee when section is opened
  useEffect(() => {
    if (showHoursByEmployee) {
      fetchData();
    }
  }, [showHoursByEmployee]);

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

  // Sorting function
  const handleSort = (table, key) => {
    setSortConfig(prev => ({
      ...prev,
      [table]: {
        key,
        direction: prev[table].key === key && prev[table].direction === 'asc' ? 'desc' : 'asc'
      }
    }));
  };

  const getSortedData = (data, table) => {
    const { key, direction } = sortConfig[table];
    return [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Handle nested properties
      if (key === 'user_name' || key === 'name' || key === 'full_name') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      // Handle dates
      if (key.includes('_at') || key === 'clock_in' || key === 'clock_out' || key === 'created_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      // Handle numbers
      if (typeof aVal === 'number' || key === 'hours' || key === 'total_hours' || key === 'shifts' || key === 'hourly_rate') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filter functions for search
  const getFilteredFormSubmissions = (submissions) => {
    let filtered = submissions;
    
    // Apply search filter
    if (formSearchQuery.trim()) {
      const query = formSearchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const name = (item.full_name || item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }
    
    // Apply status filter
    if (formStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === formStatusFilter);
    }
    
    return filtered;
  };

  const SortableHeader = ({ table, sortKey, children, className = "" }) => {
    const isActive = sortConfig[table]?.key === sortKey;
    const direction = sortConfig[table]?.direction;
    return (
      <th 
        className={`cursor-pointer hover:bg-[#F9F6F7] transition-colors select-none ${className}`}
        onClick={() => handleSort(table, sortKey)}
      >
        <div className="flex items-center gap-1">
          {children}
          <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}>
            {isActive && direction === 'asc' ? '↑' : '↓'}
          </span>
        </div>
      </th>
    );
  };

  // Employee portal view functions
  const handleViewEmployeePortal = async (employee) => {
    setViewingEmployee(employee);
    setShowEmployeePortal(true);
    setLoadingPortal(true);
    setEmployeeClockStatus(null);
    setShowClockConfirm(null);
    
    try {
      // Fetch employee's time entries, summary, W-9 status, and clock status
      const [entriesRes, summaryRes, w9Res, clockRes] = await Promise.all([
        axios.get(`${API}/admin/employee/${employee.id}/entries`, getAuthHeader()),
        axios.get(`${API}/admin/employee/${employee.id}/summary`, getAuthHeader()),
        axios.get(`${API}/admin/employees/${employee.id}/w9/status`, getAuthHeader()).catch(() => ({ data: { has_w9: false, status: 'not_submitted' } })),
        axios.get(`${API}/admin/employee/${employee.id}/clock-status`, getAuthHeader()).catch(() => ({ data: { is_clocked_in: false } }))
      ]);
      
      setEmployeePortalData({
        entries: entriesRes.data,
        summary: summaryRes.data,
        w9Status: w9Res.data
      });
      setEmployeeClockStatus(clockRes.data);
    } catch (error) {
      console.error("Failed to fetch employee portal data:", error);
      // Use fallback data from existing state
      const employeeEntries = timeEntries.filter(e => e.employee_id === employee.id);
      const employeeStats = summary.by_employee.find(e => e.user_id === employee.id) || {
        hours: 0,
        shifts: 0
      };
      setEmployeePortalData({
        entries: employeeEntries,
        summary: {
          total_hours: employeeStats.hours,
          total_shifts: employeeStats.shifts,
          week_hours: 0,
          period_hours: employeeStats.hours,
          period_shifts: employeeStats.shifts,
          hourly_rate: employee.hourly_rate || payrollSettings.default_hourly_rate || 15,
          estimated_pay: employeeStats.hours * (employee.hourly_rate || payrollSettings.default_hourly_rate || 15)
        },
        w9Status: { has_w9: false, status: 'not_submitted' }
      });
      setEmployeeClockStatus({ is_clocked_in: false });
    } finally {
      setLoadingPortal(false);
    }
  };

  // Admin clock in/out employee
  const handleAdminClockEmployee = async (action) => {
    if (!viewingEmployee) return;
    
    setClockingEmployee(true);
    try {
      const response = await axios.post(
        `${API}/admin/employee/${viewingEmployee.id}/clock`,
        { action },
        getAuthHeader()
      );
      
      toast.success(response.data.message);
      
      // Refresh clock status (with error handling)
      try {
        const clockRes = await axios.get(`${API}/admin/employee/${viewingEmployee.id}/clock-status`, getAuthHeader());
        setEmployeeClockStatus(clockRes.data);
      } catch (e) {
        console.error("Failed to refresh clock status:", e);
      }
      
      // Refresh employee portal data (with error handling)
      try {
        const [entriesRes, summaryRes] = await Promise.all([
          axios.get(`${API}/admin/employee/${viewingEmployee.id}/entries`, getAuthHeader()),
          axios.get(`${API}/admin/employee/${viewingEmployee.id}/summary`, getAuthHeader())
        ]);
        setEmployeePortalData(prev => ({
          ...prev,
          entries: entriesRes.data,
          summary: summaryRes.data
        }));
      } catch (e) {
        console.error("Failed to refresh portal data:", e);
      }
      
      // Also refresh main dashboard data
      fetchData();
    } catch (error) {
      console.error("Clock action failed:", error);
      toast.error(error.response?.data?.detail || `Failed to clock ${action}`);
    } finally {
      setClockingEmployee(false);
      setShowClockConfirm(null);
    }
  };

  // Timer effect for admin portal view - updates every second when employee is clocked in
  useEffect(() => {
    if (!showEmployeePortal || !employeeClockStatus?.is_clocked_in || !employeeClockStatus?.clock_in_time) {
      setPortalElapsedTime(0);
      return;
    }
    
    const updateElapsed = () => {
      const clockInTime = new Date(employeeClockStatus.clock_in_time).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - clockInTime) / 1000);
      setPortalElapsedTime(elapsed > 0 ? elapsed : 0);
    };
    
    updateElapsed(); // Initial update
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [showEmployeePortal, employeeClockStatus?.is_clocked_in, employeeClockStatus?.clock_in_time]);

  // Format seconds to HH:MM:SS for portal timer
  const formatPortalTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Employee Shifts Management Functions
  const handleViewEmployeeShifts = async (employee) => {
    setShowEmployeeShiftsModal(employee);
    setLoadingShifts(true);
    try {
      // Use the correct endpoint - /entries not /shifts
      const response = await axios.get(`${API}/admin/employee/${employee.user_id}/entries`, getAuthHeader());
      setEmployeeShifts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch employee shifts:", error);
      // Fallback to filtering from timeEntries
      const shifts = timeEntries.filter(e => e.user_id === employee.user_id || e.employee_id === employee.user_id);
      setEmployeeShifts(shifts);
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleAddShift = () => {
    setShiftFormData({ clock_in: "", clock_out: "" });
    setShowAddShiftModal(true);
  };

  const handleEditShift = (shift) => {
    const clockIn = new Date(shift.clock_in);
    const clockOut = shift.clock_out ? new Date(shift.clock_out) : null;
    
    // Format as local datetime for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatLocalDateTime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setEditingShift(shift);
    setShiftFormData({
      clock_in: formatLocalDateTime(clockIn),
      clock_out: clockOut ? formatLocalDateTime(clockOut) : "",
    });
    setShowEditShiftModal(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    
    try {
      await axios.delete(`${API}/admin/time-entries/${shiftId}`, getAuthHeader());
      setEmployeeShifts(prev => prev.filter(s => s.id !== shiftId));
      toast.success("Shift deleted successfully");
      fetchData();
      fetchPayrollSummary();
    } catch (error) {
      toast.error("Failed to delete shift");
    }
  };

  const handleSaveNewShift = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: showEmployeeShiftsModal.user_id,
        clock_in: new Date(shiftFormData.clock_in).toISOString(),
        clock_out: shiftFormData.clock_out ? new Date(shiftFormData.clock_out).toISOString() : null,
      };
      
      await axios.post(`${API}/admin/time-entries`, payload, getAuthHeader());
      toast.success("Shift added successfully");
      setShowAddShiftModal(false);
      handleViewEmployeeShifts(showEmployeeShiftsModal);
      fetchData();
      fetchPayrollSummary();
    } catch (error) {
      toast.error("Failed to add shift");
    }
  };

  const handleSaveEditedShift = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        clock_in: new Date(shiftFormData.clock_in).toISOString(),
        clock_out: shiftFormData.clock_out ? new Date(shiftFormData.clock_out).toISOString() : null,
      };
      
      await axios.put(`${API}/admin/time-entries/${editingShift.id}`, payload, getAuthHeader());
      toast.success("Shift updated successfully");
      setShowEditShiftModal(false);
      setEditingShift(null);
      handleViewEmployeeShifts(showEmployeeShiftsModal);
      fetchData();
      fetchPayrollSummary();
    } catch (error) {
      toast.error("Failed to update shift");
    }
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
      // Prepare payload including role and admin_code if applicable
      const payload = {
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: newEmployee.role || "employee"
      };
      
      // Include admin_code if role is admin
      if (payload.role === "admin" && newEmployee.admin_code) {
        payload.admin_code = newEmployee.admin_code;
      }
      
      const response = await axios.post(`${API}/admin/create-employee`, payload, getAuthHeader());
      const newEmployeeId = response.data.id;
      
      // If W-9 file was attached, upload it
      if (newEmployeeW9File && newEmployeeId) {
        const formData = new FormData();
        formData.append('file', newEmployeeW9File);
        try {
          await axios.post(
            `${API}/admin/employees/${newEmployeeId}/w9`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          toast.success(`${newEmployee.role === "admin" ? "Admin" : "Employee"} ${newEmployee.name} created with W-9!`);
        } catch (w9Error) {
          toast.success(`${newEmployee.role === "admin" ? "Admin" : "Employee"} ${newEmployee.name} created! W-9 upload failed.`);
        }
      } else {
        toast.success(`${newEmployee.role === "admin" ? "Admin" : "Employee"} ${newEmployee.name} created successfully!`);
      }
      
      setNewEmployee({ name: "", email: "", phone: "", role: "employee", admin_code: "" });
      setNewEmployeeW9File(null);
      setSelectedJobApp("");
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
    const empEntries = timeEntries.filter(e => e.user_id === employeeId);
    const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const totalShifts = empEntries.length;
    return { totalHours: totalHours.toFixed(2), totalShifts };
  };

  // W-9 upload/download handlers
  const handleW9Upload = async (employeeId, file) => {
    if (!file) return;
    
    setUploadingW9(employeeId);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(
        `${API}/admin/employees/${employeeId}/w9`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.success("W-9 uploaded successfully!");
      fetchData(); // Refresh employee list to show W-9 status
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload W-9");
    } finally {
      setUploadingW9(null);
    }
  };

  const handleW9Download = async (employeeId, employeeName) => {
    try {
      const response = await axios.get(
        `${API}/admin/employees/${employeeId}/w9`,
        {
          ...getAuthHeader(),
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `w9_${employeeName.replace(/\s+/g, '_')}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download W-9");
    }
  };

  const handleW9Delete = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this W-9 document?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/admin/employees/${employeeId}/w9`, getAuthHeader());
      toast.success("W-9 deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete W-9");
    }
  };

  const handleDownloadBlankW9 = () => {
    // Open IRS W-9 form in new tab
    window.open("https://www.irs.gov/pub/irs-pdf/fw9.pdf", "_blank");
    toast.success("Opening W-9 form...");
  };

  // View W-9 in modal (without downloading) - Now shows list of all W-9s
  const handleViewW9 = async (employeeId, employeeName, fromPortal = false) => {
    if (!employeeId) {
      toast.error("Invalid employee ID");
      return;
    }
    
    setLoadingW9Viewer(true);
    setShowW9ViewerModal(true);
    setSelectedW9Index(0);
    setEmployeeW9List([]);
    setW9ViewerFromPortal(fromPortal);
    
    // Get employee's start date
    const employee = employees.find(e => e.id === employeeId);
    const employeeStartDate = employee?.start_date || null;
    
    try {
      // Get all W-9 documents for this employee
      const statusRes = await axios.get(`${API}/admin/employees/${employeeId}/w9/status`, getAuthHeader());
      const w9Documents = (statusRes.data.w9_documents || []).filter(doc => doc && doc.id);
      
      if (w9Documents.length === 0) {
        toast.error("No W-9 documents found");
        setShowW9ViewerModal(false);
        return;
      }
      
      // Load the first W-9 document
      const firstDoc = w9Documents[0];
      const response = await axios.get(`${API}/admin/employees/${employeeId}/w9/${firstDoc.id}`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      
      setEmployeeW9List(w9Documents);
      setViewingW9({
        employeeId,
        employeeName,
        employeeStartDate,
        docId: firstDoc.id,
        url,
        contentType: response.headers['content-type'],
        filename: firstDoc.filename,
        status: firstDoc.status,
        uploadedAt: firstDoc.uploaded_at
      });
    } catch (error) {
      toast.error("Failed to load W-9");
      setShowW9ViewerModal(false);
    } finally {
      setLoadingW9Viewer(false);
    }
  };

  // Open Portal W-9 Modal (dark theme - for Employee Portal view)
  const handleOpenPortalW9Modal = async (employeeId, employeeName) => {
    if (!employeeId) {
      toast.error("Invalid employee ID");
      return;
    }
    
    setShowPortalW9Modal(true);
    setLoadingPortalW9(true);
    setPortalW9Docs([]);
    
    try {
      const response = await axios.get(`${API}/admin/employees/${employeeId}/w9/status`, getAuthHeader());
      const docs = (response.data.w9_documents || []).filter(doc => doc && doc.id);
      setPortalW9Docs(docs);
    } catch (error) {
      toast.error("Failed to load W-9 documents");
    } finally {
      setLoadingPortalW9(false);
    }
  };

  // Preview W-9 from Portal Modal
  const handlePreviewPortalW9 = async (doc) => {
    if (!doc || !doc.id || !viewingEmployee?.id) return;
    
    try {
      const response = await axios.get(
        `${API}/admin/employees/${viewingEmployee.id}/w9/${doc.id}`,
        { ...getAuthHeader(), responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      
      setPreviewingPortalW9({
        url,
        contentType: response.headers['content-type'],
        filename: doc.filename || 'w9.pdf',
      });
    } catch (error) {
      toast.error("Failed to preview W-9");
    }
  };

  // Download W-9 from Portal Modal
  const handleDownloadPortalW9 = async (doc) => {
    if (!doc || !doc.id || !viewingEmployee?.id) return;
    
    try {
      const response = await axios.get(
        `${API}/admin/employees/${viewingEmployee.id}/w9/${doc.id}`,
        { ...getAuthHeader(), responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename || 'w9.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("W-9 downloaded!");
    } catch (error) {
      toast.error("Failed to download W-9");
    }
  };

  // Switch to a different W-9 document
  const handleSelectW9 = async (index) => {
    if (index === selectedW9Index || !employeeW9List[index]) return;
    
    const doc = employeeW9List[index];
    if (!doc || !doc.id) {
      toast.error("Invalid document");
      return;
    }
    
    setLoadingW9Viewer(true);
    
    try {
      // Revoke old URL
      if (viewingW9?.url) {
        window.URL.revokeObjectURL(viewingW9.url);
      }
      
      const response = await axios.get(`${API}/admin/employees/${viewingW9.employeeId}/w9/${doc.id}`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      
      setSelectedW9Index(index);
      setViewingW9({
        ...viewingW9,
        docId: doc.id,
        url,
        contentType: response.headers['content-type'],
        filename: doc.filename,
        status: doc.status,
        uploadedAt: doc.uploaded_at
      });
    } catch (error) {
      toast.error("Failed to load W-9");
    } finally {
      setLoadingW9Viewer(false);
    }
  };

  // Delete a specific W-9 document
  const handleDeleteW9Doc = async (employeeId, docId) => {
    if (!employeeId || !docId) {
      toast.error("Invalid document or employee ID");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this W-9 document?")) return;
    
    try {
      await axios.delete(`${API}/admin/employees/${employeeId}/w9/${docId}`, getAuthHeader());
      toast.success("W-9 deleted successfully");
      
      // Remove from list
      const newList = employeeW9List.filter(doc => doc.id !== docId);
      setEmployeeW9List(newList);
      
      if (newList.length === 0) {
        closeW9Viewer();
        fetchData();
      } else {
        // Load first remaining document
        setSelectedW9Index(0);
        handleSelectW9(0);
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to delete W-9");
    }
  };

  const closeW9Viewer = () => {
    if (viewingW9?.url) {
      window.URL.revokeObjectURL(viewingW9.url);
    }
    setViewingW9(null);
    setEmployeeW9List([]);
    setSelectedW9Index(0);
    setShowW9ViewerModal(false);
  };

  // W-9 Review functions
  const fetchPendingW9s = useCallback(async () => {
    setLoadingPendingW9s(true);
    try {
      const response = await axios.get(`${API}/admin/w9/pending`, getAuthHeader());
      setPendingW9s(response.data);
    } catch (error) {
      console.error("Failed to fetch pending W-9s:", error);
    } finally {
      setLoadingPendingW9s(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (showW9ReviewSection) {
      fetchPendingW9s();
    }
  }, [showW9ReviewSection, fetchPendingW9s]);

  const handleApproveW9 = async (employeeId) => {
    try {
      await axios.post(`${API}/admin/employees/${employeeId}/w9/approve`, {}, getAuthHeader());
      toast.success("W-9 approved!");
      setReviewingW9(null);
      fetchPendingW9s();
      fetchData();
    } catch (error) {
      toast.error("Failed to approve W-9");
    }
  };

  // Approve a specific W-9 document
  const handleApproveW9Doc = async (employeeId, docId) => {
    if (!employeeId || !docId) {
      toast.error("Invalid document or employee ID");
      return;
    }
    try {
      await axios.post(`${API}/admin/employees/${employeeId}/w9/${docId}/approve`, {}, getAuthHeader());
      toast.success("W-9 approved!");
      // Refresh the W-9 list
      if (viewingW9) {
        handleViewW9(employeeId, viewingW9.employeeName);
      }
      fetchData();
    } catch (error) {
      toast.error("Failed to approve W-9");
    }
  };

  const handleRejectW9 = async (employeeId) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      await axios.post(`${API}/admin/employees/${employeeId}/w9/reject`, { reason: rejectReason }, getAuthHeader());
      toast.success("W-9 returned for corrections");
      setReviewingW9(null);
      setRejectReason("");
      fetchPendingW9s();
      fetchData();
    } catch (error) {
      toast.error("Failed to reject W-9");
    }
  };

  // Edit time entry handlers
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    // Convert ISO strings to local datetime-local input format
    const formatForInput = (isoString) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      // Format as local datetime for datetime-local input (YYYY-MM-DDTHH:mm)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
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
      fetchPayrollSummary();
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
      fetchPayrollSummary();
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
      fetchPayrollSummary(); // Refresh the summary with new period
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Quick save for inline pay period update
  const handleUpdatePayrollSettings = async () => {
    try {
      await axios.put(`${API}/admin/payroll/settings`, {
        id: "payroll_settings",
        pay_period_start_date: payrollSettings.pay_period_start_date,
        default_hourly_rate: parseFloat(payrollSettings.default_hourly_rate) || 15.00
      }, getAuthHeader());
      
      toast.success("Pay period updated for all employees!");
      fetchPayrollSummary(); // Refresh the summary with new period
    } catch (error) {
      toast.error("Failed to update pay period");
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
  const handleOpenEditEmployee = async (employee) => {
    setEditingEmployee(employee);
    setEditEmployeeData({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      hourly_rate: employee.hourly_rate?.toString() || "",
      phone: employee.phone || "",
      start_date: employee.start_date || "",
      admin_code: employee.admin_code || ""
    });
    setShowEditEmployee(true);
    setEditEmployeeW9s([]);
    setLoadingEditW9s(true);
    
    // Fetch W-9 documents for this employee
    try {
      const response = await axios.get(`${API}/admin/employees/${employee.id}/w9/status`, getAuthHeader());
      setEditEmployeeW9s(response.data.w9_documents || []);
    } catch (error) {
      console.error("Failed to fetch W-9 documents:", error);
      setEditEmployeeW9s([]);
    } finally {
      setLoadingEditW9s(false);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setSavingEmployee(true);
    try {
      const updatePayload = {
        name: editEmployeeData.name,
        email: editEmployeeData.email,
        role: editEmployeeData.role,
        phone: editEmployeeData.phone || null,
        start_date: editEmployeeData.start_date || null
      };
      
      // Include admin_code if role is admin
      if (editEmployeeData.role === 'admin') {
        updatePayload.admin_code = editEmployeeData.admin_code;
      }
      
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
      const dateRange = getReportDateRange();
      const response = await axios.post(`${API}/admin/reports`, {
        start_date: dateRange.start,
        end_date: dateRange.end,
        employee_id: reportFilters.employee_id || null
      }, getAuthHeader());
      setReportData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadShiftReportPDF = async () => {
    if (!reportData) return;
    
    try {
      const response = await axios.post(`${API}/admin/reports/pdf`, {
        start_date: reportData.period.start,
        end_date: reportData.period.end
      }, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shift_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Shift report PDF downloaded!");
    } catch (error) {
      toast.error("Failed to download shift report PDF");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      // Parse as UTC and format without timezone conversion
      const date = new Date(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
    } catch {
      return 'N/A';
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container" data-testid="admin-dashboard">
      {/* Header */}
      <header 
        className="dashboard-header" 
        style={{ 
          background: 'linear-gradient(90deg, #1A1A2E 0%, #16213E 100%)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white" data-testid="admin-name">{currentAdminName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`relative px-3 py-2 transition-all duration-300 ${
                unreadCount > 0 
                  ? 'bg-[#FF1493]/20 border-2 border-[#FF1493] text-white hover:bg-[#FF1493]/30 shadow-lg shadow-[#FF1493]/30 animate-pulse' 
                  : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'
              }`}
              onClick={() => setShowNotifications(!showNotifications)}
              data-testid="notification-bell"
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-[#FF1493]' : ''}`} />
              <span className="ml-1.5 text-sm font-medium hidden sm:inline">Alerts</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF1493] text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-[#FF1493]/50" data-testid="notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="fixed md:absolute left-1 right-1 md:left-auto md:right-0 top-[120px] md:top-full md:mt-2 w-auto md:w-96 max-w-[400px] bg-white rounded-2xl shadow-2xl border border-[#eee] z-50 overflow-hidden"
                  data-testid="notification-dropdown"
                >
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#00D4FF]" />
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-[#FF1493] text-white text-xs rounded-full font-medium">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 text-white/60 hover:text-white rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Clear notifications button */}
                    {notifications.length > 0 && (
                      <Button 
                        variant="outline"
                        size="sm" 
                        className="w-full h-8 text-xs bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30"
                        onClick={handleClearNotifications}
                        data-testid="clear-notifications-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear notifications
                      </Button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto bg-white">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-[#F9F6F7] rounded-full flex items-center justify-center mx-auto mb-4">
                          <Bell className="w-8 h-8 text-[#ccc]" />
                        </div>
                        <p className="text-[#888] text-sm font-medium">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#f0f0f0]">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`notification-list-item p-4 hover:bg-[#faf9f7] transition-all cursor-pointer ${
                              !notification.read ? 'bg-[#FFF5F8] border-l-4 border-l-[#FF1493]' : 'bg-white'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                            data-testid={`notification-item-${notification.id}`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                notification.type === 'clock_in' 
                                  ? 'bg-green-500' 
                                  : notification.type === 'clock_out'
                                  ? 'bg-red-500'
                                  : notification.type === 'w9_submission' || notification.type === 'w9_submitted'
                                  ? 'bg-orange-500'
                                  : notification.type === 'new_message'
                                  ? 'bg-pink-500'
                                  : notification.type === 'job_application'
                                  ? 'bg-purple-500'
                                  : notification.type === 'consignment_inquiry'
                                  ? 'bg-cyan-500'
                                  : notification.type === 'consignment_agreement'
                                  ? 'bg-emerald-500'
                                  : notification.type === 'payment_method_change'
                                  ? 'bg-amber-500'
                                  : notification.type === 'consignment_items_added'
                                  ? 'bg-teal-500'
                                  : 'bg-blue-500'
                              }`}>
                                {notification.type === 'clock_in' 
                                  ? <LogIn className="w-5 h-5 text-white" />
                                  : notification.type === 'clock_out'
                                  ? <LogOut className="w-5 h-5 text-white" />
                                  : notification.type === 'w9_submission' || notification.type === 'w9_submitted'
                                  ? <FileText className="w-5 h-5 text-white" />
                                  : notification.type === 'new_message'
                                  ? <MessageSquare className="w-5 h-5 text-white" />
                                  : notification.type === 'job_application'
                                  ? <Briefcase className="w-5 h-5 text-white" />
                                  : notification.type === 'consignment_inquiry'
                                  ? <Package className="w-5 h-5 text-white" />
                                  : notification.type === 'consignment_agreement'
                                  ? <FileSignature className="w-5 h-5 text-white" />
                                  : notification.type === 'payment_method_change'
                                  ? <CreditCard className="w-5 h-5 text-white" />
                                  : notification.type === 'consignment_items_added'
                                  ? <Package className="w-5 h-5 text-white" />
                                  : <Bell className="w-5 h-5 text-white" />
                                }
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    notification.type === 'clock_in'
                                      ? 'bg-green-100 text-green-800'
                                      : notification.type === 'clock_out'
                                      ? 'bg-red-100 text-red-800'
                                      : notification.type === 'w9_submission' || notification.type === 'w9_submitted'
                                      ? 'bg-orange-100 text-orange-800'
                                      : notification.type === 'new_message'
                                      ? 'bg-pink-100 text-pink-800'
                                      : notification.type === 'job_application'
                                      ? 'bg-purple-100 text-purple-800'
                                      : notification.type === 'consignment_inquiry'
                                      ? 'bg-cyan-100 text-cyan-800'
                                      : notification.type === 'consignment_agreement'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : notification.type === 'payment_method_change'
                                      ? 'bg-amber-100 text-amber-800'
                                      : notification.type === 'consignment_items_added'
                                      ? 'bg-teal-100 text-teal-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {notification.type === 'clock_in' ? 'IN' 
                                      : notification.type === 'clock_out' ? 'OUT'
                                      : notification.type === 'w9_submission' || notification.type === 'w9_submitted' ? 'W-9'
                                      : notification.type === 'new_message' ? 'MSG'
                                      : notification.type === 'job_application' ? 'JOB'
                                      : notification.type === 'consignment_inquiry' ? 'INQ'
                                      : notification.type === 'consignment_agreement' ? 'AGR'
                                      : notification.type === 'payment_method_change' ? 'PAY'
                                      : notification.type === 'consignment_items_added' ? 'ITEM'
                                      : 'INFO'}
                                  </span>
                                  <span className="notification-time text-xs">
                                    {formatNotificationTime(notification.created_at)}
                                  </span>
                                  {!notification.read && (
                                    <span className="w-2 h-2 bg-[#FF1493] rounded-full"></span>
                                  )}
                                </div>
                                
                                <p className="notification-message text-sm leading-snug" style={{ color: '#1A1A2E', fontWeight: 500, opacity: 1 }}>
                                  {notification.message}
                                </p>
                                
                                {notification.details && (notification.details.today_hours !== undefined || notification.details.week_hours !== undefined) && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {notification.details.today_hours !== undefined && (
                                      <span className="notification-meta inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                        <Clock className="w-3 h-3" />
                                        Today: {notification.details.today_hours}h
                                      </span>
                                    )}
                                    {notification.details.week_hours !== undefined && (
                                      <span className="notification-meta inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                        <Calendar className="w-3 h-3" />
                                        Week: {notification.details.week_hours}h
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="p-3 bg-[#F9F6F7] border-t border-[#eee] text-center">
                      <p className="text-xs text-[#888]">
                        Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="home-btn">
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="my-dashboard-btn">
              My Dashboard
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-white/70 hover:text-white hover:bg-white/10"
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
        
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-poppins text-xl sm:text-2xl md:text-3xl font-bold text-white w-full sm:w-auto text-left">Admin Dashboard</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMasterRefresh}
                disabled={masterRefreshing}
                className="h-9 px-3 border-white/30 text-white hover:bg-white/10 transition-all"
                data-testid="master-refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 ${masterRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex gap-2 items-start">
              {/* Employee Management + Start Trip */}
              <div className="flex flex-col gap-1">
                {/* Add, Edit, Remove row */}
                <div className="flex gap-1">
                  <Button 
                    onClick={() => setShowAddEmployee(true)}
                    size="sm"
                    className="flex items-center gap-1 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#FF1493]/30 transition-all border-0 text-xs sm:text-sm h-9 flex-1"
                    data-testid="add-employee-btn"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                  <Button 
                    onClick={() => setShowEditEmployee(true)}
                    size="sm"
                    className="flex items-center gap-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#8B5CF6]/30 transition-all border-0 text-xs sm:text-sm h-9 flex-1"
                    data-testid="edit-employee-btn"
                  >
                    <UserCog className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button 
                    onClick={() => setShowRemoveEmployee(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 border-red-400/50 text-red-400 font-semibold hover:bg-red-500/10 transition-all text-xs sm:text-sm h-9 flex-1"
                    data-testid="remove-employee-btn"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Add Employee Modal */}
          <AddEmployeeModal
            show={showAddEmployee}
            onClose={() => setShowAddEmployee(false)}
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            newEmployeeW9File={newEmployeeW9File}
            setNewEmployeeW9File={setNewEmployeeW9File}
            selectedJobApp={selectedJobApp}
            setSelectedJobApp={setSelectedJobApp}
            formSubmissions={formSubmissions}
            handleAddEmployee={handleAddEmployee}
            handleDownloadBlankW9={handleDownloadBlankW9}
            addingEmployee={addingEmployee}
            isOwner={isOwner}
          />

          {/* Remove Employee Modal */}
          <RemoveEmployeeModal
            show={showRemoveEmployee}
            onClose={() => setShowRemoveEmployee(false)}
            employees={employees.filter(e => e.role !== 'admin')}
            employeeToRemove={selectedEmployeeToRemove}
            setEmployeeToRemove={setSelectedEmployeeToRemove}
            handleRemoveEmployee={handleRemoveEmployeeSubmit}
            removingEmployee={removingEmployee}
          />

          {/* Edit Employee Modal */}
          {showEditEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
              onClick={() => setShowEditEmployee(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-8 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                data-testid="edit-employee-modal"
              >
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 -mt-2 pt-2 -mx-2 px-2 z-10">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Edit Employee</h2>
                  <button
                    onClick={() => setShowEditEmployee(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
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
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email}) {emp.role === 'admin' ? '⭐ Admin' : ''}
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

                    {/* Import from Job Application */}
                    {formSubmissions.jobApplications && formSubmissions.jobApplications.length > 0 && (
                      <div className="form-group mb-4">
                        <Label className="form-label flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#C5A065]" />
                          Import from Job Application
                        </Label>
                        <Select 
                          onValueChange={(value) => {
                            if (value && value !== "none") {
                              const app = formSubmissions.jobApplications.find(a => a.id === value);
                              if (app) {
                                setEditEmployeeData({
                                  ...editEmployeeData,
                                  name: app.full_name,
                                  email: app.email,
                                  phone: app.phone || ""
                                });
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="form-input">
                            <SelectValue placeholder="Select a job applicant..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- No import --</SelectItem>
                            {formSubmissions.jobApplications.map((app) => (
                              <SelectItem key={app.id} value={app.id}>
                                {app.full_name} ({app.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[#888] mt-1">Replace employee info with data from a job application</p>
                      </div>
                    )}

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
                      <Label className="form-label">Phone Number</Label>
                      <Input
                        type="tel"
                        value={editEmployeeData.phone}
                        onChange={(e) => setEditEmployeeData({ ...editEmployeeData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="form-input"
                        data-testid="edit-employee-phone"
                      />
                    </div>

                    {/* Role Selection - Only shown for business owners */}
                    {isOwner && (
                      <div className="form-group">
                        <Label className="form-label">Role *</Label>
                        <Select
                          value={editEmployeeData.role}
                          onValueChange={(value) => setEditEmployeeData({ ...editEmployeeData, role: value, admin_code: value === 'employee' ? '' : editEmployeeData.admin_code })}
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
                    )}

                    {/* Admin Code - only shown when role is admin AND user is owner */}
                    {isOwner && editEmployeeData.role === 'admin' && (
                      <div className="form-group">
                        <Label className="form-label flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#8B5CF6]" />
                          Admin Access Code *
                        </Label>
                        <Input
                          type="text"
                          value={editEmployeeData.admin_code || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setEditEmployeeData({ ...editEmployeeData, admin_code: value });
                          }}
                          placeholder="4-digit code (e.g., 1234)"
                          required
                          maxLength={4}
                          pattern="\d{4}"
                          className="form-input font-mono text-lg tracking-widest"
                          data-testid="edit-employee-admin-code"
                        />
                        <p className="text-xs text-[#888] mt-1">This 4-digit code will be used for admin login</p>
                      </div>
                    )}

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

                    {/* Employee Start Date */}
                    <div className="form-group">
                      <Label className="form-label">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-10 form-input"
                            data-testid="employee-start-date-trigger"
                          >
                            <Calendar className="mr-2 h-4 w-4 text-[#00D4FF]" />
                            {editEmployeeData.start_date ? (
                              <span>{new Date(editEmployeeData.start_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            ) : (
                              <span className="text-[#888]">Select start date...</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3 border-b bg-gradient-to-r from-[#00D4FF]/10 to-[#00A8CC]/10">
                            <p className="text-xs text-[#666] mb-1">Current Pay Period</p>
                            <p className="text-sm font-semibold text-[#00A8CC]">
                              {(() => {
                                const period = calculateBiweeklyPeriod();
                                if (period) {
                                  return `${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                                }
                                return '';
                              })()}
                            </p>
                          </div>
                          <DayPicker
                            mode="single"
                            selected={editEmployeeData.start_date ? new Date(editEmployeeData.start_date + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const dateStr = date.toISOString().split('T')[0];
                                setEditEmployeeData({
                                  ...editEmployeeData,
                                  start_date: dateStr
                                });
                              }
                            }}
                            className="rounded-md border-0"
                            modifiersStyles={{
                              selected: {
                                backgroundColor: '#00D4FF',
                                color: 'white',
                                fontWeight: 'bold',
                                borderRadius: '8px'
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-[#888] mt-1">When this employee started working</p>
                    </div>

                    {/* W-9 Documents Section - Button to open modal */}
                    <div className="form-group">
                      <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl overflow-hidden border border-white/10">
                        <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <span className="text-white font-medium">W-9 Tax Documents</span>
                                <p className="text-xs text-white/50">
                                  {editEmployeeW9s.length > 0 
                                    ? `${editEmployeeW9s.length} document(s) on file` 
                                    : 'No documents uploaded'}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={() => setShowEditW9Modal(true)}
                              className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white"
                              data-testid="open-edit-w9-modal-btn"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Manage W-9s
                            </Button>
                          </div>
                        </div>
                      </div>
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

          {/* Edit Employee W-9 Viewer Modal */}
          {editW9Viewer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
              onClick={() => {
                if (editW9Viewer.url) window.URL.revokeObjectURL(editW9Viewer.url);
                setEditW9Viewer(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with X button */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
                  <div>
                    <h3 className="font-semibold text-white">W-9 Document</h3>
                    <p className="text-sm text-gray-300">{editW9Viewer.filename}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (editW9Viewer.url) window.URL.revokeObjectURL(editW9Viewer.url);
                      setEditW9Viewer(null);
                    }}
                    className="text-white hover:bg-white/20 text-xl font-bold w-8 h-8 p-0"
                  >
                    ✕
                  </Button>
                </div>

                {/* Document Viewer */}
                <div className="flex-1 overflow-auto p-4 bg-gray-100">
                  {editW9Viewer.contentType?.includes('pdf') ? (
                    <iframe
                      src={editW9Viewer.url}
                      className="w-full h-full min-h-[500px] rounded-lg border border-gray-200"
                      title="W-9 Document"
                    />
                  ) : editW9Viewer.contentType?.includes('image') ? (
                    <div className="flex items-center justify-center">
                      <img
                        src={editW9Viewer.url}
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
                      if (editW9Viewer.url) window.URL.revokeObjectURL(editW9Viewer.url);
                      setEditW9Viewer(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!window.confirm("Are you sure you want to download this W-9?")) return;
                      try {
                        const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/${editW9Viewer.docId}`, {
                          ...getAuthHeader(),
                          responseType: 'blob'
                        });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', editW9Viewer.filename || 'w9.pdf');
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


          {/* Edit Employee W-9 Management Modal */}
          {showEditW9Modal && editingEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[55] p-4"
              onClick={() => setShowEditW9Modal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
                data-testid="edit-w9-modal"
              >
                {/* Header */}
                <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
                <div className="p-4 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">W-9 Documents</h3>
                      <p className="text-sm text-white/60">{editingEmployee.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditW9Modal(false)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Download blank form */}
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Blank W-9 Form</p>
                      <p className="text-xs text-white/50">IRS Form W-9</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadBlankW9}
                      className="text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent text-xs px-3"
                    >
                      Get Form
                    </Button>
                  </div>

                  {/* W-9 Documents List */}
                  {loadingEditW9s ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00D4FF] mx-auto"></div>
                      <p className="text-xs text-white/50 mt-2">Loading...</p>
                    </div>
                  ) : editEmployeeW9s.length > 0 ? (
                    <div className="space-y-3">
                      {editEmployeeW9s.filter(doc => doc && doc.id).map((doc, index) => (
                        <div 
                          key={doc.id} 
                          className={`p-4 rounded-xl border ${
                            doc.status === 'approved' 
                              ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30' 
                              : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className={`w-4 h-4 ${doc.status === 'approved' ? 'text-[#00D4FF]' : 'text-[#8B5CF6]'}`} />
                            <span className="font-medium text-white text-sm truncate flex-1">{doc.filename || `W-9 #${index + 1}`}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              doc.status === 'approved' ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                            }`}>
                              {doc.status === 'approved' ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                          {doc.uploaded_at && new Date(doc.uploaded_at).toString() !== 'Invalid Date' && (
                            <p className="text-xs text-white/50 mb-2">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          )}
                          {doc.notes && (
                            <p className="text-xs text-white/40 italic mb-3">"{doc.notes}"</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}`, {
                                    ...getAuthHeader(),
                                    responseType: 'blob'
                                  });
                                  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                                  const url = window.URL.createObjectURL(blob);
                                  setEditW9Viewer({ url, filename: doc.filename || 'w9.pdf', contentType: response.headers['content-type'] || 'application/pdf', docId: doc.id });
                                } catch (error) {
                                  toast.error("Failed to view W-9");
                                }
                              }}
                              className="flex-1 text-white/80 border-white/20 hover:bg-white/10 bg-transparent text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}`, {
                                    ...getAuthHeader(),
                                    responseType: 'blob'
                                  });
                                  const url = window.URL.createObjectURL(new Blob([response.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = doc.filename || `w9_${editingEmployee.name}.pdf`;
                                  link.click();
                                  window.URL.revokeObjectURL(url);
                                  toast.success("Downloaded!");
                                } catch (error) {
                                  toast.error("Failed to download");
                                }
                              }}
                              className="flex-1 text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            {doc.status !== 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await axios.post(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}/approve`, {}, getAuthHeader());
                                    toast.success("Approved!");
                                    const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/status`, getAuthHeader());
                                    setEditEmployeeW9s(response.data.w9_documents || []);
                                    fetchData();
                                  } catch (error) {
                                    toast.error("Failed to approve");
                                  }
                                }}
                                className="flex-1 text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 bg-transparent text-xs"
                              >
                                <CheckCheck className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!window.confirm("Delete this W-9?")) return;
                                try {
                                  await axios.delete(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}`, getAuthHeader());
                                  toast.success("Deleted");
                                  setEditEmployeeW9s(prev => prev.filter(d => d.id !== doc.id));
                                  fetchData();
                                } catch (error) {
                                  toast.error("Failed to delete");
                                }
                              }}
                              className="text-[#FF1493] border-[#FF1493]/30 hover:bg-[#FF1493]/10 bg-transparent text-xs px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-white/20" />
                      <p className="text-sm text-white/60">No W-9 documents</p>
                    </div>
                  )}

                  {/* Upload W-9 */}
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#8B5CF6] to-[#FF1493] rounded-lg flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Upload W-9</p>
                      <p className="text-xs text-white/50">Add new document</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      id="edit-w9-modal-upload"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          await axios.post(`${API}/admin/employees/${editingEmployee.id}/w9`, formData, {
                            headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, 'Content-Type': 'multipart/form-data' }
                          });
                          toast.success("Uploaded!");
                          const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/status`, getAuthHeader());
                          setEditEmployeeW9s(response.data.w9_documents || []);
                          fetchData();
                        } catch (error) {
                          toast.error("Failed to upload");
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('edit-w9-modal-upload').click()}
                      className="text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 bg-transparent text-xs px-3"
                    >
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditW9Modal(false)}
                    className="text-white border-white/20 hover:bg-white/10 bg-transparent"
                  >
                    Close
                  </Button>
                </div>
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
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
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
                      {formatHoursToHMS(parseFloat(getEmployeeStats(selectedEmployee.id).totalHours))}
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
                              <td>{shift.clock_in ? new Date(shift.clock_in).toLocaleDateString() : 'N/A'}</td>
                              <td>{shift.clock_in ? new Date(shift.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</td>
                              <td>
                                {shift.clock_out 
                                  ? new Date(shift.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                  : <span className="text-green-500">Active</span>
                                }
                              </td>
                              <td>
                                {shift.total_hours 
                                  ? formatHoursToHMS(shift.total_hours)
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

          {/* Shift Report Modal - Extracted Component */}
          <ShiftReportModal
            isOpen={showReport}
            onClose={() => setShowReport(false)}
            getAuthHeader={getAuthHeader}
            employees={employees}
            formatDateTime={formatDateTime}
            formatDate={formatDate}
          />


          {/* All Employees - Extracted Component */}
          <div data-testid="employees-section">
            <AllEmployeesSection
              employees={employees}
              employeeClockStatuses={employeeClockStatuses}
              payrollSettings={payrollSettings}
              getAuthHeader={getAuthHeader}
              formatDateTime={formatDateTime}
              onViewEmployeePortal={handleViewEmployeePortal}
              onRefreshEmployees={fetchData}
              onDownloadBlankW9={handleDownloadBlankW9}
              isOwner={isOwner}
            />
          </div>


          {/* Payroll Summary - Collapsible */}
          <div className="dashboard-card">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => {
                const willOpen = !showStatsSection;
                setShowStatsSection(willOpen);
                if (willOpen) {
                  fetchPayrollSummary();
                }
              }}
              data-testid="stats-section-toggle"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-playfair text-xl font-semibold text-[#333]">Payroll Summary</h2>
                  <p className="text-xs text-[#888]">
                    Pay Period: {(() => {
                      const period = calculateBiweeklyPeriod();
                      if (period) {
                        return `${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                      }
                      return 'Not configured';
                    })()}
                  </p>
                </div>
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
                    {/* Current Pay Period */}
                    <div className="p-5 bg-gradient-to-br from-[#00D4FF]/10 to-[#00A8CC]/5 rounded-xl border border-[#00D4FF]/20">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center shadow-lg shadow-[#00D4FF]/30">
                          <DollarSign className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#00A8CC]" data-testid="period-payroll">
                            ${payrollSummary.current_period?.amount?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-sm font-medium text-[#666]">Current Pay Period</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#888] mt-3 pt-3 border-t border-[#00D4FF]/10">
                        {(() => {
                          const period = calculateBiweeklyPeriod();
                          if (period) {
                            return `${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                          }
                          return '';
                        })()}
                      </p>
                    </div>
                    
                    {/* Month Total */}
                    <div className="p-5 bg-gradient-to-br from-[#8B5CF6]/10 to-[#6D28D9]/5 rounded-xl border border-[#8B5CF6]/20">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
                          <Calendar className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#6D28D9]" data-testid="month-total">
                            ${payrollSummary.month_total?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-sm font-medium text-[#666]">This Month</p>
                          <p className="text-xs text-[#888]">
                            {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Year Total */}
                    <div className="p-5 bg-gradient-to-br from-[#FF1493]/10 to-[#E91E8C]/5 rounded-xl border border-[#FF1493]/20">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF1493]/30">
                          <TrendingUp className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#E91E8C]" data-testid="year-total">
                            ${payrollSummary.year_total?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-sm font-medium text-[#666]">This Year</p>
                          <p className="text-xs text-[#888]">
                            {new Date().getFullYear()} Total
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* Hours by Employee - Unified Section with Shifts Modal */}
          <div data-testid="hours-section">
            <HoursByEmployeeSection
              timeEntries={timeEntries}
              employees={employees}
              formatDateTime={formatDateTime}
              onAddEntry={() => setShowAddEntry(true)}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
              payPeriodStart={payrollSettings.pay_period_start_date}
            />
          </div>

          {/* Messages Section */}
          <div data-testid="messages-section">
            <MessagesSection />
          </div>

          {/* Form Submissions Section */}
          <div data-testid="form-submissions-section">
            <FormSubmissionsSection
              formSubmissions={formSubmissions}
              formsSummary={formsSummary}
              loadingForms={loadingForms}
              fetchFormSubmissions={fetchFormSubmissions}
              onViewSubmission={(submission) => {
                setSelectedSubmission(submission);
                setShowSubmissionDetails(true);
              }}
              onDeleteSubmission={handleDeleteSubmission}
              formatSubmissionDate={formatSubmissionDate}
              getStatusBadge={getStatusBadge}
              paymentMethodChanges={paymentMethodChanges}
              fetchPaymentMethodChanges={fetchPaymentMethodChanges}
              itemAdditions={itemAdditions}
              fetchItemAdditions={fetchItemAdditions}
            />
          </div>

          {/* Payment Records Section */}
          <PaymentRecordsSection getAuthHeader={getAuthHeader} />


          {/* Monthly Mileage Section */}
          <MonthlyMileageSection getAuthHeader={getAuthHeader} />

          {/* Reports Section - After Mileage Tracking */}
          <ReportsSection
            employees={employees}
            payPeriodStart={payrollSettings.pay_period_start_date}
            getAuthHeader={getAuthHeader}
            payrollSettings={payrollSettings}
            lastDataUpdate={lastDataUpdate}
          />

          {/* Submission Details Modal */}
          {showSubmissionDetails && selectedSubmission && (
            <FormSubmissionModal
              submission={selectedSubmission}
              onClose={() => setShowSubmissionDetails(false)}
              onDelete={handleDeleteSubmission}
              onDownload={handleDownloadSubmission}
              onUpdateStatus={handleUpdateSubmissionStatus}
              updatingStatus={updatingStatus}
              formatSubmissionDate={formatSubmissionDate}
            />
          )}

          {/* Employee Portal View Modal - Extracted Component */}
          <EmployeePortalViewModal
            isOpen={showEmployeePortal}
            onClose={() => setShowEmployeePortal(false)}
            employee={viewingEmployee}
            portalData={employeePortalData}
            clockStatus={employeeClockStatus}
            loading={loadingPortal}
            onClockInOut={handleAdminClockEmployee}
            clockingEmployee={clockingEmployee}
            onOpenW9Modal={handleOpenPortalW9Modal}
            onDownloadBlankW9={handleDownloadBlankW9}
            formatHoursToHMS={formatHoursToHMS}
            roundHoursToMinute={roundHoursToMinute}
            formatDateTime={formatDateTime}
            calculateBiweeklyPeriod={calculateBiweeklyPeriod}
            formatPortalTime={formatPortalTime}
            portalElapsedTime={portalElapsedTime}
          />

          {/* Employee Shifts Modal */}
          {showEmployeeShiftsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowEmployeeShiftsModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                data-testid="employee-shifts-modal"
              >
                {/* Header */}
                <div className="p-6 border-b border-[#eee]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-playfair text-xl font-bold text-[#333]">{showEmployeeShiftsModal.name}'s Shifts</h2>
                        <p className="text-sm text-[#888]">{showEmployeeShiftsModal.shifts} total shifts • {formatHoursToHMS(showEmployeeShiftsModal.hours)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEmployeeShiftsModal(null)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-[#F9F6F7] border-b border-[#eee]">
                  <Button
                    onClick={handleAddShift}
                    size="sm"
                    className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white"
                    data-testid="add-shift-btn"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Add Shift
                  </Button>
                </div>

                {/* Shifts List */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingShifts ? (
                    <div className="flex items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full"
                      />
                    </div>
                  ) : employeeShifts.length === 0 ? (
                    <p className="text-center text-[#888] py-12">No shifts recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {employeeShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between p-4 bg-[#F9F6F7] rounded-xl" data-testid={`shift-row-${shift.id}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-[#00D4FF]" />
                            </div>
                            <div>
                              <p className="font-medium text-[#333]">{formatDateTime(shift.clock_in)}</p>
                              <p className="text-sm text-[#888]">
                                {shift.clock_out ? `→ ${formatDateTime(shift.clock_out)}` : 'Still active'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              shift.clock_out 
                                ? 'bg-[#00D4FF]/20 text-[#00A8CC]' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {shift.clock_out ? formatHoursToHMS(shift.total_hours) : 'Active'}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditShift(shift)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                data-testid={`edit-shift-${shift.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteShift(shift.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-shift-${shift.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#eee] flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmployeeShiftsModal(null)}
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Add Shift Modal */}
          {showAddShiftModal && showEmployeeShiftsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowAddShiftModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="add-shift-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Add Shift for {showEmployeeShiftsModal.name}</h2>
                  <button onClick={() => setShowAddShiftModal(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <form onSubmit={handleSaveNewShift}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1">Clock In *</label>
                      <input
                        type="datetime-local"
                        value={shiftFormData.clock_in}
                        onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_in: e.target.value }))}
                        required
                        className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1">Clock Out</label>
                      <input
                        type="datetime-local"
                        value={shiftFormData.clock_out}
                        onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_out: e.target.value }))}
                        className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                      />
                      <p className="text-xs text-[#888] mt-1">Leave empty if still active</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setShowAddShiftModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white">
                      Add Shift
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Edit Shift Modal */}
          {showEditShiftModal && editingShift && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowEditShiftModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="edit-shift-modal"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-[#333]">Edit Shift</h2>
                  <button onClick={() => setShowEditShiftModal(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <form onSubmit={handleSaveEditedShift}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1">Clock In *</label>
                      <input
                        type="datetime-local"
                        value={shiftFormData.clock_in}
                        onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_in: e.target.value }))}
                        required
                        className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1">Clock Out</label>
                      <input
                        type="datetime-local"
                        value={shiftFormData.clock_out}
                        onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_out: e.target.value }))}
                        className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                      />
                      <p className="text-xs text-[#888] mt-1">Leave empty if still active</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setShowEditShiftModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Edit Time Entry Modal - Extracted Component */}
          <TimeEntryModal
            isOpen={showEditEntry && !!editingEntry}
            onClose={() => setShowEditEntry(false)}
            mode="edit"
            entry={editingEntry}
            employees={employees}
            getAuthHeader={getAuthHeader}
            onSuccess={fetchData}
          />

          {/* Add Time Entry Modal - Extracted Component */}
          <TimeEntryModal
            isOpen={showAddEntry}
            onClose={() => setShowAddEntry(false)}
            mode="add"
            entry={null}
            employees={employees}
            getAuthHeader={getAuthHeader}
            onSuccess={fetchData}
          />

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
                      <h2 className="font-playfair text-xl font-bold text-[#333]">Payroll</h2>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPayroll(false)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
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
                        <p className="text-2xl font-bold text-[#333]">{formatHoursToHMS(payrollReport.summary.total_hours)}</p>
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
                                <td>{formatHoursToHMS(emp.total_hours)}</td>
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
                
                {/* Close Button */}
                <div className="flex justify-end mt-6 pt-4 border-t border-[#eee]">
                  <Button
                    variant="outline"
                    onClick={() => setShowPayroll(false)}
                  >
                    Close
                  </Button>
                </div>
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
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
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

          {/* W-9 Viewer Modal - Extracted Component */}
          <W9ViewerModal
            isOpen={showW9ViewerModal}
            onClose={closeW9Viewer}
            viewingW9={viewingW9}
            employeeW9List={employeeW9List}
            selectedW9Index={selectedW9Index}
            onSelectW9={handleSelectW9}
            loading={loadingW9Viewer}
            fromPortal={w9ViewerFromPortal}
            onApproveDoc={handleApproveW9Doc}
            onDeleteDoc={handleDeleteW9Doc}
            onUploadW9={async (employeeId, file) => {
              await handleW9Upload(employeeId, file);
              handleViewW9(employeeId, viewingW9?.employeeName);
            }}
            getAuthHeader={getAuthHeader}
          />
        </div>
      </main>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="hidden md:flex fixed bottom-16 left-1/2 transform -translate-x-[75%] ml-[-24px] z-50 w-12 h-12 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-[#00D4FF]/30 transition-all items-center justify-center"
            data-testid="back-to-top-btn"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Portal W-9 Modal - Dark Theme (for Employee Portal view) - Extracted Component */}
      <PortalW9Modal
        isOpen={showPortalW9Modal}
        onClose={() => setShowPortalW9Modal(false)}
        employee={viewingEmployee}
        documents={portalW9Docs}
        loading={loadingPortalW9}
        onPreview={handlePreviewPortalW9}
        onDownload={handleDownloadPortalW9}
        onDownloadBlankW9={handleDownloadBlankW9}
        previewingDoc={previewingPortalW9}
        onClosePreview={() => setPreviewingPortalW9(null)}
      />
    </div>
  );
}
