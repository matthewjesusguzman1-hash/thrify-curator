import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Monitor, ArrowLeft, RefreshCw, UserPlus, Search, AlertTriangle,
  Info, Clock, ChevronLeft, ChevronRight, Download, CalendarDays,
  LogIn, LogOut, Wifi, WifiOff, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
}

function MonthPicker({ value, onChange }) {
  const d = new Date(value + "-15");
  const label = d.toLocaleString("default", { month: "long", year: "numeric" });
  const prev = () => {
    const p = new Date(d);
    p.setMonth(p.getMonth() - 1);
    onChange(`${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`);
  };
  const next = () => {
    const n = new Date(d);
    n.setMonth(n.getMonth() + 1);
    onChange(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <div className="flex items-center gap-1" data-testid="month-picker">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="month-prev">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-white font-semibold text-sm min-w-[130px] text-center">{label}</span>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="month-next">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function DayPills({ month, selectedDate, onSelect }) {
  const daysInMonth = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const pills = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${month}-${String(i).padStart(2, "0")}`;
    const dayLabel = new Date(dateStr + "T12:00:00").toLocaleDateString("default", { weekday: "short" });
    const isSelected = selectedDate === dateStr;
    const isToday = dateStr === today;
    pills.push(
      <button
        key={dateStr}
        onClick={() => onSelect(isSelected ? null : dateStr)}
        className={`shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs transition-all ${
          isSelected
            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
            : isToday
            ? "bg-white/15 text-white border border-indigo-400/40"
            : "bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white/80"
        }`}
        data-testid={`day-pill-${dateStr}`}
      >
        <span className="font-medium">{i}</span>
        <span className="text-[9px] opacity-70">{dayLabel}</span>
      </button>
    );
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin" data-testid="day-pills">
      {pills}
    </div>
  );
}

function formatDuration(secs) {
  if (secs === null || secs === undefined) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function SessionCard({ s, isActive, onAssign, employees, mappingId, mappingName, setMappingName, mappingEmployeeId, setMappingEmployeeId, saveMapping, setMappingId }) {
  return (
    <div
      className={`bg-white/[0.04] border rounded-xl p-3.5 ${isActive ? "border-emerald-500/40" : "border-white/[0.08]"}`}
      data-testid={`session-card-${s.id}`}
    >
      {/* Top row: worker + status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
        <span className="font-semibold text-white text-sm">
          {s.worker_name || s.alias || `AnyDesk ${s.anydesk_id}`}
        </span>
        {isActive && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">LIVE</span>}
        {s.auth_method === "REJECTED" && <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">REJECTED</span>}
        {!s.worker_name && (
          <button
            onClick={() => onAssign(s.anydesk_id)}
            className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
            data-testid={`assign-worker-${s.anydesk_id}`}
          >
            <UserPlus className="w-3 h-3" /> Assign
          </button>
        )}
        <span className="text-[11px] text-white/30 ml-auto">{s.host}</span>
      </div>

      {/* Session times row */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 pl-4">
        <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-400/70" /> {formatTime(s.started_at)}</span>
        <span className="flex items-center gap-1"><WifiOff className="w-3 h-3 text-red-400/70" /> {s.ended_at ? formatTime(s.ended_at) : (isActive ? <span className="text-emerald-400">Active</span> : "—")}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-white/40" /> {formatDuration(s.duration_seconds)}</span>
      </div>

      {/* Time entry cross-reference */}
      {s.time_entry && (
        <div className="mt-2 ml-4 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/70">
            <span className="flex items-center gap-1">
              <LogIn className="w-3 h-3 text-indigo-300" />
              Clocked in: <span className="text-white/90">{formatTime(s.time_entry.clock_in)}</span>
            </span>
            <span className="flex items-center gap-1">
              <LogOut className="w-3 h-3 text-indigo-300" />
              Clocked out: <span className="text-white/90">{s.time_entry.clock_out ? formatTime(s.time_entry.clock_out) : "Still in"}</span>
            </span>
            {s.time_entry.total_hours != null && (
              <span className="text-white/90">{s.time_entry.total_hours.toFixed(2)}h logged</span>
            )}
            {s.time_entry.anydesk_auto_clocked_out && (
              <span className="text-amber-300 flex items-center gap-1">
                <Monitor className="w-3 h-3" /> Auto clock-out
              </span>
            )}
            {s.time_entry.admin_clocked && (
              <span className="text-sky-300">Admin clocked</span>
            )}
          </div>
        </div>
      )}
      {s.employee_id && !s.time_entry && (
        <div className="mt-2 ml-4 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-200/80">
          No matching clock-in for this session
        </div>
      )}

      {/* Mapping inline form */}
      {mappingId === s.anydesk_id && (
        <div className="mt-3 space-y-2">
          <select
            value={mappingEmployeeId}
            onChange={(e) => {
              setMappingEmployeeId(e.target.value);
              const emp = employees.find((emp2) => emp2.id === e.target.value);
              if (emp) setMappingName(emp.name);
            }}
            className="w-full h-9 rounded-lg bg-white/10 border border-white/20 text-white text-sm px-2 [&>option]:text-black"
            data-testid="worker-employee-select"
          >
            <option value="">Link to employee (enables cross-check)</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
              placeholder="Display name"
              className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
              data-testid="worker-name-input"
              onKeyDown={(e) => e.key === "Enter" && saveMapping(s.anydesk_id)}
            />
            <Button size="sm" className="h-8 bg-indigo-500 hover:bg-indigo-600" onClick={() => saveMapping(s.anydesk_id)} data-testid="worker-name-save">Save</Button>
            <Button size="sm" variant="ghost" className="h-8 text-white/60" onClick={() => { setMappingId(null); setMappingEmployeeId(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemoteSessionsPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [tab, setTab] = useState("sessions");
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mappingId, setMappingId] = useState(null);
  const [mappingName, setMappingName] = useState("");
  const [mappingEmployeeId, setMappingEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateParam = selectedDate ? `&date=${selectedDate}` : `&month=${month}`;
      const [sessRes, flagRes] = await Promise.all([
        axios.get(`${API}/remote-sessions?limit=500${dateParam}`, getAuthHeader()),
        axios.get(`${API}/remote-sessions/cross-check`, getAuthHeader()).catch(() => ({ data: { flags: [] } }))
      ]);
      setSessions(sessRes.data.sessions || []);
      setFlags(flagRes.data.flags || []);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) { navigate("/login"); return; }
      toast.error("Failed to load remote sessions");
    } finally { setLoading(false); }
  }, [navigate, month, selectedDate]);

  const fetchAlerts = useCallback(async () => {
    try {
      const dateParam = selectedDate ? `&date=${selectedDate}` : `&month=${month}`;
      const res = await axios.get(`${API}/remote-sessions/alerts?limit=200${dateParam}`, getAuthHeader());
      setAlerts(res.data.alerts || []);
    } catch { setAlerts([]); }
  }, [month, selectedDate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchData();
    fetchAlerts();
    axios.get(`${API}/admin/employees`, getAuthHeader())
      .then((res) => setEmployees((Array.isArray(res.data) ? res.data : res.data.employees || []).filter((e) => e.role !== "admin")))
      .catch(() => {});
  }, [fetchData, fetchAlerts, navigate]);

  const handleExport = async () => {
    try {
      const dateParam = selectedDate ? `&date=${selectedDate}` : `&month=${month}`;
      const res = await axios.get(`${API}/remote-sessions/export?${dateParam.slice(1)}`, { ...getAuthHeader(), responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = `remote_sessions_${selectedDate || month}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch { toast.error("Export failed"); }
  };

  const saveMapping = async (anydeskId) => {
    if (!mappingName.trim()) return;
    try {
      const emp = employees.find((e) => e.id === mappingEmployeeId);
      await axios.post(`${API}/remote-sessions/map`, {
        anydesk_id: anydeskId, worker_name: mappingName.trim(),
        employee_id: mappingEmployeeId || null, employee_email: emp?.email || null
      }, getAuthHeader());
      toast.success("Worker mapping saved");
      setMappingId(null); setMappingName(""); setMappingEmployeeId("");
      fetchData();
    } catch { toast.error("Failed to save"); }
  };

  const isActive = (s) => !s.ended_at && s.duration_seconds === null;
  const activeCount = sessions.filter(isActive).length;

  // Group sessions by day
  const grouped = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [s.worker_name, s.alias, s.anydesk_id, s.host].some((v) => v && v.toLowerCase().includes(q));
    });
    const groups = {};
    for (const s of filtered) {
      const day = (s.started_at || "").slice(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions, search]);

  const totalFiltered = grouped.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div className="min-h-screen bg-[#0F0F23]" data-testid="remote-sessions-page">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F0F23]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="text-white/70 hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="remote-sessions-back-btn">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg leading-tight">Remote Sessions</h1>
            <p className="text-white/50 text-xs">
              {activeCount > 0 && <span className="text-emerald-400 font-medium">{activeCount} active now</span>}
              {activeCount === 0 && "AnyDesk session history"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} className="text-white/50 hover:text-white hover:bg-white/10 gap-1 text-xs" data-testid="export-csv-btn">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { fetchData(); fetchAlerts(); }} disabled={loading} className="text-white/70 hover:text-white hover:bg-white/10" data-testid="remote-sessions-refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
        {/* Live cross-check flags */}
        {flags.length > 0 && (
          <div className="space-y-2" data-testid="cross-check-flags">
            {flags.map((f, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-xl px-4 py-3 border text-sm ${
                  f.severity === "alert" ? "bg-red-500/10 border-red-500/40 text-red-200"
                    : f.severity === "warning" ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                    : "bg-sky-500/10 border-sky-500/30 text-sky-200"
                }`}
                data-testid={`flag-${f.type}`}
              >
                {f.severity === "info" ? <Info className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>{f.detail}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.05] p-1 rounded-lg" data-testid="session-tabs">
          <button
            onClick={() => setTab("sessions")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "sessions" ? "bg-indigo-500 text-white shadow" : "text-white/50 hover:text-white/80"
            }`}
            data-testid="tab-sessions"
          >
            <Monitor className="w-3.5 h-3.5" /> Sessions
          </button>
          <button
            onClick={() => setTab("alerts")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "alerts" ? "bg-amber-500 text-white shadow" : "text-white/50 hover:text-white/80"
            }`}
            data-testid="tab-alerts"
          >
            <Bell className="w-3.5 h-3.5" /> Alerts
            {alerts.length > 0 && <span className="text-[10px] bg-white/20 px-1.5 rounded-full">{alerts.length}</span>}
          </button>
        </div>

        {/* Month + Day navigation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <MonthPicker value={month} onChange={(m) => { setMonth(m); setSelectedDate(null); }} />
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1" data-testid="clear-date-btn">
                <CalendarDays className="w-3 h-3" /> Show full month
              </button>
            )}
          </div>
          <DayPills month={month} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worker, ID, or host..."
            className="pl-9 bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/30 rounded-lg h-9 text-sm"
            data-testid="remote-sessions-search"
          />
        </div>

        {/* Content */}
        {tab === "sessions" ? (
          loading ? (
            <p className="text-center text-white/40 py-12">Loading sessions...</p>
          ) : totalFiltered === 0 ? (
            <div className="text-center py-14 px-6" data-testid="sessions-empty">
              <Monitor className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 font-medium">
                {sessions.length === 0 ? "No sessions for this period" : "No sessions match your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([day, items]) => {
                const dayDate = new Date(day + "T12:00:00");
                const dayLabel = dayDate.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" });
                const dayTotal = items.reduce((s, x) => s + (x.duration_seconds || 0), 0);
                return (
                  <div key={day} data-testid={`day-group-${day}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-white/80 text-sm font-semibold">{dayLabel}</span>
                      <span className="text-white/30 text-xs">{items.length} session{items.length !== 1 ? "s" : ""}</span>
                      {dayTotal > 0 && <span className="text-white/30 text-xs ml-auto">{formatDuration(dayTotal)} total</span>}
                    </div>
                    <div className="space-y-2">
                      {items.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}>
                          <SessionCard
                            s={s}
                            isActive={isActive(s)}
                            onAssign={(id) => { setMappingId(id); setMappingName(""); setMappingEmployeeId(""); }}
                            employees={employees}
                            mappingId={mappingId}
                            mappingName={mappingName}
                            setMappingName={setMappingName}
                            mappingEmployeeId={mappingEmployeeId}
                            setMappingEmployeeId={setMappingEmployeeId}
                            saveMapping={saveMapping}
                            setMappingId={setMappingId}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Alerts tab */
          alerts.length === 0 ? (
            <div className="text-center py-14 px-6" data-testid="alerts-empty">
              <Bell className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 font-medium">No alerts for this period</p>
              <p className="text-white/40 text-sm mt-1">Cross-check alerts will appear here when flagged</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const typeLabel = a.type === "clocked_in_no_session" ? "Clocked in, no session"
                  : a.type === "session_no_clock_in" ? "Session, no clock-in"
                  : a.type || "Alert";
                const severity = a.type === "session_no_clock_in" ? "alert" : "warning";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                    className={`rounded-xl px-4 py-3 border text-sm ${
                      severity === "alert" ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                    }`}
                    data-testid={`alert-item-${i}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${severity === "alert" ? "text-red-400" : "text-amber-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            severity === "alert" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                          }`}>{typeLabel}</span>
                          <span className="text-white/30 text-xs ml-auto">{formatDT(a.sent_at)}</span>
                        </div>
                        <p className={`mt-1 ${severity === "alert" ? "text-red-200" : "text-amber-200"}`}>{a.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
