import { useMemo, useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, Target, AlertTriangle, Hand, Repeat, List } from "lucide-react";
import { Button } from "../ui/button";
import { EldGrid } from "./EldGrid";
import { CfrText } from "../../lib/cfrLinks";

/**
 * PracticeRunner — generalized HOS practice scenario runner.
 *
 * Phases (mode = "split"):
 *   qualify → (yes) select → questions → done
 *           (no)  → questions
 *
 * Phases (mode = "shift"):
 *   questions → done   (no qualify, no select)
 *
 * Question flow inside `questions`:
 *   shift     — drag the green/red handles on the grid to mark shift START / END
 *   shouldEnd — (only when scenario.violation14 + scenario.regulatoryEndMin set)
 *   hours     — typed counted-hours toward 14 / 11
 *   violation — multiple-choice
 *
 * The runner maintains its own per-scenario state. A "Restart" button
 * resets the active scenario; "Pick scenario" opens an inline list so
 * the user can jump to any scenario in the array.
 */
export function PracticeRunner({ scenarios, mode = "split", category = "split", initialIdx = 0, renderContext = null }) {
  const [idx, setIdx] = useState(initialIdx);
  const [phase, setPhase] = useState(mode === "shift" ? "questions" : "qualify");
  const [selected, setSelected] = useState([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const scenario = scenarios[idx];

  const hasShouldEnd = scenario.violation14 && scenario.regulatoryEndMin !== undefined;
  const questionKeys = hasShouldEnd
    ? ["shift", "shouldEnd", "hours", "violation"]
    : ["shift", "hours", "violation"];
  const currentQKey = phase === "questions" ? questionKeys[questionIdx] : null;
  const shiftQActive = currentQKey === "shift" && answers.shift === undefined;

  const selectable = useMemo(() => {
    if (mode !== "split") return [];
    return scenario.log
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => (e.status === "SB" || e.status === "OFF"))
      .map(({ i }) => i);
  }, [scenario, mode]);

  const blockMarks = useMemo(() => {
    if (mode !== "split") return {};
    if (phase === "qualify" || phase === "select") return {};
    if (answers.qualify === "no" && scenario.qualifyingBlockIdx.length === 0) return {};
    const marks = {};
    const correctSet = new Set(scenario.qualifyingBlockIdx || []);
    const pickedSet = new Set(selected);
    for (const i of selectable) {
      if (correctSet.has(i) && pickedSet.has(i)) marks[i] = "correct";
      else if (!correctSet.has(i) && pickedSet.has(i)) marks[i] = "wrong";
      else if (correctSet.has(i) && !pickedSet.has(i)) marks[i] = "missed";
    }
    return marks;
  }, [phase, scenario, selected, selectable, answers.qualify, mode]);

  const toggle = (i) => {
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const submitSelection = () => {
    setPhase("questions");
    setQuestionIdx(0);
  };

  const resetAll = (toIdx = idx) => {
    setIdx(toIdx);
    setPhase(mode === "shift" ? "questions" : "qualify");
    setSelected([]);
    setAnswers({});
    setQuestionIdx(0);
    setTStart("");
    setTEnd("");
  };

  const nextScenario = () => resetAll((idx + 1) % scenarios.length);
  const restartScenario = () => resetAll(idx);
  const pickScenario = (newIdx) => { resetAll(newIdx); setShowPicker(false); };

  const selectionCorrect = useMemo(() => {
    if (mode !== "split") return true;
    const a = new Set(scenario.qualifyingBlockIdx || []);
    const b = new Set(selected);
    if (a.size !== b.size) return false;
    for (const i of a) if (!b.has(i)) return false;
    return true;
  }, [scenario, selected, mode]);

  return (
    <div className="space-y-3">
      {/* Top bar: scenario counter + restart + pick + next */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex-1 min-w-[120px]">
          Scenario {idx + 1} of {scenarios.length}
          {scenario.title && <span className="ml-1.5 text-[#002855] normal-case tracking-normal">· {scenario.title}</span>}
        </p>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="text-[10.5px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-1 px-2 py-1 rounded border border-[#E2E8F0] hover:border-[#D4AF37]"
          data-testid={`${category}-pick-scenario-btn`}
        >
          <List className="w-3 h-3" /> Pick scenario
        </button>
        <button
          onClick={restartScenario}
          className="text-[10.5px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-1 px-2 py-1 rounded border border-[#E2E8F0] hover:border-[#D4AF37]"
          data-testid={`${category}-restart-btn`}
        >
          <Repeat className="w-3 h-3" /> Restart
        </button>
        <button
          onClick={nextScenario}
          className="text-[11px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-0.5"
          data-testid={`${category}-next-scenario-btn`}
        >
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Scenario picker dropdown */}
      {showPicker && (
        <div
          className="bg-white rounded-xl border border-[#D4AF37]/40 p-2 max-h-[40vh] overflow-y-auto space-y-1"
          data-testid={`${category}-scenario-picker`}
        >
          {scenarios.map((s, i) => (
            <button
              key={s.id || i}
              onClick={() => pickScenario(i)}
              className={`w-full text-left rounded-md px-2.5 py-1.5 text-[12px] transition-colors flex items-start gap-2 ${
                i === idx ? "bg-[#FFFBEB] border border-[#D4AF37]" : "hover:bg-[#F8FAFC] border border-transparent"
              }`}
              data-testid={`${category}-scenario-pick-${i}`}
            >
              <span className="font-mono text-[#64748B] flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">
                <span className="font-bold text-[#002855]">{s.title || s.id || `Scenario ${i + 1}`}</span>
                {s.subtitle && <span className="block text-[10.5px] text-[#64748B] mt-0.5">{s.subtitle}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Optional context panel (multi-day prior days, 8-day recap, etc.) */}
      {renderContext && renderContext(scenario)}

      <section className="bg-white rounded-xl border border-[#E2E8F0] p-3 space-y-3">
        {phase === "select" && (
          <p className="text-[13px] text-[#334155] leading-relaxed">{scenario.prompt}</p>
        )}
        {mode === "shift" && phase === "questions" && questionIdx === 0 && answers.shift === undefined && scenario.prompt && (
          <p className="text-[13px] text-[#334155] leading-relaxed">{scenario.prompt}</p>
        )}
        {shiftQActive && (
          <div
            className="flex items-center gap-2 rounded-md border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2"
            data-testid="grid-tap-banner"
          >
            <Hand className="w-3.5 h-3.5 text-[#3730A3] flex-shrink-0" aria-hidden="true" />
            <p className="text-[11px] text-[#3730A3] leading-snug">
              <span className="font-bold">Drag</span> the <span className="font-bold text-[#10B981]">green START</span> and <span className="font-bold text-[#DC2626]">red END</span> handles on the grid (snaps to 15-min). Or type HH:MM (24-hr) below.
            </p>
          </div>
        )}
        <EldGrid
          entries={scenario.log}
          selectableIndices={selectable}
          selectedIndices={selected}
          onEntryClick={phase === "select" ? toggle : null}
          blockMarks={blockMarks}
          onMinuteClick={null}
          onMarkerDrag={shiftQActive ? (kind, markerId, newMin) => {
            const hhmm = `${String(Math.floor(newMin / 60)).padStart(2, "0")}:${String(newMin % 60).padStart(2, "0")}`;
            if (markerId === "shiftStart") setTStart(hhmm);
            else if (markerId === "shiftEnd") setTEnd(hhmm);
          } : null}
          shiftMarkers={[
            ...(answers.shift ? (() => {
              // After submitting, compare user's pick against canonical.
              // Wrong picks render as grey "WRONG" flags at the user's chosen
              // time; canonical correct time renders as the standard
              // green/red flag so the inspector can base later decisions on
              // the right answer. Strict equality — no tolerance.
              const us = answers.shift.start;
              const ue = answers.shift.end;
              const cs = scenario.shiftStartMin;
              const ce = scenario.shiftEndMin;
              const startWrong = us !== cs;
              const endWrong = ue !== ce;
              const out = [];
              if (startWrong) {
                out.push({ min: us, kind: "start", color: "#94A3B8", flagText: "WRONG", label: `Wrong start · ${fmtMin(us)}` });
                out.push({ min: cs, kind: "start", label: `Actual START · ${fmtMin(cs)}` });
              } else {
                out.push({ min: us, kind: "start", label: `Shift START · ${fmtMin(us)}` });
              }
              if (endWrong) {
                out.push({ min: ue, kind: "end", color: "#94A3B8", flagText: "WRONG", label: `Wrong end · ${fmtMin(ue)}` });
                out.push({ min: ce, kind: "end", label: `Actual END · ${fmtMin(ce)}` });
              } else {
                out.push({ min: ue, kind: "end", label: `Shift END · ${fmtMin(ue)}` });
              }
              return out;
            })() : []),
            ...(answers.shouldEnd ? (() => {
              const ue = answers.shouldEnd.end;
              const ce = scenario.regulatoryEndMin;
              if (ce === undefined) return [];
              const out = [];
              if (ue !== ce) {
                out.push({ min: ue, kind: "end", color: "#94A3B8", flagText: "WRONG", label: `Wrong cap · ${fmtMin(ue)}` });
                out.push({ min: ce, kind: "end", color: "#D4AF37", label: `Actual cap · ${fmtMin(ce)}` });
              } else {
                out.push({ min: ue, kind: "end", color: "#D4AF37", label: `Cap · ${fmtMin(ue)}` });
              }
              return out;
            })() : []),
            ...(shiftQActive ? [
              {
                min: timeStrToMin(tStart || "08:00") ?? 8 * 60,
                kind: "start",
                markerId: "shiftStart",
                draggable: true,
                label: `Drag → START · ${tStart || "08:00"}`,
              },
              {
                min: timeStrToMin(tEnd || "18:00") ?? 18 * 60,
                kind: "end",
                markerId: "shiftEnd",
                draggable: true,
                label: `Drag → END · ${tEnd || "18:00"}`,
              },
            ] : []),
          ]}
        />

        {phase === "qualify" && (
          <QualifyCard
            scenario={scenario}
            onContinue={(correctAnswer) => {
              setAnswers((a) => ({ ...a, qualify: correctAnswer }));
              if (correctAnswer === "yes") setPhase("select");
              else { setPhase("questions"); setQuestionIdx(0); }
            }}
          />
        )}

        {phase === "select" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSelected([])} className="border-[#E2E8F0]" data-testid="practice-clear">Clear</Button>
            <Button onClick={submitSelection} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="practice-submit">
              Submit selection ({selected.length})
            </Button>
          </div>
        )}

        {phase === "questions" && mode === "split" && answers.qualify === "yes" && (
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
    </div>
  );
}

/* ─── Sub-components ─── */

function QualifyCard({ scenario, onContinue }) {
  const correct = scenario.validSplit ? "yes" : "no";
  const [answered, setAnswered] = useState(undefined);
  const isCorrect = answered === correct;
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 space-y-2" data-testid="q-qualify">
      <p className="text-[12.5px] font-bold text-[#002855]">
        Are there qualifying rest periods to pair for the sleeper-berth provision?
      </p>
      <p className="text-[10.5px] text-[#64748B] leading-snug">
        §395.1(g)(1)(ii) requires <span className="font-bold">≥7 consecutive hours in the Sleeper Berth</span> AND a separate <span className="font-bold">≥2 consecutive hours in the Sleeper Berth or Off Duty</span>. If either is missing, no pair can form.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={answered !== undefined}
          onClick={() => setAnswered("yes")}
          className={`flex-1 border-[#E2E8F0] ${answered === "yes" ? (isCorrect ? "bg-[#F0FDF4] border-[#10B981] text-[#065F46]" : "bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]") : ""}`}
          data-testid="q-qualify-yes"
        >
          Yes
        </Button>
        <Button
          variant="outline"
          disabled={answered !== undefined}
          onClick={() => setAnswered("no")}
          className={`flex-1 border-[#E2E8F0] ${answered === "no" ? (isCorrect ? "bg-[#F0FDF4] border-[#10B981] text-[#065F46]" : "bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]") : ""}`}
          data-testid="q-qualify-no"
        >
          No
        </Button>
      </div>
      {answered !== undefined && (
        <>
          <div className={`rounded-md p-2 text-[11.5px] leading-relaxed ${isCorrect ? "bg-[#F0FDF4] text-[#065F46]" : "bg-[#FFFBEB] text-[#713F12] border border-[#F59E0B]/40"}`}>
            <p className="font-bold mb-0.5">{isCorrect ? "Correct." : `Not quite — the right answer is "${correct}".`}</p>
            <p><CfrText text={scenario.explanation.qualifying} /></p>
          </div>
          <Button
            onClick={() => onContinue(correct)}
            className="w-full bg-[#002855] text-white hover:bg-[#001a3a]"
            data-testid="q-qualify-continue"
          >
            {correct === "yes"
              ? "Continue — identify which blocks qualify"
              : "Continue — move to shift analysis"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

function QuestionsStack({ scenario, qIdx, answers, setAnswer, onNextQ, onDone, shiftTStart, shiftTEnd, setShiftTStart, setShiftTEnd }) {
  const questions = [
    {
      key: "shift",
      type: "twoTime",
      prompt: "When did the work shift START and END?",
      hint: "Shift START = first on-duty entry (or end of Period A if a valid split-sleeper pair exists). Shift END = where the driver's last on-duty/driving entry stops (or the start of Period B for a valid split pair). Tip: drag the green START and red END handles on the grid above.",
      correct: { start: scenario.shiftStartMin, end: scenario.shiftEndMin },
      explanation: scenario.explanation.shift,
    },
    ...(scenario.violation14 && scenario.regulatoryEndMin !== undefined ? [{
      key: "shouldEnd",
      type: "oneTime",
      prompt: "When SHOULD the work shift have ENDED under HOS rules?",
      hint: "§395.3(a)(2): with no valid split-sleeper pair, the shift must end 14 wall-clock hours after it started. Off-duty time inside the shift does NOT pause that clock.",
      correct: { end: scenario.regulatoryEndMin },
      explanation: scenario.explanation.shouldEnd,
    }] : []),
    {
      key: "hours",
      type: "twoNum",
      prompt: "How many hours count toward the 14-hr and 11-hr clocks?",
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
      // Strict equality — no tolerance.
      const normAnsEnd = answer.end === 0 && q.correct.end === 24 * 60 ? 24 * 60 : answer.end;
      correct = answer.start === q.correct.start && normAnsEnd === q.correct.end;
    } else if (q.type === "oneTime") {
      // Strict equality — no tolerance.
      const normAnsEnd = answer.end === 0 && q.correct.end === 24 * 60 ? 24 * 60 : answer.end;
      correct = normAnsEnd === q.correct.end;
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

      {q.type === "oneTime" && !answered && (
        <div className="space-y-2">
          {q.hint && (
            <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">{q.hint}</p>
          )}
          <div className="flex gap-2 items-center">
            <label className="text-[11px] font-bold text-[#475569] w-28">Shift END:</label>
            <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#D4AF37] focus:border-[#002855] focus:outline-none"
              data-testid={`${testid}-end`} />
          </div>
          <Button
            onClick={() => { const m = timeStrToMin(tEnd); if (m !== null) setAnswer({ end: m }); }}
            disabled={!tEnd}
            className="w-full bg-[#002855] text-white hover:bg-[#001a3a]"
            data-testid={`${testid}-submit`}
          >
            Submit
          </Button>
        </div>
      )}

      {q.type === "oneTime" && answered && (
        <div className="space-y-1 text-[12px] font-mono">
          <div className="flex justify-between"><span>Actual shift END:</span><span className="font-bold">Your: {minToTimeStr(answer.end)} &nbsp;·&nbsp; Correct: {minToTimeStr(q.correct.end)}</span></div>
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

      {answered && !isLast && (
        <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-next`}>
          Next question <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

/* ─── Time helpers ─── */
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
