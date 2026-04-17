import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, ChevronUp, RotateCcw, Info, ExternalLink, CheckCircle2,
  FileText, Package, Tag, AlertTriangle, Truck, ClipboardCheck, BookOpen, ArrowRight,
  Wrench, X, List,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { PackageClassHelper, MaterialsOfTradeHelper, SegregationTable, PlacardHelper, SubstanceLookup } from "../components/app/HazMatHelpers";
import { PlacardReference } from "../components/app/PlacardReference";
import { toast } from "sonner";

/* ================================================================
   HM RESOURCE LINKS
   ================================================================ */
const HM_LINKS = [
  {
    label: "CVSA OOS Criteria App (iOS)",
    url: "https://apps.apple.com/us/app/cvsa-out-of-service-criteria/id1424204784",
    desc: "Full OOS criteria on your device",
  },
  {
    label: "CVSA OOS Criteria App (Android)",
    url: "https://play.google.com/store/apps/details?id=com.cvsa&hl=en_US",
    desc: "Full OOS criteria on your device",
  },
  {
    label: "CVSA HM Inspection Bulletins",
    url: "https://cvsa.org/inspections/inspection-bulletins/",
    desc: "Current CVSA inspection bulletins",
  },
  {
    label: "eCFR — 49 CFR Part 177",
    url: "https://www.ecfr.gov/current/title-49/part-177",
    desc: "Carriage by highway, segregation table",
  },
  {
    label: "ERG App (iOS)",
    url: "https://apps.apple.com/us/app/erg-for-ios/id1597142669",
    desc: "Emergency Response Guidebook app",
  },
];

/* ================================================================
   eCFR URL HELPER
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

function CfrRef({ r }) {
  if (!r) return null;
  const url = ecfrUrl(r);
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#002855]/70 hover:text-[#D4AF37] hover:underline transition-colors flex-shrink-0">
        {r}<ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-50" />
      </a>
    );
  }
  return <span className="text-[10px] font-mono text-[#94A3B8] flex-shrink-0">{r}</span>;
}

/* ================================================================
   TIP COMPONENT
   ================================================================ */
function TipBlock({ tip }) {
  const [open, setOpen] = useState(false);
  if (!tip) return null;
  return (
    <div className="mt-1">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-[10px] text-[#D4AF37] hover:text-[#002855] font-medium transition-colors" data-testid="tip-toggle">
        <Info className="w-3 h-3" />
        <span>{open ? "Hide tip" : "Inspector tip"}</span>
      </button>
      {open && (
        <div className="mt-1 text-[10px] text-[#475569] bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-2.5 py-1.5 leading-relaxed">
          {tip}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   WORKSHEET DATA — 49 CFR HazMat Inspection Steps (v26.1)
   Matches reference sheet hierarchy: main items are checkable, subs are reference info
   ================================================================ */
const STEPS = [
  {
    step: 1,
    title: "Collect Required Documents",
    icon: FileText,
    tip: "Before beginning, collect all required documents from the driver. Shipping papers must be within the driver's immediate reach while at the controls or in the driver's side door pouch.",
    items: [
      { id: "1.1", label: "Shipping papers", ref: "177.817", tip: "Must be readily accessible. Driver must present them immediately upon request. During rest stops, papers should be placed on the driver's seat or in a holder on the driver's door." },
      { id: "1.2", label: "Emergency response information", ref: "172.602(c)", tip: "Must be immediately accessible. Can be on the shipping paper, in a separate document like an SDS, or in the ERG as long as it cross-references the shipping paper. Includes: basic description, immediate hazards, fire/explosion risks, precautions, firefighting procedures, spill handling, and first aid." },
      { id: "1.3", label: "HM Registration when required", ref: "107.601 / 107.620", tip: "Required for highway route-controlled quantity of radioactive material, more than 55 lbs of Div 1.1/1.2/1.3, more than 1 liter per package of PIH Zone A, bulk packaging 3,500+ gal (liquids/gases) or 468+ cu ft (solids), non-bulk 5,000+ lbs of one placardable class, or any quantity requiring placarding. Registration through PHMSA, renewed annually (July 1–June 30)." },
      { id: "1.4", label: "HM Safety Permit when required", ref: "385.403 / 385.415", tip: "Required for: highway route-controlled quantity radioactive, more than 55 lbs Div 1.1/1.2/1.3, more than 1 liter PIH Zone A, bulk Div 2.3 gas, MCT cargo tanks with certain Class 3 or Div 2.1. Carrier must have satisfactory safety rating." },
    ],
  },
  {
    step: 2,
    title: "Check the Shipping Paper",
    icon: ClipboardCheck,
    tip: "The shipping paper is the most critical document. Always verify using the Hazardous Materials Table (172.101). The basic description must appear in ISHP sequence per 172.202(b): ID Number, Proper Shipping Name, Hazard Class/Division, Packing Group.",
    items: [
      { id: "2.1", label: "Listed properly with non-HM", ref: "172.201(a)(1)", tip: "HM entries must be distinguished from non-HM. Methods: listing HM first, 'X' in HM column, highlighting, different color, or a statement that all items are HM." },
      { id: "2.2", label: "If hazardous waste — check manifest", ref: "172.205", tip: "Requires Uniform Hazardous Waste Manifest (EPA Form 8700-22). 'WASTE' must precede the proper shipping name. Must include EPA ID numbers for generator, transporter, and destination." },
      { id: "2.3", label: "Check basic shipping description", ref: "172.202", tip: "Use the Hazardous Materials Table (172.101) to verify each element of the description.", subs: [
        { label: "Locate entry by proper shipping name in Column 2 — must be Roman type (not italics)", ref: "172.101" },
        { label: "Reference Column 1 for symbols: (+) = fixed name/class/PG, cannot be modified. (A) = regulated only by aircraft. (D) = domestic-only proper shipping name. (G) = generic name, requires technical name in parentheses per 172.203(k). (I) = international shipping name. (W) = regulated only by water." },
        { label: "ID number is as listed in Column 4" },
        { label: "Hazard class/division is as listed in Column 3" },
        { label: "Subsidiary hazards (in parentheses) are as listed in Column 6" },
        { label: "Packing group is as listed in Column 5" },
        { label: "Basic description in proper sequence (ISHP)", ref: "172.202(b)" },
        { label: "Total quantity listed with unit of measure", ref: "172.202(a)(5)" },
        { label: "Number and type of packages listed", ref: "172.202(a)(7)" },
      ]},
      { id: "2.4", label: "Check Appendix A — is material a Hazardous Substance?", ref: "172.101", tip: "If the material is listed in Appendix A and the quantity in a single package equals or exceeds the Reportable Quantity (RQ), it is ALWAYS a hazardous material regardless of other exceptions. Per 172.203(c): the letters 'RQ' must appear on the shipping paper either before or after the basic description (e.g., 'RQ, UN1760, Corrosive liquid, n.o.s., 8, PG II'). If the proper shipping name does not identify the hazardous substance by name, the name must also appear in parentheses.", link: "tool-substance-lookup" },
      { id: "2.5", label: "Check Appendix B — is material a Marine Pollutant?", ref: "172.101", tip: "Per 172.203(l): (1) For n.o.s. or generic entries (Column 1 shows 'G'), the name of the component making the material a marine pollutant must appear in parentheses (e.g., 'UN3082, Environmentally hazardous substance, liquid, n.o.s., 9, PG III (Phenol), Marine Pollutant'). If two or more marine pollutant components are present, at least two must be listed. (2) The words 'Marine Pollutant' must be entered in association with the basic description. IMPORTANT: Per 172.203(l)(4), marine pollutants in NON-BULK packagings are EXCEPTED from (l)(1) and (l)(2) unless all or part of transportation is by vessel.", link: "tool-substance-lookup" },
      { id: "2.6", label: "Check for additional descriptions when required", ref: "172.203", tip: "Review each applicable additional description requirement based on the material type.", subs: [
        { label: "DOT special permits", ref: "172.203(a)" },
        { label: "Limited Quantities", ref: "172.203(b)" },
        { label: "Hazardous substances (RQ notation)", ref: "172.203(c)" },
        { label: "Empty packages ('RESIDUE: Last Contained ***')", ref: "172.203(e)" },
        { label: "Cargo tanks with Anhydrous Ammonia or LPG", ref: "172.203(h)" },
        { label: "Technical Names (when Column 1 shows 'G')", ref: "172.203(k)" },
        { label: "Marine Pollutants", ref: "172.203(l)" },
        { label: "Poisonous Materials (inhalation hazard + zone)", ref: "172.203(m)" },
        { label: "Elevated Temperature materials ('HOT')", ref: "172.203(n)" },
        { label: "Organic peroxide / self-reactive material", ref: "172.203(o)" },
        { label: "Non-odorized LPG", ref: "172.203(p)" },
      ]},
      { id: "2.7", label: "Check emergency response telephone number", ref: "172.604", tip: "Per 172.604(a), a 24-hour emergency response telephone number must be entered on the shipping paper. The number must include the area code or international access code and be preceded by the '+' symbol for international numbers. The number must be: (1) monitored at all times the material is in transportation — answering machines, voicemail, paging services, or beepers do NOT comply; (2) for a person who is either knowledgeable of the HM being shipped and has comprehensive emergency response and incident mitigation information, or has immediate access to a person who possesses such knowledge and information; (3) entered either immediately following each HM description, OR entered once on the shipping paper in a clearly visible, prominent location. If entered once, the offeror must also include the name of the person or contract number (or other unique identifier) of the ERI provider. CHEMTREC (1-800-424-9300) is a commonly used ERI provider." },
    ],
  },
  {
    step: 3,
    title: "Check for Authorized Packages & Exceptions",
    icon: Package,
    tip: "The HM Table (172.101) Columns 7, 8A, 8B, and 8C direct you to the specific packaging requirements in Part 173. Always verify the packaging is authorized for the specific material.",
    items: [
      { id: "3.1", label: "Using the Hazardous Materials Table (172.101)", ref: "172.101", tip: "Column 7 lists special provision codes in 172.102. Code meanings per 172.102(b): Numeric only = multi-modal (bulk and non-bulk). 'A' = aircraft only. 'B' = bulk only (not UN/IM portable tanks or IBCs). 'IB'/'IP' = IBCs only. 'N' = non-bulk only. 'R' = rail only. 'T' = UN/IM portable tanks only. 'TP' = portable tank additional provisions. 'W' = water only.", subs: [
        { label: "Reference Column 7 for special provisions that apply", ref: "172.102" },
        { label: "Reference Column 8A for exceptions (limited quantities, consumer commodities, etc.)", ref: "173.XXX" },
        { label: "Reference Column 8B (non-bulk) or 8C (bulk) for authorized packages", ref: "173.XXX" },
        { label: "Some packages may be authorized only by special permit", ref: "107.101–107.105" },
      ]},
    ],
  },
  { step: 0, title: "BEGIN THE VEHICLE INSPECTION", divider: true },
  {
    step: 4,
    title: "Check for Placarding Compliance",
    icon: AlertTriangle,
    tip: "Placards are 250mm (9.84 in) diamond-shaped signs on all four sides of a vehicle. Use the primary hazard class from the shipping paper to find the required placard. Table 1 = any amount, Table 2 = over 1,001 lbs.",
    items: [
      { id: "4.1", label: "Look up material by primary hazard class — find required placard", ref: "172.504(e)", tip: "Use the placarding tables to determine if a placard is required based on the material's hazard class.", link: "tool-placard-helper", subs: [
        { label: "Table 1 materials require placards in ANY amount" },
        { label: "Table 2 materials require placards over 1,001 lbs aggregate weight" },
      ]},
      { id: "4.2", label: "Bulk packages require placards except:", ref: "172.514", subs: [
        { label: "Some portable tanks (<1,000 gal)" },
        { label: "DOT 106/110 multi-unit tank car tanks" },
        { label: "Some bulk bags/boxes (<640 cu ft)" },
        { label: "IBCs (may be labeled instead)" },
        { label: "Large packagings" },
      ]},
      { id: "4.3", label: "Check exceptions from placarding", ref: "172.500(b)", subs: [
        { label: "Limited quantities" },
        { label: "Small quantities", ref: "173.13 / 173.4" },
        { label: "Combustible liquids in non-bulk packages" },
        { label: "Infectious substances" },
      ]},
      { id: "4.4", label: "Check for placard substitutions", ref: "172.504(f)(1-11)", tip: "Review all 11 substitution provisions. Common: NON-FLAMMABLE GAS for OXYGEN, FLAMMABLE for COMBUSTIBLE, Class 9 domestic exception." },
      { id: "4.5", label: "Check proper use of DANGEROUS placard", ref: "172.504(b)", subs: [
        { label: "May be used for 2+ Table 2 materials in non-bulk packages" },
        { label: "Must placard for one category over 2,205 lbs loaded at one facility" },
      ]},
      { id: "4.6", label: "Check prohibited placarding", ref: "172.502(a)", subs: [
        { label: "No placards unless material is HM, represents hazard of HM, and conforms to requirements", ref: "172.502(a)(1)" },
        { label: "No signs, advertisements, slogans, or devices that could be confused with placards", ref: "172.502(a)(2)" },
      ]},
      { id: "4.7", label: "Check permissive placarding", ref: "172.502(c)", tip: "Placards may be displayed even when not required, as long as they conform to requirements and represent an actual hazard on the vehicle." },
      { id: "4.8", label: "Check for subsidiary hazard placards", ref: "172.505", tip: "Subsidiary placards are in addition to the primary hazard placard.", subs: [
        { label: "Required for: >1,001 lbs uranium hexafluoride with Corrosive subsidiary" },
        { label: "Required for: Poison Inhalation Hazard (PIH) — always, any quantity" },
        { label: "Required for: Dangerous When Wet subsidiary" },
        { label: "Allowed for others if listed in Column 6 of 172.101 table" },
      ]},
      { id: "4.9", label: "Verify placards displayed on both sides AND both ends", ref: "172.504(a)", tip: "Four placards required. On a tractor-trailer: front on the tractor, rear on the trailer. Must not be obscured by ladders, pipes, doors, or tarpaulins." },
      { id: "4.10", label: "Verify placards meet general specifications", ref: "172.519", tip: "At least 250mm (9.84 in) per side, diamond-shaped, durable, correct colors, class number in bottom corner." },
      { id: "4.11", label: "Check visibility and display of placards", ref: "172.516", tip: "Readable from all four directions, at least 3 inches from other markings, securely attached, upright diamond orientation, free from damage/fading." },
    ],
  },
  {
    step: 5,
    title: "Check Marking Compliance",
    icon: Tag,
    tip: "Markings identify the specific HM in a package or on a vehicle. Key distinction: Bulk = capacity >119 gal (liquids), >882 lbs (solids), or >1,000 lbs water capacity (gases).",
    items: [
      { id: "5.0", label: "Determine if the shipment is bulk or non-bulk" },
      { id: "5.h0", type: "header", label: "Both types of packages" },
      { id: "5.1", label: "If poisonous — verify package marked as required", ref: "172.313", tip: "Div 6.1 PG I/II: mark 'PG I TOXIC' or 'PG II TOXIC'. Materials meeting inhalation toxicity criteria: also mark 'INHALATION HAZARD'." },
      { id: "5.2", label: "If DOT Special Permit — marked with 'DOT-SP' or 'DOT-E' + number", ref: "172.301(c) / 172.302(c)", tip: "Non-bulk: 172.301(c). Bulk: 172.302(c). Older permits may use 'DOT-E' numbering — both valid." },
      { id: "5.3", label: "Transport vehicle displays ID numbers when required", ref: "172.332" },
      { id: "5.4", label: "Large quantities of single HM in non-bulk (4,000+ kg)", ref: "172.301(a)(3)", tip: "When 4,000 kg (8,820 lbs) or more of a single HM in non-bulk is loaded at one facility, display ID number on vehicle as for bulk." },
      { id: "5.5", label: "Bulk package markings not visible from outside vehicle", subs: [
        { label: "Portable tank", ref: "172.326(c)(2)" },
        { label: "Cargo tank", ref: "172.328(a)(3)" },
        { label: "Multi-unit tank car tank", ref: "172.330(b)" },
        { label: "Other bulk packages", ref: "172.331(c)" },
      ]},
      { id: "5.h1", type: "header", label: "Bulk packages" },
      { id: "5.6", label: "ID number displayed correctly", ref: "172.302", subs: [
        { label: "Each side and each end if 1,000 gal or more" },
        { label: "Two opposing sides if less than 1,000 gal" },
      ]},
      { id: "5.7", label: "ID number in acceptable format", ref: "172.332", subs: [
        { label: "Orange panels" },
        { label: "Across the placard" },
        { label: "White square-on-point display" },
      ]},
      { id: "5.8", label: "Check ID number special provisions", ref: "172.336", subs: [
        { label: "Multiple compartments / Petroleum distillate fuels / Gasoline / Fuel oil" },
        { label: "Nurse tanks (ID not required on end with valves/fittings per 173.315(m))" },
      ]},
      { id: "5.9", label: "Portable tanks", ref: "172.326", tip: "Mark with: proper shipping name, ID number, owner/lessee name. Check requalification date." },
      { id: "5.10", label: "Cargo tanks", ref: "172.328", subs: [
        { label: "'Emergency Shutoff' marking near shutoff device", ref: "172.328(c)" },
        { label: "Class 2 materials — proper shipping name on sides and ends (2 in+ letters)", ref: "172.328(b)" },
        { label: "MC330/MC331 — QT or NQT designation", ref: "172.328(d)" },
        { label: "Non-odorized LPG marking", ref: "172.328(e)" },
      ]},
      { id: "5.11", label: "Multi-unit tank car tanks", ref: "172.330" },
      { id: "5.12", label: "Other bulk packages (IBC)", ref: "172.331" },
      { id: "5.h2", type: "header", label: "Verify special markings for:" },
      { id: "5.13", label: "Marine pollutant", ref: "172.322", tip: "Triangle with fish and tree symbol. Bulk: displayed on each side and each end adjacent to placard." },
      { id: "5.14", label: "Infectious substances", ref: "172.323", tip: "International biohazard symbol, proper shipping name, ID number, shipper/consignee info." },
      { id: "5.15", label: "Elevated temperature materials", ref: "172.325", tip: "'HOT' marking on both sides and both ends for bulk." },
      { id: "5.16", label: "Petroleum sour crude oil", ref: "172.327" },
      { id: "5.h3", type: "header", label: "Non-bulk packages" },
      { id: "5.17", label: "Check general requirements", ref: "172.301", subs: [
        { label: "Proper shipping name and identification number" },
        { label: "Technical names (when Column 1 shows 'G')" },
        { label: "Non-odorized LPG marking" },
      ]},
      { id: "5.18", label: "Check for required markings on:", subs: [
        { label: "Liquid HM — orientation arrows", ref: "172.312" },
        { label: "Limited quantities", ref: "172.315" },
        { label: "ORM-D", ref: "172.316" },
        { label: "Explosive HM (EX number)", ref: "172.320" },
        { label: "Hazardous Substances (RQ)", ref: "172.324" },
      ]},
    ],
  },
  {
    step: 6,
    title: "Check Labeling Compliance",
    icon: Tag,
    tip: "Labels are smaller (100mm/3.9 in) diamond-shaped hazard warnings on individual packages. Every package must have a primary hazard label unless an exception applies.",
    items: [
      { id: "6.1", label: "Verify labels for primary hazard on all packages", ref: "172.400", subs: [
        { label: "Some bulk packages may be labeled or placarded" },
      ]},
      { id: "6.2", label: "Verify labels for subsidiary hazards as required", ref: "172.402", tip: "Subsidiary labels are required per Column 6 of 172.101. They do NOT display the class number in the bottom corner." },
      { id: "6.3", label: "Check exceptions from labeling", ref: "172.400a", subs: [
        { label: "Dewar flask or cylinder with Class 2 with CGA label" },
        { label: "Certain DOD (Department of Defense) shipments" },
        { label: "Compressed gas cylinder permanently mounted on vehicle" },
        { label: "Overpack — if labels for each HM inside are visible" },
      ]},
      { id: "6.4", label: "Check for correct placement of labels", ref: "172.406", tip: "On same surface near proper shipping name. Primary and subsidiary labels within 6 inches of each other. Not obscured by markings or attachments." },
      { id: "6.5", label: "Check that labels meet specifications", ref: "172.407", tip: "At least 100mm (3.9 in) per side, diamond-shaped, durable, weather-resistant, on contrasting background. Class number in bottom corner of primary labels only." },
    ],
  },
  {
    step: 7,
    title: "Check Loading & Packaging Compliance",
    icon: Truck,
    tip: "Verify packages are authorized, properly loaded, secured, and segregated. Incompatible materials placed too close together can cause catastrophic reactions.",
    items: [
      { id: "7.1", label: "Verify packages are authorized as determined in Step 3", ref: "173.XXX" },
      { id: "7.2", label: "Ensure all specification requirements for packages are met", ref: "178.XXX", tip: "Part 178 contains specifications for each package type. Check UN specification marking, condition, no visible damage, corrosion, or leakage." },
      { id: "7.3", label: "Ensure requalification/retest requirements are met", ref: "180.XXX", tip: "Cylinders: every 5–10 years. Cargo tanks: external visual annually, internal/pressure every 5 years. Portable tanks: every 5 years. IBCs: every 2.5–5 years." },
      { id: "7.4", label: "Observe general securement of packages", ref: "177.834(a)", tip: "Packages must be braced, blocked, or secured against movement during normal transport." },
      { id: "7.5", label: "Verify general packaging requirement", ref: "173.24", subs: [
        { label: "No leaks, no residue on outside, closures tight, venting only when allowed" },
      ]},
      { id: "7.6", label: "Verify segregation, separation, and compatibility", ref: "177.848", tip: "'X' = must NOT be loaded together. 'O' = may be loaded together only if separated. Cyanides/cyanide mixtures must NEVER be loaded with acids.", link: "tool-segregation-table" },
      { id: "7.7", label: "Check loading/transport requirements for certain materials", subs: [
        { label: "Class 1 (Explosives)", ref: "177.835" },
        { label: "Class 3 (Flammable Liquids)", ref: "177.837" },
        { label: "Class 4, Class 5, and Division 4.2", ref: "177.838" },
        { label: "Class 8 (Corrosives)", ref: "177.839" },
        { label: "Class 2 (Compressed Gases)", ref: "177.840" },
        { label: "Division 6.1 and Division 2.3", ref: "177.841" },
      ]},
      { id: "7.8", label: "Check additional requirements for certain packages", subs: [
        { label: "Non-bulk", ref: "173.24a" },
        { label: "Bulk", ref: "173.24b" },
        { label: "Portable tanks", ref: "173.32" },
        { label: "Cargo tanks", ref: "173.33" },
        { label: "IBCs", ref: "173.35" },
        { label: "Large packagings", ref: "173.36" },
        { label: "Flexible bulk containers", ref: "173.37" },
        { label: "Toxic materials in cylinders", ref: "173.40" },
      ]},
    ],
  },
];

/* ================================================================
   QUICK REFERENCE DATA
   ================================================================ */
const QUICK_REF = [
  { heading: "Subchapter A — Hazardous Materials and Oil Transportation", items: [
    { part: "Part 107", desc: "Hazardous Materials Program", sub: [
      { ref: "107.601", desc: "HM Registration" },
    ]},
  ]},
  { heading: "Subchapter C — Hazardous Materials Regulations", items: [
    { part: "Part 171", desc: "General Information", sub: [
      { ref: "171.8", desc: "Definitions" },
    ]},
    { part: "Part 172", desc: "HM Table, Communications, ER Info, Training", sub: [
      { ref: "172.101", desc: "HM Table" },
      { ref: "172.102", desc: "Special Provisions" },
      { ref: "172.2XX", desc: "Shipping Papers (Subpart C)" },
      { ref: "172.3XX", desc: "Markings (Subpart D)" },
      { ref: "172.4XX", desc: "Labeling (Subpart E)" },
      { ref: "172.5XX", desc: "Placarding (Subpart F)" },
      { ref: "172.6XX", desc: "Emergency Response Info (Subpart G)" },
    ]},
    { part: "Part 173", desc: "Shipments and Packagings", sub: [
      { ref: "173.5", desc: "Agricultural operations" },
      { ref: "173.6", desc: "Materials of trade exceptions" },
      { ref: "173.8", desc: "Non-spec packagings (intrastate)" },
      { ref: "173.24", desc: "General packaging requirements" },
      { ref: "173.29", desc: "Empty packagings" },
    ]},
    { part: "Part 177", desc: "Carriage By Public Highway", sub: [
      { ref: "177.801", desc: "Unacceptable HM shipments" },
      { ref: "177.804", desc: "Compliance with FMCSRs" },
      { ref: "177.817", desc: "Shipping Papers" },
      { ref: "177.834", desc: "General loading requirements" },
      { ref: "177.848", desc: "Segregation of HM" },
    ]},
    { part: "Part 178", desc: "Specifications for Packagings", sub: [
      { ref: "178.337", desc: "Cargo tank spec MC331" },
      { ref: "178.345", desc: "Cargo tank spec DOT 406/407/412" },
      { ref: "178.700", desc: "UN standard packaging" },
    ]},
    { part: "Part 180", desc: "Qualification & Maintenance of Packagings", sub: [
      { ref: "180.407", desc: "Cargo tank inspection & test" },
      { ref: "180.205", desc: "Cylinder requalification" },
      { ref: "180.605", desc: "IBC inspection & test" },
    ]},
  ]},
];

/* ================================================================
   STORAGE KEY
   ================================================================ */
const STORAGE_KEY = "hazmat-worksheet-checks";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function HazMatWorksheet() {
  const navigate = useNavigate();
  const badge = localStorage.getItem("safespect-badge") || "";
  const storageKey = `hazmat-worksheet-checks-${badge}`;
  const [checks, setChecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; }
  });
  const [openSteps, setOpenSteps] = useState({});
  const [showRef, setShowRef] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist"); // "checklist" | "tools"

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checks));
  }, [checks, storageKey]);

  const toggleCheck = useCallback((id) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleStepComplete = useCallback((step) => {
    const checkable = step.items.filter((i) => i.type !== "header" && i.type !== "info");
    const allChecked = checkable.every((i) => checks[i.id]);
    setChecks((prev) => {
      const next = { ...prev };
      checkable.forEach((i) => { next[i.id] = !allChecked; });
      return next;
    });
  }, [checks]);

  const toggleStep = useCallback((step) => {
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  }, []);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetAll = useCallback(() => {
    setChecks({});
    localStorage.removeItem(storageKey);
    setOpenSteps({});
    setShowResetConfirm(false);
    toast.success("Worksheet reset");
  }, [storageKey]);

  // Cross-navigation between steps and tools
  const navigateTo = useCallback((targetId) => {
    const isToolTarget = targetId.startsWith("tool-");
    const stepMatch = targetId.match(/^step-(\d+)$/);

    if (isToolTarget) {
      setActiveTab("tools");
    }
    if (stepMatch) {
      setActiveTab("checklist");
      setOpenSteps((prev) => ({ ...prev, [parseInt(stepMatch[1])]: true }));
    }

    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-[#D4AF37]", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-[#D4AF37]", "ring-offset-2"), 2000);
      }
    }, 200);
  }, []);

  // Compute progress
  const { stepProgress, totalChecked, totalCheckable } = useMemo(() => {
    const sp = {};
    let tc = 0, ta = 0;
    STEPS.filter(s => !s.divider).forEach((s) => {
      const checkable = s.items.filter((i) => i.type !== "header" && i.type !== "info");
      const checked = checkable.filter((i) => checks[i.id]);
      sp[s.step] = { checked: checked.length, total: checkable.length };
      tc += checked.length;
      ta += checkable.length;
    });
    return { stepProgress: sp, totalChecked: tc, totalCheckable: ta };
  }, [checks]);

  const overallPct = totalCheckable > 0 ? Math.round((totalChecked / totalCheckable) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F3F4F6]" data-testid="hazmat-worksheet">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#002855]">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/")} className="p-1 text-white/60 hover:text-white transition-colors" data-testid="back-btn">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white truncate" style={{ fontFamily: "Outfit, sans-serif" }}>HazMat Inspection Worksheet</h1>
              <p className="text-[10px] text-[#8FAEC5]">49 CFR — General HM Procedure — v26.1</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-white hover:bg-white/10 h-8 px-2 text-xs font-bold" data-testid="hm-resources-btn">
                  Resources
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-2" align="end" data-testid="hm-resources-popover">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] px-2 pb-2">HazMat Resources</p>
                {HM_LINKS.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-[#F1F5F9] transition-colors group" data-testid={`hm-link-${link.label.replace(/[\s/()]/g, '-').toLowerCase()}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                        {link.label}
                        <ExternalLink className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-[#002855] flex-shrink-0" />
                      </p>
                      <p className="text-[10px] text-[#64748B]">{link.desc}</p>
                    </div>
                  </a>
                ))}
              </PopoverContent>
            </Popover>
            {showResetConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-white/60 text-xs mr-1">Reset all?</span>
                <Button onClick={resetAll} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-7 px-2 text-xs font-bold" data-testid="reset-confirm-btn">
                  Yes
                </Button>
                <Button onClick={() => setShowResetConfirm(false)} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 text-xs" data-testid="reset-cancel-btn">
                  No
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowResetConfirm(true)} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2 text-xs" data-testid="reset-btn">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-3 flex">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all border-b-2 ${
              activeTab === "checklist"
                ? "text-[#D4AF37] border-[#D4AF37]"
                : "text-white/50 border-transparent hover:text-white/80"
            }`}
            data-testid="tab-checklist"
          >
            <List className="w-3.5 h-3.5" /> Checklist
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all border-b-2 ${
              activeTab === "tools"
                ? "text-[#D4AF37] border-[#D4AF37]"
                : "text-white/50 border-transparent hover:text-white/80"
            }`}
            data-testid="tab-tools"
          >
            <Wrench className="w-3.5 h-3.5" /> Tools
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 py-4 pb-8 space-y-3">
        {/* CHECKLIST TAB */}
        {activeTab === "checklist" && (
          <>
            {/* OVERALL PROGRESS */}
            <div className="bg-white rounded-xl border p-3" data-testid="overall-progress">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Overall Progress</span>
                <span className="text-xs font-bold text-[#002855]">{totalChecked}/{totalCheckable} ({overallPct}%)</span>
              </div>
              <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallPct}%`, background: overallPct >= 100 ? "#10B981" : overallPct >= 50 ? "#D4AF37" : "#002855" }} />
              </div>
            </div>

        {/* STEPS */}
        {STEPS.map((step) => {
          // Divider
          if (step.divider) {
            return (
              <div key="divider" className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-[#D4AF37]/40" />
                <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest whitespace-nowrap">{step.title}</span>
                <div className="h-px flex-1 bg-[#D4AF37]/40" />
              </div>
            );
          }

          const isOpen = openSteps[step.step];
          const sp = stepProgress[step.step] || { checked: 0, total: 0 };
          const stepPct = sp.total > 0 ? Math.round((sp.checked / sp.total) * 100) : 0;
          const StepIcon = step.icon;
          const stepDone = sp.checked === sp.total && sp.total > 0;

          return (
            <div key={step.step} id={`step-${step.step}`} className="bg-white rounded-xl border overflow-hidden transition-all" data-testid={`step-${step.step}`}>
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.step)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
                data-testid={`step-${step.step}-toggle`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors ${stepDone ? "bg-emerald-100" : "bg-[#002855]/10"}`}>
                  {stepDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <StepIcon className="w-4 h-4 text-[#002855]" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#D4AF37]">STEP {step.step}</span>
                    <span className="text-[9px] text-[#94A3B8]">{sp.checked}/{sp.total}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] truncate">{step.title}</p>
                </div>
                {/* Mini progress bar */}
                <div className="w-12 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${stepPct}%`, background: stepDone ? "#10B981" : "#002855" }} />
                </div>
                <ChevronDown className={`w-4 h-4 text-[#94A3B8] flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Step Body */}
              {isOpen && (
                <div className="border-t px-4 py-3 space-y-1">
                  {/* Mark entire step complete */}
                  <div className="flex items-center gap-2 py-2 px-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStepComplete(step); }}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        stepDone
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-[#002855] hover:bg-[#002855]/10"
                      }`}
                      data-testid={`step-${step.step}-complete`}
                    >
                      {stepDone && (
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span className={`text-[11px] font-semibold ${stepDone ? "text-emerald-600" : "text-[#002855]"}`}>
                      {stepDone ? "Step complete" : "Mark entire step complete"}
                    </span>
                  </div>

                  {/* Step tip */}
                  {step.tip && (
                    <TipBlock tip={step.tip} />
                  )}

                  {/* Items */}
                  <div className="space-y-0.5 pt-1">
                    {step.items.map((item) => {
                      if (item.type === "header") {
                        return (
                          <div key={item.id} className="pt-3 pb-1 flex items-center gap-2">
                            <div className="h-px flex-1 bg-[#E2E8F0]" />
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                            {item.link && (
                              <button onClick={() => navigateTo(item.link)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D4AF37] text-[#002855] text-[10px] font-bold hover:bg-[#c9a432] transition-colors shadow-sm whitespace-nowrap" data-testid={`link-${item.id}`}>
                                Use tool <ArrowRight className="w-3 h-3 rotate-90" />
                              </button>
                            )}
                            <div className="h-px flex-1 bg-[#E2E8F0]" />
                          </div>
                        );
                      }

                      const checked = !!checks[item.id];
                      return (
                        <div key={item.id} className="group">
                          <div className="flex items-start gap-2 py-1.5 px-1 rounded-md hover:bg-[#F8FAFC] transition-colors">
                            <button
                              onClick={() => toggleCheck(item.id)}
                              className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${
                                checked
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-[#CBD5E1] hover:border-[#002855]"
                              }`}
                              data-testid={`check-${item.id}`}
                            >
                              {checked && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className={`text-[12px] leading-relaxed ${checked ? "text-[#94A3B8] line-through" : "text-[#1E293B]"}`}>
                                  {item.label}
                                </span>
                                {item.ref && <CfrRef r={item.ref} />}
                                {item.link && (
                                  <button onClick={(e) => { e.stopPropagation(); navigateTo(item.link); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D4AF37] text-[#002855] text-[9px] font-bold hover:bg-[#c9a432] transition-colors flex-shrink-0 shadow-sm" data-testid={`link-${item.id}`}>
                                    Open tool <ArrowRight className="w-2.5 h-2.5 rotate-90" />
                                  </button>
                                )}
                              </div>
                              {/* Sub-items (reference bullets, not checkboxes) */}
                              {item.subs && item.subs.length > 0 && (
                                <div className="mt-1.5 ml-1 pl-2.5 border-l-2 border-[#E2E8F0] space-y-0.5">
                                  {item.subs.map((sub, si) => {
                                    const subLabel = typeof sub === "string" ? sub : sub.label;
                                    const subRef = typeof sub === "string" ? null : sub.ref;
                                    return (
                                      <div key={si} className="flex items-start gap-1.5 text-[11px] text-[#475569] leading-relaxed">
                                        <span className="text-[#94A3B8] mt-0.5 flex-shrink-0">-</span>
                                        <span>{subLabel}</span>
                                        {subRef && <CfrRef r={subRef} />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {item.tip && <TipBlock tip={item.tip} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </>
        )}

        {/* TOOLS TAB */}
        {activeTab === "tools" && (
          <div className="space-y-3">
            <div id="tool-placard-helper"><PlacardHelper onNavigate={navigateTo} /></div>
            <div id="tool-placard-reference"><PlacardReference /></div>
            <div id="tool-substance-lookup"><SubstanceLookup onNavigate={navigateTo} /></div>
            <div id="tool-package-class-helper"><PackageClassHelper onNavigate={navigateTo} /></div>
            <div id="tool-mot-helper"><MaterialsOfTradeHelper onNavigate={navigateTo} /></div>
            <div id="tool-segregation-table"><SegregationTable onNavigate={navigateTo} /></div>

            {/* QUICK REFERENCE */}
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="quick-reference">
          <button
            onClick={() => setShowRef(!showRef)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
            data-testid="quick-ref-toggle"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex-shrink-0">
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold text-[#0F172A]">Quick Reference — Title 49 Chapter 1 (PHMSA)</p>
              <p className="text-[10px] text-[#94A3B8]">Tap to view regulation index</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${showRef ? "rotate-180" : ""}`} />
          </button>
          {showRef && (
            <div className="border-t px-4 py-3 space-y-4">
              {QUICK_REF.map((section, si) => (
                <div key={si}>
                  <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-2">{section.heading}</p>
                  <div className="space-y-2">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="bg-[#F8FAFC] rounded-lg p-2.5">
                        <a href={`https://www.ecfr.gov/current/title-49/part-${item.part.match(/\d+/)?.[0]}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#002855] hover:text-[#D4AF37] hover:underline transition-colors inline-flex items-center gap-1">
                          {item.part} — {item.desc}<ExternalLink className="w-2.5 h-2.5 opacity-40" />
                        </a>
                        {item.sub && (
                          <div className="mt-1.5 space-y-0.5 pl-3 border-l-2 border-[#E2E8F0]">
                            {item.sub.map((s, si2) => (
                              <div key={si2} className="flex items-center gap-2">
                                <CfrRef r={s.ref} />
                                <span className="text-[10px] text-[#475569]">{s.desc}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[9px] text-[#94A3B8] italic pt-2">
          Based on HM Worksheet v26.1 — 49 CFR Chapter I (PHMSA)
        </p>
      </main>
    </div>
  );
}
