import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, Phone, PhoneIncoming, PhoneOff, Clock, 
  ArrowLeft, Plus, Users, Circle, Loader2,
  Play, CheckCircle, XCircle, Trash2, Copy, Link2
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

  // For admin invite flow
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [selectedInvitees, setSelectedInvitees] = useState([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [enableRecording, setEnableRecording] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const buildShareMessage = (url) => {
    if (scheduledDate && scheduledTime) {
      const d = new Date(`${scheduledDate}T${scheduledTime}`);
      const timeStr = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
      return `Join me for a video call at ${timeStr}\n${url}`;
    }
    if (scheduledTime) {
      const today = new Date();
      const d = new Date(`${today.toISOString().split("T")[0]}T${scheduledTime}`);
      const timeStr = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
      return `Join me for a video call at ${timeStr}\n${url}`;
    }
    return `Join me for a video call:\n${url}`;
  };


  const deleteCall = async (roomName) => {
    try {
      await axios.delete(`${API}/video-calls/calls/${roomName}`, authHeader);
      toast.success("Call deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete call");
    }
  };

  const clearAllEnded = async () => {
    if (!window.confirm("Delete all ended calls from history?")) return;
    try {
      const res = await axios.delete(`${API}/video-calls/calls`, authHeader);
      toast.success(`Cleared ${res.data.deleted_count} call(s)`);
      fetchData();
    } catch {
      toast.error("Failed to clear history");
    }
  };

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
      // Fetch both employees and other admins for invite list
      Promise.all([
        axios.get(`${API}/admin/employees`, authHeader),
        axios.get(`${API}/video-calls/admins`, authHeader),
      ]).then(([empRes, adminRes]) => {
        const emps = empRes.data.employees || empRes.data || [];
        const admins = (adminRes.data.admins || [])
          .filter(a => a.id !== user.id) // exclude self
          .map(a => ({ ...a, role: "admin" }));
        setEmployees([...admins, ...emps]);
      }).catch(() => {});
    } else {
      // Workers fetch admin list from video-calls endpoint
      axios.get(`${API}/video-calls/admins`, authHeader)
        .then(res => setEmployees(res.data.admins || []))
        .catch(() => {});
    }
    // Poll every 10s for updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData, isAdmin]);

  const [justCreated, setJustCreated] = useState(null); // { room_name, daily_url, shareMsg }

  const startAdHocCall = async () => {
    setCreating(true);
    try {
      const scheduledIso = (scheduledDate && scheduledTime)
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : scheduledTime
          ? new Date(`${new Date().toISOString().split("T")[0]}T${scheduledTime}`).toISOString()
          : null;

      let roomName, dailyUrl;

      if (selectedInvitees.length > 0) {
        const res = await axios.post(`${API}/video-calls/invite-to-call`, {
          invitee_ids: selectedInvitees,
          message: inviteMessage,
          enable_recording: enableRecording,
          scheduled_at: scheduledIso,
        }, authHeader);
        roomName = res.data.room_name;
        dailyUrl = res.data.daily_url;
        toast.success(`${res.data.invited} invite(s) sent!`);
      } else {
        const res = await axios.post(`${API}/video-calls/rooms`, {
          purpose: "ad-hoc",
          expires_minutes: 120,
          enable_recording: enableRecording,
          scheduled_at: scheduledIso,
        }, authHeader);
        roomName = res.data.room_name;
        dailyUrl = res.data.url;
      }

      const shareMsg = buildShareMessage(dailyUrl);
      setJustCreated({ room_name: roomName, daily_url: dailyUrl, shareMsg });
      setShowInvitePanel(false);
      setSelectedInvitees([]);
      setInviteMessage("");
      setEnableRecording(false);
      setScheduledDate("");
      setScheduledTime("");
      fetchData();
    } catch (err) {
      toast.error("Failed to create call");
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
  const scheduledCalls = calls.filter(c => c.status === "scheduled");
  const pastCalls = calls.filter(c => c.status === "ended");

  // Check for upcoming calls within 5 minutes for reminder
  const upcomingReminder = scheduledCalls.find(c => {
    if (!c.scheduled_at) return false;
    const diff = new Date(c.scheduled_at) - new Date();
    return diff > 0 && diff < 5 * 60 * 1000; // within 5 minutes
  });

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
            onClick={() => setShowInvitePanel(!showInvitePanel)}
            disabled={creating}
            data-testid="start-call-btn"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            New Call
          </Button>
        )}
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Admin: Invite panel for starting a call with selected people */}
        {isAdmin && showInvitePanel && (
          <div className="mb-4 bg-white/5 border border-[#00D4FF]/30 rounded-xl p-4 space-y-3" data-testid="invite-panel">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00D4FF]" />
              Start a Call — Who's Joining?
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {employees.map(emp => (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedInvitees.includes(emp.id) ? "bg-[#00D4FF]/15 border border-[#00D4FF]/30" : "bg-white/5 border border-transparent hover:bg-white/10"
                  }`}
                  data-testid={`invite-checkbox-${emp.id}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedInvitees.includes(emp.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedInvitees(prev => [...prev, emp.id]);
                      else setSelectedInvitees(prev => prev.filter(id => id !== emp.id));
                    }}
                    className="accent-[#00D4FF]"
                  />
                  <span className="text-white text-sm">{emp.name || emp.email}</span>
                  {emp.role && <span className="text-white/30 text-xs">({emp.role})</span>}
                </label>
              ))}
            </div>
            <input
              type="text"
              value={inviteMessage}
              onChange={e => setInviteMessage(e.target.value)}
              placeholder="Optional message..."
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50"
              data-testid="invite-message-input"
            />
            <label className="flex items-center gap-2 text-white/60 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={enableRecording}
                onChange={e => setEnableRecording(e.target.checked)}
                className="accent-red-400"
                data-testid="enable-recording-checkbox"
              />
              <Circle className="w-3 h-3 text-red-400" /> Enable recording
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50"
                data-testid="scheduled-date-input"
              />
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50"
                data-testid="scheduled-time-input"
              />
            </div>
            {(scheduledDate || scheduledTime) && (
              <p className="text-[#00D4FF]/60 text-xs">
                Copied link will include: "Join me at {scheduledTime ? new Date(`2000-01-01T${scheduledTime}`).toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"}) : "..."}{scheduledDate ? ` on ${new Date(scheduledDate + "T12:00").toLocaleDateString("en-US", {month: "short", day: "numeric"})}` : ""}"
              </p>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#00D4FF] hover:bg-[#00B8E0] text-black font-medium text-sm"
                onClick={startAdHocCall}
                disabled={creating}
                data-testid="start-invite-call-btn"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
                {selectedInvitees.length > 0 ? `Call ${selectedInvitees.length} ${selectedInvitees.length === 1 ? "person" : "people"}` : "Create & Copy Link"}
              </Button>
              <Button
                variant="ghost"
                className="text-white/50 hover:text-white text-sm"
                onClick={() => { setShowInvitePanel(false); setSelectedInvitees([]); }}
                data-testid="cancel-invite-btn"
              >
                Cancel
              </Button>
            </div>
            <p className="text-white/30 text-xs">
              {selectedInvitees.length > 0
                ? "Selected people will get an in-app notification to join."
                : "Skip selecting people to create a call link you can share with anyone."}
            </p>
          </div>
        )}

        {/* Just Created — share/join card */}
        {justCreated && (
          <div className="mb-4 bg-gradient-to-r from-emerald-500/10 to-[#00D4FF]/10 border border-emerald-500/30 rounded-xl p-4 space-y-3" data-testid="just-created-card">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Call Created
              </h3>
              <button onClick={() => setJustCreated(null)} className="text-white/30 hover:text-white/60 p-1">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-xs text-white/70 font-mono break-all" data-testid="share-message-preview">
              {justCreated.shareMsg}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(justCreated.shareMsg);
                  toast.success("Copied! Paste into a text or email.");
                }}
                data-testid="copy-share-msg-btn"
              >
                <Copy className="w-3 h-3 mr-1" /> Copy Invite
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs"
                onClick={() => navigate(`/call/${justCreated.room_name}`)}
                data-testid="join-created-call-btn"
              >
                <Phone className="w-3 h-3 mr-1" /> Join Now
              </Button>
            </div>
          </div>
        )}

        {/* Incoming Call Requests - visible for ALL users */}
        {pendingRequests.length > 0 && (
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
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 rounded-lg mb-4" data-testid="video-calls-tabs">
            <TabsTrigger value="active" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="active-calls-tab">
              Active {activeCalls.length > 0 && `(${activeCalls.length})`}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="upcoming-tab">
              Upcoming {scheduledCalls.length > 0 && `(${scheduledCalls.length})`}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="history-tab">
              History
            </TabsTrigger>
            <TabsTrigger value="recordings" className="data-[state=active]:bg-[#00D4FF]/20 data-[state=active]:text-[#00D4FF] text-white/60 text-xs" data-testid="recordings-tab">
              Rec
            </TabsTrigger>
          </TabsList>

          {/* Upcoming call reminder */}
          {upcomingReminder && (
            <div className="mb-3 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3" data-testid="upcoming-reminder">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">Call starting soon</p>
                  <p className="text-amber-300/70 text-xs">
                    {new Date(upcomingReminder.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — {upcomingReminder.created_by}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 flex-shrink-0"
                onClick={() => navigate(`/call/${upcomingReminder.room_name}`)}
                data-testid="join-reminder-btn"
              >
                <Phone className="w-3 h-3 mr-1" /> Join
              </Button>
            </div>
          )}

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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white text-xs px-3"
                        onClick={() => navigate(`/call/${call.room_name}`)}
                        data-testid={`join-call-${call.room_name}`}
                      >
                        <Phone className="w-3 h-3 mr-1" /> Join
                      </Button>
                      <button
                        onClick={() => {
                          const url = call.daily_url || `https://thrifty-curator.daily.co/${call.room_name}`;
                          navigator.clipboard.writeText(`Join me for a video call:\n${url}`);
                          toast.success("Invite message copied!");
                        }}
                        className="text-white/30 hover:text-[#00D4FF] p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        data-testid={`copy-link-${call.room_name}`}
                        title="Copy invite link"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCall(call.room_name)}
                        className="text-white/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        data-testid={`delete-active-call-${call.room_name}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upcoming / Scheduled */}
          <TabsContent value="upcoming">
            {scheduledCalls.length === 0 ? (
              <div className="text-center py-12" data-testid="no-upcoming">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">No upcoming calls</p>
                <p className="text-white/25 text-xs mt-1">Schedule a call using the New Call button</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledCalls.map(call => {
                  const scheduledTime = call.scheduled_at
                    ? new Date(call.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
                    : "TBD";
                  const isNow = call.scheduled_at && (new Date(call.scheduled_at) - new Date()) < 5 * 60 * 1000;
                  return (
                    <div
                      key={call.id || call.room_name}
                      className={`border rounded-xl p-4 ${isNow ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"}`}
                      data-testid={`upcoming-call-${call.room_name}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 flex-shrink-0 ${isNow ? "text-amber-400 animate-pulse" : "text-white/40"}`} />
                            <p className="text-white font-medium text-sm">{scheduledTime}</p>
                          </div>
                          <p className="text-white/40 text-xs mt-1">Created by {call.created_by}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            size="sm"
                            className={`text-xs px-3 ${isNow ? "bg-green-500 hover:bg-green-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                            onClick={() => navigate(`/call/${call.room_name}`)}
                            data-testid={`join-upcoming-${call.room_name}`}
                          >
                            <Phone className="w-3 h-3 mr-1" /> {isNow ? "Join Now" : "Join"}
                          </Button>
                          <button
                            onClick={() => {
                              const url = call.daily_url || `https://thrifty-curator.daily.co/${call.room_name}`;
                              const msg = `Join me for a video call at ${scheduledTime}\n${url}`;
                              navigator.clipboard.writeText(msg);
                              toast.success("Invite copied!");
                            }}
                            className="text-white/30 hover:text-[#00D4FF] p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="Copy invite"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCall(call.room_name)}
                            className="text-white/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Cancel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                {pastCalls.length > 0 && (
                  <div className="flex justify-end mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs"
                      onClick={clearAllEnded}
                      data-testid="clear-all-history-btn"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Clear All Ended
                    </Button>
                  </div>
                )}
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-white/60 text-xs">{formatDuration(call.duration_seconds)}</p>
                          {call.participant_names?.length > 0 && (
                            <p className="text-white/30 text-xs flex items-center gap-1 justify-end">
                              <Users className="w-3 h-3" /> {call.participant_names.length}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteCall(call.room_name)}
                          className="text-white/20 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          data-testid={`delete-call-${call.room_name}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recordings */}
          <TabsContent value="recordings">
            <div className="text-center py-8" data-testid="recordings-redirect">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Circle className="w-8 h-8 text-red-400 fill-red-400" />
              </div>
              <p className="text-white/60 text-sm mb-1">
                {recordings.length > 0 ? `${recordings.length} recording${recordings.length !== 1 ? "s" : ""} available` : "No recordings yet"}
              </p>
              <p className="text-white/30 text-xs mb-4">
                {recordings.length > 0 ? "View, play, and download recordings" : "Enable recording when starting a call"}
              </p>
              <Button
                size="sm"
                className="bg-[#00D4FF] hover:bg-[#00B8E0] text-black text-xs px-4"
                onClick={() => navigate("/recordings")}
                data-testid="open-recordings-page-btn"
              >
                <Play className="w-3 h-3 mr-1" />
                {recordings.length > 0 ? "Open Recordings" : "Check Recordings"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
