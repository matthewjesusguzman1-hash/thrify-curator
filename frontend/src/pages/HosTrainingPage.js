import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookOpen, Target, Layers, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { LESSONS, SCENARIOS, STATUS_META, validateSplit, hmToMin, fmtDur } from "../lib/hosRules";
import { useAuth } from "../components/app/AuthContext";

const PROGRESS_KEY = (badge) => `inspnav_hos_training_${badge || "anon"}`;

/**
 * HosTrainingPage — property-carrying HOS training sandbox.
 *
 * Three tabs:
 *   1) Lessons      — concept cards, tap-through
 *   2) Scenarios    — quiz with timeline + explain-the-math
 *   3) Split trainer — two-period sleeper pairing validator
 */
export default function HosTrainingPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const [tab, setTab] = useState("lessons");

  // Progress is kept per badge so multiple inspectors sharing a device see
  // their own score. Structure: { lessonsRead: Set<string>, scored: Record<id, boolean> }
  const [progress, setProgress] = useState(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY(badge));
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { lessonsRead: [], scored: {} };
  });
  const persist = (next) => {
    setProgress(next);
    try { localStorage.setItem(PROGRESS_KEY(badge), JSON.stringify(next)); } catch { /* ignore */ }
  };

  const scoredCount = Object.values(progress.scored || {}).filter(Boolean).length;
  const totalScenarios = SCENARIOS.length;

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="hos-training">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#002855] border-b border-[#D4AF37]/20">
        <div className="max-w-[820px] mx-auto px-3 py-2 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>HOS Log Book Training</h1>
            <p className="text-[10px] text-white/50">Property-carrying CMV · 49 CFR Part 395</p>
          </div>
          <div className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-lg px-2 py-1" data-testid="training-score">
            <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[11px] font-bold text-[#D4AF37]">{scoredCount}/{totalScenarios}</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-[820px] mx-auto px-2 grid grid-cols-3 gap-1 pb-2">
          {[
            { id: "lessons",   label: "Lessons",    icon: BookOpen,  testid: "tab-lessons" },
            { id: "scenarios", label: "Scenarios",  icon: Target,    testid: "tab-scenarios" },
            { id: "split",     label: "Split Berth", icon: Layers,   testid: "tab-split" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${tab === t.id ? "bg-[#D4AF37] text-[#002855]" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              data-testid={t.testid}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[820px] mx-auto px-3 py-4 space-y-3">
        {tab === "lessons" && <LessonsTab progress={progress} persist={persist} />}
        {tab === "scenarios" && <ScenariosTab progress={progress} persist={persist} />}
        {tab === "split" && <SplitTrainerTab />}
      </main>
    </div>
  );
}

/* ───────────────────────────── Lessons Tab ─────────────────────────────── */

function LessonsTab({ progress, persist }) {
  const [openId, setOpenId] = useState(LESSONS[0].id);
  const read = new Set(progress.lessonsRead || []);
  return (
    <div className="space-y-2" data-testid="lessons-tab">
      {LESSONS.map((lesson) => {
        const isOpen = openId === lesson.id;
        const isRead = read.has(lesson.id);
        return (
          <div key={lesson.id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`lesson-${lesson.id}`}>
            <button
              onClick={() => {
                setOpenId(isOpen ? null : lesson.id);
                if (!isRead) {
                  const next = { ...progress, lessonsRead: [...(progress.lessonsRead || []), lesson.id] };
                  persist(next);
                }
              }}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${isOpen ? "bg-[#002855] text-white" : "bg-white hover:bg-[#F8FAFC]"}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isRead ? "bg-[#10B981] text-white" : isOpen ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                {isRead ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isOpen ? "text-white" : "text-[#334155]"}`}>{lesson.title}</p>
                <p className={`text-[10px] ${isOpen ? "text-white/60" : "text-[#94A3B8]"} font-mono`}>{lesson.cfr}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${isOpen ? "bg-white/20 text-white/80" : "bg-[#F1F5F9] text-[#64748B]"}`}>{lesson.key}</span>
            </button>
            {isOpen && (
              <div className="p-4 space-y-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                <p className="text-[13px] text-[#334155] leading-relaxed">{lesson.body}</p>
                <div className="rounded-lg border border-[#D4AF37]/40 bg-[#FFFBEB] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1">Worked example</p>
                  <p className="text-[12px] text-[#334155] leading-relaxed">{lesson.example}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────── Scenarios Tab ────────────────────────────── */

function ScenariosTab({ progress, persist }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const scenario = SCENARIOS[idx];
  const isCorrect = picked === scenario.correct;

  const choose = (optId) => {
    if (revealed) return;
    setPicked(optId);
    setRevealed(true);
    const scored = { ...(progress.scored || {}) };
    // Only mark as passed on first-attempt correct — change to forgiving logic
    // later if that feels too harsh.
    if (optId === scenario.correct) {
      scored[scenario.id] = true;
    } else if (scored[scenario.id] === undefined) {
      scored[scenario.id] = false;
    }
    persist({ ...progress, scored });
  };

  const next = () => {
    setPicked(null);
    setRevealed(false);
    setIdx((i) => (i + 1) % SCENARIOS.length);
  };

  return (
    <div className="space-y-3" data-testid="scenarios-tab">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider">Scenario {idx + 1} of {SCENARIOS.length} · {scenario.topic}</p>
        <div className="flex gap-1">
          {SCENARIOS.map((s, i) => {
            const st = progress.scored?.[s.id];
            return (
              <button key={s.id} onClick={() => { setIdx(i); setPicked(null); setRevealed(false); }}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-[#D4AF37] scale-125" : st === true ? "bg-[#10B981]" : st === false ? "bg-[#DC2626]" : "bg-[#CBD5E1]"}`}
                aria-label={`Go to scenario ${i + 1}`} />
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
        <p className="text-[13px] text-[#334155] leading-relaxed whitespace-pre-line">{scenario.prompt}</p>
        {scenario.log && <Timeline entries={scenario.log} />}
        <div className="border-t border-[#F1F5F9] pt-3">
          <p className="text-sm font-bold text-[#002855] mb-2">{scenario.question}</p>
          <div className="space-y-1.5">
            {scenario.options.map((o) => {
              const isSel = picked === o.id;
              const isRight = revealed && o.id === scenario.correct;
              const isWrong = revealed && isSel && o.id !== scenario.correct;
              return (
                <button
                  key={o.id}
                  onClick={() => choose(o.id)}
                  disabled={revealed}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-all flex items-start gap-2 ${
                    isRight ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                    isWrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]" :
                    isSel ? "border-[#002855] bg-[#F1F5F9]" :
                    "border-[#E2E8F0] bg-white hover:border-[#002855]/40"
                  }`}
                  data-testid={`scn-option-${o.id}`}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-current flex items-center justify-center text-[10px] font-bold mt-0.5">{o.id.toUpperCase()}</span>
                  <span className="flex-1">{o.text}</span>
                  {isRight && <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />}
                  {isWrong && <XCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {revealed && (
          <div className={`rounded-lg p-3 border space-y-1 ${isCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="scn-explanation">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
              {isCorrect ? "Correct — explain the math" : "Not quite — here's the math"}
            </p>
            <p className="text-[12px] text-[#334155] leading-relaxed">{scenario.explanation}</p>
            <p className="text-[10px] text-[#64748B] font-mono pt-1">{scenario.cfr}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            onClick={next}
            disabled={!revealed}
            className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a] h-10 text-xs font-bold disabled:opacity-40"
            data-testid="scn-next-btn"
          >
            Next scenario →
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Simple horizontal Gantt-style timeline for a day's log entries. */
function Timeline({ entries }) {
  const start = Math.min(...entries.map((e) => hmToMin(e.start)));
  const end = Math.max(...entries.map((e) => hmToMin(e.end)));
  const total = Math.max(end - start, 1);
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2" data-testid="scn-timeline">
      <div className="flex h-7 rounded-md overflow-hidden">
        {entries.map((e, i) => {
          const meta = STATUS_META[e.status] || STATUS_META.OFF;
          const dur = hmToMin(e.end) - hmToMin(e.start);
          const pct = (dur / total) * 100;
          return (
            <div key={i} style={{ width: `${pct}%`, backgroundColor: meta.color }} className="flex items-center justify-center text-[9px] font-bold text-white tracking-wider" title={`${meta.label} ${e.start}–${e.end}`}>
              {pct > 10 ? meta.short : ""}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-[#94A3B8] font-mono">
        <span>{entries[0].start}</span>
        <span>Total: {fmtDur(total)}</span>
        <span>{entries[entries.length - 1].end}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────── Split Trainer Tab ────────────────────────── */

function SplitTrainerTab() {
  const [aHrs, setAHrs] = useState(8);
  const [aType, setAType] = useState("SB");
  const [bHrs, setBHrs] = useState(2);
  const [bType, setBType] = useState("OFF");

  const result = useMemo(
    () => validateSplit({ hours: aHrs, type: aType }, { hours: bHrs, type: bType }),
    [aHrs, aType, bHrs, bType]
  );

  const reset = () => { setAHrs(8); setAType("SB"); setBHrs(2); setBType("OFF"); };

  return (
    <div className="space-y-3" data-testid="split-tab">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-4">
        <p className="text-[12px] text-[#64748B] leading-relaxed">
          Adjust the two rest periods below. The longer one must be in the Sleeper Berth.
          Standard rules: 8+2 or 7+3. (6/4 and 5/5 splits are under an FMCSA pilot program only.)
        </p>

        <PeriodEditor label="Period A" hrs={aHrs} setHrs={setAHrs} type={aType} setType={setAType} testid="split-a" />
        <PeriodEditor label="Period B" hrs={bHrs} setHrs={setBHrs} type={bType} setType={setBType} testid="split-b" />

        <div className={`rounded-lg p-3 border ${result.legal ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#DC2626] bg-[#FEE2E2]"}`} data-testid="split-result">
          <div className="flex items-center gap-2 mb-1">
            {result.legal
              ? <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              : <XCircle className="w-5 h-5 text-[#DC2626]" />}
            <p className={`text-sm font-bold ${result.legal ? "text-[#065F46]" : "text-[#991B1B]"}`}>
              {result.legal ? `Legal ${result.type} split` : "Not a valid split"}
            </p>
          </div>
          <p className="text-[12px] text-[#334155]">{result.reason}</p>
          <p className="text-[10px] text-[#64748B] font-mono pt-1">{result.cfr}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="flex-1 h-9 text-xs border-[#E2E8F0]" data-testid="split-reset-btn">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="bg-[#FFFBEB] rounded-xl border border-[#D4AF37]/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1.5">Try these</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "8 SB + 2 OFF", a: [8, "SB"], b: [2, "OFF"] },
            { label: "7 SB + 3 OFF", a: [7, "SB"], b: [3, "OFF"] },
            { label: "6 SB + 4 OFF", a: [6, "SB"], b: [4, "OFF"] },
            { label: "7.5 SB + 2.5 OFF", a: [7.5, "SB"], b: [2.5, "OFF"] },
            { label: "8 OFF + 2 SB", a: [8, "OFF"], b: [2, "SB"] },
            { label: "5 SB + 5 SB", a: [5, "SB"], b: [5, "SB"] },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => { setAHrs(s.a[0]); setAType(s.a[1]); setBHrs(s.b[0]); setBType(s.b[1]); }}
              className="text-[11px] font-semibold bg-white border border-[#D4AF37]/30 text-[#002855] rounded-md py-1.5 hover:bg-[#D4AF37]/10"
              data-testid={`split-try-${s.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodEditor({ label, hrs, setHrs, type, setType, testid }) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg p-3" data-testid={testid}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-[#002855]">{label}</p>
        <div className="flex rounded-md overflow-hidden border border-[#E2E8F0]">
          <button
            onClick={() => setType("SB")}
            className={`px-2.5 py-1 text-[10px] font-bold ${type === "SB" ? "bg-[#2563EB] text-white" : "bg-white text-[#64748B]"}`}
            data-testid={`${testid}-type-sb`}
          >Sleeper</button>
          <button
            onClick={() => setType("OFF")}
            className={`px-2.5 py-1 text-[10px] font-bold ${type === "OFF" ? "bg-[#10B981] text-white" : "bg-white text-[#64748B]"}`}
            data-testid={`${testid}-type-off`}
          >Off duty</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0.5" max="10" step="0.5"
          value={hrs}
          onChange={(e) => setHrs(parseFloat(e.target.value))}
          className="flex-1 accent-[#D4AF37] h-1.5"
          data-testid={`${testid}-slider`}
        />
        <span className="w-16 text-right text-sm font-bold text-[#002855] font-mono">{hrs.toFixed(1)} h</span>
      </div>
    </div>
  );
}
