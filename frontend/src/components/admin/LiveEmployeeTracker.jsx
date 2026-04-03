import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Play, User, DollarSign, RefreshCw } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Format elapsed time
const formatElapsedTime = (clockInTime) => {
  if (!clockInTime) return "--:--:--";
  
  const start = new Date(clockInTime);
  const now = new Date();
  const elapsed = Math.floor((now - start) / 1000);
  
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Format clock-in time
const formatClockInTime = (clockInTime) => {
  if (!clockInTime) return "--:--";
  const date = new Date(clockInTime);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Calculate estimated pay
const calculatePay = (clockInTime, hourlyRate = 15) => {
  if (!clockInTime) return 0;
  const start = new Date(clockInTime);
  const now = new Date();
  const hoursWorked = (now - start) / (1000 * 60 * 60);
  return (hoursWorked * hourlyRate).toFixed(2);
};

export default function LiveEmployeeTracker({ employees, employeeClockStatuses, getAuthHeader }) {
  const [clockedInEmployees, setClockedInEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  
  // Fetch clocked-in employees with their clock-in times
  const fetchClockedInEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/admin/clocked-in-employees`, getAuthHeader());
      const data = response.data.employees || [];
      // Normalize the data - API returns user_id, we need id
      const normalized = data.map(emp => ({
        id: emp.user_id || emp.id,
        name: emp.name || emp.email || 'Unknown',
        email: emp.email,
        clock_in_time: emp.clock_in_time,
        hourly_rate: emp.hourly_rate || 15
      }));
      setClockedInEmployees(normalized);
    } catch (error) {
      console.error("Failed to fetch clocked-in employees:", error);
      // Fallback: use local state to show who's clocked in
      const clockedIn = employees
        .filter(emp => employeeClockStatuses[emp.id])
        .map(emp => ({
          id: emp.id,
          name: emp.name || emp.email,
          email: emp.email,
          clock_in_time: null, // Don't have the time in local state
          hourly_rate: emp.hourly_rate || 15
        }));
      setClockedInEmployees(clockedIn);
    } finally {
      setLoading(false);
    }
  }, [employees, employeeClockStatuses, getAuthHeader]);
  
  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchClockedInEmployees();
    
    // Refresh every 30 seconds
    const refreshInterval = setInterval(fetchClockedInEmployees, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchClockedInEmployees]);
  
  // Tick every second to update timers
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    
    return () => clearInterval(tickInterval);
  }, []);
  
  // Calculate total hours across all employees
  const totalHours = clockedInEmployees.reduce((sum, emp) => {
    if (!emp.clock_in_time) return sum;
    const start = new Date(emp.clock_in_time);
    const now = new Date();
    return sum + (now - start) / (1000 * 60 * 60);
  }, 0);
  
  // If no one is clocked in, show minimal view
  if (!loading && clockedInEmployees.length === 0) {
    return (
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 mb-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Live Employee Tracker</p>
              <p className="text-slate-500 text-xs">No employees currently clocked in</p>
            </div>
          </div>
          <button 
            onClick={fetchClockedInEmployees}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-gradient-to-r from-[#1A1A2E] to-[#16213E] rounded-2xl p-4 mb-6 border border-[#00D4FF]/30 shadow-lg shadow-[#00D4FF]/10"
      data-testid="live-employee-tracker"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {clockedInEmployees.length}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold">Live Employee Tracker</p>
            <p className="text-[#00D4FF] text-xs">
              {clockedInEmployees.length} active • {totalHours.toFixed(1)} total hours
            </p>
          </div>
        </div>
        <button 
          onClick={fetchClockedInEmployees}
          className="p-2 text-slate-400 hover:text-[#00D4FF] transition-colors rounded-lg hover:bg-white/5"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Employee Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {clockedInEmployees.map((emp, index) => (
            <motion.div
              key={emp.id || index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
            >
              <div className="flex items-center justify-between">
                {/* Employee Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{emp.name || emp.email}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400 flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {formatClockInTime(emp.clock_in_time)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Time & Pay */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-white font-mono tracking-tight">
                    {formatElapsedTime(emp.clock_in_time)}
                  </p>
                  {emp.clock_in_time && (
                    <p className="text-green-400 text-xs flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3" />
                      {calculatePay(emp.clock_in_time, emp.hourly_rate || 15)} earned
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Summary Footer */}
      {clockedInEmployees.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Total labor cost estimate:
            </span>
            <span className="text-green-400 font-semibold">
              ${clockedInEmployees.reduce((sum, emp) => {
                return sum + parseFloat(calculatePay(emp.clock_in_time, emp.hourly_rate || 15));
              }, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
