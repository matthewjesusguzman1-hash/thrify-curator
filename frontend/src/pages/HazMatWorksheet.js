import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, RotateCcw, Info, ExternalLink, CheckCircle2,
  FileText, Package, Tag, AlertTriangle, Truck, ClipboardCheck, BookOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

/* ================================================================
   eCFR URL HELPER
   ================================================================ */
function ecfrUrl(ref) {
  if (!ref) return null;
  const clean = ref.replace(/\(.*\)/g, "").replace(/[*]/g, "").trim();
  const parts = clean.split(".");
  if (parts.length >= 2 && parts[1].length > 0) {
    return `https://www.ecfr.gov/current/title-49/section-${parts[0]}.${parts[1]}`;
  }
  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
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
   WORKSHEET DATA — 49 CFR HazMat Inspection Steps
   ================================================================ */
const STEPS = [
  {
    step: 1,
    title: "Collect Required Documents",
    icon: FileText,
    tip: "Before beginning, collect all required documents from the driver. Shipping papers must be within the driver's immediate reach while at the controls or in the driver's side door pouch. During rest stops, papers should be placed on the driver's seat or in a holder on the driver's door.",
    items: [
      { id: "1.1", label: "Shipping papers", ref: "177.817", tip: "Must be readily accessible. Driver must present them immediately upon request. Check that they are properly completed — not just a bill of lading without HM descriptions." },
      { id: "1.2", label: "Emergency response information", ref: "172.602(c)", tip: "Must accompany the shipping papers and include: basic description of the HM, immediate hazards to health, risks of fire/explosion, immediate precautions, firefighting procedures, initial methods for spill handling, and preliminary first aid. An Emergency Response Guidebook (ERG) alone does NOT satisfy this requirement." },
      { id: "1.3", label: "HM Registration when required", ref: "107.601", tip: "Required for any person who transports (or causes to be transported) in commerce any of the following: a highway route-controlled quantity of radioactive material, more than 55 lbs of a Division 1.1/1.2/1.3 material, more than 1 liter per package of material extremely toxic by inhalation, a bulk shipment of HM with a capacity of 3,500 gallons or more. Registration is through PHMSA." },
      { id: "1.4", label: "HM Safety Permit when required", ref: "385.403", tip: "Required for certain high-hazard materials: highway route-controlled quantity of radioactive material, more than 55 lbs of Division 1.1/1.2/1.3 explosives, more than 1 liter of a PIH Zone A material, bulk Division 2.3 gas, MCT cargo tanks carrying certain Class 3 or Division 2.1 materials." },
    ],
  },
  {
    step: 2,
    title: "Check the Shipping Paper",
    icon: ClipboardCheck,
    tip: "The shipping paper is the most critical document for identifying hazardous materials. Always verify using the Hazardous Materials Table (172.101) — it is the authoritative source. The basic description must appear in a specific sequence.",
    items: [
      { id: "2.1", label: "Listed properly with non-HM", ref: "172.201(a)(1)", tip: "HM entries must be distinguished from non-HM. This can be done by: listing HM first with an 'X' in a column marked 'HM', highlighting or printing in a different color, or any other method that makes them stand out." },
      { id: "2.2", label: "If hazardous waste — check manifest", ref: "172.205", tip: "Hazardous waste shipments require a Uniform Hazardous Waste Manifest (EPA Form 8700-22). The word 'WASTE' must precede the proper shipping name on the shipping paper." },
      { id: "2.h1", type: "header", label: "Check basic shipping description using HM Table (172.101)" },
      { id: "2.3", label: "Locate entry by proper shipping name in Column 2", ref: "172.101", tip: "The proper shipping name must be in ROMAN type (not italics). Italicized entries in the table are NOT proper shipping names — they are references to help locate the correct entry. The name on the shipping paper must match the table exactly (with minor exceptions for added detail)." },
      { id: "2.4", label: "Reference Column 1 for symbols that may apply", tip: "Column 1 symbols: (+) = fixed name/class/PG, (A) = subject to HMR only in air, (D) = proper shipping name appropriate for domestic, (G) = generic description - requires technical name in parentheses, (I) = international shipping name, (W) = subject to HMR only by water." },
      { id: "2.5", label: "ID number is as listed in Column 4" },
      { id: "2.6", label: "Hazard class/division is as listed in Column 3" },
      { id: "2.7", label: "Subsidiary hazards (in parentheses) are as listed in Column 6" },
      { id: "2.8", label: "Packing group is as listed in Column 5", tip: "Packing Group indicates degree of danger: PG I = Great danger, PG II = Medium danger, PG III = Minor danger. Not all materials have a PG (e.g., most compressed gases)." },
      { id: "2.9", label: "Basic description in proper sequence", ref: "172.202(b)", tip: "The required order is: Proper Shipping Name, Hazard Class/Division, UN or NA ID Number, Packing Group (if applicable). Example: 'Gasoline, 3, UN1203, PG II'. Additional descriptions may be added before, after, or within this sequence." },
      { id: "2.10", label: "Total quantity listed with unit of measure", ref: "172.202(a)(5)" },
      { id: "2.11", label: "Number and type of packages listed", ref: "172.202(a)(7)" },
      { id: "2.h2", type: "header", label: "Reportable Quantities (RQ)" },
      { id: "2.12", label: "Check Appendix A to 172.101 — is material a Hazardous Substance?", ref: "172.101", tip: "If a material is listed in Appendix A and meets or exceeds the RQ, it is ALWAYS considered a hazardous material regardless of any other exceptions. The letters 'RQ' must appear on the shipping paper before or after the basic description." },
      { id: "2.13", label: "Check Appendix B to 172.101 — is material a Marine Pollutant? (bulk only)", ref: "172.101" },
      { id: "2.h3", type: "header", label: "Check for additional descriptions when required (172.203)" },
      { id: "2.14", label: "DOT Special Permits" },
      { id: "2.15", label: "Limited Quantities" },
      { id: "2.16", label: "Hazardous Substances" },
      { id: "2.17", label: "Empty Packages" },
      { id: "2.18", label: "Cargo tanks with Anhydrous Ammonia or LPG" },
      { id: "2.19", label: "Technical Names", tip: "Required when the proper shipping name uses a generic description (Column 1 symbol 'G'). The technical name must be entered in parentheses following the basic description. Example: 'Corrosive liquid, n.o.s., 8, UN1760, PG II (Hydrochloric acid)'." },
      { id: "2.20", label: "Marine Pollutants" },
      { id: "2.21", label: "Poisonous Materials" },
      { id: "2.22", label: "Elevated Temperature Materials" },
      { id: "2.23", label: "Organic peroxide / self-reactive material" },
      { id: "2.24", label: "Non-odorized LPG" },
      { id: "2.25", label: "Check emergency response telephone number", ref: "172.604(a)(3)", tip: "Must be monitored at all times the material is in transportation. An answering machine or voicemail is NOT acceptable. CHEMTREC (1-800-424-9300) is commonly used. The number must be for a person with knowledge of the material or who has immediate access to someone with such knowledge." },
    ],
  },
  {
    step: 3,
    title: "Check for Authorized Packages & Exceptions",
    icon: Package,
    tip: "The HM Table (172.101) Columns 7, 8A, 8B, and 8C direct you to the specific packaging requirements in Part 173. Always verify the packaging is authorized for the specific material being shipped.",
    items: [
      { id: "3.1", label: "Reference Column 7 for special provisions that apply", ref: "172.102", tip: "Column 7 lists numeric codes that correspond to special provisions in 172.102. These can modify any requirement in the table including packaging, shipping descriptions, or whether the material is even subject to the HMR under certain conditions." },
      { id: "3.2", label: "Reference Column 8A — exceptions that may apply", ref: "173.XXX", tip: "Column 8A references sections in Part 173 that describe exceptions. Common examples: Limited quantities (173.150-156), Consumer commodities (173.XXX), Materials of Trade (173.6). If an exception applies, some or all of the HMR requirements may be reduced." },
      { id: "3.3", label: "Reference Column 8B (non-bulk) or 8C (bulk) — authorized packages", ref: "173.XXX", tip: "Columns 8B and 8C reference sections in Part 173 that list specific authorized packaging. Some packages may only be authorized by a DOT Special Permit (107.101 to 107.105). If a special permit is used, verify the shipment meets all conditions of that permit." },
    ],
  },
  {
    step: 4,
    title: "Check for Placarding Compliance",
    icon: AlertTriangle,
    tip: "Placards communicate the hazard class of materials on a vehicle to emergency responders and other motorists. Use the primary hazard class from the shipping paper to find the required placard in the placarding tables (172.504).",
    items: [
      { id: "4.h0", type: "header", label: "Look up material by primary hazard class — find required placard" },
      { id: "4.1", label: "Table 1 materials require placards in ANY amount", ref: "172.504(e)", tip: "Table 1 includes the most dangerous materials: Division 1.1–1.3 (Explosives), Division 2.3 (Poison Gas), Division 4.3 (Dangerous When Wet), Division 6.1 PG I (Poison/Toxic), Class 7 (Radioactive). These ALWAYS require placards regardless of quantity." },
      { id: "4.2", label: "Table 2 materials require placards over 1,001 lbs aggregate", ref: "172.504(e)", tip: "Table 2 includes: Division 1.4–1.6, Division 2.1–2.2, Class 3, Division 4.1–4.2, Class 5, Division 6.1 PG II/III, Class 8, Class 9, ORM-D. Aggregate is the total gross weight of ALL Table 2 materials on the vehicle." },
      { id: "4.3", label: "Bulk packages require placards (with exceptions)", ref: "172.514", tip: "Exceptions to bulk placarding: some portable tanks, DOT Spec 106/110, some bulk bags/boxes, IBCs, and large packagings. Check 172.514 for specific exemptions." },
      { id: "4.h1", type: "header", label: "Check exceptions from placarding (172.500(b))" },
      { id: "4.4", label: "Limited quantities" },
      { id: "4.5", label: "Small quantities", ref: "173.13" },
      { id: "4.6", label: "Combustible liquids in non-bulk packages" },
      { id: "4.7", label: "Infectious substances" },
      { id: "4.8", label: "Check for placard substitutions", ref: "172.504(f)", tip: "Example: DANGEROUS placard may replace individual Table 2 placards in some cases. Also check subsidiary hazard substitution rules." },
      { id: "4.h2", type: "header", label: "DANGEROUS placard rules (172.504(b))" },
      { id: "4.9", label: "May be used for 2+ Table 2 materials in non-bulk packages", ref: "172.504(b)" },
      { id: "4.10", label: "Must placard for specific class if 2,205+ lbs of one category loaded at one facility", tip: "If 2,205 lbs (1,000 kg) or more of a single Table 2 hazard class/division is loaded at one loading facility, that specific placard must be displayed — the DANGEROUS placard is not sufficient." },
      { id: "4.h3", type: "header", label: "Prohibited & permissive placarding" },
      { id: "4.11", label: "No placards unless material is HM and represents actual hazard", ref: "172.502(a)(1)" },
      { id: "4.12", label: "No signs/advertisements that could be confused with placards", ref: "172.502(a)(2)" },
      { id: "4.13", label: "Check permissive placarding", ref: "172.502(c)" },
      { id: "4.h4", type: "header", label: "Subsidiary hazard placards (172.505)" },
      { id: "4.14", label: "Required for: >1,001 lbs uranium hexafluoride w/ Corrosive subsidiary", ref: "172.505" },
      { id: "4.15", label: "Required for: Poison Inhalation Hazard (PIH)" },
      { id: "4.16", label: "Required for: Dangerous When Wet materials" },
      { id: "4.17", label: "Allowed for others if listed in Column 6 of 172.101", tip: "Subsidiary placards are permitted (even when not required) if the subsidiary hazard is listed in the 172.101 table, Column 6." },
      { id: "4.h5", type: "header", label: "Verify placard display" },
      { id: "4.18", label: "Placards displayed on both sides AND both ends of vehicle", ref: "172.504(a)" },
      { id: "4.19", label: "Placards meet general specifications", ref: "172.519", tip: "Must be at least 250mm (9.84 in) on each side, diamond orientation, durable, not obscured by dirt/debris, correct colors per hazard class, printed on opposite side or transparent holder." },
      { id: "4.20", label: "Visibility and display requirements met", ref: "172.516", tip: "Placards must be clearly visible from the direction they face. They must be securely attached or in a proper holder, and displayed upright in a diamond orientation. Keep clear of any appurtenances." },
    ],
  },
  {
    step: 5,
    title: "Check Marking Compliance",
    icon: Tag,
    tip: "Markings identify the specific hazardous material in a package or on a vehicle. They differ from placards (which identify hazard class) and labels (which are on individual packages). Determine first whether the shipment is bulk or non-bulk.",
    items: [
      { id: "5.h0", type: "header", label: "Both types of packages" },
      { id: "5.1", label: "If poisonous — verify package is marked as required", ref: "172.313" },
      { id: "5.2", label: "If DOT Special Permit — marked with 'DOT-SP' or 'DOT-E' + number", tip: "Non-bulk: 172.301(c), Bulk: 172.302(c). The special permit number must be displayed on the package or vehicle." },
      { id: "5.3", label: "Transport vehicle displays ID numbers when required" },
      { id: "5.4", label: "Large quantities of single HM in non-bulk", ref: "172.301(a)(3)" },
      { id: "5.5", label: "Bulk package markings not visible from outside vehicle", tip: "Check: Portable tanks (172.326(c)(2)), Cargo tanks (172.328(a)(3)), Multi-unit tank car tanks (172.330(b)), Other bulk packages (172.331(c))." },
      { id: "5.h1", type: "header", label: "Bulk packages" },
      { id: "5.6", label: "ID number displayed on each side and each end (1,000+ gal)", ref: "172.302" },
      { id: "5.7", label: "ID number on two opposing sides (less than 1,000 gal)", ref: "172.302" },
      { id: "5.8", label: "ID number in acceptable format: orange panels, placards, or white square-on-point", ref: "172.332", tip: "Three acceptable methods to display the 4-digit ID number: (1) On an orange rectangular panel, (2) Across the center of the placard, (3) On a white square-on-point display (same size as placard). These methods cannot be mixed on the same vehicle." },
      { id: "5.h2", type: "header", label: "ID number special provisions (172.336)" },
      { id: "5.9", label: "Multiple compartments" },
      { id: "5.10", label: "Gasoline" },
      { id: "5.11", label: "Fuel oil" },
      { id: "5.12", label: "Petroleum distillate fuels" },
      { id: "5.13", label: "Nurse tanks" },
      { id: "5.h3", type: "header", label: "Additional bulk marking requirements" },
      { id: "5.14", label: "Portable tanks", ref: "172.326" },
      { id: "5.15", label: "Cargo tanks", ref: "172.328", tip: "Check for: 'Emergency Shutoff' marking (near shutoff valve), Class 2 material markings, proper shipping name, MC330/MC331 specifications, QT/NQT markings, non-odorized LPG marking." },
      { id: "5.16", label: "Cargo tank — 'Emergency Shutoff' marking" },
      { id: "5.17", label: "Cargo tank — Class 2 materials / Proper shipping name" },
      { id: "5.18", label: "Cargo tank — MC330/MC331 / QT or NQT designation" },
      { id: "5.19", label: "Cargo tank — Non-odorized LPG" },
      { id: "5.20", label: "Multi-unit tank car tanks", ref: "172.330" },
      { id: "5.21", label: "Other bulk packages (IBC)", ref: "172.331" },
      { id: "5.h4", type: "header", label: "Verify special markings for:" },
      { id: "5.22", label: "Marine pollutant", ref: "172.322" },
      { id: "5.23", label: "Infectious substances", ref: "172.323" },
      { id: "5.24", label: "Elevated temperature materials", ref: "172.325", tip: "Marked with the word 'HOT' on the package. Applies to materials offered for transport at or above 100C (212F) for liquids, or 240C (464F) for solids." },
      { id: "5.25", label: "Petroleum sour crude oil", ref: "172.327" },
      { id: "5.h5", type: "header", label: "Non-bulk packages" },
      { id: "5.26", label: "General requirements — proper shipping name & ID number", ref: "172.301" },
      { id: "5.27", label: "Technical names on non-bulk (when required)" },
      { id: "5.28", label: "Non-odorized LPG marking" },
      { id: "5.h6", type: "header", label: "Check required markings on non-bulk:" },
      { id: "5.29", label: "Liquid HM — orientation arrows", ref: "172.312", tip: "Required on combination packages containing inner packages with liquid HM. Two arrows pointing up must be placed on two opposite sides." },
      { id: "5.30", label: "Limited quantities", ref: "172.315" },
      { id: "5.31", label: "ORM-D", ref: "172.316" },
      { id: "5.32", label: "Explosive HM", ref: "172.320" },
      { id: "5.33", label: "Hazardous Substances (RQ)", ref: "172.324" },
    ],
  },
  {
    step: 6,
    title: "Check Labeling Compliance",
    icon: Tag,
    tip: "Labels are smaller (100mm/3.9 in) diamond-shaped hazard warnings affixed to individual packages. They are similar in appearance to placards but are package-level. Every package must have a primary hazard label unless an exception applies.",
    items: [
      { id: "6.1", label: "Verify labels for primary hazard on all packages", ref: "172.400", tip: "Each package must have a label corresponding to the primary hazard class (Column 3 of 172.101). The label must match the hazard class exactly." },
      { id: "6.2", label: "Verify labels for subsidiary hazards as required", ref: "172.402", tip: "Subsidiary hazard labels are required as indicated in Column 6 of the 172.101 table. They must be placed next to the primary label." },
      { id: "6.h1", type: "header", label: "Exceptions from labeling (172.400a)" },
      { id: "6.3", label: "Dewar flask or cylinder with Class 2 with CGA label" },
      { id: "6.4", label: "Certain DOD (Department of Defense) shipments" },
      { id: "6.5", label: "Compressed gas cylinder permanently mounted on vehicle" },
      { id: "6.6", label: "Overpack — if labels for each HM inside are visible" },
      { id: "6.7", label: "Check for correct placement of labels", ref: "172.406", tip: "Labels must be: (1) on the same surface and near the proper shipping name marking, (2) not obscured or overlapping, (3) printed/affixed on a background of contrasting color or within a dotted/solid line border." },
      { id: "6.8", label: "Check that labels meet specifications", ref: "172.407", tip: "Labels must be at least 100mm (3.9 in) on each side, diamond-shaped, durable, weather-resistant, and conform to the color and design specifications for the applicable hazard class." },
    ],
  },
  {
    step: 7,
    title: "Check Loading & Packaging Compliance",
    icon: Truck,
    tip: "The final step verifies that authorized packages are properly loaded, secured, and segregated. Incompatible materials placed too close together can cause catastrophic reactions. Always refer to the 177.848 segregation table.",
    items: [
      { id: "7.1", label: "Packages are authorized as determined in Step 3" },
      { id: "7.2", label: "All specification requirements for packages are met", ref: "178.XXX" },
      { id: "7.3", label: "Requalification/retest requirements met", ref: "180.XXX", tip: "Certain packages (cylinders, cargo tanks, portable tanks) require periodic retesting. Check the marking on the package for the last requalification date." },
      { id: "7.4", label: "General securement of packages observed", ref: "177.834(a)" },
      { id: "7.5", label: "General packaging requirement verified", ref: "173.24", tip: "No releases of HM to the environment, no residue on outside of package, closures tight and secure, venting only when authorized, package must withstand normal conditions of transport." },
      { id: "7.6", label: "Segregation, separation, and compatibility verified", ref: "177.848", tip: "Use the 177.848 segregation table. Key rules: materials that are 'X' (Do Not Load) cannot be in the same vehicle. Materials marked 'O' must be separated by a distance or barrier. Cyanides/cyanide mixtures must never be loaded with acids." },
      { id: "7.h1", type: "header", label: "Loading/transport requirements for specific classes" },
      { id: "7.7", label: "Class 1 (Explosives)", ref: "177.835" },
      { id: "7.8", label: "Class 3 (Flammable Liquids)", ref: "177.837" },
      { id: "7.9", label: "Class 4 / Class 5 / Division 4.2", ref: "177.838" },
      { id: "7.10", label: "Class 8 (Corrosives)", ref: "177.839" },
      { id: "7.11", label: "Class 2 (Compressed Gases)", ref: "177.840" },
      { id: "7.12", label: "Division 6.1 (Poison) and Division 2.3 (Poison Gas)", ref: "177.841" },
      { id: "7.h2", type: "header", label: "Additional requirements for specific packages" },
      { id: "7.13", label: "Non-bulk packages", ref: "173.24a" },
      { id: "7.14", label: "Bulk packages", ref: "173.24b" },
      { id: "7.15", label: "Portable tanks", ref: "173.32" },
      { id: "7.16", label: "Cargo tanks", ref: "173.33" },
      { id: "7.17", label: "IBCs (Intermediate Bulk Containers)", ref: "173.35" },
      { id: "7.18", label: "Large packagings", ref: "173.36" },
      { id: "7.19", label: "Flexible bulk containers", ref: "173.37" },
      { id: "7.20", label: "Toxic materials in cylinders", ref: "173.40" },
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
    { part: "Part 178", desc: "Specifications for Packagings" },
    { part: "Part 180", desc: "Qualification & Maintenance of Packagings" },
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
  const [checks, setChecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  });
  const [openSteps, setOpenSteps] = useState({ 1: true });
  const [showRef, setShowRef] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  }, [checks]);

  const toggleCheck = useCallback((id) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleStep = useCallback((step) => {
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  }, []);

  const resetAll = useCallback(() => {
    if (window.confirm("Reset all checkboxes? This cannot be undone.")) {
      setChecks({});
      toast.success("Worksheet reset");
    }
  }, []);

  // Compute progress
  const { stepProgress, totalChecked, totalCheckable } = useMemo(() => {
    const sp = {};
    let tc = 0, ta = 0;
    STEPS.forEach((s) => {
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
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
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
          <Button onClick={resetAll} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2 text-xs" data-testid="reset-btn">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>
        <div className="gold-accent h-[2px]" />
      </header>

      <main className="max-w-3xl mx-auto px-3 py-4 pb-20 space-y-3">
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
          const isOpen = openSteps[step.step];
          const sp = stepProgress[step.step] || { checked: 0, total: 0 };
          const stepPct = sp.total > 0 ? Math.round((sp.checked / sp.total) * 100) : 0;
          const StepIcon = step.icon;
          const stepDone = sp.checked === sp.total && sp.total > 0;

          return (
            <div key={step.step} className="bg-white rounded-xl border overflow-hidden" data-testid={`step-${step.step}`}>
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
                            <div className="h-px flex-1 bg-[#E2E8F0]" />
                          </div>
                        );
                      }

                      if (item.type === "info") {
                        return (
                          <div key={item.id} className="py-1 px-2 text-[11px] text-[#64748B] italic bg-[#F8FAFC] rounded">
                            {item.label}
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
                              </div>
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
                        <p className="text-[11px] font-bold text-[#002855]">{item.part} — {item.desc}</p>
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

        {/* Footer */}
        <p className="text-center text-[9px] text-[#94A3B8] italic pt-2">
          Based on HM Worksheet v26.1 — 49 CFR Chapter I (PHMSA)
        </p>
      </main>
    </div>
  );
}
