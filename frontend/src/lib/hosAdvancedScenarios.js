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
   MULTIDAY_SCENARIOS — 11/14-violation drills across two days. The user
   identifies the work-shift bounds on BOTH days, then identifies any 11- or
   14-hour violations on each day. Three of four scenarios involve OVERNIGHT
   shifts that span midnight — a single shift either started on the prior day
   and ends on Day 1, or starts on Day 1 and ends on Day 2. Showing the prior
   day matters: for overnight shifts the inspector must look BACK to see
   where the shift actually started.

   Shape:
     id, primer, priorDayLog, priorDayNote, nextDayLog, nextDayNote,
     days: [
       {
         label, log,
         shiftStartMin, shiftEndMin,         // bounds of the day's portion of the shift
         continuesFromPrev?, continuesToNext?, // overnight flags
         violation11, violation14,
         regulatoryEndMin?,                  // when the 14-hr cap closed (for explanations)
         explanation: { shift, violation }
       }, ...
     ],
   ══════════════════════════════════════════════════════════════════════════ */
export const MULTIDAY_SCENARIOS = [
  {
    id: "M1",
    primer: "Two-day inspection drill. Identify each work shift's bounds, then call any 11- or 14-hour violation.",
    hints: [
      "Look closely at how Day 1 begins — work that opens immediately at 00:00 with no preceding break often means a shift was already in progress.",
      "When a work block opens right at the day boundary, treat 00:00 as the visible START on that day's grid.",
      "Day 2's shift looks self-contained between the morning OD and the evening off-duty.",
    ],
    priorDayLog: [
      { status: "OFF", start: "00:00", end: "18:00" },
      { status: "OD",  start: "18:00", end: "19:00" },
      { status: "D",   start: "19:00", end: "23:30" },
      { status: "OFF", start: "23:30", end: "24:00" },
    ],
    priorDayNote: "Prior day — driver started an evening run at 18:00. The shift continued into Day 1 (overnight). The shift's actual START is on the prior day.",
    nextDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    nextDayNote: "Day after Day 2 — full off-duty.",
    days: [
      {
        label: "Day 1",
        log: [
          { status: "D",   start: "00:00", end: "04:00" },
          { status: "OD",  start: "04:00", end: "04:30" },
          { status: "OFF", start: "04:30", end: "24:00" },
        ],
        shiftStartMin: 0,
        shiftEndMin: 4 * 60 + 30,
        continuesFromPrev: true,
        violation11: false,
        violation14: false,
        explanation: {
          shift: "Day 1 portion of the overnight shift: STARTS at 00:00 (continued from prior day's 18:00 start) and ENDS at 04:30 (last OD entry). Full overnight shift wall-clock = 18:00 prior → 04:30 Day 1 = 10.5h.",
          violation: "No violation. Drive total across the overnight shift = 4.5h prior + 4h Day 1 = 8.5h (under 11). Wall-clock 10.5h (under 14). After 04:30 the driver took a 19.5h reset before any work on Day 2.",
        },
      },
      {
        label: "Day 2",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:30" },
          { status: "OFF", start: "11:30", end: "12:00" },
          { status: "D",   start: "12:00", end: "16:00" },
          { status: "OFF", start: "16:00", end: "24:00" },
        ],
        shiftStartMin: 6 * 60,
        shiftEndMin: 16 * 60,
        violation11: false,
        violation14: false,
        explanation: {
          shift: "Day 2 has a separate, contained day shift: STARTS at 06:00 (first OD), ENDS at 16:00 (last D). 10h wall-clock, well under 14.",
          violation: "Clean Day 2. Drive 4.5h+4h = 8.5h (under 11). 30-min break at 11:30 satisfies §395.3(a)(3)(ii).",
        },
      },
    ],
  },
  {
    id: "M2",
    primer: "Two-day inspection drill. Identify each work shift's bounds, then call any 11- or 14-hour violation.",
    hints: [
      "If a work block at the end of Day 1 has no §395.3(a)(1) reset before midnight, ask whether it actually ended that day.",
      "Look across the day boundary — does the work pick up at the very start of Day 2 with no qualifying rest gap in between?",
      "A shift that spans midnight is ONE shift — pick the start day for one handle and the end day for the other.",
    ],
    priorDayLog: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "12:00" },
      { status: "OFF", start: "12:00", end: "12:30" },
      { status: "D",   start: "12:30", end: "15:30" },
      { status: "OFF", start: "15:30", end: "24:00" },
    ],
    priorDayNote: "Prior day — driver ran a normal day shift 06:00-15:30 (8h drive). Off-duty from 15:30, giving a 26.5-hr rest before Day 1's evening start.",
    nextDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    nextDayNote: "Day after Day 2 — full off-duty.",
    days: [
      {
        label: "Day 1",
        log: [
          { status: "OFF", start: "00:00", end: "18:00" },
          { status: "OD",  start: "18:00", end: "19:00" },
          { status: "D",   start: "19:00", end: "23:30" },
          { status: "OFF", start: "23:30", end: "24:00" },
        ],
        shiftStartMin: 18 * 60,
        shiftEndMin: 24 * 60,
        continuesToNext: true,
        violation11: false,
        violation14: false,
        explanation: {
          shift: "Day 1 portion of the overnight shift: STARTS at 18:00 (first OD), continues past midnight. END handle goes to 24:00 (right edge) to indicate the shift continues into Day 2.",
          violation: "No violation in Day 1's portion alone — but full overnight shift compliance must be evaluated across BOTH days. Day 1 work segment: 4.5h drive, 5.5h shift wall-clock so far.",
        },
      },
      {
        label: "Day 2",
        log: [
          { status: "D",   start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "05:30" },
          { status: "OFF", start: "05:30", end: "24:00" },
        ],
        shiftStartMin: 0,
        shiftEndMin: 5 * 60 + 30,
        continuesFromPrev: true,
        violation11: false,
        violation14: false,
        explanation: {
          shift: "Day 2 portion of the overnight shift: STARTS at 00:00 (continued from Day 1) and ENDS at 05:30 (last OD). Full overnight shift wall-clock = 18:00 Day 1 → 05:30 Day 2 = 11.5h.",
          violation: "No violation. Drive total across the overnight shift = 4.5h Day 1 + 5h Day 2 = 9.5h (under 11). Wall-clock 11.5h (under 14). The 30-min break at 23:30 covers the 8-cumulative-driving threshold for the next leg.",
        },
      },
    ],
  },
  {
    id: "M3",
    primer: "Two-day inspection drill. Identify each work shift's bounds, then call any 11- or 14-hour violation.",
    hints: [
      "Same overnight question as before — does work continue across midnight without a §395.3(a)(1) reset between Day 1 and Day 2?",
      "Once you've bracketed the full shift across both days, total the wall-clock and the driving minutes.",
      "Compare the totals against §395.3(a)(2) (14-hr cap) and §395.3(a)(3)(i) (11-hr drive cap).",
    ],
    priorDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    priorDayNote: "Prior day — full off-duty rest day. Driver was well-rested heading into Day 1.",
    nextDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    nextDayNote: "Day after Day 2 — driver took a recovery day after the overnight haul.",
    days: [
      {
        label: "Day 1",
        log: [
          { status: "OFF", start: "00:00", end: "15:00" },
          { status: "OD",  start: "15:00", end: "16:00" },
          { status: "D",   start: "16:00", end: "21:00" },
          { status: "OFF", start: "21:00", end: "21:30" },
          { status: "D",   start: "21:30", end: "24:00" },
        ],
        shiftStartMin: 15 * 60,
        shiftEndMin: 24 * 60,
        continuesToNext: true,
        violation11: false,
        violation14: false,
        explanation: {
          shift: "Day 1 portion: STARTS at 15:00 (first OD), continues past midnight. END at 24:00 to indicate continuation into Day 2.",
          violation: "Day 1 alone shows no violation yet (9h into the shift, 7.5h drive). But the shift continues into Day 2 — full compliance must be checked there.",
        },
      },
      {
        label: "Day 2",
        log: [
          { status: "D",   start: "00:00", end: "05:30" },
          { status: "OD",  start: "05:30", end: "06:00" },
          { status: "OFF", start: "06:00", end: "24:00" },
        ],
        shiftStartMin: 0,
        shiftEndMin: 6 * 60,
        continuesFromPrev: true,
        regulatoryEndMin: 5 * 60,
        violation11: true,
        violation14: true,
        explanation: {
          shift: "Day 2 portion: STARTS at 00:00 (continued from Day 1's 15:00 start) and ENDS at 06:00. Full overnight shift wall-clock = 15:00 Day 1 → 06:00 Day 2 = 15h.",
          violation: "BOTH violations on the overnight shift, surfacing on Day 2. 14-hr: shift ran 15h, 1h past §395.3(a)(2) cap (which would have closed at 05:00 Day 2 = 14h after 15:00 start). 11-hr: drive total = 5h + 2.5h + 5.5h = 13h, 2h over §395.3(a)(3)(i). Cap reached at 04:00 Day 2; everything driven after is the violation.",
        },
      },
    ],
  },
  {
    id: "M4",
    primer: "Two-day inspection drill. Identify each work shift's bounds, then call any 11- or 14-hour violation.",
    hints: [
      "Each day appears to have its own self-contained shift — bracket the work on each day before drawing any conclusions.",
      "After bracketing both shifts, measure the off-duty stretch between the end of Day 1's shift and the start of Day 2's shift.",
      "§395.3(a)(1) requires 10 consecutive hours off-duty before a new driving period — anything less is a separate violation worth flagging.",
    ],
    priorDayLog: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "12:00" },
      { status: "OFF", start: "12:00", end: "12:30" },
      { status: "D",   start: "12:30", end: "16:30" },
      { status: "OFF", start: "16:30", end: "24:00" },
    ],
    priorDayNote: "Prior day — clean 9.5h day shift 06:00→16:30. Driver was properly rested before Day 1 — long off-duty stretch between 16:30 prior day and 05:00 Day 1 (12.5h reset).",
    nextDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    nextDayNote: "Day after Day 2 — full off-duty.",
    days: [
      {
        label: "Day 1",
        log: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "11:00" },
          { status: "OFF", start: "11:00", end: "11:30" },
          { status: "D",   start: "11:30", end: "15:30" },
          { status: "OD",  start: "15:30", end: "16:00" },
          { status: "D",   start: "16:00", end: "18:30" },
          { status: "OFF", start: "18:30", end: "24:00" },
        ],
        shiftStartMin: 5 * 60,
        shiftEndMin: 18 * 60 + 30,
        violation11: true,
        violation14: false,
        explanation: {
          shift: "Day 1 shift STARTS at 05:00 (first OD), ENDS at 18:30 (last D). Wall-clock 13.5h, under 14.",
          violation: "11-hr DRIVING violation. Drive total 5h+4h+2.5h = 11.5h. Cap reached at 18:00 — driving 18:00-18:30 is the violation. Wall-clock 13.5h (no 14-hr violation).",
        },
      },
      {
        label: "Day 2",
        log: [
          { status: "OFF", start: "00:00", end: "03:00" },
          { status: "OD",  start: "03:00", end: "04:00" },
          { status: "D",   start: "04:00", end: "08:30" },
          { status: "OFF", start: "08:30", end: "09:00" },
          { status: "D",   start: "09:00", end: "13:00" },
          { status: "OFF", start: "13:00", end: "24:00" },
        ],
        shiftStartMin: 3 * 60,
        shiftEndMin: 13 * 60,
        violation11: false,
        violation14: false,
        explanation: {
          shift: "Day 2 shift STARTS at 03:00 (first OD), ENDS at 13:00 (last D). Wall-clock 10h, under 14.",
          violation: "No 11/14 violation on Day 2 itself (drive 4.5h+4h = 8.5h, wall-clock 10h). HOWEVER — the off-duty between Day 1 (18:30) and Day 2 (03:00) is only 8.5h, short of the §395.3(a)(1) 10-hr reset. That's a SEPARATE reset violation the inspector should also flag (in addition to Day 1's 11-hr violation). The lesson: today's clocks are 'fresh' on paper, but the driver wasn't entitled to start them.",
        },
      },
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   EIGHTDAY_SCENARIOS — full 8-day inspection-period drills. The user steps
   through every one of the 8 days: drag handles to identify each day's shift,
   pick the daily violation type (none / 11 / 14 / 8-hr-break / multiple), then
   after all 8 days run a 70-hr cycle check using a mini calculator (which
   does NOT touch the real /hours-of-service tool), then make the OOS call.

   Scenario shape:
     id, primer, cycleLimit (70 | 60),
     days: [
       {
         label, dayName,
         log,                              // ELD entries for this day
         shiftStartMin, shiftEndMin,
         continuesFromPrev?, continuesToNext?,
         onDutyHours,                      // pre-computed daily on-duty total
         hasSplitSleeper?, splitNote?,     // educational flag
         violation11, violation14, violation8,
         explanation: { shift, violation }
       }, ... (8 entries)
     ],
     cycleViolation, cycleNote,
     oosRequired, oosReason,
   ══════════════════════════════════════════════════════════════════════════ */
export const EIGHTDAY_SCENARIOS = [
  {
    id: "E1",
    primer: "Eight consecutive duty days. Identify each day's shift bounds, catch any 11/14/8-hr violation, run the cycle calc, then make the OOS call. Watch for shifts that span midnight (bracket each day's portion separately) and for split-sleeper days where you may need to identify multiple work segments under §395.1(g)(1)(ii).",
    cycleLimit: 70,
    days: [
      {
        label: "Day −7", dayName: "Mon",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "OFF", start: "11:00", end: "11:30" },
          { status: "D",   start: "11:30", end: "15:00" },
          { status: "OD",  start: "15:00", end: "15:30" },
          { status: "OFF", start: "15:30", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 15 * 60 + 30,
        onDutyHours: 9,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Shift 06:00 → 15:30 (9.5h wall-clock). Drive 4h+3.5h = 7.5h.",
          violation: "Clean. 30-min break at 11:00 satisfies §395.3(a)(3)(ii). 9.5h shift, 7.5h drive — well within 11/14.",
        },
      },
      {
        label: "Day −6", dayName: "Tue",
        log: [
          { status: "OFF", start: "00:00", end: "19:00" },
          { status: "OD",  start: "19:00", end: "20:00" },
          { status: "D",   start: "20:00", end: "23:30" },
          { status: "OFF", start: "23:30", end: "24:00" },
        ],
        shiftStartMin: 19 * 60, shiftEndMin: 23 * 60 + 30,
        continuesToNext: true,
        onDutyHours: 4.5,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Day −6 portion of an OVERNIGHT shift: STARTS at 19:00 (first OD), continues past midnight. Bracket Day −6's portion at 19:00 → 23:30 (last D before the brief 23:30-24:00 OFF).",
          violation: "No violation in Day −6's portion alone (3.5h drive, 4.5h on-duty). The full shift's compliance must be evaluated across both days — see Day −5.",
        },
      },
      {
        label: "Day −5", dayName: "Wed",
        log: [
          { status: "D",   start: "00:00", end: "04:30" },
          { status: "OD",  start: "04:30", end: "05:00" },
          { status: "OFF", start: "05:00", end: "24:00" },
        ],
        shiftStartMin: 0, shiftEndMin: 5 * 60,
        continuesFromPrev: true,
        onDutyHours: 5,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Day −5 portion of the overnight shift: continues from 19:00 Day −6 → ends 05:00 Day −5. Bracket Day −5's portion at 00:00 → 05:00 (last OD).",
          violation: "Full overnight shift wall-clock = 10h, drive total = 8h. Clean. The driver took a 19h reset from 05:00 onward.",
        },
      },
      {
        label: "Day −4", dayName: "Thu",
        log: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "10:00" },
          { status: "OFF", start: "10:00", end: "10:30" },
          { status: "D",   start: "10:30", end: "14:30" },
          { status: "OD",  start: "14:30", end: "15:30" },
          { status: "D",   start: "15:30", end: "18:30" },
          { status: "OD",  start: "18:30", end: "19:30" },
          { status: "OFF", start: "19:30", end: "24:00" },
        ],
        shiftStartMin: 5 * 60, shiftEndMin: 19 * 60 + 30,
        regulatoryEndMin: 19 * 60,
        onDutyHours: 14,
        violation11: false, violation14: true, violation8: false,
        explanation: {
          shift: "Shift 05:00 → 19:30 (14.5h wall-clock). The 14-hr cap from 05:00 closes at 19:00 — the post-drive OD from 18:30-19:30 pushes the shift past the cap.",
          violation: "14-hr VIOLATION. §395.3(a)(2). Drive total 4h+4h+3h = 11h (right at cap, no 11-hr violation). Wall-clock 14.5h, half an hour past §395.3(a)(2). Note: ALL on-duty time (driving + non-driving) counts toward the 14-hr clock.",
        },
      },
      {
        label: "Day −3", dayName: "Fri",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "SB",  start: "11:00", end: "19:00" },
          { status: "D",   start: "19:00", end: "21:00" },
          { status: "OFF", start: "21:00", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 21 * 60,
        acceptableShifts: [
          { start: 6 * 60,  end: 11 * 60, label: "Pairing A — morning shift (06:00 → 11:00)" },
          { start: 19 * 60, end: 21 * 60, label: "Pairing B — evening shift (19:00 → 21:00)" },
        ],
        requireAllPairings: true,
        onDutyHours: 7,
        hasSplitSleeper: true,
        splitNote: "Two valid split-sleeper pairings on this day under §395.1(g)(1)(ii) (rolling-pair interpretation): \n• PAIRING A — OFF 00:00–06:00 (6h ≥2h OFF) + SB 11:00–19:00 (8h ≥7h SB). Bounds the morning work shift 06:00–11:00. \n• PAIRING B — SB 11:00–19:00 (8h Period A — same block, used in second pair) + Fri 21:00 → Sat 06:00 (9h consecutive SB+OFF Period B). Bounds the evening work shift 19:00–21:00.",
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Two distinct work segments inside this 24-hour day, each bracketed by its own qualifying split-sleeper pair: \n• 06:00–11:00 (between Pairing A's OFF and SB rests) — 5h work, 4h drive \n• 19:00–21:00 (between Pairing B's SB and overnight rests) — 2h work, 2h drive \n\nIdentify BOTH pairings — the inspector workflow on a split-sleeper day requires bracketing each work segment, not just the outer envelope.",
          violation: "Clean. The 8h SB block is the linchpin: it serves as Period A in BOTH pairings (rolling-pair interpretation per FMCSA 2020 guidance). Drive total 4h+2h = 6h (under 11), wall-clock work 7h (under 14).",
        },
      },
      {
        label: "Day −2", dayName: "Sat",
        log: [
          { status: "SB",  start: "00:00", end: "02:00" },
          { status: "OFF", start: "02:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:30" },
          { status: "OFF", start: "11:30", end: "12:00" },
          { status: "D",   start: "12:00", end: "16:00" },
          { status: "OFF", start: "16:00", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 16 * 60,
        onDutyHours: 9.5,
        hasSplitSleeper: true,
        splitNote: "00:00–02:00 SB + 02:00–06:00 OFF complete the split-sleeper pair started Fri 21:00 (Period B = 9h consecutive ending 06:00 today). Pair completes at 06:00 — fresh 11/14 clocks today.",
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Period B of yesterday's split-sleeper pair runs 21:00 Fri → 06:00 Sat. Today's shift begins AFTER Period B ends — START at 06:00 (first OD), END at 16:00 (last D). The early-morning SB+OFF count as Period B, NOT toward today's shift bounds.",
          violation: "Clean. 30-min break at 11:30 right before the 8-cumulative-driving threshold. Drive 4.5h+4h = 8.5h, under 11.",
        },
      },
      {
        label: "Day −1", dayName: "Sun",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "12:00" },
          { status: "OD",  start: "12:00", end: "12:30" },
          { status: "D",   start: "12:30", end: "15:30" },
          { status: "OFF", start: "15:30", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 15 * 60 + 30,
        onDutyHours: 9.5,
        violation11: false, violation14: false, violation8: true,
        explanation: {
          shift: "Shift 06:00 → 15:30 (9.5h wall-clock). Drive 5h+3h = 8h.",
          violation: "8-hr break VIOLATION. §395.3(a)(3)(ii). The 12:00–12:30 segment is ON-DUTY (loading, paperwork) — it does NOT satisfy the 30-min break requirement, which requires OFF-duty or SB. Driver hit 8h cumulative drive at 15:00 with no qualifying break.",
        },
      },
      {
        label: "Day 0", dayName: "Mon (today)",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "OFF", start: "11:00", end: "11:30" },
          { status: "D",   start: "11:30", end: "14:00" },
          { status: "OFF", start: "14:00", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 14 * 60,
        onDutyHours: 7,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Shift 06:00 → 14:00 (8h). Drive 4h+2.5h = 6.5h.",
          violation: "Clean today. But cite the past 14-hr violation (Day −4) and 8-hr break violation (Day −1) on the inspection report.",
        },
      },
    ],
    cycleViolation: false,
    cycleNote: "Cumulative on-duty across the 8 days: 9 + 4.5 + 5 + 14 + 7 + 9.5 + 9.5 + 7 = 65.5h. Under the 70-hr cap.",
    oosRequired: false,
    oosReason: "Driver is presently compliant — current day clean, cumulative 65.5h under cap. The Day −4 14-hr violation and Day −1 8-hr break violation are PAST violations the driver is no longer engaged in, so §395.13 does NOT require placing OOS today. Cite both violations on the inspection report and document the overnight shift on Days −6/−5 as a teaching point.",
  },
  {
    id: "E2",
    primer: "Eight consecutive duty days with mixed compliance issues. Practice the full inspector workflow: shift identification, daily 11/14/8-hr violations, the 70-hr cycle math, and the OOS call. Pay attention — some days may use a split-sleeper provision (qualifying SB block paired with off-duty/SB time per §395.1(g)(1)(ii)) that affects how you bracket the work shift.",
    cycleLimit: 70,
    priorDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    priorDayNote: "Day before Day −7 — driver was off-duty all day. The 70-hr cycle window includes only the 8 days shown below.",
    nextDayLog: [
      { status: "OFF", start: "00:00", end: "24:00" },
    ],
    nextDayNote: "Day after Day 0 — driver placed OOS by inspector at the end of Day 0; remained off-duty.",
    days: [
      {
        label: "Day −7", dayName: "Mon",
        log: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "11:00" },
          { status: "OFF", start: "11:00", end: "11:30" },
          { status: "D",   start: "11:30", end: "15:00" },
          { status: "OD",  start: "15:00", end: "15:30" },
          { status: "OFF", start: "15:30", end: "24:00" },
        ],
        shiftStartMin: 5 * 60, shiftEndMin: 15 * 60 + 30,
        onDutyHours: 10,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Shift 05:00 → 15:30 (10.5h). Drive 5h+3.5h = 8.5h.",
          violation: "Clean. Break at 11:00 ahead of the 8-cumulative-driving threshold.",
        },
      },
      {
        label: "Day −6", dayName: "Tue",
        log: [
          { status: "OFF", start: "00:00", end: "04:00" },
          { status: "OD",  start: "04:00", end: "05:00" },
          { status: "D",   start: "05:00", end: "09:00" },
          { status: "OD",  start: "09:00", end: "10:30" },
          { status: "OFF", start: "10:30", end: "11:00" },
          { status: "D",   start: "11:00", end: "14:00" },
          { status: "OD",  start: "14:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "18:30" },
          { status: "OFF", start: "18:30", end: "24:00" },
        ],
        shiftStartMin: 4 * 60, shiftEndMin: 18 * 60 + 30,
        regulatoryEndMin: 18 * 60,
        onDutyHours: 14,
        violation11: false, violation14: true, violation8: false,
        explanation: {
          shift: "Shift 04:00 → 18:30 (14.5h wall-clock). The 14-hr cap from 04:00 closes at 18:00 — driving 18:00–18:30 is the violation.",
          violation: "14-hr VIOLATION. Drive total 4h+3h+3.5h = 10.5h (under 11). Pre-trip OD time + load OD time pushes wall-clock to 14.5h, half an hour past §395.3(a)(2).",
        },
      },
      {
        label: "Day −5", dayName: "Wed",
        log: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "11:00" },
          { status: "OD",  start: "11:00", end: "11:30" },
          { status: "D",   start: "11:30", end: "15:30" },
          { status: "OFF", start: "15:30", end: "24:00" },
        ],
        shiftStartMin: 5 * 60, shiftEndMin: 15 * 60 + 30,
        onDutyHours: 10.5,
        violation11: false, violation14: false, violation8: true,
        explanation: {
          shift: "Shift 05:00 → 15:30 (10.5h wall-clock). Drive 5h+4h = 9h.",
          violation: "8-hr break VIOLATION. §395.3(a)(3)(ii). The 11:00–11:30 segment is ON-DUTY (paperwork) — it does NOT satisfy the 30-min break which must be OFF-duty or SB. Driver hit 8h cumulative drive at 14:30 with no qualifying break.",
        },
      },
      {
        label: "Day −4", dayName: "Thu",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "06:30" },
          { status: "D",   start: "06:30", end: "11:30" },
          { status: "OFF", start: "11:30", end: "12:00" },
          { status: "D",   start: "12:00", end: "16:30" },
          { status: "OD",  start: "16:30", end: "17:00" },
          { status: "D",   start: "17:00", end: "19:00" },
          { status: "OFF", start: "19:00", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 19 * 60,
        onDutyHours: 12.5,
        violation11: true, violation14: false, violation8: false,
        explanation: {
          shift: "Shift 06:00 → 19:00 (13h wall-clock — under 14).",
          violation: "11-hr DRIVING VIOLATION. Drive 5h+4.5h+2h = 11.5h. Cap reached at 18:30 — driving 18:30–19:00 is the violation. §395.3(a)(3)(i).",
        },
      },
      {
        label: "Day −3", dayName: "Fri",
        log: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "10:00" },
          { status: "SB",  start: "10:00", end: "18:00" },
          { status: "D",   start: "18:00", end: "20:00" },
          { status: "OFF", start: "20:00", end: "24:00" },
        ],
        shiftStartMin: 5 * 60, shiftEndMin: 20 * 60,
        acceptableShifts: [
          { start: 5 * 60,  end: 10 * 60, label: "Pairing A — morning shift (05:00 → 10:00)" },
          { start: 18 * 60, end: 20 * 60, label: "Pairing B — evening shift (18:00 → 20:00)" },
        ],
        requireAllPairings: true,
        onDutyHours: 7,
        hasSplitSleeper: true,
        splitNote: "Two valid split-sleeper pairings on this day (rolling-pair interpretation under §395.1(g)(1)(ii) and FMCSA 2020 guidance): \n• PAIRING A — OFF 00:00–05:00 (5h ≥2h OFF) + SB 10:00–18:00 (8h ≥7h SB). Bounds the morning work shift 05:00–10:00. \n• PAIRING B — SB 10:00–18:00 (8h Period A reused) + Fri 20:00 → Sat 06:00 (10h consecutive OFF+SB+OFF Period B). Bounds the evening work shift 18:00–20:00.",
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Two work segments, each bracketed by its own qualifying split-sleeper pair: \n• 05:00–10:00 (between Pairing A's OFF and SB rests) — 5h work, 4h drive \n• 18:00–20:00 (between Pairing B's SB and overnight rests) — 2h work, 2h drive \n\nFor the inspector quick-check, mark START at 05:00 (first OD) and END at 20:00 (last D) covering both work segments.",
          violation: "Clean. 8h SB serves as Period A for BOTH pairings (rolling-pair interpretation). Combined with the morning 5h OFF and the evening 10h consecutive OFF+SB+OFF, every work segment has qualifying rests on both sides. Drive total 4h+2h = 6h (under 11), wall-clock work 7h (under 14).",
        },
      },
      {
        label: "Day −2", dayName: "Sat",
        log: [
          { status: "SB",  start: "00:00", end: "02:00" },
          { status: "OFF", start: "02:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "12:00" },
          { status: "D",   start: "12:00", end: "15:30" },
          { status: "OFF", start: "15:30", end: "24:00" },
        ],
        shiftStartMin: 6 * 60, shiftEndMin: 15 * 60 + 30,
        onDutyHours: 9.5,
        hasSplitSleeper: true,
        splitNote: "00:00–02:00 SB + 02:00–06:00 OFF complete the split-sleeper pair started Fri 20:00 (Period B = 10h consecutive ending 06:00 today). Pair completes at 06:00 — fresh 11/14 clocks today.",
        violation11: false, violation14: false, violation8: true,
        explanation: {
          shift: "Period B of yesterday's split-sleeper pair runs 20:00 Fri → 06:00 Sat. Today's shift begins AFTER Period B ends — START at 06:00 (first OD) and END at 15:30 (last D). The early-morning SB+OFF count as Period B, NOT toward today's shift bounds.",
          violation: "8-hr break VIOLATION. Driver hit 8 cumulative hours of driving without a 30-min off-duty/SB break — §395.3(a)(3)(ii). Break should have been taken before 15:00 (8h after first drive at 07:00).",
        },
      },
      {
        label: "Day −1", dayName: "Sun",
        log: [
          { status: "OFF", start: "00:00", end: "18:00" },
          { status: "OD",  start: "18:00", end: "19:00" },
          { status: "D",   start: "19:00", end: "23:30" },
          { status: "OFF", start: "23:30", end: "24:00" },
        ],
        shiftStartMin: 18 * 60, shiftEndMin: 23 * 60 + 30,
        continuesToNext: true,
        onDutyHours: 5.5,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Day −1 portion of an OVERNIGHT shift: STARTS at 18:00 (first OD), continues past midnight. Bracket Day −1's portion at 18:00 → 23:30 (last D before the brief 23:30-24:00 OFF).",
          violation: "No violation in Day −1's portion alone (4.5h drive, 5.5h on-duty). The full overnight shift's compliance must be evaluated across both days — see Day 0.",
        },
      },
      {
        label: "Day 0", dayName: "Mon (today)",
        log: [
          { status: "D",   start: "00:00", end: "04:30" },
          { status: "OD",  start: "04:30", end: "05:00" },
          { status: "OFF", start: "05:00", end: "24:00" },
        ],
        shiftStartMin: 0, shiftEndMin: 5 * 60,
        continuesFromPrev: true,
        onDutyHours: 5,
        violation11: false, violation14: false, violation8: false,
        explanation: {
          shift: "Day 0 portion of the overnight shift: continues from 18:00 Day −1 → ends 05:00 Day 0. Bracket Day 0's portion at 00:00 → 05:00 (last OD).",
          violation: "Full overnight shift wall-clock = 11h, drive total = 9h. No daily 11/14/8 violation on the overnight itself. BUT — run the cycle calc. The accumulated past violations + cycle total are what matter for the OOS call.",
        },
      },
    ],
    cycleViolation: true,
    cycleNote: "Cumulative on-duty: 10 + 14 + 10.5 + 12.5 + 7 + 9.5 + 5.5 + 5 = 74h. Past the 70-hr cap by 4h. Cite §395.3(b)(2).",
    oosRequired: true,
    oosReason: "Driver has multiple violations (Day −6 14-hr, Day −5 8-hr break, Day −4 11-hr, Day −2 8-hr break) AND is past the 70-hr cycle limit at 74h. §395.13 — driver must be placed OOS until they secure the rest required to bring cumulative hours back under 70 (typically 34-hr restart, or enough off-duty time to roll an old day off the 8-day window).",
  },
];
