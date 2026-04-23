import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Layers, CheckCircle2, XCircle, RotateCcw, Target, AlertTriangle, Moon, Hand } from "lucide-react";
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

/** Small chip shown above an ELD grid to set the pedagogical context:
 *  "assume the previous day ended with a full 10-hour OFF reset". */
function PriorResetBanner() {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1.5"
      data-testid="prior-reset-banner"
    >
      <Moon className="w-3.5 h-3.5 text-[#1D4ED8] flex-shrink-0" aria-hidden="true" />
      <p className="text-[11px] text-[#1E3A8A] leading-snug">
        <span className="font-bold">Assume prior day ended with a full 10-hour OFF reset</span>
        {" "}— driver's clocks are fresh at 00:00 of this log.
      </p>
    </div>
  );
}

function LearnTab() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
        <p className="text-[12.5px] text-[#334155] leading-relaxed">
          A split-sleeper pairing is the <span className="font-bold">equivalent of a 10-hour reset</span> taken as two rest periods instead of one. Per <a href="https://www.ecfr.gov/current/title-49/section-395.1" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:decoration-solid hover:text-[#D4AF37]" data-testid="cfr-link">49 CFR §395.1(g)(1)(ii)</a>: <span className="font-bold">≥7 consecutive hours in the Sleeper Berth</span> paired with <span className="font-bold">≥2 consecutive hours in the Sleeper Berth or Off Duty</span>, combined totaling <span className="font-bold">≥10 hrs</span>, in <span className="font-bold">any order</span>. Examples: 7+3, 8+2, 7.5+2.5 — all qualify.
        </p>
        <p className="text-[12.5px] text-[#334155] leading-relaxed mt-2">
          The wall-clock does <span className="font-bold">NOT</span> pause. Per §395.1(g)(1)(ii)(E), the time spent inside qualifying rest periods is <span className="font-bold text-[#10B981]">excluded from the 11-hr and 14-hr calculations</span> — in other words, those rest hours simply don't count toward either limit. Hours in <span className="font-bold text-[#D4AF37]">driving or on-duty segments</span> still count toward both.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-1">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#10B981]" /><p className="text-[10.5px] text-[#475569] font-bold">Excluded from 11 &amp; 14</p></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#D4AF37]" /><p className="text-[10.5px] text-[#475569] font-bold">Counts toward 11 &amp; 14</p></div>
      </div>

      <section className="bg-white rounded-xl border-2 border-[#D4AF37]/50 overflow-hidden" data-testid="shift-identification-card">
        <div className="bg-[#FFFBEB] border-b border-[#D4AF37]/30 px-4 py-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#002855] flex items-center justify-center text-[11px] font-bold">!</div>
          <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>How to identify the work shift</p>
        </div>
        <div className="p-4 space-y-2.5">
          <p className="text-[12.5px] text-[#334155] leading-relaxed">
            Every 11/14 calculation depends on knowing exactly when the work shift STARTS and ENDS. The CVSA procedure (Step 10) gives two rules — one for a standard 10-hr reset, and one for the sleeper-berth provision.
          </p>
          <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">Locate the START of the work shift</p>
            <ul className="space-y-1 pl-4">
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">10-Hour Continuous Break:</span> ALWAYS start counting at the END of a full 10-hour off-duty break.</li>
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">Sleeper Berth Provision:</span> ALWAYS start counting at the END of the FIRST segment of a qualifying split (§395.1(g)(1)(ii)).</li>
            </ul>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">Locate the STOPPING LINE</p>
            <ul className="space-y-1 pl-4">
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">10-Hour Continuous Break:</span> ALWAYS stop counting at the BEGINNING of a full 10-hour off-duty break.</li>
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">Sleeper Berth Provision:</span> ALWAYS stop counting at the BEGINNING of the SECOND segment of a qualifying split.</li>
            </ul>
          </div>
          <p className="text-[11.5px] text-[#64748B] leading-relaxed italic pt-1">
            <span className="font-bold">14-hr rule:</span> count all driving AND on-duty time between the start and stop lines. Off-duty and sleeper-berth time inside the window ALSO counts toward the 14 UNLESS it's part of a qualifying split-sleeper pairing (§395.1(g)(1)(ii)(E)).<br/>
            <span className="font-bold">11-hr rule:</span> count all DRIVING time between the start and stop lines.
          </p>
        </div>
      </section>

      {SPLIT_LEARN_SCENARIOS.map((s) => (
        <LearnCard key={s.id} s={s} />
      ))}
    </div>
  );
}

function LearnCard({ s }) {
  const [showMore, setShowMore] = useState(false);
  const hasExtras = s.extraExamples && s.extraExamples.length > 0;

  const body = s.multiDay ? (
    <>
      {s.days.map((d, i) => (
        <div key={i} className="space-y-1" data-testid={`learn-card-${s.id}-day-${i}`}>
          <div className="flex items-center justify-between px-1">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">{d.label}</p>
            {i < s.days.length - 1 && (
              <p className="text-[9.5px] text-[#94A3B8] italic">continues overnight ↓</p>
            )}
          </div>
          <EldGrid
            entries={d.log}
            brackets={[...(d.qualifyingBrackets || []), ...(d.countedBrackets || [])]}
            shiftMarkers={d.shiftMarkers || []}
            compact
          />
        </div>
      ))}
      <p className="text-[12.5px] text-[#334155] leading-relaxed pt-1"><CfrText text={s.description} /></p>
    </>
  ) : (
    <>
      {s.priorReset && <PriorResetBanner />}
      <EldGrid
        entries={s.log}
        brackets={[...(s.qualifyingBrackets || []), ...(s.countedBrackets || [])]}
        shiftMarkers={s.shiftMarkers || []}
        compact
      />
      <p className="text-[12.5px] text-[#334155] leading-relaxed"><CfrText text={s.description} /></p>
    </>
  );

  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`learn-card-${s.id}`}>
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2">
        {s.multiDay && <span className="text-[9px] font-bold uppercase tracking-wider bg-[#002855] text-[#D4AF37] rounded px-1.5 py-0.5">Multi-day</span>}
        <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{s.title}</p>
      </div>
      <div className="p-3 space-y-3">{body}</div>

      {hasExtras && (
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-white transition-colors"
            data-testid={`learn-more-btn-${s.id}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-[12px] font-bold">
                {showMore ? "−" : "+"}
              </div>
              <p className="text-[12px] font-bold text-[#002855]">
                {showMore ? "Hide extra examples" : `Show ${s.extraExamples.length} more example${s.extraExamples.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <p className="text-[10px] text-[#64748B]">{s.extraExamples.map((e) => e.name).join(" · ")}</p>
          </button>
          {showMore && (
            <div className="px-3 pb-3 pt-1 space-y-3 bg-white" data-testid={`learn-extras-${s.id}`}>
              {s.extraExamples.map((ex, i) => (
                <LearnExtra key={i} ex={ex} parentId={s.id} idx={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LearnExtra({ ex, parentId, idx }) {
  const testid = `learn-extra-${parentId}-${idx}`;
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden" data-testid={testid}>
      <div className="bg-[#FFFBEB] border-b border-[#D4AF37]/40 px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37]">Example {idx + 2}</span>
        <p className="text-[12px] font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{ex.name}</p>
        {ex.multiDay && <span className="text-[9px] font-bold uppercase tracking-wider bg-[#002855] text-[#D4AF37] rounded px-1 py-0.5 ml-auto">Multi-day</span>}
      </div>
      <div className="p-2.5 space-y-2">
        {ex.multiDay ? (
          ex.days.map((d, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{d.label}</p>
                {i < ex.days.length - 1 && (
                  <p className="text-[9px] text-[#94A3B8] italic">continues overnight ↓</p>
                )}
              </div>
              <EldGrid
                entries={d.log}
                brackets={[...(d.qualifyingBrackets || []), ...(d.countedBrackets || [])]}
                shiftMarkers={d.shiftMarkers || []}
                compact
              />
            </div>
          ))
        ) : (
          <>
            {ex.priorReset && <PriorResetBanner />}
            <EldGrid
              entries={ex.log}
              brackets={[...(ex.qualifyingBrackets || []), ...(ex.countedBrackets || [])]}
              shiftMarkers={ex.shiftMarkers || []}
              compact
            />
          </>
        )}
        <p className="text-[12px] text-[#334155] leading-relaxed"><CfrText text={ex.description} /></p>
      </div>
    </div>
  );
}

/* ────────────────────────── Practice Tab ────────────────────────── */

function PracticeTab() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("select"); // select → questions → next
  const [selected, setSelected] = useState([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { split, violation, h14, h11 }
  // Shift-question tap-to-set state — lifted here so EldGrid taps populate the
  // same tStart/tEnd strings the QuestionCard reads.
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [shiftTapNext, setShiftTapNext] = useState("start"); // 'start' | 'end'

  const scenario = SPLIT_PRACTICE_SCENARIOS[idx];

  // Current question index → key. Mirrors the order defined in QuestionsStack.
  const questionKeys = ["split", "shift", "hours", "violation"];
  const currentQKey = phase === "questions" ? questionKeys[questionIdx] : null;
  const shiftQActive = currentQKey === "shift" && answers.shift === undefined;

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
    setTStart("");
    setTEnd("");
    setShiftTapNext("start");
  };
  const resetScenario = () => {
    setPhase("select");
    setSelected([]);
    setAnswers({});
    setQuestionIdx(0);
    setTStart("");
    setTEnd("");
    setShiftTapNext("start");
  };

  // Tap handler for the shift question — cycles START → END → START again.
  // Snaps to the nearest 15 minutes (EldGrid already does that before firing).
  const handleGridTapForShift = (minute) => {
    const hhmm = minToHhmm(minute);
    if (shiftTapNext === "start") {
      setTStart(hhmm);
      setShiftTapNext("end");
    } else {
      setTEnd(hhmm);
      setShiftTapNext("start");
    }
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
        {scenario.priorReset && <PriorResetBanner />}
        {shiftQActive && (
          <div
            className="flex items-center gap-2 rounded-md border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2"
            data-testid="grid-tap-banner"
          >
            <Hand className="w-3.5 h-3.5 text-[#3730A3] flex-shrink-0" aria-hidden="true" />
            <p className="text-[11px] text-[#3730A3] leading-snug">
              <span className="font-bold">Tap the grid</span> to set
              {" "}<span className={`font-bold ${shiftTapNext === "start" ? "text-[#10B981]" : "text-[#DC2626]"}`}>
                {shiftTapNext === "start" ? "Shift START" : "Shift END"}
              </span>
              {" "}(snaps to 15-min). Or type HH:MM below.
            </p>
          </div>
        )}
        <EldGrid
          entries={scenario.log}
          selectableIndices={selectable}
          selectedIndices={selected}
          onEntryClick={phase === "select" ? toggle : null}
          blockMarks={blockMarks}
          onMinuteClick={shiftQActive ? handleGridTapForShift : null}
          shiftMarkers={[
            ...(answers.shift ? [
              { min: scenario.shiftStartMin, kind: "start", label: `Shift START · ${fmtMin(scenario.shiftStartMin)}` },
              { min: scenario.shiftEndMin, kind: "end", label: `Shift END · ${fmtMin(scenario.shiftEndMin)}` },
            ] : []),
            ...(shiftQActive && tStart ? [{ min: timeStrToMin(tStart), kind: "start", label: `You: START · ${tStart}` }] : []),
            ...(shiftQActive && tEnd ? [{ min: timeStrToMin(tEnd), kind: "end", label: `You: END · ${tEnd}`, labelRow: 1 }] : []),
          ]}
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
          shiftTStart={tStart}
          shiftTEnd={tEnd}
          setShiftTStart={setTStart}
          setShiftTEnd={setTEnd}
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
function QuestionsStack({ scenario, qIdx, answers, setAnswer, onNextQ, onDone, shiftTStart, shiftTEnd, setShiftTStart, setShiftTEnd }) {
  const questions = [
    {
      key: "split",
      type: "yesno",
      prompt: "Is this a valid split-sleeper pairing?",
      correct: scenario.validSplit ? "yes" : "no",
      explanation: scenario.explanation.split,
    },
    {
      key: "shift",
      type: "twoTime",
      prompt: "Identify the work shift — when does it START and END?",
      hint: "Split-sleeper: START = END of the FIRST qualifying rest segment · END = BEGINNING of the SECOND qualifying rest segment. No valid split: START = end of prior 10-hr reset (or first on-duty after it), END = 14 wall-clock hours later (or beginning of the next 10-hr reset, whichever is first).",
      correct: { start: scenario.shiftStartMin, end: scenario.shiftEndMin },
      explanation: scenario.explanation.shift,
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
          extTStart={q.key === "shift" ? shiftTStart : undefined}
          extTEnd={q.key === "shift" ? shiftTEnd : undefined}
          setExtTStart={q.key === "shift" ? setShiftTStart : undefined}
          setExtTEnd={q.key === "shift" ? setShiftTEnd : undefined}
        />
      ))}
    </section>
  );
}

function QuestionCard({ q, testid, answered, answer, setAnswer, onNext, isLast, extTStart, extTEnd, setExtTStart, setExtTEnd }) {
  const [h14, setH14] = useState("");
  const [h11, setH11] = useState("");
  const [localTStart, setLocalTStart] = useState("");
  const [localTEnd, setLocalTEnd] = useState("");
  // Prefer externally-controlled values (driven by grid taps) when parent provides them.
  const tStart = extTStart !== undefined ? extTStart : localTStart;
  const setTStart = setExtTStart || setLocalTStart;
  const tEnd = extTEnd !== undefined ? extTEnd : localTEnd;
  const setTEnd = setExtTEnd || setLocalTEnd;
  const submitTwoNum = () => {
    const v14 = parseFloat(h14);
    const v11 = parseFloat(h11);
    if (isNaN(v14) || isNaN(v11)) return;
    setAnswer({ h14: v14, h11: v11 });
  };
  const submitTwoTime = () => {
    const sMin = timeStrToMin(tStart);
    const eMin = timeStrToMin(tEnd);
    if (sMin === null || eMin === null) return;
    setAnswer({ start: sMin, end: eMin });
  };

  let correct = false;
  if (answered) {
    if (q.type === "twoNum") {
      correct = Math.abs(answer.h14 - q.correct.h14) < 0.5 && Math.abs(answer.h11 - q.correct.h11) < 0.5;
    } else if (q.type === "twoTime") {
      // ±10 min tolerance on start and end so HH:00 vs HH:05 still reads correct.
      // Also: <input type="time"> can't produce "24:00" — treat user 00:00 as
      // equivalent to 24*60 when the correct answer is a full-day shift.
      const normAnsEnd = answer.end === 0 && q.correct.end === 24 * 60 ? 24 * 60 : answer.end;
      correct = Math.abs(answer.start - q.correct.start) <= 10 && Math.abs(normAnsEnd - q.correct.end) <= 10;
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

      {q.type === "twoTime" && !answered && (
        <div className="space-y-2">
          {q.hint && (
            <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">{q.hint}</p>
          )}
          <div className="flex gap-2 items-center">
            <label className="text-[11px] font-bold text-[#475569] w-28">Shift START:</label>
            <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#10B981] focus:border-[#002855] focus:outline-none"
              data-testid={`${testid}-start`} />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[11px] font-bold text-[#475569] w-28">Shift END:</label>
            <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#DC2626] focus:border-[#002855] focus:outline-none"
              data-testid={`${testid}-end`} />
          </div>
          <Button onClick={submitTwoTime} disabled={!tStart || !tEnd} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-submit`}>
            Submit
          </Button>
        </div>
      )}

      {q.type === "twoTime" && answered && (
        <div className="space-y-1 text-[12px] font-mono">
          <div className="flex justify-between"><span>Shift START:</span><span className="font-bold">Your: {minToTimeStr(answer.start)} &nbsp;·&nbsp; Correct: {minToTimeStr(q.correct.start)}</span></div>
          <div className="flex justify-between"><span>Shift END:</span><span className="font-bold">Your: {minToTimeStr(answer.end)} &nbsp;·&nbsp; Correct: {minToTimeStr(q.correct.end)}</span></div>
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




/* Time helpers — convert between "HH:MM" strings and minutes-from-midnight.
 * Shift END on an overnight scenario may be >24:00 (not used in SP1-SP4,
 * which are single-day). 24:00 is treated as equivalent to "00:00 next day"
 * for input/display purposes. */
function timeStrToMin(str) {
  if (!str) return null;
  const [hh, mm] = str.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}
function minToTimeStr(min) {
  if (min === null || min === undefined) return "—";
  const m = min % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function fmtMin(min) {
  if (min === null || min === undefined) return "—";
  if (min === 24 * 60) return "24:00";
  return minToTimeStr(min);
}
/* Convert a minute-of-day into the "HH:MM" value an <input type="time">
 * expects. Clamps to the 00:00-23:59 range and zero-pads. */
function minToHhmm(min) {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
