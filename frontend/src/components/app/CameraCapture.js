import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, SwitchCamera, Check, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";

/**
 * CameraCapture — a fullscreen in-page camera built on MediaDevices. Stays
 * open for true back-to-back capture (no gesture-chain limitation like the
 * native file input has on iOS Safari).
 *
 * Props:
 *   open        (boolean)
 *   onClose()   — called when the inspector hits Done / closes
 *   onCapture(blob, meta) — fired after each shutter; blob is a JPEG
 *   facingMode  (optional) — "environment" | "user"; default "environment"
 */
export function CameraCapture({ open, onClose, onCapture, facingMode: initialFacing = "environment" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState(initialFacing);
  const [starting, setStarting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shotCount, setShotCount] = useState(0);
  const [error, setError] = useState(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async (mode) => {
    setStarting(true);
    setError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setError(e?.name === "NotAllowedError" ? "Camera permission denied" : "Camera unavailable");
    }
    setStarting(false);
  }, [stopStream]);

  // Start / stop stream with open-state
  useEffect(() => {
    if (open) {
      setShotCount(0);
      startStream(facing);
    } else {
      stopStream();
    }
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Switch camera when facing toggles
  useEffect(() => {
    if (open && streamRef.current) startStream(facing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Small flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    canvas.toBlob(
      (blob) => {
        if (!blob) { toast.error("Capture failed"); return; }
        setShotCount((n) => n + 1);
        onCapture?.(blob, { width: canvas.width, height: canvas.height });
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black" data-testid="camera-capture">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => { stopStream(); onClose?.(); }}
          className="flex items-center gap-1 text-white/90 hover:text-white text-sm font-semibold px-2 py-1"
          data-testid="camera-close-btn"
        >
          <X className="w-5 h-5" /> Done{shotCount > 0 ? ` · ${shotCount}` : ""}
        </button>
        <button
          onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
          className="text-white/90 hover:text-white p-2"
          title="Switch camera"
          data-testid="camera-switch-btn"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* Video preview */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover bg-black"
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white opacity-70 pointer-events-none animate-pulse" />}

      {/* Error / loading state */}
      {(error || starting) && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
          {error ? (
            <div className="text-center px-6">
              <Camera className="w-10 h-10 text-white/60 mx-auto mb-2" />
              <p className="text-white text-sm font-semibold">{error}</p>
              <p className="text-white/60 text-xs mt-1">Enable camera access in Settings → Safari → Camera, then try again.</p>
              <Button onClick={() => { stopStream(); onClose?.(); }} className="mt-4 bg-white text-black hover:bg-white/90">Close</Button>
            </div>
          ) : (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          )}
        </div>
      )}

      {/* Bottom shutter */}
      <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent pb-10 pt-14">
        <div className="flex items-center justify-center gap-6">
          <div className="w-12 flex-shrink-0" />
          <button
            onClick={capture}
            disabled={!!error || starting}
            aria-label="Capture"
            className="w-[72px] h-[72px] rounded-full bg-white border-4 border-white/40 active:scale-95 transition-transform disabled:opacity-50 shadow-2xl"
            data-testid="camera-shutter-btn"
          >
            <span className="block w-full h-full rounded-full border-2 border-black" />
          </button>
          <button
            onClick={() => { stopStream(); onClose?.(); }}
            aria-label="Finish burst"
            className="w-12 h-12 rounded-full bg-[#D4AF37] text-[#002855] flex items-center justify-center shadow active:scale-95 transition-transform"
            data-testid="camera-finish-btn"
            title="Finish"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
        {shotCount > 0 && (
          <p className="text-center mt-3 text-white/80 text-xs">
            {shotCount} photo{shotCount === 1 ? "" : "s"} this burst · tap <b>Done</b> to review
          </p>
        )}
      </div>
    </div>
  );
}
