import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Clock, 
  LogOut, 
  PlayCircle, 
  StopCircle,
  Calendar,
  DollarSign,
  User,
  Home,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ 
    total_hours: 0, 
    week_hours: 0, 
    total_shifts: 0,
    period_hours: 0,
    period_shifts: 0,
    hourly_rate: 15.00,
    estimated_pay: 0,
    period_start: null,
    period_end: null
  });
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchData();
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (clockedIn && currentEntry) {
      interval = setInterval(() => {
        const clockInTime = new Date(currentEntry.clock_in);
        const now = new Date();
        const elapsed = Math.floor((now - clockInTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockedIn, currentEntry]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  const fetchData = async () => {
    try {
      const [statusRes, entriesRes, summaryRes] = await Promise.all([
        axios.get(`${API}/time/status`, getAuthHeader()),
        axios.get(`${API}/time/entries`, getAuthHeader()),
        axios.get(`${API}/time/summary`, getAuthHeader())
      ]);

      setClockedIn(statusRes.data.clocked_in);
      setCurrentEntry(statusRes.data.entry);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  const handleClock = async (action) => {
    setLoading(true);
    try {
      await axios.post(`${API}/time/clock`, { action }, getAuthHeader());
      toast.success(action === "in" ? "Clocked in!" : "Clocked out!");
      fetchData();
      setElapsedTime(0);
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to clock ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460]" data-testid="employee-dashboard">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white" data-testid="user-name">{user.name}</p>
              <p className="text-sm text-white/60 capitalize">{user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="home-btn">
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            {user.role === "admin" && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="admin-btn">
                  Admin
                </Button>
              </Link>
            )}
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Clock In/Out Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
            <div className="p-6 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                clockedIn 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`} data-testid="clock-status">
                <span className={`w-2 h-2 rounded-full ${clockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {clockedIn ? 'Currently Working' : 'Not Clocked In'}
              </div>

              {clockedIn && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Time Elapsed</p>
                  <p className="font-mono text-4xl font-bold text-[#1A1A2E]" data-testid="elapsed-time">
                    {formatTime(elapsedTime)}
                  </p>
                </div>
              )}

              <button
                onClick={() => handleClock(clockedIn ? "out" : "in")}
                disabled={loading}
                className={`w-full max-w-xs mx-auto py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  clockedIn 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white shadow-lg hover:shadow-xl'
                } disabled:opacity-50`}
                data-testid="clock-action-btn"
              >
                {loading ? (
                  "Processing..."
                ) : clockedIn ? (
                  <>
                    <StopCircle className="w-6 h-6" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-6 h-6" />
                    Clock In
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pay Period Summary Card */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins text-lg font-semibold text-[#1A1A2E]">Current Pay Period</h2>
                <span className="text-sm text-gray-500">
                  {formatDate(summary.period_start)} - {formatDate(summary.period_end)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Hours */}
                <div className="bg-gradient-to-br from-[#00D4FF]/10 to-[#00D4FF]/5 rounded-xl p-4 text-center">
                  <Clock className="w-6 h-6 text-[#00D4FF] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1A1A2E]" data-testid="period-hours">
                    {summary.period_hours}
                  </p>
                  <p className="text-xs text-gray-500">Hours</p>
                </div>
                
                {/* Shifts */}
                <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 rounded-xl p-4 text-center">
                  <Briefcase className="w-6 h-6 text-[#8B5CF6] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1A1A2E]" data-testid="period-shifts">
                    {summary.period_shifts}
                  </p>
                  <p className="text-xs text-gray-500">Shifts</p>
                </div>
                
                {/* Estimated Pay */}
                <div className="bg-gradient-to-br from-[#FF1493]/10 to-[#FF1493]/5 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-[#FF1493] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#1A1A2E]" data-testid="estimated-pay">
                    {formatCurrency(summary.estimated_pay)}
                  </p>
                  <p className="text-xs text-gray-500">Est. Pay</p>
                </div>
              </div>

              {/* Rate Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Rate: <span className="font-semibold text-[#1A1A2E]">{formatCurrency(summary.hourly_rate)}/hr</span>
                  <span className="mx-2">•</span>
                  Calculation: {summary.period_hours} hrs × {formatCurrency(summary.hourly_rate)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Shifts */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
            <div className="p-6">
              <h2 className="font-poppins text-lg font-semibold text-[#1A1A2E] mb-4">Recent Shifts</h2>
              {entries.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No shifts recorded yet</p>
              ) : (
                <div className="space-y-3" data-testid="shifts-list">
                  {entries.slice(0, 5).map((entry) => (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      data-testid={`shift-entry-${entry.id}`}
                    >
                      <div>
                        <p className="font-medium text-[#1A1A2E]">
                          {formatDateTime(entry.clock_in)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.clock_out ? `Out: ${formatDateTime(entry.clock_out)}` : 'In progress...'}
                        </p>
                      </div>
                      <div className="text-right">
                        {entry.total_hours ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#00D4FF]/10 rounded-full text-sm font-medium text-[#0891B2]">
                            <Clock className="w-3 h-3" />
                            {entry.total_hours} hrs
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full text-sm font-medium text-green-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
