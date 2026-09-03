import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, PhoneIncoming, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function IncomingCallBanner() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const fetchPending = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/video-calls/call-requests/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pending = (res.data.requests || []).filter(r => !dismissed.has(r.id));
      setRequests(pending);
    } catch {
      // Silently fail
    }
  }, [token, dismissed]);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const acceptCall = async (req) => {
    try {
      const res = await axios.post(
        `${API}/video-calls/call-requests/${req.id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/call/${res.data.room_name}`);
    } catch {
      // Error handled
    }
  };

  const declineCall = async (req) => {
    try {
      await axios.post(
        `${API}/video-calls/call-requests/${req.id}/decline`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDismissed(prev => new Set([...prev, req.id]));
    } catch {
      // Error handled
    }
  };

  const dismissBanner = (id) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  if (requests.length === 0) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+70px)] left-2 right-2 z-[9998] space-y-2 pointer-events-none" data-testid="incoming-call-banner-container">
      <AnimatePresence>
        {requests.map(req => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto bg-gradient-to-r from-[#1A1A2E] to-[#0F3460] border border-[#00D4FF]/40 rounded-2xl p-3 shadow-2xl shadow-[#00D4FF]/20 backdrop-blur-lg"
            data-testid={`incoming-call-${req.id}`}
          >
            <div className="flex items-center gap-3">
              {/* Pulsing phone icon */}
              <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center animate-pulse flex-shrink-0">
                <PhoneIncoming className="w-6 h-6 text-green-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{req.caller_name}</p>
                <p className="text-[#00D4FF] text-xs">Incoming video call...</p>
                {req.message && <p className="text-white/40 text-xs truncate">{req.message}</p>}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => acceptCall(req)}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full w-11 h-11 p-0 shadow-lg shadow-green-500/30"
                  data-testid={`answer-call-${req.id}`}
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => declineCall(req)}
                  className="bg-red-500/80 hover:bg-red-600 text-white rounded-full w-11 h-11 p-0"
                  data-testid={`reject-call-${req.id}`}
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
                <button
                  onClick={() => dismissBanner(req.id)}
                  className="text-white/30 hover:text-white/60 p-1"
                  data-testid={`dismiss-call-${req.id}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default IncomingCallBanner;
