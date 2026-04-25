import { minToTimeStr, timeStrToMin } from "../../../lib/hosRules";

/** Day + time picker for two-day overnight scenarios. Renders a day-selector
 *  (Day 1 / Day 2) above an HH:MM time input. Used by both the 8-day runner's
 *  overnight pair card and the multi-day runner. */
export function PairDayTimePicker({ label, color, value, onChange, day1Label, day2Label, testid }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</label>
      <select
        value={value.day}
        onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
        className="w-full px-2 py-1.5 text-[12px] font-bold border border-[#CBD5E1] rounded-md outline-none focus:border-[#002855]"
        data-testid={`${testid}-day`}
      >
        <option value={1}>{day1Label}</option>
        <option value={2}>{day2Label}</option>
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
