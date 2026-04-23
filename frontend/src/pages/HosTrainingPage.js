import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame, Trophy, Sparkles, BookOpen, Target, Layers, Calendar, RotateCcw, CheckCircle2, XCircle, ChevronRight, GraduationCap, Zap, Award, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../components/app/AuthContext";
import { EldGrid } from "../components/hos/EldGrid";
import { validateSplit, STATUS_META, minToHm } from "../lib/hosRules";
import { DUTY_STATUS_QUIZ, FOURTEEN_HOUR_SCENARIOS, ELEVEN_HOUR_SCENARIOS, BREAK_SCENARIOS, RECAP_SCENARIOS, BADGES } from "../lib/hosScenarios";

/* Storage key helpers — progress is per-badge */
const KEY = (badge) => `inspnav_hos_training_${badge || "anon"}`;

function loadProgress(badge) {
  try {
    const raw = localStorage.getItem(KEY(badge));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    xp: 0,
    correctTotal: 0,
    wrongTotal: 0,
    streak: 0,
    lastTrainedDate: null,
    modulesCompleted: [],       // ids of completed modules (all correct at least once)
    badges: [],                 // earned badge ids
    bestPerModule: {},          // moduleId -> { correct, total, lastAttempt }
  };
}

function saveProgress(badge, progress) {
  try { localStorage.setItem(KEY(badge), JSON.stringify(progress)); } catch { /* ignore */ }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Merge result into progress and fire any new badges. */
function applyDrillResult(prev, { moduleId, correct, total }) {
  const next = { ...prev };
  next.xp = (prev.xp || 0) + correct * 10 - (total - correct) * 3;
  next.correctTotal = (prev.correctTotal || 0) + correct;
  next.wrongTotal = (prev.wrongTotal || 0) + (total - correct);

  // Streak — count as "trained today" if at least one correct answer
  const today = todayKey();
  if (next.lastTrainedDate !== today && correct > 0) {
    const prevDate = new Date(); prevDate.setDate(prevDate.getDate() - 1);
    const yKey = `${prevDate.getFullYear()}-${prevDate.getMonth()}-${prevDate.getDate()}`;
    next.streak = prev.lastTrainedDate === yKey ? (prev.streak || 0) + 1 : 1;
    next.lastTrainedDate = today;
  }

  // Best per module
  const best = prev.bestPerModule?.[moduleId] || { correct: 0, total: 0 };
  if (correct / total >= best.correct / (best.total || 1)) {
    next.bestPerModule = { ...(prev.bestPerModule || {}), [moduleId]: { correct, total, lastAttempt: today } };
  }

  // Module-complete (perfect run)
  if (correct === total && !next.modulesCompleted?.includes(moduleId)) {
    next.modulesCompleted = [...(next.modulesCompleted || []), moduleId];
  }

  // Badge awards
  const add = (id) => { if (!next.badges.includes(id)) next.badges = [...next.badges, id]; };
  if (correct === total && total > 0) add("first-perfect");
  if (next.streak >= 3) add("streak-3");
  if (next.streak >= 7) add("streak-7");
  if (next.correctTotal >= 100) add("hundred");
  if ((next.modulesCompleted || []).length >= 5) add("all-modules");

  return next;
}

/* ════════════════════════════════════════════════════════════════════════════
   Main page
   ════════════════════════════════════════════════════════════════════════════ */

export default function HosTrainingPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const [progress, setProgress] = useState(() => loadProgress(badge));
  const [activeModule, setActiveModule] = useState(null);

  const persist = useCallback((next) => { setProgress(next); saveProgress(badge, next); }, [badge]);
  const recordResult = useCallback((result) => persist(applyDrillResult(progress, result)), [progress, persist]);

  const MODULES = [
    { id: "duty",   title: "Duty Status 101",   subtitle: "Classify real situations",           icon: BookOpen, color: "#2563EB", component: DutyStatusModule, count: DUTY_STATUS_QUIZ.length, minutes: 3 },
    { id: "14hr",   title: "14-Hour Window",    subtitle: "Spot the on-duty violation",         icon: Clock,    color: "#DC2626", component: FourteenHourModule, count: FOURTEEN_HOUR_SCENARIOS.length, minutes: 5 },
    { id: "11hr",   title: "11-Hour Driving",   subtitle: "Count the driving time",             icon: Target,   color: "#F59E0B", component: ElevenHourModule, count: ELEVEN_HOUR_SCENARIOS.length, minutes: 4 },
    { id: "break",  title: "30-Min Break",      subtitle: "Find the missed interruption",       icon: Zap,      color: "#10B981", component: BreakModule, count: BREAK_SCENARIOS.length, minutes: 3 },
    { id: "recap",  title: "70-Hour Recap",     subtitle: "Count rolling 8-day hours",          icon: Calendar, color: "#7C3AED", component: RecapModule, count: RECAP_SCENARIOS.length, minutes: 4 },
    { id: "split",  title: "Split Sleeper",     subtitle: "Pair rest periods legally",          icon: Layers,   color: "#0891B2", component: SplitModule, count: null, minutes: 3 },
  ];

  const ModuleComp = MODULES.find((m) => m.id === activeModule)?.component;

  if (ModuleComp) {
    return (
      <ModuleComp
        onFinish={(result) => { if (result) recordResult({ moduleId: activeModule, ...result }); setActiveModule(null); }}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F2F5] to-white pb-8" data-testid="hos-training">
      {/* Header */}
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
            <p className="text-[10px] text-white/50">Property-carrying CMV · 49 CFR Part 395 · NASI-A material</p>
          </div>
        </div>
      </div>

      <main className="max-w-[900px] mx-auto px-3 pt-4 space-y-3">
        {/* Pick a module */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-1">Pick a drill</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULES.map((m) => {
            const best = progress.bestPerModule?.[m.id];
            const completed = progress.modulesCompleted?.includes(m.id);
            return (
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-[#002855]">{m.title}</p>
                    {completed && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
                  </div>
                  <p className="text-[11px] text-[#64748B]">{m.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#94A3B8]">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> ~{m.minutes} min</span>
                    {m.count !== null && <span>· {m.count} scenarios</span>}
                    {best && <span className="text-[#10B981] font-bold">· best {best.correct}/{best.total}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#002855] flex-shrink-0 mt-1" />
              </button>
            );
          })}
        </div>

        {/* Progress — collapsible, opt-in. Keeps gamification secondary to training. */}
        <details className="bg-white rounded-xl border border-[#E2E8F0] group" data-testid="progress-panel">
          <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none">
            <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex-1">Your progress</p>
            <span className="text-[10px] text-[#94A3B8]">
              {progress.correctTotal || 0} correct · streak {progress.streak || 0}d · {progress.badges?.length || 0} badge{(progress.badges?.length || 0) === 1 ? "" : "s"}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-[#F1F5F9]">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={Flame} label="Streak" value={`${progress.streak || 0}d`} color="#F59E0B" />
              <MiniStat icon={Sparkles} label="XP" value={progress.xp || 0} color="#D4AF37" />
              <MiniStat icon={Trophy} label="Badges" value={progress.badges?.length || 0} color="#10B981" />
            </div>
            <div className="grid grid-cols-5 gap-2" data-testid="badge-tray">
              {BADGES.map((b) => {
                const earned = progress.badges?.includes(b.id);
                return (
                  <div key={b.id} className={`flex flex-col items-center gap-1 text-center py-1.5 rounded-lg transition-all ${earned ? "bg-[#FFFBEB] ring-1 ring-[#D4AF37]/40" : "opacity-40"}`} title={b.desc}>
                    <span className="text-xl">{b.icon}</span>
                    <p className="text-[9px] font-bold leading-tight text-[#334155]">{b.label}</p>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => { if (window.confirm("Reset all training progress for this badge?")) { const fresh = loadProgress("__reset__"); persist({ ...fresh, streak: 0, lastTrainedDate: null }); }}}
              className="text-[10px] text-[#94A3B8] hover:text-[#DC2626] flex items-center gap-1"
              data-testid="reset-progress-btn"
            >
              <RotateCcw className="w-3 h-3" /> Reset progress
            </button>
          </div>
        </details>
      </main>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#F8FAFC] rounded-md px-2 py-2 flex items-center gap-2">
      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">{label}</p>
        <p className="text-sm font-bold text-[#002855] font-mono">{value}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Shared drill shell — header, back, progress, final results screen
   ════════════════════════════════════════════════════════════════════════════ */

function DrillShell({ title, manualRef, onBack, step, total, children, onFinish, correct, done }) {
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
            <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${((step) / total) * 100}%` }} />
          </div>
        )}
      </div>
      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        {done ? (
          <FinalResult correct={correct} total={total} onFinish={() => onFinish({ correct, total })} onRetry={() => window.location.reload()} />
        ) : children}
      </main>
    </div>
  );
}

function FinalResult({ correct, total, onFinish, onRetry }) {
  const pct = Math.round((correct / total) * 100);
  const perfect = correct === total;
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center space-y-4" data-testid="final-result">
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: perfect ? "#DCFCE7" : "#FEF3C7" }}>
        {perfect ? <Award className="w-9 h-9 text-[#10B981]" /> : <Target className="w-9 h-9 text-[#F59E0B]" />}
      </div>
      <div>
        <p className="text-2xl font-black text-[#002855]">{correct} / {total}</p>
        <p className="text-sm text-[#64748B]">{perfect ? "Perfect run — badge earned!" : pct >= 70 ? "Nice work — keep practicing." : "Close. Try again for a cleaner run."}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRetry} variant="outline" className="flex-1 border-[#E2E8F0]" data-testid="drill-retry"><RotateCcw className="w-4 h-4 mr-1.5" /> Retry</Button>
        <Button onClick={onFinish} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="drill-done">Done</Button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Module 1: Duty Status Classifier
   ════════════════════════════════════════════════════════════════════════════ */

function DutyStatusModule({ onFinish, onBack }) {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const done = idx >= DUTY_STATUS_QUIZ.length;
  // Guard q read until after `done` check — avoids reading .answer from undefined.
  const q = done ? null : DUTY_STATUS_QUIZ[idx];
  const isCorrect = q && pick === q.answer;

  const choose = (s) => {
    if (revealed || !q) return;
    setPick(s); setRevealed(true);
    if (s === q.answer) setCorrect((c) => c + 1);
  };

  const next = () => { setPick(null); setRevealed(false); setShowWhy(false); setIdx((i) => i + 1); };

  if (done) return <DrillShell title="Duty Status 101" manualRef="NASI-A pp. 96–97" onBack={onBack} onFinish={onFinish} correct={correct} total={DUTY_STATUS_QUIZ.length} done />;

  return (
    <DrillShell title="Duty Status 101" manualRef="NASI-A pp. 96–97" onBack={onBack} step={idx} total={DUTY_STATUS_QUIZ.length} onFinish={onFinish} correct={correct}>
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
                  revealed ? "border-[#E2E8F0] opacity-50" : "border-[#CBD5E1] hover:border-[#002855]"
                }`}
                data-testid={`ds-option-${s}`}
                style={{ backgroundColor: (revealed && !right && !wrong) ? "#F8FAFC" : undefined }}
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
              <p className="text-sm font-bold text-[#334155] flex-1">{isCorrect ? "Correct" : `Correct answer: ${STATUS_META[q.answer].label}`}</p>
              <button
                onClick={() => setShowWhy((v) => !v)}
                className="text-[11px] font-bold text-[#002855] bg-white border border-[#CBD5E1] rounded-md px-2 py-0.5 hover:bg-[#F1F5F9]"
                data-testid="ds-why-btn"
              >
                {showWhy ? "Hide" : "Why?"}
              </button>
            </div>
            {showWhy && (
              <p className="text-[12px] text-[#334155] leading-relaxed bg-white rounded-md border border-[#E2E8F0] p-2">
                {DUTY_STATUS_EXPLAIN[q.answer]} <span className="block mt-1 text-[10px] font-mono text-[#64748B]">49 CFR §395.2 · NASI-A pp. 96–97</span>
              </p>
            )}
          </div>
        )}
        <Button onClick={next} disabled={!revealed} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="ds-next-btn">
          {idx + 1 === DUTY_STATUS_QUIZ.length ? "Finish" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </DrillShell>
  );
}

/* Short explanations per duty status — shown when the inspector taps "Why?" */
const DUTY_STATUS_EXPLAIN = {
  OFF:  "Off Duty is time when the driver is relieved of all responsibilities, including to the vehicle. Personal activities (commuting, second non-CMV jobs, vacation) count here.",
  SB:   "Sleeper Berth is time spent resting inside a qualifying sleeper berth. It counts toward the 10-hour reset and valid 7/3 or 8/2 splits.",
  D:    "Driving is time at the controls of a CMV in operation on a public road. Deadheading a tractor across town to pick up a trailer still counts as Driving.",
  OD:   "On-Duty (not driving) is all other work — loading/unloading supervision, inspections, fueling, stopped at a scale, waiting on repairs, and time in the passenger seat ready to resume driving.",
};

/* ════════════════════════════════════════════════════════════════════════════
   Modules 2 & 3 & 4: Violation-finder pattern — tap the grid where the
   violation starts, or tap "No violation" if the log is clean.
   ════════════════════════════════════════════════════════════════════════════ */

function ViolationFinderModule({ title, manualRef, scenarios, tolerance = 30, onBack, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [mark, setMark] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [pickedNone, setPickedNone] = useState(false);
  const [correct, setCorrect] = useState(0);

  const done = idx >= scenarios.length;
  const s = done ? scenarios[scenarios.length - 1] : scenarios[idx];

  const reveal = (didCorrect) => {
    setRevealed(true);
    if (didCorrect) setCorrect((c) => c + 1);
  };

  const onMarkGrid = (minute) => {
    if (revealed) return;
    setMark(minute);
    setPickedNone(false);
  };

  const submit = () => {
    if (revealed) return;
    if (pickedNone) {
      reveal(!s.hasViolation);
    } else if (mark !== null) {
      const ok = s.hasViolation && Math.abs(mark - (s.violationMinute ?? -9999)) <= tolerance;
      reveal(ok);
    }
  };

  const noViolation = () => {
    if (revealed) return;
    setPickedNone(true); setMark(null);
  };

  const next = () => { setMark(null); setRevealed(false); setPickedNone(false); setIdx((i) => i + 1); };

  if (done) return <DrillShell title={title} manualRef={manualRef} onBack={onBack} onFinish={onFinish} correct={correct} total={scenarios.length} done />;

  const wasCorrect = revealed && (
    (pickedNone && !s.hasViolation) ||
    (mark !== null && s.hasViolation && Math.abs(mark - (s.violationMinute ?? -9999)) <= tolerance)
  );

  return (
    <DrillShell title={title} manualRef={s.manualRef} onBack={onBack} step={idx} total={scenarios.length} onFinish={onFinish} correct={correct}>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 sm:p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-[#002855] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</div>
          <p className="text-[13px] text-[#334155] leading-relaxed flex-1">
            Tap the grid at the exact time the violation begins.
            If this log has <span className="font-bold">no violation</span>, use the button below.
          </p>
        </div>

        <EldGrid
          entries={s.log}
          onMinuteClick={revealed ? null : onMarkGrid}
          markedMinute={mark}
          highlightMinute={revealed && s.hasViolation ? s.violationMinute : null}
        />

        {!revealed && (
          <div className="flex gap-2">
            <Button onClick={noViolation} variant="outline" className={`flex-1 border-2 ${pickedNone ? "border-[#10B981] bg-[#DCFCE7]" : "border-[#E2E8F0]"}`} data-testid="vf-no-violation">
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
              <p className="text-sm font-bold text-[#334155]">{wasCorrect ? "Correct!" : s.hasViolation ? "Not quite — here's where it starts" : "Clean log — no violation"}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed">{s.answerExplain}</p>
            <p className="text-[10px] text-[#64748B] font-mono pt-1">{s.manualRef}</p>
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

function FourteenHourModule(props) { return <ViolationFinderModule title="14-Hour Window Drill" manualRef="NASI-A pp. 19–21" scenarios={FOURTEEN_HOUR_SCENARIOS} tolerance={30} {...props} />; }
function ElevenHourModule(props)    { return <ViolationFinderModule title="11-Hour Driving Drill" manualRef="NASI-A pp. 30–32" scenarios={ELEVEN_HOUR_SCENARIOS} tolerance={30} {...props} />; }
function BreakModule(props)         { return <ViolationFinderModule title="30-Minute Break Drill"  manualRef="NASI-A p. 40"     scenarios={BREAK_SCENARIOS}      tolerance={30} {...props} />; }

/* ════════════════════════════════════════════════════════════════════════════
   Module 5: 70-Hour Recap — number entry
   ════════════════════════════════════════════════════════════════════════════ */

function RecapModule({ onBack, onFinish }) {
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

  if (done) return <DrillShell title="70-Hour Recap Drill" manualRef="NASI-A pp. 44–49" onBack={onBack} onFinish={onFinish} correct={correct} total={RECAP_SCENARIOS.length} done />;

  const total7 = s.days.reduce((sum, d) => sum + d.onDuty, 0);
  const val = parseFloat(entry);
  const wasCorrect = revealed && !isNaN(val) && Math.abs(val - s.answer) < 0.25;

  return (
    <DrillShell title="70-Hour Recap Drill" manualRef={s.manualRef} onBack={onBack} step={idx} total={RECAP_SCENARIOS.length} onFinish={onFinish} correct={correct}>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-4">
        <p className="text-sm text-[#002855] font-bold">{s.todayQuestion}</p>
        {/* Days */}
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
            <input
              type="number"
              step="0.5"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              disabled={revealed}
              placeholder="e.g. 5"
              className="flex-1 px-3 py-2 border border-[#CBD5E1] rounded-md font-mono text-lg font-bold text-[#002855] focus:border-[#002855] focus:outline-none"
              data-testid="recap-input"
            />
            {!revealed && (
              <Button onClick={submit} disabled={!entry} className="bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="recap-submit">Submit</Button>
            )}
          </div>
        </div>

        {revealed && (
          <div className={`rounded-lg p-3 border ${wasCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="recap-feedback">
            <div className="flex items-center gap-2 mb-1.5">
              {wasCorrect ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-sm font-bold text-[#334155]">{wasCorrect ? "Correct!" : `Correct answer: ${s.answer} hours`}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed">{s.answerExplain}</p>
            <p className="text-[10px] text-[#64748B] font-mono pt-1">{s.manualRef}</p>
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

/* ════════════════════════════════════════════════════════════════════════════
   Module 6: Split Sleeper validator — interactive, no scoring
   ════════════════════════════════════════════════════════════════════════════ */

function SplitModule({ onBack, onFinish }) {
  const [aHrs, setAHrs] = useState(7);
  const [aType, setAType] = useState("SB");
  const [bHrs, setBHrs] = useState(3);
  const [bType, setBType] = useState("OFF");
  const result = useMemo(() => validateSplit({ hours: aHrs, type: aType }, { hours: bHrs, type: bType }), [aHrs, aType, bHrs, bType]);

  // Build a sample day: A + 5h drive + B + 5h drive + OFF
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
          <Button onClick={() => onFinish(null)} variant="ghost" size="sm" className="text-white/80 hover:text-white text-xs">Done</Button>
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
                className="text-[11px] font-semibold bg-white border border-[#D4AF37]/30 text-[#002855] rounded-md py-1.5 hover:bg-[#D4AF37]/10"
                data-testid={`split-try-${p.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}>{p.label}</button>
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
