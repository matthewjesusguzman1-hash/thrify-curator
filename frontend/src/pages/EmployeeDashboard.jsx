import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Clock, 
  LogOut, 
  PlayCircle, 
  StopCircle,
  Calendar,
  TrendingUp,
  User,
  Home
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
  const [summary, setSummary] = useState({ total_hours: 0, week_hours: 0, total_shifts: 0 });
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

  if (!user) return null;

  return (
    <div className="dashboard-container" data-testid="employee-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-[#D48C9E]" />
          </div>
          <div>
            <p className="font-semibold text-[#333]" data-testid="user-name">{user.name}</p>
            <p className="text-sm text-[#888]">{user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-[#666]" data-testid="home-btn">
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>
          </Link>
          {user.role === "admin" && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-[#666]" data-testid="admin-btn">
                Admin
              </Button>
            </Link>
          )}
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
          {/* Clock In/Out Card */}
          <div className="dashboard-card">
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                clockedIn ? 'status-badge-active' : 'status-badge-inactive'
              }`} data-testid="clock-status">
                <span className={`w-2 h-2 rounded-full ${clockedIn ? 'bg-[#8BA88E]' : 'bg-[#D48C9E]'}`} />
                {clockedIn ? 'Currently Working' : 'Not Clocked In'}
              </div>

              {clockedIn && (
                <div className="mb-6">
                  <p className="text-sm text-[#888] mb-1">Time Elapsed</p>
                  <p className="font-mono text-4xl font-bold text-[#333]" data-testid="elapsed-time">
                    {formatTime(elapsedTime)}
                  </p>
                </div>
              )}

              <button
                onClick={() => handleClock(clockedIn ? "out" : "in")}
                disabled={loading}
                className={`clock-btn ${clockedIn ? 'clock-btn-out' : 'clock-btn-in'}`}
                data-testid="clock-action-btn"
              >
                {loading ? (
                  "Processing..."
                ) : clockedIn ? (
                  <>
                    <StopCircle className="w-6 h-6 inline mr-2" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-6 h-6 inline mr-2" />
                    Clock In
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="dashboard-card text-center">
              <Clock className="w-6 h-6 text-[#C5A065] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#333]" data-testid="week-hours">{summary.week_hours}</p>
              <p className="text-sm text-[#888]">This Week</p>
            </div>
            <div className="dashboard-card text-center">
              <TrendingUp className="w-6 h-6 text-[#8BA88E] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#333]" data-testid="total-hours">{summary.total_hours}</p>
              <p className="text-sm text-[#888]">Total Hours</p>
            </div>
            <div className="dashboard-card text-center">
              <Calendar className="w-6 h-6 text-[#D48C9E] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#333]" data-testid="total-shifts">{summary.total_shifts}</p>
              <p className="text-sm text-[#888]">Shifts</p>
            </div>
          </div>

          {/* Recent Shifts */}
          <div className="dashboard-card">
            <h2 className="font-playfair text-xl font-semibold text-[#333] mb-4">Recent Shifts</h2>
            {entries.length === 0 ? (
              <p className="text-center text-[#888] py-8">No shifts recorded yet</p>
            ) : (
              <div className="space-y-3" data-testid="shifts-list">
                {entries.slice(0, 10).map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-3 bg-[#F9F6F7] rounded-xl"
                    data-testid={`shift-entry-${entry.id}`}
                  >
                    <div>
                      <p className="font-medium text-[#333]">
                        {formatDateTime(entry.clock_in)}
                      </p>
                      <p className="text-sm text-[#888]">
                        {entry.clock_out ? `Out: ${formatDateTime(entry.clock_out)}` : 'In progress...'}
                      </p>
                    </div>
                    <div className="text-right">
                      {entry.total_hours ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F8C8DC]/20 rounded-full text-sm font-medium text-[#5D4037]">
                          <Clock className="w-3 h-3" />
                          {entry.total_hours} hrs
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#8BA88E]/20 rounded-full text-sm font-medium text-[#5A8A5E]">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
