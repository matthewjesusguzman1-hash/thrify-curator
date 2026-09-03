import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Play, Download, RefreshCw, Circle, Clock,
  Video, Users, Loader2, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(isoStr) {
  if (!isoStr) return "--";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
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

export default function RecordingsPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [loadingAccess, setLoadingAccess] = useState(null);

  const fetchRecordings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/video-calls/recordings`, authHeader);
      setRecordings(res.data.recordings || []);
    } catch {
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const syncRecordings = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/video-calls/recordings/sync`, {}, authHeader);
      toast.success(`Synced ${res.data.synced} recording(s) from Daily.co`);
      await fetchRecordings();
    } catch (err) {
      const msg = err.response?.data?.detail || "Sync failed";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const playRecording = async (recording) => {
    // Each recording_urls entry has a recording_id
    const recEntry = recording.recording_urls?.[0];
    if (!recEntry?.recording_id) {
      // Fallback: open download_link directly
      if (recEntry?.download_link) {
        window.open(recEntry.download_link, "_blank");
      } else {
        toast.error("No recording data available");
      }
      return;
    }

    setLoadingAccess(recording.room_name);
    try {
      const res = await axios.get(
        `${API}/video-calls/recordings/${recEntry.recording_id}/access-link`,
        authHeader
      );
      const url = res.data?.download_link || res.data?.link;
      if (url) {
        setPlayingId(recording.room_name);
        setPlaybackUrl(url);
      } else {
        toast.error("Could not get playback link");
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to get access link";
      toast.error(msg);
    } finally {
      setLoadingAccess(null);
    }
  };

  const closePlayer = () => {
    setPlayingId(null);
    setPlaybackUrl(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)" }} data-testid="recordings-page">
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
            data-testid="recordings-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-red-400 fill-red-400" />
            <h1 className="text-lg font-semibold text-white">Recordings</h1>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-[#00D4FF] hover:bg-white/10 text-xs"
          onClick={syncRecordings}
          disabled={syncing}
          data-testid="sync-recordings-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync from Daily.co"}
        </Button>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Inline video player */}
        {playingId && playbackUrl && (
          <div className="mb-4 bg-black rounded-xl overflow-hidden border border-white/10" data-testid="recording-player">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Circle className="w-3 h-3 text-red-400 fill-red-400" /> Now Playing
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePlayer}
                className="text-white/60 hover:text-white text-xs"
                data-testid="close-player-btn"
              >
                Close
              </Button>
            </div>
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <video
                src={playbackUrl}
                controls
                autoPlay
                className="absolute inset-0 w-full h-full"
                data-testid="recording-video-element"
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>
        )}

        {/* Recordings list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-16" data-testid="no-recordings-state">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-white/15" />
            </div>
            <p className="text-white/40 text-sm mb-1">No recordings yet</p>
            <p className="text-white/25 text-xs mb-4">Recordings appear here after you enable recording during a call</p>
            <Button
              size="sm"
              variant="ghost"
              className="text-[#00D4FF] hover:bg-white/10 text-xs"
              onClick={syncRecordings}
              disabled={syncing}
              data-testid="sync-empty-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              Check Daily.co for recordings
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => {
              const recEntry = rec.recording_urls?.[0];
              const isCurrentlyPlaying = playingId === rec.room_name;

              return (
                <div
                  key={rec.id || rec.room_name}
                  className={`border rounded-xl p-4 transition-all ${
                    isCurrentlyPlaying
                      ? "bg-[#00D4FF]/10 border-[#00D4FF]/30"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                  data-testid={`recording-card-${rec.room_name}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Circle className="w-3 h-3 text-red-400 fill-red-400 flex-shrink-0" />
                        <p className="text-white font-medium text-sm truncate">
                          {rec.created_by || "Unknown"}
                        </p>
                        <PurposeBadge purpose={rec.purpose} />
                      </div>

                      <div className="flex items-center gap-4 text-white/40 text-xs mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(rec.created_at)}
                        </span>
                        {rec.duration_seconds && (
                          <span>{formatDuration(rec.duration_seconds)}</span>
                        )}
                        {rec.participant_names?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {rec.participant_names.join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Recording details */}
                      {recEntry && (
                        <div className="mt-2 text-xs text-white/30">
                          {recEntry.duration && (
                            <span>Recording: {formatDuration(recEntry.duration)}</span>
                          )}
                          {recEntry.status && (
                            <span className="ml-2 px-1.5 py-0.5 bg-white/5 rounded text-white/40">
                              {recEntry.status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => playRecording(rec)}
                        disabled={loadingAccess === rec.room_name}
                        className={`text-xs px-3 rounded-lg ${
                          isCurrentlyPlaying
                            ? "bg-[#00D4FF] text-black hover:bg-[#00B8E0]"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                        data-testid={`play-btn-${rec.room_name}`}
                      >
                        {loadingAccess === rec.room_name ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Play className="w-3 h-3 mr-1" />
                        )}
                        {isCurrentlyPlaying ? "Playing" : "Play"}
                      </Button>

                      {recEntry?.download_link && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(recEntry.download_link, "_blank")}
                          className="text-white/40 hover:text-white/70 p-2"
                          data-testid={`download-btn-${rec.room_name}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
