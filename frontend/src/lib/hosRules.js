/**
 * hosRules.js — Pure rule engine for property-carrying CMV hours of service.
 * No exemptions yet. Citations reference 49 CFR Part 395 (current, post-2020
 * final rule).
 *
 * Duty statuses used throughout:
 *   "D"   driving
 *   "OD"  on-duty not driving
 *   "SB"  sleeper berth
 *   "OFF" off duty
 */

export const HOS_RULES = {
  drivingLimit: 11,       // §395.3(a)(3)(i) — max driving in a shift
  onDutyWindow: 14,       // §395.3(a)(2)   — clock starts at first on-duty entry
  breakAfter: 8,          // §395.3(a)(3)(ii) — must pause driving after 8 hrs cumulative
  breakDuration: 0.5,     //   at least 30 consecutive minutes, any non-driving status
  offDutyReset: 10,       // §395.3(a)(1)   — consecutive hours before a new shift
  weeklyLimit: 70,        // §395.3(b)(2)   — 70 hrs / 8 days for 7-day carriers
  weeklyWindow: 8,
  restartHours: 34,       // §395.3(c)      — optional 34-hr restart of the weekly clock
};

export const STATUS_META = {
  D:   { label: "Driving",     color: "#DC2626", short: "D"   },
  OD:  { label: "On-duty",     color: "#F59E0B", short: "OD"  },
  SB:  { label: "Sleeper",     color: "#2563EB", short: "SB"  },
  OFF: { label: "Off duty",    color: "#10B981", short: "OFF" },
};

/** Parse "HH:MM" to minutes from midnight. Accepts "24:00". */
export function hmToMin(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}
/** Minutes → "HHh MMm". */
export function fmtDur(mins) {
  const neg = mins < 0;
  const m = Math.abs(Math.round(mins));
  const h = Math.floor(m / 60), r = m % 60;
  return `${neg ? "-" : ""}${h}h ${r.toString().padStart(2, "0")}m`;
}

/**
 * Compute a driver's current-shift state from a list of duty entries (sorted).
 * @param {Array<{status:string,start:string,end:string}>} entries times "HH:MM"
 * @returns {{
 *   drivingMin:number, onDutyMin:number, windowUsedMin:number,
 *   sinceLastBreakMin:number, drivingLeftMin:number, windowLeftMin:number,
 *   needsBreak:boolean, overDrivingLimit:boolean, overWindow:boolean,
 *   shiftStartMin:number|null, shiftEndMin:number|null,
 *   lastOffResetMin:number,  // longest trailing OFF/SB block in minutes
 *   violations:Array<{code:string,text:string,cfr:string}>,
 * }}
 */
export function computeShiftState(entries) {
  let drivingMin = 0, onDutyMin = 0, sinceLastBreakMin = 0;
  let shiftStartMin = null, shiftEndMin = null;
  const violations = [];

  for (const e of entries) {
    const dur = hmToMin(e.end) - hmToMin(e.start);
    if (dur <= 0) continue;
    const isOnDuty = e.status === "D" || e.status === "OD";
    if (isOnDuty) {
      if (shiftStartMin === null) shiftStartMin = hmToMin(e.start);
      shiftEndMin = hmToMin(e.end);
      onDutyMin += dur;
    }
    if (e.status === "D") {
      drivingMin += dur;
      sinceLastBreakMin += dur;
    } else if (dur >= HOS_RULES.breakDuration * 60) {
      // Any non-driving block of 30+ minutes resets the 8-hour break counter.
      sinceLastBreakMin = 0;
    }
  }

  const windowUsedMin = shiftStartMin !== null && shiftEndMin !== null
    ? shiftEndMin - shiftStartMin : 0;

  if (drivingMin > HOS_RULES.drivingLimit * 60) {
    violations.push({
      code: "DRV11",
      text: `Drove ${fmtDur(drivingMin)} — exceeds 11-hr driving limit`,
      cfr: "49 CFR §395.3(a)(3)(i)",
    });
  }
  if (windowUsedMin > HOS_RULES.onDutyWindow * 60) {
    violations.push({
      code: "WIN14",
      text: `On-duty window ${fmtDur(windowUsedMin)} — exceeds 14-hr window`,
      cfr: "49 CFR §395.3(a)(2)",
    });
  }
  if (sinceLastBreakMin > HOS_RULES.breakAfter * 60) {
    violations.push({
      code: "BRK8",
      text: `${fmtDur(sinceLastBreakMin)} driving since last 30-min break`,
      cfr: "49 CFR §395.3(a)(3)(ii)",
    });
  }

  return {
    drivingMin,
    onDutyMin,
    windowUsedMin,
    sinceLastBreakMin,
    drivingLeftMin: HOS_RULES.drivingLimit * 60 - drivingMin,
    windowLeftMin: HOS_RULES.onDutyWindow * 60 - windowUsedMin,
    needsBreak: sinceLastBreakMin >= HOS_RULES.breakAfter * 60,
    overDrivingLimit: drivingMin > HOS_RULES.drivingLimit * 60,
    overWindow: windowUsedMin > HOS_RULES.onDutyWindow * 60,
    shiftStartMin,
    shiftEndMin,
    violations,
  };
}

/**
 * Validate a split-sleeper pairing. Two qualifying periods totaling ≥ 10 hrs:
 *   • 8+ consecutive hrs in sleeper berth AND 2+ hrs SB or OFF, OR
 *   • 7+ consecutive hrs in sleeper berth AND 3+ hrs SB or OFF.
 * The longer period must always be in the sleeper berth. Order does not matter
 * — the 14-hr window is paused by whichever period is taken first once the
 * second qualifying period closes it out.
 *
 * §395.1(g)(1)(ii) — Sleeper berth provision.
 *
 * @param {{hours:number, type:"SB"|"OFF"}} periodA
 * @param {{hours:number, type:"SB"|"OFF"}} periodB
 */
export function validateSplit(periodA, periodB) {
  const [big, sml] = [periodA, periodB].sort((x, y) => y.hours - x.hours);
  if (big.type !== "SB") {
    return {
      legal: false, type: null,
      reason: "The longer period must be spent in the Sleeper Berth",
      cfr: "49 CFR §395.1(g)(1)(ii)",
    };
  }
  if (big.hours >= 8 && sml.hours >= 2) {
    return {
      legal: true, type: "8/2",
      reason: `Valid 8/2 split — ${big.hours.toFixed(1)} hrs SB + ${sml.hours.toFixed(1)} hrs ${sml.type === "SB" ? "SB" : "Off"}`,
      cfr: "49 CFR §395.1(g)(1)(ii)(A)",
    };
  }
  if (big.hours >= 7 && sml.hours >= 3) {
    return {
      legal: true, type: "7/3",
      reason: `Valid 7/3 split — ${big.hours.toFixed(1)} hrs SB + ${sml.hours.toFixed(1)} hrs ${sml.type === "SB" ? "SB" : "Off"}`,
      cfr: "49 CFR §395.1(g)(1)(ii)(B)",
    };
  }
  if (big.hours >= 7 && sml.hours >= 2 && big.hours + sml.hours >= 10) {
    return {
      legal: false, type: null,
      reason: "Shorter period must be at least 3 hrs when the longer is 7–7.9 hrs (7/3 split)",
      cfr: "49 CFR §395.1(g)(1)(ii)(B)",
    };
  }
  return {
    legal: false, type: null,
    reason: "No valid pairing. Need 8+2, 7+3, or longer combinations (6/4 and 5/5 are pilot-only, not standard)",
    cfr: "49 CFR §395.1(g)(1)(ii)",
  };
}

/* ───────────────────────────────── Lessons ───────────────────────────────── */
/* Seven core concepts, each presented as a short card with a worked example.  */

export const LESSONS = [
  {
    id: "11-hour",
    title: "The 11-Hour Driving Rule",
    cfr: "49 CFR §395.3(a)(3)(i)",
    body: "A property-carrying driver may drive a maximum of 11 hours after 10 consecutive hours off duty.",
    example: "Driver comes on duty at 0600. They may drive at most 11 hours total during that shift — not necessarily 11 hours in a row.",
    key: "Driving ≤ 11 hrs / shift",
  },
  {
    id: "14-hour",
    title: "The 14-Hour On-Duty Window",
    cfr: "49 CFR §395.3(a)(2)",
    body: "A driver may not drive beyond the 14th consecutive hour after coming on duty, following 10 consecutive hours off duty. Off-duty time during the shift does NOT extend this window.",
    example: "On-duty at 0600 → the 14-hr window closes at 2000. Even if they take a 3-hr nap at lunch, the window still ends at 2000.",
    key: "Window clock does not pause for breaks",
  },
  {
    id: "30-min-break",
    title: "The 30-Minute Break",
    cfr: "49 CFR §395.3(a)(3)(ii)",
    body: "Driving is not permitted after 8 cumulative hours of driving time without a break of at least 30 consecutive minutes. The break may be off duty, sleeper berth, or on-duty not driving.",
    example: "Drove 4 hrs → 1-hr fuel/paperwork (on-duty) → drove 4 more hrs. The 1 hr on-duty counts as the break. Must pause before starting the 9th hour of driving.",
    key: "30 min interrupts the 8-hr driving counter",
  },
  {
    id: "10-hour",
    title: "The 10-Hour Off-Duty Reset",
    cfr: "49 CFR §395.3(a)(1)",
    body: "10 consecutive hours off duty (or in the sleeper berth) are required before starting a new shift. This resets the 11-hr driving limit and the 14-hr window.",
    example: "Ended the shift at 2000. Earliest the driver can go on duty for a new shift is 0600 the next day.",
    key: "10 hrs → fresh shift",
  },
  {
    id: "split-sleeper",
    title: "Split Sleeper Berth",
    cfr: "49 CFR §395.1(g)(1)(ii)",
    body: "A driver may split the required 10 hrs into two qualifying periods: 8/2 or 7/3. The longer period must be in the sleeper berth; the shorter may be SB or off duty. Neither period counts against the 14-hr window.",
    example: "4 hrs drive → 8 hrs SB → 4 hrs drive → 2 hrs off → resume. Each pairing effectively pauses the 14-hr window for the time of the shorter break.",
    key: "Valid pairings: 8+2 and 7+3 only (standard rules)",
  },
  {
    id: "70-8",
    title: "The 70-Hour / 8-Day Rule",
    cfr: "49 CFR §395.3(b)(2)",
    body: "A driver employed by a carrier operating every day of the week may not drive after 70 hours on duty in any 8 consecutive days. Hours roll off on day 9 and beyond.",
    example: "Sum on-duty hours for today + the previous 7 days. If the total is 70 or more, the driver is out of recap hours and must restart.",
    key: "Rolling 8-day sum ≤ 70",
  },
  {
    id: "34-restart",
    title: "The 34-Hour Restart",
    cfr: "49 CFR §395.3(c)",
    body: "At the driver's option, 34 consecutive hours off duty or in the sleeper berth (or any combination) restarts the 60/70-hour clock to zero. Only one restart per 168-hour period.",
    example: "Ran out of recap hours at 1400 Friday. 34 hrs off → Saturday 2400. Driver can start a fresh 70-hr recap at 0001 Sunday.",
    key: "34 hrs off → clock resets to 0",
  },
];

/* ───────────────────────────────── Scenarios ─────────────────────────────── */
/* Canned, hand-authored quizzes. Each has a timeline, a question, options,    */
/* and an explain-the-math panel with the CFR citation.                        */

export const SCENARIOS = [
  {
    id: "scn-window",
    topic: "14-hour window",
    prompt: "Driver came on duty at 0600. Current time is 2015. They've driven 9 hours and were on-duty (non-driving) for the rest. They want to drive 30 more minutes to the terminal.",
    log: [
      { status: "D",   start: "06:00", end: "10:00" },
      { status: "OD",  start: "10:00", end: "12:00" },
      { status: "D",   start: "12:00", end: "17:00" },
      { status: "OD",  start: "17:00", end: "20:15" },
    ],
    question: "Can the driver legally drive for 30 more minutes?",
    options: [
      { id: "a", text: "Yes — they have 2 hours of driving left under the 11-hr rule" },
      { id: "b", text: "No — the 14-hr window closed at 2000" },
      { id: "c", text: "Yes — off-duty time pauses the window" },
    ],
    correct: "b",
    explanation: "The 14-hr window started at 0600 and closes at 2000 regardless of any non-driving time during the shift. At 2015 the driver is 15 min past the window and may not drive.",
    cfr: "49 CFR §395.3(a)(2)",
  },
  {
    id: "scn-break",
    topic: "30-minute break",
    prompt: "Driver has been driving since 0600. At 1430 they've driven a continuous 8h 30m without any non-driving status of 30+ minutes.",
    log: [
      { status: "D", start: "06:00", end: "14:30" },
    ],
    question: "Which violation applies?",
    options: [
      { id: "a", text: "None — they're under the 11-hr driving limit" },
      { id: "b", text: "30-minute break violation — cannot drive past 8 cumulative hrs without a 30-min break" },
      { id: "c", text: "14-hour window violation" },
    ],
    correct: "b",
    explanation: "A driver must take 30 consecutive minutes of non-driving status before driving past 8 cumulative hours. 8h 30m of continuous driving means the violation begins at 8h 00m 01s.",
    cfr: "49 CFR §395.3(a)(3)(ii)",
  },
  {
    id: "scn-drv-limit",
    topic: "11-hour driving limit",
    prompt: "Shift started 0500. Driver has driven 11 hours exactly by 1900 (with a 3-hr off-duty lunch in the middle). They want to complete a 45-min drive to the destination.",
    log: [
      { status: "D",   start: "05:00", end: "11:00" },
      { status: "OFF", start: "11:00", end: "14:00" },
      { status: "D",   start: "14:00", end: "19:00" },
    ],
    question: "Can they legally make the 45-min drive?",
    options: [
      { id: "a", text: "Yes — the 3-hr off-duty break extended the driving limit" },
      { id: "b", text: "Yes — they're inside the 14-hr window" },
      { id: "c", text: "No — they've reached the 11-hr driving cap" },
    ],
    correct: "c",
    explanation: "The 11-hr driving limit is a hard cap; off-duty time does not add to it. Once 11 hrs of driving are used, the driver needs a 10-hr reset before driving again.",
    cfr: "49 CFR §395.3(a)(3)(i)",
  },
  {
    id: "scn-reset",
    topic: "10-hour reset",
    prompt: "Driver ends shift at 2200 Monday. They spend 9 hrs off duty, 30 min on duty doing paperwork, then 1 hr off duty.",
    log: [
      { status: "OFF", start: "22:00", end: "07:00" },
      { status: "OD",  start: "07:00", end: "07:30" },
      { status: "OFF", start: "07:30", end: "08:30" },
    ],
    question: "Has the driver satisfied the 10-hr off-duty reset?",
    options: [
      { id: "a", text: "Yes — total off-duty time is 10 hrs" },
      { id: "b", text: "No — the 30-min on-duty block broke the required 10 consecutive hours" },
      { id: "c", text: "Yes if the paperwork was less than 30 minutes" },
    ],
    correct: "b",
    explanation: "The reset must be 10 CONSECUTIVE hours in off-duty or sleeper berth status (or a valid split). The 30-min on-duty block interrupted it — the driver still needs a full 10-hr consecutive reset before driving.",
    cfr: "49 CFR §395.3(a)(1)",
  },
  {
    id: "scn-split",
    topic: "Split sleeper",
    prompt: "Driver takes 7.5 hrs in the sleeper berth, drives 5 hrs, then takes 2.5 hrs off duty, then wants to drive again.",
    log: [
      { status: "SB",  start: "00:00", end: "07:30" },
      { status: "D",   start: "07:30", end: "12:30" },
      { status: "OFF", start: "12:30", end: "15:00" },
    ],
    question: "Does this form a valid split-sleeper pairing?",
    options: [
      { id: "a", text: "Yes — 7.5 + 2.5 = 10 hrs total" },
      { id: "b", text: "No — 7.5 hr SB pairs with 3+ hrs (7/3 rule), not 2.5 hrs" },
      { id: "c", text: "Yes — any combination totaling 10 hrs works" },
    ],
    correct: "b",
    explanation: "Standard rules allow 8/2 or 7/3 only. A 7.5-hr sleeper period requires a second period of at least 3 hours. 6/4 and 5/5 splits are under an FMCSA pilot program, not standard rules.",
    cfr: "49 CFR §395.1(g)(1)(ii)",
  },
  {
    id: "scn-recap",
    topic: "70/8 recap",
    prompt: "Running 8-day recap for a property-carrying driver on a 70/8 schedule:\nDay 1: 11h · Day 2: 10h · Day 3: 12h · Day 4: 9h · Day 5: 11h · Day 6: 8h · Day 7: 10h · Day 8 (today): 0h so far.",
    question: "How many on-duty hours does the driver have available today?",
    options: [
      { id: "a", text: "11 hours" },
      { id: "b", text: "1 hour" },
      { id: "c", text: "14 hours" },
      { id: "d", text: "9 hours" },
    ],
    correct: "d",
    explanation: "Sum of days 1–7 = 11+10+12+9+11+8+10 = 71. But the recap is a rolling 8-day window including today, so we sum the 7 prior days: 71 hrs. Available hours today = 70 − 71 = −1. Wait — actually the rolling 8-day sum including today must be ≤ 70. With 7 prior days at 71 hrs, today's allowance is 70 − 71 = already over; however day 1 rolls off tomorrow. Answer key: the driver is currently 1 hour OVER the recap and may not drive. The closest option is (d) 9 hours IF we misread — correct answer is (b) driver has effectively no hours; the trick is Day 1 rolls off only tomorrow.",
    cfr: "49 CFR §395.3(b)(2)",
  },
  {
    id: "scn-restart",
    topic: "34-hour restart",
    prompt: "Driver exhausted the 70-hr recap at 1400 Friday. They take continuous off-duty from 1400 Friday to 0100 Sunday (35 hrs).",
    question: "When may the driver begin a fresh 70-hr recap?",
    options: [
      { id: "a", text: "0001 Sunday — the 34-hr restart completed at 0000 Sunday" },
      { id: "b", text: "1400 Saturday — the moment 24 hrs expires" },
      { id: "c", text: "Not until 1400 Sunday — a full 48 hrs are required" },
    ],
    correct: "a",
    explanation: "34 consecutive hours off duty resets the 60/70-hr clock to zero. Starting at 1400 Friday + 34 hrs = 0000 Sunday. The driver may start a fresh recap at that moment.",
    cfr: "49 CFR §395.3(c)",
  },
];

/* Fix scn-recap — the walkthrough above is confusing. Replace correct answer
 * with a clean calculation: sum of days 1-7 = 71 > 70, so no hours are
 * available today. This matches option (b) "1 hour" which is a poor fit; we
 * rewrite the scenario with a cleaner number set. */
SCENARIOS[5] = {
  id: "scn-recap",
  topic: "70/8 recap",
  prompt: "Running 8-day recap for a property-carrying driver on 70/8:\nDay 1: 10h · Day 2: 8h · Day 3: 10h · Day 4: 9h · Day 5: 11h · Day 6: 8h · Day 7: 9h\nSum so far: 65 hrs.",
  question: "How many on-duty hours does the driver have available today (Day 8)?",
  options: [
    { id: "a", text: "11 hours" },
    { id: "b", text: "5 hours" },
    { id: "c", text: "9 hours" },
    { id: "d", text: "70 hours" },
  ],
  correct: "b",
  explanation: "Total on-duty for Days 1–7 is 10+8+10+9+11+8+9 = 65 hrs. The rolling 8-day sum (Days 1–8) cannot exceed 70. Available on Day 8 = 70 − 65 = 5 hours.",
  cfr: "49 CFR §395.3(b)(2)",
};
