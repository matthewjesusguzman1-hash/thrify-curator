/**
 * English Language Proficiency (ELP) Roadside Assessment data.
 *
 * Source: VERBATIM from the agency's Attachment A (Strategies for Communication
 * with Non-Native Speakers of English and Examples of Driver Interview
 * Questions) and Attachment B (Highway Traffic Signs Examples).
 *
 * The two-test protocol:
 *   1. INTERVIEW (Attachment A) — inspector asks questions in English,
 *      paraphrasing as appropriate. Inspector's overall judgment of whether
 *      the driver can converse / respond in English drives whether to escalate
 *      to the highway sign test.
 *   2. HIGHWAY SIGN RECOGNITION (Attachment B) — inspector picks 4 signs from
 *      the 24 examples and shows each to the driver in turn. The driver must
 *      correctly identify at least 3 of the 4 for the sign portion to be
 *      considered sufficient.
 *
 * Citation: 49 CFR § 391.11(b)(2) — driver does not understand sufficient
 * English to converse with the general public, understand highway traffic
 * signs and signals, respond to official inquiries, and make entries on
 * reports and records.
 */

export const ELP_CITATION = {
  ref: "§391.11(b)(2)",
  title: "Driver lacks sufficient English language proficiency",
  summary:
    "Per 49 CFR §391.11(b)(2), a person shall not drive a commercial motor vehicle unless they can read and speak the English language sufficiently to converse with the general public, to understand highway traffic signs and signals in the English language, to respond to official inquiries, and to make entries on reports and records. A failure of either the interview test or the highway sign test that is documented on this assessment supports a §391.11(b)(2) violation and OOS placement under the current CVSA criteria.",
};

export const ELP_INSTRUCTIONS = `Inspectors may explain in English or any language that can be understood by the driver, that (1) the inspector will conduct their portion of the driver interview in English; (2) as a means of establishing the driver's ability to communicate (speak) in English sufficiently, the inspector will be evaluating the driver's ability to respond in English, so drivers should respond to the driver interview questions in English; and (3) if the inspector determines the driver is unable to respond sufficiently to official inquiries in English, the inspector will cite the driver for a violation of 49 CFR § 391.11(b)(2). The inspector should speak slowly, but naturally; be mindful not to rush the questions; and paraphrase (in English) as appropriate.`;

// Attachment A — General Driver Interview Questions (1-12) + HM-specific (13-14).
// `paraphrases` are the exact alternate phrasings printed on the form.
// `hm` flagged questions are presented under a "Hazardous Material Questions
// (If applicable)" subheader — inspector decides when to ask.
export const ELP_INTERVIEW_QUESTIONS = [
  { num: 1,  key: "trip_origin",      text: "Where did you start your trip today?",
    paraphrases: ['"Where are you coming from?"'] },
  { num: 2,  key: "trip_destination", text: "Where are you driving to today?",
    paraphrases: ['"Where are you going today?"'] },
  { num: 3,  key: "drive_time",       text: "How long have you been driving today?",
    paraphrases: ['"What time did you start today?"', '"What time are you planning to stop driving today?"'] },
  { num: 4,  key: "hauling",          text: "What are you \u201chauling\u201d today?",
    paraphrases: ['"What\u2019s in your truck/trailer?"', '"What cargo do you have in your truck/trailer?"'] },
  { num: 5,  key: "driving_for",      text: "Who are you driving for today?",
    paraphrases: ['"Who are you working for?"', '"Who is paying you for the load?"', '"What is the name of your employer?"'] },
  { num: 6,  key: "company_phone",    text: "What is the telephone number for the trucking company you are driving for today?",
    paraphrases: ['"What telephone number would you call if you had a problem today?"', '"What telephone number at the company would you call if you had an accident today?"'] },
  { num: 7,  key: "license",          text: "Show me your driver\u2019s license please.",
    paraphrases: ['"Show me your CDL."'] },
  { num: 8,  key: "insurance",        text: "Show me the proof of insurance for your vehicles (If applicable).",
    paraphrases: ['"Where is your insurance card?"'] },
  { num: 9,  key: "registration",     text: "Show me the registration for your vehicle(s).",
    paraphrases: ['"Where is your cab card?"', '"Where is your IRP cab card?"'] },
  { num: 10, key: "truck_year",       text: "What year was your truck manufactured?",
    paraphrases: ['"What is the year of your truck?"', '"What year was your truck made?"'] },
  { num: 11, key: "pre_trip",         text: "Did you perform your pre-trip inspection before you started driving today?",
    paraphrases: ['"Did you do your pre-trip inspection today?"'] },
  { num: 12, key: "rods_method",      text: "Do you use time cards, an ELD, or a log book?",
    paraphrases: ['"How do you report the time you worked?"', '"Do you use a time clock at work?"'] },
  { num: 13, key: "hm_materials",     hm: true, text: "What hazardous materials do you have on the truck today?",
    paraphrases: ['"What hazmat do you have on board today?"', '"What hazmat do you have in the truck/trailer?"'] },
  { num: 14, key: "hm_emergency",     hm: true, text: "What telephone number would you call in case of an emergency?",
    paraphrases: ['"What telephone number would you call if you had a problem today?"', '"What telephone number at the company would you call if you had an accident today?"'] },
];

// Attachment B — 24 highway sign examples.
// `category` controls the visual rendering (see SignDisplay.js):
//   regulatory      — white rectangle, black text                   [1, 2, 8, 10, 14, 16, 17, 18, 19, 20, 21]
//   regulatory_xl   — white rectangle, multi-line dense text        [9, 11]
//   regulatory_red  — white rectangle, RED text                     [15]
//   warning         — yellow diamond, black text                    [4, 7]
//   warning_square  — yellow square, black text + optional arrow    [5]
//   construction    — orange diamond, black text                    [3, 6]
//   construction_h  — orange horizontal rectangle, black text       [13]
//   wrongway        — red horizontal rectangle, white text          [12]
//   electronic      — dark navy rectangle, amber/orange text        [22, 23, 24]
// `arrow` (optional): "left" | "right" | "up_right" — embedded arrow icon
// `text` is rendered exactly as labeled on the form.
// `meaning` is the inspector's reference answer (driver should not see).
export const ELP_SIGNS = [
  { id: 1,  category: "regulatory",     text: "SPEED\nLIMIT\n50",                                           meaning: "Speed limit 50 mph" },
  { id: 2,  category: "regulatory",     text: "ONE\nWAY",                          arrow: "left",           meaning: "One-way street (traffic only flows in the direction of the arrow)" },
  { id: 3,  category: "construction",   text: "45 MPH\nSPEED ZONE\nAHEAD",                                  meaning: "Construction speed zone of 45 mph ahead" },
  { id: 4,  category: "warning",        text: "20 MPH\nSPEED ZONE\nAHEAD",                                  meaning: "20 mph speed zone ahead" },
  { id: 5,  category: "warning_square", text: "RUNAWAY\nTRUCK RAMP",               arrow: "up_right",       meaning: "Runaway truck ramp ahead in direction of arrow" },
  { id: 6,  category: "construction",   text: "BE\nPREPARED\nTO STOP",                                      meaning: "Be prepared to stop (work zone)" },
  { id: 7,  category: "warning",        text: "RIGHT\nLANE\nENDS",                                          meaning: "Right lane ends ahead" },
  { id: 8,  category: "regulatory",     text: "KEEP\nRIGHT",                       arrow: "up_right",       meaning: "Keep right of obstruction / divider" },
  { id: 9,  category: "regulatory_xl",  text: "TRUCKS\nOVER 10 TONS\nMUST ENTER\nWEIGH STATION\nNEXT RIGHT", meaning: "Trucks over 10 tons must enter the weigh station at the next right" },
  { id: 10, category: "regulatory",     text: "TRUCKS\n40",                                                 meaning: "Truck speed limit 40 mph" },
  { id: 11, category: "regulatory_xl",  text: "WEIGHT\nLIMIT\n10 TONS",                                     meaning: "Weight limit 10 tons" },
  { id: 12, category: "wrongway",       text: "WRONG\nWAY",                                                 meaning: "Wrong way \u2014 do not enter, turn around" },
  { id: 13, category: "construction_h", text: "ROAD WORK\nNEXT 5 MILES",                                    meaning: "Road work next 5 miles" },
  { id: 14, category: "regulatory",     text: "DO\nNOT\nPASS",                                              meaning: "Do not pass" },
  { id: 15, category: "regulatory_red", text: "NO\nPARKING",                                                meaning: "No parking" },
  { id: 16, category: "regulatory",     text: "SLOW VEHICLES\nMUST USE\nTURN-OUT AHEAD",                    meaning: "Slow vehicles must use the turn-out ahead" },
  { id: 17, category: "regulatory",     text: "RIGHT LANE\nMUST\nTURN RIGHT",                               meaning: "Vehicles in the right lane must turn right" },
  { id: 18, category: "regulatory",     text: "VEHICLES\nOVER\n5 TONS\n45",                                 meaning: "Vehicles over 5 tons \u2014 speed limit 45 mph" },
  { id: 19, category: "regulatory",     text: "NO\nCOMMERCIAL\nVEHICLES",                                   meaning: "No commercial vehicles allowed" },
  { id: 20, category: "regulatory",     text: "ROAD CLOSED\nTO\nTHRU TRAFFIC",                              meaning: "Road closed to through traffic (local access only)" },
  { id: 21, category: "regulatory",     text: "RIGHT LANE\nMUST EXIT",                                      meaning: "Right lane must exit" },
  { id: 22, category: "electronic",     text: "SLOW TRAFFIC AHEAD\nBE PREPARED TO STOP",                    meaning: "Slow traffic ahead \u2014 be prepared to stop (electronic message sign)" },
  { id: 23, category: "electronic",     text: "TURN ON LIGHTS",                                             meaning: "Turn on your headlights (electronic message sign)" },
  { id: 24, category: "electronic",     text: "MAX SPEED 35 MPH",                                           meaning: "Maximum speed 35 mph (electronic message sign)" },
];

// Sign-test rules: inspector picks FOUR signs to administer; the test is
// considered "sufficient" (driver passed the highway-sign portion) when the
// driver correctly identifies at least THREE of the four.
export const ELP_REQUIRED_SIGNS = 4;
export const ELP_SIGN_PASS_THRESHOLD = 3;

export const ELP_PASS_THRESHOLD_NOTE =
  `Show ${ELP_REQUIRED_SIGNS} signs. The driver must correctly identify at least ${ELP_SIGN_PASS_THRESHOLD} of ${ELP_REQUIRED_SIGNS} for the highway-sign portion to be considered sufficient.`;
