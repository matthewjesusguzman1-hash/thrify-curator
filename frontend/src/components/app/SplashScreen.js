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
          {/* Logo — scales up as the truck arrives */}
          <img
            src="/app-icon-180.png"
            alt="Inspection Navigator"
            className={`w-full h-full object-cover rounded-3xl shadow-2xl transition-all duration-700 ease-out ${phase === "arrive" ? "scale-90 opacity-80" : "scale-100 opacity-100"}`}
            draggable={false}
          />

          {/* Truck — drives in from the left, lands on top of the logo */}
          <svg
            viewBox="0 0 220 120"
            className={`absolute w-[58%] max-w-[220px] pointer-events-none ${phase === "arrive" ? "splash-truck-arrive" : "splash-truck-settle"}`}
            style={{ top: "18%" }}
            aria-hidden="true"
          >
            {/* Trailer */}
            <rect x="6" y="18" width="120" height="56" rx="6" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="2.5" />
            <rect x="12" y="24" width="108" height="6" fill="#D4AF37" opacity="0.3" />
            {/* Cab */}
            <path d="M126 28 L168 28 L190 46 L190 74 L126 74 Z" fill="#D4AF37" stroke="#0F172A" strokeWidth="2" />
            <rect x="148" y="34" width="30" height="20" rx="2" fill="#0F172A" />
            {/* Bumper + grille */}
            <rect x="188" y="64" width="10" height="10" rx="1" fill="#0F172A" />
            {/* Headlight */}
            <circle cx="190" cy="54" r="3" fill="#FEF3C7">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" repeatCount="indefinite" />
            </circle>
            {/* Light bar on cab */}
            <rect x="138" y="26" width="28" height="4" rx="1" fill="#0F172A" />
            <rect x="141" y="27" width="10" height="2" fill="#3B82F6">
              <animate attributeName="opacity" values="1;0.1;1" dur="0.6s" repeatCount="indefinite" />
            </rect>
            <rect x="153" y="27" width="10" height="2" fill="#DC2626">
              <animate attributeName="opacity" values="0.1;1;0.1" dur="0.6s" repeatCount="indefinite" />
            </rect>
            {/* Wheels */}
            <g>
              <circle cx="34" cy="82" r="12" fill="#0F172A" />
              <circle cx="34" cy="82" r="5" fill="#64748B" />
              <circle cx="72" cy="82" r="12" fill="#0F172A" />
              <circle cx="72" cy="82" r="5" fill="#64748B" />
              <circle cx="170" cy="82" r="12" fill="#0F172A" />
              <circle cx="170" cy="82" r="5" fill="#64748B" />
            </g>
            {/* Shadow */}
            <ellipse cx="110" cy="98" rx="92" ry="4" fill="#000" opacity="0.35" />
          </svg>
        </div>

        {/* Brand text */}
        <div className={`mt-6 text-center transition-all duration-700 ${phase === "arrive" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          <div className="text-[11px] tracking-[0.3em] text-[#D4AF37] font-bold uppercase">Inspection</div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Navigator</div>
        </div>

        <button onClick={skip} className="absolute -bottom-16 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white/70 transition-colors" data-testid="skip-splash-btn">
          Tap to skip
        </button>
      </div>

      {/* Scoped styles */}
      <style>{`
        @keyframes splash-truck-in {
          0%   { transform: translateX(-140vw) translateY(0); opacity: 0; }
          55%  { transform: translateX(-8%) translateY(0); opacity: 1; }
          70%  { transform: translateX(2%) translateY(-2px); opacity: 1; }
          85%  { transform: translateX(-1%) translateY(1px); opacity: 1; }
          100% { transform: translateX(0) translateY(0); opacity: 1; }
        }
        .splash-truck-arrive {
          animation: splash-truck-in 1.3s cubic-bezier(0.22, 0.68, 0.3, 1) both;
        }
        .splash-truck-settle {
          transform: translateX(0) translateY(0);
          opacity: 1;
        }

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
          .splash-truck-arrive,
          .splash-flash-blue,
          .splash-flash-red { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
