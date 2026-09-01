import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Monitor, ArrowLeft, RefreshCw, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function RemoteSessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | active
  const [search, setSearch] = useState("");
  const [mappingId, setMappingId] = useState(null);
  const [mappingName, setMappingName] = useState("");

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/remote-sessions?limit=300`, getAuthHeader());
      setSessions(res.data.sessions || []);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        navigate("/login");
        return;
      }
      toast.error("Failed to load remote sessions");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchSessions();
  }, [fetchSessions, navigate]);

  const saveMapping = async (anydeskId) => {
    if (!mappingName.trim()) return;
    try {
      await axios.post(`${API}/remote-sessions/map`, { anydesk_id: anydeskId, worker_name: mappingName.trim() }, getAuthHeader());
      toast.success("Worker name saved");
      setMappingId(null);
      setMappingName("");
      fetchSessions();
    } catch (e) {
      toast.error("Failed to save worker name");
    }
  };

  const formatDuration = (secs) => {
    if (secs === null || secs === undefined) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDT = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const isActive = (s) => !s.ended_at && s.duration_seconds === null;

  const filtered = sessions.filter((s) => {
    if (filter === "active" && !isActive(s)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [s.worker_name, s.alias, s.anydesk_id, s.host].some((v) => v && v.toLowerCase().includes(q));
    }
    return true;
  });

  const activeCount = sessions.filter(isActive).length;

  return (
    <div className="min-h-screen bg-[#0F0F23]" data-testid="remote-sessions-page">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F0F23]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="text-white/70 hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            data-testid="remote-sessions-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg leading-tight">Remote Sessions</h1>
            <p className="text-white/50 text-xs">
              AnyDesk logins {activeCount > 0 && <span className="text-emerald-400 font-medium">• {activeCount} active now</span>}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSessions}
            disabled={loading}
            className="text-white/70 hover:text-white hover:bg-white/10"
            data-testid="remote-sessions-page-refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search worker, ID, or host..."
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg"
              data-testid="remote-sessions-search"
            />
          </div>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? "bg-indigo-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
            data-testid="filter-all-btn"
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "active" ? "bg-emerald-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
            data-testid="filter-active-btn"
          >
            Active
          </button>
        </div>

        {/* Sessions list */}
        {loading ? (
          <p className="text-center text-white/40 py-12">Loading sessions...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 px-6" data-testid="remote-sessions-page-empty">
            <Monitor className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 font-medium">
              {sessions.length === 0 ? "No remote sessions recorded yet" : "No sessions match your filter"}
            </p>
            {sessions.length === 0 && (
              <p className="text-white/40 text-sm mt-2">
                Install the watcher on the host PC (watcher/README_SETUP.md) to start tracking AnyDesk logins.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={`bg-white/[0.06] border rounded-xl p-4 ${isActive(s) ? "border-emerald-500/40" : "border-white/10"}`}
                data-testid={`page-session-${s.id}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive(s) ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                  <span className="font-semibold text-white text-sm">
                    {s.worker_name || s.alias || `AnyDesk ${s.anydesk_id}`}
                  </span>
                  {isActive(s) && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">LIVE</span>}
                  {s.auth_method === "REJECTED" && <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">REJECTED</span>}
                  {!s.worker_name && (
                    <button
                      onClick={() => { setMappingId(s.anydesk_id); setMappingName(""); }}
                      className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                      data-testid={`page-assign-worker-${s.anydesk_id}`}
                    >
                      <UserPlus className="w-3 h-3" /> Assign name
                    </button>
                  )}
                  <span className="text-xs text-white/40 ml-auto">{s.host}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-white/60 pl-4.5">
                  <span>Start: <span className="text-white/80">{formatDT(s.started_at)}</span></span>
                  <span>End: <span className="text-white/80">{s.ended_at ? formatDT(s.ended_at) : (isActive(s) ? "In progress" : "—")}</span></span>
                  <span>Duration: <span className="text-white/80">{formatDuration(s.duration_seconds)}</span></span>
                  <span>Auth: <span className="text-white/80">{s.auth_method || "—"}</span></span>
                </div>
                {mappingId === s.anydesk_id && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={mappingName}
                      onChange={(e) => setMappingName(e.target.value)}
                      placeholder="Worker name (e.g. Maria)"
                      className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      data-testid="page-worker-name-input"
                      onKeyDown={(e) => e.key === "Enter" && saveMapping(s.anydesk_id)}
                      autoFocus
                    />
                    <Button size="sm" className="h-8 bg-indigo-500 hover:bg-indigo-600" onClick={() => saveMapping(s.anydesk_id)} data-testid="page-worker-name-save">Save</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-white/60" onClick={() => setMappingId(null)}>Cancel</Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
