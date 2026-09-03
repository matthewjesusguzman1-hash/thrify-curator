import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, Phone, PhoneIncoming, PhoneOff, Clock, 
  ArrowLeft, Plus, Users, Circle, Loader2,
  Play, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(isoStr) {
  if (!isoStr) return "--";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function PurposeBadge({ purpose }) {
  const styles = {
    interview: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    "worker-admin": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "ad-hoc": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };
  const labels = { interview: "Interview", "worker-admin": "Team Call", "ad-hoc": "Ad-Hoc" };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${styles[purpose] || styles["ad-hoc"]}`}>
      {labels[purpose] || purpose}
    </span>
  );
}

function StatusDot({ status }) {
  if (status === "active" || status === "pending") return <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />;
  if (status === "ended") return <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />;
}

export default function VideoCallsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const isAdmin = user.role === "admin";
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [tab, setTab] = useState("active");
  const [calls, setCalls] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [creating, setCreating] = useState(false);

  // For worker request flow
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requesting, setRequesting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [historyRes, pendingRes, recordingsRes] = await Promise.all([
        axios.get(`${API}/video-calls/history`, authHeader),
        axios.get(`${API}/video-calls/call-requests/pending`, authHeader),
        axios.get(`${API}/video-calls/recordings`, authHeader),
      ]);
      setCalls(historyRes.data.calls || []);
      setPendingRequests(pendingRes.data.requests || []);
      setRecordings(recordingsRes.data.recordings || []);
    } catch (err) {
      console.error("Failed to fetch video call data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    // If admin, fetch employee list for call requests
    if (isAdmin) {
      axios.get(`${API}/admin/employees`, authHeader)
        .then(res => setEmployees(res.data.employees || res.data || []))
        .catch(() => {});
    } else {
      // Workers fetch admin list
      axios.get(`${API}/admin/employees`, authHeader)
        .then(res => {
          const admins = (res.data.employees || res.data || []).filter(e => e.role === "admin");
          setEmployees(admins);
        })
        .catch(() => {});
    }
    // Poll every 10s for updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData, isAdmin]);

  const startAdHocCall = async (enableRecording = false) => {
    setCreating(true);
    try {
      const res = await axios.post(`${API}/video-calls/rooms`, {
        purpose: "ad-hoc",
        expires_minutes: 120,
        enable_recording: enableRecording,
        participant_names: [user.name || user.email],
      }, authHeader);
      toast.success("Room created!");
      navigate(`/call/${res.data.room_name}`);
    } catch (err) {
      toast.error("Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const requestCallWithAdmin = async () => {
    if (!selectedAdmin) { toast.error("Select an admin"); return; }
    setRequesting(true);
    try {
      const res = await axios.post(`${API}/video-calls/call-request`, {
        admin_id: selectedAdmin,
        message: requestMessage,
      }, authHeader);
      toast.success("Call request sent! Waiting for admin to join...");
      navigate(`/call/${res.data.room_name}`);
    } catch (err) {
      toast.error("Failed to send call request");
    } finally {
      setRequesting(false);
    }
  };

  const acceptRequest = async (req) => {
    try {
      const res = await axios.post(`${API}/video-calls/call-requests/${req.id}/accept`, {}, authHeader);
      toast.success(`Joining call with ${req.caller_name}...`);
      navigate(`/call/${res.data.room_name}`);
    } catch {
      toast.error("Failed to accept call request");
    }
  };

  const declineRequest = async (req) => {
    try {
      await axios.post(`${API}/video-calls/call-requests/${req.id}/decline`, {}, authHeader);
      toast.info("Call declined");
      fetchData();
    } catch {
      toast.error("Failed to decline");
    }
  };

  const activeCalls = calls.filter(c => c.status === "active" || c.status === "pending");
  const pastCalls = calls.filter(c => c.status === "ended");

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)" }} data-testid="video-calls-page">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{
          background: "linear-gradient(90deg, #1A1A2E, #16213E)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2"
            data-testid="video-calls-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#00D4FF]" />
            <h1 className="text-lg font-semibold text-white">Video Calls</h1>
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-[#00D4FF] hover:bg-[#00B8E0] text-black font-medium text-xs px-3"
            onClick={() => startAdHocCall(false)}
            disabled={creating}
            data-testid="start-call-btn"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            New Call
          </Button>
        )}
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Incoming Call Requests - always visible at top for admins */}
        {isAdmin && pendingRequests.length > 0 && (
          <div className="mb-4 space-y-2" data-testid="pending-requests-section">
            {pendingRequests.map(req => (
              <div
                key={req.id}
                className="bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/30 rounded-xl p-4 flex items-center justify-between gap-3 animate-pulse"
                data-testid={`pending-request-${req.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
                    <PhoneIncoming className="w-5 h-5 text-[#00D4FF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{req.caller_name}</p>
                    {req.message && <p className="text-white/50 text-xs truncate">{req.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => acceptRequest(req)}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full w-10 h-10 p-0"
                    data-testid={`accept-call-${req.id}`}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => declineRequest(req)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full w-10 h-10 p-0"
                    data-testid={`decline-call-${req.id}`}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Worker: Request a call with admin */}
        {!isAdmin && (
          <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-4 space-y-3" data-testid="worker-call-request-section">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#00D4FF]" />
              Request a Call
            </h3>
            <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-admin-trigger">
                <SelectValue placeholder="Select admin to call..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/20" data-testid="select-admin-content">
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id} className="text-white hover:bg-white/10">
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="text"
              value={requestMessage}
              onChange={e => setRequestMessage(e.target.value)}
              placeholder="Optional message..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50"
              data-testid="call-request-message-input"
            />
            <Button
              className="w-full bg-[#00D4FF] hover:bg-[#00B8E0] text-black font-medium"
              onClick={requestCallWithAdmin}
              disabled={requesting || !selectedAdmin}
              data-testid="send-call-request-btn"
            >
              {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
              Request Video Call
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-lg mb-4" data-testid="video-calls-tabs">
            <TabsTrigger value="active" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="active-calls-tab">
              Active {activeCalls.length > 0 && `(${activeCalls.length})`}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="history-tab">
              History
            </TabsTrigger>
            <TabsTrigger value="recordings" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="recordings-tab">
              Recordings {recordings.length > 0 && `(${recordings.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Active Calls */}
          <TabsContent value="active">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#00D4FF] animate-spin" /></div>
            ) : activeCalls.length === 0 ? (
              <div className="text-center py-12" data-testid="no-active-calls">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Video className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">No active calls</p>
                {isAdmin && (
                  <Button
                    size="sm"
                    className="mt-4 bg-[#00D4FF] hover:bg-[#00B8E0] text-black text-xs"
                    onClick={() => startAdHocCall(false)}
                    data-testid="start-call-empty-btn"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Start a Call
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {activeCalls.map(call => (
                  <div
                    key={call.id || call.room_name}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                    data-testid={`active-call-${call.room_name}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusDot status={call.status} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm truncate">{call.created_by || "Unknown"}</p>
                          <PurposeBadge purpose={call.purpose} />
                        </div>
                        <p className="text-white/40 text-xs">{formatDate(call.created_at)}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-3"
                      onClick={() => navigate(`/call/${call.room_name}`)}
                      data-testid={`join-call-${call.room_name}`}
                    >
                      <Phone className="w-3 h-3 mr-1" /> Join
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#00D4FF] animate-spin" /></div>
            ) : pastCalls.length === 0 ? (
              <div className="text-center py-12" data-testid="no-history">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">No call history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pastCalls.map(call => (
                  <div
                    key={call.id || call.room_name}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                    data-testid={`history-call-${call.room_name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusDot status={call.status} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm truncate">{call.created_by || "Unknown"}</p>
                            <PurposeBadge purpose={call.purpose} />
                          </div>
                          <p className="text-white/40 text-xs">{formatDate(call.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white/60 text-xs">{formatDuration(call.duration_seconds)}</p>
                        {call.participant_names?.length > 0 && (
                          <p className="text-white/30 text-xs flex items-center gap-1 justify-end">
                            <Users className="w-3 h-3" /> {call.participant_names.length}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recordings */}
          <TabsContent value="recordings">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#00D4FF] animate-spin" /></div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-12" data-testid="no-recordings">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Circle className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">No recordings yet</p>
                <p className="text-white/30 text-xs mt-1">Enable recording when starting a call</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recordings.map(rec => (
                  <div
                    key={rec.id || rec.room_name}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                    data-testid={`recording-${rec.room_name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Circle className="w-3 h-3 text-red-400 fill-red-400 flex-shrink-0" />
                          <p className="text-white font-medium text-sm truncate">{rec.created_by}</p>
                          <PurposeBadge purpose={rec.purpose} />
                        </div>
                        <p className="text-white/40 text-xs mt-1">{formatDate(rec.created_at)} - {formatDuration(rec.duration_seconds)}</p>
                      </div>
                      {rec.recording_urls?.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00D4FF] hover:text-[#00B8E0] text-xs"
                          onClick={() => window.open(rec.recording_urls[0], "_blank")}
                          data-testid={`play-recording-${rec.room_name}`}
                        >
                          <Play className="w-3 h-3 mr-1" /> Play
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
