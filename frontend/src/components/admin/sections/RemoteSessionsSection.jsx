import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Monitor, ChevronDown, ChevronUp, RefreshCw, UserPlus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = process.env.REACT_APP_BACKEND_URL;

export default function RemoteSessionsSection({ getAuthHeader, formatDateTime }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [mappingId, setMappingId] = useState(null);
  const [mappingName, setMappingName] = useState("");

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/remote-sessions?limit=100`, getAuthHeader());
      setSessions(res.data.sessions || []);
    } catch (e) {
      toast.error("Failed to load remote sessions");
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && sessions.length === 0) fetchSessions();
  };

  const saveMapping = async (anydeskId) => {
    if (!mappingName.trim()) return;
    try {
      await axios.post(`${API}/api/remote-sessions/map`, {
        anydesk_id: anydeskId,
        worker_name: mappingName.trim()
      }, getAuthHeader());
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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        data-testid="remote-sessions-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[#1A1A2E]">Remote Sessions</h3>
            <p className="text-xs text-gray-500">AnyDesk logins on the host PC</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading} data-testid="remote-sessions-refresh">
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {sessions.length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center py-6" data-testid="remote-sessions-empty">
              No remote sessions recorded yet. Install the watcher on the host PC (see watcher/README_SETUP.md) to start tracking AnyDesk logins.
            </p>
          )}

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="border border-gray-100 rounded-lg p-3" data-testid={`remote-session-${s.id}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Circle className={`w-2.5 h-2.5 ${s.ended_at ? "text-gray-300 fill-gray-300" : "text-emerald-500 fill-emerald-500 animate-pulse"}`} />
                    <span className="font-medium text-sm text-[#1A1A2E]">
                      {s.worker_name || s.alias || `AnyDesk ${s.anydesk_id}`}
                    </span>
                    {!s.worker_name && (
                      <button
                        onClick={() => { setMappingId(s.anydesk_id); setMappingName(""); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        data-testid={`assign-worker-${s.anydesk_id}`}
                      >
                        <UserPlus className="w-3 h-3" /> Assign name
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{s.host}</span>
                </div>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs text-gray-600">
                  <span>Start: {formatDateTime ? formatDateTime(s.started_at) : s.started_at}</span>
                  <span>End: {s.ended_at ? (formatDateTime ? formatDateTime(s.ended_at) : s.ended_at) : (s.duration_seconds === null ? "Active / unknown" : "—")}</span>
                  <span>Duration: {formatDuration(s.duration_seconds)}</span>
                  <span>Auth: {s.auth_method || "—"} {s.auth_method === "REJECTED" && <span className="text-red-500 font-medium">(rejected)</span>}</span>
                </div>
                {mappingId === s.anydesk_id && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={mappingName}
                      onChange={(e) => setMappingName(e.target.value)}
                      placeholder="Worker name (e.g. Maria)"
                      className="h-8 text-sm"
                      data-testid="worker-name-input"
                      onKeyDown={(e) => e.key === "Enter" && saveMapping(s.anydesk_id)}
                    />
                    <Button size="sm" className="h-8" onClick={() => saveMapping(s.anydesk_id)} data-testid="worker-name-save">Save</Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setMappingId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
