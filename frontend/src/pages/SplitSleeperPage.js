import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Layers, CheckCircle2, XCircle, RotateCcw, Target, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { EldGrid } from "../components/hos/EldGrid";
import { SPLIT_LEARN_SCENARIOS, SPLIT_PRACTICE_SCENARIOS } from "../lib/hosScenarios";
import { CfrText } from "../lib/cfrLinks";

/**
 * SplitSleeperPage — two tabs.
 *   Learn     · walks through valid vs invalid pairings, with green brackets
 *               marking qualifying rest periods and gold brackets showing the
 *               hours that still count against the 11 and 14.
 *   Practice  · user taps the rest blocks they believe qualify, then answers
 *               three follow-up questions (valid split? 11/14 violation?
 *               counted hours) with graded explanations.
 */
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
              <p className="text-[10px] text-white/50">Property-carrying · <a href="https://www.ecfr.gov/current/title-49/section-395.1" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:decoration-solid hover:text-[#D4AF37]" data-testid="cfr-link">49 CFR §395.1(g)(1)(ii)</a></p>
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

function LearnTab() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
        <p className="text-[12.5px] text-[#334155] leading-relaxed">
          A split-sleeper pairing breaks the 10-hr reset into two qualifying rest periods.
          Hours spent inside a <span className="font-bold text-[#10B981]">qualifying rest period</span> pause
          BOTH the 11-hr driving clock AND the 14-hr work-shift clock.
          Hours spent in <span className="font-bold text-[#D4AF37]">on-duty or driving segments</span> count toward both limits.
          Valid pairing (<a href="https://www.ecfr.gov/current/title-49/section-395.1" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:decoration-solid hover:text-[#D4AF37]" data-testid="cfr-link">49 CFR §395.1(g)(1)(ii)</a>): <span className="font-bold">at least 7 hrs in the Sleeper Berth</span> paired with <span className="font-bold">at least 2 hrs in the Sleeper Berth or Off Duty</span>, combined totaling <span className="font-bold">at least 10 hrs</span>. The two periods may occur <span className="font-bold">in any order</span>. Common examples: 7+3, 8+2, 7.5+2.5 — all qualify.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-1">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#10B981]" /><p className="text-[10.5px] text-[#475569] font-bold">Qualifying rest</p></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#D4AF37]" /><p className="text-[10.5px] text-[#475569] font-bold">Counts toward 11 &amp; 14</p></div>
      </div>

      {SPLIT_LEARN_SCENARIOS.map((s) => (
        <LearnCard key={s.id} s={s} />
      ))}
    </div>
  );
}

function LearnCard({ s }) {
  if (s.multiDay) {
    return (
      <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`learn-card-${s.id}`}>
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider bg-[#002855] text-[#D4AF37] rounded px-1.5 py-0.5">Multi-day</span>
          <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{s.title}</p>
        </div>
        <div className="p-3 space-y-3">
          {s.days.map((d, i) => (
            <div key={i} className="space-y-1" data-testid={`learn-card-${s.id}-day-${i}`}>
              <div className="flex items-center justify-between px-1">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">{d.label}</p>
                {i < s.days.length - 1 && (
                  <p className="text-[9.5px] text-[#94A3B8] italic">continues overnight ↓</p>
                )}
              </div>
              <EldGrid entries={d.log} brackets={[...(d.qualifyingBrackets || []), ...(d.countedBrackets || [])]} compact />
            </div>
          ))}
          <p className="text-[12.5px] text-[#334155] leading-relaxed pt-1"><CfrText text={s.description} /></p>
        </div>
      </section>
    );
  }
  const brackets = [...(s.qualifyingBrackets || []), ...(s.countedBrackets || [])];
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`learn-card-${s.id}`}>
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2">
        <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{s.title}</p>
      </div>
      <div className="p-3 space-y-3">
        <EldGrid entries={s.log} brackets={brackets} compact />
        <p className="text-[12.5px] text-[#334155] leading-relaxed"><CfrText text={s.description} /></p>
      </div>
    </section>
  );
}

/* ────────────────────────── Practice Tab ────────────────────────── */

function PracticeTab() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("select"); // select → questions → next
  const [selected, setSelected] = useState([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { split, violation, h14, h11 }

  const scenario = SPLIT_PRACTICE_SCENARIOS[idx];

  // All rest blocks (SB or OFF) are selectable — except the pre-shift OFF
  // (entry index 0) if its status is OFF and it starts at 00:00. Practically,
  // ALL SB and OFF entries of duration ≥ 1h are made selectable here so the
  // user must reason about it themselves.
  const selectable = useMemo(() => {
    return scenario.log
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => (e.status === "SB" || e.status === "OFF"))
      .map(({ i }) => i);
  }, [scenario]);

  const blockMarks = useMemo(() => {
    if (phase === "select") return {};
    const marks = {};
    const correctSet = new Set(scenario.qualifyingBlockIdx);
    const pickedSet = new Set(selected);
    for (const i of selectable) {
      if (correctSet.has(i) && pickedSet.has(i)) marks[i] = "correct";
      else if (!correctSet.has(i) && pickedSet.has(i)) marks[i] = "wrong";
      else if (correctSet.has(i) && !pickedSet.has(i)) marks[i] = "missed";
    }
    return marks;
  }, [phase, scenario, selected, selectable]);

  const toggle = (i) => {
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const submitSelection = () => {
    setPhase("questions");
    setQuestionIdx(0);
    setAnswers({});
  };

  const nextScenario = () => {
    setIdx((i) => (i + 1) % SPLIT_PRACTICE_SCENARIOS.length);
    setPhase("select");
    setSelected([]);
    setAnswers({});
    setQuestionIdx(0);
  };
  const resetScenario = () => {
    setPhase("select");
    setSelected([]);
    setAnswers({});
    setQuestionIdx(0);
  };

  const selectionCorrect = useMemo(() => {
    const a = new Set(scenario.qualifyingBlockIdx);
    const b = new Set(selected);
    if (a.size !== b.size) return false;
    for (const i of a) if (!b.has(i)) return false;
    return true;
  }, [scenario, selected]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Scenario {idx + 1} of {SPLIT_PRACTICE_SCENARIOS.length}</p>
        <button onClick={nextScenario} className="text-[11px] font-bold text-[#002855] hover:text-[#D4AF37]" data-testid="next-scenario-btn">
          Next scenario <ChevronRight className="w-3 h-3 inline" />
        </button>
      </div>

      <section className="bg-white rounded-xl border border-[#E2E8F0] p-3 space-y-3">
        <p className="text-[13px] text-[#334155] leading-relaxed">{scenario.prompt}</p>
        <EldGrid
          entries={scenario.log}
          selectableIndices={selectable}
          selectedIndices={selected}
          onEntryClick={phase === "select" ? toggle : null}
          blockMarks={blockMarks}
        />

        {phase === "select" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSelected([])} className="border-[#E2E8F0]" data-testid="practice-clear">Clear</Button>
            <Button onClick={submitSelection} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="practice-submit">
              Submit selection ({selected.length})
            </Button>
          </div>
        )}

        {phase !== "select" && (
          <div className={`rounded-lg p-3 border ${selectionCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="selection-feedback">
            <div className="flex items-center gap-2 mb-1">
              {selectionCorrect ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-sm font-bold text-[#334155]">
                {selectionCorrect ? "You picked the right blocks." : "Not quite — grid now shows the truth."}
              </p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed"><CfrText text={scenario.explanation.qualifying} /></p>
            <div className="flex items-center gap-3 mt-2 text-[10.5px] text-[#475569]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" /> correct</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" /> wrong pick</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> you missed</span>
            </div>
          </div>
        )}
      </section>

      {phase === "questions" && (
        <QuestionsStack
          scenario={scenario}
          qIdx={questionIdx}
          answers={answers}
          setAnswer={(key, val) => setAnswers((a) => ({ ...a, [key]: val }))}
          onNextQ={() => setQuestionIdx((q) => q + 1)}
          onDone={() => setPhase("done")}
        />
      )}

      {phase === "done" && (
        <section className="rounded-xl border-2 border-[#D4AF37]/40 bg-[#FFFBEB] p-4 space-y-2" data-testid="practice-done">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
            <p className="text-sm font-bold text-[#002855]">Scenario complete</p>
          </div>
          <p className="text-[12px] text-[#334155] leading-relaxed">Review each explanation above, then try the next scenario.</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={resetScenario} className="border-[#E2E8F0]" data-testid="practice-retry">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry this one
            </Button>
            <Button onClick={nextScenario} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="practice-next-done">
              Next scenario <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── HOS questions stack ─── */
function QuestionsStack({ scenario, qIdx, answers, setAnswer, onNextQ, onDone }) {
  const questions = [
    {
      key: "split",
      type: "yesno",
      prompt: "Is this a valid split-sleeper pairing?",
      correct: scenario.validSplit ? "yes" : "no",
      explanation: scenario.explanation.split,
    },
    {
      key: "hours",
      type: "twoNum",
      prompt: "How many counted hours (D + OD that count against the clocks)?",
      correct: { h14: scenario.counted14Hours, h11: scenario.counted11Hours },
      explanation: scenario.explanation.hours,
    },
    {
      key: "violation",
      type: "choice",
      prompt: "Is the driver in violation of the 11- or 14-hour rule?",
      choices: [
        { value: "none",  label: "No violation" },
        { value: "11",    label: "11-hr driving" },
        { value: "14",    label: "14-hr work shift" },
        { value: "both",  label: "Both" },
      ],
      correct: (() => {
        if (scenario.violation11 && scenario.violation14) return "both";
        if (scenario.violation11) return "11";
        if (scenario.violation14) return "14";
        return "none";
      })(),
      explanation: scenario.explanation.violation,
    },
  ];

  // Ensure we only render up to qIdx-th question; previous ones stay visible with their answers
  return (
    <section className="space-y-3">
      {questions.slice(0, qIdx + 1).map((q, i) => (
        <QuestionCard
          key={q.key}
          q={q}
          testid={`q-${q.key}`}
          answered={answers[q.key] !== undefined}
          answer={answers[q.key]}
          setAnswer={(v) => setAnswer(q.key, v)}
          onNext={() => {
            if (i === questions.length - 1) onDone();
            else onNextQ();
          }}
          isLast={i === questions.length - 1}
        />
      ))}
    </section>
  );
}

function QuestionCard({ q, testid, answered, answer, setAnswer, onNext, isLast }) {
  const [h14, setH14] = useState("");
  const [h11, setH11] = useState("");
  const submitTwoNum = () => {
    const v14 = parseFloat(h14);
    const v11 = parseFloat(h11);
    if (isNaN(v14) || isNaN(v11)) return;
    setAnswer({ h14: v14, h11: v11 });
  };

  let correct = false;
  if (answered) {
    if (q.type === "twoNum") {
      correct = Math.abs(answer.h14 - q.correct.h14) < 0.5 && Math.abs(answer.h11 - q.correct.h11) < 0.5;
    } else {
      correct = answer === q.correct;
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">{q.prompt}</p>
      </div>

      {q.type === "yesno" && (
        <div className="grid grid-cols-2 gap-2">
          {[["yes", "Yes"], ["no", "No"]].map(([v, label]) => {
            const picked = answered && answer === v;
            const right = answered && v === q.correct;
            const wrong = picked && !right;
            return (
              <button key={v} onClick={() => !answered && setAnswer(v)} disabled={answered}
                className={`rounded-lg border-2 py-2.5 text-sm font-bold transition-colors ${
                  right ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                  wrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]" :
                  picked ? "border-[#002855] bg-[#002855]/5 text-[#002855]" :
                  answered ? "border-[#E2E8F0] opacity-40" : "border-[#CBD5E1] hover:border-[#002855]"
                }`}
                data-testid={`${testid}-${v}`}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "choice" && (
        <div className="grid grid-cols-2 gap-2">
          {q.choices.map((c) => {
            const picked = answered && answer === c.value;
            const right = answered && c.value === q.correct;
            const wrong = picked && !right;
            return (
              <button key={c.value} onClick={() => !answered && setAnswer(c.value)} disabled={answered}
                className={`rounded-lg border-2 py-2 text-[12px] font-bold transition-colors ${
                  right ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                  wrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]" :
                  picked ? "border-[#002855] bg-[#002855]/5 text-[#002855]" :
                  answered ? "border-[#E2E8F0] opacity-40" : "border-[#CBD5E1] hover:border-[#002855]"
                }`}
                data-testid={`${testid}-${c.value}`}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "twoNum" && !answered && (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-[11px] font-bold text-[#475569] w-28">Toward 14-hr:</label>
            <input type="number" step="0.5" value={h14} onChange={(e) => setH14(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#002855] focus:border-[#002855] focus:outline-none"
              data-testid={`${testid}-h14`} placeholder="hours" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[11px] font-bold text-[#475569] w-28">Toward 11-hr drive:</label>
            <input type="number" step="0.5" value={h11} onChange={(e) => setH11(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#002855] focus:border-[#002855] focus:outline-none"
              data-testid={`${testid}-h11`} placeholder="hours" />
          </div>
          <Button onClick={submitTwoNum} disabled={!h14 || !h11} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-submit`}>
            Submit
          </Button>
        </div>
      )}

      {q.type === "twoNum" && answered && (
        <div className="space-y-1 text-[12px] font-mono">
          <div className="flex justify-between"><span>Toward 14-hr:</span><span className="font-bold">Your: {answer.h14} &nbsp;·&nbsp; Correct: {q.correct.h14}</span></div>
          <div className="flex justify-between"><span>Toward 11-hr:</span><span className="font-bold">Your: {answer.h11} &nbsp;·&nbsp; Correct: {q.correct.h11}</span></div>
        </div>
      )}

      {answered && (
        <div className={`rounded-lg p-3 border ${correct ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid={`${testid}-feedback`}>
          <div className="flex items-center gap-2 mb-1">
            {correct ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
            <p className="text-[12px] font-bold text-[#334155]">{correct ? "Correct" : "Not quite — here's why"}</p>
          </div>
          <p className="text-[12px] text-[#334155] leading-relaxed"><CfrText text={q.explanation} /></p>
        </div>
      )}

      {answered && (
        <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-next`}>
          {isLast ? "Finish scenario" : "Next question"} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}


