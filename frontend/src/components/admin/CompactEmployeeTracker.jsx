import { useState, useEffect, useCallback } from "react";
import { Clock, Users, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Format elapsed time to HH:MM:SS
const formatElapsedTime = (clockInTime) => {
  if (!clockInTime) return "--:--";
  
  const start = new Date(clockInTime);
  const now = new Date();
  const elapsed = Math.floor((now - start) / 1000);
  
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Calculate estimated pay
const calculatePay = (clockInTime, hourlyRate = 15) => {
  if (!clockInTime) return 0;
  const start = new Date(clockInTime);
  const now = new Date();
  const hoursWorked = (now - start) / (1000 * 60 * 60);
  return (hoursWorked * hourlyRate).toFixed(2);
};

export default function CompactEmployeeTracker({ employees, employeeClockStatuses, getAuthHeader }) {
  const [clockedInEmployees, setClockedInEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);
  
  // Fetch clocked-in employees
  const fetchClockedInEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/admin/clocked-in-employees`, getAuthHeader());
      const data = response.data.employees || [];
      const normalized = data.map(emp => ({
        id: emp.user_id || emp.id,
        name: emp.name || emp.email || 'Unknown',
        email: emp.email,
        clock_in_time: emp.clock_in_time,
        hourly_rate: emp.hourly_rate || 15
      }));
      setClockedInEmployees(normalized);
    } catch (error) {
      // Fallback to local state
      const clockedIn = employees
        .filter(emp => employeeClockStatuses[emp.id])
        .map(emp => ({
          id: emp.id,
          name: emp.name || emp.email,
          email: emp.email,
          clock_in_time: null,
          hourly_rate: emp.hourly_rate || 15
        }));
      setClockedInEmployees(clockedIn);
    } finally {
      setLoading(false);
    }
  }, [employees, employeeClockStatuses, getAuthHeader]);
  
  useEffect(() => {
    fetchClockedInEmployees();
    const refreshInterval = setInterval(fetchClockedInEmployees, 30000);
    return () => clearInterval(refreshInterval);
  }, [fetchClockedInEmployees]);
  
  // Tick every second for live timers
  useEffect(() => {
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(tickInterval);
  }, []);

  const totalLabor = clockedInEmployees.reduce((sum, emp) => {
    return sum + parseFloat(calculatePay(emp.clock_in_time, emp.hourly_rate || 15));
  }, 0);

  // No employees clocked in - hide completely
  if (!loading && clockedInEmployees.length === 0) {
    return null;
  }

  return (
    <div className="mb-4" data-testid="compact-employee-tracker">
      {/* Main Bar */}
      <div 
        className="bg-gradient-to-r from-green-900/40 to-emerald-900/30 rounded-xl px-4 py-2 border border-green-500/30 cursor-pointer hover:border-green-500/50 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          {/* Left: Status */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 text-[10px] text-white font-bold rounded-full flex items-center justify-center animate-pulse">
                {clockedInEmployees.length}
              </span>
            </div>
            <div>
              <p className="text-green-400 text-sm font-medium">
                {clockedInEmployees.length} Employee{clockedInEmployees.length !== 1 ? 's' : ''} Clocked In
              </p>
            </div>
          </div>

          {/* Center: Employee names (scrolling if many) */}
          <div className="hidden sm:flex items-center gap-2 flex-1 mx-4 overflow-hidden">
            {clockedInEmployees.slice(0, 3).map((emp, i) => (
              <span key={emp.id} className="bg-white/10 px-2 py-0.5 rounded-full text-xs text-white whitespace-nowrap">
                {emp.name?.split(' ')[0] || 'Employee'}
                {emp.clock_in_time && (
                  <span className="text-green-300 ml-1 font-mono">
                    {formatElapsedTime(emp.clock_in_time)}
                  </span>
                )}
              </span>
            ))}
            {clockedInEmployees.length > 3 && (
              <span className="text-slate-400 text-xs">+{clockedInEmployees.length - 3} more</span>
            )}
          </div>

          {/* Right: Total labor & expand button */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-green-400 text-sm font-semibold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {totalLabor.toFixed(2)}
              </p>
              <p className="text-slate-500 text-[10px]">labor</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-2 bg-slate-800/70 rounded-xl p-3 border border-slate-700/50 space-y-2">
          {clockedInEmployees.map((emp) => (
            <div 
              key={emp.id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">{emp.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-mono text-lg font-bold">
                  {formatElapsedTime(emp.clock_in_time)}
                </span>
                <span className="text-green-400 text-sm">
                  ${calculatePay(emp.clock_in_time, emp.hourly_rate)}
                </span>
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-slate-600">
            <span className="text-slate-400 text-sm">Total Labor Cost:</span>
            <span className="text-green-400 font-bold">${totalLabor.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
