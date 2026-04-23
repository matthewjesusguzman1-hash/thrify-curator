import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Layers, Plus, Trash2, CheckCircle2, XCircle, Play, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { EldGrid } from "../components/hos/EldGrid";
import { hmToMin, minToHm, padDay, validateSplit } from "../lib/hosRules";

/* ══════════════════════════════════════════════════════════════════════════
   Split Sleeper Trainer — dedicated page.
   Two tabs:
     Learn    — walk-through scenarios with step-by-step reveal.
     Practice — drag rest blocks onto a 24-hour day; live 14-hr window math.
   ══════════════════════════════════════════════════════════════════════════ */

export default function SplitSleeperPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("learn");

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-10" data-testid="split-sleeper-page">
      <header className="bg-[#002855] text-white sticky top-0 z-30 border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <h1 className="text-sm font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Split Sleeper Trainer</h1>
              <p className="text-[10px] text-white/50">Property-carrying CMV · 49 CFR §395.1(g)(1)(ii)</p>
            </div>
          </div>
        </div>
        <div className="max-w-[900px] mx-auto px-2 grid grid-cols-2 gap-1 pb-2">
          <button onClick={() => setTab("learn")} className={`py-1.5 rounded-md text-[11px] font-bold transition-colors ${tab === "learn" ? "bg-[#D4AF37] text-[#002855]" : "bg-white/5 text-white/70 hover:bg-white/10"}`} data-testid="tab-learn">Learn</button>
          <button onClick={() => setTab("practice")} className={`py-1.5 rounded-md text-[11px] font-bold transition-colors ${tab === "practice" ? "bg-[#D4AF37] text-[#002855]" : "bg-white/5 text-white/70 hover:bg-white/10"}`} data-testid="tab-practice">Practice</button>
        </div>
      </header>
      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        {tab === "learn" ? <LearnTab /> : <PracticeTab />}
      </main>
    </div>
  );
}

/* ────────────────────────── Learn Tab ────────────────────────── */

const WALKTHROUGHS = [
  {
    id: "w1",
    title: "The Basics — 10 Consecutive Hours",
    summary: "Before any split, know the default rule: a driver needs 10 consecutive hours off duty or in the sleeper berth before starting a new shift.",
    steps: [
      { hint: "Driver drives 11 hours, then stops.", entries: [{ status: "D", start: "05:00", end: "16:00" }] },
      { hint: "Takes 10 consecutive hours off duty (here: 16:00 → next day 02:00).", entries: [{ status: "D", start: "05:00", end: "16:00" }, { status: "OFF", start: "16:00", end: "24:00" }] },
      { hint: "After 10 hrs off, driver may start a fresh shift — full 11 hrs driving and 14-hr window reset.", entries: [{ status: "D", start: "05:00", end: "16:00" }, { status: "OFF", start: "16:00", end: "24:00" }] },
    ],
    takeaway: "A straight 10-hour reset is the simplest option. The split sleeper rule lets the driver break that 10 hours into two periods — at the cost of more strict rules about how they pair.",
  },
  {
    id: "w2",
    title: "The 7 + 3 Split (most common)",
    summary: "Driver takes 7 hours in the sleeper berth, drives, then takes 3 more hours off duty or sleeper. When the second period ends, both periods combine to reset the driver's clocks.",
    steps: [
      { hint: "Start: 4 hours on-duty then 4 hours driving.", entries: [{ status: "OD", start: "00:00", end: "04:00" }, { status: "D", start: "04:00", end: "08:00" }] },
      { hint: "Take Period A — 7 hours in the sleeper berth (08:00–15:00).", entries: [{ status: "OD", start: "00:00", end: "04:00" }, { status: "D", start: "04:00", end: "08:00" }, { status: "SB", start: "08:00", end: "15:00" }] },
      { hint: "Drive 4 hours (15:00–19:00). Note: while we wait for Period B, the 14-hr window is running normally.", entries: [{ status: "OD", start: "00:00", end: "04:00" }, { status: "D", start: "04:00", end: "08:00" }, { status: "SB", start: "08:00", end: "15:00" }, { status: "D", start: "15:00", end: "19:00" }] },
      { hint: "Take Period B — 3 hours off duty (19:00–22:00). Split complete.", entries: [{ status: "OD", start: "00:00", end: "04:00" }, { status: "D", start: "04:00", end: "08:00" }, { status: "SB", start: "08:00", end: "15:00" }, { status: "D", start: "15:00", end: "19:00" }, { status: "OFF", start: "19:00", end: "22:00" }] },
      { hint: "After Period B ends, the 14-hr window is retroactively recalculated — it effectively \"paused\" during the shorter break (Period B), so the driver has more driving time available.", entries: [{ status: "OD", start: "00:00", end: "04:00" }, { status: "D", start: "04:00", end: "08:00" }, { status: "SB", start: "08:00", end: "15:00" }, { status: "D", start: "15:00", end: "19:00" }, { status: "OFF", start: "19:00", end: "22:00" }] },
    ],
    takeaway: "A valid 7+3 split: longer period (7 hrs) is in the Sleeper Berth, shorter period (3 hrs) is off-duty or sleeper. Both periods together count as the 10-hour reset.",
  },
  {
    id: "w3",
    title: "The 8 + 2 Split",
    summary: "Same idea as 7+3, but the longer period is 8 hours in the sleeper berth, and the shorter period is only 2 hours off-duty or sleeper.",
    steps: [
      { hint: "Drive 5 hours (05:00–10:00).", entries: [{ status: "D", start: "05:00", end: "10:00" }] },
      { hint: "Take Period A — 2 hours off duty (10:00–12:00).", entries: [{ status: "D", start: "05:00", end: "10:00" }, { status: "OFF", start: "10:00", end: "12:00" }] },
      { hint: "Drive 5 more hours (12:00–17:00).", entries: [{ status: "D", start: "05:00", end: "10:00" }, { status: "OFF", start: "10:00", end: "12:00" }, { status: "D", start: "12:00", end: "17:00" }] },
      { hint: "Take Period B — 8 hours in the sleeper berth (17:00–01:00 next day). Split complete.", entries: [{ status: "D", start: "05:00", end: "10:00" }, { status: "OFF", start: "10:00", end: "12:00" }, { status: "D", start: "12:00", end: "17:00" }, { status: "SB", start: "17:00", end: "24:00" }] },
    ],
    takeaway: "Order doesn't matter — shorter can come first or second. But the LONGER period (8 hrs here) must still be in the Sleeper Berth.",
  },
  {
    id: "w4",
    title: "What doesn't count as a split",
    summary: "Common invalid pairings inspectors see roadside.",
    steps: [
      { hint: "6 hrs sleeper + 4 hrs off — NOT VALID. The shorter period can be ≥2 hrs (8+2) or ≥3 hrs (7+3), but the longer sleeper period must be at least 7 hours.", entries: [{ status: "SB", start: "00:00", end: "06:00" }, { status: "D", start: "06:00", end: "11:00" }, { status: "OFF", start: "11:00", end: "15:00" }] },
      { hint: "5 hrs SB + 5 hrs SB — NOT VALID under standard rules. (Pilot program only, not applicable for enforcement.)", entries: [{ status: "SB", start: "00:00", end: "05:00" }, { status: "D", start: "05:00", end: "10:00" }, { status: "SB", start: "10:00", end: "15:00" }] },
      { hint: "9 hrs off + 1 hr sleeper — NOT VALID. The longer period must be in the Sleeper Berth (it's off-duty here), and the shorter period is only 1 hour.", entries: [{ status: "OFF", start: "00:00", end: "09:00" }, { status: "D", start: "09:00", end: "14:00" }, { status: "SB", start: "14:00", end: "15:00" }] },
    ],
    takeaway: "Only 7+3 or 8+2 (longer period in Sleeper Berth) count. Everything else resets by the straight 10-consecutive-hour rule only.",
  },
];

function LearnTab() {
  const [openId, setOpenId] = useState(WALKTHROUGHS[0].id);
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-[#64748B] leading-relaxed px-1">
        Step through a scenario to see how the day looks hour by hour. Tap the play button on any card to animate through each step.
      </p>
      {WALKTHROUGHS.map((w) => (
        <WalkthroughCard key={w.id} w={w} open={openId === w.id} onToggle={() => setOpenId(openId === w.id ? null : w.id)} />
      ))}
    </div>
  );
}

function WalkthroughCard({ w, open, onToggle }) {
  const [step, setStep] = useState(0);
  const entries = w.steps[step].entries;
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`walk-${w.id}`}>
      <button onClick={onToggle} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${open ? "bg-[#002855] text-white" : "bg-white hover:bg-[#F8FAFC]"}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${open ? "bg-[#D4AF37] text-[#002855]" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
          <Play className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${open ? "text-white" : "text-[#334155]"}`}>{w.title}</p>
          <p className={`text-[11px] leading-tight ${open ? "text-white/70" : "text-[#94A3B8]"}`}>{w.summary}</p>
        </div>
        <ChevronRight className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? "rotate-90 text-white/70" : "text-[#CBD5E1]"}`} />
      </button>
      {open && (
        <div className="p-4 space-y-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <div className="rounded-lg border border-[#CBD5E1] bg-white p-2">
            <EldGrid entries={entries} />
          </div>
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Step {step + 1} of {w.steps.length}</p>
            <p className="text-[12px] text-[#334155] leading-relaxed">{w.steps[step].hint}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex-1 border-[#E2E8F0]" data-testid={`walk-${w.id}-prev`}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {step < w.steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`walk-${w.id}-next`}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(0)} className="flex-1 bg-[#D4AF37] text-[#002855] hover:bg-[#BC9A2F]">
                <RotateCcw className="w-4 h-4 mr-1" /> Replay
              </Button>
            )}
          </div>
          {step === w.steps.length - 1 && (
            <div className="rounded-lg border-2 border-[#D4AF37]/40 bg-[#FFFBEB] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1">Takeaway</p>
              <p className="text-[12px] text-[#334155] leading-relaxed">{w.takeaway}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Practice Tab ────────────────────────── */
/* User builds a day by adding status blocks. Each block: status, start, hours.
 * App shows live driving/on-duty/window math + split verdict. */

const DEFAULT_BLOCKS = [
  { status: "D", start: "05:00", hours: 5 },
  { status: "SB", start: "10:00", hours: 7 },
  { status: "D", start: "17:00", hours: 5 },
];

function PracticeTab() {
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const entries = useMemo(() => blocks
    .map((b) => ({ status: b.status, start: b.start, end: minToHm(Math.min(24 * 60, hmToMin(b.start) + Math.round(b.hours * 60))) }))
    .filter((e) => hmToMin(e.end) > hmToMin(e.start))
    .sort((a, b) => hmToMin(a.start) - hmToMin(b.start)), [blocks]);

  // Find sleeper/off rest blocks >= 2 hrs as possible split candidates.
  // NOTE: Use block.hours (not entry end-start) so midnight-clamped entries
  // still validate against true block durations.
  const restCandidates = useMemo(() => blocks.filter((b) => (b.status === "SB" || b.status === "OFF") && b.hours >= 2), [blocks]);

  const splitVerdict = useMemo(() => {
    // Check all pairs of candidates for a valid split
    for (let i = 0; i < restCandidates.length; i++) {
      for (let j = i + 1; j < restCandidates.length; j++) {
        const a = { hours: restCandidates[i].hours, type: restCandidates[i].status };
        const b = { hours: restCandidates[j].hours, type: restCandidates[j].status };
        const r = validateSplit(a, b);
        if (r.legal) return { ...r, a, b };
      }
    }
    // None legal — return the closest attempt for feedback
    if (restCandidates.length >= 2) {
      const a = { hours: restCandidates[0].hours, type: restCandidates[0].status };
      const b = { hours: restCandidates[1].hours, type: restCandidates[1].status };
      return { ...validateSplit(a, b), a, b };
    }
    return null;
  }, [restCandidates]);

  const totals = useMemo(() => {
    const t = { D: 0, OD: 0, SB: 0, OFF: 0 };
    for (const e of padDay(entries)) {
      const d = hmToMin(e.end) - hmToMin(e.start);
      if (d > 0 && t[e.status] !== undefined) t[e.status] += d;
    }
    return t;
  }, [entries]);

  const updateBlock = (i, patch) => setBlocks((prev) => prev.map((b, k) => k === i ? { ...b, ...patch } : b));
  const removeBlock = (i) => setBlocks((prev) => prev.filter((_, k) => k !== i));
  const addBlock = () => setBlocks((prev) => [...prev, { status: "OFF", start: "22:00", hours: 2 }]);
  const loadPreset = (preset) => setBlocks(preset);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#64748B] leading-relaxed px-1">
        Build a day to see if your pairing qualifies. Add rest and driving blocks, and the app will detect a valid 7+3 or 8+2 split automatically.
      </p>

      <div className="rounded-lg border border-[#CBD5E1] bg-white p-2">
        <EldGrid entries={entries} />
      </div>

      {/* Live verdict */}
      {splitVerdict && (
        <div className={`rounded-lg p-3 border ${splitVerdict.legal ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#DC2626] bg-[#FEE2E2]"}`} data-testid="practice-verdict">
          <div className="flex items-center gap-2 mb-1">
            {splitVerdict.legal ? <CheckCircle2 className="w-5 h-5 text-[#10B981]" /> : <XCircle className="w-5 h-5 text-[#DC2626]" />}
            <p className={`text-sm font-bold ${splitVerdict.legal ? "text-[#065F46]" : "text-[#991B1B]"}`}>
              {splitVerdict.legal ? `Legal ${splitVerdict.type} split detected` : "No valid split"}
            </p>
          </div>
          <p className="text-[12px] text-[#334155]">{splitVerdict.reason}</p>
          <p className="text-[10px] text-[#64748B] font-mono pt-1">49 CFR §395.1(g)(1)(ii)</p>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-4 gap-1.5 bg-white rounded-lg border border-[#E2E8F0] p-2">
        {[["D", "Drive"], ["OD", "On-Duty"], ["SB", "Sleeper"], ["OFF", "Off"]].map(([k, label]) => (
          <div key={k} className="text-center">
            <p className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">{label}</p>
            <p className="text-sm font-mono font-bold text-[#002855]">{(totals[k] / 60).toFixed(1)}h</p>
          </div>
        ))}
      </div>

      {/* Block editor */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Day blocks</p>
          <button onClick={addBlock} className="flex items-center gap-1 text-[11px] font-bold text-[#002855] border border-[#002855] rounded-md px-2 py-0.5 hover:bg-[#002855] hover:text-white" data-testid="add-block-btn">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {blocks.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]" data-testid={`block-${i}`}>
            <select value={b.status} onChange={(e) => updateBlock(i, { status: e.target.value })} className="text-[11px] font-bold bg-white border border-[#CBD5E1] rounded px-1 py-1">
              <option value="D">Drive</option>
              <option value="OD">On-Duty</option>
              <option value="SB">Sleeper</option>
              <option value="OFF">Off</option>
            </select>
            <input type="time" value={b.start} onChange={(e) => updateBlock(i, { start: e.target.value })} className="text-[11px] font-mono bg-white border border-[#CBD5E1] rounded px-1 py-1 w-[88px]" />
            <input type="number" step="0.5" min="0.5" max="14" value={b.hours} onChange={(e) => updateBlock(i, { hours: parseFloat(e.target.value) || 0 })} className="text-[11px] font-mono bg-white border border-[#CBD5E1] rounded px-1 py-1 w-14" />
            <span className="text-[10px] text-[#94A3B8]">h</span>
            <button onClick={() => removeBlock(i)} className="ml-auto text-[#DC2626] hover:bg-[#FEE2E2] rounded p-1" aria-label="Remove block" data-testid={`remove-block-${i}`}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Presets */}
      <div className="bg-[#FFFBEB] rounded-xl border border-[#D4AF37]/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1.5">Load a preset day</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Valid 7+3", blocks: [{ status: "D", start: "05:00", hours: 4 }, { status: "SB", start: "09:00", hours: 7 }, { status: "D", start: "16:00", hours: 4 }, { status: "OFF", start: "20:00", hours: 3 }] },
            { label: "Valid 8+2", blocks: [{ status: "D", start: "06:00", hours: 5 }, { status: "OFF", start: "11:00", hours: 2 }, { status: "D", start: "13:00", hours: 5 }, { status: "SB", start: "18:00", hours: 8 }] },
            { label: "Invalid 6+4", blocks: [{ status: "SB", start: "00:00", hours: 6 }, { status: "D", start: "06:00", hours: 5 }, { status: "OFF", start: "11:00", hours: 4 }] },
            { label: "Invalid 5+5 SB", blocks: [{ status: "SB", start: "00:00", hours: 5 }, { status: "D", start: "05:00", hours: 5 }, { status: "SB", start: "10:00", hours: 5 }] },
          ].map((p) => (
            <button key={p.label} onClick={() => loadPreset(p.blocks)} className="text-[11px] font-semibold bg-white border border-[#D4AF37]/30 text-[#002855] rounded-md py-1.5 hover:bg-[#D4AF37]/10" data-testid={`preset-${p.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
