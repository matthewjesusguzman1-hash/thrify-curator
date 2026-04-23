/**
 * hosScenarios.js — Training content sourced verbatim from the 2024 NASI-A
 * Participant Manual (CVSA North American Standard Inspection Part A).
 * Every scenario cites its manual page so inspectors can cross-reference.
 * Property-carrying CMV only.
 */

/* Page numbers reference the ORIGINAL 2024 NASI-A Part A Participant Manual.
 * The HOS section spans pp. 93–196. Drill references below use the original
 * PDF page numbers so inspectors can open the exact page in the source doc. */

/* ─── Module 1: Duty Status Classifier ─── NASI-A pp. 96–97 ─── */
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

/* ─── Module 2: 14-Hour Rule scenarios ─── NASI-A pp. 111–113 ─── */
/* Each scenario is a full 24-hr day log. `violationMinute` is the exact clock
 * time (minutes from midnight) when driving-past-14-hrs first occurs, OR null
 * if no 14-hr violation. Shift starts when first on-duty/driving entry begins. */
export const FOURTEEN_HOUR_SCENARIOS = [
  {
    id: "14-A",
    manualRef: "NASI-A p. 111, Example 01-01",
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
    manualRef: "NASI-A p. 111, Example 02-01",
    log: [
      { status: "OFF", start: "00:00", end: "06:00" },
      { status: "OD",  start: "06:00", end: "08:00" },
      { status: "D",   start: "08:00", end: "13:00" },
      { status: "OFF", start: "13:00", end: "15:00" },
      { status: "D",   start: "15:00", end: "21:00" },
      { status: "OFF", start: "21:00", end: "24:00" },
    ],
    hasViolation: true,
    violationMinute: 20 * 60, // 20:00 — the 14-hr window from 06:00 closes at 20:00
    answerExplain: "Work shift started at 06:00 (first on-duty entry). The 14-hour window closes at 20:00. The driver was still driving from 15:00–21:00 — driving between 20:00 and 21:00 is a violation.",
  },
  {
    id: "14-C",
    manualRef: "NASI-A p. 112, Example 03-02",
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
    manualRef: "NASI-A p. 112, Example 04-02",
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
    violationMinute: 21 * 60, // shift start 07:00 + 14h = 21:00
    answerExplain: "Shift started at 07:00. The 14-hour window closes at 21:00. The driver was driving from 19:00–23:00 — driving between 21:00 and 23:00 is a violation.",
  },
  {
    id: "14-E",
    manualRef: "NASI-A p. 113, Example 05-02",
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

/* ─── Module 3: 11-Hour Rule scenarios ─── NASI-A pp. 122–124 ─── */
export const ELEVEN_HOUR_SCENARIOS = [
  {
    id: "11-A",
    manualRef: "NASI-A p. 122, Example 03-01",
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
    manualRef: "NASI-A p. 123, Example 04-01",
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
    manualRef: "NASI-A p. 123, Example 04-02",
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
    violationMinute: 22 * 60, // 11th hour of driving ends at 22:00 (7+4 = 11 hours driven by 22:00)
    answerExplain: "Driving segments: 4h + 4h + 4h = 12 hours. The 11th hour of driving ends at 22:00 — any driving from 22:00 onward is a violation.",
  },
  {
    id: "11-D",
    manualRef: "NASI-A p. 124, Example 05-02",
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

/* ─── Module 4: 30-Minute Break scenarios ─── NASI-A p. 132 ─── */
export const BREAK_SCENARIOS = [
  {
    id: "BRK-A",
    manualRef: "NASI-A p. 132, Example 1",
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
    manualRef: "NASI-A p. 40, Example 2",
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
    manualRef: "NASI-A p. 132, derived scenario",
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

/* ─── Module 5: 70-Hour Recap ─── NASI-A pp. 136–141 ─── */
/* Note: the classic recap test is a rolling 8-day total ≤ 70 hours INCLUDING today.
 * Pre-shift: sum the last 7 days. Available hours today = 70 − that sum. */
export const RECAP_SCENARIOS = [
  {
    id: "REC-A",
    manualRef: "NASI-A pp. 44–46, Driver 1 style",
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
    manualRef: "NASI-A pp. 139–141, Driver 2 style",
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
    manualRef: "NASI-A p. 135 · 34-hr restart drill",
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
    answerExplain: "The 34-hr restart zeros the recap. Count only hours AFTER the restart completed: Day −2 (11) + Day −1 (10) = 21. Available today = 70 − 21 = 49 hours. (Restart eligibility: §395.3(c))",
  },
];

/* ─── Encouragement copy ─── small touches that keep inspectors coming back */
export const BADGES = [
  { id: "first-perfect", label: "First Perfect Drill",     desc: "Get every answer right in a module.",            icon: "🎯" },
  { id: "streak-3",      label: "3-Day Streak",            desc: "Train 3 days in a row.",                          icon: "🔥" },
  { id: "streak-7",      label: "Week-Long Streak",        desc: "Train 7 days in a row.",                          icon: "⭐" },
  { id: "hundred",       label: "100 Correct Answers",     desc: "Nail 100 scenarios total.",                       icon: "💯" },
  { id: "all-modules",   label: "Full Tour",               desc: "Complete every training module at least once.",   icon: "🏆" },
];
