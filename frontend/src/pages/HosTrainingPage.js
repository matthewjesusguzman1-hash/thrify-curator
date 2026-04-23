import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookOpen, Target, Layers, Calendar, RotateCcw, CheckCircle2, XCircle, ChevronRight, GraduationCap, Zap, Award, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { EldGrid } from "../components/hos/EldGrid";
import { validateSplit, STATUS_META, minToHm } from "../lib/hosRules";
import { DUTY_STATUS_QUIZ, FOURTEEN_HOUR_SCENARIOS, ELEVEN_HOUR_SCENARIOS, BREAK_SCENARIOS, RECAP_SCENARIOS } from "../lib/hosScenarios";

/**
 * HosTrainingPage — property-carrying CMV HOS training.
 *
 * Quiz-style drills; no points, streaks, or badges. Explanations + 49 CFR /
 * NASI-A citations are always visible after every answer.
 */
export default function HosTrainingPage() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(null);

  const MODULES = [
    { id: "duty",   title: "Duty Status 101",   subtitle: "Classify real situations",     icon: BookOpen, color: "#2563EB", component: DutyStatusModule, count: DUTY_STATUS_QUIZ.length, minutes: 3 },
    { id: "14hr",   title: "14-Hour Window",    subtitle: "Spot the on-duty violation",   icon: Clock,    color: "#DC2626", component: FourteenHourModule, count: FOURTEEN_HOUR_SCENARIOS.length, minutes: 5 },
    { id: "11hr",   title: "11-Hour Driving",   subtitle: "Count the driving time",       icon: Target,   color: "#F59E0B", component: ElevenHourModule, count: ELEVEN_HOUR_SCENARIOS.length, minutes: 4 },
    { id: "break",  title: "30-Min Break",      subtitle: "Find the missed interruption", icon: Zap,      color: "#10B981", component: BreakModule, count: BREAK_SCENARIOS.length, minutes: 3 },
    { id: "recap",  title: "70-Hour Recap",     subtitle: "Count rolling 8-day hours",    icon: Calendar, color: "#7C3AED", component: RecapModule, count: RECAP_SCENARIOS.length, minutes: 4 },
  ];

  const ModuleComp = MODULES.find((m) => m.id === activeModule)?.component;

  if (ModuleComp) {
    return <ModuleComp onBack={() => setActiveModule(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F2F5] to-white pb-8" data-testid="hos-training">
      <div className="bg-[#002855] text-white border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-3 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
              <h1 className="text-sm font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>HOS Log Book Training</h1>
            </div>
            <p className="text-[10px] text-white/50">Property-carrying CMV · 49 CFR Part 395</p>
          </div>
        </div>
      </div>

      <main className="max-w-[900px] mx-auto px-3 pt-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-1">Pick a drill</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-left hover:border-[#002855] hover:shadow-md transition-all flex gap-3 items-start group"
              data-testid={`module-${m.id}`}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${m.color}18`, color: m.color }}>
                <m.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#002855]">{m.title}</p>
                <p className="text-[11px] text-[#64748B]">{m.subtitle}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#94A3B8]">
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> ~{m.minutes} min</span>
                  {m.count !== null && <span>· {m.count} scenarios</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#002855] flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ─── Shared shell ─── */
function DrillShell({ title, manualRef, onBack, step, total, children, correct, done, onDone }) {
  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-6">
      <div className="bg-[#002855] text-white sticky top-0 z-30 border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={onBack} className="text-white/70 hover:text-white p-1" data-testid="drill-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</p>
            {manualRef && <p className="text-[10px] text-white/50">{manualRef}</p>}
          </div>
          {!done && <p className="text-[11px] font-mono text-white/70 bg-white/10 rounded-md px-2 py-0.5">{step + 1} / {total}</p>}
        </div>
        {!done && (
          <div className="h-1 bg-white/10">
            <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${(step / total) * 100}%` }} />
          </div>
        )}
      </div>
      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        {done ? <FinalResult correct={correct} total={total} onDone={onDone} /> : children}
      </main>
    </div>
  );
}

function FinalResult({ correct, total, onDone }) {
  const perfect = correct === total;
  const pct = Math.round((correct / total) * 100);
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center space-y-4" data-testid="final-result">
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: perfect ? "#DCFCE7" : "#FEF3C7" }}>
        {perfect ? <Award className="w-9 h-9 text-[#10B981]" /> : <Target className="w-9 h-9 text-[#F59E0B]" />}
      </div>
      <div>
        <p className="text-2xl font-black text-[#002855]">{correct} / {total}</p>
        <p className="text-sm text-[#64748B]">{perfect ? "Perfect run!" : pct >= 70 ? "Nice work — keep practicing." : "Close. Try again for a cleaner run."}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()} variant="outline" className="flex-1 border-[#E2E8F0]" data-testid="drill-retry"><RotateCcw className="w-4 h-4 mr-1.5" /> Retry</Button>
        <Button onClick={onDone} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="drill-done">Done</Button>
      </div>
    </div>
  );
}

/* ─── Module 1: Duty Status Classifier ─── */
function DutyStatusModule({ onBack }) {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const done = idx >= DUTY_STATUS_QUIZ.length;
  const q = done ? null : DUTY_STATUS_QUIZ[idx];
  const isCorrect = q && pick === q.answer;

  const choose = (s) => {
    if (revealed || !q) return;
    setPick(s); setRevealed(true);
    if (s === q.answer) setCorrect((c) => c + 1);
  };
  const next = () => { setPick(null); setRevealed(false); setIdx((i) => i + 1); };

  if (done) return <DrillShell title="Duty Status 101" onBack={onBack} correct={correct} total={DUTY_STATUS_QUIZ.length} done onDone={onBack} />;

  return (
    <DrillShell title="Duty Status 101" onBack={onBack} step={idx} total={DUTY_STATUS_QUIZ.length} correct={correct}>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-4">
        <p className="text-sm text-[#334155]">{q.situation}</p>
        <div className="grid grid-cols-2 gap-2">
          {["OFF", "SB", "D", "OD"].map((s) => {
            const meta = STATUS_META[s];
            const right = revealed && s === q.answer;
            const wrong = revealed && pick === s && s !== q.answer;
            return (
              <button
                key={s}
                onClick={() => choose(s)}
                disabled={revealed}
                className={`rounded-lg border-2 py-3 flex flex-col items-center gap-1 transition-all font-bold ${
                  right ? "border-[#10B981] bg-[#DCFCE7]" :
                  wrong ? "border-[#DC2626] bg-[#FEE2E2]" :
                  revealed ? "border-[#E2E8F0] opacity-50 bg-[#F8FAFC]" : "border-[#CBD5E1] hover:border-[#002855]"
                }`}
                data-testid={`ds-option-${s}`}
              >
                <span className="w-8 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-xs text-[#002855]">{meta.label}</span>
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className={`rounded-lg p-3 border space-y-2 ${isCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="ds-feedback">
            <div className="flex items-center gap-2">
              {isCorrect ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-sm font-bold text-[#334155]">{isCorrect ? "Correct" : `Correct answer: ${STATUS_META[q.answer].label}`}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed">{DUTY_STATUS_EXPLAIN[q.answer]}</p>
            <p className="text-[10px] text-[#64748B] font-mono">49 CFR §395.2</p>
          </div>
        )}
        <Button onClick={next} disabled={!revealed} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="ds-next-btn">
          {idx + 1 === DUTY_STATUS_QUIZ.length ? "Finish" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </DrillShell>
  );
}

const DUTY_STATUS_EXPLAIN = {
  OFF:  "Off Duty is time when the driver is relieved of all responsibilities, including to the vehicle. Personal activities (commuting, second non-CMV jobs, vacation) count here.",
  SB:   "Sleeper Berth is time spent resting inside a qualifying sleeper berth. It counts toward the 10-hour reset and valid 7/3 or 8/2 splits.",
  D:    "Driving is time at the controls of a CMV in operation on a public road. Deadheading a tractor across town to pick up a trailer still counts as Driving.",
  OD:   "On-Duty (not driving) is all other work — loading/unloading supervision, inspections, fueling, stopped at a scale, waiting on repairs, and time in the passenger seat ready to resume driving.",
};

/* ─── Modules 2-4: Violation Finder (tap the grid OR pick "No violation") ─── */
function ViolationFinderModule({ title, manualRef, scenarios, tolerance = 30, onBack }) {
  const [idx, setIdx] = useState(0);
  const [mark, setMark] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [pickedNone, setPickedNone] = useState(false);
  const [correct, setCorrect] = useState(0);

  const done = idx >= scenarios.length;
  const s = done ? scenarios[scenarios.length - 1] : scenarios[idx];

  const submit = () => {
    if (revealed) return;
    let ok;
    if (pickedNone) ok = !s.hasViolation;
    else if (mark !== null) ok = s.hasViolation && Math.abs(mark - (s.violationMinute ?? -9999)) <= tolerance;
    else return;
    setRevealed(true);
    if (ok) setCorrect((c) => c + 1);
  };
  const next = () => { setMark(null); setRevealed(false); setPickedNone(false); setIdx((i) => i + 1); };

  if (done) return <DrillShell title={title} onBack={onBack} correct={correct} total={scenarios.length} done onDone={onBack} />;

  const wasCorrect = revealed && (
    (pickedNone && !s.hasViolation) ||
    (mark !== null && s.hasViolation && Math.abs(mark - (s.violationMinute ?? -9999)) <= tolerance)
  );

  return (
    <DrillShell title={title} onBack={onBack} step={idx} total={scenarios.length} correct={correct}>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 sm:p-4 space-y-3">
        <p className="text-[13px] text-[#334155] leading-relaxed">
          Tap the grid at the exact time the violation begins.
          If this log has <span className="font-bold">no violation</span>, use the button below.
        </p>
        <EldGrid
          entries={s.log}
          onMinuteClick={revealed ? null : (m) => { setMark(m); setPickedNone(false); }}
          markedMinute={mark}
          highlightMinute={revealed && s.hasViolation ? s.violationMinute : null}
        />

        {!revealed && (
          <div className="flex gap-2">
            <Button onClick={() => { setPickedNone(true); setMark(null); }} variant="outline" className={`flex-1 border-2 ${pickedNone ? "border-[#10B981] bg-[#DCFCE7]" : "border-[#E2E8F0]"}`} data-testid="vf-no-violation">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> No violation
            </Button>
            <Button onClick={submit} disabled={!pickedNone && mark === null} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a] disabled:opacity-40" data-testid="vf-submit">
              Submit {mark !== null ? `· ${minToHm(mark)}` : ""}
            </Button>
          </div>
        )}

        {revealed && (
          <div className={`rounded-lg p-3 border ${wasCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="vf-feedback">
            <div className="flex items-center gap-2 mb-1.5">
              {wasCorrect ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-sm font-bold text-[#334155]">{wasCorrect ? "Correct" : s.hasViolation ? "Not quite — here's where it starts" : "No violation on this log"}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed">{s.answerExplain}</p>
            <p className="text-[10px] text-[#64748B] font-mono pt-1">49 CFR Part 395</p>
          </div>
        )}

        {revealed && (
          <Button onClick={next} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="vf-next-btn">
            {idx + 1 === scenarios.length ? "Finish" : "Next scenario"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </DrillShell>
  );
}

function FourteenHourModule(props) { return <ViolationFinderModule title="14-Hour Window Drill" manualRef="NASI-A pp. 111–113" scenarios={FOURTEEN_HOUR_SCENARIOS} {...props} />; }
function ElevenHourModule(props)    { return <ViolationFinderModule title="11-Hour Driving Drill" manualRef="NASI-A pp. 122–124" scenarios={ELEVEN_HOUR_SCENARIOS} {...props} />; }
function BreakModule(props)         { return <ViolationFinderModule title="30-Minute Break Drill"  manualRef="NASI-A p. 132"     scenarios={BREAK_SCENARIOS}      {...props} />; }

/* ─── Module 5: 70-Hour Recap ─── */
function RecapModule({ onBack }) {
  const [idx, setIdx] = useState(0);
  const [entry, setEntry] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const done = idx >= RECAP_SCENARIOS.length;
  const s = done ? RECAP_SCENARIOS[RECAP_SCENARIOS.length - 1] : RECAP_SCENARIOS[idx];

  const submit = () => {
    const val = parseFloat(entry);
    if (isNaN(val)) return;
    setRevealed(true);
    if (Math.abs(val - s.answer) < 0.25) setCorrect((c) => c + 1);
  };
  const next = () => { setEntry(""); setRevealed(false); setIdx((i) => i + 1); };

  if (done) return <DrillShell title="70-Hour Recap Drill" onBack={onBack} correct={correct} total={RECAP_SCENARIOS.length} done onDone={onBack} />;

  const total7 = s.days.reduce((sum, d) => sum + d.onDuty, 0);
  const val = parseFloat(entry);
  const wasCorrect = revealed && !isNaN(val) && Math.abs(val - s.answer) < 0.25;

  return (
    <DrillShell title="70-Hour Recap Drill" onBack={onBack} step={idx} total={RECAP_SCENARIOS.length} correct={correct}>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-4">
        <p className="text-sm text-[#002855] font-bold">{s.todayQuestion}</p>
        <div className="space-y-1.5">
          {s.days.map((d, i) => (
            <div key={i} className="flex items-center justify-between bg-[#F8FAFC] rounded-md px-3 py-2 border border-[#E2E8F0]">
              <p className="text-xs font-bold text-[#334155]">{d.label}</p>
              <div className="flex items-center gap-2">
                {d.note && <span className="text-[9px] text-[#7C3AED] font-bold uppercase tracking-wider">{d.note}</span>}
                <p className="text-sm font-mono font-bold text-[#002855]">{d.onDuty}h</p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1 pt-2">
            <p className="text-[10px] text-[#64748B] font-bold uppercase">Sum (last 7 days)</p>
            <p className="text-sm font-mono font-bold text-[#64748B]">{total7}h</p>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Your answer (hours)</label>
          <div className="flex gap-2 mt-1">
            <input type="number" step="0.5" value={entry} onChange={(e) => setEntry(e.target.value)} disabled={revealed} placeholder="e.g. 5"
              className="flex-1 px-3 py-2 border border-[#CBD5E1] rounded-md font-mono text-lg font-bold text-[#002855] focus:border-[#002855] focus:outline-none"
              data-testid="recap-input" />
            {!revealed && <Button onClick={submit} disabled={!entry} className="bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="recap-submit">Submit</Button>}
          </div>
        </div>

        {revealed && (
          <div className={`rounded-lg p-3 border ${wasCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="recap-feedback">
            <div className="flex items-center gap-2 mb-1.5">
              {wasCorrect ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-sm font-bold text-[#334155]">{wasCorrect ? "Correct" : `Correct answer: ${s.answer} hours`}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed">{s.answerExplain}</p>
            <p className="text-[10px] text-[#64748B] font-mono pt-1">49 CFR Part 395</p>
          </div>
        )}

        {revealed && (
          <Button onClick={next} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="recap-next-btn">
            {idx + 1 === RECAP_SCENARIOS.length ? "Finish" : "Next scenario"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </DrillShell>
  );
}

/* ─── Module 6: Split Sleeper Trainer (interactive, no scoring) ─── */
function SplitModule({ onBack }) {
  const [aHrs, setAHrs] = useState(7);
  const [aType, setAType] = useState("SB");
  const [bHrs, setBHrs] = useState(3);
  const [bType, setBType] = useState("OFF");
  const result = useMemo(() => validateSplit({ hours: aHrs, type: aType }, { hours: bHrs, type: bType }), [aHrs, aType, bHrs, bType]);

  const entries = useMemo(() => {
    const out = []; let t = 0;
    const push = (status, dur) => { if (dur <= 0 || t >= 24 * 60) return; out.push({ status, start: minToHm(t), end: minToHm(Math.min(t + dur, 24 * 60)) }); t = Math.min(t + dur, 24 * 60); };
    push(aType, aHrs * 60); push("D", 300); push(bType, bHrs * 60); push("D", 300);
    return out;
  }, [aHrs, aType, bHrs, bType]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-6">
      <div className="bg-[#002855] text-white sticky top-0 z-30 border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={onBack} className="text-white/70 hover:text-white p-1"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Split Sleeper Trainer</p>
            <p className="text-[10px] text-white/50">49 CFR §395.1(g)(1)(ii) · Minimum pairings: 7+3 or 8+2</p>
          </div>
          <Button onClick={onBack} variant="ghost" size="sm" className="text-white/80 hover:text-white text-xs">Done</Button>
        </div>
      </div>

      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 space-y-3">
          <p className="text-[12px] text-[#334155] leading-relaxed">
            The longer rest period must be in the Sleeper Berth. The shorter may be SB or Off Duty. Both periods together must total at least 10 hours.
          </p>
          <PeriodSlider label="Period A" hrs={aHrs} setHrs={setAHrs} type={aType} setType={setAType} testid="split-a" />
          <PeriodSlider label="Period B" hrs={bHrs} setHrs={setBHrs} type={bType} setType={setBType} testid="split-b" />
          <div className={`rounded-lg p-3 border ${result.legal ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#DC2626] bg-[#FEE2E2]"}`} data-testid="split-verdict">
            <div className="flex items-center gap-2 mb-1">
              {result.legal ? <CheckCircle2 className="w-5 h-5 text-[#10B981]" /> : <XCircle className="w-5 h-5 text-[#DC2626]" />}
              <p className={`text-sm font-bold ${result.legal ? "text-[#065F46]" : "text-[#991B1B]"}`}>
                {result.legal ? `Legal ${result.type} split` : "Invalid pairing"}
              </p>
            </div>
            <p className="text-[12px] text-[#334155]">{result.reason}</p>
            <p className="text-[10px] text-[#64748B] font-mono pt-1">{result.cfr}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] px-1">Day preview · Period A → 5h drive → Period B → 5h drive</p>
          <EldGrid entries={entries} compact />
        </div>
        <div className="bg-[#FFFBEB] rounded-xl border border-[#D4AF37]/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1.5">Try these</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "8 SB + 2 OFF", a: [8, "SB"], b: [2, "OFF"] },
              { label: "7 SB + 3 OFF", a: [7, "SB"], b: [3, "OFF"] },
              { label: "6 SB + 4 OFF", a: [6, "SB"], b: [4, "OFF"] },
              { label: "7 SB + 4 SB", a: [7, "SB"], b: [4, "SB"] },
              { label: "5 SB + 5 SB", a: [5, "SB"], b: [5, "SB"] },
              { label: "9 SB + 1 OFF", a: [9, "SB"], b: [1, "OFF"] },
            ].map((p) => (
              <button key={p.label} onClick={() => { setAHrs(p.a[0]); setAType(p.a[1]); setBHrs(p.b[0]); setBType(p.b[1]); }}
                className="text-[11px] font-semibold bg-white border border-[#D4AF37]/30 text-[#002855] rounded-md py-1.5 hover:bg-[#D4AF37]/10">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PeriodSlider({ label, hrs, setHrs, type, setType, testid }) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg p-3" data-testid={testid}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-[#002855]">{label}</p>
        <div className="flex rounded-md overflow-hidden border border-[#E2E8F0]">
          <button onClick={() => setType("SB")} className={`px-2.5 py-1 text-[10px] font-bold ${type === "SB" ? "bg-[#2563EB] text-white" : "bg-white text-[#64748B]"}`} data-testid={`${testid}-sb`}>Sleeper</button>
          <button onClick={() => setType("OFF")} className={`px-2.5 py-1 text-[10px] font-bold ${type === "OFF" ? "bg-[#10B981] text-white" : "bg-white text-[#64748B]"}`} data-testid={`${testid}-off`}>Off duty</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min="0.5" max="10" step="0.5" value={hrs} onChange={(e) => setHrs(parseFloat(e.target.value))} className="flex-1 accent-[#D4AF37]" data-testid={`${testid}-slider`} />
        <span className="w-14 text-right text-sm font-bold text-[#002855] font-mono">{hrs.toFixed(1)}h</span>
      </div>
    </div>
  );
}
