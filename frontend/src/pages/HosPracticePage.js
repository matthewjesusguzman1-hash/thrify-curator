import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, GraduationCap, Clock, CalendarDays, Hourglass, Calculator, Layers } from "lucide-react";
import { EldGrid } from "../components/hos/EldGrid";
import { PracticeRunner } from "../components/hos/PracticeRunner";
import {
  COMBINED_SCENARIOS, MULTIDAY_SCENARIOS, EIGHTDAY_SCENARIOS,
} from "../lib/hosAdvancedScenarios";
import { SPLIT_PRACTICE_SCENARIOS } from "../lib/hosScenarios";
import { HosTabs } from "../components/hos/HosTabs";

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
  },
  {
    id: "multiday",
    label: "Multi-Day",
    icon: CalendarDays,
    scenarios: MULTIDAY_SCENARIOS,
    mode: "shift",
    desc: "Two-day scenarios. Yesterday's log is shown for context — focus your shift bounds and violation analysis on TODAY (Day 2).",
  },
  {
    id: "eightday",
    label: "8-Day Inspection",
    icon: Hourglass,
    scenarios: EIGHTDAY_SCENARIOS,
    mode: "shift",
    desc: "Full 8-day inspection period. Use the mini 70-hr calculator below to check cycle compliance, then run the standard 11/14 analysis on today's ELD.",
  },
  {
    id: "split",
    label: "Split Sleeper",
    icon: Layers,
    scenarios: SPLIT_PRACTICE_SCENARIOS,
    mode: "split",
    desc: "Identify qualifying split-sleeper rest periods (≥7h SB + ≥2h SB/OFF, combined ≥10h), then evaluate today's shift with the pair applied.",
  },
];

export default function HosPracticePage() {
  const navigate = useNavigate();
  const [catId, setCatId] = useState("combined");
  const cat = CATEGORIES.find((c) => c.id === catId);

  // Build a renderContext function per category. Multi-day shows prior day
  // ELDs; 8-day shows the recap table + mini calculator.
  const renderContext = useMemo(() => {
    if (catId === "multiday") return (s) => <PriorDaysContext priorDays={s.priorDays || []} />;
    if (catId === "eightday") return (s) => <EightDayContext scenario={s} />;
    return null;
  }, [catId]);

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
        <HosTabs />
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

        <div className="rounded-md bg-[#FFFBEB] border-l-[3px] border-[#D4AF37] px-3 py-2">
          <p className="text-[12px] text-[#713F12] leading-relaxed">{cat.desc}</p>
        </div>

        {/* Per-category runner. Key forces remount when switching categories so
         * the runner resets cleanly. */}
        <PracticeRunner
          key={catId}
          scenarios={cat.scenarios}
          mode={cat.mode}
          category={catId}
          renderContext={renderContext}
        />
      </main>
    </div>
  );
}

/* ─────────────── Context renderers ─────────────── */

function PriorDaysContext({ priorDays }) {
  if (!priorDays || priorDays.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="prior-days-context">
      {priorDays.map((d, i) => (
        <section key={i} className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="bg-[#E2E8F0]/60 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Context</span>
            <p className="text-[12px] font-bold text-[#002855]">{d.label}</p>
          </div>
          <div className="p-2">
            <EldGrid entries={d.log} />
            {d.summary && (
              <p className="text-[11.5px] text-[#475569] leading-relaxed mt-1.5 px-1">{d.summary}</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function EightDayContext({ scenario }) {
  return (
    <div className="space-y-2" data-testid="eight-day-context">
      <RecapTable scenario={scenario} />
      <MiniCycleCalc scenario={scenario} />
    </div>
  );
}

function RecapTable({ scenario }) {
  const recap = scenario.priorRecap || [];
  const total = recap.reduce((s, d) => s + (d.onDutyHours || 0), 0);
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid="recap-table">
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Prior 7 days · on-duty hours</span>
        <span className="ml-auto text-[10px] font-mono font-bold text-[#002855]">Total {total}h</span>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[#E2E8F0]">
        {recap.map((d, i) => (
          <div key={i} className="bg-white px-1.5 py-1.5 text-center" data-testid={`recap-day-${i}`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">{d.label}</p>
            <p className="text-[15px] font-black text-[#002855] font-mono leading-tight mt-0.5">{d.onDutyHours}</p>
            {d.note && (
              <p className="text-[8.5px] text-[#D4AF37] font-bold leading-tight mt-0.5" title={d.note}>★</p>
            )}
          </div>
        ))}
      </div>
      {recap.some((d) => d.note) && (
        <div className="px-3 py-1.5 bg-[#FFFBEB] border-t border-[#D4AF37]/30">
          {recap.filter((d) => d.note).map((d, i) => (
            <p key={i} className="text-[10.5px] text-[#713F12] leading-snug">
              <span className="font-bold">{d.label}:</span> {d.note}
            </p>
          ))}
        </div>
      )}
      {scenario.cycleNote && (
        <div className="px-3 py-1.5 bg-[#EEF2FF] border-t border-[#C7D2FE]">
          <p className="text-[10.5px] text-[#3730A3] leading-snug">
            <span className="font-bold uppercase tracking-wider text-[9px] mr-1">Hint</span>
            {scenario.cycleNote}
          </p>
        </div>
      )}
    </section>
  );
}

/** MiniCycleCalc — a self-contained 70/60-hr calculator that exists ONLY in
 *  the practice section. State is local; closing/reopening the scenario
 *  resets it. Has no shared storage with the real /hours-of-service tool. */
function MiniCycleCalc({ scenario }) {
  const limit = scenario.cycleLimit || 70;
  const recap = scenario.priorRecap || [];
  const [todayHours, setTodayHours] = useState("");
  const [overrides, setOverrides] = useState(() => recap.map((d) => String(d.onDutyHours)));
  const [revealed, setRevealed] = useState(false);

  const priorTotal = useMemo(() => {
    return overrides.reduce((s, v) => {
      const n = parseFloat(v);
      return s + (isNaN(n) ? 0 : n);
    }, 0);
  }, [overrides]);
  const todayN = parseFloat(todayHours);
  const todayValid = !isNaN(todayN) && todayN >= 0;
  const grand = priorTotal + (todayValid ? todayN : 0);
  const remaining = Math.max(0, limit - grand);
  const overBy = Math.max(0, grand - limit);
  const verdict = todayValid
    ? grand > limit ? "over" : grand === limit ? "atLimit" : "under"
    : null;

  const correct = scenario.todayOnDutyHours;
  const cyclePass = scenario.cyclePass;

  return (
    <section className="bg-white rounded-xl border-2 border-[#D4AF37]/40 overflow-hidden" data-testid="mini-cycle-calc">
      <div className="bg-[#FFFBEB] border-b border-[#D4AF37]/30 px-3 py-1.5 flex items-center gap-2">
        <Calculator className="w-3.5 h-3.5 text-[#D4AF37]" />
        <p className="text-[12px] font-bold text-[#002855]">Mini {limit}-hr cycle calculator <span className="text-[9.5px] font-normal text-[#94A3B8]">(training only — does not affect the real tool)</span></p>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[10.5px] text-[#64748B] leading-snug">
          Edit the prior-day hours if a 34-hr restart applies (set restart days to 0). Enter today's on-duty total to check cycle compliance.
        </p>

        {/* Editable prior-day grid */}
        <div className="grid grid-cols-7 gap-1">
          {recap.map((d, i) => (
            <div key={i} className="text-center">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">{d.label}</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                value={overrides[i]}
                onChange={(e) => {
                  const v = e.target.value;
                  setOverrides((prev) => prev.map((x, j) => (j === i ? v : x)));
                }}
                className="w-full px-1 py-1 text-[12px] font-mono font-bold text-center text-[#002855] border border-[#E2E8F0] rounded outline-none focus:border-[#D4AF37]"
                data-testid={`mini-prior-${i}`}
              />
            </div>
          ))}
        </div>

        {/* Today input + tally */}
        <div className="grid grid-cols-3 gap-2 items-end pt-1 border-t border-[#E2E8F0]">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Today on-duty</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.25"
              min="0"
              value={todayHours}
              onChange={(e) => setTodayHours(e.target.value)}
              placeholder="hrs"
              className="w-full px-1.5 py-1.5 text-[14px] font-mono font-bold text-center text-[#002855] border border-[#D4AF37] bg-[#FFFBEB] rounded outline-none focus:border-[#002855]"
              data-testid="mini-today-input"
            />
          </div>
          <div>
            <p className="block text-[9px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">8-day total</p>
            <p className="text-[14px] font-mono font-bold text-center text-[#002855] py-1.5" data-testid="mini-grand">
              {grand.toFixed(2).replace(/\.?0+$/, "")} h
            </p>
          </div>
          <div>
            <p className="block text-[9px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">Limit {limit}h</p>
            <p
              className={`text-[14px] font-mono font-bold text-center py-1.5 ${
                verdict === "over" ? "text-[#DC2626]" :
                verdict === "atLimit" ? "text-[#D4AF37]" :
                verdict === "under" ? "text-[#10B981]" : "text-[#94A3B8]"
              }`}
              data-testid="mini-verdict"
            >
              {verdict === "over" ? `+${overBy.toFixed(2).replace(/\.?0+$/, "")} over` :
               verdict === "atLimit" ? "at limit" :
               verdict === "under" ? `${remaining.toFixed(2).replace(/\.?0+$/, "")} avail` :
               "—"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setRevealed((v) => !v)}
          className="w-full text-[11px] font-bold text-[#002855] hover:text-[#D4AF37] py-1.5 rounded border border-dashed border-[#CBD5E1] hover:border-[#D4AF37]"
          data-testid="mini-reveal"
        >
          {revealed ? "Hide answer" : "Reveal correct numbers"}
        </button>

        {revealed && correct !== undefined && (
          <div className={`rounded-md p-2 text-[11.5px] leading-relaxed ${cyclePass ? "bg-[#F0FDF4] text-[#065F46] border border-[#10B981]/40" : "bg-[#FEE2E2] text-[#991B1B] border border-[#DC2626]/40"}`} data-testid="mini-answer">
            <p className="font-bold">
              Today's on-duty = {correct}h. {cyclePass ? `Cycle COMPLIANT (under ${limit}h).` : `Cycle VIOLATION — over ${limit}h.`}
            </p>
            {scenario.cycleNote && <p className="mt-0.5 text-[#475569]">{scenario.cycleNote}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
