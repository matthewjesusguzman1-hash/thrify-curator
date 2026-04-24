/**
 * ELD reference content for roadside inspection training.
 * Source: 49 CFR §395.8 (driver duties), §395.15 (AOBRD), §395.16 (malfunctions),
 *         §395.20–§395.38 (ELD technical requirements + registration).
 *
 * Each topic is authored as {heading, body, bullets?} sections. CfrText
 * auto-links any "§395.x" string to eCFR at render time, so citations are
 * embedded in prose, not stored as URLs.
 *
 * The module is intentionally information-first (no quiz/flashcards yet).
 * A flashcard mode can be layered on later by reusing these same sections.
 */

export const ELD_TOPICS = [
  {
    id: "eld-vs-paper",
    title: "ELD vs Paper Log + Exemptions",
    short: "Who must use an ELD, who can run paper",
    cfr: "49 CFR §395.8(a)",
    color: "#2563EB",
    summary:
      "Most property-carrying CMV drivers required to keep a Record of Duty Status (RODS) under §395.8 must use a registered ELD. Paper logs, logging software, or AOBRDs are no longer acceptable general substitutes — but several narrow exemptions still allow paper RODS or no RODS at all.",
    sections: [
      {
        heading: "When an ELD is required",
        body: "An ELD is required whenever a driver is required to keep a RODS under §395.8(a) and doesn't fit one of the exceptions in §395.8(a)(1)(iii). The ELD must be registered and self-certified on the FMCSA ELD registry.",
      },
      {
        heading: "Paper/time-card exemptions (still valid)",
        body: "A driver may still use paper logs OR no log at all under the following exceptions:",
        bullets: [
          "Short-haul 150 air-mile (§395.1(e)(1)) — return to normal work reporting location within 14 hours, duty not over 14, property-carrying. Carrier keeps time records; driver keeps no RODS.",
          "Non-CDL short-haul 150 air-mile (§395.1(e)(2)) — similar pattern for non-CDL operations.",
          "8-day rule (§395.8(a)(1)(iii)(A)(1)) — driver required to prepare a RODS on no more than 8 of any 30 consecutive days may use paper logs.",
          "Pre-model-year 2000 engines (§395.8(a)(1)(iii)(A)(2)) — the ENGINE model year, not the vehicle model year. Verify via the engine plate, not the door jamb sticker.",
          "Driveaway-Towaway (§395.8(a)(1)(iii)(A)(3)) — the vehicle being driven is the commodity being delivered, or the vehicle is part of a shipment of driveaway-towaway operations.",
          "Rented vehicles — §395.1(b)(1) permits paper RODS for rental periods of 8 days or fewer, provided the rental agreement is in the vehicle.",
        ],
      },
      {
        heading: "What to check at roadside",
        body: "Verify the driver qualifies for any claimed exemption. For short-haul, ask for the carrier's time records or ask the driver for start-time, CMV-release time, and return location. For pre-2000 engines, look at the engine's data plate. If a driver claims the 8-day rule, ask to see the prior 30 days — they should have ≤8 RODS days.",
      },
    ],
  },

  {
    id: "display-data",
    title: "Required Data Elements + Roadside Display",
    short: "What the driver must show you",
    cfr: "49 CFR §395.22 · §395.24 · §395.32",
    color: "#059669",
    summary:
      "At roadside, the driver must be able to (a) display the current 24-hour RODS + previous 7 consecutive days on the ELD screen OR a printout, AND (b) transfer the ELD data file to you on request. §395.32 lists every data element the ELD must record and display.",
    sections: [
      {
        heading: "Header information (every day)",
        body: "Every RODS day the ELD prepares must include these header fields — any missing field is a §395.22/§395.32 violation:",
        bullets: [
          "Driver name, driver's license number, and driver's license issuing State.",
          "Carrier name, USDOT number, and main office address.",
          "Shipping document number(s) or name of shipper and commodity.",
          "24-hour period start time (and time zone).",
          "Driver's total miles driven today and total vehicle miles.",
          "Truck tractor and trailer number(s), VIN (auto-populated from engine data).",
          "ELD manufacturer name, model/version, and ELD registration ID (shown on the display or printout header).",
          "Co-driver name(s), if any.",
          "Driver certification of 24-hour period (yes/no/not yet).",
        ],
      },
      {
        heading: "Duty status records",
        body: "Every duty status change must be captured with: time (local clock), location description (auto-generated within 1 mile in urban areas / 10 miles in rural areas), odometer at status change, engine hours, and event sequence ID (§395.32(b)).",
      },
      {
        heading: "Screen vs printout",
        body: "The ELD must offer EITHER a display graph-grid view OR a printout. Both are acceptable at roadside. Older 4-line graph-grids and modern card-style views both satisfy §395.22(h) if all the header + event data is readable. If the driver's ELD cannot produce a display or printout that is readable, cite §395.22(h).",
      },
      {
        heading: "Graph-grid display requirements",
        body: "When the ELD shows a graph-grid, it must display the four duty lines (OFF/SB/D/OD), a 24-hour horizontal axis, remarks, shipping document references, and the total hours in each status (§395.8(f)). Verify the grid visually matches the event list.",
      },
    ],
  },

  {
    id: "data-transfer",
    title: "Data Transfer Methods (eRODS)",
    short: "How to pull the data at roadside",
    cfr: "49 CFR §395.24(a)(2) · §395.34(b)",
    color: "#7C3AED",
    summary:
      "ELDs must offer at least one of two FMCSA-defined transfer method SETS. Telematics set = Web services + Email. Local set = USB 2.0 + Bluetooth. The inspector triggers the transfer by giving the driver a routing code; the file is uploaded to eRODS for review.",
    sections: [
      {
        heading: "Telematics transfer set",
        body: "ELD sends the data file to FMCSA's eRODS web service over the internet AND offers email as a backup. The inspector provides a routing code (via eRODS); the driver enters it on the ELD screen; the ELD transmits the file. Works anywhere the ELD has cell/wifi data.",
        bullets: [
          "Web services: real-time push to eRODS — preferred method.",
          "Email: ELD emails the file to a @fmcsa.dot.gov address; slower but works when web services fail.",
        ],
      },
      {
        heading: "Local transfer set",
        body: "Used when the ELD or the truck has no connectivity. Requires the inspector to physically accept a file from the truck.",
        bullets: [
          "USB 2.0: inspector provides a FMCSA-certified USB stick (or one supplied by the carrier). ELD copies the encrypted file onto it.",
          "Bluetooth: ELD pairs with an inspector's device (phone/tablet with approved software). Short-range, must be within the cab.",
          "**State exception — Nebraska**: Nebraska enforcement does NOT accept local transfer (USB or Bluetooth) from roadside inspectors. Nebraska inspectors use Telematics transfer only (web services / email). If you're inspecting in Nebraska and Telematics fails, move directly to display/printout review — do not attempt USB or Bluetooth.",
        ],
      },
      {
        heading: "Fail-to-Transfer violation",
        body: "§395.24(a) requires the driver to TRANSFER the ELD record to the inspector using one of the prescribed transfer methods the ELD supports (Telematics web/email, USB, or Bluetooth — whichever the device offers). The transfer itself is the compliance act; viewing the data a different way does NOT satisfy §395.24(a).",
        bullets: [
          "Display / printout is acceptable for the inspector to REVIEW the HOS data at roadside, but it is not recommended as a substitute for the transfer and DOES NOT exempt the driver from a fail-to-transfer violation. The driver still owes you a successful transfer.",
          "**Not the driver's fault**: the transfer attempt itself failed for technical reasons outside the driver's control — carrier cell/wifi dropped mid-transfer, eRODS was down, the FMCSA email gateway timed out, or a routing-code issue the inspector introduced. Network/service-side failures are not a driver violation.",
          "**Driver violation**: the driver cannot or will not operate the ELD's transfer function, doesn't know the process, refuses to initiate the transfer, or the transfer fails due to the driver / the ELD (not the network / FMCSA). After the driver has been given the opportunity to transfer the log and the inspector has assisted as described below, cite the fail-to-transfer violation under §395.24(a) / §395.22(h).",
          "Document WHICH method(s) were attempted, WHERE each attempt failed in the workflow, any inspector assistance provided, and what was used to review the data if the transfer ultimately did not succeed. A well-documented attempt chain distinguishes a defensible citation from one vacated on DataQs review.",
        ],
      },
      {
        heading: "Routing codes & inspector assistance",
        body: "The inspector provides a routing code from eRODS that the driver enters on the ELD to initiate the transfer. The driver is REQUIRED to have knowledge of and the ability to transfer the log — that's the core §395.22(h) competency. The inspector MAY assist the driver with the ELD to expedite the inspection (pointing out the transfer menu, helping enter the routing code, retrying a method), but assistance does not relieve the driver of their obligation. After the driver has been given the opportunity to perform the transfer AND the inspector has assisted as needed, if the transfer still cannot be completed because of driver inability or refusal, cite the fail-to-transfer violation.",
      },
    ],
  },

  {
    id: "in-cab-supplies",
    title: "Required In-Cab ELD Supplies",
    short: "Manual, transfer & malfunction instructions, blank logs",
    cfr: "49 CFR §395.22(h) · §395.22(i)",
    color: "#EA580C",
    summary:
      "§395.22(h) and §395.22(i) require the driver to have four specific paper or electronic items in the cab at all times. Missing any one is a discrete violation — independent of the RODS content itself.",
    sections: [
      {
        heading: "The four required items",
        body: "Each item must be onboard and accessible to the driver. Electronic copies on the ELD, the driver's phone, or a tablet satisfy the requirement — as long as the inspector can view them at roadside.",
        bullets: [
          "**ELD User's Manual** — the manufacturer's operating manual describing how to use the ELD (§395.22(h)(1)). Covers logging in/out, duty status changes, annotations, co-driver use, and general operation.",
          "**ELD Data Transfer Instructions** — step-by-step instructions describing how to produce and transfer the ELD data file to an authorized safety official (§395.22(h)(2)). Must cover every transfer method the device supports.",
          "**ELD Malfunction Instructions** — a document describing the ELD malfunction reporting requirements and the recordkeeping procedures the driver must follow during an ELD malfunction (§395.22(h)(3)). This is the §395.34 driver-duty checklist in written form.",
          "**Supply of blank driver's RODS (paper logs)** — sufficient blank logs for the driver to reconstruct the current day AND the prior 7 days manually, in case the ELD malfunctions (§395.22(h)(4)). A minimum of 8 blank logs. Pre-printed graph-grid sheets.",
        ],
      },
      {
        heading: "What to check at roadside",
        body: "Ask to see all four items. Electronic copies are fine but must be AVAILABLE — not 'I can download it when I get home'. If the driver can't produce any one of the four, cite the corresponding §395.22(h) paragraph.",
      },
      {
        heading: "Common roadside findings",
        body: "Most frequent gaps:",
        bullets: [
          "No blank logs at all — the driver assumed the ELD would never malfunction. Cite §395.22(h)(4).",
          "Only the manufacturer's quick-start card — the full user manual is not available. Cite §395.22(h)(1).",
          "Transfer instructions are on the ELD itself, but the driver can't navigate to them. The instructions must be produceable on request.",
          "Malfunction instructions confused with the ELD user manual. These are two separate required documents, even if the carrier prints them together.",
        ],
      },
    ],
  },

  {
    id: "malfunctions",
    title: "Malfunctions & Data Diagnostic Events",
    short: "The 6 malfunction codes + driver duties",
    cfr: "49 CFR §395.22(h) · §395.34",
    color: "#DC2626",
    summary:
      "ELDs must self-monitor for 6 specific malfunctions (§395.22(g)) and 6 data diagnostic events. When a malfunction is detected, the ELD must display a visual/audible notification and the driver must take specific actions under §395.34 — including notifying the carrier within 24 hours and reverting to paper RODS.",
    sections: [
      {
        heading: "The 6 ELD malfunctions",
        body: "Each malfunction has a required code the ELD displays. Memorize these — the code alone tells you the failure mode:",
        bullets: [
          "P — Power compliance: ELD isn't powered for at least 30 minutes over the last 24 hours despite the engine being on.",
          "E — Engine synchronization: ELD lost connection to the vehicle's ECM, so engine-hours / VIN / odometer data isn't syncing.",
          "T — Timing compliance: ELD's clock drifts more than 10 minutes from UTC.",
          "L — Positioning compliance: GPS unable to fix the vehicle's location for 60+ minutes during driving events.",
          "R — Data recording compliance: ELD can no longer log or retrieve events (storage failure).",
          "S — Data transfer compliance: ELD cannot complete a data transfer to eRODS, even after several attempts.",
          "O — Other (rare, manufacturer-specific critical errors).",
        ],
      },
      {
        heading: "Data diagnostic events",
        body: "Less severe than malfunctions — the ELD logs the event but continues operating. The driver is notified on screen. If a diagnostic persists more than a short threshold, it escalates to the matching malfunction. Six codes: 1 power, 2 engine sync, 3 missing required data, 4 data transfer, 5 unidentified driving, 6 other.",
      },
      {
        heading: "Driver duties when a malfunction is detected (§395.34)",
        body: "The moment the ELD shows a malfunction (not a diagnostic), the driver MUST:",
        bullets: [
          "Note the malfunction and provide the carrier with written notice of the malfunction within 24 hours.",
          "Reconstruct the current day's RODS (if needed) and the preceding 7 days manually on paper (unless already on the ELD).",
          "Continue to prepare paper RODS until the ELD is serviced and back in compliance.",
          "Provide the paper logs to the inspector on request — they're still considered part of the RODS.",
        ],
      },
      {
        heading: "Carrier duties (§395.34(a)(2))",
        body: "The motor carrier must correct the malfunction within 8 days of discovery (or within 8 days of the driver's notification, whichever is earlier). For a malfunction that persists beyond 8 days, the carrier must request an FMCSA extension — otherwise the vehicle must be taken out of service for that ELD until repaired.",
      },
      {
        heading: "What to check at roadside",
        body: "Look for any malfunction icon/code on the ELD display. If you see one, ask for the driver's paper logs for that day + prior 7 days. Ask when the malfunction occurred — if it's been more than 24 hours since the driver noticed it AND the carrier has not been notified in writing, that's a §395.34 violation independent of the malfunction itself.",
      },
    ],
  },

  {
    id: "unidentified",
    title: "Unidentified Driving Records",
    short: "Driving logged with no driver assigned",
    cfr: "49 CFR §395.32(d)",
    color: "#F59E0B",
    summary:
      "When a CMV is moved without a driver logged in (yard jockey moving a tractor, mechanic road-testing, someone using the wrong login, etc.), the ELD still records the event — it's saved to the 'Unidentified Driver' profile until a real driver claims it OR the carrier annotates the reason.",
    sections: [
      {
        heading: "What counts as an unidentified driving record",
        body: "Any driving event (engine running + CMV in motion >5 mph) captured while no driver is logged in. The ELD auto-creates an 'Unidentified Driver' duty line on the day it happened.",
      },
      {
        heading: "Driver's obligation on login",
        body: "When a driver logs in, the ELD checks whether any unidentified driving events match their VIN over the past few days. The ELD prompts the driver to CLAIM any that belong to them — converting the time from the unidentified profile to their own RODS — or to REJECT them (explaining who was actually driving).",
      },
      {
        heading: "Carrier's obligation",
        body: "The carrier reviews unclaimed unidentified events through the back-office portal and must either (a) assign the event to a specific driver (yard jockey, mechanic test-drive) with an annotation, OR (b) keep the event on the carrier's Unidentified Driver profile with a written explanation for why it can't be attributed.",
      },
      {
        heading: "Red flags at roadside",
        body: "Unidentified driving records within the current driver's VIN over the previous 7 days are visible in the data transfer. Watch for:",
        bullets: [
          "Unclaimed or unannotated unidentified driving that totals more than a few minutes per day — suggests the driver is driving logged-out to hide hours.",
          "Unidentified driving immediately before a driver logs in (possible falsification).",
          "Repeated pattern of unidentified driving on the same tractor — indicates yard operations never being annotated.",
        ],
      },
    ],
  },

  {
    id: "edits-certification",
    title: "Edits, Annotations, and Certification",
    short: "What can be changed, by whom, and what can't",
    cfr: "49 CFR §395.30 · §395.32(f)",
    color: "#0891B2",
    summary:
      "An ELD preserves the ORIGINAL record of each event permanently. Edits add a new annotated version — they never overwrite. The carrier CANNOT unilaterally edit driving time; only the driver can (with a written reason). At the end of each 24-hour period the driver must certify their RODS.",
    sections: [
      {
        heading: "Original events are immutable",
        body: "Every event the ELD records is stamped with date/time/location/odometer and stored in a tamper-evident way. Edits create a new version alongside the original — the history is visible in the transfer file.",
      },
      {
        heading: "Who can edit what",
        body: "Both the driver and the motor carrier can PROPOSE edits, but the rules differ:",
        bullets: [
          "DRIVER edits: can change their own non-driving events (e.g., flip OFF to SB), reassign shipping info, annotate, or reject a carrier-proposed edit. Must include a written annotation describing the reason.",
          "CARRIER edits: can propose edits via the back-office, but the DRIVER must accept or reject them before they take effect. Exception: carrier can make assignment edits for unidentified driving (see previous topic).",
          "Neither party can edit AUTOMATICALLY-recorded DRIVING time. If driving was logged, it stays logged. The only way to alter a driving event is an annotation explaining it was incorrectly recorded — the record itself remains.",
        ],
      },
      {
        heading: "Driver certification",
        body: "At the end of each 24-hour period (or before going off-duty at the end of a work shift), the driver must CERTIFY the day's RODS are accurate (§395.30(c)). Certification is shown in the header as 'Certified' or 'Not yet certified'. A driver's refusal or failure to certify is a §395.30 violation.",
      },
      {
        heading: "Annotations",
        body: "Every edit requires an annotation at least 4 characters long (§395.32(f)(3)). Meaningless annotations ('ok', 'fix') are considered missing — cite §395.32 if the annotation doesn't explain the edit.",
      },
    ],
  },

  {
    id: "supporting-docs",
    title: "Supporting Documents",
    short: "Roadside verification of the RODS",
    cfr: "49 CFR §395.11(g)",
    color: "#7C2D12",
    summary:
      "§395.11(g) is the roadside-relevant portion of the supporting documents rule. Documents in the cab that corroborate — or contradict — the driver's RODS can be used at roadside to verify the accuracy of the log. This is where supporting documents matter to an inspector, not the back-office retention rules.",
    sections: [
      {
        heading: "Roadside use — §395.11(g)",
        body: "At roadside you're looking for documents in the cab that show WHERE the driver was and WHEN, then comparing them against the RODS. Mismatches between the document timestamps and the driver's duty status at the same time are evidence of a false or manipulated log. Common in-cab documents that fall under §395.11(g):",
        bullets: [
          "Bills of lading, trip sheets, and itineraries showing origin, destination, and times.",
          "Dispatch records and trip records — shows when dispatch expected the load and when it actually moved.",
          "Fuel receipts with timestamp, location, and odometer — directly compares to the driver's status and mileage at that moment.",
          "Toll receipts and weigh-station slips with location/time.",
          "Mobile communication records (texts, macros, dispatch messages) between the driver and the carrier.",
          "Payroll or settlement statements if the driver has them in the cab.",
        ],
      },
      {
        heading: "How to use a supporting document",
        body: "Pick a document with a timestamp + location. Cross-reference against the RODS for that exact moment:",
        bullets: [
          "Fuel receipt shows 14:32 in Dallas TX; RODS shows SB at 14:32 with location 'Fort Worth' — the driver was working, not in the sleeper. Potential false or manipulated log.",
          "Toll receipt shows 02:10 on I-40; RODS shows OFF-Duty at 02:10 — the driver was driving, not off-duty.",
          "Dispatch macro at 08:00 showing 'Arrived shipper'; RODS shows Driving 08:00-08:15 with no stop entry — the driver wasn't at the shipper per the log despite the dispatch confirmation.",
        ],
      },
      {
        heading: "Brief context — the other parts of §395.11",
        body: "The other subsections of §395.11 cover the 5 categories of supporting documents (§395.11(c)), the 6-month carrier retention requirement, the 10-per-day cap, and the driver's 13-day submission duty to the carrier. These matter during compliance reviews and audits — not typically at roadside. For inspection purposes, focus on §395.11(g).",
      },
    ],
  },

  {
    id: "false-logs",
    title: "False RODS vs Tampered ELD",
    short: "§395.8(e)(1) vs §395.8(e)(2) · CVSA Bulletin 2026-02",
    cfr: "49 CFR §395.8(e)(1) · §395.8(e)(2)",
    color: "#BE123C",
    summary:
      "CVSA Inspection Bulletin 2026-02 draws a hard line between a FALSE Record of Duty Status (§395.8(e)(1)) and a REENGINEERED, REPROGRAMMED, or TAMPERED ELD (§395.8(e)(2)). The citation you choose drives the OOS outcome. Tampering is a DEVICE-level violation — the ELD itself has been altered so it can't accurately record required data — not just a bad log entry.",
    sections: [
      {
        heading: "§395.8(e)(1) — False RODS",
        body: "An inaccurate RODS caused by driver error or intentional misreporting. The ELD is functioning correctly; the LOG is wrong. Classic examples:",
        bullets: [
          "**Misusing Personal Conveyance** — logging PC while actually advancing the load. Example from the bulletin: driving 3.75 hours in PC when PC was not allowed.",
          "**Driving without logging in** — creates 'unidentified driving time'. Example from the bulletin: driver shown in SB for an hour while there is unidentified driving on the same VIN.",
          "Any duty status clearly contradicted by supporting documents (fuel receipts, toll records, ECM data) when the ELD itself is operating normally.",
        ],
      },
      {
        heading: "§395.8(e)(2) — Reengineered, Reprogrammed, or Tampered ELD",
        body: "A DEVICE-level violation. The ELD has been altered so it does not accurately record or retain the data §395 requires. Definition per the bulletin: 'interfering in order to cause damage or make unauthorized alterations.' Examples:",
        bullets: [
          "**Fraudulent ELD accounts** — carrier creates fictitious driver profiles so drivers can log in under different names and reassign driving time. Bulletin example: two accounts with the same driver name, different usernames, and one-digit CDL difference — driver swaps between accounts to keep driving.",
          "**Altered ELD data** — the device is configured / reprogrammed to show duty status different from reality. Bulletin example: ELD showed driver off-duty in Tolleson, AZ, while a fuel receipt placed them fueling in Strafford, MO at the same time.",
          "Any manipulation of the ELD's recording function — not just an inaccurate single entry. If the device was altered, it's §395.8(e)(2), not §395.8(e)(1).",
        ],
      },
      {
        heading: "OOS rules (CVSA Bulletin 2026-02)",
        body: "The citation drives whether the driver goes OOS. This is a change from the old 'false log = always cite, never OOS' reading:",
        bullets: [
          "**§395.8(e)(1) False RODS — falsification can be determined, driver NOT over hours**: cite the violation and allow the driver to proceed.",
          "**§395.8(e)(1) False RODS — driver IS over HOS limits at the time of inspection**: cite the violation AND place the driver OOS until HOS eligibility is re-established.",
          "**§395.8(e)(2) Tampered ELD — cannot determine when driving actually occurred**: cite the violation AND place the driver OOS for **10 consecutive hours**.",
        ],
      },
      {
        heading: "Choosing the right citation",
        body: "Work through this decision in order:",
        bullets: [
          "Is the ELD device itself operating correctly (recording, retaining, syncing with ECM)? If yes and the log is wrong → §395.8(e)(1).",
          "Has the device been altered, reprogrammed, or set up with fraudulent accounts so it cannot accurately record what the driver actually did? → §395.8(e)(2).",
          "For §395.8(e)(1), determine whether the driver is currently over HOS. That's the OOS decider — not the falsification itself.",
          "For §395.8(e)(2), determine whether you can reconstruct actual driving time from supporting documents + ECM. If you can, the 10-hour OOS may still apply per the bulletin's 'cannot determine' criterion — the OOS is about the device's reliability, not just your ability to prove a specific fact.",
        ],
      },
      {
        heading: "Supporting documents are essential",
        body: "The bulletin emphasizes that inspectors must gather supporting documentation to verify or refute ELD data — especially when tampering is suspected. Fuel receipts, toll records, dispatch communications, and ECM data are what separate a defensible §395.8(e)(2) citation from a guess.",
      },
      {
        heading: "Ghost driver scenarios",
        body: "When Driver A's credentials are used by someone else (or when a team swaps the login without swapping seats), which citation applies depends on how the login is being used:",
        bullets: [
          "Driver A simply forgot to log out and Driver B's driving fell under A's RODS — usually §395.8(e)(1) (false log); the ELD worked correctly.",
          "Carrier set up fake accounts or one-digit-different CDL accounts so drivers could swap and hide hours — §395.8(e)(2) (tampered via fraudulent credentials).",
          "Unauthorized person (non-CDL, suspended) operating under a valid driver's login — falsification of RODS at minimum; may escalate depending on how the account was created.",
        ],
      },
      {
        heading: "Documenting the violation",
        body: "A defensible citation — especially §395.8(e)(2) — rests on documentation:",
        bullets: [
          "Specific pattern observed (event IDs, timestamps, account details).",
          "Supporting evidence (fuel receipts, toll records, ECM motion data, unidentified driving records, mobile comms).",
          "Driver's explanation, verbatim.",
          "Screenshots / photos of the ELD display showing the anomaly.",
          "Which §395.8(e) paragraph applies and why.",
        ],
      },
    ],
  },

  {
    id: "save-to-dataqs",
    title: "Save the ELD Data File",
    short: "Critical post-inspection step",
    cfr: "FMCSA eRODS best practice",
    color: "#15803D",
    summary:
      "Saving the ELD data file after every transfer is extremely important. The file in eRODS is a working copy; your saved local copy is the authoritative record of what the ELD showed at the moment of inspection. If the file is ever needed later, you will need your saved copy.",
    sections: [
      {
        heading: "How to save in eRODS",
        body: "In eRODS, the option to save the ELD data file requires the user to click **File → Save Data File**. Do this on every contact — not just inspections with violations.",
      },
      {
        heading: "Why this matters",
        body: "Saved copies can be extremely important later. If the data is ever needed — for any reason — your saved file is the authoritative record. Without it, reconstructing what the ELD showed at roadside becomes significantly harder, and sometimes impossible.",
      },
      {
        heading: "Make it a habit",
        body: "Save on EVERY contact. Every driver. Every time. Build the habit so you never have to wish you'd saved a file you didn't.",
      },
    ],
  },

  {
    id: "registration",
    title: "ELD Registration & Revocation",
    short: "Self-certified, registered, or revoked",
    cfr: "49 CFR §395.22 · §395.28 · §395.30",
    color: "#9333EA",
    summary:
      "Every ELD in service must be self-certified by its manufacturer and REGISTERED on the FMCSA ELD registry. FMCSA can REVOKE a registration if the device fails to meet §395 standards. A revoked ELD is treated the same as having no ELD at all.",
    sections: [
      {
        heading: "How registration works",
        body: "Manufacturers self-certify that their ELD meets the technical specifications in §395 Subpart B. FMCSA maintains a public registry of registered ELDs at www.fmcsa.dot.gov/hours-service/elds. Each entry shows the ELD model, manufacturer, registration ID, and certification status.",
      },
      {
        heading: "What a revoked ELD means roadside",
        body: "If FMCSA revokes an ELD's registration, carriers have 60 days to replace the device with a compliant one (§395.22(a)). After that grace period, using the revoked ELD is equivalent to operating without an ELD — the driver must either switch to a different registered ELD or revert to paper RODS.",
      },
      {
        heading: "How to verify at roadside",
        body: "The ELD's display/printout shows the ELD registration ID. Cross-reference it against the FMCSA ELD registry (accessible via your inspector tablet or phone). If the ID is not in the registry, or shows as 'REVOKED', cite §395.22(a) and treat the driver as operating without a required ELD.",
      },
      {
        heading: "Removal vs revocation",
        body: "Manufacturers occasionally remove an ELD from the registry voluntarily (end-of-life, product line discontinued). The effect on the carrier is the same as a revocation — 60 days to replace. Check the registry status notes to understand which applies.",
      },
    ],
  },

  {
    id: "aobrd-vs-eld",
    title: "AOBRD vs ELD (Historical)",
    short: "Legacy devices and the Dec 2019 transition",
    cfr: "49 CFR §395.15 (rescinded for most uses)",
    color: "#64748B",
    summary:
      "Automatic On-Board Recording Devices (AOBRDs) were the pre-ELD electronic logging standard. The Dec 16, 2019 deadline ended their general use. You will virtually never see an AOBRD at roadside today, but understanding the differences helps you recognize non-compliant devices masquerading as ELDs.",
    sections: [
      {
        heading: "Timeline",
        body: "Dec 18, 2017 — ELD mandate took effect; carriers already using AOBRDs were grandfathered for 2 years. Dec 16, 2019 — grandfather period ended; all covered carriers must use a registered ELD. Any 'AOBRD-only' device in service after Dec 16, 2019 is non-compliant.",
      },
      {
        heading: "Key differences",
        body: "AOBRDs were simpler and had less-strict data integrity. ELD requirements are materially tougher:",
        bullets: [
          "AOBRDs did not need to capture location at each status change; ELDs do (§395.32(b)).",
          "AOBRDs allowed the motor carrier to edit driving time unilaterally; ELDs require driver acceptance of edits (§395.30).",
          "AOBRDs had no standardized data transfer protocol; ELDs must offer eRODS-compatible transfer (§395.34(b)).",
          "AOBRDs had no malfunction self-diagnostic requirement; ELDs must monitor and alert on the 6 defined malfunctions (§395.22(g)).",
        ],
      },
      {
        heading: "If a driver claims their device is an AOBRD",
        body: "Confirm the device is ACTUALLY a registered ELD — some ELDs were previously sold as AOBRDs and later upgraded. Check the registry for the current certification. If the driver is operating under a different exemption (pre-2000 engine, driveaway, etc.), an AOBRD is irrelevant because paper RODS are acceptable. If none of those apply and the device is truly an AOBRD, cite §395.22(a) — the driver is required to use a registered ELD.",
      },
    ],
  },
];
