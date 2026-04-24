import { useNavigate, useLocation } from "react-router-dom";
import { Hourglass, GraduationCap } from "lucide-react";

/**
 * HosTabs — shared tab bar rendered on both HOS pages so the 60/70 Calculator
 * and the HOS Training hub read as sibling tabs under one HOS section.
 *
 * Route-driven (no local state): the active tab is whichever route is currently
 * loaded. Clicking a tab navigates to that route.
 */
const TABS = [
  { id: "calc",     label: "60/70 Calculator", icon: Hourglass,     path: "/hours-of-service" },
  { id: "training", label: "HOS General",      icon: GraduationCap, path: "/hours-of-service/training" },
];

export function HosTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Training route lives under /hours-of-service/training; everything else
  // under /hours-of-service/* is treated as the calculator for active-state purposes
  // (the calculator page itself is just `/hours-of-service`).
  const active = pathname.startsWith("/hours-of-service/training") ? "training" : "calc";

  return (
    <div className="bg-[#002855] border-b border-[#D4AF37]/30" data-testid="hos-tabs">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 flex items-center gap-1">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { if (!isActive) navigate(t.path); }}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? "text-[#D4AF37]"
                  : "text-white/60 hover:text-white"
              }`}
              data-testid={`hos-tab-${t.id}`}
              aria-current={isActive ? "page" : undefined}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {isActive && (
                <span className="absolute left-2 right-2 bottom-0 h-[2px] bg-[#D4AF37] rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
