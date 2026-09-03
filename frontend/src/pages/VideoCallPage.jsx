import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VideoCallPage() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingToken, setMeetingToken] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const isAdmin = user.role === "admin";
  const displayName = user.name || user.email || "Guest";

  // Fetch room info + meeting token
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get(`${API}/video-calls/rooms/${roomName}`);
        setRoomInfo(res.data);

        // Get a meeting token for the user
        if (token) {
          try {
            const tokenRes = await axios.post(
              `${API}/video-calls/rooms/${roomName}/token`,
              { name: displayName, is_owner: isAdmin }
            );
            setMeetingToken(tokenRes.data?.token);
          } catch (tokenErr) {
            const detail = tokenErr.response?.data?.detail || "";
            if (tokenErr.response?.status === 402 || detail.toLowerCase().includes("payment")) {
              setError("Daily.co account needs a payment method. Add one at dashboard.daily.co/billing");
              return;
            }
            // Continue without token
          }
        }
      } catch {
        setError("Room not found or has expired");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [roomName]);

  const leaveCall = async () => {
    if (token) {
      try {
        await axios.post(
          `${API}/video-calls/rooms/${roomName}/end`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {}
    }
    navigate(-1);
  };

  // Build the Daily.co iframe URL with token
  const getDailyUrl = () => {
    if (!roomInfo?.daily_url) return null;
    let url = roomInfo.daily_url;
    if (meetingToken) {
      url += `?t=${meetingToken}`;
    }
    return url;
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F0F23" }}>
        <div className="text-center space-y-4 p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <PhoneOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">{error}</h2>
          <Button
            onClick={() => navigate(-1)}
            className="bg-[#00D4FF] hover:bg-[#00B8E0] text-black font-medium"
            data-testid="call-error-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const dailyUrl = getDailyUrl();

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0F0F23" }} data-testid="video-call-page">
      {/* Minimal header — Daily's UI handles all call controls */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0"
        style={{ background: "linear-gradient(90deg, #1A1A2E, #16213E)" }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2"
            data-testid="call-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-white" data-testid="call-room-name">
            {roomInfo?.purpose === "interview" ? "Interview Call" : "Video Call"}
          </h1>
        </div>
        <Button
          size="sm"
          onClick={leaveCall}
          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3"
          data-testid="leave-call-btn"
        >
          <PhoneOff className="w-3 h-3 mr-1" /> Leave
        </Button>
      </div>

      {/* Daily.co room embedded as a direct iframe */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#00D4FF] animate-spin" />
          </div>
        ) : dailyUrl ? (
          <iframe
            src={dailyUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; screen-wake-lock"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            data-testid="daily-iframe"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/40">Unable to load call</p>
          </div>
        )}
      </div>
    </div>
  );
}
