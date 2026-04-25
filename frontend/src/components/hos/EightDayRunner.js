import { useMemo, useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, Target, AlertTriangle, Hand, Repeat, List, Calculator, Shield, ShieldOff } from "lucide-react";
import { Button } from "../ui/button";
import { EldGrid } from "./EldGrid";
import { CfrText } from "../../lib/cfrLinks";

/**
 * EightDayRunner — 8-day inspection-period drill.
 *
 * Per scenario, the user steps through every day:
 *   1. Identify the day's shift bounds (drag handles, or skip if it's an off-duty day)
 *   2. Identify the day's violation (none / 11 / 14 / 8-hr break / multiple)
 *
 * After all 8 days are answered:
 *   3. 70-hr cycle check using a built-in mini calculator (does NOT touch the
 *      real /hours-of-service tool — pure local state, prefilled from each day's
 *      onDutyHours).
 *   4. Final OOS decision (place driver out of service, or release).
 *
 * Past-day cards collapse to a one-line summary as the user advances, so the
 * page stays scannable during a long scenario.
 */
export function EightDayRunner({ scenarios, category = "eightday", initialIdx = 0 }) {
  const [idx, setIdx] = useState(initialIdx);
  const [showPicker, setShowPicker] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  // Per-day: { [d]: { shift?: {start, end}, violation?: string } }
  const [dayAnswers, setDayAnswers] = useState({});
  const [dayPhase, setDayPhase] = useState("shift");   // 'shift' | 'violation'
  // For drag handles
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  // Final phases
  const [phase, setPhase] = useState("days");          // 'days' | 'cycle' | 'oos' | 'done'
  const [cycleAnswer, setCycleAnswer] = useState(undefined);    // boolean
  const [oosAnswer, setOosAnswer] = useState(undefined);        // boolean

  const scenario = scenarios[idx];
  const days = scenario.days;
  const day = days[dayIdx];
  const totalDays = days.length;

  const resetAll = (toIdx = idx) => {
    setIdx(toIdx);
    setDayIdx(0);
    setDayAnswers({});
    setDayPhase("shift");
    setTStart(""); setTEnd("");
    setPhase("days");
    setCycleAnswer(undefined);
    setOosAnswer(undefined);
  };
  const nextScenario = () => resetAll((idx + 1) % scenarios.length);
  const restartScenario = () => resetAll(idx);
  const pickScenario = (n) => { resetAll(n); setShowPicker(false); };

  // Skip off-duty days automatically — auto-record empty answer and advance.
  const advanceDay = () => {
    if (dayIdx + 1 < totalDays) {
      setDayIdx(dayIdx + 1);
      setDayPhase("shift");
      setTStart(""); setTEnd("");
    } else {
      setPhase("cycle");
    }
  };

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex-1 min-w-[120px]">
          Scenario {idx + 1} of {scenarios.length}
          {phase === "days" && <span className="ml-1.5 text-[#002855] normal-case tracking-normal">· Day {dayIdx + 1} of {totalDays}</span>}
          {phase === "cycle" && <span className="ml-1.5 text-[#002855] normal-case tracking-normal">· Cycle check</span>}
          {phase === "oos" && <span className="ml-1.5 text-[#002855] normal-case tracking-normal">· OOS decision</span>}
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
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#1D4ED8]">Before you start — workflow</p>
          </div>
          <p className="text-[12px] text-[#1E3A8A] leading-relaxed">{scenario.primer}</p>
          <ol className="mt-2 ml-3.5 list-decimal text-[11.5px] text-[#1E3A8A] leading-relaxed space-y-0.5">
            <li>For each day, identify shift START and END.</li>
            <li>For each day, identify any 11- / 14- / 8-hr break violation.</li>
            <li>Run the 70-hr cycle calc on the totals.</li>
            <li>Make the OOS call.</li>
          </ol>
        </div>
      )}

      {/* Day BEFORE — readonly context shown above the first day. Helps the
       * inspector see overnight rest patterns leading into Day −7. */}
      {scenario.priorDayLog && (
        <ContextDayStrip
          label="Day before Day −7"
          log={scenario.priorDayLog}
          note={scenario.priorDayNote}
          testid="prior-day-strip"
        />
      )}

      {/* Day stepper — visual progress across all 8 days */}
      <DayStepper days={days} answers={dayAnswers} activeIdx={phase === "days" ? dayIdx : -1} done={phase !== "days"} />

      {/* Completed days — stay visible as readonly summary cards so the
       * inspector can keep cross-day context (e.g. an SB block at the end of
       * yesterday that pairs with this morning's rest as a split-sleeper
       * Period A/B). Always visible whether we're on phase=days or beyond. */}
      {Array.from({ length: phase === "days" ? dayIdx : days.length }).map((_, i) => (
        <CompletedDayCard
          key={`completed-${i}`}
          day={days[i]}
          dayIdx={i}
          totalDays={totalDays}
          answer={dayAnswers[i]}
        />
      ))}

      {/* Active day card */}
      {phase === "days" && (
        <DayCard
          day={day}
          dayIdx={dayIdx}
          totalDays={totalDays}
          phase={dayPhase}
          answer={dayAnswers[dayIdx]}
          tStart={tStart} setTStart={setTStart}
          tEnd={tEnd} setTEnd={setTEnd}
          onSubmitShift={(v) => {
            setDayAnswers((a) => ({ ...a, [dayIdx]: { ...(a[dayIdx] || {}), shift: v } }));
          }}
          onShiftNext={() => setDayPhase("violation")}
          onSubmitViolation={(v) => {
            setDayAnswers((a) => ({ ...a, [dayIdx]: { ...(a[dayIdx] || {}), violation: v } }));
          }}
          onViolationNext={advanceDay}
          onOffDayConfirm={() => {
            // Off-duty day: record empty shift + 'none' violation, advance
            setDayAnswers((a) => ({ ...a, [dayIdx]: { shift: { start: 0, end: 0, off: true }, violation: "none" } }));
            advanceDay();
          }}
        />
      )}

      {phase === "cycle" && (
        <>
          {/* Day AFTER — readonly context, now relevant since all 8 days are
           * complete and the inspector is checking cycle compliance. */}
          {scenario.nextDayLog && (
            <ContextDayStrip
              label="Day after Day 0"
              log={scenario.nextDayLog}
              note={scenario.nextDayNote}
              testid="next-day-strip"
            />
          )}
          <CycleStep scenario={scenario} dayAnswers={dayAnswers} answer={cycleAnswer}
            onAnswer={(v) => setCycleAnswer(v)}
            onNext={() => setPhase("oos")}
          />
        </>
      )}

      {phase === "oos" && (
        <OosStep scenario={scenario} answer={oosAnswer}
          onAnswer={(v) => setOosAnswer(v)}
          onNext={() => setPhase("done")}
        />
      )}

      {phase === "done" && (
        <section className="rounded-xl border-2 border-[#D4AF37]/40 bg-[#FFFBEB] p-4 space-y-2" data-testid="eightday-done">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
            <p className="text-sm font-bold text-[#002855]">Inspection complete</p>
          </div>
          <p className="text-[12px] text-[#334155] leading-relaxed">Review each day's explanation and the cycle/OOS reasoning above, then try the next scenario.</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={restartScenario} className="border-[#E2E8F0]" data-testid="eightday-retry">
              <Repeat className="w-3.5 h-3.5 mr-1" /> Retry this one
            </Button>
            <Button onClick={nextScenario} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="eightday-next-done">
              Next scenario <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Completed day card (readonly summary) ─── */
/** Renders a previously-answered day in collapsed readonly form so the
 *  inspector keeps cross-day context as they advance through the 8 days.
 *  Shows the grid with shift markers plus a one-line outcome summary. */
function CompletedDayCard({ day, dayIdx, totalDays, answer }) {
  const isOffDay = day.offDay === true;
  const violationCorrect = (
    day.violation11 && day.violation14 ? "multi" :
    day.violation11 && day.violation8 ? "multi" :
    day.violation14 && day.violation8 ? "multi" :
    day.violation11 ? "11" :
    day.violation14 ? "14" :
    day.violation8 ? "8" : "none"
  );
  const userViolation = answer?.violation;
  const userRightV = userViolation === violationCorrect;

  const markers = [];
  if (!isOffDay) {
    markers.push({ min: day.shiftStartMin, kind: "start", label: `START · ${minToTimeStr(day.shiftStartMin)}` });
    markers.push({ min: day.shiftEndMin, kind: "end", label: `END · ${minToTimeStr(day.shiftEndMin)}`, labelRow: 1 });
  }

  const violationLabel = (
    violationCorrect === "none" ? "Clean" :
    violationCorrect === "11" ? "11-hr drive violation" :
    violationCorrect === "14" ? "14-hr shift violation" :
    violationCorrect === "8" ? "8-hr break violation" : "Multiple violations"
  );

  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden opacity-95" data-testid={`completed-day-${dayIdx}`}>
      <div className="bg-[#475569] text-white px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">Day {dayIdx + 1} of {totalDays} · completed</span>
        <p className="text-[12px] font-bold">{day.label} · {day.dayName}</p>
        {day.hasSplitSleeper && (
          <span className="text-[9.5px] font-bold text-[#FBBF24] bg-[#7C2D12] px-1.5 py-0.5 rounded uppercase tracking-wider">Split sleeper</span>
        )}
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
          userRightV ? "bg-[#10B981]/30 text-[#A7F3D0]" : "bg-[#F59E0B]/30 text-[#FCD34D]"
        }`}>
          {userRightV ? "✓" : "!"} {violationLabel}
        </span>
      </div>
      <div className="p-2">
        <EldGrid entries={day.log} shiftMarkers={markers} />
        {day.splitNote && (
          <div className="mt-1.5 rounded-md border-l-[3px] border-[#7C2D12] bg-[#FEF3C7] px-2 py-1">
            <p className="text-[10.5px] text-[#7C2D12] leading-snug">
              <span className="font-bold uppercase tracking-wider text-[8.5px] mr-1">SB note</span>{day.splitNote}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Day stepper ─── */

/** Readonly context strip — renders the prior- or next-day log so the
 *  inspector can see overnight rest patterns adjacent to the inspection
 *  window. No interaction. */
function ContextDayStrip({ label, log, note, testid }) {
  return (
    <section className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] overflow-hidden opacity-90" data-testid={testid}>
      <div className="bg-[#E2E8F0]/60 px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Context · readonly</span>
        <p className="text-[12px] font-bold text-[#475569]">{label}</p>
      </div>
      <div className="p-2">
        <EldGrid entries={log} />
        {note && (
          <p className="text-[11px] text-[#64748B] leading-relaxed mt-1.5 px-1 italic">{note}</p>
        )}
      </div>
    </section>
  );
}

function DayStepper({ days, answers, activeIdx, done }) {
  return (
    <div className="grid grid-cols-8 gap-1" data-testid="day-stepper">
      {days.map((d, i) => {
        const ans = answers[i];
        const completed = !!(ans && (ans.violation !== undefined || ans.shift?.off));
        const isActive = i === activeIdx;
        const v = ans?.violation;
        const correctV = (
          d.violation11 && d.violation14 ? "multi" :
          d.violation11 && d.violation8 ? "multi" :
          d.violation14 && d.violation8 ? "multi" :
          d.violation11 ? "11" :
          d.violation14 ? "14" :
          d.violation8 ? "8" : "none"
        );
        const wasRight = ans && v === correctV;
        return (
          <div key={i}
            className={`rounded-md text-center p-1.5 border-2 ${
              isActive ? "border-[#D4AF37] bg-[#FFFBEB]" :
              completed ? (wasRight ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]") :
              done ? "border-[#E2E8F0] bg-white opacity-50" : "border-[#E2E8F0] bg-white"
            }`}
            data-testid={`stepper-day-${i}`}
          >
            <p className="text-[8.5px] font-bold uppercase tracking-wider text-[#64748B] leading-tight">{d.label}</p>
            <p className="text-[9px] text-[#94A3B8] leading-tight">{d.dayName}</p>
            {completed && (
              <p className="text-[10px] font-bold leading-tight mt-0.5">
                {wasRight ? <span className="text-[#10B981]">✓</span> : <span className="text-[#F59E0B]">!</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Day card ─── */
function DayCard({ day, dayIdx, totalDays, phase, answer, tStart, setTStart, tEnd, setTEnd, onSubmitShift, onShiftNext, onSubmitViolation, onViolationNext, onOffDayConfirm }) {
  const isOffDay = day.offDay === true;
  const violationCorrect = (
    day.violation11 && day.violation14 ? "multi" :
    day.violation11 && day.violation8 ? "multi" :
    day.violation14 && day.violation8 ? "multi" :
    day.violation11 ? "11" :
    day.violation14 ? "14" :
    day.violation8 ? "8" : "none"
  );

  const day1ShiftActive = phase === "shift" && answer?.shift === undefined;
  const markers = useMemo(() => {
    const m = [];
    if (answer?.shift && !answer.shift.off) {
      m.push({ min: day.shiftStartMin, kind: "start", label: `Shift START · ${minToTimeStr(day.shiftStartMin)}` });
      m.push({ min: day.shiftEndMin, kind: "end", label: `Shift END · ${minToTimeStr(day.shiftEndMin)}`, labelRow: 1 });
      if (day.regulatoryEndMin !== undefined && day.regulatoryEndMin !== day.shiftEndMin) {
        m.push({ min: day.regulatoryEndMin, kind: "end", color: "#D4AF37", label: `SHOULD have ended · ${minToTimeStr(day.regulatoryEndMin)}`, labelRow: 2 });
      }
    }
    if (day1ShiftActive && !isOffDay) {
      m.push({ min: timeStrToMin(tStart || "08:00") ?? 480, kind: "start", markerId: "shiftStart", draggable: true, label: `Drag → START · ${tStart || "08:00"}` });
      m.push({ min: timeStrToMin(tEnd || "18:00") ?? 1080, kind: "end", markerId: "shiftEnd", draggable: true, label: `Drag → END · ${tEnd || "18:00"}`, labelRow: 1 });
    }
    return m;
  }, [day, answer, day1ShiftActive, tStart, tEnd, isOffDay]);

  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden space-y-0" data-testid={`day-card-${dayIdx}`}>
      <div className="bg-[#002855] text-white px-3 py-2 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Day {dayIdx + 1} of {totalDays}</span>
        <p className="text-[12.5px] font-bold">{day.label} · {day.dayName}</p>
        {day1ShiftActive && !isOffDay && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-[#D4AF37]">
            <Hand className="w-3 h-3" /> drag the handles
          </span>
        )}
      </div>
      <div className="p-2">
        <EldGrid
          entries={day.log}
          shiftMarkers={markers}
          onMarkerDrag={day1ShiftActive && !isOffDay ? (kind, markerId, newMin) => {
            const hhmm = minToTimeStr(newMin);
            if (markerId === "shiftStart") setTStart(hhmm);
            else if (markerId === "shiftEnd") setTEnd(hhmm);
          } : null}
        />
        {/* splitNote intentionally hidden on the ACTIVE day card — revealing
            it would tip the inspector that this day uses a split-sleeper
            provision. The note appears in the explanation feedback after the
            user answers, and on the completed-day card afterwards. */}
      </div>

      {/* Off-duty day: skip both questions with a single confirmation */}
      {isOffDay && (
        <div className="p-3 border-t border-[#E2E8F0] space-y-2">
          <p className="text-[12px] text-[#475569] leading-snug italic">This is an off-duty day — there's no work shift to identify and no possible 11/14/8-hr violation.</p>
          <Button onClick={onOffDayConfirm} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`day-${dayIdx}-skip`}>
            Confirm off-duty · advance to next day <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Shift question */}
      {!isOffDay && phase === "shift" && (
        <DayShiftQ
          day={day} tStart={tStart} setTStart={setTStart} tEnd={tEnd} setTEnd={setTEnd}
          answered={answer?.shift !== undefined}
          answer={answer?.shift}
          onSubmit={onSubmitShift}
          onNext={onShiftNext}
          dayIdx={dayIdx}
        />
      )}

      {/* Violation question */}
      {!isOffDay && phase === "violation" && (
        <DayViolationQ
          day={day}
          correctValue={violationCorrect}
          answered={answer?.violation !== undefined}
          answer={answer?.violation}
          onPick={onSubmitViolation}
          onNext={onViolationNext}
          dayIdx={dayIdx}
          isLast={dayIdx === totalDays - 1}
        />
      )}
    </section>
  );
}

function DayShiftQ({ day, tStart, setTStart, tEnd, setTEnd, answered, answer, onSubmit, onNext, dayIdx }) {
  const submit = () => {
    const sMin = timeStrToMin(tStart);
    const eMin = timeStrToMin(tEnd);
    if (sMin === null || eMin === null) return;
    onSubmit({ start: sMin, end: eMin });
  };
  let correct = false;
  if (answered) {
    correct = Math.abs(answer.start - day.shiftStartMin) <= 10 && Math.abs(answer.end - day.shiftEndMin) <= 10;
  }
  return (
    <div className="p-4 border-t border-[#E2E8F0] space-y-3" data-testid={`day-${dayIdx}-shift`}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">When did this day's work shift START and END?</p>
      </div>
      {!answered && (
        <>
          <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">Drag the green / red handles, or type HH:MM (24-hr) below.</p>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <label className="text-[11px] font-bold text-[#475569] w-28">Shift START:</label>
              <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#10B981] focus:border-[#002855] focus:outline-none"
                data-testid={`day-${dayIdx}-shift-start`} />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-[11px] font-bold text-[#475569] w-28">Shift END:</label>
              <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-[#CBD5E1] rounded-md font-mono text-sm font-bold text-[#DC2626] focus:border-[#002855] focus:outline-none"
                data-testid={`day-${dayIdx}-shift-end`} />
            </div>
            <Button onClick={submit} disabled={!tStart || !tEnd} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`day-${dayIdx}-shift-submit`}>Submit</Button>
          </div>
        </>
      )}
      {answered && (
        <>
          <div className="space-y-1 text-[12px] font-mono">
            <div className="flex justify-between"><span>START:</span><span className="font-bold">Your: {minToTimeStr(answer.start)} · Correct: {minToTimeStr(day.shiftStartMin)}</span></div>
            <div className="flex justify-between"><span>END:</span><span className="font-bold">Your: {minToTimeStr(answer.end)} · Correct: {minToTimeStr(day.shiftEndMin)}</span></div>
          </div>
          <div className={`rounded-md p-2.5 border ${correct ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`}>
            <div className="flex items-center gap-2 mb-1">
              {correct ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
              <p className="text-[12px] font-bold text-[#334155]">{correct ? "Correct" : "Not quite"}</p>
            </div>
            <p className="text-[11.5px] text-[#334155] leading-relaxed"><CfrText text={day.explanation.shift} /></p>
          </div>
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`day-${dayIdx}-shift-next`}>
            Next: violation check <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

function DayViolationQ({ day, correctValue, answered, answer, onPick, onNext, dayIdx, isLast }) {
  const choices = [
    { value: "none", label: "No violation" },
    { value: "11",   label: "11-hr drive" },
    { value: "14",   label: "14-hr shift" },
    { value: "8",    label: "8-hr break" },
    { value: "multi",label: "Multiple" },
  ];
  return (
    <div className="p-4 border-t border-[#E2E8F0] space-y-3" data-testid={`day-${dayIdx}-violation`}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">Any 11-/14-/8-hr break violation on this day?</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {choices.map((c) => {
          const picked = answered && answer === c.value;
          const right = answered && c.value === correctValue;
          const wrong = picked && !right;
          return (
            <button key={c.value} onClick={() => !answered && onPick(c.value)} disabled={answered}
              className={`rounded-lg border-2 py-2 text-[11px] font-bold transition-colors ${
                right ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                wrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]" :
                picked ? "border-[#002855] bg-[#002855]/5 text-[#002855]" :
                answered ? "border-[#E2E8F0] opacity-40" : "border-[#CBD5E1] hover:border-[#002855]"
              }`}
              data-testid={`day-${dayIdx}-violation-${c.value}`}>
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
            <p className="text-[11.5px] text-[#334155] leading-relaxed"><CfrText text={day.explanation.violation} /></p>
          </div>
          {/* Split-sleeper note revealed AFTER answering — would have given
              away the analysis if shown beforehand. */}
          {day.splitNote && (
            <div className="rounded-md border-l-[3px] border-[#7C2D12] bg-[#FEF3C7] px-2.5 py-1.5">
              <p className="text-[11px] text-[#7C2D12] leading-snug whitespace-pre-line">
                <span className="font-bold uppercase tracking-wider text-[9.5px] mr-1">Split-sleeper analysis</span>{day.splitNote}
              </p>
            </div>
          )}
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`day-${dayIdx}-violation-next`}>
            {isLast ? "Continue: 70-hr cycle check" : `Next day → Day ${dayIdx + 2}`} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

/* ─── Cycle step ─── */
function CycleStep({ scenario, dayAnswers, answer, onAnswer, onNext }) {
  const limit = scenario.cycleLimit || 70;
  const days = scenario.days;
  // Pre-fill the calc with the scenario's known onDutyHours per day, but allow editing.
  const [overrides, setOverrides] = useState(() => days.map((d) => String(d.onDutyHours ?? 0)));
  const [revealed, setRevealed] = useState(false);

  const total = useMemo(() => overrides.reduce((s, v) => {
    const n = parseFloat(v);
    return s + (isNaN(n) ? 0 : n);
  }, 0), [overrides]);
  const verdict = total > limit ? "over" : total === limit ? "atLimit" : "under";

  const correctViolation = scenario.cycleViolation;

  return (
    <section className="space-y-3" data-testid="cycle-step">
      <div className="bg-white rounded-xl border-2 border-[#D4AF37]/40 overflow-hidden">
        <div className="bg-[#FFFBEB] border-b border-[#D4AF37]/30 px-3 py-2 flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5 text-[#D4AF37]" />
          <p className="text-[12px] font-bold text-[#002855]">Mini {limit}-hr cycle calculator <span className="text-[9.5px] font-normal text-[#94A3B8]">(training only)</span></p>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-[10.5px] text-[#64748B] leading-snug">Each day's on-duty total is prefilled from the logs. Edit if needed (e.g., a 34-hr restart day might be zeroed out for cycle-counting). Total compares against the {limit}-hr cap.</p>
          <div className="grid grid-cols-8 gap-1">
            {days.map((d, i) => (
              <div key={i} className="text-center">
                <label className="block text-[8.5px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">{d.label}</label>
                <input type="number" inputMode="decimal" step="0.25" min="0" value={overrides[i]}
                  onChange={(e) => setOverrides((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                  className="w-full px-1 py-1 text-[12px] font-mono font-bold text-center text-[#002855] border border-[#E2E8F0] rounded outline-none focus:border-[#D4AF37]"
                  data-testid={`cycle-day-${i}`} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2E8F0]">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">8-day total</p>
              <p className="text-[18px] font-mono font-black text-[#002855]" data-testid="cycle-total">{total.toFixed(2).replace(/\.?0+$/, "")} h</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">vs {limit}-hr cap</p>
              <p className={`text-[18px] font-mono font-black ${
                verdict === "over" ? "text-[#DC2626]" : verdict === "atLimit" ? "text-[#D4AF37]" : "text-[#10B981]"
              }`} data-testid="cycle-verdict">
                {verdict === "over" ? `+${(total - limit).toFixed(2).replace(/\.?0+$/, "")} OVER` : verdict === "atLimit" ? "AT LIMIT" : `${(limit - total).toFixed(2).replace(/\.?0+$/, "")} avail`}
              </p>
            </div>
          </div>
          {scenario.cycleNote && (
            <button onClick={() => setRevealed((v) => !v)} className="w-full text-[11px] font-bold text-[#002855] hover:text-[#D4AF37] py-1.5 rounded border border-dashed border-[#CBD5E1] hover:border-[#D4AF37]" data-testid="cycle-reveal">
              {revealed ? "Hide answer" : "Reveal cycle answer"}
            </button>
          )}
          {revealed && (
            <div className={`rounded-md p-2 text-[11.5px] leading-relaxed ${correctViolation ? "bg-[#FEE2E2] text-[#991B1B] border border-[#DC2626]/40" : "bg-[#F0FDF4] text-[#065F46] border border-[#10B981]/40"}`}>
              <p className="font-bold mb-0.5">{correctViolation ? `70-hr CYCLE VIOLATION` : `Cycle compliant`}</p>
              <p>{scenario.cycleNote}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid="cycle-question">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
          <p className="text-[13px] font-bold text-[#002855] leading-snug">Did the driver violate the 70-hr cycle?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: "No cycle violation" },
            { value: true,  label: "Yes — cycle exceeded" },
          ].map((c) => {
            const picked = answer === c.value;
            const right = answer !== undefined && c.value === correctViolation;
            const wrong = picked && !right;
            return (
              <button key={String(c.value)} onClick={() => answer === undefined && onAnswer(c.value)} disabled={answer !== undefined}
                className={`rounded-lg border-2 py-2 text-[12px] font-bold transition-colors ${
                  right ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                  wrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]" :
                  picked ? "border-[#002855] bg-[#002855]/5 text-[#002855]" :
                  answer !== undefined ? "border-[#E2E8F0] opacity-40" : "border-[#CBD5E1] hover:border-[#002855]"
                }`}
                data-testid={`cycle-pick-${c.value ? "yes" : "no"}`}>
                {c.label}
              </button>
            );
          })}
        </div>
        {answer !== undefined && (
          <>
            <div className={`rounded-md p-2.5 border ${answer === correctViolation ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="cycle-feedback">
              <div className="flex items-center gap-2 mb-1">
                {answer === correctViolation ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
                <p className="text-[12px] font-bold text-[#334155]">{answer === correctViolation ? "Correct" : `Correct: ${correctViolation ? "Yes — cycle exceeded" : "No cycle violation"}`}</p>
              </div>
              {scenario.cycleNote && (
                <p className="text-[11.5px] text-[#334155] leading-relaxed">{scenario.cycleNote}</p>
              )}
            </div>
            <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="cycle-next">
              Continue: OOS decision <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

/* ─── OOS step ─── */
function OosStep({ scenario, answer, onAnswer, onNext }) {
  const correct = scenario.oosRequired;
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid="oos-step">
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">Final call — place the driver out of service?</p>
      </div>
      <p className="text-[11.5px] text-[#64748B] leading-relaxed">
        Per §395.13, a driver who has driven beyond their daily or cycle limits must be placed OOS until they secure the rest needed to bring them back into compliance. Pick based on the totality of the violations you found.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: false, label: "Release driver", icon: Shield },
          { value: true,  label: "Place OOS", icon: ShieldOff },
        ].map((c) => {
          const Icon = c.icon;
          const picked = answer === c.value;
          const right = answer !== undefined && c.value === correct;
          const wrong = picked && !right;
          return (
            <button key={String(c.value)} onClick={() => answer === undefined && onAnswer(c.value)} disabled={answer !== undefined}
              className={`rounded-lg border-2 py-3 text-[12px] font-bold transition-colors flex flex-col items-center gap-1 ${
                right ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                wrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]" :
                picked ? "border-[#002855] bg-[#002855]/5 text-[#002855]" :
                answer !== undefined ? "border-[#E2E8F0] opacity-40" : "border-[#CBD5E1] hover:border-[#002855]"
              }`}
              data-testid={`oos-pick-${c.value ? "yes" : "no"}`}>
              <Icon className="w-5 h-5" />
              {c.label}
            </button>
          );
        })}
      </div>
      {answer !== undefined && (
        <>
          <div className={`rounded-md p-2.5 border ${answer === correct ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`}>
            <div className="flex items-center gap-2 mb-1">
              {answer === correct ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-[12px] font-bold text-[#334155]">{answer === correct ? "Correct" : `Correct: ${correct ? "Place OOS" : "Release driver"}`}</p>
            </div>
            <p className="text-[11.5px] text-[#334155] leading-relaxed"><CfrText text={scenario.oosReason} /></p>
          </div>
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="oos-next">
            Finish inspection <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
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
