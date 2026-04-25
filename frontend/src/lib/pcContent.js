/**
 * Personal Conveyance reference content for roadside inspection training.
 *
 * Source: 49 CFR §395.8 (driver duties), FMCSA Regulatory Guidance for the
 * Application of the Federal Motor Carrier Safety Regulations (Question 26,
 * §395.8 — Personal Use of a Commercial Motor Vehicle), most recently
 * clarified in the FMCSA Regulatory Guidance Concerning the Use of a CMV for
 * Personal Conveyance, 83 FR 26377 (June 7, 2018).
 *
 * Each topic mirrors the ELD_TOPICS shape: { heading, body, bullets? } so the
 * generic accordion card renderer can be reused.
 */

export const PC_TOPICS = [
  {
    id: "pc-definition",
    title: "What Personal Conveyance Is",
    short: "Off-duty movement of a CMV for personal purposes",
    cfr: "49 CFR §395.8 · FMCSA Guidance 83 FR 26377",
    color: "#10B981",
    summary:
      "Personal Conveyance (PC) is movement of a CMV for the driver's personal purposes while off-duty. When properly used, time spent on PC is recorded as Off-Duty (line 1) on the RODS and does NOT count toward the 11-hour driving or 14-hour shift clocks.",
    sections: [
      {
        heading: "Core test (FMCSA 2018 guidance)",
        body: "PC is permitted ONLY when the driver is relieved from work and all responsibility for performing work by the motor carrier. The CMV may be loaded or unloaded — that is no longer a hard restriction — but the movement must be for the driver's personal benefit, NOT to advance the load or the carrier's business.",
      },
      {
        heading: "Carrier authorization required",
        body: "FMCSA guidance requires the motor carrier to AUTHORIZE the use of a CMV for personal conveyance. Carriers may set their own stricter limits (mileage caps, time-of-day, loaded vs unloaded, etc.). The driver must follow the carrier's policy — using PC against carrier policy is a falsification under §395.8.",
      },
      {
        heading: "Recorded as OFF-Duty",
        body: "PC time is recorded on the RODS as OFF-Duty status with the annotation 'Personal Conveyance' (or 'PC'). On an ELD, the driver selects the PC indicator before the CMV moves; the ELD will record the movement under Off-Duty when the indicator is on.",
      },
    ],
  },

  {
    id: "pc-allowed",
    title: "Allowed Uses of Personal Conveyance",
    short: "Examples that pass the FMCSA test",
    cfr: "FMCSA Guidance 83 FR 26377",
    color: "#10B981",
    summary:
      "FMCSA's 2018 guidance lists explicit examples of acceptable PC use. The common thread: the driver is off-duty, not advancing the load, and the movement is for the driver's personal benefit.",
    sections: [
      {
        heading: "FMCSA-listed acceptable uses",
        body: "Per the 2018 regulatory guidance, the following are appropriate uses of a CMV for personal conveyance:",
        bullets: [
          "Time spent traveling from a driver's en-route lodging (motel, truck stop, family member's home) to a restaurant or entertainment facility.",
          "Commuting between the driver's terminal and his/her residence, between trailer-drop lots and residence, between work site and residence. (Carrier policy may restrict this.)",
          "Time spent traveling to a nearby, reasonable, safe location to obtain required rest after loading or unloading. The driver must move from the shipper or receiver to obtain rest at the nearest reasonable safe location.",
          "Moving a CMV at the request of a safety official during the driver's off-duty time.",
          "Time spent traveling in a motorcoach without passengers to en-route lodging (e.g., motel) or restaurants and entertainment facilities and back to the lodging.",
          "Time spent transporting personal property while off-duty.",
          "Authorized use of a CMV to travel home after working at an offsite location.",
        ],
      },
    ],
  },

  {
    id: "pc-prohibited",
    title: "When Personal Conveyance Is NOT Allowed",
    short: "Common false PC claims and red flags",
    cfr: "FMCSA Guidance 83 FR 26377 · §395.8 falsification",
    color: "#DC2626",
    summary:
      "Movement that advances the load, completes a delivery, repositions for the next dispatch, or is dictated by the carrier is NOT personal conveyance — even if the driver claims otherwise on the log. Mis-flagging on-duty driving as PC is a falsification violation.",
    sections: [
      {
        heading: "FMCSA-listed unacceptable uses",
        body: "Per the 2018 guidance, PC may NOT be used for any of the following:",
        bullets: [
          "Movement to enhance the operational readiness of the carrier (e.g., bobtailing or driving a loaded CMV to a carrier's terminal after delivering a load).",
          "After delivering a load to a receiver, driving from the receiver to the next loading point or any other carrier-designated location. Even if the driver finds the next stop on their own, if it advances the load it's not PC.",
          "Continuing a trip in interstate commerce in order to fulfill a business purpose, including bobtailing or operating with an empty trailer to retrieve another load.",
          "Driving a loaded CMV from a shipper or receiver to a carrier's facility (yard moves) — must be recorded as on-duty, on-duty driving, or yard moves.",
          "Time spent driving in furtherance of a transportation of property (e.g., a driver placed out-of-service who drives a CMV to a non-prescribed location).",
        ],
      },
      {
        heading: "Red flags at roadside",
        body: "Look for these patterns when reviewing a driver's PC entries:",
        bullets: [
          "PC entry immediately after delivery, ending at another shipper, receiver, or terminal — strong indicator the move advanced the load.",
          "PC distance/time exceeds what's reasonable for 'nearest safe rest' — e.g., 80 miles to find rest when truck stops were available within 10 miles.",
          "PC entries during the night when the driver should be in their 10-hr reset, especially at the start or end of a shift.",
          "Multiple short PC segments back-to-back that effectively cover a route — splitting load-advancing driving into 'personal' chunks.",
          "PC used to fit driving inside the 14-hr clock — i.e., the driver is at the 14-hr cap and 'becomes off-duty' to keep moving.",
        ],
      },
    ],
  },

  {
    id: "pc-yard-move",
    title: "PC vs Yard Move vs On-Duty",
    short: "Three different statuses; pick the right one",
    cfr: "49 CFR §395.8(b) · §395.2 definitions",
    color: "#2563EB",
    summary:
      "Personal Conveyance, Yard Move, and On-Duty Driving are three distinct ELD indicators. Inspectors should know the boundaries — drivers sometimes mis-flag yard moves as PC to save 14-hr clock time.",
    sections: [
      {
        heading: "On-Duty Driving (line 3)",
        body: "Default for any CMV movement on a public road during the work shift. Counts toward both the 11-hr and 14-hr clocks. ELD records as 'D' automatically when the CMV moves above the speed threshold (default 5 mph) without a special indicator selected.",
      },
      {
        heading: "Yard Move (special indicator on)",
        body: "Movement of the CMV inside a private property yard (carrier terminal, shipper/receiver yard) for the carrier's business purposes. Recorded as ON-DUTY but NOT-Driving — counts toward the 14-hr clock but NOT the 11-hr drive cap. Driver must enable the Yard Move indicator before the CMV moves; once the CMV crosses onto a public road, the ELD must automatically clear the yard move flag and revert to D.",
      },
      {
        heading: "Personal Conveyance (special indicator on)",
        body: "Off-duty personal use of the CMV. Recorded as OFF-DUTY — does NOT count toward 11-hr or 14-hr clocks. Driver enables the PC indicator before movement; the indicator stays on until the driver disables it OR the ELD automatically clears it after a power cycle (FMCSA permits but does not require auto-clear).",
      },
      {
        heading: "Inspector decision tree",
        body: "When in doubt at roadside, ask three questions:",
        bullets: [
          "Was the driver off-duty (relieved from work) when the movement happened? If NO → cannot be PC.",
          "Did the movement advance the load or position the CMV for the carrier's next dispatch? If YES → cannot be PC; should be on-duty driving or yard move.",
          "Was the carrier's authorization for PC in place at the time? If NO → falsification, even if the use otherwise looked personal.",
        ],
      },
    ],
  },

  {
    id: "pc-investigation",
    title: "Investigating Suspected False PC",
    short: "What to ask and what to look at roadside",
    cfr: "§395.8 falsification · CVSA Operational Policy 12",
    color: "#F59E0B",
    summary:
      "If a PC entry looks suspicious, build the case from the ELD detail report, the BOL, and the driver's verbal account. Confirmation comes from comparing the PC start/end locations and times against the load's pickup/delivery and the driver's prior duty cycle.",
    sections: [
      {
        heading: "Documents and data to pull",
        body: "Ask for and review:",
        bullets: [
          "ELD detail report covering the day(s) in question — shows odometer reading, location (lat/lng), and event time at every status change.",
          "Bill of lading / shipping documents — confirms pickup and delivery locations and times.",
          "Driver's verbal answer to: where were you coming from, where were you going, and why?",
          "Carrier's PC policy if the driver references it (drivers should know the carrier's stated mileage/time limits).",
          "Map/distance check — does the PC distance match a 'nearest safe rest' claim, or did the driver pass multiple closer truck stops?",
        ],
      },
      {
        heading: "How to cite",
        body: "When the evidence shows the PC was actually on-duty driving, cite §395.8(e) (false report of duty status). The reclassified driving time is then added to the 11-hr and 14-hr clocks — which often surfaces an additional §395.3(a)(2) or (a)(3) violation. If multiple instances are documented, the carrier may also face a §390.11 / §385 pattern-of-violation finding.",
      },
      {
        heading: "OOS criteria",
        body: "Per §395.13: if the reclassification of falsified PC time causes the driver to exceed the 11-hr or 14-hr cap, the driver is placed OOS and must complete the off-duty time required to return to compliance before resuming driving.",
      },
    ],
  },
];
