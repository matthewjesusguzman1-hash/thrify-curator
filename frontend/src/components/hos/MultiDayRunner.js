import { useMemo, useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, Target, AlertTriangle, Hand, Repeat, List } from "lucide-react";
import { Button } from "../ui/button";
import { EldGrid } from "./EldGrid";
import { CfrText } from "../../lib/cfrLinks";

/**
 * MultiDayRunner — drives the 2-day practice flow for 11/14 violations.
 *
 * Scenario shape: { id, primer, days: [{ label, log, shiftStartMin,
 * shiftEndMin, continuesFromPrev?, continuesToNext?, regulatoryEndMin?,
 * violation11, violation14, explanation: { shift, violation } }, ...] }
 *
 * Flow (per scenario):
 *   1. Day 1 shift — drag green/red handles on Day 1 grid to mark shift
 *      START and END. For an overnight shift, drag END to 24:00 (right edge).
 *   2. Day 1 violation — multi-choice (none | 11 | 14 | both).
 *   3. Day 2 shift — drag handles on Day 2 grid. For overnight continuation,
 *      drag START to 00:00 (left edge).
 *   4. Day 2 violation — multi-choice.
 *   5. Done — full per-day explanations.
 *
 * A "Restart" button resets the active scenario; "Pick scenario" opens an
 * inline list for jumping to any scenario.
 */
export function MultiDayRunner({ scenarios, category = "multiday", initialIdx = 0 }) {
  const [idx, setIdx] = useState(initialIdx);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [t1Start, setT1Start] = useState("");
  const [t1End, setT1End] = useState("");
  const [t2Start, setT2Start] = useState("");
  const [t2End, setT2End] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const scenario = scenarios[idx];
  const questionKeys = ["day1Shift", "day1Violation", "day2Shift", "day2Violation"];
  const currentQKey = questionIdx < questionKeys.length ? questionKeys[questionIdx] : null;
  const done = questionIdx >= questionKeys.length;

  const resetAll = (toIdx = idx) => {
    setIdx(toIdx);
    setQuestionIdx(0);
    setAnswers({});
    setT1Start(""); setT1End(""); setT2Start(""); setT2End("");
  };
  const nextScenario = () => resetAll((idx + 1) % scenarios.length);
  const restartScenario = () => resetAll(idx);
  const pickScenario = (newIdx) => { resetAll(newIdx); setShowPicker(false); };

  const day1 = scenario.days[0];
  const day2 = scenario.days[1];

  // Drag targets for each day's shift question
  const day1ShiftActive = currentQKey === "day1Shift" && answers.day1Shift === undefined;
  const day2ShiftActive = currentQKey === "day2Shift" && answers.day2Shift === undefined;

  const day1Markers = useMemo(() => buildMarkers({
    day: day1,
    committedAnswer: answers.day1Shift,
    active: day1ShiftActive,
    tStart: t1Start,
    tEnd: t1End,
    startId: "day1Start",
    endId: "day1End",
  }), [day1, answers.day1Shift, day1ShiftActive, t1Start, t1End]);

  const day2Markers = useMemo(() => buildMarkers({
    day: day2,
    committedAnswer: answers.day2Shift,
    active: day2ShiftActive,
    tStart: t2Start,
    tEnd: t2End,
    startId: "day2Start",
    endId: "day2End",
  }), [day2, answers.day2Shift, day2ShiftActive, t2Start, t2End]);

  return (
    <div className="space-y-3">
      {/* Top bar */}
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

      {showPicker && (
        <div className="bg-white rounded-xl border border-[#D4AF37]/40 p-2 max-h-[40vh] overflow-y-auto space-y-1" data-testid={`${category}-scenario-picker`}>
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
              <span className="font-bold text-[#002855]">{s.title || s.id || `Scenario ${i + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pre-scenario primer — explains WHAT is being tested before the user dives in. */}
      {scenario.primer && (
        <div className="rounded-xl border-l-[3px] border-[#3B82F6] bg-[#EEF6FF] p-3" data-testid="scenario-primer">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#1D4ED8]">Before you start</p>
          </div>
          <p className="text-[12px] text-[#1E3A8A] leading-relaxed">{scenario.primer}</p>
        </div>
      )}

      {/* Day 1 grid */}
      <DaySection
        label={day1.label}
        log={day1.log}
        markers={day1Markers}
        active={day1ShiftActive}
        onMarkerDrag={day1ShiftActive ? (kind, markerId, newMin) => {
          const hhmm = minToTimeStr(newMin);
          if (markerId === "day1Start") setT1Start(hhmm);
          else if (markerId === "day1End") setT1End(hhmm);
        } : null}
      />

      {/* Day 1 shift question card */}
      {currentQKey === "day1Shift" && (
        <ShiftCard
          day={day1}
          tStart={t1Start} setTStart={setT1Start}
          tEnd={t1End} setTEnd={setT1End}
          answered={answers.day1Shift !== undefined}
          answer={answers.day1Shift}
          onSubmit={(v) => setAnswers((a) => ({ ...a, day1Shift: v }))}
          onNext={() => setQuestionIdx((q) => q + 1)}
          testid="q-day1-shift"
        />
      )}

      {/* Day 1 violation question card */}
      {questionIdx >= 1 && (
        <ViolationCard
          day={day1}
          answered={answers.day1Violation !== undefined}
          answer={answers.day1Violation}
          onPick={(v) => setAnswers((a) => ({ ...a, day1Violation: v }))}
          onNext={() => setQuestionIdx((q) => q + 1)}
          testid="q-day1-violation"
        />
      )}

      {/* Day 2 grid (only after Day 1 violation answered) */}
      {questionIdx >= 2 && (
        <DaySection
          label={day2.label}
          log={day2.log}
          markers={day2Markers}
          active={day2ShiftActive}
          onMarkerDrag={day2ShiftActive ? (kind, markerId, newMin) => {
            const hhmm = minToTimeStr(newMin);
            if (markerId === "day2Start") setT2Start(hhmm);
            else if (markerId === "day2End") setT2End(hhmm);
          } : null}
        />
      )}

      {/* Day 2 shift question card */}
      {currentQKey === "day2Shift" && (
        <ShiftCard
          day={day2}
          tStart={t2Start} setTStart={setT2Start}
          tEnd={t2End} setTEnd={setT2End}
          answered={answers.day2Shift !== undefined}
          answer={answers.day2Shift}
          onSubmit={(v) => setAnswers((a) => ({ ...a, day2Shift: v }))}
          onNext={() => setQuestionIdx((q) => q + 1)}
          testid="q-day2-shift"
        />
      )}

      {questionIdx >= 3 && (
        <ViolationCard
          day={day2}
          answered={answers.day2Violation !== undefined}
          answer={answers.day2Violation}
          onPick={(v) => setAnswers((a) => ({ ...a, day2Violation: v }))}
          onNext={() => setQuestionIdx((q) => q + 1)}
          testid="q-day2-violation"
        />
      )}

      {done && (
        <section className="rounded-xl border-2 border-[#D4AF37]/40 bg-[#FFFBEB] p-4 space-y-2" data-testid="multi-done">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
            <p className="text-sm font-bold text-[#002855]">Scenario complete</p>
          </div>
          <p className="text-[12px] text-[#334155] leading-relaxed">Review each day's explanations above, then try the next scenario.</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={restartScenario} className="border-[#E2E8F0]" data-testid="multi-retry">
              <Repeat className="w-3.5 h-3.5 mr-1" /> Retry this one
            </Button>
            <Button onClick={nextScenario} className="flex-1 bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="multi-next-done">
              Next scenario <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function DaySection({ label, log, markers, active, onMarkerDrag }) {
  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`day-section-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="bg-[#002855] text-white px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Log</span>
        <p className="text-[12.5px] font-bold">{label}</p>
        {active && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-[#D4AF37]">
            <Hand className="w-3 h-3" /> drag the handles
          </span>
        )}
      </div>
      <div className="p-2">
        <EldGrid
          entries={log}
          shiftMarkers={markers}
          onMarkerDrag={onMarkerDrag}
        />
      </div>
    </section>
  );
}

function ShiftCard({ day, tStart, setTStart, tEnd, setTEnd, answered, answer, onSubmit, onNext, testid }) {
  const submit = () => {
    const sMin = timeStrToMin(tStart);
    const eMin = timeStrToMin(tEnd);
    if (sMin === null || eMin === null) return;
    onSubmit({ start: sMin, end: eMin });
  };

  let correct = false;
  if (answered) {
    const normEnd = answer.end === 0 && day.shiftEndMin === 24 * 60 ? 24 * 60 : answer.end;
    correct =
      Math.abs(answer.start - day.shiftStartMin) <= 10 &&
      Math.abs(normEnd - day.shiftEndMin) <= 10;
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">
          When did {day.label}'s work shift START and END?
        </p>
      </div>
      {!answered && (
        <>
          <p className="text-[11px] text-[#64748B] italic leading-relaxed px-1">
            {day.continuesFromPrev
              ? "This shift started on the previous day. Drag START to 00:00 (left edge) to indicate it continued from yesterday, and drag END to where the driver finally stopped today. (Or type 00:00 in the START field.)"
              : day.continuesToNext
              ? "This shift continued past midnight. Drag START to where the driver began, and drag END to 24:00 (right edge) to indicate the shift continued into tomorrow. (Or type 00:00 in the END field — it will be accepted as 24:00 / end-of-day.)"
              : "Drag the green START and red END handles on the grid above (snaps to 15-min). Or type HH:MM (24-hr) below."}
          </p>
          <div className="space-y-2">
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
            <Button onClick={submit} disabled={!tStart || !tEnd} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-submit`}>
              Submit
            </Button>
          </div>
        </>
      )}
      {answered && (
        <>
          <div className="space-y-1 text-[12px] font-mono">
            <div className="flex justify-between"><span>Shift START:</span><span className="font-bold">Your: {minToTimeStr(answer.start)} &nbsp;·&nbsp; Correct: {minToTimeStr(day.shiftStartMin)}</span></div>
            <div className="flex justify-between"><span>Shift END:</span><span className="font-bold">Your: {minToTimeStr(answer.end)} &nbsp;·&nbsp; Correct: {minToTimeStr(day.shiftEndMin)}</span></div>
          </div>
          <div className={`rounded-lg p-3 border ${correct ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid={`${testid}-feedback`}>
            <div className="flex items-center gap-2 mb-1">
              {correct ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
              <p className="text-[12px] font-bold text-[#334155]">{correct ? "Correct" : "Not quite — here's why"}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed"><CfrText text={day.explanation.shift} /></p>
          </div>
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-next`}>
            Next question <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

function ViolationCard({ day, answered, answer, onPick, onNext, testid }) {
  const choices = [
    { value: "none", label: "No violation" },
    { value: "11",   label: "11-hr driving" },
    { value: "14",   label: "14-hr work shift" },
    { value: "both", label: "Both" },
  ];
  const correctValue =
    day.violation11 && day.violation14 ? "both" :
    day.violation11 ? "11" :
    day.violation14 ? "14" : "none";

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3" data-testid={testid}>
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-[#002855] mt-0.5 flex-shrink-0" />
        <p className="text-[13px] font-bold text-[#002855] leading-snug">
          Does {day.label}'s shift have an 11- or 14-hour violation?
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c) => {
          const picked = answered && answer === c.value;
          const right = answered && c.value === correctValue;
          const wrong = picked && !right;
          return (
            <button
              key={c.value}
              onClick={() => !answered && onPick(c.value)}
              disabled={answered}
              className={`rounded-lg border-2 py-2 text-[12px] font-bold transition-colors ${
                right ? "border-[#10B981] bg-[#DCFCE7] text-[#065F46]" :
                wrong ? "border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]" :
                picked ? "border-[#002855] bg-[#002855]/5 text-[#002855]" :
                answered ? "border-[#E2E8F0] opacity-40" : "border-[#CBD5E1] hover:border-[#002855]"
              }`}
              data-testid={`${testid}-${c.value}`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {answered && (
        <>
          <div className={`rounded-lg p-3 border ${answer === correctValue ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid={`${testid}-feedback`}>
            <div className="flex items-center gap-2 mb-1">
              {answer === correctValue ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#DC2626]" />}
              <p className="text-[12px] font-bold text-[#334155]">{answer === correctValue ? "Correct" : `Not quite — correct answer is "${choices.find((c) => c.value === correctValue).label}"`}</p>
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed"><CfrText text={day.explanation.violation} /></p>
          </div>
          <Button onClick={onNext} className="w-full bg-[#002855] text-white hover:bg-[#001a3a]" data-testid={`${testid}-next`}>
            {testid.includes("day2") ? "Finish scenario" : "Next question"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

/* ─── Marker builder ─── */

function buildMarkers({ day, committedAnswer, active, tStart, tEnd, startId, endId }) {
  const markers = [];
  // Committed answer → permanent markers showing the correct bounds
  if (committedAnswer !== undefined) {
    markers.push({
      min: day.shiftStartMin,
      kind: "start",
      label: `Shift START · ${minToTimeStr(day.shiftStartMin)}`,
    });
    markers.push({
      min: day.shiftEndMin,
      kind: "end",
      label: day.continuesToNext ? `Continues into next day · 24:00` : `Shift END · ${minToTimeStr(day.shiftEndMin)}`,
      labelRow: 1,
    });
    if (day.regulatoryEndMin !== undefined && day.regulatoryEndMin !== day.shiftEndMin) {
      markers.push({
        min: day.regulatoryEndMin,
        kind: "end",
        color: "#D4AF37",
        label: `SHOULD have ended · ${minToTimeStr(day.regulatoryEndMin)}`,
        labelRow: 2,
      });
    }
  }
  // Active question → draggable handles
  if (active) {
    markers.push({
      min: timeStrToMin(tStart || "08:00") ?? 8 * 60,
      kind: "start",
      markerId: startId,
      draggable: true,
      label: `Drag → START · ${tStart || "08:00"}`,
    });
    markers.push({
      min: timeStrToMin(tEnd || "18:00") ?? 18 * 60,
      kind: "end",
      markerId: endId,
      draggable: true,
      label: `Drag → END · ${tEnd || "18:00"}`,
      labelRow: 1,
    });
  }
  return markers;
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
