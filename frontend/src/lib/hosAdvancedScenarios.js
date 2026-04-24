/**
 * hosAdvancedScenarios.js — Practice scenarios for the new "HOS Practice"
 * section. Three categories:
 *   COMBINED_SCENARIOS    · single-day 11/14-hour combined practice (no split-sleeper)
 *   MULTIDAY_SCENARIOS    · 2-day scenarios (focal day + one prior day for context)
 *   EIGHTDAY_SCENARIOS    · 8-day inspection-period scenarios (prior 7 days as a
 *                           recap-hour table + focal day's ELD log + cycle limit)
 *
 * The scenario shape mirrors SPLIT_PRACTICE_SCENARIOS so the same PracticeRunner
 * component can drive all three. Multi-day and 8-day scenarios add `priorDays`
 * (and `priorRecap` for 8-day) which the parent page renders as context above
 * the runner — the runner itself stays focused on one day's analysis.
 *
 * All times in 24-hour military format. All citations 49 CFR Part 395.
 */

/* ══════════════════════════════════════════════════════════════════════════
   COMBINED_SCENARIOS — single-day 11-hour + 14-hour combined practice.
   These scenarios do NOT involve the split-sleeper provision (validSplit:false,
   qualifyingBlockIdx: []). The runner is started in mode="shift" so it skips
   the qualify and select phases and goes directly to: shift bounds → hours →
   violation. Mix of clean shifts, 14-hr violations, 11-hr violations, and a
   "looks borderline but legal" trap.
   ══════════════════════════════════════════════════════════════════════════ */
export const COMBINED_SCENARIOS = [
  {
    id: "C1",
    prompt: "Identify the work shift, then say whether the driver violated the 11- or 14-hour rule.",
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "07:00" },  // pre-trip
      { status: "D",   start: "07:00", end: "11:00" },  // 4h drive
      { status: "OFF", start: "11:00", end: "11:30" },  // 30-min break
      { status: "D",   start: "11:30", end: "15:30" },  // 4h drive
      { status: "OD",  start: "15:30", end: "16:30" },  // load check
      { status: "D",   start: "16:30", end: "19:00" },  // 2.5h drive
      { status: "OFF", start: "19:00", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    counted14Hours: 13,
    counted11Hours: 10.5,
    shiftStartMin: 6 * 60,
    shiftEndMin: 19 * 60,
    explanation: {
      qualifying: "No split-sleeper attempted — this is a straight 14-hour shift.",
      shift: "Shift STARTS at 06:00 (first OD entry — pre-trip). Shift ENDS at 19:00 (last D segment ends). Total wall-clock = 13h, well inside the 14-hr limit.",
      hours: "Toward 14 = the full 13h wall-clock from 06:00 to 19:00. Toward 11 (driving only) = 4h + 4h + 2.5h = 10.5h.",
      violation: "No violation. Shift = 13h (under 14). Driving = 10.5h (under 11). The 30-min OFF at 11:00-11:30 satisfies §395.3(a)(3)(ii).",
    },
  },
  {
    id: "C2",
    prompt: "Identify the work shift, then say which rules the driver violated.",
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "06:30" },
      { status: "D",   start: "06:30", end: "10:30" },  // 4h drive (4h total)
      { status: "OFF", start: "10:30", end: "11:00" },  // 30-min break
      { status: "D",   start: "11:00", end: "15:00" },  // 4h drive (8h total)
      { status: "OD",  start: "15:00", end: "16:00" },
      { status: "D",   start: "16:00", end: "20:30" },  // 4.5h drive (12.5h total)
      { status: "OFF", start: "20:30", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: true,
    violation14: true,
    counted14Hours: 14,
    counted11Hours: 12.5,
    shiftStartMin: 6 * 60,
    shiftEndMin: 20 * 60 + 30,
    regulatoryEndMin: 20 * 60,    // 14-hr wall-clock would close at 20:00
    explanation: {
      qualifying: "No split-sleeper. Standard 14-hr shift evaluation.",
      shift: "Shift STARTS at 06:00 (first OD). Shift physically ENDS at 20:30 when the last D ends.",
      shouldEnd: "§395.3(a)(2): with no valid split, the shift must end 14 wall-clock hours after start — 20:00. The driver kept driving until 20:30 — 30 min into a 14-hr violation.",
      hours: "Toward 14 = 14h wall-clock (06:00 → 20:00) — the 30-min OFF inside the shift still counts toward the 14 because no split-sleeper pair exists. Toward 11 (driving only) = 4 + 4 + 4.5 = 12.5h.",
      violation: "BOTH violations. 14-hr: shift ran past 20:00 (the 14-hr wall-clock end). 11-hr: driving total = 12.5h, which means the 11-hr driving limit was reached at 19:00 and any driving after that is the 11-hr violation.",
    },
  },
  {
    id: "C3",
    prompt: "Identify the work shift, then say which rules the driver violated.",
    log: [
      { status: "OFF", start: "00:00", end: "05:00" },
      { status: "OD",  start: "05:00", end: "06:00" },  // pre-trip
      { status: "D",   start: "06:00", end: "14:00" },  // 8h continuous drive
      { status: "OFF", start: "14:00", end: "14:30" },  // 30-min break
      { status: "D",   start: "14:30", end: "18:30" },  // 4h drive (12h total)
      { status: "OFF", start: "18:30", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: true,
    violation14: false,
    counted14Hours: 13.5,
    counted11Hours: 12,
    shiftStartMin: 5 * 60,
    shiftEndMin: 18 * 60 + 30,
    explanation: {
      qualifying: "No split-sleeper. Standard 11/14 evaluation.",
      shift: "Shift STARTS at 05:00 (first OD). Shift ENDS at 18:30 (last D ends). Wall-clock total = 13.5h — under 14.",
      hours: "Toward 14 = 13.5h (05:00 → 18:30). Toward 11 = 8 + 4 = 12h driving.",
      violation: "11-hr DRIVING violation. Cumulative driving hit 11h at 17:30; the driver kept driving until 18:30 — 1h over the 11-hr cap. Shift wall-clock = 13.5h, still under 14, so no 14-hr violation.",
    },
  },
  {
    id: "C4",
    prompt: "Identify the work shift, then say which rules the driver violated.",
    log: [
      { status: "OFF", start: "00:00", end: "04:00" },
      { status: "OD",  start: "04:00", end: "06:00" },  // 2h pre-trip
      { status: "D",   start: "06:00", end: "10:00" },  // 4h drive
      { status: "OD",  start: "10:00", end: "12:00" },  // 2h load
      { status: "D",   start: "12:00", end: "16:00" },  // 4h drive (8h total)
      { status: "OFF", start: "16:00", end: "16:30" },  // 30-min break
      { status: "D",   start: "16:30", end: "19:00" },  // 2.5h drive (10.5h total)
      { status: "OFF", start: "19:00", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: true,
    counted14Hours: 15,
    counted11Hours: 10.5,
    shiftStartMin: 4 * 60,
    shiftEndMin: 19 * 60,
    regulatoryEndMin: 18 * 60,    // 14-hr from 04:00 closes at 18:00
    explanation: {
      qualifying: "No split-sleeper. Standard 11/14.",
      shift: "Shift STARTS at 04:00 (first OD — the pre-trip). Shift physically ENDS at 19:00 (last D entry).",
      shouldEnd: "§395.3(a)(2): 14-hr wall-clock from 04:00 closes at 18:00. The driver kept driving until 19:00 — 1h into a 14-hr violation. Pre-trip OD time counts the same as drive time toward the 14-hr clock.",
      hours: "Toward 14 = 15h wall-clock (04:00 → 19:00). Toward 11 = 4 + 4 + 2.5 = 10.5h driving — under 11.",
      violation: "14-hr violation only. Driving total stayed at 10.5h (under 11), so the 11-hr cap was not reached. But the wall-clock shift ran 15h — 1 hour past the 14-hr limit. Common trap: the driver was 'efficient' on driving but burned the 14 on duty time.",
    },
  },
  {
    id: "C5",
    prompt: "Identify the work shift, then decide.",
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "06:30" },
      { status: "D",   start: "06:30", end: "11:30" },  // 5h
      { status: "OFF", start: "11:30", end: "12:00" },  // break
      { status: "D",   start: "12:00", end: "15:00" },  // 3h
      { status: "OD",  start: "15:00", end: "16:00" },
      { status: "D",   start: "16:00", end: "19:00" },  // 3h (11h total)
      { status: "OD",  start: "19:00", end: "20:00" },  // 1h paperwork
      { status: "OFF", start: "20:00", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    counted14Hours: 14,
    counted11Hours: 11,
    shiftStartMin: 6 * 60,
    shiftEndMin: 20 * 60,
    explanation: {
      qualifying: "No split-sleeper. Standard 11/14.",
      shift: "Shift STARTS at 06:00 (first OD). Shift ENDS at 20:00 (last OD ends). Exactly 14h wall-clock — at the limit, not over.",
      hours: "Toward 14 = exactly 14h. Toward 11 = 5 + 3 + 3 = 11h driving — exactly at the 11-hr cap, not over.",
      violation: "No violation — both clocks hit but neither was exceeded. §395.3(a)(2)/(a)(3)(i) say no driving AFTER the limit; reaching the limit precisely is not itself a violation. Critical inspector point: do NOT cite when the totals are AT the cap, only when they EXCEED it.",
    },
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   MULTIDAY_SCENARIOS — 2-day scenarios. The page renders the prior day's ELD
   above as context (with shift markers + outcome labels), then runs the focal
   day through the standard runner. Tests the inspector's ability to spot how
   yesterday's reset (or lack of one) frames today's shift bounds.

   Shape additions: priorDays = [{ label, log, summary, shiftMarkers? }]
   The focal day is everything else on the scenario object (log, shiftStartMin
   etc.) — same shape as COMBINED_SCENARIOS so the runner can consume it.
   ══════════════════════════════════════════════════════════════════════════ */
export const MULTIDAY_SCENARIOS = [
  {
    id: "M1",
    prompt: "Day 2 is the focal day. Identify today's shift and check for violations.",
    priorDays: [
      {
        label: "Day 1 (yesterday)",
        log: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "11:00" },
          { status: "OFF", start: "11:00", end: "11:30" },
          { status: "D",   start: "11:30", end: "15:30" },
          { status: "OD",  start: "15:30", end: "16:30" },
          { status: "D",   start: "16:30", end: "18:00" },
          { status: "OFF", start: "18:00", end: "24:00" },
        ],
        summary: "Day 1 shift: 05:00 → 18:00 (13h wall-clock, 10.5h drive). Off-duty from 18:00 forward.",
      },
    ],
    log: [
      { status: "OFF", start: "00:00", end: "04:00" },     // continues 10h reset (18→04)
      { status: "OD",  start: "04:00", end: "05:00" },     // pre-trip
      { status: "D",   start: "05:00", end: "10:00" },     // 5h drive
      { status: "OFF", start: "10:00", end: "10:30" },
      { status: "D",   start: "10:30", end: "14:30" },     // 4h
      { status: "OD",  start: "14:30", end: "15:30" },
      { status: "D",   start: "15:30", end: "17:30" },     // 2h (11h total)
      { status: "OFF", start: "17:30", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    counted14Hours: 13.5,
    counted11Hours: 11,
    shiftStartMin: 4 * 60,
    shiftEndMin: 17 * 60 + 30,
    explanation: {
      qualifying: "Yesterday → today flow. Day 1 ended at 18:00; the 10h OFF (Day 1 18:00 → Day 2 04:00) is a full 10-hr reset under §395.3(a)(1).",
      shift: "Today's shift STARTS at 04:00 (first OD after the 10h reset). It ENDS at 17:30 (last D entry). Wall-clock = 13.5h, under 14.",
      hours: "Toward 14 = 13.5h. Toward 11 = 5 + 4 + 2 = 11h — exactly at the cap.",
      violation: "No violation. The 10-hr reset between days is what gives the driver a fresh 14-hr clock today. Drive total hits 11 right at shift end — at the limit, not over.",
    },
  },
  {
    id: "M2",
    prompt: "Day 2 is the focal day. Identify the shift and check for violations.",
    priorDays: [
      {
        label: "Day 1 (yesterday)",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "12:00" },
          { status: "OFF", start: "12:00", end: "12:30" },
          { status: "D",   start: "12:30", end: "16:30" },
          { status: "OD",  start: "16:30", end: "17:00" },
          { status: "D",   start: "17:00", end: "20:00" },
          { status: "OFF", start: "20:00", end: "24:00" },
        ],
        summary: "Day 1 shift: 06:00 → 20:00 (14h wall-clock, 12h drive — already an 11-hr violation on Day 1). Off-duty 20:00 → end of day.",
      },
    ],
    log: [
      { status: "OFF", start: "00:00", end: "05:00" },     // 5h OFF — total OFF since Day 1 20:00 = 9h, NOT a 10h reset
      { status: "OD",  start: "05:00", end: "06:00" },
      { status: "D",   start: "06:00", end: "11:00" },     // 5h drive
      { status: "OFF", start: "11:00", end: "11:30" },
      { status: "D",   start: "11:30", end: "16:30" },     // 5h drive
      { status: "OFF", start: "16:30", end: "24:00" },
    ],
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    counted14Hours: 11.5,
    counted11Hours: 10,
    shiftStartMin: 5 * 60,
    shiftEndMin: 16 * 60 + 30,
    explanation: {
      qualifying: "No split-sleeper. The off-duty between Day 1 (20:00) and Day 2 (05:00) is only 9h — short of the 10h continuous reset under §395.3(a)(1). That's a separate Day-1-to-Day-2 reset violation that the inspector should also flag, but it doesn't change today's shift bounds analysis.",
      shift: "Today's shift STARTS at 05:00 (first OD on Day 2). ENDS at 16:30 (last D). Wall-clock = 11.5h, under 14.",
      hours: "Toward 14 today = 11.5h (today's shift only). Toward 11 = 10h driving today.",
      violation: "No 11/14 violation TODAY — but the inspector should still cite a 10-hr reset violation (§395.3(a)(1)) because Day 1 ended at 20:00 and Day 2 work began at 05:00, only 9h off. The lesson: today's clock is 'fresh' on paper but the driver wasn't actually entitled to start it.",
    },
  },
  {
    id: "M3",
    prompt: "Day 2 is the focal day. The driver claims a split-sleeper pair across the two days. Identify today's shift bounds and check for violations.",
    priorDays: [
      {
        label: "Day 1 (yesterday)",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "13:00" },     // 6h drive
          { status: "OD",  start: "13:00", end: "14:00" },
          { status: "D",   start: "14:00", end: "16:00" },     // 2h drive (8h total)
          { status: "SB",  start: "16:00", end: "24:00" },     // 8h SB into Day 2
        ],
        summary: "Day 1 ends mid-shift in the SB. Driver is using the split-sleeper provision: the 8h SB block (Day 1 16:00 → Day 2 00:00) is Period A.",
      },
    ],
    log: [
      { status: "D",   start: "00:00", end: "04:00" },        // 4h drive (after Period A)
      { status: "OFF", start: "04:00", end: "06:00" },        // 2h OFF — Period B
      { status: "OD",  start: "06:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "10:00" },        // 3h drive — new shift after pair completes
      { status: "OFF", start: "10:00", end: "24:00" },
    ],
    validSplit: false,    // no NEW split started TODAY — yesterday's pair completes at 04:00
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    // Today's shift = continuation of yesterday's pair until 04:00, then NEW shift
    // We focus the inspector on the CURRENT (continuation) shift bounds.
    counted14Hours: 4,    // 00:00 → 04:00 of today (yesterday's pair-shift continuation)
    counted11Hours: 4,
    shiftStartMin: 0,           // shift continuation starts at midnight (was already running)
    shiftEndMin: 4 * 60,        // ends at 04:00 (Period B begins)
    explanation: {
      qualifying: "Day 1's 8h SB (16:00 Day 1 → 00:00 Day 2) is Period A. Today's 2h OFF (04:00 → 06:00) is Period B. Combined = 10h, satisfies §395.1(g)(1)(ii). Pair completes at 06:00 Day 2.",
      shift: "Today's shift continuation: STARTS at 00:00 (carried over from Day 1's pair-shift mid-Period-A) — actually CVSA rule says shift starts at end of FIRST qualifying segment. Period A (8h SB) ENDS at 00:00 Day 2, so today's shift START = 00:00. Shift ENDS at 04:00 (beginning of Period B). After 06:00 (pair complete), a NEW shift begins with fresh 11/14 — the 07:00-10:00 driving is in that new shift, not today's pair-shift.",
      hours: "Counted toward this pair-shift's 14 = 4h (00:00 → 04:00). Toward 11 = 4h driving. Both well under limits.",
      violation: "No violation. The split-sleeper pair successfully reset the clocks — today's pair-shift was only 4h and the driver started a fresh shift after Period B completed.",
    },
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   EIGHTDAY_SCENARIOS — full 8-day inspection-period scenarios. The page
   renders a 7-day prior-recap table (Day -7 .. Day -1, on-duty hours) above
   the focal day's ELD log, plus a mini 70-hr cycle calculator that the user
   can plug numbers into without affecting the real /hours-of-service tool.

   Shape additions:
     priorRecap: [{ label, onDutyHours, note? }, ...]   // 7 entries (Day -7 .. Day -1)
     cycleLimit: 70 | 60                                // for the mini calc
     today refers to the scenario's `log` (focal day).
   ══════════════════════════════════════════════════════════════════════════ */
export const EIGHTDAY_SCENARIOS = [
  {
    id: "E1",
    prompt: "Today is Day 8. Use the mini 70-hr calculator + identify today's shift and check for 11/14 violations.",
    cycleLimit: 70,
    priorRecap: [
      { label: "Day −7", onDutyHours: 9 },
      { label: "Day −6", onDutyHours: 8 },
      { label: "Day −5", onDutyHours: 10 },
      { label: "Day −4", onDutyHours: 9 },
      { label: "Day −3", onDutyHours: 8 },
      { label: "Day −2", onDutyHours: 9 },
      { label: "Day −1", onDutyHours: 7 },
    ],
    cycleNote: "Prior 7 days total 60h on-duty. Driver may use up to 10h on the focal day (70 − 60).",
    log: [
      { status: "OFF", start: "00:00", end: "05:00" },
      { status: "OD",  start: "05:00", end: "06:00" },
      { status: "D",   start: "06:00", end: "10:00" },     // 4h drive
      { status: "OFF", start: "10:00", end: "10:30" },
      { status: "D",   start: "10:30", end: "14:30" },     // 4h drive (8h total)
      { status: "OD",  start: "14:30", end: "15:00" },     // shift end paperwork
      { status: "OFF", start: "15:00", end: "24:00" },
    ],
    todayOnDutyHours: 9,
    cyclePass: true,        // 60 + 9 = 69 ≤ 70
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    counted14Hours: 10,
    counted11Hours: 8,
    shiftStartMin: 5 * 60,
    shiftEndMin: 15 * 60,
    explanation: {
      qualifying: "No split-sleeper.",
      shift: "Shift STARTS 05:00 (first OD). ENDS 15:00 (last OD). 10h wall-clock.",
      hours: "Toward 14 = 10h. Toward 11 = 4 + 4 = 8h.",
      violation: "No 11/14 violation. Today's on-duty total = 9h (1h OD + 4h D + 4h D + 30 min OD = ~9h). 70-hr check: 60 (prior) + 9 (today) = 69h, within 70. Driver is fully compliant.",
    },
  },
  {
    id: "E2",
    prompt: "Use the mini 70-hr calculator. Identify when the driver should have stopped, and whether they violated the 11/14 today.",
    cycleLimit: 70,
    priorRecap: [
      { label: "Day −7", onDutyHours: 11 },
      { label: "Day −6", onDutyHours: 10 },
      { label: "Day −5", onDutyHours: 9 },
      { label: "Day −4", onDutyHours: 8 },
      { label: "Day −3", onDutyHours: 9 },
      { label: "Day −2", onDutyHours: 9 },
      { label: "Day −1", onDutyHours: 8 },
    ],
    cycleNote: "Prior 7 days total 64h. Driver only had 6h of on-duty available before hitting 70h (70 − 64 = 6).",
    log: [
      { status: "OFF", start: "00:00", end: "05:00" },
      { status: "OD",  start: "05:00", end: "06:00" },     // 1h OD (1h total today)
      { status: "D",   start: "06:00", end: "11:00" },     // 5h drive (6h total — driver hits 70 here)
      { status: "OFF", start: "11:00", end: "11:30" },
      { status: "D",   start: "11:30", end: "15:30" },     // 4h MORE drive (10h total today, past the 70)
      { status: "OD",  start: "15:30", end: "16:00" },
      { status: "OFF", start: "16:00", end: "24:00" },
    ],
    todayOnDutyHours: 10.5,
    cyclePass: false,       // 64 + 10.5 = 74.5 > 70
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,    // 9h drive is under 11
    violation14: false,    // 11h shift is under 14
    counted14Hours: 11,
    counted11Hours: 9,
    shiftStartMin: 5 * 60,
    shiftEndMin: 16 * 60,
    explanation: {
      qualifying: "No split-sleeper.",
      shift: "Shift STARTS 05:00, ENDS 16:00 — 11h wall-clock, under 14.",
      hours: "Toward 14 = 11h. Toward 11 = 9h driving — both inside today's daily limits.",
      violation: "No 11/14 today, but a 70-hr CYCLE violation. Driver had 6h available; they used 10.5h. Cite §395.3(b)(2). The driver should have stopped working at 11:00 (when cumulative on-duty hit 70 hrs across the 8 days). Roadside takeaway: the 11/14 alone don't tell you if the cycle is busted — always run the 8-day recap.",
    },
  },
  {
    id: "E3",
    prompt: "Use the mini 70-hr calculator and account for the restart. Did the driver violate the cycle today?",
    cycleLimit: 70,
    priorRecap: [
      { label: "Day −7", onDutyHours: 12 },
      { label: "Day −6", onDutyHours: 11 },
      { label: "Day −5", onDutyHours: 10 },
      { label: "Day −4", onDutyHours: 0, note: "34-hr restart taken — 18:00 Day −5 → 04:00 Day −3" },
      { label: "Day −3", onDutyHours: 0 },
      { label: "Day −2", onDutyHours: 11 },
      { label: "Day −1", onDutyHours: 10 },
    ],
    cycleNote: "Driver completed a 34-hr restart that ENDED at 04:00 Day −3 (§395.3(c)). For cycle accounting, only count hours AFTER the restart: Day −2 (11) + Day −1 (10) = 21h. Driver may use up to 49h today (70 − 21).",
    log: [
      { status: "OFF", start: "00:00", end: "05:00" },
      { status: "OD",  start: "05:00", end: "06:00" },
      { status: "D",   start: "06:00", end: "11:00" },     // 5h drive
      { status: "OFF", start: "11:00", end: "11:30" },
      { status: "D",   start: "11:30", end: "15:30" },     // 4h drive (9h total drive)
      { status: "OD",  start: "15:30", end: "16:30" },
      { status: "D",   start: "16:30", end: "18:30" },     // 2h drive (11h total drive — at cap)
      { status: "OD",  start: "18:30", end: "19:00" },
      { status: "OFF", start: "19:00", end: "24:00" },
    ],
    todayOnDutyHours: 13.5,
    cyclePass: true,       // 21 + 13.5 = 34.5h after restart — well under 70
    validSplit: false,
    qualifyingBlockIdx: [],
    violation11: false,
    violation14: false,
    counted14Hours: 14,
    counted11Hours: 11,
    shiftStartMin: 5 * 60,
    shiftEndMin: 19 * 60,
    explanation: {
      qualifying: "No split-sleeper.",
      shift: "Shift STARTS 05:00 (first OD after the prior reset), ENDS 19:00 — exactly 14h, at the limit.",
      hours: "Toward 14 = 14h (at limit). Toward 11 = 5 + 4 + 2 = 11h driving (at limit).",
      violation: "No violation. The 34-hr restart at 04:00 Day −3 fully reset the 8-day recap (§395.3(c)). After the restart, only Day −2 (11) + Day −1 (10) = 21h count toward the rolling 70h. Today's 13.5h on-duty brings the post-restart total to 34.5h — well under 70.",
    },
  },
];
