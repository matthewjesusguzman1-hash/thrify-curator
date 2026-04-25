/**
 * English Language Proficiency (ELP) Roadside Assessment data.
 *
 * Source: Attachment A (Interview) + Attachment B (Highway Signs) of the
 * agency's ELP roadside assessment form. Used by the ELP help button to
 * walk inspectors through a uniform two-test process and produce a
 * consistent report for attaching to inspections.
 *
 * Citation guidance (per the agency form):
 *   §391.11(b)(2) — driver does not understand sufficient English to
 *   converse with the general public, understand highway traffic signs and
 *   signals, respond to official inquiries, and make entries on reports
 *   and records.
 *
 * The two-test protocol mirrors current FMCSA / CVSA roadside guidance:
 *   1. INTERVIEW TEST first. If the driver clearly passes, no further test.
 *   2. If proficiency is still in question, administer the HIGHWAY SIGN
 *      RECOGNITION TEST (Attachment B). Show signs one at a time; ask the
 *      driver to identify each in English.
 */

// Citation reference used in the report footer + violation suggestion.
export const ELP_CITATION = {
  ref: "§391.11(b)(2)",
  title: "Driver lacks sufficient English language proficiency",
  summary:
    "Per 49 CFR §391.11(b)(2), a person shall not drive a commercial motor vehicle unless they can read and speak the English language sufficiently to converse with the general public, to understand highway traffic signs and signals in the English language, to respond to official inquiries, and to make entries on reports and records. A failure of either the interview test or the highway sign test that is documented on this assessment supports a §391.11(b)(2) violation and OOS placement under the current CVSA criteria.",
};

// Attachment A — Interview Test.
// `key` is used as the answer storage key + data-testid suffix.
// `hm` flagged questions only apply when the driver is hauling hazmat.
export const ELP_INTERVIEW_QUESTIONS = [
  { key: "destination",   text: "Where are you traveling to today?" },
  { key: "origin",        text: "Where did you start your trip today?" },
  { key: "cargo",         text: "What kind of cargo are you hauling?" },
  { key: "drive_time",    text: "How long have you been driving today?" },
  { key: "last_break",    text: "When did you take your last break?" },
  { key: "med_card",      text: "Do you have a current medical card?" },
  { key: "bol_name",      text: "Whose name is on the bill of lading?" },
  { key: "cdl_tenure",    text: "How long have you been a CDL driver?" },
  { key: "pre_trip",      text: "Did you do a pre-trip inspection on this vehicle today?" },
  { key: "gauges",        text: "Are you familiar with all of the gauges and controls in this truck?" },
  { key: "orange_tri",    text: "What does the orange triangle on the back of the trailer mean?" },
  { key: "carrying_hm",   text: "Are you carrying any hazardous materials?" },
  { key: "hm_papers",     text: "Do you have hazardous materials shipping papers?", hm: true },
  { key: "hm_placards",   text: "Do you understand the placards on this vehicle?", hm: true },
];

// Attachment B — Highway sign recognition test (24 signs).
// `text` is a short, plain rendering of what the sign says (used to build a
// simple SVG sign image client-side so we don't ship a bitmap of every sign).
// `category` controls the visual treatment of the SVG sign (color + shape):
//   regulatory   — white square/rectangle, black border, black text
//   warning      — yellow diamond, black border, black text
//   construction — orange diamond, black border, black text
//   guide        — black-on-yellow rectangle (truck-route advisories)
//   special      — special shapes (e.g. WRONG WAY = red rectangle, SPEED LIMIT)
// `meaning` is the short answer the inspector should compare against.
export const ELP_SIGNS = [
  { id: 1,  category: "regulatory",   text: "SPEED\nLIMIT\n50",                                           meaning: "Speed limit 50 mph" },
  { id: 2,  category: "regulatory",   text: "ONE\nWAY",                                                    meaning: "One way street" },
  { id: 3,  category: "warning",      text: "45 MPH\nSPEED ZONE\nAHEAD",                                   meaning: "45 mph speed zone ahead" },
  { id: 4,  category: "warning",      text: "20 MPH\nSPEED ZONE\nAHEAD",                                   meaning: "20 mph speed zone ahead" },
  { id: 5,  category: "guide",        text: "RUNAWAY\nTRUCK RAMP",                                         meaning: "Runaway truck ramp ahead" },
  { id: 6,  category: "warning",      text: "BE\nPREPARED\nTO STOP",                                       meaning: "Be prepared to stop" },
  { id: 7,  category: "warning",      text: "RIGHT\nLANE\nENDS",                                           meaning: "Right lane ends" },
  { id: 8,  category: "regulatory",   text: "KEEP\nRIGHT",                                                 meaning: "Keep right" },
  { id: 9,  category: "regulatory",   text: "TRUCKS\nOVER 10 TONS\nMUST ENTER\nWEIGH STATION\nNEXT RIGHT", meaning: "Trucks over 10 tons must enter weigh station, next right" },
  { id: 10, category: "regulatory",   text: "TRUCKS\n40",                                                  meaning: "Truck speed limit 40 mph" },
  { id: 11, category: "regulatory",   text: "WEIGHT\nLIMIT\n10 TONS",                                      meaning: "Weight limit 10 tons" },
  { id: 12, category: "wrongway",     text: "WRONG\nWAY",                                                  meaning: "Wrong way (do not enter)" },
  { id: 13, category: "construction", text: "ROAD WORK\nNEXT 5 MILES",                                     meaning: "Road work next 5 miles" },
  { id: 14, category: "regulatory",   text: "DO\nNOT\nPASS",                                               meaning: "Do not pass" },
  { id: 15, category: "regulatory",   text: "NO\nPARKING",                                                 meaning: "No parking" },
  { id: 16, category: "regulatory",   text: "SLOW VEHICLES\nMUST USE\nTURN-OUT AHEAD",                     meaning: "Slow vehicles must use turn-out ahead" },
  { id: 17, category: "regulatory",   text: "RIGHT LANE\nMUST\nTURN RIGHT",                                meaning: "Right lane must turn right" },
  { id: 18, category: "regulatory",   text: "VEHICLES\nOVER\n5 TONS\n45",                                  meaning: "Vehicles over 5 tons, speed limit 45 mph" },
  { id: 19, category: "regulatory",   text: "NO\nCOMMERCIAL\nVEHICLES",                                    meaning: "No commercial vehicles" },
  { id: 20, category: "regulatory",   text: "ROAD CLOSED\nTO\nTHRU TRAFFIC",                               meaning: "Road closed to through traffic" },
  { id: 21, category: "regulatory",   text: "RIGHT LANE\nMUST EXIT",                                       meaning: "Right lane must exit" },
  { id: 22, category: "warning",      text: "SLOW TRAFFIC AHEAD\nBE PREPARED TO STOP",                     meaning: "Slow traffic ahead, be prepared to stop" },
  { id: 23, category: "regulatory",   text: "TURN ON LIGHTS",                                              meaning: "Turn on lights" },
  { id: 24, category: "regulatory",   text: "MAX SPEED\n35 MPH",                                           meaning: "Maximum speed 35 mph" },
];

export const ELP_PASS_THRESHOLD_NOTE =
  "There is no fixed minimum-correct-signs threshold in regulation — the inspector documents performance on each sign and uses overall judgment. A driver who cannot meaningfully describe what the sign means (regardless of grammar) on the safety-critical signs (WRONG WAY, BE PREPARED TO STOP, weight limits, low-clearance / no-truck signs) generally fails the highway sign test.";
