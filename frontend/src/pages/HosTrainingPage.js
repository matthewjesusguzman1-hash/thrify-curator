import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, BookOpen, Target, Calendar, RotateCcw, CheckCircle2, XCircle,
  ChevronRight, GraduationCap, Zap, Award, Clock, Layers, Lightbulb, FileText,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { EldGrid } from "../components/hos/EldGrid";
import { STATUS_META, minToHm } from "../lib/hosRules";
import {
  DUTY_STATUS_QUIZ, FOURTEEN_HOUR_SCENARIOS, ELEVEN_HOUR_SCENARIOS,
  BREAK_SCENARIOS, RECAP_SCENARIOS, LEARN_CONTENT, onDutyBrackets, synthesizeDayLog,
} from "../lib/hosScenarios";

/**
 * HosTrainingPage — property-carrying CMV HOS training.
 * Flow: each module opens a Learn screen with an explanation + example ELD grid
 * (with corner brackets highlighting what the rule counts). The quiz is a
 * secondary option reached from a "Take the Quiz" button at the bottom.
 */

const MODULES = [
  { id: "duty",  learnKey: "duty",  title: "Duty Status 101",   subtitle: "Classify real situations",     icon: BookOpen,  color: "#2563EB", minutes: 3, quiz: DUTY_STATUS_QUIZ },
  { id: "14hr",  learnKey: "14hr",  title: "14-Hour Window",    subtitle: "Spot the on-duty violation",   icon: Clock,     color: "#DC2626", minutes: 5, quiz: FOURTEEN_HOUR_SCENARIOS },
  { id: "11hr",  learnKey: "11hr",  title: "11-Hour Driving",   subtitle: "Count the driving time",       icon: Target,    color: "#F59E0B", minutes: 4, quiz: ELEVEN_HOUR_SCENARIOS },
  { id: "break", learnKey: "break", title: "30-Min Break",      subtitle: "Find the missed interruption", icon: Zap,       color: "#10B981", minutes: 3, quiz: BREAK_SCENARIOS },
  { id: "recap", learnKey: "recap", title: "70-Hour Recap",     subtitle: "Count rolling 8-day hours",    icon: Calendar,  color: "#7C3AED", minutes: 4, quiz: RECAP_SCENARIOS },
  { id: "split", learnKey: null,    title: "Split Sleeper Trainer", subtitle: "Interactive 7+3 / 8+2",    icon: Layers,    color: "#0EA5E9", minutes: 6, quiz: null, route: "/hours-of-service/split-sleeper" },
];

export default function HosTrainingPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(null); // module id
  const [phase, setPhase] = useState("learn"); // learn | quiz

  const mod = useMemo(() => MODULES.find((m) => m.id === active) || null, [active]);

  const openModule = (m) => {
    if (m.route) { navigate(m.route); return; }
    setActive(m.id);
    setPhase("learn");
  };
  const goToQuiz = () => setPhase("quiz");
  const exitModule = () => { setActive(null); setPhase("learn"); };

  if (mod && phase === "learn") {
    return <LearnView mod={mod} onBack={exitModule} onQuiz={goToQuiz} />;
  }
  if (mod && phase === "quiz") {
    const Quiz = QUIZ_COMPONENTS[mod.id];
    return <Quiz onBack={() => setPhase("learn")} />;
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
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-1">Pick a rule to learn</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => openModule(m)}
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
                  {m.quiz && <span>· {m.quiz.length} quiz scenarios</span>}
                  {m.route && <span>· interactive</span>}
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

/* ═══════════════ Learn view (shared shell) ═══════════════ */

function LearnView({ mod, onBack, onQuiz }) {
  const content = LEARN_CONTENT[mod.learnKey];
  if (!content) return null;
  const isRecap = mod.id === "recap";

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-8" data-testid={`learn-${mod.id}`}>
      <header className="sticky top-0 z-30 bg-[#002855] text-white border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={onBack} className="text-white/70 hover:text-white p-1" data-testid="learn-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <mod.icon className="w-3.5 h-3.5 text-[#D4AF37]" />
              <p className="text-sm font-bold leading-tight truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{content.title}</p>
            </div>
            <p className="text-[10px] text-white/50 font-mono">{content.cfr}</p>
          </div>
          <button
            onClick={onQuiz}
            className="flex items-center gap-1 rounded-md bg-[#D4AF37] text-[#002855] hover:bg-[#E0BE50] px-2.5 py-1.5 text-[11px] font-bold transition-colors"
            data-testid="skip-to-quiz-btn"
          >
            <Target className="w-3.5 h-3.5" /> Quiz
          </button>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        {/* Intro */}
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Lightbulb className="w-4 h-4 text-[#D4AF37]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">The rule</p>
          </div>
          <p className="text-[13px] text-[#334155] leading-relaxed">{content.intro}</p>
        </section>

        {/* Sections — each with body text + example ELD + brackets */}
        {content.sections.map((s, i) => (
          <section key={i} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`learn-section-${i}`}>
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#002855] text-[#D4AF37] flex items-center justify-center text-[11px] font-bold">{i + 1}</div>
              <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{s.heading}</p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[12.5px] text-[#334155] leading-relaxed">{s.body}</p>
              {s.exampleLog && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Example log — brackets show what the rule counts</p>
                  <EldGrid entries={s.exampleLog} brackets={s.brackets || []} compact />
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Recap-specific: 7-day on-duty visualization */}
        {isRecap && <RecapLearnVisual />}

        {/* Summary + CTA to quiz */}
        {content.summary && (
          <section className="rounded-xl border-2 border-[#D4AF37]/40 bg-[#FFFBEB] p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Inspector takeaway</p>
            </div>
            <p className="text-[12.5px] text-[#334155] leading-relaxed">{content.summary}</p>
          </section>
        )}

        <div className="pt-2">
          <Button
            onClick={onQuiz}
            size="lg"
            className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-12 text-sm font-bold"
            data-testid="take-quiz-btn"
          >
            <Target className="w-4 h-4 mr-2" /> Take the {content.title} quiz
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <p className="text-[11px] text-center text-[#94A3B8] mt-2">
            {mod.quiz?.length || 0} scenarios · no timer · no score pressure
          </p>
        </div>
      </main>
    </div>
  );
}

/* 7-day visual for the recap learn page. Renders each prior day as a mini ELD
 * with brackets around on-duty segments, so inspectors see the reading pattern
 * before the quiz. Uses the same "available today" math as Scenario A. */
function RecapLearnVisual() {
  const SAMPLE = [
    { label: "Day −7 · Mon", onDuty: 10 },
    { label: "Day −6 · Tue", onDuty: 8 },
    { label: "Day −5 · Wed", onDuty: 10 },
    { label: "Day −4 · Thu", onDuty: 9 },
    { label: "Day −3 · Fri", onDuty: 11 },
    { label: "Day −2 · Sat", onDuty: 8 },
    { label: "Day −1 · Sun", onDuty: 9 },
  ];
  const total = SAMPLE.reduce((s, d) => s + d.onDuty, 0);
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid="recap-learn-visual">
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[11px] font-bold">R</div>
        <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>Read each day roadside</p>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[12px] text-[#334155] leading-relaxed">Brackets mark the on-duty segments the inspector counts. Sum the labels, then subtract from 70.</p>
        {SAMPLE.map((d, i) => {
          const log = synthesizeDayLog(d.onDuty);
          const brackets = onDutyBrackets(log, "#D4AF37");
          return (
            <div key={i} className="border border-[#E2E8F0] rounded-lg p-2" data-testid={`recap-day-${i}`}>
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-[11px] font-bold text-[#334155]">{d.label}</p>
                <p className="text-[11px] font-mono font-bold text-[#D4AF37]">{d.onDuty}h on-duty</p>
              </div>
              <EldGrid entries={log} brackets={brackets} compact />
            </div>
          );
        })}
        <div className="rounded-lg bg-[#F0FDF4] border border-[#10B981]/40 px-3 py-2 mt-2">
          <p className="text-[11px] text-[#065F46]">
            <span className="font-bold">Sum of last 7 days:</span> {total}h &nbsp;·&nbsp;
            <span className="font-bold">Available today:</span> 70 − {total} = <span className="font-mono font-bold">{70 - total}h</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ Quiz shells (unchanged behavior) ═══════════════ */

function DrillShell({ title, onBack, step, total, children, correct, done, onDone }) {
  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-6">
      <div className="bg-[#002855] text-white sticky top-0 z-30 border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={onBack} className="text-white/70 hover:text-white p-1" data-testid="drill-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</p>
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
        <Button onClick={onDone} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="drill-done">Back to Learn</Button>
      </div>
    </div>
  );
}

/* ─── Duty Status quiz ─── */
function DutyStatusQuiz({ onBack }) {
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
  OFF: "Off Duty is time when the driver is relieved of all responsibilities, including to the vehicle. Personal activities (commuting, second non-CMV jobs, vacation) count here.",
  SB:  "Sleeper Berth is time spent resting inside a qualifying sleeper berth. It counts toward the 10-hour reset and valid 7+3 or 8+2 splits.",
  D:   "Driving is time at the controls of a CMV in operation on a public road. Deadheading a tractor across town to pick up a trailer still counts as Driving.",
  OD:  "On-Duty (not driving) is all other work — loading/unloading supervision, inspections, fueling, stopped at a scale, waiting on repairs, and time in the passenger seat ready to resume driving.",
};

/* ─── Violation Finder (shared by 14-hr, 11-hr, break) ─── */
function ViolationFinderQuiz({ title, scenarios, tolerance = 30, onBack }) {
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
          Tap the grid at the exact time the violation begins. If this log has <span className="font-bold">no violation</span>, use the button below.
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

function FourteenHourQuiz({ onBack }) { return <ViolationFinderQuiz title="14-Hour Window Drill" scenarios={FOURTEEN_HOUR_SCENARIOS} onBack={onBack} />; }
function ElevenHourQuiz({ onBack })    { return <ViolationFinderQuiz title="11-Hour Driving Drill" scenarios={ELEVEN_HOUR_SCENARIOS} onBack={onBack} />; }
function BreakQuiz({ onBack })         { return <ViolationFinderQuiz title="30-Minute Break Drill"  scenarios={BREAK_SCENARIOS}      onBack={onBack} />; }

/* ─── 70-Hour Recap quiz ─── */
function RecapQuiz({ onBack }) {
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

        {/* Each day rendered as a mini ELD with brackets around on-duty segments */}
        <div className="space-y-1.5">
          {s.days.map((d, i) => {
            const log = synthesizeDayLog(d.onDuty);
            const brackets = onDutyBrackets(log, "#D4AF37");
            return (
              <div key={i} className="border border-[#E2E8F0] rounded-lg p-2 bg-[#FAFBFC]" data-testid={`recap-quiz-day-${i}`}>
                <div className="flex items-center justify-between px-1 mb-1">
                  <p className="text-[11px] font-bold text-[#334155]">{d.label}</p>
                  <div className="flex items-center gap-1.5">
                    {d.note && <span className="text-[9px] text-[#7C3AED] font-bold uppercase tracking-wider">{d.note}</span>}
                    <p className="text-[11px] font-mono font-bold text-[#D4AF37]">{d.onDuty}h</p>
                  </div>
                </div>
                <EldGrid entries={log} brackets={brackets} compact />
              </div>
            );
          })}
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

const QUIZ_COMPONENTS = {
  duty: DutyStatusQuiz,
  "14hr": FourteenHourQuiz,
  "11hr": ElevenHourQuiz,
  break: BreakQuiz,
  recap: RecapQuiz,
};
