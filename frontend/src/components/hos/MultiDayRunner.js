import { useMemo, useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, Target, AlertTriangle, Hand, Repeat, List, Lightbulb } from "lucide-react";
import { Button } from "../ui/button";
import { EldGrid } from "./EldGrid";
import { CfrText } from "../../lib/cfrLinks";

/**
 * MultiDayRunner — 2-day practice flow that presents BOTH day grids together
 * and asks the inspector to identify shifts iteratively. Per shift: (1) drag
 * START and END handles to mark its bounds — handles can sit on EITHER day's
 * grid (the runner auto-detects which day from the drag position), so an
 * overnight shift looks identical in the UI to a contained one. (2) pick the
 * violation type. After each shift is graded, the runner asks "is there
 * another shift?" — letting the user advance without the UI ever revealing
 * how many shifts the scenario has or whether it's overnight.
 *
 * Scenario shape:
 *   id, primer,
 *   priorDayLog?, priorDayNote?, nextDayLog?, nextDayNote?,
 *   shifts: [
 *     {
 *       startDay: 1 | 2,
 *       startMin,                        // 0..1440 within that day
 *       endDay: 1 | 2,
 *       endMin,                          // 0..1440 within that day
 *       regulatoryEndDay?, regulatoryEndMin?,
 *       violation11, violation14,
 *       explanation: { shift, violation }
 *     }, ...
 *   ],
 *   days: [{ label, log }, { label, log }]
 */
export function MultiDayRunner({ scenarios, category = "multiday", initialIdx = 0 }) {
  const [idx, setIdx] = useState(initialIdx);
  const [showPicker, setShowPicker] = useState(false);

  // per-shift cursor: which shift the user is currently identifying
  const [shiftIdx, setShiftIdx] = useState(0);
  // hints revealed so far for the current scenario (resets on scenario change)
  const [hintsRevealed, setHintsRevealed] = useState(0);
  // current draggable handle state
  const [tStart, setTStart] = useState({ day: 1, min: 8 * 60 });
  const [tEnd, setTEnd] = useState({ day: 1, min: 18 * 60 });
  // draggable handle for the §395.3 regulatory-end pick (14-hr cap)
  const [tRegEnd, setTRegEnd] = useState({ day: 1, min: 18 * 60 });
  // per-shift answers: array of { shiftAnswer:{startDay,startMin,endDay,endMin}, violation, regEndAnswer?, regEndAnswered? }
  const [shiftAnswers, setShiftAnswers] = useState([]);
  // phase within current shift: "shift" | "violation" | "regend" | "another?"
  const [phase, setPhase] = useState("shift");

  const rawScenario = scenarios[idx];
  // Derive a flat `shifts` array from the per-day data shape so cross-midnight
  // overnight shifts are treated as ONE continuous shift (start on Day 1, end
  // on Day 2). Two contained day shifts collapse to two entries.
  const scenario = useMemo(() => ({
    ...rawScenario,
    shifts: rawScenario.shifts ? rawScenario.shifts : deriveShifts(rawScenario.days),
  }), [rawScenario]);
  const totalShifts = scenario.shifts.length;
  const allShiftsDone = shiftIdx >= totalShifts;
  const currentShift = !allShiftsDone ? scenario.shifts[shiftIdx] : null;
  const currentAnswer = shiftAnswers[shiftIdx];

  const resetAll = (toIdx = idx) => {
    setIdx(toIdx);
    setShiftIdx(0);
    setShiftAnswers([]);
    setPhase("shift");
    setTStart({ day: 1, min: 8 * 60 });
    setTEnd({ day: 1, min: 18 * 60 });
    setTRegEnd({ day: 1, min: 18 * 60 });
    setHintsRevealed(0);
  };
  const nextScenario = () => resetAll((idx + 1) % scenarios.length);
  const restartScenario = () => resetAll(idx);
  const pickScenario = (newIdx) => { resetAll(newIdx); setShowPicker(false); };

  // Markers for each grid: committed answers (all prior + current if in
  // violation/another phase) + active draggable handles.
  const buildMarkersForDay = (dayN) => {
    const markers = [];
    // committed answers — show their bounds on the grids they belong to
    shiftAnswers.forEach((sa, sIdx) => {
      if (!sa) return;
      const ans = sa.shiftAnswer;
      const correctShift = scenario.shifts[sIdx];
      const TOL = 0;
      const startWrong = correctShift && (ans.startDay !== correctShift.startDay || Math.abs(ans.startMin - correctShift.startMin) > TOL);
      const endWrong = correctShift && (ans.endDay !== correctShift.endDay || Math.abs(ans.endMin - correctShift.endMin) > TOL);
      // User's submitted START on this grid
      if (ans.startDay === dayN) {
        if (startWrong) {
          markers.push({ min: ans.startMin, kind: "start", color: "#94A3B8", flagText: "WRONG", label: `Wrong start · ${minToTimeStr(ans.startMin)}` });
        } else {
          markers.push({ min: ans.startMin, kind: "start", label: `Shift ${sIdx + 1} START · ${minToTimeStr(ans.startMin)}` });
        }
      }
      // Canonical correct START on this grid (only if user got it wrong)
      if (startWrong && correctShift?.startDay === dayN) {
        markers.push({ min: correctShift.startMin, kind: "start", label: `Actual Shift ${sIdx + 1} START · ${minToTimeStr(correctShift.startMin)}` });
      }
      // User's submitted END on this grid
      if (ans.endDay === dayN) {
        if (endWrong) {
          markers.push({ min: ans.endMin, kind: "end", color: "#94A3B8", flagText: "WRONG", label: `Wrong end · ${minToTimeStr(ans.endMin)}` });
        } else {
          markers.push({ min: ans.endMin, kind: "end", label: `Shift ${sIdx + 1} END · ${minToTimeStr(ans.endMin)}` });
        }
      }
      // Canonical correct END on this grid (only if user got it wrong)
      if (endWrong && correctShift?.endDay === dayN) {
        markers.push({ min: correctShift.endMin, kind: "end", label: `Actual Shift ${sIdx + 1} END · ${minToTimeStr(correctShift.endMin)}` });
      }
      // Show §395.3 cap end ONLY after the user has submitted their own
      // regulatory-end answer — otherwise the marker would spoil the question.
      if (
        sa.regEndAnswered &&
        correctShift?.regulatoryEndDay === dayN &&
        correctShift?.regulatoryEndMin !== undefined &&
        !(correctShift.regulatoryEndDay === ans.endDay && correctShift.regulatoryEndMin === ans.endMin)
      ) {
        markers.push({
          min: correctShift.regulatoryEndMin,
          kind: "end",
          color: "#D4AF37",
          label: `Actually closed · ${minToTimeStr(correctShift.regulatoryEndMin)}`,
        });
      }
      // User's own committed regulatory-end pick (gold, dashed feel via label)
      if (
        sa.regEndAnswered &&
        sa.regEndAnswer?.day === dayN &&
        !(sa.regEndAnswer.day === correctShift?.regulatoryEndDay && sa.regEndAnswer.min === correctShift?.regulatoryEndMin)
      ) {
        markers.push({
          min: sa.regEndAnswer.min,
          kind: "end",
          color: "#B45309",
          label: `Your call · ${minToTimeStr(sa.regEndAnswer.min)}`,
        });
      }
    });
    // active draggable handles for the in-progress shift
    if (phase === "shift" && !allShiftsDone) {
      if (tStart.day === dayN) {
        markers.push({
          min: tStart.min,
          kind: "start",
          markerId: "shiftStart",
          draggable: true,
          label: `Drag → START · ${minToTimeStr(tStart.min)}`,
        });
      }
      if (tEnd.day === dayN) {
        markers.push({
          min: tEnd.min,
          kind: "end",
          markerId: "shiftEnd",
          draggable: true,
          label: `Drag → END · ${minToTimeStr(tEnd.min)}`,
        });
      }
    }
    // active draggable handle for the regulatory-end pick
    if (phase === "regend" && !allShiftsDone && tRegEnd.day === dayN) {
      markers.push({
        min: tRegEnd.min,
        kind: "end",
        color: "#D4AF37",
        markerId: "regEnd",
        draggable: true,
        label: `Drag → SHOULD HAVE ENDED · ${minToTimeStr(tRegEnd.min)}`,
      });
    }
    return markers;
  };

  const day1Markers = useMemo(() => buildMarkersForDay(1), [shiftAnswers, phase, tStart, tEnd, tRegEnd, allShiftsDone, scenario]);
  const day2Markers = useMemo(() => buildMarkersForDay(2), [shiftAnswers, phase, tStart, tEnd, tRegEnd, allShiftsDone, scenario]);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex-1 min-w-[120px]">
          Scenario {idx + 1} of {scenarios.length}
        </p>
        <button onClick={() => setShowPicker((v) => !v)} className="text-[10.5px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-1 px-2 py-1 rounded border border-[#E2E8F0] hover:border-[#D4AF37]" data-testid={`${category}-pick-scenario-btn`}>
          <List className="w-3 h-3" /> Pick scenario
        </button>
        <button onClick={restartScenario} className="text-[10.5px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-1 px-2 py-1 rounded border border-[#E2E8F0] hover:border-[#D4AF37]" data-testid={`${category}-restart-btn`}>
          <Repeat className="w-3 h-3" /> Restart
        </button>
        <button onClick={nextScenario} className="text-[11px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-0.5" data-testid={`${category}-next-scenario-btn`}>
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {showPicker && (
        <div className="bg-white rounded-xl border border-[#D4AF37]/40 p-2 max-h-[40vh] overflow-y-auto space-y-1" data-testid={`${category}-scenario-picker`}>
          {scenarios.map((s, i) => (
            <button key={s.id || i} onClick={() => pickScenario(i)}
              className={`w-full text-left rounded-md px-2.5 py-1.5 text-[12px] flex items-start gap-2 ${i === idx ? "bg-[#FFFBEB] border border-[#D4AF37]" : "hover:bg-[#F8FAFC] border border-transparent"}`}
              data-testid={`${category}-scenario-pick-${i}`}>
              <span className="font-mono text-[#64748B] flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-bold text-[#002855]">{s.title || s.id || `Scenario ${i + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pre-scenario primer */}
      {scenario.primer && (
        <div className="rounded-xl border-l-[3px] border-[#3B82F6] bg-[#EEF6FF] p-3" data-testid="scenario-primer">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#1D4ED8]">Before you start</p>
          </div>
          <p className="text-[12px] text-[#1E3A8A] leading-relaxed">{scenario.primer}</p>
        </div>
      )}

      {/* Progressive Hints — neutral primer never gives away the answer; user
          can choose to reveal hints one at a time. */}
      {Array.isArray(scenario.hints) && scenario.hints.length > 0 && (
        <HintPanel
          hints={scenario.hints}
          revealed={hintsRevealed}
          onReveal={() => setHintsRevealed((n) => Math.min(n + 1, scenario.hints.length))}
        />
      )}

      {/* Day 1 + Day 2 grids — always both visible (no day-by-day reveal) */}
      <DaySection
        label={scenario.days[0].label}
        log={scenario.days[0].log}
        markers={day1Markers}
        active={(phase === "shift" || phase === "regend") && !allShiftsDone}
        onMarkerDrag={(phase === "shift" || phase === "regend") && !allShiftsDone ? (kind, markerId, newMin) => {
          if (markerId === "shiftStart") setTStart({ day: 1, min: newMin });
          else if (markerId === "shiftEnd") setTEnd({ day: 1, min: newMin });
          else if (markerId === "regEnd") setTRegEnd({ day: 1, min: newMin });
        } : null}
      />
      <DaySection
        label={scenario.days[1].label}
        log={scenario.days[1].log}
        markers={day2Markers}
        active={(phase === "shift" || phase === "regend") && !allShiftsDone}
        onMarkerDrag={(phase === "shift" || phase === "regend") && !allShiftsDone ? (kind, markerId, newMin) => {
          if (markerId === "shiftStart") setTStart({ day: 2, min: newMin });
          else if (markerId === "shiftEnd") setTEnd({ day: 2, min: newMin });
          else if (markerId === "regEnd") setTRegEnd({ day: 2, min: newMin });
        } : null}
      />

      {/* Active shift question */}
      {!allShiftsDone && phase === "shift" && (
        <ShiftQuestionCard
          tStart={tStart} setTStart={setTStart}
          tEnd={tEnd} setTEnd={setTEnd}
          onSubmit={() => {
            const ans = { startDay: tStart.day, startMin: tStart.min, endDay: tEnd.day, endMin: tEnd.min };
            const updated = [...shiftAnswers];
            updated[shiftIdx] = { shiftAnswer: ans };
            setShiftAnswers(updated);
            setPhase("violation");
          }}
          shift={currentShift}
          answer={currentAnswer?.shiftAnswer}
          phase={phase}
          onAdvance={() => setPhase("violation")}
          testid={`shift-${shiftIdx}`}
        />
      )}

      {/* Violation question for the just-identified shift */}
      {!allShiftsDone && phase === "violation" && currentAnswer?.shiftAnswer && (
        <ViolationQuestionCard
          shift={currentShift}
          answered={currentAnswer.violation !== undefined}
          answer={currentAnswer.violation}
          onPick={(v) => {
            const updated = [...shiftAnswers];
            updated[shiftIdx] = { ...updated[shiftIdx], violation: v };
            setShiftAnswers(updated);
          }}
          onNext={() => {
            // If the canonical shift had a 14-hr cap (i.e. a regulatory end
            // moment) AND the user said there was a 14-hr violation, ask them
            // when the shift SHOULD have ended. Otherwise skip to "another?".
            const hasRegEnd = currentShift?.regulatoryEndMin !== undefined && currentShift?.regulatoryEndMin !== null;
            const userCalledFourteen = currentAnswer.violation === "14" || currentAnswer.violation === "both";
            if (hasRegEnd && userCalledFourteen) {
              // seed the handle near the end of the user's shift bracket so
              // they have a sensible starting drag position
              setTRegEnd({ day: currentAnswer.shiftAnswer.endDay, min: currentAnswer.shiftAnswer.endMin });
              setPhase("regend");
            } else {
              setPhase("another?");
            }
          }}
          testid={`violation-${shiftIdx}`}
        />
      )}

      {/* Regulatory-end question — only when the shift had a 14-hr cap and
          the user called a 14-hr violation. */}
      {!allShiftsDone && phase === "regend" && currentAnswer?.shiftAnswer && (
        <RegEndQuestionCard
          shift={currentShift}
          tRegEnd={tRegEnd}
          setTRegEnd={setTRegEnd}
          answered={!!currentAnswer.regEndAnswered}
          answer={currentAnswer.regEndAnswer}
          onSubmit={() => {
            const updated = [...shiftAnswers];
            updated[shiftIdx] = {
              ...updated[shiftIdx],
              regEndAnswer: { day: tRegEnd.day, min: tRegEnd.min },
              regEndAnswered: true,
            };
            setShiftAnswers(updated);
          }}
          onNext={() => setPhase("another?")}
          testid={`regend-${shiftIdx}`}
        />
      )}

      {/* "Another shift?" — neutral wording, doesn't reveal scenario count */}
      {!allShiftsDone && phase === "another?" && (
        <AnotherShiftCard
          onYes={() => {
            setShiftIdx((i) => i + 1);
            setPhase("shift");
            setTStart({ day: 1, min: 8 * 60 });
            setTEnd({ day: 1, min: 18 * 60 });
            setTRegEnd({ day: 1, min: 18 * 60 });
          }}
          onNo={() => {
            // User declares "no more shifts". If they're correct (matches
            // total), advance to all-done. If not, mark wrong-answer and
            // advance anyway so they can review.
            setShiftIdx(totalShifts);
            setPhase("done");
          }}
          testid={`another-${shiftIdx}`}
        />
      )}

      {/* Summary card after user declares no more shifts */}
      {allShiftsDone && (
        <ResultsSummary
          scenario={scenario}
          shiftAnswers={shiftAnswers}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function HintPanel({ hints, revealed, onReveal }) {
  const [open, setOpen] = useState(false);
  const total = hints.length;
  const allRevealed = revealed >= total;
  return (
    <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] overflow-hidden" data-testid="hint-panel">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#FEF3C7] transition-colors"
        data-testid="hint-panel-toggle"
      >
        <Lightbulb className="w-4 h-4 text-[#B45309]" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] flex-1">Hints (optional)</p>
        <span className="text-[10.5px] font-bold text-[#92400E]">
          {revealed}/{total}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 text-[#92400E] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 border-t border-[#FCD34D]" data-testid="hint-panel-body">
          {revealed === 0 ? (
            <p className="text-[11.5px] text-[#92400E] italic leading-relaxed">
              Try to bracket the shift on your own first. Reveal a hint only if you get stuck.
            </p>
          ) : (
            <ol className="list-decimal ml-4 space-y-1.5">
              {hints.slice(0, revealed).map((h, i) => (
                <li key={i} className="text-[11.5px] text-[#1F2937] leading-relaxed" data-testid={`hint-${i + 1}`}>
                  {h}
                </li>
              ))}
            </ol>
          )}
          {!allRevealed && (
            <button
              onClick={onReveal}
              className="w-full mt-1 px-3 py-1.5 rounded-md border border-[#D4AF37] bg-white text-[11.5px] font-bold text-[#92400E] hover:bg-[#FEF3C7]"
              data-testid="hint-reveal-next-btn"
            >
              Reveal hint {revealed + 1} of {total}
            </button>
          )}
          {allRevealed && (
            <p className="text-[10.5px] italic text-[#92400E] text-center">All hints revealed.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ContextDayStrip({ label, log, note, testid }) {
  return (
    <section className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] overflow-hidden opacity-90" data-testid={testid}>
      <div className="bg-[#E2E8F0]/60 px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Context · readonly</span>
        <p className="text-[12px] font-bold text-[#475569]">{label}</p>
      </div>
      <div className="p-2">
        <EldGrid entries={log} />
        {note && <p className="text-[11px] text-[#64748B] leading-relaxed mt-1.5 px-1 italic">{note}</p>}
      </div>
    </section>
  );
}

function DaySection({ label, log, markers, active, onMarkerDrag }) {
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`day-section-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="bg-[#002855] text-white px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Log</span>
        <p className="text-[12.5px] font-bold">{label}</p>
        {active && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-[#D4AF37]">
            <Hand className="w-3 h-3" /> drag to either day's grid
          </span>
        )}
      </div>
      <div className="p-2">
        <EldGrid entries={log} shiftMarkers={markers} onMarkerDrag={onMarkerDrag} />
      </div>
    </section>
  );
}

function ShiftQuestionCard({ tStart, setTStart, tEnd, setTEnd, onSubmit, testid }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">When did this work shift START and END?</p>
      </div>
      <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">
        Drag the green / red handles onto whichever day's grid the bounds fall on. You can also pick the day + time manually below.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <DayTimePicker
          label="Shift START"
          color="#10B981"
          value={tStart}
          onChange={setTStart}
          testid={`${testid}-start`}
        />
        <DayTimePicker
          label="Shift END"
          color="#DC2626"
          value={tEnd}
          onChange={setTEnd}
          testid={`${testid}-end`}
        />
      </div>
      <Button onClick={onSubmit} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-submit`}>
        Submit shift
      </Button>
    </div>
  );
}

function DayTimePicker({ label, color, value, onChange, testid }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#475569]" style={{ color }}>{label}</label>
      <select
        value={value.day}
        onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
        className="w-full px-2 py-1.5 text-[12px] font-bold border border-[#CBD5E1] rounded-md outline-none focus:border-[#002855]"
        data-testid={`${testid}-day`}
      >
        <option value={1}>Day 1</option>
        <option value={2}>Day 2</option>
      </select>
      <input
        type="time"
        value={minToTimeStr(value.min)}
        onChange={(e) => {
          const m = timeStrToMin(e.target.value);
          if (m !== null) onChange({ ...value, min: m });
        }}
        className="w-full px-2 py-1.5 text-sm font-mono font-bold border border-[#CBD5E1] rounded-md outline-none focus:border-[#002855]"
        style={{ color }}
        data-testid={testid}
      />
    </div>
  );
}

function ViolationQuestionCard({ shift, answered, answer, onPick, onNext, testid }) {
  const choices = [
    { value: "none", label: "No violation" },
    { value: "11",   label: "11-hr drive" },
    { value: "14",   label: "14-hr shift" },
    { value: "both", label: "Both 11 and 14" },
  ];
  const correctValue = (
    shift.violation11 && shift.violation14 ? "both" :
    shift.violation11 ? "11" :
    shift.violation14 ? "14" : "none"
  );
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">Was there an 11- or 14-hour violation on the shift you just identified?</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c) => {
          const picked = answered && answer === c.value;
          const right = answered && c.value === correctValue;
          const wrong = picked && !right;
          return (
            <button key={c.value} onClick={() => !answered && onPick(c.value)} disabled={answered}
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
      {answered && (
        <>
          <div className={`rounded-md p-2.5 border ${answer === correctValue ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`}>
            <div className="flex items-center gap-2 mb-1">
              {answer === correctValue ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-[12px] font-bold text-[#334155]">{answer === correctValue ? "Correct" : `Correct: ${choices.find((c) => c.value === correctValue).label}`}</p>
            </div>
            <p className="text-[11.5px] text-[#334155] leading-relaxed"><CfrText text={shift.explanation.violation} /></p>
          </div>
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-next`}>
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

function RegEndQuestionCard({ shift, tRegEnd, setTRegEnd, answered, answer, onSubmit, onNext, testid }) {
  // Tolerance ±10 min, exact day match — same as ResultsSummary uses for shift bounds.
  const correctDay = shift.regulatoryEndDay;
  const correctMin = shift.regulatoryEndMin;
  const isCorrect = answered && answer && answer.day === correctDay && Math.abs(answer.min - correctMin) === 0;
  return (
    <div className="bg-white rounded-xl border border-[#D4AF37]/60 p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#92400E] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">When SHOULD this 14-hour shift have ended under §395.3(a)(2)?</p>
      </div>
      <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">
        14 wall-clock hours after the shift START. Drag the gold handle on the grid (or pick day + time below) to mark when driving should have stopped.
      </p>
      <div className="max-w-[200px]">
        <DayTimePicker
          label="Cap closes at"
          color="#B45309"
          value={tRegEnd}
          onChange={answered ? () => {} : setTRegEnd}
          testid={`${testid}-regend`}
        />
      </div>
      {!answered && (
        <Button onClick={onSubmit} className="w-full bg-[#92400E] text-white hover:bg-[#7C2D12]" data-testid={`${testid}-submit`}>
          Submit cap time
        </Button>
      )}
      {answered && (
        <>
          <div className={`rounded-md p-2.5 border ${isCorrect ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`}>
            <div className="flex items-center gap-2 mb-1">
              {isCorrect ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-[12px] font-bold text-[#334155]">
                {isCorrect ? "Correct" : `Correct: Day ${correctDay} ${minToTimeStr(correctMin)}`}
              </p>
            </div>
            <p className="text-[11.5px] text-[#334155] leading-relaxed">
              §395.3(a)(2) closes the shift exactly 14 wall-clock hours after the first on-duty entry. Any driving past that minute is the 14-hour violation — flag the moment the cap was crossed and document the over-cap driving time.
            </p>
          </div>
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-next`}>
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

function AnotherShiftCard({ onYes, onNo, testid }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">Is there another work shift in these two days that you haven't identified yet?</p>
      </div>
      <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">
        Look at the grids above — if every work segment is bounded by the shift markers you've already placed, choose "No more shifts". Otherwise pick "Yes — identify next" and bracket the next shift.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onYes} variant="outline" className="border-[#E2E8F0]" data-testid={`${testid}-yes`}>
          Yes — identify next shift
        </Button>
        <Button onClick={onNo} className="bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-no`}>
          No more shifts
        </Button>
      </div>
    </div>
  );
}

function ResultsSummary({ scenario, shiftAnswers }) {
  const totalShifts = scenario.shifts.length;
  const userIdentified = shiftAnswers.filter((a) => a?.shiftAnswer).length;
  const countMatch = userIdentified === totalShifts;

  return (
    <section className="bg-white rounded-xl border-2 border-[#D4AF37]/40 overflow-hidden" data-testid="multi-results">
      <div className="bg-[#FFFBEB] px-3 py-2 flex items-center gap-2 border-b border-[#D4AF37]/30">
        <Target className="w-4 h-4 text-[#D4AF37]" />
        <p className="text-[12px] font-bold text-[#002855]">Inspection summary</p>
        <span className={`ml-auto text-[10.5px] font-bold px-2 py-0.5 rounded ${countMatch ? "bg-[#10B981]/15 text-[#065F46]" : "bg-[#F59E0B]/20 text-[#92400E]"}`}>
          {userIdentified} / {totalShifts} shifts identified
        </span>
      </div>
      <div className="p-3 space-y-3">
        {!countMatch && (
          <div className="rounded-md p-2.5 border border-[#F59E0B] bg-[#FFFBEB]">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              <p className="text-[12px] font-bold text-[#334155]">
                {userIdentified < totalShifts
                  ? `Missed ${totalShifts - userIdentified} shift${totalShifts - userIdentified === 1 ? "" : "s"}`
                  : `Identified ${userIdentified - totalShifts} extra shift${userIdentified - totalShifts === 1 ? "" : "s"} that don't exist`}
              </p>
            </div>
          </div>
        )}
        {scenario.shifts.map((s, i) => {
          const ua = shiftAnswers[i]?.shiftAnswer;
          const startMatch = ua && ua.startDay === s.startDay && Math.abs(ua.startMin - s.startMin) === 0;
          const endMatch = ua && ua.endDay === s.endDay && Math.abs(ua.endMin - s.endMin) === 0;
          const fullMatch = startMatch && endMatch;
          return (
            <div key={i} className={`rounded-md border p-2.5 ${ua ? (fullMatch ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]") : "border-[#DC2626] bg-[#FEE2E2]"}`}>
              <p className="text-[11.5px] font-bold text-[#002855] mb-1">Canonical shift {i + 1}</p>
              <div className="text-[11.5px] font-mono text-[#334155]">
                <p>Correct: Day {s.startDay} {minToTimeStr(s.startMin)} → Day {s.endDay} {minToTimeStr(s.endMin)}</p>
                {ua ? (
                  <p>You marked: Day {ua.startDay} {minToTimeStr(ua.startMin)} → Day {ua.endDay} {minToTimeStr(ua.endMin)} {fullMatch ? "✓" : ""}</p>
                ) : (
                  <p className="text-[#991B1B]">Not identified.</p>
                )}
              </div>
              <p className="text-[11.5px] text-[#334155] leading-relaxed mt-1.5"><CfrText text={s.explanation.shift} /></p>
            </div>
          );
        })}
      </div>
    </section>
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
  if (min === 24 * 60) return "24:00";
  const m = min % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/* ─── Derive a flat shifts[] from per-day data ───
 * MULTIDAY_SCENARIOS stores per-day shift bounds with continuesToNext /
 * continuesFromPrev flags. To make cross-midnight overnight shifts a SINGLE
 * draggable shift (start on Day 1, end on Day 2), we merge a day flagged
 * `continuesToNext` with the next day flagged `continuesFromPrev` into one
 * shift entry. Days without a shift (off-duty all day) are skipped.
 */
function deriveShifts(days) {
  if (!days || !Array.isArray(days)) return [];
  const out = [];
  let open = null;
  days.forEach((d, i) => {
    const dayN = i + 1;
    if (d.shiftStartMin == null || d.shiftEndMin == null) return;
    if (d.continuesFromPrev && open) {
      // Close the open overnight shift on this day
      open.endDay = dayN;
      open.endMin = d.shiftEndMin;
      open.violation11 = open.violation11 || !!d.violation11;
      open.violation14 = open.violation14 || !!d.violation14;
      if (d.regulatoryEndMin != null) {
        open.regulatoryEndDay = dayN;
        open.regulatoryEndMin = d.regulatoryEndMin;
      }
      if (d.explanation) {
        // Prefer the day where the violation surfaces (later day for overnight)
        open.explanation = {
          shift: d.explanation.shift || open.explanation.shift,
          violation: d.explanation.violation || open.explanation.violation,
        };
      }
      out.push(open);
      open = null;
      return;
    }
    const s = {
      startDay: dayN,
      startMin: d.shiftStartMin,
      endDay: dayN,
      endMin: d.shiftEndMin,
      violation11: !!d.violation11,
      violation14: !!d.violation14,
      explanation: d.explanation ? { ...d.explanation } : { shift: "", violation: "" },
    };
    if (d.regulatoryEndMin != null) {
      s.regulatoryEndDay = dayN;
      s.regulatoryEndMin = d.regulatoryEndMin;
    }
    if (d.continuesToNext) {
      open = s; // wait for the next day to merge
    } else {
      out.push(s);
    }
  });
  // Trailing open shift (no following day to merge into) — close as-is
  if (open) out.push(open);
  return out;
}
