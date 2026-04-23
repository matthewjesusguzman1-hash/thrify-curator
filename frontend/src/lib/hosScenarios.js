/**
 * hosScenarios.js — HOS training content for property-carrying CMVs.
 * All citations are 49 CFR Part 395 regulations only.
 */

/* ─── Module 1: Duty Status Classifier ─── 49 CFR §395.2 ─── */
export const DUTY_STATUS_QUIZ = [
  { id: "ds1",  situation: "Vehicle is broken down on the side of the road awaiting help.", answer: "OD" },
  { id: "ds2",  situation: "Supervising the loading of a trailer.",                         answer: "OD" },
  { id: "ds3",  situation: "Sleeping in the sleeper berth.",                                answer: "SB" },
  { id: "ds4",  situation: "On vacation.",                                                  answer: "OFF" },
  { id: "ds5",  situation: "Sitting in the passenger seat reading a road map for a co-driver for 4 hours (drove before and will drive immediately after).", answer: "OD",
    explain: "Time in or on a CMV that's being operated counts as On Duty — the driver is still available to the motor carrier even when not behind the wheel. The only passenger-seat carve-out is up to 3 hours immediately before or after at least 7 consecutive hours in a qualifying sleeper berth (49 CFR §395.1(g)(1)(i)(A)). This driver was on duty before, sat 4 hours in the passenger seat (over the 3-hr max and not paired with ≥7 hrs in the SB), and will drive immediately after — so the full 4 hours is On-Duty not driving.",
    cfr: "49 CFR §395.2 · §395.1(g)(1)(i)(A)" },
  { id: "ds6",  situation: "Driving a personal vehicle to work.",                           answer: "OFF" },
  { id: "ds7",  situation: "Stopped at a weigh station for a vehicle inspection.",          answer: "OD" },
  { id: "ds8",  situation: "At the scene of an accident collecting information.",           answer: "OD" },
  { id: "ds9",  situation: "Driving a tractor across town to pick up a trailer.",           answer: "D"  },
  { id: "ds10", situation: "Working a second job as a real estate agent.",                  answer: "OFF" },
];

/* ─── Module 2: 14-Hour Rule scenarios ─── 49 CFR §395.3(a)(2) ─── */
/* Each scenario is a full 24-hr day log. `violationMinute` is the exact clock
 * time (minutes from midnight) when driving-past-14-hrs first occurs, OR null
 * if no 14-hr violation. Shift starts when first on-duty/driving entry begins. */
export const FOURTEEN_HOUR_SCENARIOS = [
  {
    id: "14-A",
    log: [
      { status: "OFF", start: "00:00", end: "11:00" },
      { status: "D",   start: "11:00", end: "19:00" },
      { status: "OD",  start: "19:00", end: "20:00" },
      { status: "OFF", start: "20:00", end: "24:00" },
    ],
    hasViolation: false,
    answerExplain: "Work shift started at 11:00. The 14-hour window closes at 01:00 the next day. The driver stopped at 20:00 — 9 hours into the shift. No 14-hour violation.",
  },
  {
    id: "14-B",
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "08:00" },
      { status: "D",   start: "08:00", end: "13:00" },
      { status: "OFF", start: "13:00", end: "15:00" },
      { status: "D",   start: "15:00", end: "21:00" },
      { status: "OFF", start: "21:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 20 * 60,
    answerExplain: "Work shift started at 06:00 (first on-duty entry). The 14-hour window closes at 20:00. The driver was still driving from 15:00–21:00 — driving between 20:00 and 21:00 is a violation.",
  },
  {
    id: "14-C",
    log: [
      { status: "OFF", start: "00:00", end: "09:00" },
      { status: "D",   start: "09:00", end: "13:00" },
      { status: "OD",  start: "13:00", end: "17:00" },
      { status: "D",   start: "17:00", end: "20:00" },
      { status: "OD",  start: "20:00", end: "24:00" },
    ],
    hasViolation: false,
    answerExplain: "Shift started at 09:00. The 14-hour window closes at 23:00. No DRIVING after the window closes (driver is On Duty not driving from 20:00–24:00). No 14-hour violation.",
  },
  {
    id: "14-D",
    log: [
      { status: "OFF", start: "00:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "11:00" },
      { status: "OD",  start: "11:00", end: "13:00" },
      { status: "D",   start: "13:00", end: "17:00" },
      { status: "OD",  start: "17:00", end: "19:00" },
      { status: "D",   start: "19:00", end: "23:00" },
      { status: "OFF", start: "23:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 21 * 60,
    answerExplain: "Shift started at 07:00. The 14-hour window closes at 21:00. The driver was driving from 19:00–23:00 — driving between 21:00 and 23:00 is a violation.",
  },
  {
    id: "14-E",
    log: [
      { status: "OFF", start: "00:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "11:00" },
      { status: "OD",  start: "11:00", end: "13:00" },
      { status: "D",   start: "13:00", end: "17:00" },
      { status: "OD",  start: "17:00", end: "18:00" },
      { status: "D",   start: "18:00", end: "22:00" },
      { status: "OFF", start: "22:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 21 * 60,
    answerExplain: "Shift started at 07:00. The 14-hour window closes at 21:00. Driving from 18:00–22:00 means driving between 21:00 and 22:00 is a violation.",
  },
];

/* ─── Module 3: 11-Hour Rule scenarios ─── 49 CFR §395.3(a)(3) ─── */
export const ELEVEN_HOUR_SCENARIOS = [
  {
    id: "11-A",
    log: [
      { status: "OFF", start: "00:00", end: "08:00" },
      { status: "D",   start: "08:00", end: "12:00" },
      { status: "OD",  start: "12:00", end: "14:00" },
      { status: "D",   start: "14:00", end: "17:00" },
      { status: "OD",  start: "17:00", end: "18:00" },
      { status: "D",   start: "18:00", end: "21:00" },
      { status: "OFF", start: "21:00", end: "24:00" },
    ],
    hasViolation: false,
    answerExplain: "Driving segments: 4h + 3h + 3h = 10 hours total. Within the 11-hour limit.",
  },
  {
    id: "11-B",
    log: [
      { status: "OFF", start: "00:00", end: "08:00" },
      { status: "D",   start: "08:00", end: "12:00" },
      { status: "OD",  start: "12:00", end: "14:00" },
      { status: "D",   start: "14:00", end: "18:00" },
      { status: "OD",  start: "18:00", end: "20:00" },
      { status: "D",   start: "20:00", end: "23:00" },
      { status: "OFF", start: "23:00", end: "24:00" },
    ],
    hasViolation: false,
    answerExplain: "Driving segments: 4h + 4h + 3h = 11 hours total — exactly at the limit, not over.",
  },
  {
    id: "11-C",
    log: [
      { status: "OFF", start: "00:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "11:00" },
      { status: "OD",  start: "11:00", end: "13:00" },
      { status: "D",   start: "13:00", end: "17:00" },
      { status: "OD",  start: "17:00", end: "19:00" },
      { status: "D",   start: "19:00", end: "23:00" },
      { status: "OFF", start: "23:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 22 * 60,
    answerExplain: "Driving segments: 4h + 4h + 4h = 12 hours. The 11th hour of driving ends at 22:00 — any driving from 22:00 onward is a violation.",
  },
  {
    id: "11-D",
    log: [
      { status: "OFF", start: "00:00", end: "07:00" },
      { status: "D",   start: "07:00", end: "11:00" },
      { status: "OD",  start: "11:00", end: "13:00" },
      { status: "D",   start: "13:00", end: "17:00" },
      { status: "OD",  start: "17:00", end: "18:00" },
      { status: "D",   start: "18:00", end: "22:00" },
      { status: "OFF", start: "22:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 21 * 60,
    answerExplain: "Driving segments: 4h + 4h + 4h = 12 hours. The 11th hour of driving ends at 21:00 — driving from 21:00 to 22:00 is a violation.",
  },
];

/* ─── Module 4: 30-Minute Break scenarios ─── 49 CFR §395.3(a)(3)(ii) ─── */
export const BREAK_SCENARIOS = [
  {
    id: "BRK-A",
    log: [
      { status: "D",   start: "00:00", end: "08:00" },
      { status: "D",   start: "08:00", end: "12:00" },
      { status: "OFF", start: "12:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 8 * 60,
    answerExplain: "Driver accumulated 8 hours of driving by 08:00 with NO 30-minute interruption. Any driving after 08:00 without a break is a violation.",
  },
  {
    id: "BRK-B",
    log: [
      { status: "D",   start: "00:00", end: "08:00" },
      { status: "OFF", start: "08:00", end: "08:30" },
      { status: "D",   start: "08:30", end: "16:00" },
      { status: "OFF", start: "16:00", end: "24:00" },
    ],
    hasViolation: false,
    answerExplain: "Driver took a 30-minute off-duty break after 8 hours of driving (08:00–08:30). Break requirement satisfied.",
  },
  {
    id: "BRK-C",
    log: [
      { status: "D",   start: "06:00", end: "10:00" },
      { status: "OD",  start: "10:00", end: "11:00" },
      { status: "D",   start: "11:00", end: "15:00" },
      { status: "D",   start: "15:00", end: "17:00" },
      { status: "OFF", start: "17:00", end: "24:00" },
    ],
    hasViolation: false,
    answerExplain: "The 1 hour of On-Duty (not driving) from 10:00–11:00 satisfies the 30-minute break requirement (any non-driving block of 30+ min resets the counter). Total driving after that: 6 hours. No violation.",
  },
];

/* ─── Module 5: 70-Hour Recap ─── 49 CFR §395.3(b)(2) / §395.3(c) ─── */
/* Note: the classic recap test is a rolling 8-day total ≤ 70 hours INCLUDING today.
 * Pre-shift: sum the last 7 days. Available hours today = 70 − that sum. */
export const RECAP_SCENARIOS = [
  {
    id: "REC-A",
    days: [
      { label: "Day −7", onDuty: 10 },
      { label: "Day −6", onDuty: 8 },
      { label: "Day −5", onDuty: 10 },
      { label: "Day −4", onDuty: 9 },
      { label: "Day −3", onDuty: 11 },
      { label: "Day −2", onDuty: 8 },
      { label: "Day −1", onDuty: 9 },
    ],
    todayQuestion: "How many on-duty hours does the driver have available TODAY under the 70/8 rule?",
    answer: 5,
    answerExplain: "Sum of the prior 7 days: 10+8+10+9+11+8+9 = 65. Rolling 8-day total including today cannot exceed 70. Available = 70 − 65 = 5 hours.",
  },
  {
    id: "REC-B",
    days: [
      { label: "Day −7", onDuty: 14 },
      { label: "Day −6", onDuty: 11 },
      { label: "Day −5", onDuty: 10 },
      { label: "Day −4", onDuty: 12 },
      { label: "Day −3", onDuty: 9 },
      { label: "Day −2", onDuty: 8 },
      { label: "Day −1", onDuty: 6 },
    ],
    todayQuestion: "How many on-duty hours does the driver have available TODAY?",
    answer: 0,
    answerExplain: "Sum of the prior 7 days: 14+11+10+12+9+8+6 = 70. Driver has already reached the 70-hour cap — 0 hours available today until the oldest day rolls off tomorrow.",
  },
  {
    id: "REC-C",
    days: [
      { label: "Day −7", onDuty: 12 },
      { label: "Day −6", onDuty: 11 },
      { label: "Day −5", onDuty: 10 },
      { label: "Day −4", onDuty: 34, note: "34-hr restart completed" },
      { label: "Day −3", onDuty: 0 },
      { label: "Day −2", onDuty: 11 },
      { label: "Day −1", onDuty: 10 },
    ],
    todayQuestion: "After the 34-hr restart, how many on-duty hours are available today?",
    answer: 49,
    answerExplain: "The 34-hr restart zeros the recap. Count only hours AFTER the restart completed: Day −2 (11) + Day −1 (10) = 21. Available today = 70 − 21 = 49 hours. (Restart eligibility: 49 CFR §395.3(c))",
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   LEARN_CONTENT — "teach the rule" pages shown BEFORE each quiz.
   Every section pairs a plain-English explanation with an example 24-hr log
   and a set of `brackets` on the ELD grid that call out WHAT counts, so the
   inspector sees the rule the way they'd read a roadside log.
   Each bracket: { startMin, endMin, label, color? }
   ══════════════════════════════════════════════════════════════════════════ */

const MIN = (h, m = 0) => h * 60 + m;

export const LEARN_CONTENT = {
  duty: {
    title: "Duty Status 101",
    cfr: "49 CFR §395.2",
    intro: "Every minute of a driver's day falls into one of four duty statuses. Knowing which is which is the foundation for every other HOS rule. Inspectors read the ELD trace top-to-bottom — OFF, SB, D, OD — then verify the driver classified each block correctly.",
    sections: [
      {
        heading: "Off Duty (OFF)",
        body: "Relieved of ALL responsibility — even for the vehicle. Commuting, running errands, vacation, working a non-CMV second job. Off-duty time counts toward the 10-hour reset.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "15:00" },
          { status: "OFF", start: "15:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(0), endMin: MIN(6), label: "OFF · unpaid", color: "#10B981" },
          { startMin: MIN(15), endMin: MIN(24), label: "OFF · 10-hr reset", color: "#10B981" },
        ],
      },
      {
        heading: "Sleeper Berth (SB)",
        body: "Time resting inside a qualifying sleeper berth. Counts toward the 10-hour reset. Under the split-sleeper provision (§395.1(g)(1)(ii)) the SB can also anchor a valid pairing — ≥7h SB + ≥2h SB/OFF, combined ≥10h — in which case the rest hours are excluded from the 11/14 calculations per §395.1(g)(1)(ii)(E).",
        exampleLog: [
          { status: "D",   start: "06:00", end: "14:00" },
          { status: "SB",  start: "14:00", end: "22:00" },
          { status: "D",   start: "22:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(14), endMin: MIN(22), label: "SB · 8 hrs", color: "#2563EB" },
        ],
      },
      {
        heading: "Driving (D)",
        body: "At the controls of a CMV in operation on a public road. Deadheading a tractor across town to pick up a trailer IS driving. Inching forward in a loading yard on private property isn't — that's On Duty.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "18:00" },
          { status: "OFF", start: "18:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(7), endMin: MIN(18), label: "Driving · 11 hrs", color: "#F59E0B" },
        ],
      },
      {
        heading: "On Duty not Driving (OD)",
        body: "Every other work activity — loading supervision, fueling, vehicle inspection, waiting at a scale, time in the passenger seat ready to resume driving. OD + D combined count toward the 14-hr window and 70-hr recap.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "05:00" },
          { status: "OD",  start: "05:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "13:00" },
          { status: "OD",  start: "13:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "19:00" },
          { status: "OFF", start: "19:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(5), endMin: MIN(7), label: "OD · pre-trip", color: "#DC2626" },
          { startMin: MIN(13), endMin: MIN(15), label: "OD · load check", color: "#DC2626" },
        ],
      },
    ],
    summary: "Rule of thumb — Driving means wheels turning on a public road. On Duty is work but not driving. Sleeper Berth is resting in the bunk. Off Duty is freed from work AND the vehicle.",
  },

  "14hr": {
    title: "14-Hour Window",
    cfr: "49 CFR §395.3(a)(2)",
    intro: "Once a driver comes on-duty after a 10-hour rest, they have 14 TOTAL hours to complete the work shift. The shift is capped at 14 hours of elapsed time — driving and on-duty work both have to be done by the 14th hour. The clock runs on wall-clock time — it does NOT pause for breaks.",
    sections: [
      {
        heading: "Window opens at first on-duty",
        body: "The clock starts the moment the driver goes on-duty (D or OD) — not when they begin driving. A pre-trip inspection at 06:00 means the work shift ends at 20:00 even if the driver doesn't actually pull out of the yard until 07:00.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "OD",  start: "11:00", end: "13:00" },
          { status: "D",   start: "13:00", end: "19:00" },
          { status: "OFF", start: "19:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(20), label: "14-hr work shift", color: "#D4AF37" },
        ],
      },
      {
        heading: "Work shift ends at the 14th hour",
        body: "Once the 14th hour is reached, the driver must stop. Any driving OR on-duty time past the 14th hour is a violation. The only way to start a new work shift is to take a qualifying rest: 10 consecutive hours off-duty/sleeper, OR a valid split-sleeper pairing per §395.1(g)(1)(ii) (≥7h SB + ≥2h SB/OFF, combined ≥10h, in any order — the qualifying rest hours are excluded from the 11/14 calculations under §395.1(g)(1)(ii)(E)).",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "13:00" },
          { status: "OD",  start: "13:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "22:00" },
          { status: "OFF", start: "22:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(7), endMin: MIN(21), label: "Legal work shift · 14h", color: "#D4AF37" },
          { startMin: MIN(21), endMin: MIN(22), label: "VIOLATION", color: "#DC2626" },
        ],
      },
      {
        heading: "Breaks do NOT reset the window",
        body: "Even a 3-hour off-duty break in the middle of the day does not extend the 14-hour work shift. The window only resets with a full 10 consecutive hours off duty or sleeper (or a valid split).",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "12:00" },
          { status: "OFF", start: "12:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "20:00" },
          { status: "OFF", start: "20:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(20), label: "14-hr shift still ends at 20:00", color: "#D4AF37" },
        ],
      },
    ],
    summary: "When reading a log roadside: find the first on-duty entry after a qualifying rest, add 14 hours — that's the end of the work shift. Any driving or on-duty work after that clock time is a violation. The off-duty blocks in between do NOT pause the clock.",
  },

  "11hr": {
    title: "11-Hour Driving Limit",
    cfr: "49 CFR §395.3(a)(3)(i)",
    intro: "Within the 14-hour window, the driver may DRIVE for a cumulative maximum of 11 hours. On-duty not-driving time does NOT count toward this — only the D status does.",
    sections: [
      {
        heading: "Sum the D segments",
        body: "Add up every driving block inside the current shift. The instant the cumulative total exceeds 11 hours, any further driving is a violation.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "10:00" },
          { status: "OD",  start: "10:00", end: "11:00" },
          { status: "D",   start: "11:00", end: "15:00" },
          { status: "OD",  start: "15:00", end: "16:00" },
          { status: "D",   start: "16:00", end: "19:00" },
          { status: "OFF", start: "19:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(10), label: "Drive 1 · 4h", color: "#F59E0B" },
          { startMin: MIN(11), endMin: MIN(15), label: "Drive 2 · 4h (8h total)", color: "#F59E0B" },
          { startMin: MIN(16), endMin: MIN(19), label: "Drive 3 · 3h (11h total — at limit)", color: "#F59E0B" },
        ],
      },
      {
        heading: "One hour over is a violation",
        body: "Even one minute of driving past the 11th hour is an hours-of-service violation. The inspector will mark the exact time the 11th hour ended.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "OD",  start: "11:00", end: "13:00" },
          { status: "D",   start: "13:00", end: "17:00" },
          { status: "OD",  start: "17:00", end: "18:00" },
          { status: "D",   start: "18:00", end: "22:00" },
          { status: "OFF", start: "22:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(7), endMin: MIN(21), label: "11th hour ends at 21:00", color: "#F59E0B" },
          { startMin: MIN(21), endMin: MIN(22), label: "VIOLATION · 1h over", color: "#DC2626" },
        ],
      },
    ],
    summary: "Count only the driving segments. On-duty not-driving time does NOT extend the 11-hour limit, but it does still eat into the 14-hour window.",
  },

  "break": {
    title: "30-Minute Break",
    cfr: "49 CFR §395.3(a)(3)(ii)",
    intro: "After 8 cumulative hours of DRIVING without at least a 30-minute interruption, the driver must stop driving until a 30-minute non-driving interruption is logged. Off-Duty, Sleeper, or On-Duty (not driving) all qualify as interruptions.",
    sections: [
      {
        heading: "The 8-hour driving counter",
        body: "A non-driving block of 30+ minutes resets the counter to zero. The clock is driving-time, not wall-clock time.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "14:00" },
          { status: "OFF", start: "14:00", end: "14:30" },
          { status: "D",   start: "14:30", end: "18:00" },
          { status: "OFF", start: "18:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(14), label: "8h driving · break required", color: "#F59E0B" },
          { startMin: MIN(14), endMin: MIN(14, 30), label: "30-min break", color: "#10B981" },
        ],
      },
      {
        heading: "On-Duty can count as the break",
        body: "A 30+ minute block of On Duty (not driving) — fueling, waiting at a scale, a vehicle inspection — satisfies the rule. Off Duty and Sleeper also qualify. The only thing that does NOT qualify is more Driving.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "10:00" },
          { status: "OD",  start: "10:00", end: "11:00" },
          { status: "D",   start: "11:00", end: "17:00" },
          { status: "OFF", start: "17:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(10), endMin: MIN(11), label: "OD qualifies as break", color: "#10B981" },
        ],
      },
      {
        heading: "Miss the break · violation",
        body: "If the 8-hour cumulative driving counter is reached without a qualifying interruption, any driving after that instant is a 30-min-break violation.",
        exampleLog: [
          { status: "D",   start: "00:00", end: "08:00" },
          { status: "D",   start: "08:00", end: "12:00" },
          { status: "OFF", start: "12:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(0), endMin: MIN(8), label: "8h drive · no break taken", color: "#F59E0B" },
          { startMin: MIN(8), endMin: MIN(12), label: "VIOLATION", color: "#DC2626" },
        ],
      },
    ],
    summary: "Roadside workflow: scan the log for driving runs. Any uninterrupted run > 8 hours without a 30-min non-driving block is a violation.",
  },

  recap: {
    title: "70-Hour Recap (8-Day)",
    cfr: "49 CFR §395.3(b)(2)",
    intro: "A driver operating under the 70/8 rule may not accumulate more than 70 on-duty hours across any rolling 8-day window. To compute this roadside: identify each day's on-duty total (D + OD combined), sum the prior 7 days, and subtract from 70 — that's what's available today.",
    sections: [
      {
        heading: "What counts as on-duty",
        body: "Only D (Driving) and OD (On-Duty not driving) count. OFF and SB do NOT. The brackets below call out the on-duty periods exactly as you'd identify them roadside.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "12:00" },
          { status: "OFF", start: "12:00", end: "12:30" },
          { status: "D",   start: "12:30", end: "16:00" },
          { status: "OD",  start: "16:00", end: "17:00" },
          { status: "OFF", start: "17:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(12), label: "On-duty · 6h", color: "#D4AF37" },
          { startMin: MIN(12, 30), endMin: MIN(17), label: "On-duty · 4.5h", color: "#D4AF37" },
        ],
      },
      {
        heading: "Rolling 8-day total",
        body: "Take today + the last 7 days. If that running sum would exceed 70 hours, the driver is over the 70-hr limit. The oldest day 'rolls off' each midnight, freeing that day's hours back up.",
      },
      {
        heading: "34-hour restart",
        body: "Any 34 consecutive hours off duty (and/or sleeper berth) resets the entire 8-day recap to zero. Count only hours accumulated AFTER the restart completed.",
      },
    ],
    summary: "When reading a driver's recap roadside: for each day in the last 7, sum the brackets drawn around D+OD segments. Add today's on-duty so far. If the sum > 70, it's a violation.",
  },
};

/* ─── Auto-derive bracket highlights for recap-day logs ─── */
/* Given a day's entries, produce brackets around the on-duty (D+OD) runs with a
 * combined-hours label. Keeps the visual consistent with the roadside workflow.*/
export function onDutyBrackets(entries, color = "#D4AF37") {
  if (!entries || entries.length === 0) return [];
  const out = [];
  let runStart = null;
  let runEnd = null;
  const toMin = (hm) => {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  };
  const sorted = [...entries].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (const e of sorted) {
    const isOnDuty = e.status === "D" || e.status === "OD";
    if (isOnDuty) {
      if (runStart === null) runStart = toMin(e.start);
      runEnd = toMin(e.end);
    } else if (runStart !== null) {
      const hrs = (runEnd - runStart) / 60;
      out.push({ startMin: runStart, endMin: runEnd, label: `${hrs % 1 === 0 ? hrs : hrs.toFixed(1)}h on-duty`, color });
      runStart = null;
    }
  }
  if (runStart !== null) {
    const hrs = (runEnd - runStart) / 60;
    out.push({ startMin: runStart, endMin: runEnd, label: `${hrs % 1 === 0 ? hrs : hrs.toFixed(1)}h on-duty`, color });
  }
  return out;
}

/* ─── Synthesize a realistic ELD log for a given total on-duty hours ─── */
/* Used by the 70-hr Recap so each day-card can be rendered as an actual grid
 * with the on-duty segments bracketed, matching how an inspector reads logs.*/
export function synthesizeDayLog(onDutyHours) {
  if (onDutyHours <= 0) {
    return [{ status: "OFF", start: "00:00", end: "24:00" }];
  }
  if (onDutyHours >= 24) {
    // edge case (34-hr restart marker day etc.) — keep it simple
    return [{ status: "OFF", start: "00:00", end: "24:00" }];
  }
  // Mix: 1h OD pre-trip, drive until a 30-min break at the 8-hr mark, drive/OD to total.
  const start = 6 * 60; // 06:00
  const endTotal = start + Math.round(onDutyHours * 60);
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const entries = [{ status: "OFF", start: "00:00", end: fmt(start) }];
  if (onDutyHours <= 1) {
    entries.push({ status: "OD", start: fmt(start), end: fmt(endTotal) });
  } else if (onDutyHours <= 8) {
    entries.push({ status: "OD", start: fmt(start), end: fmt(start + 60) });
    entries.push({ status: "D", start: fmt(start + 60), end: fmt(endTotal) });
  } else {
    // > 8h — insert a 30-min break after the first 8 hours of driving
    entries.push({ status: "OD", start: fmt(start), end: fmt(start + 60) });
    entries.push({ status: "D", start: fmt(start + 60), end: fmt(start + 60 + 8 * 60) });
    entries.push({ status: "OFF", start: fmt(start + 60 + 8 * 60), end: fmt(start + 60 + 8 * 60 + 30) });
    entries.push({ status: "D", start: fmt(start + 60 + 8 * 60 + 30), end: fmt(Math.min(endTotal + 30, 24 * 60)) });
  }
  const last = entries[entries.length - 1];
  if (last.end !== "24:00") {
    entries.push({ status: "OFF", start: last.end, end: "24:00" });
  }
  return entries;
}


/* ══════════════════════════════════════════════════════════════════════════
   EXEMPTIONS — source: NASI-A Part A Module 6 (HOS), organized by roadside
   frequency. Top list is drilled; the rest live under "Others".
   ══════════════════════════════════════════════════════════════════════════ */

export const EXEMPTIONS_TOP = [
  {
    id: "short-haul-150",
    title: "150 Air-Mile Short-Haul",
    cfr: "49 CFR §395.1(e)(1) · CDL · §395.1(e)(2) · non-CDL",
    summary: "Exempts the driver from preparing a RODS and supporting documents roadside — the driver still follows the 11/14/70-hr rules, but recordkeeping shifts to the motor carrier.",
    conditions: [
      "Operates within a 150 air-mile radius of the normal work-reporting location.",
      "Returns to that reporting location each day.",
      "Released from work within 14 hrs of starting and gets ≥10 consecutive hrs off duty. (Non-CDL: ≤14 hrs on-duty 5 of 7 days, ≤16 hrs on the other 2.)",
      "Motor carrier keeps duty status records: report time, release time, total on-duty hrs.",
    ],
  },
  {
    id: "16-hour",
    title: "16-Hour Short-Haul Exception",
    cfr: "49 CFR §395.1(o)",
    summary: "Extends the 14-hr work shift to 16 hrs — one time per 60/70-hr cycle.",
    conditions: [
      "Driver returned to the normal work-reporting location for the last 5 days.",
      "Released from duty with 10 consecutive hrs off by the time the 16th hour is reached.",
      "Can only be used once between required off-duty periods of ≥34 consecutive hrs.",
      "RODS IS required on the day the exception is used (no short-haul exemption from RODS).",
    ],
  },
  {
    id: "adverse-driving",
    title: "Adverse Driving Conditions",
    cfr: "49 CFR §395.1(b)(1)",
    summary: "Allows driving and the 14-hr work shift to be extended by up to 2 hrs when the driver encounters unforeseen adverse conditions.",
    conditions: [
      "Snow, sleet, fog, ice, unusual road/traffic conditions, etc.",
      "Conditions were NOT known (or knowable) before dispatch or the most recent rest break.",
      "Applies to property-carrying CMVs only.",
      "Short-haul drivers may use this to extend driving time; ELD users must annotate the log.",
    ],
  },
  {
    id: "emergency",
    title: "Emergency Conditions",
    cfr: "49 CFR §395.1(b)(2)",
    summary: "Driver may complete the run without violating HOS if an emergency arose and the run would otherwise have been completed legally.",
    conditions: [
      "A genuine emergency situation (not the carrier's dispatch planning).",
      "The run reasonably could have been completed within HOS but for the emergency.",
      "Driver must still drive safely; the exemption doesn't override fatigue rules or CDL standards.",
    ],
  },
  {
    id: "driver-salesperson",
    title: "Driver-Salesperson",
    cfr: "49 CFR §395.1(c) · definition §395.2",
    summary: "Exempt from the 60/70-hr rule (§395.3(b)) as long as weekly driving time stays below 40 hrs.",
    conditions: [
      "Meets the §395.2 definition of a driver-salesperson.",
      "Total DRIVING time does not exceed 40 hrs in any 7 consecutive days.",
      "On-duty time above the 40-hr driving cap still counts against other limits in §395.3.",
    ],
  },
  {
    id: "oilfield",
    title: "Oilfield Operations",
    cfr: "49 CFR §395.1(d)",
    summary: "Waiting time at a well site is off-duty (doesn't burn the 14-hr window). 70/8 can be reset with 24 consecutive hrs off per §395.1(d)(3).",
    conditions: [
      "CMV is used exclusively to transport oilfield equipment (stringing/picking up pipe, servicing wells, etc.) — see §395.1(d).",
      "Specially trained drivers servicing oil wells: waiting time at the well site = Off Duty even if recorded on-duty elsewhere (§395.1(d)(2)).",
      "These CMVs are NOT eligible for the 150-mile short-haul exemption (§395.1(e)).",
    ],
  },
  {
    id: "agricultural",
    title: "Agricultural Operations",
    cfr: "49 CFR §395.1(k)",
    summary: "Transport of non-processed agricultural commodities, livestock, bees, insects, and farm supplies within specified radii is fully exempt from HOS (§395.3) and RODS (§395.8).",
    conditions: [
      "Non-processed food, feed, fiber, or livestock: exempt within 150 air-mi of the COMMODITY SOURCE (exemption continues outside the radius) — §395.1(k)(1).",
      "Livestock/bees/insects: exempt within 150 air-mi of the FINAL DESTINATION — §395.1(k)(2).",
      "Farm supplies wholesale→farm or wholesale→retail: transport time counts as Off Duty (can satisfy the 10-hr reset per §395.3(a)(1)).",
    ],
  },
  {
    id: "covered-farm-vehicle",
    title: "Covered Farm Vehicle",
    cfr: "49 CFR §395.1(s)",
    summary: "Farm-plated vehicles (owner/employee-operated, not-for-hire) have weight-graduated geographic exemption from HOS.",
    conditions: [
      "Straight or articulated truck registered as a farm vehicle.",
      "Operated by the owner or an employee of the farm; not for hire.",
      "≤ 26,001 lbs: exempt anywhere in the U.S.",
      "> 26,001 lbs: exempt inside the state of registration plus 150 miles across any state line.",
    ],
  },
  {
    id: "utility-service",
    title: "Utility Service Vehicle",
    cfr: "49 CFR §395.1(n) · definition §395.2",
    summary: "Vehicles meeting the §395.2 utility-service-vehicle definition are exempt from HOS entirely per §395.1(n).",
    conditions: [
      "Vehicle meets the §395.2 utility-service-vehicle definition (primarily used in construction, operation, or maintenance of utility service infrastructure).",
      "Not used in for-hire carriage.",
    ],
  },
  {
    id: "livestock",
    title: "Livestock 30-Min Break Exemption",
    cfr: "49 CFR §395.1(v)",
    summary: "Interstate livestock transport is exempt from the 30-min break rule (§395.3(a)(3)(ii)) while livestock are loaded on the CMV.",
    conditions: [
      "Interstate transport of livestock by CMV.",
      "Livestock are loaded on the vehicle for the duration the exemption is claimed.",
    ],
  },
];

export const EXEMPTIONS_OTHERS = [
  {
    id: "construction",
    title: "Construction Materials & Equipment",
    cfr: "49 CFR §395.1(m)",
    summary: "Drivers transporting construction materials/equipment may reset the 60/70-hr rule with 24 consecutive hrs off (instead of 34).",
    conditions: ["CMV used primarily to haul construction materials and equipment."],
  },
  {
    id: "motion-picture",
    title: "Motion Picture Production Site",
    cfr: "49 CFR §395.1(p)",
    summary: "Within a 100 air-mi production radius, the 11/14/30-min rules are replaced by a 10-hr drive / 15-hr duty limit after 8 hrs off.",
    conditions: [
      "Transport to/from a motion picture production site.",
      "Within 100 air-mi of the driver's work-reporting location.",
      "Drive ≤10 hrs after 8 consecutive hrs off; no driving after 15 hrs on-duty in the same shift.",
    ],
  },
  {
    id: "alaska",
    title: "State of Alaska",
    cfr: "49 CFR §395.1(h)",
    summary: "Property-carrying Alaska drivers: 15 hrs driving / 20 hrs on-duty after 10 hrs off; 70/7 or 80/8 cycle; no 30-min break rule. Adverse conditions may extend further.",
    conditions: ["Operation within Alaska."],
  },
  {
    id: "hawaii",
    title: "State of Hawaii",
    cfr: "49 CFR §395.1(i)",
    summary: "Hawaii drivers may skip RODS if the motor carrier retains accurate daily on-duty records (report/release times + totals) for 6 months.",
    conditions: [
      "Driver is employed by a motor carrier.",
      "Carrier maintains & retains records for 6 months.",
    ],
  },
  {
    id: "retail-holiday",
    title: "Retail-Store Holiday Deliveries",
    cfr: "49 CFR §395.1(f)",
    summary: "During Dec 10–25 each year, local retail-delivery drivers within 100 air-mi are exempt from 11/14/30-min/60-70 rules.",
    conditions: [
      "Local deliveries from retail stores / catalog businesses to the end consumer.",
      "Within 100 air-mi of the driver's work-reporting location.",
      "ONLY Dec 10–25 inclusive.",
    ],
  },
  {
    id: "bees",
    title: "Commercial Bee Transport",
    cfr: "49 CFR §395.1(u)",
    summary: "Interstate bee transport is exempt from the 30-min break rule if bees are loaded.",
    conditions: ["Interstate transport of commercial bees by CMV with bees loaded."],
  },
  {
    id: "hi-rail",
    title: "Hi-Rail Vehicle",
    cfr: "49 CFR §395.1(w)",
    summary: "Travel time to/from assignment doesn't count against max on-duty, subject to caps.",
    conditions: [
      "Driver of a hi-rail vehicle.",
      "Travel time ≤2 hrs/day and ≤30 hrs/month, logged by the motor carrier.",
      "Records made available to FMCSA/FRA on request.",
    ],
  },
  {
    id: "pipeline-welding",
    title: "Pipeline Welding Truck",
    cfr: "49 CFR §395.1(x) · definition §390.38(b)",
    summary: "Vehicles meeting the §390.38(b) pipeline-welding-truck definition are exempt from HOS.",
    conditions: ["Vehicle meets the §390.38(b) pipeline-welding-truck definition."],
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   SPLIT SLEEPER — Learn scenarios (bracketed qualifying periods + counted
   hours) and Practice scenarios (select qualifying blocks, then answer Q's).
   ══════════════════════════════════════════════════════════════════════════ */

/* Each learn entry is a full 24-hr day log. `qualifyingBrackets` = the green
 * rest brackets (qualifying for a split); `countedBrackets` = gold brackets on
 * spans that count toward the 11 & 14 clocks; `description` explains the math. */
export const SPLIT_LEARN_SCENARIOS = [
  {
    id: "SL1",
    title: "Legal pairing · 7h SB + 3h OFF",
    priorReset: true,
    log: [
      { status: "OD",  start: "00:00", end: "01:00" },
      { status: "D",   start: "01:00", end: "06:00" },
      { status: "SB",  start: "06:00", end: "13:00" }, // Period A · 7h SB
      { status: "D",   start: "13:00", end: "17:00" },
      { status: "OFF", start: "17:00", end: "20:00" }, // Period B · 3h OFF
      { status: "OD",  start: "20:00", end: "24:00" }, // new shift begins after Period B
    ],
    qualifyingBrackets: [
      { startMin: 6 * 60,  endMin: 13 * 60, label: "7h SB ✓", color: "#10B981" },
      { startMin: 17 * 60, endMin: 20 * 60, label: "3h OFF ✓", color: "#10B981" },
    ],
    countedBrackets: [
      { startMin: 13 * 60, endMin: 17 * 60, label: "Counted · 4h (D+OD)", color: "#D4AF37" },
    ],
    shiftMarkers: [
      { min: 13 * 60, kind: "start", label: "Shift START · 13:00 (end of Period A · 7h SB)" },
      { min: 17 * 60, kind: "end", label: "Shift END · 17:00 (beginning of Period B · 3h OFF)" },
    ],
    description: "CVSA Split-Sleeper rule — the work shift STARTS at the END of the FIRST qualifying rest segment and ENDS at the BEGINNING of the SECOND qualifying rest segment (§395.1(g)(1)(ii)). Here Period A (7h SB, 06-13) is the first qualifying segment, so the shift STARTS at 13:00. Period B (3h OFF, 17-20) is the second qualifying segment, so the shift ENDS at 17:00. Counted toward this shift's 11 & 14 = only the D and OD time between 13:00 and 17:00 → 4h driving. The 1h OD + 5h D before 06:00 belong to the PREVIOUS shift; after Period B ends at 20:00, another NEW shift begins.",
    extraExamples: [
      {
        name: "7.5h SB + 2.5h OFF",
        priorReset: true,
        log: [
          { status: "OD",  start: "00:00", end: "01:00" },
          { status: "D",   start: "01:00", end: "06:00" },
          { status: "SB",  start: "06:00", end: "13:30" },
          { status: "D",   start: "13:30", end: "17:30" },
          { status: "OFF", start: "17:30", end: "20:00" },
          { status: "OFF", start: "20:00", end: "24:00" },
        ],
        qualifyingBrackets: [
          { startMin: 6 * 60,  endMin: 13 * 60 + 30, label: "7.5h SB ✓", color: "#10B981" },
          { startMin: 17 * 60 + 30, endMin: 20 * 60, label: "2.5h OFF ✓", color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 13 * 60 + 30, endMin: 17 * 60 + 30, label: "Counted · 4h (D)", color: "#D4AF37" },
        ],
        shiftMarkers: [
          { min: 13 * 60 + 30, kind: "start", label: "Shift START · 13:30 (end of 7.5h SB)" },
          { min: 17 * 60 + 30, kind: "end", label: "Shift END · 17:30 (beginning of 2.5h OFF)" },
        ],
        description: "Non-standard pairing that still qualifies: 7.5h SB + 2.5h OFF = 10h. Any combination meeting the three thresholds (≥7h SB, ≥2h SB/OFF, ≥10h total) is legal under §395.1(g)(1)(ii). CVSA boundaries: shift STARTS at 13:30 (end of first segment · 7.5h SB) and ENDS at 17:30 (beginning of second segment · 2.5h OFF). 4h counted.",
      },
      {
        name: "Short period FIRST, then ≥7h SB",
        priorReset: true,
        log: [
          { status: "OD",  start: "00:00", end: "01:00" },
          { status: "D",   start: "01:00", end: "06:00" },
          { status: "OFF", start: "06:00", end: "09:00" },
          { status: "D",   start: "09:00", end: "14:00" },
          { status: "SB",  start: "14:00", end: "21:00" },
          { status: "OD",  start: "21:00", end: "24:00" },
        ],
        qualifyingBrackets: [
          { startMin: 6 * 60,  endMin: 9 * 60,  label: "3h OFF ✓",  color: "#10B981" },
          { startMin: 14 * 60, endMin: 21 * 60, label: "7h SB ✓",  color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 9 * 60, endMin: 14 * 60, label: "Counted · 5h (D)", color: "#D4AF37" },
        ],
        shiftMarkers: [
          { min: 9 * 60, kind: "start", label: "Shift START · 09:00 (end of 3h OFF · first segment)" },
          { min: 14 * 60, kind: "end", label: "Shift END · 14:00 (beginning of 7h SB · second segment)" },
        ],
        description: "Same legal 7+3 split, but the order is reversed — the 3h OFF came FIRST, then the 7h SB. Order doesn't matter under §395.1(g)(1)(ii). CVSA boundaries: shift STARTS at 09:00 (end of the FIRST qualifying segment · 3h OFF), shift ENDS at 14:00 (beginning of the SECOND qualifying segment · 7h SB). Counted = 5h driving between them.",
      },
    ],
  },
  {
    id: "SL2",
    title: "Legal pairing · 8h SB + 2h OFF (either order)",
    priorReset: true,
    log: [
      { status: "OD",  start: "00:00", end: "01:00" },
      { status: "D",   start: "01:00", end: "06:00" },
      { status: "OFF", start: "06:00", end: "08:00" }, // Period B · 2h OFF (shorter, first)
      { status: "D",   start: "08:00", end: "13:00" },
      { status: "SB",  start: "13:00", end: "21:00" }, // Period A · 8h SB (longer, second)
      { status: "OD",  start: "21:00", end: "24:00" }, // new shift after Period A
    ],
    qualifyingBrackets: [
      { startMin: 6 * 60,  endMin: 8 * 60,  label: "2h OFF ✓",  color: "#10B981" },
      { startMin: 13 * 60, endMin: 21 * 60, label: "8h SB ✓", color: "#10B981" },
    ],
    countedBrackets: [
      { startMin: 8 * 60,  endMin: 13 * 60, label: "Counted · 5h (D)", color: "#D4AF37" },
    ],
    shiftMarkers: [
      { min: 8 * 60, kind: "start", label: "Shift START · 08:00 (end of 2h OFF · first segment)" },
      { min: 13 * 60, kind: "end", label: "Shift END · 13:00 (beginning of 8h SB · second segment)" },
    ],
    description: "CVSA Split-Sleeper rule applied: the shift STARTS at the END of the FIRST qualifying segment (here the 2h OFF at 06-08, so start = 08:00) and ENDS at the BEGINNING of the SECOND qualifying segment (here the 8h SB beginning at 13:00). Order doesn't matter under §395.1(g)(1)(ii) — only chronological order of the two rest segments determines which is 'first' for CVSA purposes. Counted toward this shift's 11 & 14 = 5h driving (08-13). The work before 06:00 belongs to the prior shift; after 21:00 (end of the 8h SB) another new shift begins.",
    extraExamples: [
      {
        name: "9h SB + 2h OFF",
        priorReset: true,
        log: [
          { status: "OD",  start: "00:00", end: "01:00" },
          { status: "D",   start: "01:00", end: "05:00" },
          { status: "OFF", start: "05:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "OD",  start: "11:00", end: "12:00" },
          { status: "SB",  start: "12:00", end: "21:00" },
          { status: "OFF", start: "21:00", end: "24:00" },
        ],
        qualifyingBrackets: [
          { startMin: 5 * 60,  endMin: 7 * 60,  label: "2h OFF ✓",  color: "#10B981" },
          { startMin: 12 * 60, endMin: 21 * 60, label: "9h SB ✓",  color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 7 * 60, endMin: 12 * 60, label: "Counted · 5h (4h D + 1h OD)", color: "#D4AF37" },
        ],
        shiftMarkers: [
          { min: 7 * 60, kind: "start", label: "Shift START · 07:00 (end of 2h OFF · first segment)" },
          { min: 12 * 60, kind: "end", label: "Shift END · 12:00 (beginning of 9h SB · second segment)" },
        ],
        description: "9+2 pairing — SB period doesn't have to be exactly 8h. CVSA boundaries: shift STARTS at 07:00 (end of 2h OFF · first qualifying segment) and ENDS at 12:00 (beginning of 9h SB · second qualifying segment). Counted: 4h D (07-11) + 1h OD (11-12) = 5h on-duty; 4h driving.",
      },
      {
        name: "8h SB FIRST, then 2h OFF",
        priorReset: true,
        log: [
          { status: "OD",  start: "00:00", end: "01:00" },
          { status: "SB",  start: "01:00", end: "09:00" },
          { status: "D",   start: "09:00", end: "14:00" },
          { status: "OD",  start: "14:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "18:00" },
          { status: "OFF", start: "18:00", end: "20:00" },
          { status: "OFF", start: "20:00", end: "24:00" },
        ],
        qualifyingBrackets: [
          { startMin: 1 * 60, endMin: 9 * 60,  label: "8h SB ✓",  color: "#10B981" },
          { startMin: 18 * 60, endMin: 20 * 60, label: "2h OFF ✓", color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 9 * 60, endMin: 18 * 60, label: "Counted · 9h (8h D + 1h OD)", color: "#D4AF37" },
        ],
        shiftMarkers: [
          { min: 9 * 60, kind: "start", label: "Shift START · 09:00 (end of 8h SB · first segment)" },
          { min: 18 * 60, kind: "end", label: "Shift END · 18:00 (beginning of 2h OFF · second segment)" },
        ],
        description: "Same 8+2 legal pairing, but the 8h SB came first chronologically. CVSA boundaries: shift STARTS at 09:00 (end of the FIRST qualifying segment · 8h SB) and ENDS at 18:00 (beginning of the SECOND qualifying segment · 2h OFF). Counted: 5h D (09-14) + 1h OD (14-15) + 3h D (15-18) = 9h on-duty; 8h driving.",
      },
    ],
  },
  {
    id: "SL3",
    title: "Invalid · 6h SB + 4h OFF",
    priorReset: true,
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "SB",  start: "06:00", end: "12:00" }, // 6h — too short
      { status: "D",   start: "12:00", end: "17:00" },
      { status: "OFF", start: "17:00", end: "21:00" }, // 4h — no qualifying SB to pair with
      { status: "D",   start: "21:00", end: "24:00" },
    ],
    qualifyingBrackets: [],
    countedBrackets: [
      { startMin: 6 * 60,  endMin: 12 * 60, label: "6h SB — too short", color: "#DC2626" },
      { startMin: 17 * 60, endMin: 21 * 60, label: "4h OFF — no pair", color: "#DC2626" },
    ],
    shiftMarkers: [
      { min: 6 * 60, kind: "start", label: "Shift start · 06:00 (first D)" },
      { min: 20 * 60, kind: "end", label: "Shift end · 20:00 (14h wall-clock)" },
    ],
    description: "Neither period qualifies under §395.1(g)(1)(ii). The rule requires at least 7 consecutive hours in the Sleeper Berth as one of the two periods — here the only SB block is 6 hours. Because no qualifying SB period exists, no hours get excluded from the 11/14 calculations — every D and OD hour counts the whole day, and the 14-hr clock closes 14 wall-clock hours after the first on-duty entry (§395.3(a)(2)). Shift start = 06:00 (first on-duty). Shift end = 20:00 (14 wall-clock hours later), regardless of the rest blocks in between.",
    extraExamples: [
      {
        name: "6.5h SB + 3.5h OFF — still too short",
        priorReset: true,
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "11:00" },
          { status: "SB",  start: "11:00", end: "17:30" },
          { status: "D",   start: "17:30", end: "20:00" },
          { status: "OFF", start: "20:00", end: "23:30" },
          { status: "D",   start: "23:30", end: "24:00" },
        ],
        qualifyingBrackets: [],
        countedBrackets: [
          { startMin: 11 * 60, endMin: 17 * 60 + 30, label: "6.5h SB — too short", color: "#DC2626" },
          { startMin: 20 * 60, endMin: 23 * 60 + 30, label: "3.5h OFF — no pair", color: "#DC2626" },
        ],
        shiftMarkers: [
          { min: 6 * 60, kind: "start", label: "Shift start · 06:00" },
          { min: 20 * 60, kind: "end", label: "Shift end · 20:00 (14h wall-clock)" },
        ],
        description: "Close but not quite. 6.5h SB falls short of the ≥7h Sleeper-Berth threshold, so the pairing fails even though the combined total is 10 hrs. The 14-hr wall-clock starts at 06:00 (first D) and closes at 20:00 — driving at 23:30 = violation.",
      },
      {
        name: "Two SB blocks but neither is ≥7h",
        priorReset: true,
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "12:00" },
          { status: "SB",  start: "12:00", end: "17:00" },
          { status: "D",   start: "17:00", end: "19:00" },
          { status: "SB",  start: "19:00", end: "24:00" },
        ],
        qualifyingBrackets: [],
        countedBrackets: [
          { startMin: 12 * 60, endMin: 17 * 60, label: "5h SB — too short", color: "#DC2626" },
          { startMin: 19 * 60, endMin: 24 * 60, label: "5h SB — too short", color: "#DC2626" },
        ],
        shiftMarkers: [
          { min: 6 * 60, kind: "start", label: "Shift start · 06:00" },
          { min: 20 * 60, kind: "end", label: "Shift end · 20:00 (14h wall-clock)" },
        ],
        description: "Two sleeper-berth blocks, but neither is ≥7h. The rule isn't 'two periods totaling 10h' — ONE of the two periods must be at least 7h in the Sleeper Berth.",
      },
    ],
  },
  {
    id: "SL4",
    title: "Invalid · 8h OFF + 2h SB (wrong category — no ≥7h in Sleeper Berth)",
    priorReset: true,
    log: [
      { status: "OD",  start: "00:00", end: "02:00" },
      { status: "D",   start: "02:00", end: "08:00" },
      { status: "OFF", start: "08:00", end: "16:00" }, // 8h OFF — but not SB
      { status: "D",   start: "16:00", end: "19:00" },
      { status: "SB",  start: "19:00", end: "21:00" }, // 2h SB — shorter
      { status: "OFF", start: "21:00", end: "24:00" },
    ],
    qualifyingBrackets: [],
    countedBrackets: [
      { startMin: 8 * 60,  endMin: 16 * 60, label: "8h OFF — not sleeper", color: "#DC2626" },
      { startMin: 19 * 60, endMin: 21 * 60, label: "2h SB — no ≥7h SB pair", color: "#DC2626" },
    ],
    shiftMarkers: [
      { min: 0, kind: "start", label: "Shift start · 00:00 (first OD)" },
      { min: 14 * 60, kind: "end", label: "Shift end · 14:00 (14h wall-clock)" },
    ],
    description: "The rule in §395.1(g)(1)(ii) requires ≥7 consecutive hours in the Sleeper Berth as one of the two periods. Here the longer rest is Off Duty (not SB) and the only SB block is 2 hours. Even though the totals look right (8 + 2 = 10), no qualifying SB period exists, so the pairing fails. Because no period qualifies, no hours are excluded from the 11/14 calculations — the driver is treated as having taken no split at all. Shift start = 00:00 (first on-duty). Shift end = 14:00 (14 wall-clock hours later). Any driving or on-duty work after 14:00 is a 14-hr violation.",
    extraExamples: [
      {
        name: "10h straight OFF — no SB anywhere",
        priorReset: true,
        log: [
          { status: "OD",  start: "00:00", end: "01:00" },
          { status: "D",   start: "01:00", end: "06:00" },
          { status: "OFF", start: "06:00", end: "16:00" },
          { status: "D",   start: "16:00", end: "19:00" },
          { status: "OFF", start: "19:00", end: "24:00" },
        ],
        qualifyingBrackets: [],
        countedBrackets: [
          { startMin: 6 * 60, endMin: 16 * 60, label: "10h OFF — not sleeper", color: "#DC2626" },
        ],
        shiftMarkers: [
          { min: 0, kind: "start", label: "Shift start · 00:00" },
          { min: 16 * 60, kind: "end", label: "Shift end · 16:00 (10h OFF reset complete)" },
        ],
        description: "10 consecutive hours Off Duty IS a valid 10-hr reset — but it's NOT a split-sleeper pairing (no SB time). A 10-hr OFF completes the full reset on its own, so the shift ENDS at 16:00 when the 10h OFF finishes. The 3h D + 5h OFF after that is part of a new shift.",
      },
      {
        name: "3h SB + 7h OFF — longer is OFF, not SB",
        priorReset: true,
        log: [
          { status: "OD",  start: "00:00", end: "01:00" },
          { status: "D",   start: "01:00", end: "06:00" },
          { status: "SB",  start: "06:00", end: "09:00" },
          { status: "D",   start: "09:00", end: "14:00" },
          { status: "OFF", start: "14:00", end: "21:00" },
          { status: "D",   start: "21:00", end: "24:00" },
        ],
        qualifyingBrackets: [],
        countedBrackets: [
          { startMin: 6 * 60,  endMin: 9 * 60,  label: "3h SB — too short", color: "#DC2626" },
          { startMin: 14 * 60, endMin: 21 * 60, label: "7h OFF — not sleeper", color: "#DC2626" },
        ],
        shiftMarkers: [
          { min: 0, kind: "start", label: "Shift start · 00:00" },
          { min: 14 * 60, kind: "end", label: "Shift end · 14:00 (14h wall-clock)" },
        ],
        description: "3+7 pairing fails two ways: the SB is too short (<7h) AND the 7h rest is Off Duty, not Sleeper Berth. No split applies, 14-hr wall-clock closes at 14:00, driving at 21:00 is a violation.",
      },
    ],
  },
  {
    id: "SL5",
    title: "Overnight trip · Sleeper Berth crosses midnight",
    multiDay: true,
    days: [
      {
        label: "Day 1 · Mon",
        log: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "12:00" },
          { status: "OFF", start: "12:00", end: "14:00" },  // Period B — 2h OFF qualifying
          { status: "D",   start: "14:00", end: "19:00" },
          { status: "SB",  start: "19:00", end: "24:00" },  // Period A starts — 5h Day 1 portion
        ],
        qualifyingBrackets: [
          { startMin: 12 * 60, endMin: 14 * 60, label: "2h OFF ✓ (Period B · first segment)", color: "#10B981" },
          { startMin: 19 * 60, endMin: 24 * 60, label: "Period A · 5h ⟶ (second segment)", color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 14 * 60, endMin: 19 * 60, label: "Counted · 5h (D)", color: "#D4AF37" },
        ],
        shiftMarkers: [
          { min: 14 * 60, kind: "start", label: "Shift START · 14:00 (end of 2h OFF · first segment)" },
          { min: 19 * 60, kind: "end", label: "Shift END · 19:00 (beginning of SB · second segment)" },
        ],
      },
      {
        label: "Day 2 · Tue",
        log: [
          { status: "SB",  start: "00:00", end: "03:00" },  // Period A continues — 3h Day 2 portion (total 8h)
          { status: "OD",  start: "03:00", end: "04:00" },
          { status: "D",   start: "04:00", end: "10:00" },
          { status: "OFF", start: "10:00", end: "24:00" },  // end-of-trip rest
        ],
        qualifyingBrackets: [
          { startMin: 0, endMin: 3 * 60, label: "⟵ Period A · 3h (8h total SB)", color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 3 * 60,  endMin: 10 * 60, label: "Next shift · 7h (1h OD + 6h D)", color: "#D4AF37" },
        ],
        shiftMarkers: [
          { min: 3 * 60, kind: "start", label: "Next shift START · 03:00 (end of Period A · 8h SB reset)", labelRow: 0 },
          { min: 10 * 60, kind: "end", label: "Next shift END · 10:00 (beginning of 14h OFF reset)", labelRow: 1 },
        ],
      },
    ],
    description: "Overnight trip where the Sleeper Berth period straddles midnight. CVSA Split-Sleeper rule: Period B (the 2h OFF at 12-14 Day 1) is the FIRST qualifying segment, so the work shift STARTS at 14:00 Day 1. Period A (the 8h SB running 19 Day 1 → 03 Day 2) is the SECOND qualifying segment, so the work shift ENDS at 19:00 Day 1 (beginning of that segment). Counted toward this shift's 11 & 14 = just the 5h driving between them (14-19 Day 1). After Period A completes at 03:00 Day 2, that 8h SB plus the earlier 2h OFF equal a full 10h pair-reset — a NEW shift begins at 03:00 Day 2. The 1h OD + 6h D on Day 2 belong to that next shift. Per §395.1(g)(1)(ii)(E) the qualifying rest hours don't count toward the 11 or 14 of either shift.",
    extraExamples: [
      {
        id: "SL5-b",
        multiDay: true,
        name: "Evening start · SB period split by midnight",
        days: [
          {
            label: "Day 1 · Fri",
            log: [
              { status: "OFF", start: "00:00", end: "16:00" },
              { status: "OD",  start: "16:00", end: "17:00" },
              { status: "D",   start: "17:00", end: "21:00" },
              { status: "OFF", start: "21:00", end: "23:30" },
              { status: "D",   start: "23:30", end: "24:00" },
            ],
            qualifyingBrackets: [
              { startMin: 21 * 60, endMin: 23 * 60 + 30, label: "2.5h OFF ✓ (first segment)", color: "#10B981" },
            ],
            countedBrackets: [
              { startMin: 23 * 60 + 30, endMin: 24 * 60, label: "Counted · 0.5h D", color: "#D4AF37" },
            ],
            shiftMarkers: [
              { min: 23 * 60 + 30, kind: "start", label: "Shift START · 23:30 (end of 2.5h OFF · first segment)" },
              { min: 24 * 60 - 1, kind: "continues", label: "Shift continues → Day 2" },
            ],
          },
          {
            label: "Day 2 · Sat",
            log: [
              { status: "D",   start: "00:00", end: "02:00" },
              { status: "SB",  start: "02:00", end: "10:00" },
              { status: "OD",  start: "10:00", end: "11:00" },
              { status: "OFF", start: "11:00", end: "24:00" },
            ],
            qualifyingBrackets: [
              { startMin: 2 * 60, endMin: 10 * 60, label: "8h SB ✓ (second segment)", color: "#10B981" },
            ],
            countedBrackets: [
              { startMin: 0, endMin: 2 * 60, label: "Counted · 2h D", color: "#D4AF37" },
            ],
            shiftMarkers: [
              { min: 2 * 60, kind: "end", label: "Shift END · 02:00 (beginning of 8h SB · second segment)", labelRow: 0 },
            ],
          },
        ],
        description: "Evening-start run where the work shift itself CROSSES midnight under CVSA. First segment = 2.5h OFF (21:00-23:30 Day 1) → shift STARTS at 23:30 Day 1. Second segment = 8h SB (02:00-10:00 Day 2) → shift ENDS at 02:00 Day 2. Counted (D+OD between 23:30 Day 1 and 02:00 Day 2) = 0.5h D + 2h D = 2.5h driving. The 16-21 D/OD block on Day 1 belongs to the PRIOR shift; the 10-11 OD on Day 2 is a new shift (after the 8h SB + prior 2.5h OFF = 10h pair-reset).",
      },
      {
        id: "SL5-c",
        multiDay: true,
        name: "10h straight SB across midnight — NOT a split",
        days: [
          {
            label: "Day 1 · Mon",
            log: [
              { status: "OFF", start: "00:00", end: "06:00" },
              { status: "OD",  start: "06:00", end: "07:00" },
              { status: "D",   start: "07:00", end: "15:00" },
              { status: "OFF", start: "15:00", end: "15:30" },
              { status: "D",   start: "15:30", end: "19:00" },
              { status: "SB",  start: "19:00", end: "24:00" },
            ],
            qualifyingBrackets: [
              { startMin: 19 * 60, endMin: 24 * 60, label: "10h SB reset → (not a split)", color: "#10B981" },
            ],
            countedBrackets: [
              { startMin: 6 * 60, endMin: 15 * 60, label: "Counted · 9h", color: "#D4AF37" },
              { startMin: 15 * 60 + 30, endMin: 19 * 60, label: "+3.5h", color: "#D4AF37" },
            ],
            shiftMarkers: [
              { min: 6 * 60, kind: "start", label: "Shift START · 06:00 (end of prior 10h reset)" },
              { min: 19 * 60, kind: "end", label: "Shift END · 19:00 (beginning of 10h SB reset)" },
            ],
          },
          {
            label: "Day 2 · Tue",
            log: [
              { status: "SB",  start: "00:00", end: "05:00" },
              { status: "OD",  start: "05:00", end: "06:00" },
              { status: "D",   start: "06:00", end: "11:00" },
              { status: "OFF", start: "11:00", end: "24:00" },
            ],
            qualifyingBrackets: [
              { startMin: 0, endMin: 5 * 60, label: "← 10h SB reset ends (not a split)", color: "#10B981" },
            ],
            countedBrackets: [
              { startMin: 5 * 60, endMin: 11 * 60, label: "Next shift · 6h (1h OD + 5h D)", color: "#D4AF37" },
            ],
            shiftMarkers: [
              { min: 5 * 60, kind: "start", label: "Next shift START · 05:00 (end of 10h SB reset)", labelRow: 0 },
              { min: 11 * 60, kind: "end", label: "Next shift END · 11:00 (beginning of 13h OFF reset)", labelRow: 1 },
            ],
          },
        ],
        description: "A 10-hour SB straight through midnight (19:00 Day 1 → 05:00 Day 2) is a complete 10-hr reset on its own — NOT a split. CVSA 10-Hour Continuous Break rule applies: shift STARTS at the end of the prior 10-hr reset (06:00 Day 1) and ENDS at the BEGINNING of the 10-hr reset (19:00 Day 1). After the 10h SB completes at 05:00 Day 2, a new shift begins with a fresh 11/14 — the 1h OD + 5h D on Day 2 are the next shift, ending at 11:00 when the 13h OFF reset begins.",
      },
    ],
  },
];

/* ─── Practice scenarios ─── user (1) selects qualifying rest blocks then
 * answers (2) valid split? (3) 11/14 violation? (4) counted hours.
 * `qualifyingBlockIdx` = the indices of entries that should be selected. */
export const SPLIT_PRACTICE_SCENARIOS = [
  {
    id: "SP1",
    prompt: "Review this driver's day. Tap the rest blocks you believe qualify for a split-sleeper pairing.",
    priorReset: true,
    log: [
      { status: "OD",  start: "00:00", end: "01:00" },
      { status: "D",   start: "01:00", end: "06:00" },
      { status: "SB",  start: "06:00", end: "13:00" }, // idx 2 — qualifying 7h SB
      { status: "D",   start: "13:00", end: "17:00" },
      { status: "OFF", start: "17:00", end: "20:00" }, // idx 4 — qualifying 3h OFF
      { status: "OD",  start: "20:00", end: "24:00" },
    ],
    qualifyingBlockIdx: [2, 4],
    validSplit: true,
    splitType: "7+3",
    violation11: false,
    violation14: false,
    counted14Hours: 4,
    counted11Hours: 4,
    shiftStartMin: 13 * 60,  // 13:00 — end of Period A (7h SB · first qualifying segment)
    shiftEndMin: 17 * 60,    // 17:00 — beginning of Period B (3h OFF · second qualifying segment)
    explanation: {
      qualifying: "This log has exactly one Sleeper Berth block of at least 7 hrs (06-13) and exactly one Off-Duty block of at least 2 hrs (17-20), so the pairing is unambiguous. Under §395.1(g)(1)(ii) the SB period must be ≥7h and the other must be ≥2h SB/OFF, combined ≥10h.",
      shift: "CVSA Split-Sleeper rule: shift STARTS at 13:00 (end of the FIRST qualifying segment — the 7h SB) and ENDS at 17:00 (beginning of the SECOND qualifying segment — the 3h OFF). The 1h OD + 5h D before 06:00 belong to the PRIOR shift; the 4h OD after 20:00 begins ANOTHER new shift.",
      split: "Valid split. The 7h SB meets the minimum sleeper-berth requirement. The 3h OFF meets the minimum 2-hour pair. Combined = 10 hours. Order doesn't matter.",
      violation: "No violation. Between CVSA shift START (13:00) and END (17:00), driving = 4h (under 11) and on-duty = 4h (under 14).",
      hours: "Counted between CVSA shift START (13:00) and END (17:00): 4h D (13-17). Toward 14 = 4h. Toward 11 = 4h.",
    },
  },
  {
    id: "SP2",
    prompt: "Same question — identify the qualifying split-sleeper periods in this log.",
    priorReset: true,
    log: [
      { status: "SB",  start: "00:00", end: "08:00" }, // idx 0 — 8h SB (Period A · first segment)
      { status: "D",   start: "08:00", end: "12:00" },
      { status: "OD",  start: "12:00", end: "13:00" },
      { status: "D",   start: "13:00", end: "21:00" },
      { status: "OFF", start: "21:00", end: "24:00" }, // idx 4 — 3h OFF (Period B · second segment, ≥2h)
    ],
    qualifyingBlockIdx: [0, 4],
    validSplit: true,
    splitType: "8+2",
    violation11: true,
    violation14: false,
    counted14Hours: 13,
    counted11Hours: 12,
    shiftStartMin: 8 * 60,   // 08:00 — end of Period A (8h SB · first qualifying segment)
    shiftEndMin: 21 * 60,    // 21:00 — beginning of Period B (3h OFF · second qualifying segment)
    explanation: {
      qualifying: "The 8h SB from 00:00-08:00 is the ≥7h Sleeper Berth period (first segment). The 3h OFF from 21:00-24:00 satisfies the ≥2h pair (second segment). Combined = 11h, meeting the ≥10h total under §395.1(g)(1)(ii).",
      shift: "CVSA Split-Sleeper rule: shift STARTS at 08:00 (end of the 8h SB · first qualifying segment) and ENDS at 21:00 (beginning of the 3h OFF · second qualifying segment).",
      split: "Valid split — 8h SB satisfies the ≥7h Sleeper Berth requirement and the 3h OFF satisfies the ≥2h pair. Combined = 11 hrs.",
      violation: "11-hr DRIVING VIOLATION. Between CVSA shift START (08:00) and END (21:00), driving = 4h (08-12) + 8h (13-21) = 12h. That exceeds the 11-hr limit. Total on-duty counted = 13h (under 14, so no 14-hr violation).",
      hours: "Counted between CVSA shift START (08:00) and END (21:00): 4h D (08-12) + 1h OD (12-13) + 8h D (13-21) = 13h on-duty. Toward 14 = 13h. Toward 11 (driving only) = 4 + 8 = 12h — 1h over the limit.",
    },
  },
  {
    id: "SP3",
    prompt: "Does this log include any qualifying split-sleeper rest periods?",
    priorReset: true,
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "D",   start: "06:00", end: "12:00" },
      { status: "OFF", start: "12:00", end: "16:00" }, // idx 2 — 4h OFF, not qualifying
      { status: "D",   start: "16:00", end: "20:00" },
      { status: "SB",  start: "20:00", end: "24:00" }, // idx 4 — 4h SB, not qualifying
    ],
    qualifyingBlockIdx: [],
    validSplit: false,
    splitType: null,
    violation11: false,
    violation14: false,
    counted14Hours: 10,
    counted11Hours: 10,
    shiftStartMin: 6 * 60,  // 06:00 — first on-duty (D) after the prior reset
    shiftEndMin: 20 * 60,   // 20:00 — 14h wall-clock limit (no qualifying split applies)
    explanation: {
      qualifying: "Neither rest period qualifies. §395.1(g)(1)(ii) requires ≥7 consecutive hours in the Sleeper Berth — the only SB block here is 4 hrs. Without a qualifying SB period, the 4h OFF has nothing to pair with.",
      shift: "No valid split, so CVSA 14-hr wall-clock rule applies. Shift START = 06:00 (first on-duty after the prior reset). Shift END = 20:00 (14h wall-clock later, §395.3(a)(2)). The 4h OFF and 4h SB in the middle do NOT extend the window.",
      split: "No valid split. Without a qualifying ≥7h SB period, the §395.1(g)(1)(ii)(E) exclusion does not apply.",
      violation: "No 11 or 14 violation. Driving total is exactly 10h (within 11) and the last driving ends at 20:00 — exactly at the 14-hr wall-clock limit, not over.",
      hours: "Toward 14 (D+OD within the 06-20 wall-clock window) = 6h D (06-12) + 4h D (16-20) = 10h. Toward 11 (total driving since prior reset) = 10h.",
    },
  },
  {
    id: "SP4",
    prompt: "Identify the qualifying rest periods on this log.",
    priorReset: true,
    log: [
      { status: "OD",  start: "00:00", end: "01:00" },
      { status: "D",   start: "01:00", end: "06:00" },
      { status: "OFF", start: "06:00", end: "14:00" }, // idx 2 — 8h OFF, NOT qualifying (wrong status)
      { status: "D",   start: "14:00", end: "17:00" },
      { status: "SB",  start: "17:00", end: "19:00" }, // idx 4 — 2h SB, not qualifying alone
      { status: "OFF", start: "19:00", end: "24:00" },
    ],
    qualifyingBlockIdx: [],
    validSplit: false,
    splitType: null,
    violation11: false,
    violation14: true,
    counted14Hours: 6, // D+OD within 14h wall-clock window (00:00-14:00): 1h OD + 5h D
    counted11Hours: 8, // total driving since prior reset: 5h + 3h
    shiftStartMin: 0,       // 00:00 — first OD entry
    shiftEndMin: 14 * 60,   // 14:00 — 14h wall-clock limit (no qualifying split applies)
    explanation: {
      qualifying: "The 8h OFF looks appealing but §395.1(g)(1)(ii) requires ≥7 consecutive hours in the Sleeper Berth — Off Duty doesn't substitute. The 2h SB is too short to be the qualifying Sleeper Berth period on its own. No qualifying rest periods.",
      shift: "No valid split, so CVSA 14-hr wall-clock rule applies. Shift START = 00:00 (first on-duty). Shift END = 14:00 (14 wall-clock hours later, §395.3(a)(2)). Any driving or on-duty work after 14:00 is a 14-hr violation.",
      split: "No valid split. 8 OFF + 2 SB fails because no period has the required ≥7h in the Sleeper Berth.",
      violation: "14-hr VIOLATION. Without a qualifying split, §395.1(g)(1)(ii)(E) does not apply. The 14-hr wall-clock started at 00:00 and closed at 14:00. Driving from 14:00-17:00 is past the 14-hr work-shift limit — violation.",
      hours: "Toward 14 (D+OD within the 00:00-14:00 wall-clock window) = 1h OD (00-01) + 5h D (01-06) = 6h. The 3h D from 14-17 is PAST the 14, not 'counted toward' it — it's the violation itself. Toward 11 (total driving since last 10h reset) = 5h + 3h = 8h.",
    },
  },
];

