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
  CalendarDays
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
  const [newEmployee, setNewEmployee] = useState({ name: "", email: "" });
  const [addingEmployee, setAddingEmployee] = useState(false);
  
  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
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
    
    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollInterval);
  }, [navigate, fetchNotifications]);

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

      <main className="dashboard-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="font-playfair text-2xl font-bold text-[#333]">Admin Dashboard</h1>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowReport(true)}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="run-report-btn"
              >
                <FileText className="w-4 h-4" />
                Run Report
              </Button>
              <Button 
                onClick={() => setShowAddEmployee(true)}
                className="btn-primary flex items-center gap-2"
                data-testid="add-employee-btn"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </Button>
            </div>
          </div>

          {/* Add Employee Modal */}
          {showAddEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddEmployee(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid="add-employee-modal"
              >
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="dashboard-card">
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
            <div className="dashboard-card">
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
            <div className="dashboard-card">
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

          {/* Hours by Employee */}
          <div className="dashboard-card">
            <h2 className="font-playfair text-xl font-semibold text-[#333] mb-4">Hours by Employee</h2>
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

          {/* All Employees */}
          <div className="dashboard-card">
            <h2 className="font-playfair text-xl font-semibold text-[#333] mb-4">All Employees</h2>
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
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} data-testid={`all-employee-row-${emp.id}`}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              emp.role === 'admin' ? 'bg-[#C5A065]/20' : 'bg-[#F8C8DC]/30'
                            }`}>
                              {emp.role === 'admin' ? (
                                <Shield className="w-4 h-4 text-[#C5A065]" />
                              ) : (
                                <User className="w-4 h-4 text-[#D48C9E]" />
                              )}
                            </div>
                            {emp.name}
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
                        <td>{formatDateTime(emp.created_at)}</td>
                        <td>
                          {emp.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                              data-testid={`delete-employee-${emp.id}`}
                              title="Delete employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Time Entries */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-playfair text-xl font-semibold text-[#333]">Recent Time Entries</h2>
              <Button 
                onClick={() => setShowAddEntry(true)}
                className="btn-secondary flex items-center gap-2"
                data-testid="add-time-entry-btn"
              >
                <Clock className="w-4 h-4" />
                Add Time Entry
              </Button>
            </div>
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
                      <th>Actions</th>
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
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="text-[#C5A065] hover:text-[#9A7B4F] transition-colors p-1"
                              data-testid={`edit-entry-${entry.id}`}
                              title="Edit time entry"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                              data-testid={`delete-entry-${entry.id}`}
                              title="Delete time entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
        </motion.div>
      </main>
    </div>
  );
}
