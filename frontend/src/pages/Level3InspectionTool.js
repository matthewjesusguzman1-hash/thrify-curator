import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Search, Shield, Truck, CreditCard, Tractor,
  FlaskConical, HeartPulse, Hash, PenLine, CalendarCheck,
  BookOpen, MonitorSmartphone, Clock, Moon, CarFront, FileText,
  AlertOctagon, Ban, ChevronDown, X, ExternalLink, Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../components/ui/accordion";

/* ================================================================
   eCFR LINK HELPER  (reusable from HazMatWorksheet pattern)
   ================================================================ */
function ecfrUrl(ref) {
  if (!ref) return null;
  const clean = ref.replace(/\(.*\)/g, "").replace(/[*]/g, "").replace(/X/g, "").trim();
  const parts = clean.split(".");
  if (parts.length >= 2 && parts[1].length > 0) {
    return `https://www.ecfr.gov/current/title-49/section-${parts[0]}.${parts[1]}`;
  }
  if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
    return `https://www.ecfr.gov/current/title-49/part-${parts[0]}`;
  }
  return null;
}

function CfrLink({ r, light = false }) {
  if (!r) return null;
  const url = ecfrUrl(r);
  // `light` variant — readable on the navy Roadside card background.
  const cls = light
    ? "inline-flex items-center gap-0.5 text-[10px] font-mono text-[#D4AF37] hover:text-white hover:underline transition-colors"
    : "inline-flex items-center gap-0.5 text-[10px] font-mono text-[#D4AF37] hover:text-[#002855] hover:underline transition-colors";
  const fallbackCls = light ? "text-[10px] font-mono text-[#D4AF37]" : "text-[10px] font-mono text-[#D4AF37]/80";
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {r}
        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
      </a>
    );
  }
  return <span className={fallbackCls}>{r}</span>;
}

/* ================================================================
   SECTION DATA — Organized from DIR Sheet 2025-2026
   ================================================================ */
const SECTIONS = [
  {
    id: "general",
    title: "General Inspection Guidance",
    icon: Shield,
    color: "#D4AF37",
    items: [
      "Inspections count by calendar year.",
      "Using PC to stop a CMV is encouraged for all Level 3 inspections.",
      "Intrastate farm-plated vehicles are NOT subject to regulations or Level 3 inspections.",
      "DIRs should be completed on any applicable CMV involved in a crash.",
      { text: "Level 2 violations that map to a federal regulation (lights, tires, load securement, etc.) can't be written on a Level 3 as a state violation under 392.2. You may note the issue in the inspection comments to show PRS, then issue the violation/summons card in TRACS.", cfr: "392.2" },
      { text: "For improper parking on on/off ramps, rest areas, etc., use 392.2-SLLUP (unlawful parking or leaving vehicle in roadway). Do NOT use disobey traffic control device.", cfr: "392.2", highlight: true },
      "For moving violations under state law, use the specific 392.2 code when available. Example: 392.2SLL-3 (speeding 11-14 MPH).",
      "Check the Traffic Enforcement box when the stop was for a moving violation found in the waiver schedule.",
      { text: "Don't tell the driver they're OOS until the vehicle is at a safe keeping place. Have it towed if needed.", highlight: true },
      "OOS vehicles/drivers hauling livestock require the Livestock OOS form in TRACS (SOP 41-2, 11-02).",
    ],
  },
  {
    id: "exempt",
    title: "Exempted Vehicles",
    icon: Ban,
    color: "#64748B",
    cfr: "390.3(f)",
    items: [
      "Government vehicles",
      "School buses",
      "Political subdivisions (List of NE Political Subdivisions)",
      "Transporting personal property with no compensation",
    ],
  },
  {
    id: "cdl",
    title: "CDL Verification",
    icon: CreditCard,
    color: "#3B82F6",
    cfr: "383/391",
    items: [
      { text: "Verify the CDL is valid for the class of CMV being operated.", cfr: "383" },
      { text: "Use the 391.** code for CDL violations.", cfr: "391" },
      "See page 7 of the Truck Guide Book for additional guidance.",
    ],
  },
  {
    id: "farm",
    title: "Farm Plated TT/ST",
    icon: Tractor,
    color: "#16A34A",
    items: [
      { text: "CDL NOT required when ALL of the following apply (75-363(8)(a) · Truck Guide pp. 45-50):", sub: true },
      "Driver is 18 or older and holds a Class O license.",
      "Driver is the farm/ranch owner, an employee, or a family member of the operation.",
      { text: "Does NOT apply to a Truck Tractor / Semi Trailer that requires a Hazmat placard (p. 49).", highlight: true },
      "If operating interstate, must stay within 150 air miles of the farm or ranch.",
    ],
  },
  {
    id: "clearinghouse",
    title: "Drug & Alcohol Clearinghouse",
    icon: FlaskConical,
    color: "#DC2626",
    items: [
      { text: "Check Clearinghouse status through Query Central for prohibited drivers:", sub: true },
      "Driver tab → clear the username & password → Query Type = \"Status\" → select state → enter CDL # → Search.",
      "Confirm the driver is not prohibited, and review prior inspections for uncorrected violations.",
      { text: "If prohibited, use 390.3e — driver is prohibited from safety-sensitive functions per 382.501(a). Place OOS until no longer prohibited.", cfr: "390.3", highlight: true },
    ],
  },
  {
    id: "medical",
    title: "Medical Card Requirements",
    icon: HeartPulse,
    color: "#EC4899",
    cfr: "391",
    items: [
      "See page 10 or 38 of the Truck Guide Book for additional guidance.",
      "Verify medical status via the CDL info return, or ask to see the physical card.",
      { text: "Commercial or Apportion plated — medical card required when operating:", sub: true },
      "Interstate commerce with a GVWR or GCWR over 10,000 lbs.",
      "Intrastate commerce in a vehicle that requires a CDL to operate — UNLESS one of the exemptions below applies:",
      { text: "Driver was issued the CDL BEFORE July 30, 1996.", indent: true },
      { text: "Driver is operating a non-CDL vehicle.", indent: true },
      { text: "The OLN check indicates the driver is medically qualified.", indent: true },
      "Farm plated — see pages 47-50 of the Truck Guide Book.",
      { text: "Fake or altered medical card → cite 391.49J.", cfr: "391.49", highlight: true },
      "Nebraska (and some other states) disqualify the CDL when there's no medical card. No CDL = OOS.",
      "Medical card is valid for 2 years or less.",
      { text: "Skill Performance Evaluation (SPE) Certificate — 391.49: alternate physical-qualification standards for loss or impairment of limbs.", cfr: "391.49" },
    ],
  },
  {
    id: "dot-oa",
    title: "DOT # & Operating Authority",
    icon: Hash,
    color: "#8B5CF6",
    items: [
      { text: "Check the DOT# via the inspection prescreen or Query Central. Dispatch can also verify.", link: "https://portal.fmcsa.dot.gov/login", linkText: "FMCSA Portal" },
      "Verify Operating Authority in Query Central — click the MC#, confirm it's active.",
      "Truck Guide Book p. 32.",
      { text: "Exempt from Operating Authority:", sub: true },
      "Intrastate, private carrier hauling their own goods.",
      "Carriers hauling exempt commodities only.",
      { text: "Interstate for-hire carriers hauling a regulated commodity DO need Operating Authority.", highlight: true },
      { text: "See 372.115 for the list of non-exempt commodities.", cfr: "372.115" },
      { text: "Ways to get legal when Operating Authority hasn't been obtained:", sub: true },
      "Wait it out — applying for proper authority may take 30-45 days.",
      "Lease onto another company that has proper authority, carrying all required paperwork (lease agreement, markings, etc.).",
      "Drop the trailer and have another carrier with authority take or reload it.",
    ],
  },
  {
    id: "markings",
    title: "Name / DOT # on Vehicle",
    icon: PenLine,
    color: "#F59E0B",
    cfr: "390.21",
    items: [
      { text: "May be written on a Level 3 when the marking doesn't match MCS-150. See Truck Guide Book pp. 36-37.", cfr: "390.21" },
      { text: "Commercial or Apportion plated:", sub: true },
      "Interstate: anything over 10,000 lbs is subject to the rules.",
      "Intrastate: anything over 10,000 lbs is subject to the rules.",
      { text: "Rented vehicles (U-Haul, Penske, Ryder, etc.): do NOT use the rental company's DOT#. Use the DOT# of the company renting the vehicle. If leased more than 30 days, the renting company's Name and DOT# must be on the side (Truck Guide Book p. 37).", highlight: true },
      { text: "Farm plated:", sub: true },
      "Intrastate — no marking required.",
      "Interstate — required (Truck Guide Book pp. 47-50).",
    ],
  },
  {
    id: "annual",
    title: "Annual Inspection",
    icon: CalendarCheck,
    color: "#0EA5E9",
    cfr: "396.17",
    items: [
      "Look for the sticker on the vehicle, or paperwork showing an inspection was completed.",
      "Commercial: current annual inspection required.",
      "Farm: may not be required (Truck Guide Book pp. 47-50).",
    ],
  },
  {
    id: "logbook-exempt",
    title: "Log Book — When NOT Required",
    icon: BookOpen,
    color: "#10B981",
    cfr: "395.1",
    items: [
      "If a driver is using an exception, note it on the last page of the inspection report.",
      { text: "Short-haul / 150 air-mile (172.6 statute miles) radius of the normal work reporting location. The driver must log every hour of that day if they leave the 150 air-mile radius at any point (395.8 Interpretation #20).", cfr: "395.1" },
      "See 395.1 Guidance #12 for the definition of air miles.",
      { text: "Farm plated (Truck Guide Book pp. 47-50):", sub: true },
      "Intrastate trips are log-exempt.",
      "Interstate trips within 150 air miles (172 miles) of the farm are log-exempt.",
      { text: "Intrastate CMV that does not require a CDL to operate (SS 75-363(2)(b)(iv) — \"Drivers\" is the key word).", highlight: true },
      { text: "Interstate CMV that does not require a CDL to operate — exempt IF:", sub: true },
      "Within 150 air miles of the normal reporting location (395.1(e)(2)).",
      "Employer keeps the driver's time cards.",
      { text: "Utility vehicles as defined in 395.2.", cfr: "395.2" },
      { text: "395.1(n) — retail store delivery within 100 air miles of the reporting location, Dec. 10-25.", cfr: "395.1" },
      { text: "395.1(k) — agricultural commodities within 150 air miles of the source / distribution point / farm supply. May be Commercial or Apportion plated. Covers chemicals, grain, livestock feed, etc.", cfr: "395.1" },
      { text: "ELD HOS Ag exemption — livestock within 150 miles of the source AND within 150 miles of the destination are exempt from logs.", highlight: true },
      { text: "Driver/salesperson whose total driving time does not exceed 40 hours in any 7 consecutive days (395.1(c)).", cfr: "395.1" },
      { text: "Pipeline welding trucks (395.1(x)).", cfr: "395.1" },
      { text: "Roadside — if the driver claims an exemption, note the specific exemption on the last page of the inspection.", roadside: true },
      { text: "Roadside — verify the claim: ask the operating radius from the reporting location, the commodity, the vehicle plate type, and whether the carrier keeps the driver's time cards.", roadside: true },
      { text: "Roadside — if the claim doesn't hold up, treat the driver as required to keep a log and apply the appropriate log violation.", roadside: true },
    ],
  },
  {
    id: "erods",
    title: "eRODS / ELD Procedures",
    icon: MonitorSmartphone,
    color: "#6366F1",
    cfr: "395.20-38",
    items: [
      { text: "Starting an eRODS inspection:", sub: true },
      "Open eRODS from the desktop. Click FMCSA Web Service Login. Enter your FMCSA Portal user ID and password. Click \"Open from Web Service\" — your Safety Official Code appears in the top-left.",
      { text: "The ELD must be mounted in a fixed position while the CMV is in operation, and visible to the driver when seated.", cfr: "395.22" },
      { text: "The driver must have: ELD user manual, transfer instructions, malfunction instructions, and 8 days of blank paper logs.", cfr: "395.22" },
      "Ask the driver to send the logs via Web Service and give them your Safety Official Code.",
      { text: "The driver is required to produce and transfer the record from the ELD.", cfr: "395.24" },
      "Open the log that arrived in Web Services and review it.",
      { text: "eRODS / ELD exemptions:", sub: true },
      "Engine model year older than 2000.",
      "Driveaway-towaway operations — transporting an empty vehicle for sale, lease, or repair when the vehicle is part of the shipment. See 390.5 for the definition.",
      "Driver who uses paper logs no more than 8 days in any 30-day window.",
      { text: "Roadside — request the data transfer first. The transfer is the required review method under §395.24.", cfr: "395.24", roadside: true },
      { text: "Roadside — confirm the in-cab supplies (user manual, transfer instructions, malfunction instructions, 8 days of blank paper logs) are present.", cfr: "395.22", roadside: true },
      { text: "Roadside — confirm the ELD is mounted in a fixed position and visible to the driver when seated.", cfr: "395.22", roadside: true },
      { text: "Roadside — if the transfer fails due to network/service issues outside the driver's control, fall back to display/printout ONLY as a last resort. Display/printout does NOT exempt the driver from a fail-to-transfer violation when the failure is driver-caused.", roadside: true },
    ],
  },
  {
    id: "hos-interstate",
    title: "Hours of Service — Interstate",
    icon: Clock,
    color: "#EF4444",
    cfr: "395.3(a)",
    items: [
      { text: "Property-hauling vehicles — interstate basics:", sub: true },
      "Must start the shift with 10 consecutive hours off duty.",
      "Cannot drive after the 14th hour following coming on duty.",
      "Cannot drive more than 11 hours within those 14 on-duty hours.",
      { text: "Must take a 30-minute rest break within 8 hours of the last off-duty or sleeper-berth period.", cfr: "395.3" },
      "60/70-hour rule applies on a rolling 7/8-day window.",
      "34-hour restart resets the 60/70.",
      { text: "11-Hour Rule — 395.3(a)(1):", sub: true, cfr: "395.3" },
      "Count from the end of the last 10-hour break.",
      "Violation occurs if the driver is driving after the 11th hour.",
      "If the violation appears on a prior day's log, cite the violation but do NOT place OOS.",
      { text: "OOS only applies if the driver is actively driving at the time of the 11-hour violation.", highlight: true },
      { text: "14-Hour Rule — 395.3(a)(2):", sub: true, cfr: "395.3" },
      "Count from the end of the last 10-hour break.",
      "Does not include qualifying rest periods under paragraph (g)(1)(ii).",
      "Violation if the driver is driving after the 14th hour — except under 395.1(o) (16-hour rule) or 395.1(e)(2) (Non-CDL CMV).",
      { text: "Driver must be driving (or illegally parked) for a 14-hour violation to exist.", highlight: true },
      "Only the driving hours after the 14th hour count against the violation.",
      "If the violation appears on a prior day's log, cite the violation but do NOT place OOS.",
      "OOS only applies if the driver is actively driving at the time of the 14-hour violation.",
      { text: "16-Hour Exception — 395.1(o):", sub: true, cfr: "395.1" },
      "Driver has been released from duty at the normal work reporting location for the previous 5 duty tours.",
      "Driver returns to the normal reporting location and is released from duty within 16 hours.",
      "Driver has not used the 16-hour exception within the last 6 days — unless a 34-hour reset was taken.",
      { text: "70-Hour Rule (70 hours in 8 days) and 60-Hour Rule (60 hours in 7 days):", sub: true },
      "Count all driving AND on-duty, not-driving time.",
      { text: "On-Duty Time: essentially any time spent in furtherance of the motor carrier's business.", cfr: "395.2" },
      { text: "Off-Duty Time: the driver is relieved of all duty and responsibility for the CMV and cargo.", cfr: "395.2" },
      { text: "30-Minute Rest Break — must be taken before 8 hours of driving. May be on-duty not-driving, off-duty, sleeper berth, or a combination.", cfr: "395.3" },
      { text: "A driver hauling livestock interstate with the livestock loaded on the vehicle is exempt from the HOS limits during that trip.", cfr: "395.1", highlight: true },
      { text: "Roadside — count driving and on-duty hours from the end of the driver's last 10-hour break.", roadside: true },
      { text: "Roadside — OOS only applies when the driver is ACTIVELY DRIVING at the time of an 11-hour or 14-hour violation. Violations that appear on a prior day's log: cite the violation, do NOT place OOS.", roadside: true },
      { text: "Roadside — for the 30-minute break requirement, verify the break was taken before 8 hours of driving since the last qualifying rest.", cfr: "395.3", roadside: true },
      { text: "Roadside — for the 60/70-hour rule, review the driver's prior 7 or 8 days to determine current on-duty total and whether a 34-hour restart has been taken.", roadside: true },
    ],
  },
  {
    id: "hos-intrastate",
    title: "Hours of Service — Intrastate",
    icon: Clock,
    color: "#F97316",
    items: [
      { text: "Intrastate (75-363):", sub: true },
      "Maximum 12 hours of driving after 10 consecutive hours off duty.",
      "Maximum 16 hours on duty after 10 consecutive hours off duty.",
      "70/80 hours total on-duty/driving in a 7/8-day period.",
      "Use the 80-hour figure if the company operates 8 days a week.",
      { text: "Roadside — apply the intrastate limits when the operation is entirely within the state (12/16/70-80 under 75-363).", roadside: true },
      { text: "Roadside — confirm intrastate status from the load origin, destination, and any interlining before applying intrastate limits.", roadside: true },
    ],
  },
  {
    id: "sleeper",
    title: "10 Hours Rest & Split Sleeper Berth",
    icon: Moon,
    color: "#7C3AED",
    cfr: "395.1(g)(1)",
    items: [
      { text: "Ways to get the 10 hours of rest:", sub: true },
      "10 consecutive hours off duty.",
      "10 consecutive hours in the sleeper berth.",
      "10 consecutive hours split between off duty and sleeper berth.",
      "7 hours in the sleeper combined with up to 3 hours in the passenger seat, taken immediately before or after the sleeper time.",
      { text: "Split Sleeper Berth Provision:", sub: true },
      "Neither rest period (off duty or sleeper) may be shorter than 2 hours.",
      "One of the two rest periods must be at least 7 hours in the sleeper berth.",
      "The two rest periods combined must total at least 10 hours.",
      { text: "How to calculate a split sleeper shift:", sub: true },
      "Start counting at the end of the first qualifying rest period.",
      "Count the on-duty and driving hours in the first working segment.",
      "Do NOT count the first qualifying sleeper-berth/off-duty rest period (2+ hours).",
      "Count the on-duty and driving hours in the second working segment.",
      "Stop counting at the beginning of the second qualifying rest period.",
      { text: "For the 11-hour rule, count ONLY driving time.", highlight: true },
      { text: "For the 14-hour rule, count ALL time except qualifying rest periods under 395.1(g)(1)(ii).", highlight: true },
      { text: "Crew-cab pickups (hotshots) cannot claim Sleeper Berth — only Off Duty. The back seat must meet the requirements of 393.76.", cfr: "393.76", highlight: true },
      { text: "Roadside — identify the two qualifying rest segments on the log: ≥7h in the sleeper PLUS a second segment ≥2h (SB or OFF). Combined must be ≥10h.", roadside: true },
      { text: "Roadside — the current shift STARTS at the end of the first qualifying rest segment and ENDS at the beginning of the second qualifying rest segment. Only the work between those two segments counts toward THIS shift's 11 and 14.", roadside: true },
      { text: "Roadside — if the attempted split doesn't meet the requirements (short SB, OFF instead of SB, etc.), the 14-hour wall-clock rule applies. No exclusion for the rest periods.", roadside: true },
    ],
  },
  {
    id: "personal-conveyance",
    title: "Personal Conveyance",
    icon: CarFront,
    color: "#14B8A6",
    items: [
      { text: "PC cannot be used to further the load or to reposition the vehicle to be re-dispatched.", highlight: true },
      "See 395.8 Interpretation #26 or the \"Proper Uses of Personal Conveyance\" guidance.",
      { text: "Misused PC is a false log violation — OOS 10 hours.", highlight: true },
      { text: "Roadside — if the driver claims PC, ask WHERE they were going, the direction of travel, whether the load was being advanced, and whether the trip was toward a delivery point or a work site.", roadside: true },
      { text: "Roadside — if PC was used to further the load or to reposition for dispatch, cite false log under §395.8(e) and place OOS 10 hours.", cfr: "395.8", roadside: true },
    ],
  },
  {
    id: "logbook-req",
    title: "Log Book Requirements",
    icon: FileText,
    color: "#0284C7",
    cfr: "395.8",
    items: [
      { text: "Every daily log must contain all of the following — each missing item is a violation:", sub: true },
      "Date.",
      "Total miles driven today.",
      "Unit number(s).",
      "Name of the motor carrier.",
      "Driver signature.",
      "Main office address (city and state are sufficient).",
      "Remarks — e.g., change of duty status with the nearest town and state.",
      "Co-driver's name (printed).",
      "Total hours at the end of the day.",
      "Bill of lading number, or commodity and shipper name.",
      { text: "Roadside — check each field on each log. Every missing field is a separate violation.", roadside: true },
      { text: "Roadside — make sure the log is current through the last change of duty status. Not-current logs are a common citation.", roadside: true },
    ],
  },
  {
    id: "oos-duration",
    title: "OOS Duration — Log Violations",
    icon: AlertOctagon,
    color: "#DC2626",
    items: [
      { text: "If the driver failed to log the current day and the day prior but has the earlier 7 days (including days that were short-haul / 150 air-mile exempt), give them the chance to make the log current. Do NOT place OOS. Cite \"log not current\" on the inspection.", highlight: true },
      "No log book / false log = OOS 10 hours.",
      "Failure to retain the previous 7 days of logs = OOS 10 hours.",
      "11/14-hour violation = OOS for the least amount of time needed to show 10 hours of rest. Typically 2-10 hours depending on sleeper-berth or off-duty hours already in hand.",
      "60/70-hour violation = OOS until the driver is back under 60/70 hours. May require a 34-hour restart.",
    ],
  },
  {
    id: "electronic-logs",
    title: "Electronic Logs (non-eRODS)",
    icon: MonitorSmartphone,
    color: "#475569",
    items: [
      { text: "Automatic On-Board Recording Devices (AOBRDs) have been unusable since December 16, 2019.", highlight: true },
      { text: "Electronic logs other than a registered ELD (laptop, cell phone, etc.) used in place of paper logs:", sub: true },
      "Must contain all the information required on a paper log.",
      "Each starting location must match the prior stopping location.",
      "See 395.8 Interpretation #28 for additional requirements.",
      { text: "If can't thumb through each change of status → violation for failure to produce the log under 395.8(a).", cfr: "395.8", highlight: true },
      { text: "Roadside — ask the driver to thumb through each change of duty status on the device. If they can't, cite §395.8(a) failure to produce.", cfr: "395.8", roadside: true },
      { text: "Roadside — confirm the electronic log contains every field required on a paper log, and that each starting location matches the prior stopping location.", roadside: true },
    ],
  },
  {
    id: "misc",
    title: "Miscellaneous Violations",
    icon: AlertOctagon,
    color: "#92400E",
    items: [
      { text: "Ill or fatigued operator — place OOS until the driver is no longer ill or fatigued.", cfr: "392.3", highlight: true },
      { text: "Texting — 392.80. State statute 60-6,179.02(1)(a). A CMV is 10,001 lbs or more per 75-362.", cfr: "392.80" },
      { text: "Hand-held phone use — 392.82. State statute 60-6,179.02(2)(a). A CMV is 10,001 lbs or more per 75-362.", cfr: "392.82" },
      { text: "Unauthorized passenger — 392.60a. The authorization letter must be on file with the company; it does not need to be carried by the driver.", cfr: "392.60" },
      { text: "Reading / speaking English — 391.11(b)(2). Sufficient to converse with the public, understand traffic signs, respond to inquiries, and make entries on reports. Violation only — NOT OOS.", cfr: "391.11" },
      { text: "Radar detector — 392.71. State statute 75-363 applies to CDL or interstate non-CDL. Radar detectors in an intrastate non-CDL vehicle are allowed under 75-363(2)(b)(iv).", cfr: "392.71" },
    ],
  },
  {
    id: "drugs-alcohol",
    title: "Drugs & Alcohol",
    icon: Ban,
    color: "#B91C1C",
    cfr: "392.4 / 392.5",
    items: [
      "See the Alcohol-Drug CMV Job Aid for DUI procedures.",
      { text: "For 392.4 or 392.5 to apply to an intrastate vehicle, the vehicle must require a CDL to operate.", cfr: "392.4", highlight: true },
      "Possession of unopened alcohol or drugs is NOT a violation in an intrastate non-CDL vehicle.",
      { text: "Possession of an open container or drugs may be cited under 392.2 due to state law.", cfr: "392.2" },
      { text: "For interstate vehicles, use the 390.5 definition of CMV (10,001 lbs).", cfr: "390.5" },
      { text: "For interstate vehicles, or intrastate vehicles requiring a CDL — place the driver OOS for 24 hours when the driver:", sub: true, highlight: true },
      { text: "Is on duty and possesses, is under the influence of, or uses drugs or other substances.", cfr: "392.4" },
      "Uses alcohol or is under the influence of alcohol within 4 hours before going on duty or operating/having physical control of a CMV.",
      "Uses alcohol, is under the influence, or has any measured alcohol concentration or detected presence of alcohol while on duty, operating, or in physical control of a CMV.",
      "Is on duty or operating a CMV while possessing alcohol in the CMV.",
      { text: "Unopened alcohol in a CMV — TRACS statute is 75-363(3G)5A4.", highlight: true },
      "For .04, .08, or refusals, use the appropriate CMV Sworn Report or Sworn Report Notice of Revocation and Temporary License.",
    ],
  },
];

/* ================================================================
   ITEM RENDERER
   ================================================================ */
function SectionItem({ item }) {
  if (typeof item === "string") {
    return (
      <li className="text-[13px] text-[#334155] leading-relaxed pl-1">
        {item}
      </li>
    );
  }

  const isSubHeader = item.sub;
  const isHighlight = item.highlight;
  const isIndented = item.indent;
  const isRoadside = item.roadside;

  if (isRoadside) {
    // Strip the "Roadside — " prefix so we can render it as a prominent badge
    // instead of inline text. Keeps the narrative intact, just separates the
    // action cue from the instruction.
    const cleanText = String(item.text || "").replace(/^Roadside\s+[—-]\s+/i, "");
    return (
      <li
        className="list-none -mx-1 my-1.5 rounded-md bg-[#002855] text-white px-3 py-2.5 shadow-sm border-l-[3px] border-[#D4AF37]"
        data-testid="roadside-action"
      >
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center gap-1 bg-[#D4AF37] text-[#002855] text-[9.5px] font-black uppercase tracking-widest rounded-sm px-1.5 py-[2px] flex-shrink-0 mt-[2px]">
            <Target className="w-2.5 h-2.5" strokeWidth={3} />
            Roadside
          </span>
          <span className="text-[13px] leading-snug font-medium">
            {cleanText}
            {item.cfr && (
              <span className="ml-1.5">
                <CfrLink r={item.cfr} light />
              </span>
            )}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`text-[13px] leading-relaxed ${
        isSubHeader
          ? "font-bold text-[11px] uppercase tracking-wide text-[#002855] pt-3 pb-0.5 list-none -ml-4 border-l-2 border-[#D4AF37] pl-2.5"
          : isHighlight
          ? "text-[#002855] font-medium bg-[#D4AF37]/10 rounded px-2 py-1 -mx-1 border-l-2 border-[#D4AF37]"
          : isIndented
          ? "ml-4 text-[#475569] list-[circle]"
          : "text-[#334155]"
      } pl-1`}
    >
      <span>{item.text}</span>
      {item.cfr && (
        <span className="ml-1.5">
          <CfrLink r={item.cfr} />
        </span>
      )}
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-[#3B82F6] hover:underline"
        >
          {item.linkText || "Link"}
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </li>
  );
}

/* ================================================================
   QUICK-NAV CHIP
   ================================================================ */
function NavChip({ section, isActive, onClick }) {
  const Icon = section.icon;
  return (
    <button
      onClick={onClick}
      data-testid={`nav-chip-${section.id}`}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
        isActive
          ? "bg-[#002855] text-white border-[#002855] shadow-sm"
          : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#002855]/30 hover:bg-[#F8FAFC]"
      }`}
    >
      <Icon className="w-3 h-3" style={{ color: isActive ? "white" : section.color }} />
      <span className="max-w-[120px] truncate">{section.title.replace(/—.*/, "").trim()}</span>
    </button>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function Level3InspectionTool() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openSections, setOpenSections] = useState([]);

  /* Filter sections by search */
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return SECTIONS;
    const lower = searchTerm.toLowerCase();
    return SECTIONS.filter((s) => {
      if (s.title.toLowerCase().includes(lower)) return true;
      return s.items.some((item) => {
        const text = typeof item === "string" ? item : item.text || "";
        return text.toLowerCase().includes(lower);
      });
    });
  }, [searchTerm]);

  /* Scroll to section */
  const scrollToSection = (id) => {
    setOpenSections((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTimeout(() => {
      document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  /* Expand / collapse all */
  const expandAll = () => setOpenSections(filteredSections.map((s) => s.id));
  const collapseAll = () => setOpenSections([]);

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="level3-inspection-tool">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              data-testid="level3-back-btn"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10 h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1
                className="text-sm sm:text-lg font-semibold text-white leading-tight truncate"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Level 3 Inspection Guide
              </h1>
              <p className="text-[10px] text-[#8FAEC5] tracking-wide hidden sm:block">
                DIR Sheet 2025–2026 &bull; Quick Reference
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="level3-expand-all"
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="text-[#D4AF37] hover:bg-white/10 h-7 px-2 text-[11px]"
            >
              Expand All
            </Button>
            <Button
              data-testid="level3-collapse-all"
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-white/60 hover:bg-white/10 h-7 px-2 text-[11px]"
            >
              Collapse
            </Button>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </header>

      {/* SEARCH */}
      <div className="sticky top-[52px] sm:top-[56px] z-40 bg-[#F0F2F5] border-b border-[#E2E8F0]">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              data-testid="level3-search"
              type="text"
              placeholder="Search topics (e.g., sleeper berth, medical card, OOS)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick-nav chips */}
        <div className="max-w-3xl mx-auto px-3 sm:px-6 pb-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max pb-1">
            {filteredSections.map((s) => (
              <NavChip
                key={s.id}
                section={s}
                isActive={openSections.includes(s.id)}
                onClick={() => scrollToSection(s.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 pb-20">
        {filteredSections.length === 0 ? (
          <div className="text-center py-12 text-[#94A3B8]">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No sections match "{searchTerm}"</p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
            className="space-y-2"
          >
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  id={`section-${section.id}`}
                  className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden scroll-mt-[160px]"
                  data-testid={`section-${section.id}`}
                >
                  <AccordionTrigger
                    className="px-4 py-3 hover:no-underline hover:bg-[#F8FAFC] transition-colors [&[data-state=open]]:bg-[#FAFBFD]"
                    data-testid={`trigger-${section.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${section.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: section.color }} />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[13px] sm:text-sm font-semibold text-[#0F172A] truncate">
                          {section.title}
                        </p>
                        {section.cfr && (
                          <p className="text-[10px] font-mono text-[#94A3B8]">
                            {section.cfr}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <ul className="space-y-1.5 list-disc list-outside ml-4 marker:text-[#CBD5E1]">
                      {section.items.map((item, idx) => (
                        <SectionItem key={idx} item={item} />
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center text-[10px] text-[#94A3B8] space-y-0.5">
          <p>DIR Sheet Guidance &bull; Updated 1/29/2026</p>
          <p>2025–2026 Truck Guide Book &bull; FMCSA Regulations</p>
        </div>
      </main>
    </div>
  );
}
