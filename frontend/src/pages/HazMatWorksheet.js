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
    label: "eCFR — 49 CFR Part 172",
    url: "https://www.ecfr.gov/current/title-49/part-172",
    desc: "HM Table, shipping papers, marking, labeling, placarding",
  },
  {
    label: "eCFR — 49 CFR Part 173",
    url: "https://www.ecfr.gov/current/title-49/part-173",
    desc: "Packaging requirements & exceptions",
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
  {
    label: "FMCSA HM Safety",
    url: "https://www.fmcsa.dot.gov/safety/hazardous-materials-safety",
    desc: "FMCSA HazMat safety resources",
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
   WORKSHEET DATA — 49 CFR HazMat Inspection Steps
   ================================================================ */
const STEPS = [
  {
    step: 1,
    title: "Collect Required Documents",
    icon: FileText,
    tip: "Before beginning, collect all required documents from the driver. Shipping papers must be within the driver's immediate reach while at the controls or in the driver's side door pouch. During rest stops, papers should be placed on the driver's seat or in a holder on the driver's door.",
    items: [
      { id: "1.1", label: "Shipping papers", ref: "177.817", tip: "Must be readily accessible. Driver must present them immediately upon request. Check that they are properly completed — not just a bill of lading without HM descriptions. The driver must be able to distinguish HM shipping papers from other papers." },
      { id: "1.2", label: "Emergency response information", ref: "172.602(c)", tip: "Must be immediately accessible and include: basic description of the HM, immediate hazards to health, risks of fire/explosion, immediate precautions, firefighting procedures, initial methods for spill handling, and preliminary first aid. Can be provided on the shipping paper itself, in a separate document like an SDS, or in the Emergency Response Guidebook (ERG) as long as it cross-references the shipping paper description. Must be maintained in the same manner as shipping papers — within driver's reach or in the driver's door pouch." },
      { id: "1.3", label: "HM Registration when required", ref: "107.601", tip: "Required for any person who offers or transports in commerce: a highway route-controlled quantity of radioactive material, more than 25 kg (55 lbs) of Div 1.1/1.2/1.3 material, more than 1 liter per package of PIH Zone A material, a bulk packaging with capacity of 3,500 gal (liquids/gases) or 468 cu ft (solids) or more, a non-bulk shipment of 5,000 lbs or more gross weight of one placardable class, or any quantity requiring placarding. Registration is through PHMSA and must be renewed annually (July 1–June 30)." },
      { id: "1.4", label: "HM Safety Permit when required", ref: "385.403", tip: "Required for: highway route-controlled quantity of radioactive material, more than 55 lbs of Division 1.1/1.2/1.3 explosives, more than 1 liter of a PIH Zone A material, bulk Division 2.3 gas, MCT cargo tanks carrying certain Class 3 or Division 2.1 materials. Carrier must have a satisfactory safety rating to hold a permit." },
    ],
  },
  {
    step: 2,
    title: "Check the Shipping Paper",
    icon: ClipboardCheck,
    tip: "The shipping paper is the most critical document for identifying hazardous materials. Always verify using the Hazardous Materials Table (172.101) — it has 10 columns. The basic description must appear in a specific sequence per 172.202(b): ID Number, Proper Shipping Name, Hazard Class/Division, Packing Group (remember: ISHP).",
    items: [
      { id: "2.1", label: "Listed properly with non-HM", ref: "172.201(a)(1)", tip: "HM entries must be distinguished from non-HM. Acceptable methods: listing HM first, placing an 'X' in a column marked 'HM', highlighting or printing in a different color, or any method that makes them stand out. If all items on the paper are HM, a statement to that effect is acceptable." },
      { id: "2.2", label: "If hazardous waste — check manifest", ref: "172.205", tip: "Hazardous waste shipments require a Uniform Hazardous Waste Manifest (EPA Form 8700-22). The word 'WASTE' must precede the proper shipping name. The manifest must include EPA ID numbers for generator, transporter, and destination facility." },
      { id: "2.h1", type: "header", label: "Check basic shipping description using HM Table (172.101)" },
      { id: "2.3", label: "Locate entry by proper shipping name in Column 2", ref: "172.101", tip: "The proper shipping name must be in ROMAN type (not italics). Italicized entries in the table are NOT proper shipping names — they are cross-references. The name on the shipping paper must match the table exactly (minor additions for clarity are permitted, but not alterations)." },
      { id: "2.4", label: "Reference Column 1 for symbols that may apply", ref: "172.101", tip: "Column 1 symbols: (+) = fixed name/class/PG — cannot be modified even by special provision, (A) = subject to HMR only when transported by aircraft, (D) = domestic-only proper shipping name, (G) = generic name — requires technical name in parentheses per 172.203(k), (I) = international shipping name, (W) = subject to HMR only when transported by water." },
      { id: "2.5", label: "ID number is as listed in Column 4", ref: "172.101", tip: "ID numbers start with 'UN' (international) or 'NA' (North America only). Common examples: UN1203 (Gasoline), UN1075 (LPG), UN1005 (Anhydrous Ammonia). NA numbers are not recognized internationally." },
      { id: "2.6", label: "Hazard class/division is as listed in Column 3", ref: "172.101", tip: "9 hazard classes: 1-Explosives, 2-Gases, 3-Flammable Liquids, 4-Flammable Solids, 5-Oxidizers/Organic Peroxides, 6-Toxic/Infectious, 7-Radioactive, 8-Corrosives, 9-Miscellaneous. Divisions (e.g., 2.1, 2.2, 2.3) further specify the hazard." },
      { id: "2.7", label: "Subsidiary hazards (in parentheses) are as listed in Column 6", ref: "172.101", tip: "Column 6 lists secondary hazards. Example: a material might be Class 3 (flammable liquid) with a subsidiary hazard of 6.1 (toxic). Subsidiary hazards determine additional labeling and placarding requirements." },
      { id: "2.8", label: "Packing group is as listed in Column 5", ref: "172.101", tip: "Packing Group indicates degree of danger: PG I = Great danger, PG II = Medium danger, PG III = Minor danger. Not all materials have a PG (e.g., most compressed gases, explosives, self-reactive materials, organic peroxides, infectious substances)." },
      { id: "2.9", label: "Basic description in proper sequence", ref: "172.202(b)", tip: "Required sequence (ISHP): UN/NA ID Number, Proper Shipping Name, Hazard Class/Division, Packing Group. Example: 'UN2744, Cyclobutyl chloroformate, 6.1, (8, 3), PG II'. Additional info (technical name, RQ, etc.) may be added before or after but cannot be interspersed within this sequence." },
      { id: "2.10", label: "Total quantity listed with unit of measure", ref: "172.202(a)(5)", tip: "Must include total quantity of HM by net or gross mass, capacity, or other appropriate measure. Acceptable units: kg, L, gallons, lbs, etc. For gases, the quantity may be the net mass or the capacity of the cylinder." },
      { id: "2.11", label: "Number and type of packages listed", ref: "172.202(a)(7)", tip: "Example: '5 drums' or '10 cylinders'. If the shipping paper covers multiple packages of the same material, a single entry with total count is acceptable." },
      { id: "2.h2", type: "header", label: "Reportable Quantities (RQ)", link: "tool-substance-lookup" },
      { id: "2.12", label: "Check Appendix A to 172.101 — is material a Hazardous Substance?", ref: "172.101", tip: "If a material is listed in Appendix A and the quantity in a single package meets or exceeds the RQ, it is ALWAYS considered a hazardous material regardless of any other exceptions. The letters 'RQ' must appear on the shipping paper before or after the basic description.", link: "tool-substance-lookup" },
      { id: "2.13", label: "Check Appendix B to 172.101 — is material a Marine Pollutant? (bulk only)", ref: "172.101", tip: "Marine pollutants in bulk packagings require specific marking and documentation. Materials listed as 'severe marine pollutants' (marked 'PP') have stricter requirements. Marine pollutant requirements apply to shipments transported by vessel.", link: "tool-substance-lookup" },
      { id: "2.h3", type: "header", label: "Check for additional descriptions when required (172.203)" },
      { id: "2.14", label: "DOT Special Permits", ref: "172.203(a)", tip: "If shipping under a special permit, the notation 'DOT-SP' followed by the permit number must appear on the shipping paper. Verify that the shipment actually complies with all conditions of the special permit." },
      { id: "2.15", label: "Limited Quantities", ref: "172.203(b)", tip: "When a material is offered for transportation as a 'limited quantity' as authorized by this subchapter, the words 'Limited Quantity' or 'Ltd Qty' must follow the basic description on the shipping paper. Limited quantities are small amounts authorized under specific sections in Part 173 (e.g., 173.150 for Class 3, 173.152 for Div 5.1). Limited quantity shipments have reduced packaging requirements but must still comply with applicable shipping paper, marking, and compatibility requirements." },
      { id: "2.16", label: "Hazardous Substances", ref: "172.203(c)", tip: "The letters 'RQ' (Reportable Quantity) must appear either before or after the basic description. If the proper shipping name does not identify the substance by name, the name of the hazardous substance must also be shown in parentheses." },
      { id: "2.17", label: "Empty Packages", ref: "172.203(e)", tip: "The shipping paper description for a package containing the residue of a hazardous material may include the words 'RESIDUE: Last Contained ***' immediately before or after the basic description. For tank cars, the phrase 'RESIDUE: Last Contained ***' is required. The full basic shipping description (proper shipping name, hazard class, UN number, packing group) must still be provided for the residue material." },
      { id: "2.18", label: "Cargo tanks with Anhydrous Ammonia or LPG", ref: "172.203(h)", tip: "For MC 330 or MC 331 cargo tanks, the shipping paper must include: (1) Anhydrous Ammonia — the words '0.2 PERCENT WATER' if suitable for quenched and tempered (QT) steel tanks per 173.315(a) Note 14, or 'NOT FOR Q AND T TANKS' if the ammonia does not contain 0.2% or more water by weight. (2) LPG — the word 'NONCORROSIVE' or 'NONCOR' if suitable for QT steel tanks per 173.315(a) Note 15, or 'NOT FOR Q AND T TANKS' for grades of LPG other than Noncorrosive." },
      { id: "2.19", label: "Technical Names", ref: "172.203(k)", tip: "Required when Column 1 of 172.101 shows a 'G' (generic). Technical name must be in parentheses after the basic description. Example: 'Corrosive liquid, n.o.s., 8, UN1760, PG II (Hydrochloric acid)'. For mixtures, at least two components contributing most to the hazard must be listed." },
      { id: "2.20", label: "Marine Pollutants", ref: "172.203(l)", tip: "The words 'Marine Pollutant' must appear on the shipping paper for materials meeting the marine pollutant criteria in bulk packages. If the proper shipping name doesn't identify the pollutant, the name of the marine pollutant component must be shown in parentheses." },
      { id: "2.21", label: "Poisonous Materials", ref: "172.203(m)", tip: "Materials meeting the inhalation toxicity criteria require 'Poison-Inhalation Hazard' or 'Toxic-Inhalation Hazard' and the applicable hazard zone (Zone A, B, C, or D) on the shipping paper." },
      { id: "2.22", label: "Elevated Temperature Materials", ref: "172.203(n)", tip: "The word 'HOT' must immediately precede the proper shipping name for materials intentionally heated to 100°C (212°F) or above for liquids, or 240°C (464°F) or above for solids, including molten metals and molten sulfur." },
      { id: "2.23", label: "Organic peroxide / self-reactive material", ref: "172.203(o)", tip: "Additional shipping paper requirements: (1) If competent authority approval is required, a statement of approval of the classification and conditions of transport must appear. (2) If the material requires temperature control during transport, the words 'TEMPERATURE CONTROLLED' must be added as part of the proper shipping name (unless already included), and the control and emergency temperatures must be listed on the shipping paper. (3) The word 'SAMPLE' must be included when a sample of a Division 4.1 (self-reactive) or Division 5.2 (organic peroxide) material is offered for transportation." },
      { id: "2.24", label: "Non-odorized LPG", ref: "172.203(p)", tip: "If LPG is not odorized, the words 'NON-ODORIZED' or 'NOT ODORIZED' must appear on the shipping paper. This is critical because first responders may not detect leaks by smell." },
      { id: "2.25", label: "Check emergency response telephone number", ref: "172.604", tip: "Per 172.604(a), a numeric emergency response phone number (with area code) must be on the shipping paper. It must appear either: (1) immediately following each HM description, or (2) entered once in a prominent, clearly visible location (highlighted, larger font, or different color) with a label such as 'EMERGENCY CONTACT: [number]'. The number must be monitored at all times the material is in transportation — answering machines, voicemail, or beepers do NOT comply. The person or ERI provider name (or contract number) must be identified on the shipping paper near the phone number. CHEMTREC (1-800-424-9300) is a commonly used ERI provider." },
    ],
  },
  {
    step: 3,
    title: "Check for Authorized Packages & Exceptions",
    icon: Package,
    tip: "The HM Table (172.101) Columns 7, 8A, 8B, and 8C direct you to the specific packaging requirements in Part 173. Always verify the packaging is authorized for the specific material being shipped. Using an unauthorized package is a serious violation.",
    items: [
      { id: "3.1", label: "Reference Column 7 for special provisions that apply", ref: "172.102", tip: "Column 7 lists codes for special provisions in 172.102 that can modify any requirement. Code meanings: Numeric (1–999) = general provisions that may modify descriptions, packaging, or hazard class. 'A' codes = air transport provisions. 'B' codes = bulk packaging provisions. 'IB' codes = IBC (Intermediate Bulk Container) authorizations. 'IP' codes = IBC additional provisions. 'N' codes = outage and filling limits for non-bulk packages. 'T' codes = portable tank minimum requirements (T1–T75). 'TP' codes = portable tank special provisions. 'W' codes = water transport provisions. Always look up the specific code in 172.102 — some provisions exempt materials from HMR entirely." },
      { id: "3.2", label: "Reference Column 8A — exceptions that may apply", ref: "173.XXX", tip: "Column 8A references sections in Part 173 that describe exceptions. Common examples: Limited quantities (173.150–156), Materials of Trade (173.6), consumer commodities, certain ORM-D materials. If an exception applies, some or all HMR requirements may be reduced or eliminated.", link: "tool-mot-helper" },
      { id: "3.3", label: "Reference Column 8B (non-bulk) or 8C (bulk) — authorized packages", ref: "173.XXX", tip: "Columns 8B/8C reference sections in Part 173 listing specific authorized packaging. Some packages may only be authorized by a DOT Special Permit (107.101 to 107.105). If a special permit is used, verify the shipment meets ALL conditions. Common packaging specs: UN-rated drums, cylinders, IBCs.", link: "tool-package-class-helper" },
    ],
  },
  {
    step: 4,
    title: "Check for Placarding Compliance",
    icon: AlertTriangle,
    tip: "Placards are 250mm (9.84 in) diamond-shaped signs displayed on vehicles to communicate hazard class to emergency responders. Use the primary hazard class from the shipping paper to find the required placard in the placarding tables at 172.504(e). Remember: Table 1 = any amount, Table 2 = over 1,001 lbs.",
    items: [
      { id: "4.h0", type: "header", label: "Look up material by primary hazard class — find required placard", link: "tool-placard-helper" },
      { id: "4.1", label: "Table 1 materials require placards in ANY amount", ref: "172.504(e)", tip: "Table 1 (most dangerous — placard any quantity): Div 1.1–1.3 (Explosives), Div 2.3 (Poison Gas), Div 4.3 (Dangerous When Wet), Div 5.2 (Organic Peroxide, Type B, liquid or solid, temperature controlled), Div 6.1 (Poison Inhalation Hazard only — not all PG I), Class 7 (Radioactive Yellow III label). Even a single small package requires placards.", link: "tool-placard-helper" },
      { id: "4.2", label: "Table 2 materials require placards over 1,001 lbs aggregate", ref: "172.504(e)", tip: "Table 2: Div 1.4–1.6, Div 2.1 (Flammable Gas), Div 2.2 (Non-flammable Gas), Class 3 (Flammable), Combustible Liquids, Div 4.1–4.2, Div 5.1, Div 6.1 (other than inhalation hazard), Class 8, Class 9. 'Aggregate' = total gross weight of ALL Table 2 materials on the vehicle combined. NOTE: Class 9 requires a CLASS 9 placard for domestic highway transportation when the aggregate gross weight is 1,001 lbs or more. This includes materials like lithium batteries, environmentally hazardous substances, elevated temperature materials, and other miscellaneous dangerous goods.", link: "tool-placard-helper" },
      { id: "4.3", label: "Bulk packages require placards (with exceptions)", ref: "172.514", tip: "Exceptions include: some portable tanks under 1,000 gal with certain gases, DOT Spec 106/110 multi-unit tanks, some flexible bulk containers, IBCs of limited quantities, and large packagings. Always verify the specific exception applies to the material in question." },
      { id: "4.h1", type: "header", label: "Check exceptions from placarding (172.500(b))" },
      { id: "4.4", label: "Limited quantities", ref: "172.500(b)", tip: "Limited quantity shipments in non-bulk packages are exempt from placarding. The package must be properly marked with the limited quantity marking (a diamond with the UN number or 'Y' marking)." },
      { id: "4.5", label: "Small quantities", ref: "173.13", tip: "Materials of trade (173.6) and small quantity exceptions (173.4) may be exempt from placarding requirements. Verify the specific conditions are met for the exception to apply." },
      { id: "4.6", label: "Combustible liquids in non-bulk packages", ref: "172.500(b)", tip: "Combustible liquids (flash point above 60°C/140°F and below 93°C/200°F per 173.120) in non-bulk packages are generally exempt from placarding. However, if in bulk packaging (>119 gal), the COMBUSTIBLE placard is required." },
      { id: "4.7", label: "Infectious substances", ref: "172.500(b)", tip: "Division 6.2 (infectious substances) are generally exempt from placarding. However, they still require proper packaging, marking, labeling, and shipping papers." },
      { id: "4.8", label: "Check for placard substitutions", ref: "172.504(f)", tip: "Common substitutions: DANGER placard may substitute for specific Table 2 placards in certain multi-load scenarios. NON-FLAMMABLE GAS may replace OXYGEN placard (but not vice versa). Review all 11 substitution provisions in 172.504(f)." },
      { id: "4.h2", type: "header", label: "DANGEROUS placard rules (172.504(b))" },
      { id: "4.9", label: "May be used for 2+ Table 2 materials in non-bulk packages", ref: "172.504(b)", tip: "The DANGEROUS placard may replace individual Table 2 placards ONLY when: (1) there are two or more Table 2 categories of HM on the vehicle, (2) ALL are in non-bulk packages, and (3) no single category exceeds 2,205 lbs from one loading facility." },
      { id: "4.10", label: "Must placard for specific class if 2,205+ lbs of one category loaded at one facility", ref: "172.504(b)", tip: "If 2,205 lbs (1,000 kg) or more of a single Table 2 hazard class/division is loaded at one facility, the DANGEROUS placard is NOT sufficient — you must display the specific class placard. The DANGEROUS placard may still be used for the remaining classes." },
      { id: "4.h3", type: "header", label: "Prohibited & permissive placarding" },
      { id: "4.11", label: "No placards unless material is HM and represents actual hazard", ref: "172.502(a)(1)", tip: "It is illegal to display a placard for a material that is not actually on the vehicle. This prevents false alarms and misdirected emergency responses." },
      { id: "4.12", label: "No signs/advertisements that could be confused with placards", ref: "172.502(a)(2)", tip: "Any sign, advertisement, slogan, or device on the vehicle that by its color, design, shape, or content could be confused with a placard is prohibited. This includes old or outdated placards left on an empty vehicle." },
      { id: "4.13", label: "Check permissive placarding", ref: "172.502(c)", tip: "Permissive placarding allows displaying additional placards that are not required. For example, a carrier may placard for a Table 2 material even if the quantity is under 1,001 lbs. This can help emergency responders but must still be accurate." },
      { id: "4.h4", type: "header", label: "Subsidiary hazard placards (172.505)" },
      { id: "4.14", label: "Required for: >1,001 lbs uranium hexafluoride w/ Corrosive subsidiary", ref: "172.505", tip: "Non-fissile, fissile-excepted, or fissile uranium hexafluoride in quantities exceeding 1,001 lbs must display both the Class 7 (Radioactive) placard and the CORROSIVE subsidiary placard." },
      { id: "4.15", label: "Required for: Poison Inhalation Hazard (PIH)", ref: "172.505", tip: "Materials with an inhalation toxicity hazard (PIH) ALWAYS require a POISON INHALATION HAZARD or POISON GAS subsidiary placard, in addition to the primary hazard placard. This applies regardless of quantity." },
      { id: "4.16", label: "Required for: Dangerous When Wet materials", ref: "172.505", tip: "Division 4.3 (Dangerous When Wet) materials require the DANGEROUS WHEN WET subsidiary placard when it is listed as a subsidiary hazard in Column 6 of the 172.101 table." },
      { id: "4.17", label: "Allowed for others if listed in Column 6 of 172.101", ref: "172.505", tip: "Subsidiary placards are permitted (even when not required) as long as the subsidiary hazard is listed in Column 6 of the 172.101 table. Displaying them is good practice — it provides additional safety information to responders." },
      { id: "4.h5", type: "header", label: "Verify placard display" },
      { id: "4.18", label: "Placards displayed on both sides AND both ends of vehicle", ref: "172.504(a)", tip: "Four placards are required: one on each end and one on each side of the transport vehicle, freight container, or unit load device. Each must be clearly visible from the direction it faces. On a tractor-trailer combination, the front placard is displayed on the front of the tractor and the rear placard on the rear of the trailer. Placards must not be obscured by ladders, pipes, doors, or tarpaulins." },
      { id: "4.19", label: "Placards meet general specifications", ref: "172.519", tip: "Must be at least 250mm (9.84 in) on each side, diamond-shaped (square on point), durable, not obscured by dirt/debris, correct colors per hazard class. The hazard class number must be in the bottom corner. The placard may not be hand-lettered." },
      { id: "4.20", label: "Visibility and display requirements met", ref: "172.516", tip: "Placards must be: readable from all four directions, at least 3 inches from any other marking, securely attached or in a proper holder, displayed upright in diamond orientation, free from damage/fading, and not obstructed by ladders, pipes, or other equipment." },
    ],
  },
  {
    step: 5,
    title: "Check Marking Compliance",
    icon: Tag,
    tip: "Markings identify the specific hazardous material in a package or on a vehicle. They differ from placards (hazard class on vehicles) and labels (hazard diamonds on packages). Key distinction: Bulk = capacity >119 gal for liquids, >882 lbs for solids, or water capacity >1,000 lbs for gases.",
    items: [
      { id: "5.h0", type: "header", label: "Both types of packages" },
      { id: "5.1", label: "If poisonous — verify package is marked as required", ref: "172.313", tip: "Non-bulk packages of Division 6.1 PG I or II materials must be marked 'PG I TOXIC' or 'PG II TOXIC' (172.313(a)). Materials meeting the inhalation toxicity criteria must also be marked 'INHALATION HAZARD' (172.313(a)(2)). This marking is in addition to the proper shipping name." },
      { id: "5.2", label: "If DOT Special Permit — marked with 'DOT-SP' or 'DOT-E' + number", ref: "172.301(c)", tip: "Non-bulk: 172.301(c), Bulk: 172.302(c). The special permit number must be visibly marked on the outside of the package or vehicle. Older permits may use 'DOT-E' (exemption) numbering — both are valid." },
      { id: "5.3", label: "Transport vehicle displays ID numbers when required", ref: "172.332", tip: "ID numbers must be displayed on the transport vehicle when carrying bulk HM or when required by 172.301(a)(3) for large non-bulk shipments. The 4-digit number must be displayed on orange panels, across the placard, or on a white square-on-point configuration." },
      { id: "5.4", label: "Large quantities of single HM in non-bulk", ref: "172.301(a)(3)", tip: "When 4,000 kg (8,820 lbs) or more of a single HM in non-bulk packages is loaded at one facility, the ID number of that material must be displayed on the vehicle in the same manner as for bulk shipments." },
      { id: "5.5", label: "Bulk package markings not visible from outside vehicle", ref: "172.328(a)(3)", tip: "When a bulk package is not visible from outside the vehicle (e.g., portable tank inside an enclosed trailer), the vehicle itself must display the required markings: ID number on orange panel, placard, or white square-on-point." },
      { id: "5.h1", type: "header", label: "Bulk packages" },
      { id: "5.6", label: "ID number displayed on each side and each end (1,000+ gal)", ref: "172.302", tip: "Bulk packages with a capacity of 1,000 gallons or more must display the ID number on each side AND each end (four locations total). The numbers must be on orange panels, across the placard, or on a white square-on-point." },
      { id: "5.7", label: "ID number on two opposing sides (less than 1,000 gal)", ref: "172.302", tip: "Bulk packages under 1,000 gallons capacity only need the ID number on two opposing sides. This commonly applies to smaller portable tanks and IBCs." },
      { id: "5.8", label: "ID number in acceptable format: orange panels, placards, or white square-on-point", ref: "172.332", tip: "Three acceptable formats: (1) Orange rectangular panel (at least 160mm x 400mm), (2) Across the center of the required placard, (3) White square-on-point display (same size as placard). You CANNOT mix display methods on the same vehicle — choose one method and use it consistently." },
      { id: "5.h2", type: "header", label: "ID number special provisions (172.336)" },
      { id: "5.9", label: "Multiple compartments", ref: "172.336(a)", tip: "Each compartment of a multi-compartment cargo tank must display the ID number for the material in that compartment. If compartments contain the same material, a single display may suffice if it covers the entire tank." },
      { id: "5.10", label: "Gasoline", ref: "172.336(b)", tip: "Gasoline (UN1203) may display just the ID number 1203 even when carrying different grades. This simplifies marking for common fuel delivery operations." },
      { id: "5.11", label: "Fuel oil", ref: "172.336(b)", tip: "Fuel oil (NA1993) follows similar simplified display rules as gasoline for common petroleum operations." },
      { id: "5.12", label: "Petroleum distillate fuels", ref: "172.336(b)", tip: "When transporting petroleum products that could be described as either gasoline or fuel oil, the ID number may be displayed as authorized under the special provisions." },
      { id: "5.13", label: "Nurse tanks", ref: "172.336(c)", tip: "Per 172.336(c) table, the ID number display is NOT required on one end of a nurse tank if that end contains valves, fittings, regulators, or gauges that prevent the markings and placard from being properly placed and visible. The nurse tank must meet the provisions of 173.315(m). The ID number and placards are still required on the other end and both sides." },
      { id: "5.h3", type: "header", label: "Additional bulk marking requirements" },
      { id: "5.14", label: "Portable tanks", ref: "172.326", tip: "Must be marked with: proper shipping name, ID number, name of owner/lessee, and any special markings required for the specific material. Check that the requalification date is current." },
      { id: "5.15", label: "Cargo tanks", ref: "172.328", tip: "Check for: 'Emergency Shutoff' marking (near shutoff valve), Class 2 material markings, proper shipping name, MC330/MC331 specifications, QT/NQT markings, and non-odorized LPG marking." },
      { id: "5.16", label: "Cargo tank — 'Emergency Shutoff' marking", ref: "172.328(c)", tip: "Cargo tanks equipped with an emergency shutoff device must be marked 'Emergency Shutoff' near the shutoff activation device. This helps first responders quickly locate the shutoff in an emergency." },
      { id: "5.17", label: "Cargo tank — Class 2 materials / Proper shipping name", ref: "172.328(b)", tip: "Cargo tanks transporting Class 2 (compressed gas) materials must display the proper shipping name on both sides and both ends in letters at least 2 inches tall. This is in addition to the ID number display." },
      { id: "5.18", label: "Cargo tank — MC330/MC331 / QT or NQT designation", ref: "172.328(d)", tip: "MC330 and MC331 cargo tanks must be marked with either 'QT' (quench-tempered) or 'NQT' (not quench-tempered). This determines the tank's permitted materials and pressure limits. QT tanks are generally more versatile." },
      { id: "5.19", label: "Cargo tank — Non-odorized LPG", ref: "172.328(e)", tip: "Cargo tanks containing LPG that has NOT been odorized must be marked 'NON-ODORIZED' or 'NOT ODORIZED' on both sides and both ends. This is critical because unodorized LPG cannot be detected by smell in a leak." },
      { id: "5.20", label: "Multi-unit tank car tanks", ref: "172.330", tip: "Multi-unit tank car tanks (ton containers for chlorine, sulfur dioxide, etc.) must be marked with the proper shipping name and ID number. Check that each unit in the assembly is properly marked." },
      { id: "5.21", label: "Other bulk packages (IBC)", ref: "172.331", tip: "Intermediate Bulk Containers (IBCs) must display: UN packaging code, stacking test load, maximum gross mass, tare mass, date of manufacture, and the proper shipping name and ID number of contents." },
      { id: "5.h4", type: "header", label: "Verify special markings for:" },
      { id: "5.22", label: "Marine pollutant", ref: "172.322", tip: "Packages containing marine pollutants must bear the marine pollutant marking — a triangle with a fish and tree symbol. For bulk packages, the marking must be displayed on each side and each end adjacent to the required placard." },
      { id: "5.23", label: "Infectious substances", ref: "172.323", tip: "Division 6.2 packages must display: the international biohazard symbol, proper shipping name, ID number, shipper/consignee name and address, and for Category A materials — UN2814 or UN2900." },
      { id: "5.24", label: "Elevated temperature materials", ref: "172.325", tip: "Bulk packages containing materials shipped at elevated temperatures must be marked with the word 'HOT' on both sides and both ends. This applies to materials at or above 100°C (212°F) for liquids or 240°C (464°F) for solids." },
      { id: "5.25", label: "Petroleum sour crude oil", ref: "172.327", tip: "Packages of petroleum sour crude oil containing hydrogen sulfide (H2S) must bear specific markings identifying the H2S content. This is critical for responder safety due to the extreme toxicity of H2S." },
      { id: "5.h5", type: "header", label: "Non-bulk packages" },
      { id: "5.26", label: "General requirements — proper shipping name & ID number", ref: "172.301", tip: "Each non-bulk package must be marked with: the proper shipping name and UN/NA ID number as shown in Column 2 and Column 4 of the 172.101 table. Letters must be on a contrasting background and durable enough to withstand normal transport conditions." },
      { id: "5.27", label: "Technical names on non-bulk (when required)", ref: "172.301(b)", tip: "When a 'G' symbol appears in Column 1 of the 172.101 table for the material, the technical name must be marked on the package in parentheses after the proper shipping name. For mixtures, at least two components must be listed." },
      { id: "5.28", label: "Non-odorized LPG marking", ref: "172.301(f)", tip: "Non-bulk packages of LPG that is not odorized must be marked 'NON-ODORIZED' or 'NOT ODORIZED'. This alerts handlers and responders that they cannot rely on smell to detect leaks." },
      { id: "5.h6", type: "header", label: "Check required markings on non-bulk:" },
      { id: "5.29", label: "Liquid HM — orientation arrows", ref: "172.312", tip: "Required on combination packages with inner packages containing liquid HM. Two arrows pointing UP must be placed on two opposite sides. Common exceptions: inner packages ≤120 mL, totally leak-proof packages, and certain infectious substances." },
      { id: "5.30", label: "Limited quantities", ref: "172.315", tip: "Limited quantity packages must bear the limited quantity mark: a diamond-shaped marking (square on point) with the top and bottom portions black and a white center. The UN number may appear in the center for certain air shipments." },
      { id: "5.31", label: "ORM-D", ref: "172.316", tip: "ORM-D (Other Regulated Material — Domestic) marking was phased out for domestic ground transport as of January 1, 2021, replaced by the limited quantity diamond. However, ORM-D marked packages may still be in transit." },
      { id: "5.32", label: "Explosive HM", ref: "172.320", tip: "Explosive packages must be marked with the EX number (approval number) from the associate administrator. This number is assigned during the classification approval process for each explosive article or substance." },
      { id: "5.33", label: "Hazardous Substances (RQ)", ref: "172.324", tip: "Non-bulk packages of hazardous substances must be marked 'RQ' in association with the proper shipping name. If the proper shipping name doesn't identify the hazardous substance, the name must also appear on the package." },
    ],
  },
  {
    step: 6,
    title: "Check Labeling Compliance",
    icon: Tag,
    tip: "Labels are smaller (100mm/3.9 in) diamond-shaped hazard warnings affixed to individual packages. They are similar in appearance to placards but are package-level. Every package must have a primary hazard label unless a specific exception applies. Labels must be visible and not obscured by markings or attachments.",
    items: [
      { id: "6.1", label: "Verify labels for primary hazard on all packages", ref: "172.400", tip: "Each package must have a label corresponding to the primary hazard class found in Column 3 of 172.101. The label must match exactly. Common labels: FLAMMABLE LIQUID (red), CORROSIVE (half black/half white), POISON (white with skull), FLAMMABLE GAS (red), OXIDIZER (yellow)." },
      { id: "6.2", label: "Verify labels for subsidiary hazards as required", ref: "172.402", tip: "Subsidiary hazard labels are required per Column 6 of the 172.101 table. They must be placed adjacent to the primary label. Subsidiary labels do NOT display the hazard class number in the bottom corner — only primary labels do." },
      { id: "6.h1", type: "header", label: "Exceptions from labeling (172.400a)" },
      { id: "6.3", label: "Dewar flask or cylinder with Class 2 with CGA label", ref: "172.400a", tip: "A Dewar flask (vacuum-insulated container) or cylinder marked with a CGA (Compressed Gas Association) label meeting DOT specifications is exempt from the additional 172.400 labeling requirement. The CGA label serves as the equivalent." },
      { id: "6.4", label: "Certain DOD (Department of Defense) shipments", ref: "172.400a", tip: "Certain DOD shipments, when accompanied by the appropriate military shipping documents and marked in accordance with DOD regulations, may be exempt from some civilian labeling requirements." },
      { id: "6.5", label: "Compressed gas cylinder permanently mounted on vehicle", ref: "172.400a", tip: "A compressed gas cylinder that is permanently mounted on or integral to a vehicle (e.g., welding truck) may be exempt from labeling if the vehicle is properly placarded for the gas and the cylinder is not offered for transport separately." },
      { id: "6.6", label: "Overpack — if labels for each HM inside are visible", ref: "172.400a", tip: "If a package is placed inside an overpack and all required labels on the inner package are clearly visible through the overpack, additional labeling on the overpack is not required. If labels are not visible, the overpack must bear labels for all HM inside plus the word 'OVERPACK'." },
      { id: "6.7", label: "Check for correct placement of labels", ref: "172.406", tip: "Labels must be: (1) on the same surface and near the proper shipping name, (2) not obscured by markings or attachments, (3) displayed on a contrasting background or within a border, (4) primary and subsidiary labels must be within 6 inches of each other." },
      { id: "6.8", label: "Check that labels meet specifications", ref: "172.407", tip: "Labels must be at least 100mm (3.9 in) on each side, diamond-shaped, durable, weather-resistant, on contrasting background, and printed (not handwritten). The hazard class number must appear in the bottom corner of primary hazard labels. Colors must match the specifications for each class." },
    ],
  },
  {
    step: 7,
    title: "Check Loading & Packaging Compliance",
    icon: Truck,
    tip: "The final step verifies packages are properly loaded, secured, and segregated. Incompatible materials placed too close together can cause catastrophic reactions. Always reference the 177.848 segregation table. This step also verifies that the physical packaging meets specification and requalification requirements.",
    items: [
      { id: "7.1", label: "Packages are authorized as determined in Step 3", ref: "173.XXX", tip: "Cross-reference your findings from Step 3. The package type, specification, and condition must all be authorized for the specific material. An unauthorized package is a serious violation that may result in an out-of-service order." },
      { id: "7.2", label: "All specification requirements for packages are met", ref: "178.XXX", tip: "Part 178 contains detailed specifications for each package type (drums, cylinders, IBCs, cargo tanks, portable tanks). Check that the packaging bears the proper UN specification marking and is in good condition with no visible damage, corrosion, or leakage." },
      { id: "7.3", label: "Requalification/retest requirements met", ref: "180.XXX", tip: "Part 180 governs retesting schedules. Cylinders: generally every 5–10 years depending on type. Cargo tanks: external visual every year, internal inspection/pressure test every 5 years. Portable tanks: every 5 years. Check the last test date marking on the package." },
      { id: "7.4", label: "General securement of packages observed", ref: "177.834(a)", tip: "HM packages must be secured against movement during normal transport conditions, including sudden starts, stops, and turns. Packages must be braced, blocked, or secured to prevent shifting that could cause damage or release of HM." },
      { id: "7.5", label: "General packaging requirement verified", ref: "173.24", tip: "Five key requirements: (1) No release of HM to environment, (2) No hazardous residue on outside of package, (3) All closures tight and secure, (4) Venting only when specifically authorized, (5) Package must withstand normal transport conditions without loss of contents." },
      { id: "7.6", label: "Segregation, separation, and compatibility verified", ref: "177.848", tip: "Use the 177.848 segregation table. 'X' = must NOT be loaded together. 'O' = may be loaded together only if separated in a manner that prevents interaction. Cyanides/cyanide mixtures must NEVER be loaded with acids. Oxidizers must be separated from flammables.", link: "tool-segregation-table" },
      { id: "7.h1", type: "header", label: "Loading/transport requirements for specific classes" },
      { id: "7.7", label: "Class 1 (Explosives)", ref: "177.835", tip: "Explosives must be protected from heat sources, sparks, and static discharge. Division 1.1/1.2/1.3 require placards any amount. No smoking within 25 feet. Vehicles must have a fire extinguisher. Special rules for compatibility groups — some divisions cannot be loaded together." },
      { id: "7.8", label: "Class 3 (Flammable Liquids)", ref: "177.837", tip: "No open flames or smoking near vehicle. Keep containers closed when not loading/unloading. Cargo tanks must be bonded/grounded during loading. Common materials: gasoline (UN1203), diesel fuel, alcohols, acetone, paint." },
      { id: "7.9", label: "Class 4 / Class 5 / Division 4.2", ref: "177.838", tip: "Class 4.1 (Flammable Solids) must be kept dry. Class 4.2 (Spontaneously Combustible) must be protected from heat. Class 4.3 (Dangerous When Wet) must be protected from water/moisture. Class 5.1 (Oxidizers) must be separated from combustibles." },
      { id: "7.10", label: "Class 8 (Corrosives)", ref: "177.839", tip: "Corrosive materials must not be loaded above or adjacent to food, animal feed, or any materials that could be damaged by leakage. Corrosive liquids in glass or earthenware containers must be packed right-side up. Common materials: sulfuric acid, hydrochloric acid, sodium hydroxide." },
      { id: "7.11", label: "Class 2 (Compressed Gases)", ref: "177.840", tip: "Cylinders must be secured in an upright or horizontal position. Valve protection caps must be in place on compressed gas cylinders when not connected. Refrigerated liquids require proper venting. No smoking within 25 feet of Division 2.1 (Flammable Gas) loading." },
      { id: "7.12", label: "Division 6.1 (Poison) and Division 2.3 (Poison Gas)", ref: "177.841", tip: "Poison materials must NEVER be loaded with foodstuffs, animal feed, or any other material intended for consumption by humans or animals. For PIH (Poison Inhalation Hazard) materials, the vehicle must display both the primary hazard placard and the POISON INHALATION HAZARD placard." },
      { id: "7.h2", type: "header", label: "Additional requirements for specific packages" },
      { id: "7.13", label: "Non-bulk packages", ref: "173.24a", tip: "Additional non-bulk requirements include: inner packaging support and cushioning, absorbent material for liquid inners, closure effectiveness testing, and compatibility between packaging materials and contents." },
      { id: "7.14", label: "Bulk packages", ref: "173.24b", tip: "Bulk packages must have: proper vents and pressure relief devices, manhole covers secured, proper filling limits observed (e.g., outage for thermal expansion of liquids), and all valves, fittings, and closures in proper working condition." },
      { id: "7.15", label: "Portable tanks", ref: "173.32", tip: "Portable tanks must meet specific design, manufacturing, testing, and approval standards. Check that: requalification is current, pressure relief devices function properly, shell thickness meets minimum requirements, and structural integrity is maintained." },
      { id: "7.16", label: "Cargo tanks", ref: "173.33", tip: "Verify: proper specification marking (MC306, MC307, MC312, MC330, MC331, or DOT 406, 407, 412), current test date, proper fittings and closures, no visible damage or corrosion, emergency shutoff accessible and functional." },
      { id: "7.17", label: "IBCs (Intermediate Bulk Containers)", ref: "173.35", tip: "IBCs must meet UN performance standards. Check: structural integrity, proper UN marking, correct stacking capability, filling limits, and that the IBC type is authorized for the specific material. Rigid IBCs have a 2.5-year retest requirement." },
      { id: "7.18", label: "Large packagings", ref: "173.36", tip: "Large packagings are designed for inner packagings and articles. They must bear UN specification markings and be in good condition. Maximum net mass varies by type — verify the marking on the packaging against the actual load." },
      { id: "7.19", label: "Flexible bulk containers", ref: "173.37", tip: "Flexible bulk containers (FBCs) are woven or fabric-based containers for dry solid materials. They must meet specific drop, topple, righting, and tear resistance tests. Verify the UN marking and that the material is authorized for FBC transport." },
      { id: "7.20", label: "Toxic materials in cylinders", ref: "173.40", tip: "Cylinders containing toxic materials (Division 2.3 or Division 6.1 in a cylinder) have additional requirements: proper valve protection, leak testing, special marking requirements, and may require overpack or protective containers for transport." },
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
  const [checks, setChecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  });
  const [openSteps, setOpenSteps] = useState({});
  const [showRef, setShowRef] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist"); // "checklist" | "tools"

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
  }, [checks]);

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
    localStorage.removeItem(STORAGE_KEY);
    setOpenSteps({});
    setShowResetConfirm(false);
    toast.success("Worksheet reset");
  }, []);

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
                                {item.link && (
                                  <button onClick={(e) => { e.stopPropagation(); navigateTo(item.link); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D4AF37] text-[#002855] text-[9px] font-bold hover:bg-[#c9a432] transition-colors flex-shrink-0 shadow-sm" data-testid={`link-${item.id}`}>
                                    Open tool <ArrowRight className="w-2.5 h-2.5 rotate-90" />
                                  </button>
                                )}
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
          </>
        )}

        {/* TOOLS TAB */}
        {activeTab === "tools" && (
          <div className="space-y-3">
            <div id="tool-placard-helper"><PlacardHelper onNavigate={navigateTo} /></div>
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
