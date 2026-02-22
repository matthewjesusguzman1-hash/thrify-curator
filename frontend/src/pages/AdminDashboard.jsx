import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  }, [navigate]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

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
          <div className="flex items-center justify-between">
            <h1 className="font-playfair text-2xl font-bold text-[#333]">Admin Dashboard</h1>
            <Button 
              onClick={() => setShowAddEmployee(true)}
              className="btn-primary flex items-center gap-2"
              data-testid="add-employee-btn"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Time Entries */}
          <div className="dashboard-card">
            <h2 className="font-playfair text-xl font-semibold text-[#333] mb-4">Recent Time Entries</h2>
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
      </main>
    </div>
  );
}
