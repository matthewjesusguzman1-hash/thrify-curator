import React, { useEffect, useState } from "react";

/**
 * SplashScreen
 * 1) Truck drives in from the left to center
 * 2) Logo scales up / reveals beneath the truck
 * 3) Red/blue emergency lights flash (left=blue, right=red) with a soft glow
 * 4) Calls onFinish() to enter the app
 *
 * Timing (total ≈ 3800ms):
 *   0–1200ms   truck drives in
 *   1200–2000ms logo settles behind
 *   2000–3400ms flashing lights
 *   3400–3800ms fade out
 */
export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("arrive"); // arrive -> flash -> fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("flash"), 1400);
    const t2 = setTimeout(() => setPhase("fade"), 3200);
    const t3 = setTimeout(() => onFinish?.(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  const skip = () => onFinish?.();

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#002855] flex items-center justify-center transition-opacity duration-500 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}
      data-testid="splash-screen"
      onClick={skip}
      role="button"
      aria-label="Skip splash"
    >
      {/* Flashing emergency lights — left = blue, right = red */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${phase === "flash" ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
        <div className="splash-flash-blue absolute inset-y-0 left-0 w-1/2" />
        <div className="splash-flash-red absolute inset-y-0 right-0 w-1/2" />
      </div>

      {/* Center stack: logo + truck */}
      <div className="relative flex flex-col items-center justify-center select-none">
        <div className="relative w-[min(80vw,340px)] aspect-square flex items-center justify-center">
          {/* Logo — scales up as the splash begins */}
          <img
            src="/app-icon-180.png"
            alt="Inspection Navigator"
            className={`w-full h-full object-cover rounded-3xl shadow-2xl transition-all duration-700 ease-out ${phase === "arrive" ? "scale-90 opacity-80" : "scale-100 opacity-100"}`}
            draggable={false}
          />
        </div>
      </div>

      {/* Scoped styles */}
      <style>{`
        @keyframes splash-blue-pulse {
          0%, 100% { opacity: 0.0; }
          30%      { opacity: 0.55; }
          50%      { opacity: 0.0; }
          70%      { opacity: 0.4; }
        }
        @keyframes splash-red-pulse {
          0%, 100% { opacity: 0.4; }
          20%      { opacity: 0.0; }
          45%      { opacity: 0.55; }
          75%      { opacity: 0.0; }
        }
        .splash-flash-blue {
          background: radial-gradient(ellipse at 0% 50%, rgba(59,130,246,0.85) 0%, rgba(59,130,246,0.35) 35%, rgba(59,130,246,0) 70%);
          animation: splash-blue-pulse 0.75s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        .splash-flash-red {
          background: radial-gradient(ellipse at 100% 50%, rgba(220,38,38,0.85) 0%, rgba(220,38,38,0.35) 35%, rgba(220,38,38,0) 70%);
          animation: splash-red-pulse 0.75s ease-in-out infinite;
          mix-blend-mode: screen;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-flash-blue,
          .splash-flash-red { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
