import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, GraduationCap, Clock, CalendarDays, Hourglass, Layers } from "lucide-react";
import { PracticeRunner } from "../components/hos/PracticeRunner";
import { MultiDayRunner } from "../components/hos/MultiDayRunner";
import { EightDayRunner } from "../components/hos/EightDayRunner";
import {
  COMBINED_SCENARIOS, MULTIDAY_SCENARIOS, EIGHTDAY_SCENARIOS,
} from "../lib/hosAdvancedScenarios";
import { SPLIT_PRACTICE_SCENARIOS } from "../lib/hosScenarios";

/**
 * HosPracticePage — single home for all HOS practice scenarios. Four
 * categories rendered via the same PracticeRunner:
 *   • 11/14 Combined  · single-day, no split-sleeper
 *   • Multi-Day       · 2-day with prior-day context
 *   • 8-Day Inspection · prior 7-day recap + mini 70-hr calc + focal day
 *   • Split Sleeper   · qualifying-rest pairings (drag the green/red handles)
 *
 * Scenario titles/subtitles are intentionally omitted from the picker so the
 * inspector can't see "what kind of trap" the scenario is before running it —
 * the picker shows just the neutral scenario ID (C1, M1, E1, SP1, ...).
 */
const CATEGORIES = [
  {
    id: "combined",
    label: "11 / 14 Combined",
    icon: Clock,
    scenarios: COMBINED_SCENARIOS,
    mode: "shift",
    desc: "Single-day shifts. Drag the green/red handles to mark when the shift started and ended, then evaluate any 11- or 14-hour rule violation.",
    rules: ["§395.3(a)(2) — 14-hr work-shift cap (wall-clock, off-duty time still counts)", "§395.3(a)(3)(i) — 11-hr driving cap (driving minutes only)", "§395.3(a)(3)(ii) — 30-min break required before 8 cumulative hours of driving"],
  },
  {
    id: "multiday",
    label: "Multi-Day",
    icon: CalendarDays,
    scenarios: MULTIDAY_SCENARIOS,
    mode: "multiday",
    desc: "Two consecutive duty days. Identify each day's shift bounds (watch for shifts that span midnight), then evaluate 11/14 compliance on each day.",
    rules: ["§395.3(a)(2) — 14-hr work-shift cap", "§395.3(a)(3)(i) — 11-hr driving cap", "§395.3(a)(1) — 10-hr off-duty reset between shifts"],
  },
  {
    id: "eightday",
    label: "8-Day Inspection",
    icon: Hourglass,
    scenarios: EIGHTDAY_SCENARIOS,
    mode: "eightday",
    desc: "Full 8-day roadside inspection. Step through every day to identify shifts and per-day violations, then run the 70-hr cycle calc, then make the OOS call.",
    rules: ["§395.3(a)(2) — 14-hr work-shift cap (each day)", "§395.3(a)(3)(i) — 11-hr driving cap (each day)", "§395.3(a)(3)(ii) — 30-min break before 8 cumulative driving hours", "§395.3(b)(2) — 70-hr / 8-day cycle cap", "§395.13 — OOS criteria when limits are exceeded"],
  },
  {
    id: "split",
    label: "Split Sleeper",
    icon: Layers,
    scenarios: SPLIT_PRACTICE_SCENARIOS,
    mode: "split",
    desc: "Identify qualifying split-sleeper rest periods (≥7h SB + ≥2h SB/OFF, combined ≥10h), then evaluate today's shift with the pair applied.",
    rules: ["§395.1(g)(1)(ii) — ≥7h in Sleeper Berth paired with ≥2h in SB or Off-Duty (combined ≥10h)", "CVSA policy — work shift begins at END of first qualifying rest and ends at START of second", "Off-duty time inside a pair-shift still counts toward the 11-hr driving clock"],
  },
];

export default function HosPracticePage() {
  const navigate = useNavigate();
  const [catId, setCatId] = useState("combined");
  const cat = CATEGORIES.find((c) => c.id === catId);

  // 8-day no longer needs renderContext — EightDayRunner handles everything.
  const renderContext = useMemo(() => null, []);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-10" data-testid="hos-practice-page">
      <header className="bg-[#002855] text-white sticky top-0 z-30 border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <h1 className="text-sm font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>HOS Practice Scenarios</h1>
              <p className="text-[10px] text-white/50">Advanced training · 24-hr military time · 49 CFR Part 395</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        {/* Category tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white rounded-lg p-1 border border-[#E2E8F0]" data-testid="practice-category-tabs">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = c.id === catId;
            return (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md text-[10.5px] font-bold transition-colors ${
                  isActive ? "bg-[#002855] text-[#D4AF37]" : "text-[#475569] hover:bg-[#F8FAFC]"
                }`}
                data-testid={`practice-cat-${c.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="leading-tight">{c.label}</span>
                <span className={`text-[9px] ${isActive ? "text-[#D4AF37]/70" : "text-[#94A3B8]"}`}>
                  {c.scenarios.length} scenarios
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#FFFBEB] overflow-hidden" data-testid="category-primer">
          <div className="px-3 py-2 border-b border-[#D4AF37]/20">
            <p className="text-[12px] text-[#713F12] leading-relaxed">{cat.desc}</p>
          </div>
          {cat.rules && cat.rules.length > 0 && (
            <div className="px-3 py-2 bg-white">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">Rules being tested</p>
              <ul className="space-y-1">
                {cat.rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11.5px] text-[#334155] leading-snug">
                    <span className="text-[#D4AF37] font-bold flex-shrink-0 mt-0.5">●</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Per-category runner. Key forces remount when switching categories so
         * the runner resets cleanly. Multi-day uses MultiDayRunner; 8-day uses
         * EightDayRunner; everything else uses the single-day PracticeRunner. */}
        {cat.mode === "multiday" ? (
          <MultiDayRunner key={catId} scenarios={cat.scenarios} category={catId} />
        ) : cat.mode === "eightday" ? (
          <EightDayRunner key={catId} scenarios={cat.scenarios} category={catId} />
        ) : (
          <PracticeRunner
            key={catId}
            scenarios={cat.scenarios}
            mode={cat.mode}
            category={catId}
            renderContext={renderContext}
          />
        )}
      </main>
    </div>
  );
}
