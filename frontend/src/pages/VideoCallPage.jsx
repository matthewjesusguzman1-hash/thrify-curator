import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, 
  Circle, StopCircle, ArrowLeft, Users, Maximize2, Minimize2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import DailyIframe from "@daily-co/daily-js";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VideoCallPage() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const callFrameRef = useRef(null);
  const containerRef = useRef(null);

  const [callFrame, setCallFrame] = useState(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(true);
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState(null);

  // Media controls
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const isAdmin = user.role === "admin";
  const displayName = user.name || user.email || "Guest";

  // Fetch room info
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await axios.get(`${API}/video-calls/rooms/${roomName}`);
        setRoomInfo(res.data);
      } catch {
        setError("Room not found or has expired");
        setJoining(false);
      }
    };
    fetchRoom();
  }, [roomName]);

  // Initialize Daily.co call
  useEffect(() => {
    if (!roomInfo?.daily_url) return;
    // Prevent duplicate creation (React StrictMode double-mount)
    if (callFrameRef.current) return;

    const initCall = async () => {
      try {
        // Destroy any lingering global Daily instance
        const existing = DailyIframe.getCallInstance();
        if (existing) {
          await existing.destroy();
        }

        const frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "12px",
          },
          showLeaveButton: false,
          showFullscreenButton: false,
          showLocalVideo: true,
          showParticipantsBar: true,
          theme: {
            colors: {
              accent: "#00D4FF",
              accentText: "#FFFFFF",
              background: "#1A1A2E",
              backgroundAccent: "#16213E",
              baseText: "#FFFFFF",
              border: "#2A2A4E",
              mainAreaBg: "#0F0F23",
              mainAreaBgAccent: "#16213E",
              mainAreaText: "#FFFFFF",
              supportiveText: "#9CA3AF",
            },
          },
        });

        // Set ref immediately to prevent duplicate creation
        callFrameRef.current = frame;

        frame.on("joined-meeting", () => {
          setJoined(true);
          setJoining(false);
          timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        });

        frame.on("left-meeting", () => {
          setJoined(false);
          if (timerRef.current) clearInterval(timerRef.current);
        });

        frame.on("participant-joined", () => {
          updateParticipantCount(frame);
        });
        frame.on("participant-left", () => {
          updateParticipantCount(frame);
        });
        frame.on("participant-updated", () => {
          updateParticipantCount(frame);
        });

        frame.on("error", (e) => {
          console.error("Daily error:", e);
          toast.error("Call error: " + (e?.errorMsg || "Unknown error"));
        });

        // Get a meeting token for recording control
        let meetingToken = null;
        try {
          if (token) {
            const tokenRes = await axios.post(
              `${API}/video-calls/rooms/${roomName}/token`,
              { name: displayName, is_owner: isAdmin }
            );
            meetingToken = tokenRes.data?.token;
          }
        } catch (tokenErr) {
          const detail = tokenErr.response?.data?.detail || "";
          if (tokenErr.response?.status === 402 || detail.toLowerCase().includes("payment")) {
            setError("Daily.co account needs a payment method. Go to dashboard.daily.co/billing to add one, then try again.");
            setJoining(false);
            return;
          }
          // Continue without token — public room
        }

        await frame.join({
          url: roomInfo.daily_url,
          userName: displayName,
          token: meetingToken || undefined,
        });

        setCallFrame(frame);
      } catch (err) {
        console.error("Failed to join call:", err);
        const msg = err?.message || "";
        if (msg.toLowerCase().includes("payment") || msg.toLowerCase().includes("billing")) {
          setError("Daily.co account needs a payment method. Go to dashboard.daily.co/billing to add one.");
        } else {
          setError("Failed to join the call. Check your connection and try again.");
        }
        setJoining(false);
      }
    };

    initCall();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Cleanup Daily.co frame on unmount
      if (callFrameRef.current) {
        try { callFrameRef.current.destroy(); } catch {}
        callFrameRef.current = null;
      }
    };
  }, [roomInfo]);

  const updateParticipantCount = (frame) => {
    const participants = frame.participants();
    setParticipantCount(Object.keys(participants).length);
  };

  const toggleAudio = useCallback(() => {
    if (!callFrame) return;
    callFrame.setLocalAudio(!audioOn);
    setAudioOn(!audioOn);
  }, [callFrame, audioOn]);

  const toggleVideo = useCallback(() => {
    if (!callFrame) return;
    callFrame.setLocalVideo(!videoOn);
    setVideoOn(!videoOn);
  }, [callFrame, videoOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!callFrame) return;
    if (screenSharing) {
      callFrame.stopScreenShare();
    } else {
      callFrame.startScreenShare();
    }
    setScreenSharing(!screenSharing);
  }, [callFrame, screenSharing]);

  const toggleRecording = useCallback(async () => {
    if (!callFrame) return;
    try {
      if (recording) {
        callFrame.stopRecording();
        toast.success("Recording stopped");
      } else {
        callFrame.startRecording();
        toast.success("Recording started");
      }
      setRecording(!recording);
    } catch {
      toast.error("Recording not available for this room");
    }
  }, [callFrame, recording]);

  const leaveCall = useCallback(async () => {
    if (callFrame) {
      await callFrame.leave();
      callFrame.destroy();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    // End room on backend
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
  }, [callFrame, roomName, token, navigate]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
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

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0F0F23" }} data-testid="video-call-page">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-white/10"
        style={{ background: "linear-gradient(90deg, #1A1A2E, #16213E)" }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2"
            data-testid="call-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px]" data-testid="call-room-name">
              {roomInfo?.purpose === "interview" ? "Interview Call" : roomInfo?.purpose === "worker-admin" ? "Team Call" : "Video Call"}
            </h1>
            {joined && (
              <p className="text-xs text-[#00D4FF]" data-testid="call-timer">{formatTime(elapsed)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {joined && (
            <span className="flex items-center gap-1 text-xs text-white/60" data-testid="participant-count">
              <Users className="w-3 h-3" /> {participantCount}
            </span>
          )}
          {recording && (
            <span className="flex items-center gap-1 text-xs text-red-400 animate-pulse" data-testid="recording-indicator">
              <Circle className="w-2 h-2 fill-red-400" /> REC
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white/60 hover:text-white p-1"
            data-testid="fullscreen-btn"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative" ref={containerRef} data-testid="call-video-container">
        {joining && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0F0F23" }}>
            <div className="text-center space-y-3">
              <Loader2 className="w-10 h-10 text-[#00D4FF] animate-spin mx-auto" />
              <p className="text-white/80 text-sm">Joining call...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {joined && (
        <div
          className="flex items-center justify-center gap-3 px-4 py-3 border-t border-white/10"
          style={{ background: "linear-gradient(90deg, #1A1A2E, #16213E)" }}
          data-testid="call-controls"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAudio}
            className={`rounded-full w-12 h-12 ${audioOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600"}`}
            data-testid="toggle-audio-btn"
          >
            {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVideo}
            className={`rounded-full w-12 h-12 ${videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600"}`}
            data-testid="toggle-video-btn"
          >
            {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleScreenShare}
            className={`rounded-full w-12 h-12 ${screenSharing ? "bg-[#00D4FF] text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
            data-testid="toggle-screenshare-btn"
          >
            <Monitor className="w-5 h-5" />
          </Button>

          {isAdmin && roomInfo?.enable_recording && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRecording}
              className={`rounded-full w-12 h-12 ${recording ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-white hover:bg-white/20"}`}
              data-testid="toggle-recording-btn"
            >
              {recording ? <StopCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </Button>
          )}

          <Button
            onClick={leaveCall}
            className="rounded-full w-14 h-12 bg-red-500 hover:bg-red-600 text-white"
            data-testid="leave-call-btn"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
