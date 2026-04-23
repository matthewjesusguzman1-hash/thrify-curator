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
  { id: "ds5",  situation: "Sitting in the passenger seat reading a road map for a co-driver for 4 hours (drove before and will drive immediately after).", answer: "OD" },
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
        body: "Time resting inside a qualifying sleeper berth. Counts toward the 10-hour reset AND is the only status that can anchor a valid 7+3 or 8+2 split.",
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
    intro: "Once a driver comes on-duty after a 10-hr rest, they have a 14-consecutive-hour window in which any driving must occur. The window runs on wall-clock time — it does NOT pause for breaks.",
    sections: [
      {
        heading: "Window opens at first on-duty",
        body: "The clock starts the moment the driver goes on-duty (D or OD) — not when they begin driving. A pre-trip inspection at 06:00 means the window closes at 20:00 even if the driver doesn't leave the yard until 07:00.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "OD",  start: "06:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "11:00" },
          { status: "OD",  start: "11:00", end: "13:00" },
          { status: "D",   start: "13:00", end: "19:00" },
          { status: "OFF", start: "19:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(20), label: "14-hr window", color: "#D4AF37" },
        ],
      },
      {
        heading: "No driving past the 14th hour",
        body: "Once the window closes, driving is prohibited. The driver CAN keep doing on-duty not-driving tasks past the 14th hour — they just can't be behind the wheel.",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "07:00" },
          { status: "D",   start: "07:00", end: "13:00" },
          { status: "OD",  start: "13:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "22:00" },
          { status: "OFF", start: "22:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(7), endMin: MIN(21), label: "Window · driving legal", color: "#D4AF37" },
          { startMin: MIN(21), endMin: MIN(22), label: "VIOLATION", color: "#DC2626" },
        ],
      },
      {
        heading: "Breaks do NOT reset the window",
        body: "Even a 3-hour off-duty break in the middle of the day does not extend the 14-hour window. The window only resets with a full 10 consecutive hours off duty or sleeper (or a valid split).",
        exampleLog: [
          { status: "OFF", start: "00:00", end: "06:00" },
          { status: "D",   start: "06:00", end: "12:00" },
          { status: "OFF", start: "12:00", end: "15:00" },
          { status: "D",   start: "15:00", end: "20:00" },
          { status: "OFF", start: "20:00", end: "24:00" },
        ],
        brackets: [
          { startMin: MIN(6), endMin: MIN(20), label: "14-hr window still closes at 20:00", color: "#D4AF37" },
        ],
      },
    ],
    summary: "When reviewing a log roadside: find the first on-duty entry after a qualifying rest, add 14 hours, and check whether any driving extends past that clock time. The off-duty blocks in between don't count.",
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

