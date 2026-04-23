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
        body: "Time resting inside a qualifying sleeper berth. Counts toward the 10-hour reset AND is the only status that can anchor a valid split-sleeper pairing (≥7h SB paired with ≥2h SB/OFF, combined ≥10h — see §395.1(g)(1)(ii)).",
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
        body: "Once the 14th hour is reached, the driver must stop. Any driving OR on-duty time past the 14th hour is a violation. The only way to start a new work shift is to take a qualifying rest (10 consecutive hours off-duty/sleeper or a valid split-sleeper pairing per §395.1(g)(1)(ii): ≥7h SB + ≥2h SB/OFF, combined ≥10h, in any order).",
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
      { startMin: 0 * 60,  endMin: 6 * 60,  label: "Counted · 6h", color: "#D4AF37" },
      { startMin: 13 * 60, endMin: 17 * 60, label: "Counted · 4h", color: "#D4AF37" },
    ],
    description: "This log has exactly one Sleeper Berth block of at least 7 hrs and exactly one Off-Duty block of at least 2 hrs — so the pairing is unambiguous: 7h SB (06-13) + 3h OFF (17-20). Under §395.1(g)(1)(ii) any combination of ≥7h SB + ≥2h SB/OFF totaling ≥10h qualifies, in any order. Both rest periods pause the 11-hr driving clock (§395.3(a)(3)) AND the 14-hr work-shift clock (§395.3(a)(2)). Only the 6 hrs before Period A and the 4 hrs between A and B count toward the 11 & 14. Hours inside a qualifying rest period are NOT counted. After Period B ends at 20:00, a new work shift begins.",
  },
  {
    id: "SL2",
    title: "Legal pairing · 8h SB + 2h OFF (either order)",
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
      { startMin: 0 * 60,  endMin: 6 * 60,  label: "Counted · 6h", color: "#D4AF37" },
      { startMin: 8 * 60,  endMin: 13 * 60, label: "Counted · 5h", color: "#D4AF37" },
    ],
    description: "Order doesn't matter under §395.1(g)(1)(ii) — the 2h OFF here came BEFORE the 8h SB and the pairing is still valid. The rule requires ≥7h in the Sleeper Berth + ≥2h SB/OFF, combined ≥10h. This log has exactly one ≥7h SB block and exactly one ≥2h OFF block so the pairing is unambiguous. Counted toward 11/14: 6h before Period B + 5h between the two periods = 11h. After Period A ends at 21:00 a new work shift begins, so the 3h OD after doesn't count toward this shift.",
  },
  {
    id: "SL3",
    title: "Invalid · 6h SB + 4h OFF",
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
    description: "Neither period qualifies under §395.1(g)(1)(ii). The rule requires at least 7 consecutive hours in the Sleeper Berth as one of the two periods — here the only SB block is 6 hours. Because no qualifying SB period exists, the 4h OFF has no partner. Both clock windows keep running the whole day — no pause — and the 14-hr clock closes based on first on-duty (§395.3(a)(2)).",
  },
  {
    id: "SL4",
    title: "Invalid · 8h OFF + 2h SB (wrong order)",
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
    description: "The rule in §395.1(g)(1)(ii) requires ≥7 consecutive hours in the Sleeper Berth as one of the two periods. Here the longer rest is Off Duty (not SB) and the only SB block is 2 hours. Even though the totals look right (8 + 2 = 10), no qualifying SB period exists, so the pairing fails. No pause on the 11/14 clocks — they keep running as if no split was taken.",
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
          { startMin: 12 * 60, endMin: 14 * 60, label: "2h OFF ✓ (Period B)", color: "#10B981" },
          { startMin: 19 * 60, endMin: 24 * 60, label: "Period A · 5h ⟶", color: "#10B981" },
        ],
        countedBrackets: [
          { startMin: 6 * 60,  endMin: 12 * 60, label: "Counted · 6h", color: "#D4AF37" },
          { startMin: 14 * 60, endMin: 19 * 60, label: "Counted · 5h", color: "#D4AF37" },
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
          { startMin: 3 * 60,  endMin: 10 * 60, label: "New shift · 7h", color: "#D4AF37" },
        ],
      },
    ],
    description: "An overnight run where the Sleeper Berth period straddles midnight. Day 1 has the 2h OFF at 12:00-14:00 (Period B). The driver then drives 14:00-19:00 and enters the Sleeper Berth at 19:00, continuing across midnight until 03:00 Day 2 — an 8-hour SB block that counts as a single qualifying Period A under §395.1(g)(1)(ii). Both periods pause the 11/14 clocks. Counted toward the shift's 11 & 14 before Period A ends = 6h (Day 1 pre-Period-B) + 5h (between B and A) = 11h total; driving counted = 5h + 5h = 10h. After Period A ends at 03:00 Day 2, a new 14-hr window begins — the 1h OD + 6h D shown on Day 2 (04:00-10:00) start a new shift.",
  },
];

/* ─── Practice scenarios ─── user (1) selects qualifying rest blocks then
 * answers (2) valid split? (3) 11/14 violation? (4) counted hours.
 * `qualifyingBlockIdx` = the indices of entries that should be selected. */
export const SPLIT_PRACTICE_SCENARIOS = [
  {
    id: "SP1",
    prompt: "Review this driver's day. Tap the rest blocks you believe qualify for a split-sleeper pairing.",
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
    counted14Hours: 10,
    counted11Hours: 9,
    explanation: {
      qualifying: "This log has exactly one Sleeper Berth block of at least 7 hrs (06-13) and exactly one Off-Duty block of at least 2 hrs (17-20), so the pairing is unambiguous. Under §395.1(g)(1)(ii) the SB period must be ≥7h and the other must be ≥2h SB/OFF, combined ≥10h.",
      split: "Valid split. The 7h SB meets the minimum sleeper-berth requirement. The 3h OFF meets the minimum 2-hour pair. Combined = 10 hours. Order doesn't matter.",
      violation: "No violation. Counted on-duty (D+OD, excluding the two qualifying rest periods) totals 10 hrs — well within 14. Counted driving totals 9 hrs — within 11.",
      hours: "14-hr counted = 1h OD (00-01) + 5h D (01-06) + 4h D (13-17) = 10h. (Period A pause: 06-13. Period B pause: 17-20.) Driving counted = 5h + 4h = 9h.",
    },
  },
  {
    id: "SP2",
    prompt: "Same question — identify the qualifying split-sleeper periods in this log.",
    log: [
      { status: "OD",  start: "00:00", end: "01:00" },
      { status: "D",   start: "01:00", end: "05:00" },
      { status: "OFF", start: "05:00", end: "07:00" }, // idx 2 — 2h OFF (Period B)
      { status: "D",   start: "07:00", end: "12:00" },
      { status: "OD",  start: "12:00", end: "13:00" },
      { status: "D",   start: "13:00", end: "16:00" },
      { status: "SB",  start: "16:00", end: "24:00" }, // idx 6 — 8h SB (Period A)
    ],
    qualifyingBlockIdx: [2, 6],
    validSplit: true,
    splitType: "8+2",
    violation11: true,
    violation14: false,
    counted14Hours: 14,
    counted11Hours: 12,
    explanation: {
      qualifying: "The 8h SB from 16:00-24:00 is the qualifying Sleeper Berth period. The 2h OFF from 05:00-07:00 meets the minimum 2-hour pair. Only one ≥7h SB and one ≥2h OFF block exist on this log, so the pairing is unambiguous. Order doesn't matter under §395.1(g)(1)(ii).",
      split: "Valid split — 8h SB satisfies the ≥7h Sleeper Berth requirement and the 2h OFF satisfies the minimum pair. Combined = 10 hrs.",
      violation: "11-hr DRIVING VIOLATION. Counted driving time (4h + 5h + 3h = 12h) exceeds the 11-hr limit. 14-hr is exactly at the cap (14h) but not over.",
      hours: "14-hr counted = 1h OD (00-01) + 4h D (01-05) + 5h D (07-12) + 1h OD (12-13) + 3h D (13-16) = 14 hrs. 11-hr counted (driving only) = 4 + 5 + 3 = 12 hrs — 1h over limit.",
    },
  },
  {
    id: "SP3",
    prompt: "Does this log include any qualifying split-sleeper rest periods?",
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
    counted14Hours: 14,
    counted11Hours: 10,
    explanation: {
      qualifying: "Neither rest period qualifies. §395.1(g)(1)(ii) requires ≥7 consecutive hours in the Sleeper Berth — the only SB block here is 4 hrs. Without a qualifying SB period, the 4h OFF has nothing to pair with.",
      split: "No valid split. Because no ≥7h SB period exists, neither clock pauses.",
      violation: "No 11 or 14 violation — but only because total driving is exactly 10 hrs and total on-duty is 14 hrs. Every block counts toward the clocks the whole day.",
      hours: "14-hr counted = full day from first on-duty (06:00) to last entry in shift (24:00) = 18 hrs of wall-clock elapsed … wait, max 14 counted. Actually: counted on-duty = 6h D + 4h D = 10h D + nothing else (OFF and SB don't count toward the 14/11). The 14-hr clock is wall-clock from 06:00 — closes at 20:00. The driver finished driving before 20:00 so no 14-hr violation.",
    },
  },
  {
    id: "SP4",
    prompt: "Identify the qualifying rest periods on this log.",
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
    counted14Hours: 19, // wall clock 00:00 to 19:00 = 19hrs (no qualifying pause)
    counted11Hours: 8,
    explanation: {
      qualifying: "The 8h OFF looks appealing but §395.1(g)(1)(ii) requires ≥7 consecutive hours in the Sleeper Berth — Off Duty doesn't substitute. The 2h SB is too short to be the qualifying Sleeper Berth period on its own. No qualifying rest periods.",
      split: "No valid split. 8 OFF + 2 SB fails because no period has the required ≥7h in the Sleeper Berth.",
      violation: "14-hr VIOLATION. Without a qualifying split, the 14-hr clock started at 00:00 and closed at 14:00. Driving resumed at 14:00 and continued to 17:00 — that's driving past the 14th hour.",
      hours: "14-hr counted: wall-clock from 00:00, so the window closes at 14:00. Driving from 14:00-17:00 is past the window = violation. Driving counted: 5h + 3h = 8h (under 11).",
    },
  },
];

