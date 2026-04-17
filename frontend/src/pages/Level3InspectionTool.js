import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Search, Shield, Truck, CreditCard, Tractor,
  FlaskConical, HeartPulse, Hash, PenLine, CalendarCheck,
  BookOpen, MonitorSmartphone, Clock, Moon, CarFront, FileText,
  AlertOctagon, Ban, ChevronDown, X, ExternalLink,
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

function CfrLink({ r }) {
  if (!r) return null;
  const url = ecfrUrl(r);
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#D4AF37] hover:text-[#002855] hover:underline transition-colors"
      >
        {r}
        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
      </a>
    );
  }
  return <span className="text-[10px] font-mono text-[#D4AF37]/80">{r}</span>;
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
      "Inspections are by calendar year.",
      "PC to stop CMV is encouraged for all Level 3 inspections.",
      "Intrastate farm plated vehicles are NOT subject to regulations / Level 3 inspections.",
      "DIR's should be conducted on applicable CMV's involved in a crash.",
      { text: "Level 2 inspection violations that have a correlating federal regulation (light, tire, load securement, etc.) can't be put on Level 3 inspections as a state violation under 392.2. Can put in notes to show PRS and issue violation/summons card in TRACS.", cfr: "392.2" },
      { text: "Use 392.2-SLLUP (unlawful parking or leaving vehicle in roadway) for improper parking on on/off ramps, rest areas, etc. Do NOT use disobey traffic control device.", cfr: "392.2", highlight: true },
      "For moving violations under state law, use specific 392.2 code if possible. Example: 392.2SLL-3 (Speeding 11-14 MPH).",
      "Check Traffic Enforcement Box if stopped for a moving violation found in waiver schedule.",
      { text: "Don't tell them they are OOS until they are at safe keeping place. If needed, have vehicle towed.", highlight: true },
      "OOS Vehicles/drivers hauling livestock need Livestock OOS form completed in TRACS (SOP 41-2, 11-02).",
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
      { text: "Verify CDL is valid for class of CMV being operated.", cfr: "383" },
      { text: "Use 391.** for CDL violations.", cfr: "391" },
      "Also see page 7 of truck guide book.",
    ],
  },
  {
    id: "farm",
    title: "Farm Plated TT/ST",
    icon: Tractor,
    color: "#16A34A",
    items: [
      { text: "CDL NOT required if all conditions met (see 75-363(8)(a) / Truck Guide pg 45-50):", sub: true },
      "18 years of age or older with Class O License",
      "Operated by farm owner, ranch owner, or employee/family member of farm or ranch",
      { text: "Does NOT include Truck Tractor/Semi Trailer that requires Hazmat Placard (pg 49)", highlight: true },
      "Interstate operation is within 150 air miles of farm or ranch",
    ],
  },
  {
    id: "clearinghouse",
    title: "Drug & Alcohol Clearinghouse",
    icon: FlaskConical,
    color: "#DC2626",
    items: [
      { text: "Check Clearinghouse Status through Query Central for Prohibited Drivers:", sub: true },
      "Driver tab → Clear user name & password → Query Type = \"Status\" → Select state → Enter CDL # → Search",
      "Verify driver is not prohibited and review any prior inspections for uncorrected prior violations.",
      { text: "Use 390.3e — Prohibited from performing safety sensitive functions per 382.501(a) in the Drug and Alcohol Clearinghouse. Driver will be placed OOS until no longer prohibited.", cfr: "390.3", highlight: true },
    ],
  },
  {
    id: "medical",
    title: "Medical Card Requirements",
    icon: HeartPulse,
    color: "#EC4899",
    cfr: "391",
    items: [
      "Also see page 10 or 38 of truck guide book.",
      "May verify if valid within CDL info return or ask for physical card.",
      { text: "Commercial or Apportion plated — needs medical card if operating in:", sub: true },
      "Interstate Commerce when GVWR or GCWR is more than 10,000 lbs",
      "Intrastate Commerce and a CDL is required to operate the vehicle, UNLESS:",
      { text: "Exempt if driver was issued CDL License PRIOR to July 30, 1996", indent: true },
      { text: "Driver of NON-CDL vehicle is exempt", indent: true },
      { text: "Check of OLN indicates driver is medically qualified", indent: true },
      "Farm Plated — See page 47-50 of truck guide book for guidance.",
      { text: "Fake or altered medical card → 391.49J", cfr: "391.49", highlight: true },
      "NE and some states will disqualify CDL for no medical card = NO CDL = OOS",
      "Good for 2 years or less.",
      { text: "Skill Performance Evaluation (SPE) Certificate — 391.49: Alternative physical qualification standards for the loss or impairment of limbs.", cfr: "391.49" },
    ],
  },
  {
    id: "dot-oa",
    title: "DOT # & Operating Authority",
    icon: Hash,
    color: "#8B5CF6",
    items: [
      { text: "Check DOT# through inspection prescreen or Query Central. Dispatch can also check.", link: "https://portal.fmcsa.dot.gov/login", linkText: "FMCSA Portal" },
      "Check Operating Authority in Query Central — Click on MC#, verify active.",
      "Pg 32 Truck Guide Book.",
      { text: "Exempt from Operating Authority:", sub: true },
      "Intrastate, private hauling their own goods",
      "Carriers hauling exempted commodities",
      { text: "Interstate carrier operating for hire and hauling a regulated commodity needs Operating Authority.", highlight: true },
      { text: "See 372.115 for a list of non-exempt commodities.", cfr: "372.115" },
      { text: "Ways to get legal if Operating Authority not obtained:", sub: true },
      "Company waits to obtain proper Operating Authority (may take 30-45 days)",
      "Leases onto another company with proper Operating Authority & carries all necessary paperwork (lease agreement, markings, etc.)",
      "Company drops trailer and another company with proper authority takes or reloads it",
    ],
  },
  {
    id: "markings",
    title: "Name / DOT # on Vehicle",
    icon: PenLine,
    color: "#F59E0B",
    cfr: "390.21",
    items: [
      { text: "May put on Level 3 inspection if doesn't match MCS-150. See page 36-37 of truck guide book.", cfr: "390.21" },
      { text: "Commercial or Apportion plated:", sub: true },
      "Interstate: anything over 10,000 lbs subject to rules and regulations",
      "Intrastate: anything over 10,000 lbs subject to rules and regulations",
      { text: "Rented vehicles (U-Haul, Penske, Ryder, etc.): Normally DO NOT use rented vehicle's DOT#. Use DOT# of company renting the vehicle. If leased more than 30 days, they need their company's Name and DOT# on the side. (See page 37 of truck guide book)", highlight: true },
      { text: "Farm Plated:", sub: true },
      "Intrastate — NONE",
      "Interstate — Needed (See page 47-50 of truck guide book)",
    ],
  },
  {
    id: "annual",
    title: "Annual Inspection",
    icon: CalendarCheck,
    color: "#0EA5E9",
    cfr: "396.17",
    items: [
      "Sticker on vehicle or paperwork of inspection for vehicle.",
      "Commercial — Needs current annual inspection.",
      "Farm — May not be needed. (See page 47-50 of truck guide book)",
    ],
  },
  {
    id: "logbook-exempt",
    title: "Log Book — When NOT Required",
    icon: BookOpen,
    color: "#10B981",
    cfr: "395.1",
    items: [
      "If using an exception, note in report on the last page of the inspection.",
      { text: "Short Haul / Under 150 air miles (172.6 statute miles) radius of normal work reporting location. Must log all time for the day if exceeding the 150 air mile radius (395.8 interpretation #20).", cfr: "395.1" },
      "See 395.1 guidance #12 for definition of air miles.",
      { text: "Farm Plated (see page 47-50 in the truck guide book):", sub: true },
      "Intrastate trips: logs are exempt",
      "Interstate trip but within 150 air miles (172 miles) of the farm",
      { text: "Intrastate CMV that does not require a CDL to operate (SS 75-363(2)(b)(iv) — \"Drivers\" is key word)", highlight: true },
      { text: "Interstate CMV that does not require CDL to operate, IF:", sub: true },
      "Within 150 air miles of normal reporting location (395.1(e)(2))",
      "Employer keeps time cards",
      { text: "Utility vehicle defined per 395.2", cfr: "395.2" },
      { text: "395.1(n) — Retail Store Delivery within 100 air miles of reporting location Dec. 10-25", cfr: "395.1" },
      { text: "395.1(k) — Ag commodities within 150 air miles of source of commodity/distribution point/farm supply. Can be Commercial/Apportion plated. Includes chemicals, grain, livestock feed, etc.", cfr: "395.1" },
      { text: "ELD HOS Ag Exemptions — Livestock within 150 miles of source AND within 150 miles of destination are exempt from logs.", highlight: true },
      { text: "Driver/salesperson whose total driving time does not exceed 40 hours in 7 consecutive days (395.1(c)).", cfr: "395.1" },
      { text: "Pipeline welding trucks (395.1(x)).", cfr: "395.1" },
    ],
  },
  {
    id: "erods",
    title: "eRODS / ELD Procedures",
    icon: MonitorSmartphone,
    color: "#6366F1",
    cfr: "395.20-38",
    items: [
      { text: "eRODS Inspection Procedure:", sub: true },
      "Open eRODS from desktop → Click FMCSA Web Service Login → Enter FMCSA Portal user ID and Password → Click \"Open from Web Service\" (Safety Official Code displayed top left).",
      { text: "ELD must be mounted in a fixed position during CMV operation and visible to the driver when seated.", cfr: "395.22" },
      { text: "Driver required to have: ELD user manual, instruction sheet to transfer ELDs, instructions to report malfunctions, 8 days of paper logs.", cfr: "395.22" },
      "Request driver to send logs via Web Service and provide driver your Safety Official Code.",
      { text: "A driver must produce and transfer from an ELD.", cfr: "395.24" },
      "Open the log sent via Web Services and review log.",
      { text: "eRODS / ELD Exemptions:", sub: true },
      "Engine model year is older than 2000",
      "Driveaway-towaway operations (transporting empty vehicle for sale, lease or repair, if vehicle is part of shipment) — See 390.5 for definition",
      "Driver who uses paper logs no more than 8 days during any 30-day period",
    ],
  },
  {
    id: "hos-interstate",
    title: "Hours of Service — Interstate",
    icon: Clock,
    color: "#EF4444",
    cfr: "395.3(a)",
    items: [
      { text: "Property Hauling Vehicles — Interstate:", sub: true },
      "Must have started with 10 hours off duty",
      "Can't drive after the end of the 14th hour after coming on duty",
      "Can't drive more than 11 hours during their 14 hours on duty",
      { text: "Must take 30 min rest break within 8 hours of last off duty or sleeper berth period.", cfr: "395.3" },
      "60/70 hour rule",
      "34 hour restart",
      { text: "11 Hour Rule — 395.3(a)(1):", sub: true, cfr: "395.3" },
      "Count from last 10 hour break",
      "Violation if driving after the 11th hour",
      "Violations on previous days logs — note as violation on inspection but NOT OOS",
      { text: "Must be driving at time of 11 hour violation to be OOS", highlight: true },
      { text: "14 Hour Rule — 395.3(a)(2):", sub: true, cfr: "395.3" },
      "Count from end of last 10 hour break",
      "Does not include qualifying rest periods under paragraph (g)(1)(ii)",
      "Violation if driving after the 14th, except with 395.1(o) (16 hour rule) or 395.1(e)(2) (Non-CDL CMV)",
      { text: "Must be driving for violation to exist unless illegally parked", highlight: true },
      "Only count the driving hours after the 14th hour",
      "Violations on previous days logs — note as violation but NOT OOS",
      "Must be driving at time of 14 hour violation to be OOS",
      { text: "16 Hour Exception — 395.1(o):", sub: true, cfr: "395.1" },
      "Released from duty at normal work reporting location for previous 5 duty tours",
      "Return to normal work reporting location and released from duty within 16 hours",
      "Not used 16 hour exception within last 6 days unless they had a 34 hour reset",
      { text: "70 Hour Rule (70 hours in 8 days) / 60 Hour Rule (60 hours in 7 days):", sub: true },
      "Count all driving and on-duty not-driving time",
      { text: "On Duty Time: Basically any time spent in furtherance of the motor carrier business.", cfr: "395.2" },
      { text: "Off Duty Time: Driver is relieved of all duty and responsibility of CMV and cargo.", cfr: "395.2" },
      { text: "30 Min Rest Break — prior to 8 hours driving. May be on-duty, off-duty, sleeper berth or combination of the three.", cfr: "395.3" },
      { text: "Driver hauling livestock interstate with livestock loaded on the vehicle are exempt.", cfr: "395.1", highlight: true },
    ],
  },
  {
    id: "hos-intrastate",
    title: "Hours of Service — Intrastate",
    icon: Clock,
    color: "#F97316",
    items: [
      { text: "Intrastate — (75-363):", sub: true },
      "12 hours max driving time after 10 consecutive hours off duty",
      "16 hour max on duty after 10 consecutive hours off duty",
      "70/80 hours total on-duty/driving time in 7/8 days period",
      "Use 80 hours if company operates 8 days a week",
    ],
  },
  {
    id: "sleeper",
    title: "10 Hours Rest & Split Sleeper Berth",
    icon: Moon,
    color: "#7C3AED",
    cfr: "395.1(g)(1)",
    items: [
      { text: "10 Hours Rest Options:", sub: true },
      "10 hours off duty",
      "10 hours sleeper berth",
      "Off duty / Sleeper berth — 10 consecutive hours",
      "May use 7 hrs in sleeper combined with up to 3 hrs in passenger seat either immediately before or after the sleeper time",
      { text: "Split Sleeper Berth Provision:", sub: true },
      "Neither rest period (off duty or sleeper) is shorter than 2 hours",
      "One rest period must be at least 7 hours in sleeper",
      "Both must total minimum of 10 hours",
      { text: "How to Calculate Split Sleeper:", sub: true },
      "Start counting at the end of the first 10 hours rest period",
      "Count on duty and driving hours in first segment",
      "Don't count first sleeper berth/off duty break that is 2 hours or more",
      "Count second set of on duty and driving hours",
      "Stop counting at the beginning of the second rest segment",
      { text: "11 Hour rule — Count only driving time", highlight: true },
      { text: "14 Hour rule — Count all time except qualifying rest periods under 395.1(g)(1)(ii)", highlight: true },
      { text: "Crew cab pickups (Hotshots) CANNOT claim Sleeper Berth, only off duty — back seat must conform to requirements of 393.76.", cfr: "393.76", highlight: true },
    ],
  },
  {
    id: "personal-conveyance",
    title: "Personal Conveyance",
    icon: CarFront,
    color: "#14B8A6",
    items: [
      { text: "Can't be used to further the load or reposition the vehicle to be redispatched.", highlight: true },
      "See 395.8 Interpretation #26 or \"Proper uses of personal conveyance\" guidance.",
      { text: "Violation is false log — OOS 10 hours.", highlight: true },
    ],
  },
  {
    id: "logbook-req",
    title: "Log Book Requirements",
    icon: FileText,
    color: "#0284C7",
    cfr: "395.8",
    items: [
      { text: "Each separate daily log without the below items is a violation:", sub: true },
      "Date",
      "Total miles driven today",
      "Unit #(s)",
      "Name of Motor Carrier",
      "Driver Signature",
      "Main Office Address (City and State only needed)",
      "Remarks (Example: Change of Duty status — Nearest Town and State)",
      "Co-Driver's Name Printed",
      "Total hours at end of day",
      "Bill of Lading #, or commodity and shipper name",
    ],
  },
  {
    id: "oos-duration",
    title: "OOS Duration — Log Violations",
    icon: AlertOctagon,
    color: "#DC2626",
    items: [
      { text: "Drivers that failed to log current day and the day prior but have previous days (including days they didn't need a log because they were within their 150-mile radius) will be given the opportunity to make it current and will NOT be placed OOS. Cite \"log not current\" on inspection.", highlight: true },
      "No Log book / False Log = OOS 10 hours",
      "Fail to retain 7 previous days = OOS 10 hours",
      "11/14 hours = OOS least amount of time till they show 10 hours of rest (may be 2-10 hrs, depending on sleeper berth or off duty hours)",
      "60/70 hours = OOS until they can get back under 60/70 hours, may need 34 hour restart",
    ],
  },
  {
    id: "electronic-logs",
    title: "Electronic Logs (non-eRODS)",
    icon: MonitorSmartphone,
    color: "#475569",
    items: [
      { text: "Automatic on-board recording device — Unable to use as of December 16, 2019.", highlight: true },
      { text: "Electronic logs other than ELD used in place of paper logs (laptop, cellphone, etc.):", sub: true },
      "Must have all the info required by paper logs",
      "Verify each starting location matches the previous stopping location",
      "See 395.8 Int. #28 for additional requirements",
      { text: "If can't thumb through each change of status → violation as fail to produce log 395.8(a).", cfr: "395.8", highlight: true },
    ],
  },
  {
    id: "misc",
    title: "Miscellaneous Violations",
    icon: AlertOctagon,
    color: "#92400E",
    items: [
      { text: "Ill or fatigued operator — Place OOS until no longer ill or fatigued.", cfr: "392.3", highlight: true },
      { text: "Texting — 392.80. State Statute 60-6,179.02(1)(a). CMV is 10,001 or more per 75-362.", cfr: "392.80" },
      { text: "Use of hand-held phone — 392.82. State Statute 60-6,179.02(2)(a). CMV is 10,001 or more per 75-362.", cfr: "392.82" },
      { text: "Unauthorized Passenger — 392.60a. Must have letter on file with company but not required to be carried by the driver.", cfr: "392.60" },
      { text: "Read / Speak English — 391.11(b)(2). Sufficiently to converse with public, understand traffic signs, respond to inquiries, make entries on reports. Violation only — NOT OOS.", cfr: "391.11" },
      { text: "Radar Detector — 392.71. State Statute 75-363 (CDL or Interstate non-CDL). Radar detectors in an intrastate non-CDL vehicle are allowed due to 75-363(2)(b)(iv).", cfr: "392.71" },
    ],
  },
  {
    id: "drugs-alcohol",
    title: "Drugs & Alcohol",
    icon: Ban,
    color: "#B91C1C",
    cfr: "392.4 / 392.5",
    items: [
      "See Alcohol-Drug CMV Job Aid for additional info on DUI procedures.",
      { text: "Intrastate vehicles must require CDL to operate the vehicle for 392.4 or 392.5 to apply.", cfr: "392.4", highlight: true },
      "Possession of unopened alcohol or drugs is NOT a violation in intrastate non-CDL vehicle.",
      { text: "Possession of open container or drugs can be cited under 392.2 due to state laws.", cfr: "392.2" },
      { text: "Interstate vehicle use 390.5 definition of CMV (10,001 lbs).", cfr: "390.5" },
      { text: "If Interstate or Intrastate requiring a CDL — Place drivers OOS for 24 hours for:", sub: true, highlight: true },
      { text: "On duty and possess, be under the influence of, or use drugs or other substances.", cfr: "392.4" },
      "Use alcohol or be under the influence of alcohol, within 4 hours before going on duty or operating/having physical control of a CMV.",
      "Use alcohol, be under the influence of alcohol, or have any measured alcohol concentration or detected presence of alcohol, while on duty/operating/in physical control of a CMV.",
      "Be on duty or operate a CMV while the driver possesses alcohol in CMV.",
      { text: "Unopened alcohol in CMV — TRACS statute is 75-363(3G)5A4", highlight: true },
      "For .04, .08, or refusals use appropriate CMV Sworn Report or Sworn Report Notice of Revocation and Temporary License.",
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

  return (
    <li
      className={`text-[13px] leading-relaxed ${
        isSubHeader
          ? "font-semibold text-[#002855] pt-1.5 list-none -ml-4"
          : isHighlight
          ? "text-[#002855] font-medium bg-[#D4AF37]/10 rounded px-2 py-1 -mx-1 border-l-2 border-[#D4AF37]"
          : isIndented
          ? "ml-4 text-[#475569]"
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
