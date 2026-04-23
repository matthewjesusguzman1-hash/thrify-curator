/**
 * hosRules.js — Pure rule engine for property-carrying HOS calculations.
 *
 * Citations cross-reference 49 CFR Part 395.
 */

export const STATUS_META = {
  OFF: { key: "OFF", label: "Off Duty",      short: "OFF",  color: "#CFE2F3", text: "#1E293B" },
  SB:  { key: "SB",  label: "Sleeper Berth", short: "SB",   color: "#5A88B0", text: "#FFFFFF" },
  D:   { key: "D",   label: "Driving",       short: "D",    color: "#F0C674", text: "#1E293B" },
  OD:  { key: "OD",  label: "On Duty",       short: "OD",   color: "#F5E0A8", text: "#1E293B" },
};

export const DUTY_STATUSES = ["OFF", "SB", "D", "OD"];

/** "HH:MM" → minutes from midnight. Accepts 24:00. */
export function hmToMin(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}
/** Minutes → "HH:MM". */
export function minToHm(m) {
  const h = Math.floor(m / 60), r = m % 60;
  return `${String(h).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
/** Minutes → "Hh MMm". */
export function fmtDur(mins) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${String(r).padStart(2, "0")}m`;
}

/** Normalize entries: sort by start + fill OFF-duty gaps for a single 24-hr day. */
export function padDay(entries) {
  const out = [];
  const sorted = [...entries].sort((a, b) => hmToMin(a.start) - hmToMin(b.start));
  let cursor = 0;
  for (const e of sorted) {
    const s = hmToMin(e.start);
    if (s > cursor) out.push({ status: "OFF", start: minToHm(cursor), end: minToHm(s) });
    out.push(e);
    cursor = hmToMin(e.end);
  }
  if (cursor < 24 * 60) out.push({ status: "OFF", start: minToHm(cursor), end: "24:00" });
  return out;
}

/** Compute a single shift's totals and flag the first moment a rule is broken. */
export function analyzeShift(entries) {
  const totals = { D: 0, OD: 0, SB: 0, OFF: 0 };
  let shiftStartMin = null, shiftEndMin = null;
  let firstFourteenBreach = null;  // minutes from midnight where 14-hr window closed while driving after
  let elevenBreach = null;         // minute where 11th hour of driving ended
  let breakBreach = null;          // minute where 8 cumulative hrs of driving passed without a 30-min break
  let drivingSinceBreak = 0;
  let totalDriving = 0;

  for (const e of entries) {
    const s = hmToMin(e.start), eMin = hmToMin(e.end);
    const dur = eMin - s;
    if (dur <= 0) continue;
    totals[e.status] = (totals[e.status] || 0) + dur;
    const isOnDuty = e.status === "D" || e.status === "OD";
    if (isOnDuty) {
      if (shiftStartMin === null) shiftStartMin = s;
      shiftEndMin = eMin;
    }
    if (e.status === "D") {
      // 14-hour window check — driving past 14 hrs after first on-duty entry
      if (shiftStartMin !== null) {
        const windowEndMin = shiftStartMin + 14 * 60;
        if (eMin > windowEndMin && firstFourteenBreach === null) {
          firstFourteenBreach = Math.max(s, windowEndMin);
        }
      }
      // 11-hour driving total
      const newTotal = totalDriving + dur;
      if (newTotal > 11 * 60 && elevenBreach === null) {
        elevenBreach = s + (11 * 60 - totalDriving);
      }
      totalDriving = newTotal;
      // 30-min break rule — driving past 8 cumulative hrs without a 30+ min
      // non-driving block since the start of the shift (or last qualifying break).
      const newSinceBreak = drivingSinceBreak + dur;
      if (newSinceBreak > 8 * 60 && breakBreach === null) {
        breakBreach = s + (8 * 60 - drivingSinceBreak);
      }
      drivingSinceBreak = newSinceBreak;
    } else if (dur >= 30) {
      drivingSinceBreak = 0;
    }
  }

  const windowUsedMin = (shiftStartMin !== null && shiftEndMin !== null) ? (shiftEndMin - shiftStartMin) : 0;
  return {
    totals,
    drivingMin: totals.D,
    onDutyMin: totals.D + totals.OD,
    shiftStartMin,
    shiftEndMin,
    windowUsedMin,
    firstFourteenBreach,
    elevenBreach,
    breakBreach,
    violations: [
      ...(firstFourteenBreach !== null ? [{ code: "14HR", label: "14-hour window", minute: firstFourteenBreach, cfr: "49 CFR §395.3(a)(2)" }] : []),
      ...(elevenBreach !== null ? [{ code: "11HR", label: "11-hour driving limit", minute: elevenBreach, cfr: "49 CFR §395.3(a)(3)(i)" }] : []),
      ...(breakBreach !== null ? [{ code: "BRK", label: "30-minute break", minute: breakBreach, cfr: "49 CFR §395.3(a)(3)(ii)" }] : []),
    ],
  };
}

/** Validate a split-sleeper pairing (property-carrying, post-2020: 7+3 or longer).
 *  Longer period MUST be sleeper berth; shorter may be SB or Off Duty; neither
 *  counts against the 14-hr window when correctly paired. */
export function validateSplit(a, b) {
  const [big, sml] = [a, b].sort((x, y) => y.hours - x.hours);
  if (big.hours + sml.hours < 10) {
    return { legal: false, reason: "Two periods must total at least 10 hours combined.", cfr: "49 CFR §395.1(g)(1)(ii)" };
  }
  if (big.type !== "SB") {
    return { legal: false, reason: "The longer period must be spent in the Sleeper Berth.", cfr: "49 CFR §395.1(g)(1)(ii)" };
  }
  if (big.hours >= 8 && sml.hours >= 2) {
    return { legal: true, type: "8/2", reason: `Valid 8/2 split — ${big.hours}h SB + ${sml.hours}h ${sml.type}.`, cfr: "49 CFR §395.1(g)(1)(ii)(A)" };
  }
  if (big.hours >= 7 && sml.hours >= 3) {
    return { legal: true, type: "7/3", reason: `Valid 7/3 split — ${big.hours}h SB + ${sml.hours}h ${sml.type}.`, cfr: "49 CFR §395.1(g)(1)(ii)(B)" };
  }
  return {
    legal: false,
    reason: "Minimum pairings are 7 hrs SB + 3 hrs (SB/Off) OR 8 hrs SB + 2 hrs (SB/Off). The values entered don't satisfy either.",
    cfr: "49 CFR §395.1(g)(1)(ii)",
  };
}
