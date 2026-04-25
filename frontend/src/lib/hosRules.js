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
/** "HH:MM" → minutes, returns null on invalid input. Used by HOS practice
 *  runners that need to safely parse user-typed time inputs. */
export function timeStrToMin(str) {
  if (!str) return null;
  const [hh, mm] = str.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}
/** Minutes → "HH:MM". */
export function minToHm(m) {
  const h = Math.floor(m / 60), r = m % 60;
  return `${String(h).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
/** Minutes → "HH:MM" but renders 24*60 as "24:00" and null as "—". Used by
 *  HOS practice runners for human-readable shift bound labels. */
export function minToTimeStr(min) {
  if (min === null || min === undefined) return "—";
  if (min === 24 * 60) return "24:00";
  const m = min % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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

/** Validate a split-sleeper pairing (property-carrying, post-2020).
 *  Per 49 CFR §395.1(g)(1)(ii):
 *    - One period must be ≥7 consecutive hours in the Sleeper Berth.
 *    - The other period must be ≥2 consecutive hours (SB or Off Duty).
 *    - The two periods combined must total ≥10 hours.
 *    - Order does not matter. Neither period counts against the 14-hr clock.
 *  NOTE: "7+3" / "8+2" are common examples of the rule, not the full rule.
 *  A 7.5+2.5 pair is also legal as long as combined ≥ 10. */
export function validateSplit(a, b) {
  const [big, sml] = [a, b].sort((x, y) => y.hours - x.hours);
  if (big.type !== "SB") {
    return { legal: false, reason: "At least one period must be spent in the Sleeper Berth (the longer one).", cfr: "49 CFR §395.1(g)(1)(ii)" };
  }
  if (big.hours < 7) {
    return { legal: false, reason: "The Sleeper Berth period must be at least 7 consecutive hours.", cfr: "49 CFR §395.1(g)(1)(ii)" };
  }
  if (sml.hours < 2) {
    return { legal: false, reason: "The shorter period must be at least 2 consecutive hours (sleeper berth or off duty).", cfr: "49 CFR §395.1(g)(1)(ii)" };
  }
  if (big.hours + sml.hours < 10) {
    return { legal: false, reason: "The two periods must total at least 10 hours combined.", cfr: "49 CFR §395.1(g)(1)(ii)" };
  }
  return {
    legal: true,
    type: `${big.hours}+${sml.hours}`,
    reason: `Valid split — ${big.hours}h SB + ${sml.hours}h ${sml.type}.`,
    cfr: "49 CFR §395.1(g)(1)(ii)",
  };
}


/** Sum the on-duty hours total for a single day's log by adding up every D
 *  (driving) and OD (on-duty not driving) duration. Used by the 8-day cycle
 *  calculator as the source of truth for canonical daily totals.
 *  @returns {number} hours, rounded to 2 decimals. */
export function computeOnDutyHoursFromLog(log) {
  if (!log || !Array.isArray(log)) return 0;
  let totalMin = 0;
  log.forEach((e) => {
    if (e.status === "D" || e.status === "OD") {
      const s = timeStrToMin(e.start);
      const eEnd = e.end === "24:00" ? 24 * 60 : timeStrToMin(e.end);
      if (s !== null && eEnd !== null) totalMin += eEnd - s;
    }
  });
  return Math.round((totalMin / 60) * 100) / 100;
}

/** Latest end-time minute across all entries — used to position the
 *  "INSPECTION · HH:MM" overlay line on truncated (in-progress) days. */
export function lastEntryEndMin(log) {
  if (!log || !Array.isArray(log) || log.length === 0) return null;
  let max = 0;
  log.forEach((e) => {
    const m = e.end === "24:00" ? 24 * 60 : timeStrToMin(e.end);
    if (m !== null && m > max) max = m;
  });
  return max;
}

/** OR two days' violation flags into a single answer string for the
 *  ViolationQuestionCard. Used when an overnight shift spans two days and
 *  the violation may surface on either side of midnight. */
export function violationCorrectForOvernight(d1, d2) {
  const v11 = !!(d1?.violation11 || d2?.violation11);
  const v14 = !!(d1?.violation14 || d2?.violation14);
  const v8 = !!(d1?.violation8 || d2?.violation8);
  if ((v11 && v14) || (v11 && v8) || (v14 && v8)) return "multi";
  if (v11) return "11";
  if (v14) return "14";
  if (v8) return "8";
  return "none";
}

/** Convert per-day MULTIDAY_SCENARIOS data (with `continuesToNext` /
 *  `continuesFromPrev` flags) into a flat shifts[] array. Cross-midnight
 *  overnight shifts are merged into a SINGLE shift entry so the inspector
 *  can mark Start on Day 1 and End on Day 2 in one continuous question. */
export function deriveShifts(days) {
  if (!days || !Array.isArray(days)) return [];
  const out = [];
  let open = null;
  days.forEach((d, i) => {
    const dayN = i + 1;
    if (d.shiftStartMin == null || d.shiftEndMin == null) return;
    if (d.continuesFromPrev && open) {
      open.endDay = dayN;
      open.endMin = d.shiftEndMin;
      open.violation11 = open.violation11 || !!d.violation11;
      open.violation14 = open.violation14 || !!d.violation14;
      if (d.regulatoryEndMin != null) {
        open.regulatoryEndDay = dayN;
        open.regulatoryEndMin = d.regulatoryEndMin;
      }
      if (d.explanation) {
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
      open = s;
    } else {
      out.push(s);
    }
  });
  if (open) out.push(open);
  return out;
}
