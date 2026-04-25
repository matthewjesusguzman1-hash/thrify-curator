import { EldGrid } from "../EldGrid";
import { lastEntryEndMin } from "../../../lib/hosRules";

/** Readonly preview of the upcoming day in the 8-day runner — shown beneath
 *  the active day card so the inspector always sees two days at once. The
 *  user cannot interact with this grid; it's purely for cross-day context
 *  (overnight rests, split-sleeper continuations, §395.3(a)(1) reset
 *  stretches into the next day, etc.). */
export function NextDayPreview({ day, dayIdx, totalDays }) {
  return (
    <section className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#94A3B8] overflow-hidden" data-testid={`next-day-preview-${dayIdx}`}>
      <div className="bg-[#475569]/15 px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Upcoming · readonly</span>
        <p className="text-[12px] font-bold text-[#475569]">Day {dayIdx + 1} of {totalDays} · {day.label} · {day.dayName}</p>
      </div>
      <div className="p-2">
        <EldGrid entries={day.log} truncateAtMin={day.truncated ? lastEntryEndMin(day.log) : null} />
      </div>
    </section>
  );
}
