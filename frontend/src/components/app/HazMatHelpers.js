import { useState, useCallback, useRef } from "react";
import { ChevronDown, ExternalLink, Package, RotateCcw, HelpCircle, Truck, AlertTriangle, Search, ArrowRight } from "lucide-react";

/* ================================================================
   SHARED UI HELPERS
   ================================================================ */
function CfrLink({ r, label }) {
  const clean = r.replace(/\(.*\)/g, "").replace(/[*X]/g, "").trim();
  const parts = clean.split(".");
  let url;
  if (parts.length >= 2 && parts[1].length > 0) {
    url = `https://www.ecfr.gov/current/title-49/section-${parts[0]}.${parts[1]}`;
  } else if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
    url = `https://www.ecfr.gov/current/title-49/part-${parts[0]}`;
  }
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#002855] hover:text-[#D4AF37] hover:underline transition-colors">
      {label || r}<ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-50" />
    </a>
  ) : <span className="text-[10px] font-mono text-[#94A3B8]">{label || r}</span>;
}

function OptionButton({ selected, onClick, children, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-[12px] leading-relaxed transition-all ${
        selected
          ? "border-[#002855] bg-[#002855] text-white font-semibold"
          : "border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#002855]/40 hover:bg-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}

function InfoBox({ children, color = "blue" }) {
  const styles = {
    blue: "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]",
    green: "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]",
    amber: "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]",
    red: "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
  };
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed ${styles[color]}`}>
      {children}
    </div>
  );
}

function ResultBox({ title, compliant, children }) {
  return (
    <div className={`rounded-lg border-2 p-3 space-y-2 ${compliant ? "border-emerald-300 bg-emerald-50/50" : compliant === false ? "border-red-300 bg-red-50/50" : "border-[#002855]/20 bg-[#002855]/5"}`}>
      <p className={`text-[12px] font-bold ${compliant ? "text-emerald-700" : compliant === false ? "text-red-700" : "text-[#002855]"}`}>{title}</p>
      <div className="text-[11px] leading-relaxed text-[#334155] space-y-1.5">{children}</div>
    </div>
  );
}

function StepLink({ step, label, onNavigate }) {
  if (!onNavigate) return null;
  return (
    <button
      onClick={() => onNavigate(`step-${step}`)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002855] text-white text-[11px] font-bold hover:bg-[#001a3a] transition-colors shadow-sm"
    >
      <ArrowRight className="w-3 h-3 rotate-[-90deg]" />
      Step {step}{label ? ` — ${label}` : ""}
    </button>
  );
}

/* ================================================================
   PACKAGE CLASSIFICATION HELPER
   ================================================================ */
export function PackageClassHelper({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("type"); // type -> capacity -> result
  const [packageType, setPackageType] = useState(null); // liquid, solid, gas
  const [capacity, setCapacity] = useState(null); // over or under threshold
  const [isSpec, setIsSpec] = useState(null); // spec or non-spec

  const reset = useCallback(() => {
    setPackageType(null);
    setCapacity(null);
    setIsSpec(null);
    setState("type");
  }, []);

  const selectType = (t) => {
    setPackageType(t);
    setState("capacity");
    setCapacity(null);
    setIsSpec(null);
  };

  const selectCapacity = (c) => {
    setCapacity(c);
    if (c === "bulk") {
      setState("spec");
    } else {
      setState("result");
      setIsSpec(null);
    }
  };

  const selectSpec = (s) => {
    setIsSpec(s);
    setState("result");
  };

  const thresholds = {
    liquid: { val: "119 gallons", over: "> 119 gallons", under: "119 gallons or less" },
    solid: { val: "882 lbs", over: "> 882 lbs net mass", under: "882 lbs or less net mass" },
    gas: { val: "1,000 lbs water capacity", over: "> 1,000 lbs water capacity", under: "1,000 lbs water capacity or less" },
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="package-class-helper">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="package-class-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <Package className="w-4 h-4 text-[#002855]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">Package Classification Helper</p>
          <p className="text-[10px] text-[#94A3B8]">Bulk vs Non-Bulk vs Specification — guided walkthrough</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          <InfoBox>
            <strong>What is this?</strong> This tool helps you determine if a package is <strong>bulk</strong> or <strong>non-bulk</strong>, and whether it needs to be a <strong>specification</strong> (DOT/UN rated) package. These classifications change which marking, labeling, and placarding rules apply. <CfrLink r="171.8" label="See definitions at 171.8" />
          </InfoBox>

          {/* STEP 1: What type of material? */}
          <div>
            <p className="text-[11px] font-bold text-[#002855] mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
              What type of material is in the package?
            </p>
            <div className="grid grid-cols-3 gap-2">
              <OptionButton selected={packageType === "liquid"} onClick={() => selectType("liquid")} testId="pkg-liquid">
                <span className="block font-semibold">Liquid</span>
                <span className="text-[10px] opacity-70">Fuel, acids, solutions</span>
              </OptionButton>
              <OptionButton selected={packageType === "solid"} onClick={() => selectType("solid")} testId="pkg-solid">
                <span className="block font-semibold">Solid</span>
                <span className="text-[10px] opacity-70">Powder, pellets, etc.</span>
              </OptionButton>
              <OptionButton selected={packageType === "gas"} onClick={() => selectType("gas")} testId="pkg-gas">
                <span className="block font-semibold">Gas</span>
                <span className="text-[10px] opacity-70">Compressed, liquefied</span>
              </OptionButton>
            </div>
          </div>

          {/* STEP 2: Capacity threshold */}
          {packageType && state !== "type" && (
            <div>
              <p className="text-[11px] font-bold text-[#002855] mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                What is the package capacity?
              </p>
              <InfoBox color="amber">
                <strong>Bulk threshold for {packageType}s:</strong> {thresholds[packageType].val}. This is defined in <CfrLink r="171.8" label="49 CFR 171.8" />.
                {packageType === "liquid" && " For liquids, bulk means a maximum capacity greater than 119 gallons (450 L) as a receptacle for the material."}
                {packageType === "solid" && " For solids, bulk means a maximum net mass greater than 882 lbs (400 kg) as a receptacle for the material."}
                {packageType === "gas" && " For gases, bulk means a water capacity greater than 1,000 lbs (454 kg) as a receptacle for the material."}
              </InfoBox>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <OptionButton selected={capacity === "bulk"} onClick={() => selectCapacity("bulk")} testId="pkg-over">
                  <span className="block font-semibold">Over threshold</span>
                  <span className="text-[10px] opacity-70">{thresholds[packageType].over}</span>
                </OptionButton>
                <OptionButton selected={capacity === "nonbulk"} onClick={() => selectCapacity("nonbulk")} testId="pkg-under">
                  <span className="block font-semibold">At or under threshold</span>
                  <span className="text-[10px] opacity-70">{thresholds[packageType].under}</span>
                </OptionButton>
              </div>
            </div>
          )}

          {/* STEP 3: Specification (only for bulk) */}
          {capacity === "bulk" && state === "spec" && (
            <div>
              <p className="text-[11px] font-bold text-[#002855] mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                Does the package bear a DOT or UN specification marking?
              </p>
              <InfoBox>
                <strong>Specification packages</strong> are manufactured and tested to DOT or UN standards. Look for markings like: <strong>MC306, MC307, MC312, MC330, MC331</strong> (older cargo tanks), <strong>DOT 406, 407, 412</strong> (newer cargo tanks), or <strong>UN</strong> markings with performance codes on drums/IBCs. Specification requirements are in <CfrLink r="178" label="Part 178" />.
              </InfoBox>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <OptionButton selected={isSpec === true} onClick={() => selectSpec(true)} testId="pkg-spec-yes">
                  <span className="block font-semibold">Yes — Specification</span>
                  <span className="text-[10px] opacity-70">Has DOT/UN marking</span>
                </OptionButton>
                <OptionButton selected={isSpec === false} onClick={() => selectSpec(false)} testId="pkg-spec-no">
                  <span className="block font-semibold">No / Not sure</span>
                  <span className="text-[10px] opacity-70">No spec marking found</span>
                </OptionButton>
              </div>
            </div>
          )}

          {/* RESULT */}
          {state === "result" && (
            <div className="space-y-2">
              {capacity === "nonbulk" && (
                <ResultBox title="This is a NON-BULK package">
                  <p>Non-bulk packages for {packageType}s have a capacity at or under <strong>{thresholds[packageType].val}</strong>.</p>
                  <p><strong>What applies to non-bulk:</strong></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Must be marked with proper shipping name and ID number — <CfrLink r="172.301" /></li>
                    <li>Must be labeled for primary and subsidiary hazards — <CfrLink r="172.400" /></li>
                    <li>Placarding: only if total Table 2 HM exceeds 1,001 lbs aggregate — <CfrLink r="172.504" /></li>
                    <li>Authorized packaging per Column 8B of the HM Table — <CfrLink r="172.101" /></li>
                    <li>Additional non-bulk packaging requirements — <CfrLink r="173.24a" /></li>
                  </ul>
                  <InfoBox color="amber">
                    <strong>Check for exceptions before citing violations:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li><strong>Limited Quantity</strong> — reduced marking/labeling/placarding requirements — <CfrLink r="172.315" /> and Column 8A of 172.101</li>
                      <li><strong>Materials of Trade</strong> — exempt from shipping papers, placarding, ER info, training — <CfrLink r="173.6" /></li>
                      <li><strong>Consumer Commodity / ORM-D</strong> — reclassified as limited quantity — <CfrLink r="173.150" /></li>
                      <li><strong>Small Quantity exceptions</strong> — <CfrLink r="173.4" /></li>
                      <li><strong>De minimis exceptions</strong> for specific materials — check Column 7 special provisions in <CfrLink r="172.102" /></li>
                    </ul>
                  </InfoBox>
                  <p className="text-[10px] italic text-[#64748B]">Non-bulk packages include drums, pails, cylinders, boxes, bags, jerricans, composite packaging, and combination packaging.</p>
                  <StepLink step={5} label="Check Marking" onNavigate={onNavigate} />
                </ResultBox>
              )}
              {capacity === "bulk" && isSpec === true && (
                <ResultBox title="This is a BULK SPECIFICATION package">
                  <p>Bulk specification packages for {packageType}s exceed the <strong>{thresholds[packageType].val}</strong> threshold and bear a DOT or UN specification marking.</p>
                  <p><strong>What applies to bulk spec packages:</strong></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>ID number displayed on each side and each end (1,000+ gal) or two opposing sides (&lt;1,000 gal) — <CfrLink r="172.302" /></li>
                    <li>Must be placarded — <CfrLink r="172.514" /></li>
                    <li>Additional marking requirements per package type: cargo tanks (<CfrLink r="172.328" />), portable tanks (<CfrLink r="172.326" />), IBCs (<CfrLink r="172.331" />)</li>
                    <li>Authorized packaging per Column 8C of the HM Table — <CfrLink r="172.101" /></li>
                    <li>Must meet all specification requirements — <CfrLink r="178" label="Part 178" /></li>
                    <li>Must meet requalification/retest schedule — <CfrLink r="180" label="Part 180" /></li>
                  </ul>
                  <InfoBox color="amber">
                    <strong>Check for exceptions before citing violations:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li><strong>Placarding exceptions</strong> — some bulk packages are exempt from placarding: certain portable tanks, DOT 106/110, some IBCs — <CfrLink r="172.514" /></li>
                      <li><strong>Non-spec intrastate</strong> — some bulk packages used only intrastate may qualify under <CfrLink r="173.8" /></li>
                      <li><strong>Ag operations</strong> — special exceptions for agricultural materials — <CfrLink r="173.5" /></li>
                      <li><strong>Special permits</strong> — verify if the carrier holds a DOT-SP that modifies standard requirements — <CfrLink r="107.105" /></li>
                      <li><strong>Column 7 special provisions</strong> — may modify packaging, marking, or placarding for this specific material — <CfrLink r="172.102" /></li>
                    </ul>
                  </InfoBox>
                  <p className="text-[10px] italic text-[#64748B]">Common spec bulk packages: cargo tanks (MC/DOT series), portable tanks (DOT 51, IM 101/102), spec cylinders (3AA, 4BA, etc.), UN-rated IBCs.</p>
                  <StepLink step={5} label="Check Marking" onNavigate={onNavigate} />
                </ResultBox>
              )}
              {capacity === "bulk" && isSpec === false && (
                <ResultBox title="This is a BULK NON-SPECIFICATION package" compliant={null}>
                  <p>This package exceeds the bulk threshold but does <strong>not</strong> bear a DOT or UN specification marking.</p>
                  <InfoBox color="amber">
                    <strong>Important:</strong> Most hazardous materials <strong>require</strong> specification packaging. A non-spec bulk container may only be used when specifically authorized by:
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li><CfrLink r="173.8" /> — Non-spec packagings used in <strong>intrastate</strong> transportation (state-only, not interstate)</li>
                      <li>A DOT Special Permit authorizing the non-spec package</li>
                      <li>Column 8C or special provisions that reference a non-spec option</li>
                    </ul>
                  </InfoBox>
                  <p><strong>If none of those apply, this is likely a violation.</strong> The material may need to be transferred to a proper specification package before transport.</p>
                  <p className="text-[10px] italic text-[#64748B]">Non-spec bulk examples: farm tanks (nurse tanks under certain conditions), non-spec IBCs where authorized, some intrastate containers under 173.8.</p>
                </ResultBox>
              )}
            </div>
          )}

          {/* Reset */}
          {packageType && (
            <button onClick={reset} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] hover:text-[#002855] transition-colors" data-testid="pkg-reset">
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MATERIALS OF TRADE (MOT) HELPER
   ================================================================ */
const MOT_ITEMS = [
  {
    id: "purpose",
    question: "Is the hazardous material carried for the direct support of a principal business (other than transportation)?",
    help: "Materials of Trade (MOT) are HM carried by employees for their work — not as the primary cargo. Examples: a pest control tech carrying pesticides, a plumber with propane for soldering, a pool company with chlorine, a farmer carrying small quantities of fertilizer. The HM must be needed for the person's primary job. Note: PIH (Poison Inhalation Hazard) materials, self-reactive materials, hazardous waste, and Class 7 (radioactive) are NEVER eligible for MOT.",
    failTitle: "Potential issue: Not direct support of principal business",
    failDetail: "If the primary purpose is to transport the HM as cargo (e.g., a delivery), the MOT exception does not apply. A plumber carrying a propane torch to a job = MOT. A propane delivery company delivering cylinders = NOT MOT.",
  },
  {
    id: "quantity",
    question: "Does the material meet the quantity limits?",
    helpType: "quantity_table",
    failTitle: "Potential issue: Exceeds MOT quantity limits",
    failDetail: "The quantity exceeds the per-package limits in 173.6(a), or the aggregate gross weight of all MOT on the vehicle exceeds 440 lbs (200 kg). Full HMR may apply, but check Limited Quantity exceptions (173.150–155) which allow larger quantities with reduced requirements.",
  },
  {
    id: "packaging",
    question: "Is the material in proper packaging per 173.6(b)?",
    help: "MOT packaging rules per 173.6(b): Packagings must be leak tight for liquids and gases, sift proof for solids, securely closed, secured against shifting, and protected against damage. Each material must be in the manufacturer's original packaging or one of equal or greater strength. For gasoline, the container must be metal or plastic conforming to HMR or OSHA (29 CFR 1910.106). Cylinders must conform to all HMR requirements.",
    failTitle: "Potential issue: Packaging does not meet 173.6(b)",
    failDetail: "The packaging must be leak tight, sift proof, securely closed, and protected from damage. If it's not in the original packaging, it must be of equal or greater strength. Gasoline must be in metal or plastic containers per HMR or OSHA standards.",
  },
  {
    id: "marking",
    question: "Is the package marked with the common name or proper shipping name?",
    help: "Per 173.6(c)(1), non-bulk packages (other than cylinders) must be marked with the common name or proper shipping name of the HM. If it contains a reportable quantity (RQ) of a hazardous substance, the letters 'RQ' must also appear. DOT spec cylinders (except DOT-39) must be marked and labeled per the HMR.",
    failTitle: "Potential issue: Missing required marking",
    failDetail: "Even under MOT, packages must be marked with the common name or proper shipping name. Cylinders must be marked and labeled per HMR. Missing markings are a citable violation even for MOT shipments.",
  },
  {
    id: "driver",
    question: "Has the driver been informed of the HM presence and 173.6 requirements?",
    help: "Per 173.6(c)(4), the operator of the motor vehicle must be informed of: the presence of the hazardous material, whether the package contains a reportable quantity, and the requirements of section 173.6. This is a communication requirement that remains even though shipping papers are not required.",
    failTitle: "Potential issue: Driver not informed",
    failDetail: "The vehicle operator must be informed of the HM and the 173.6 requirements. While formal shipping papers aren't required for MOT, the driver must know what HM is on the vehicle.",
  },
];

export function MaterialsOfTradeHelper({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({});

  const reset = useCallback(() => { setAnswers({}); }, []);

  const answered = Object.keys(answers);
  const allDone = MOT_ITEMS.every((q) => answers[q.id] !== undefined);
  const issues = MOT_ITEMS.filter((q) => answers[q.id] === false);
  const qualifies = allDone && issues.length === 0;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="mot-helper">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="mot-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <Truck className="w-4 h-4 text-[#002855]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">Materials of Trade (MOT) Helper</p>
          <p className="text-[10px] text-[#94A3B8]">Does this shipment qualify for the 173.6 exception?</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          <InfoBox>
            <strong>What is Materials of Trade?</strong> Under <CfrLink r="173.6" />, certain small quantities of HM carried by employees as tools of their trade are partially exempt from the HMR. If a shipment qualifies, it is <strong>exempt from</strong>: shipping papers, placarding, emergency response info, and HM training. <strong>However</strong>, packaging, marking, and driver notification still apply. Answer all questions below to evaluate.
          </InfoBox>

          {/* All questions — shown linearly */}
          {MOT_ITEMS.map((q, idx) => {
            const prev = idx === 0 || answers[MOT_ITEMS[idx - 1].id] !== undefined;
            if (!prev) return null; // only show if previous is answered
            const val = answers[q.id];
            const isAnswered = val !== undefined;

            return (
              <div key={q.id} className="space-y-2">
                {/* Question */}
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    !isAnswered ? "bg-[#002855]/10 text-[#002855]" :
                    val ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  }`}>
                    {!isAnswered ? (idx + 1) : val ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : "!"}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[11px] font-bold ${isAnswered ? "text-[#64748B]" : "text-[#002855]"}`}>{q.question}</p>
                  </div>
                </div>

                {/* Help / quantity table — show when not yet answered */}
                {!isAnswered && (
                  <>
                    {q.helpType === "quantity_table" ? (
                      <InfoBox color="amber">
                        <strong>MOT Quantity Limits</strong> — <CfrLink r="173.6(a)" />:
                        <table className="w-full mt-1.5 text-[10px]">
                          <thead>
                            <tr className="border-b border-amber-300/50">
                              <th className="text-left py-1 font-bold">Material Type</th>
                              <th className="text-right py-1 font-bold">Per Package</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-200/30">
                            <tr><td className="py-1">Class 3, 8, 9, Div 4.1, 5.1, 5.2, 6.1 — <strong>PG I</strong></td><td className="text-right">0.5 kg (1 lb) or 0.5 L (1 pt)</td></tr>
                            <tr><td className="py-1">Class 3, 8, 9, Div 4.1, 5.1, 5.2, 6.1 — <strong>PG II or III</strong></td><td className="text-right">30 kg (66 lbs) or 30 L (8 gal)</td></tr>
                            <tr><td className="py-1">Class 9 diluted mixture (max 2% concentration)</td><td className="text-right">1,500 L (400 gal)</td></tr>
                            <tr><td className="py-1">Division 2.1 or 2.2 in a cylinder</td><td className="text-right">100 kg (220 lbs) gross</td></tr>
                            <tr><td className="py-1">Div 2.2 (non-liquefied, no subsidiary) in permanent tank</td><td className="text-right">70 gal water capacity</td></tr>
                            <tr><td className="py-1">Division 4.3 (Dangerous When Wet) — PG II or III</td><td className="text-right">30 mL (1 oz)</td></tr>
                            <tr><td className="py-1">Division 6.2 (non-Category A, human/animal samples)</td><td className="text-right">See 173.6(a)(4)</td></tr>
                          </tbody>
                        </table>
                        <p className="mt-1.5 text-[9px]"><strong>NOT eligible for MOT:</strong> PIH materials, self-reactive materials, hazardous waste, or Class 7 (radioactive) — per 173.6(a)(5)/(a)(6).</p>
                        <p className="mt-1 text-[9px] italic">Aggregate gross weight of ALL MOT on one vehicle: <strong>max 440 lbs (200 kg)</strong> — per 173.6(d).</p>
                      </InfoBox>
                    ) : q.help ? (
                      <InfoBox>{q.help}</InfoBox>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <OptionButton onClick={() => setAnswers(p => ({ ...p, [q.id]: true }))} testId={`mot-${q.id}-yes`}>
                        <span className="font-semibold">Yes</span>
                      </OptionButton>
                      <OptionButton onClick={() => setAnswers(p => ({ ...p, [q.id]: false }))} testId={`mot-${q.id}-no`}>
                        <span className="font-semibold">No</span>
                      </OptionButton>
                    </div>
                  </>
                )}

                {/* Inline violation flag for "No" — but doesn't stop the flow */}
                {val === false && (
                  <div className="ml-7 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                    <p className="text-[11px] font-bold text-red-700">{q.failTitle}</p>
                    <p className="text-[10px] text-red-800/80 leading-relaxed mt-0.5">{q.failDetail}</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* FINAL SUMMARY — shown when all questions answered */}
          {allDone && (
            <div className={`rounded-xl border-2 p-4 space-y-2 ${qualifies ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50"}`} data-testid="mot-result">
              <p className={`text-[14px] font-bold ${qualifies ? "text-emerald-700" : "text-red-700"}`}>
                {qualifies ? "This likely qualifies as Materials of Trade (MOT)" : `Does NOT fully qualify — ${issues.length} issue${issues.length > 1 ? "s" : ""} found`}
              </p>

              {qualifies ? (
                <div className="text-[11px] leading-relaxed text-[#334155] space-y-1.5">
                  <p>Based on your answers, this shipment appears to meet all <CfrLink r="173.6" /> criteria.</p>
                  <p><strong>What is EXEMPT:</strong></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Shipping papers — <CfrLink r="172.200" label="Subpart C" /></li>
                    <li>Placarding — <CfrLink r="172.500" label="Subpart F" /></li>
                    <li>Emergency response information — <CfrLink r="172.600" label="Subpart G" /></li>
                    <li>HM employee training — <CfrLink r="172.700" label="Subpart H" /></li>
                  </ul>
                  <InfoBox color="green">
                    <strong>Common MOT scenarios:</strong> Pest control (pesticides), HVAC/plumbing (propane/acetylene), pool service (chlorine), agriculture (fertilizer/pesticide), painting (flammable solvents), cleaning services (corrosive cleaners).
                  </InfoBox>
                </div>
              ) : (
                <div className="text-[11px] leading-relaxed text-[#334155] space-y-1.5">
                  <p>The MOT exception under <CfrLink r="173.6" /> does not fully apply due to the following:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {issues.map((q) => (
                      <li key={q.id} className="text-red-800"><strong>{q.failTitle}</strong></li>
                    ))}
                  </ul>
                  <p>This shipment must comply with applicable HMR requirements for the areas that failed.</p>
                  <InfoBox color="amber">
                    <strong>Check other exceptions that may still apply:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li><strong>Limited Quantity</strong> — Column 8A of 172.101 and <CfrLink r="173.150" /> through <CfrLink r="173.155" /></li>
                      <li><strong>Small Quantity</strong> — <CfrLink r="173.4" /></li>
                      <li><strong>Agricultural operations</strong> — <CfrLink r="173.5" /></li>
                      <li><strong>Non-spec intrastate</strong> — <CfrLink r="173.8" /></li>
                    </ul>
                  </InfoBox>
                </div>
              )}
            </div>
          )}

          {/* Step links */}
          {allDone && (
            <div className="flex flex-wrap gap-3">
              <StepLink step={3} label="Packages & Exceptions" onNavigate={onNavigate} />
              <StepLink step={5} label="Marking" onNavigate={onNavigate} />
            </div>
          )}

          {/* Reset */}
          {answered.length > 0 && (
            <button onClick={reset} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] hover:text-[#002855] transition-colors" data-testid="mot-reset">
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/* ================================================================
   SEGREGATION TABLE — 49 CFR 177.848
   ================================================================ */
const SEG_CLASSES = [
  { id: "1.1/1.2", short: "1.1/1.2", name: "Explosives (Mass/Projection)" },
  { id: "1.3", short: "1.3", name: "Explosives (Fire hazard)" },
  { id: "1.4", short: "1.4", name: "Explosives (Minor blast)" },
  { id: "1.5", short: "1.5", name: "Very insensitive explosives" },
  { id: "1.6", short: "1.6", name: "Extremely insensitive explosives" },
  { id: "2.1", short: "2.1", name: "Flammable gases" },
  { id: "2.2", short: "2.2", name: "Non-toxic, non-flammable gases" },
  { id: "2.3A", short: "2.3A", name: "Poison gas — Zone A" },
  { id: "2.3B", short: "2.3B", name: "Poison gas — Zone B" },
  { id: "3", short: "3", name: "Flammable liquids" },
  { id: "4.1", short: "4.1", name: "Flammable solids" },
  { id: "4.2", short: "4.2", name: "Spontaneously combustible" },
  { id: "4.3", short: "4.3", name: "Dangerous when wet" },
  { id: "5.1", short: "5.1", name: "Oxidizers" },
  { id: "5.2", short: "5.2", name: "Organic peroxides" },
  { id: "6.1", short: "6.1", name: "Poison liquids PG I Zone A" },
  { id: "7", short: "7", name: "Radioactive materials" },
  { id: "8", short: "8", name: "Corrosive liquids" },
];

// Matrix from 49 CFR 177.848(d) — official eCFR table
// "*" = governed by compatibility table (explosives), "X" = prohibited, "O" = separated, "" = no restriction
const SEG_MATRIX = {
  "1.1/1.2": { "1.1/1.2":"*","1.3":"*","1.4":"*","1.5":"*","1.6":"*","2.1":"X","2.2":"X","2.3A":"X","2.3B":"X","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"X","7":"X","8":"X" },
  "1.3":     { "1.1/1.2":"*","1.3":"*","1.4":"*","1.5":"*","1.6":"*","2.1":"X","2.2":"","2.3A":"X","2.3B":"X","3":"X","4.1":"","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"X","7":"","8":"X" },
  "1.4":     { "1.1/1.2":"*","1.3":"*","1.4":"*","1.5":"*","1.6":"*","2.1":"O","2.2":"","2.3A":"O","2.3B":"O","3":"O","4.1":"","4.2":"O","4.3":"","5.1":"","5.2":"","6.1":"O","7":"","8":"O" },
  "1.5":     { "1.1/1.2":"*","1.3":"*","1.4":"*","1.5":"*","1.6":"*","2.1":"X","2.2":"X","2.3A":"X","2.3B":"X","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"X","7":"X","8":"X" },
  "1.6":     { "1.1/1.2":"*","1.3":"*","1.4":"*","1.5":"*","1.6":"*","2.1":"","2.2":"","2.3A":"","2.3B":"","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"","7":"","8":"" },
  "2.1":     { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"O","7":"O","8":"" },
  "2.2":     { "1.1/1.2":"X","1.3":"","1.4":"","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"","2.3B":"","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"","7":"","8":"" },
  "2.3A":    { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"X","2.2":"","2.3A":"","2.3B":"","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"","7":"","8":"X" },
  "2.3B":    { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"O","2.2":"","2.3A":"","2.3B":"","3":"O","4.1":"O","4.2":"O","4.3":"O","5.1":"O","5.2":"O","6.1":"","7":"","8":"O" },
  "3":       { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"","4.2":"","4.3":"","5.1":"O","5.2":"","6.1":"X","7":"","8":"" },
  "4.1":     { "1.1/1.2":"X","1.3":"","1.4":"","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"X","7":"","8":"O" },
  "4.2":     { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"X","7":"","8":"X" },
  "4.3":     { "1.1/1.2":"X","1.3":"X","1.4":"","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"X","7":"","8":"O" },
  "5.1":     { "1.1/1.2":"X","1.3":"X","1.4":"","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"O","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"X","7":"","8":"O" },
  "5.2":     { "1.1/1.2":"X","1.3":"X","1.4":"","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"X","7":"","8":"O" },
  "6.1":     { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"O","2.2":"","2.3A":"","2.3B":"","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"","7":"","8":"X" },
  "7":       { "1.1/1.2":"X","1.3":"","1.4":"","1.5":"X","1.6":"","2.1":"O","2.2":"","2.3A":"","2.3B":"","3":"","4.1":"","4.2":"","4.3":"","5.1":"","5.2":"","6.1":"","7":"","8":"" },
  "8":       { "1.1/1.2":"X","1.3":"X","1.4":"O","1.5":"X","1.6":"","2.1":"","2.2":"","2.3A":"X","2.3B":"O","3":"","4.1":"O","4.2":"X","4.3":"O","5.1":"O","5.2":"O","6.1":"X","7":"","8":"" },
};

function getCell(r, c) {
  if (r === c) return "self";
  return SEG_MATRIX[r]?.[c] || "";
}

function cellStyle(val, highlight) {
  const dim = highlight ? "" : " opacity-40";
  if (val === "X") return `bg-red-500 text-white font-bold${dim}`;
  if (val === "O") return `bg-yellow-400 text-yellow-900 font-bold${dim}`;
  if (val === "*") return `bg-orange-400 text-white font-bold${dim}`;
  if (val === "self") return "bg-[#002855] text-white font-bold";
  return `bg-emerald-500/80 text-emerald-950${dim}`;
}

function cellLabel(val) {
  if (val === "X") return "X";
  if (val === "O") return "O";
  if (val === "*") return "*";
  if (val === "self") return "-";
  return "";
}

/* ================================================================
   EXPLOSIVES COMPATIBILITY TABLE — 49 CFR 177.848(f)
   ================================================================ */
const COMPAT_GROUPS = ["A","B","C","D","E","F","G","H","J","K","L","N","S"];

const COMPAT_MATRIX = {
  A: {B:"X",C:"X",D:"X",E:"X",F:"X",G:"X",H:"X",J:"X",K:"X",L:"X",N:"X",S:"X"},
  B: {A:"X",C:"X",D:"X4",E:"X",F:"X",G:"X",H:"X",J:"X",K:"X",L:"X",N:"X",S:"45"},
  C: {A:"X",B:"X",D:"2",E:"2",F:"X",G:"6",H:"X",J:"X",K:"X",L:"X",N:"3",S:"45"},
  D: {A:"X",B:"X4",C:"2",E:"2",F:"X",G:"6",H:"X",J:"X",K:"X",L:"X",N:"3",S:"45"},
  E: {A:"X",B:"X",C:"2",D:"2",F:"X",G:"6",H:"X",J:"X",K:"X",L:"X",N:"3",S:"45"},
  F: {A:"X",B:"X",C:"X",D:"X",E:"X",G:"X",H:"X",J:"X",K:"X",L:"X",N:"X",S:"45"},
  G: {A:"X",B:"X",C:"6",D:"6",E:"6",F:"X",H:"X",J:"X",K:"X",L:"X",N:"X",S:"45"},
  H: {A:"X",B:"X",C:"X",D:"X",E:"X",F:"X",G:"X",J:"X",K:"X",L:"X",N:"X",S:"45"},
  J: {A:"X",B:"X",C:"X",D:"X",E:"X",F:"X",G:"X",H:"X",K:"X",L:"X",N:"X",S:"45"},
  K: {A:"X",B:"X",C:"X",D:"X",E:"X",F:"X",G:"X",H:"X",J:"X",L:"X",N:"X",S:"45"},
  L: {A:"X",B:"X",C:"X",D:"X",E:"X",F:"X",G:"X",H:"X",J:"X",K:"X",N:"X",S:"X"},
  N: {A:"X",B:"X",C:"3",D:"3",E:"3",F:"X",G:"X",H:"X",J:"X",K:"X",L:"X",S:"45"},
  S: {A:"X",B:"45",C:"45",D:"45",E:"45",F:"45",G:"45",H:"45",J:"45",K:"45",L:"X",N:"45"},
};

const COMPAT_GROUP_DESC = {
  A: "Primary detonating explosive substance (very sensitive)",
  B: "Article containing primary detonating substance (not 2+ protective features)",
  C: "Propellant explosive or deflagrating explosive substance or article",
  D: "Secondary detonating explosive substance, black powder, or article w/ detonating substance w/o means of initiation",
  E: "Article containing secondary detonating explosive w/o means of initiation, with propelling charge",
  F: "Article containing secondary detonating explosive with its own means of initiation, with propelling charge",
  G: "Pyrotechnic substance or article containing pyrotechnic substance, or article containing both explosive and illuminating/incendiary substance",
  H: "Article containing both explosive substance and white phosphorus",
  J: "Article containing both explosive substance and flammable liquid or gel",
  K: "Article containing both explosive substance and toxic chemical agent",
  L: "Explosive substance or article containing explosive substance, presenting special risk needing isolation",
  N: "Article containing only extremely insensitive detonating substances",
  S: "Article or substance packaged/designed to limit hazardous effects to the package (1.4S)",
};

const COMPAT_NOTES = {
  "1": "Group L shall only be carried with an identical explosive.",
  "2": "Any combination of C, D, or E is assigned to compatibility group E.",
  "3": "Any combination of C, D, or E with N is assigned to compatibility group D.",
  "45": "See 177.835(g) for detonators. Div 1.4S fireworks may NOT be loaded with Div 1.1 or 1.2 materials.",
  "X4": "X — except see 177.835(g) for detonators.",
  "6": "Group G articles (other than fireworks/special handling) may be loaded with C, D, and E, provided explosive substances (not in articles) are not on the same vehicle.",
};

function ExplosivesCompatibility() {
  const [groupA, setGroupA] = useState(null);
  const [groupB, setGroupB] = useState(null);

  const pick = (g) => {
    if (!groupA) setGroupA(g);
    else if (!groupB && g !== groupA) setGroupB(g);
    else { setGroupA(g); setGroupB(null); }
  };

  const compatResult = groupA && groupB ? (COMPAT_MATRIX[groupA]?.[groupB] || "") : null;

  const getResultText = (code) => {
    if (!code) return { verdict: "ALLOWED", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300", desc: "No restrictions. These compatibility groups may be loaded together." };
    if (code === "X") return { verdict: "PROHIBITED", color: "text-red-700", bg: "bg-red-50 border-red-300", desc: "These compatibility groups may NOT be carried on the same transport vehicle." };
    const note = COMPAT_NOTES[code];
    return { verdict: "CONDITIONAL", color: "text-amber-700", bg: "bg-amber-50 border-amber-300", desc: note || `See note ${code}.` };
  };

  return (
    <div className="space-y-2 pt-1">
      <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Explosives Compatibility — <CfrLink r="177.848(f)" /></p>

      {/* Group picker */}
      <div className="space-y-1">
        <p className="text-[10px] text-[#64748B]">{!groupA ? "Select first compatibility group:" : !groupB ? "Select second compatibility group:" : "Result:"}</p>
        <div className="flex flex-wrap gap-1">
          {COMPAT_GROUPS.map(g => (
            <button
              key={g}
              onClick={() => pick(g)}
              className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                groupA === g ? "bg-[#002855] text-white ring-2 ring-[#002855]" :
                groupB === g ? "bg-[#D4AF37] text-[#002855] ring-2 ring-[#D4AF37]" :
                "bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#002855] hover:bg-[#002855]/5"
              }`}
              data-testid={`compat-group-${g}`}
            >
              {g}
            </button>
          ))}
        </div>
        {groupA && (
          <p className="text-[9px] text-[#475569]"><strong>Group {groupA}:</strong> {COMPAT_GROUP_DESC[groupA]}</p>
        )}
        {groupB && (
          <p className="text-[9px] text-[#475569]"><strong>Group {groupB}:</strong> {COMPAT_GROUP_DESC[groupB]}</p>
        )}
      </div>

      {/* Result */}
      {compatResult !== null && (() => {
        const rt = getResultText(compatResult);
        return (
          <div className={`rounded-lg border-2 p-2.5 ${rt.bg}`} data-testid="compat-result">
            <p className={`text-[12px] font-bold ${rt.color}`}>{rt.verdict}: Group {groupA} + Group {groupB}</p>
            <p className="text-[10px] text-[#334155] mt-1 leading-relaxed">{rt.desc}</p>
          </div>
        );
      })()}

      {/* Reset */}
      {groupA && (
        <button onClick={() => { setGroupA(null); setGroupB(null); }} className="text-[10px] text-[#94A3B8] hover:text-orange-700 transition-colors">Reset groups</button>
      )}

      {/* Reference grid */}
      <details className="text-[9px]">
        <summary className="text-[10px] font-bold text-[#64748B] cursor-pointer hover:text-[#002855]">View full compatibility grid</summary>
        <div className="overflow-x-auto mt-1.5">
          <table className="border-collapse" style={{ minWidth: 400 }}>
            <thead>
              <tr>
                <th className="px-1 py-0.5 text-left font-bold text-[#64748B]"></th>
                {COMPAT_GROUPS.map(g => (
                  <th key={g} className={`px-1 py-0.5 text-center font-bold ${groupA === g || groupB === g ? "text-[#002855] bg-[#002855]/10" : "text-[#64748B]"}`}>{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPAT_GROUPS.map(row => (
                <tr key={row}>
                  <td className={`px-1 py-0.5 font-bold ${groupA === row || groupB === row ? "text-[#002855] bg-[#002855]/10" : "text-[#64748B]"}`}>{row}</td>
                  {COMPAT_GROUPS.map(col => {
                    if (row === col) return <td key={col} className="px-1 py-0.5 text-center bg-[#002855] text-white font-bold">-</td>;
                    const val = COMPAT_MATRIX[row]?.[col] || "";
                    const isHighlight = (groupA === row && groupB === col) || (groupA === col && groupB === row);
                    const bgClass = val === "X" || val === "X4" ? "bg-red-500 text-white" :
                      val === "" ? "bg-emerald-100 text-emerald-800" :
                      "bg-amber-200 text-amber-900";
                    return (
                      <td key={col} className={`px-1 py-0.5 text-center font-bold ${bgClass} ${isHighlight ? "ring-2 ring-[#002855]" : ""}`}>
                        {val === "" ? "" : val === "X4" ? "X*" : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-1.5 space-y-0.5 text-[9px] text-[#64748B]">
          <p><strong>X</strong> = May NOT be on same vehicle. <strong>Blank</strong> = No restriction.</p>
          <p><strong>1</strong> = Group L only with identical explosive. <strong>2</strong> = C+D+E combination → assigned Group E.</p>
          <p><strong>3</strong> = C/D/E + N → assigned Group D. <strong>4/5</strong> = See 177.835(g) for detonators; 1.4S fireworks NOT with 1.1/1.2.</p>
          <p><strong>6</strong> = Group G articles (not fireworks) may load with C, D, E if no explosive substances (non-articles) present.</p>
        </div>
      </details>
    </div>
  );
}

export function SegregationTable({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [classA, setClassA] = useState(null);
  const [classB, setClassB] = useState(null);

  const pickClass = (id) => {
    if (!classA) { setClassA(id); setClassB(null); }
    else if (classA === id) { setClassA(null); setClassB(null); }
    else if (classB === id) { setClassB(null); }
    else { setClassB(id); }
  };

  const reset = () => { setClassA(null); setClassB(null); };

  const result = classA && classB ? getCell(classA, classB) : null;
  const infoA = classA ? SEG_CLASSES.find(c => c.id === classA) : null;
  const infoB = classB ? SEG_CLASSES.find(c => c.id === classB) : null;

  // Plain language descriptions
  const plainText = {
    X: {
      short: "PROHIBITED",
      detail: "These materials may NOT be loaded, transported, or stored together in the same transport vehicle or storage facility during the course of transportation.",
      action: "They must be on completely separate vehicles. There is no separation method that allows them on the same truck.",
    },
    O: {
      short: "ALLOWED ONLY IF SEPARATED",
      detail: "These materials may be loaded together ONLY if they are separated in a manner that prevents commingling in the event of leakage under normal transport conditions.",
      action: "They can be on the same vehicle, but packages must be physically separated so that if one leaks, the materials cannot mix. Note: Class 8 (corrosive) liquids may not be loaded above or adjacent to Class 4 or Class 5 materials even when separated.",
    },
    "*": {
      short: "SEE EXPLOSIVES COMPATIBILITY TABLE",
      detail: "Segregation between different Class 1 (explosive) divisions and compatibility groups is governed by the compatibility table in 177.848(f).",
      action: "Select the compatibility groups below to check if they can be loaded together.",
      showCompat: true,
    },
    "": {
      short: "NO RESTRICTION",
      detail: "There are no segregation restrictions between these two hazard classes. They may be loaded, transported, and stored together on the same vehicle.",
      action: "They are allowed on the same truck with no special separation required. Always still follow general securement rules (177.834).",
    },
  };

  const pt = result !== null ? plainText[result] || plainText[""] : null;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="segregation-table">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="seg-table-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <svg className="w-4 h-4 text-[#002855]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">Segregation Table — 177.848</p>
          <p className="text-[10px] text-[#94A3B8]">Select two hazard classes to check if they can load together</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-3 py-3 space-y-3">
          {/* Instructions */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#64748B]">
              {!classA ? "Select the first hazard class:" : !classB ? "Now select the second hazard class:" : "Result:"}
            </p>
            {classA && (
              <button onClick={reset} className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-[#002855] transition-colors" data-testid="seg-reset">
                <RotateCcw className="w-3 h-3" /> Start over
              </button>
            )}
          </div>

          {/* Class selector chips */}
          <div className="flex flex-wrap gap-1.5">
            {SEG_CLASSES.map((c) => {
              const isA = classA === c.id;
              const isB = classB === c.id;
              const picked = isA || isB;
              return (
                <button
                  key={c.id}
                  onClick={() => pickClass(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border-2 ${
                    isA ? "bg-[#002855] text-white border-[#002855] shadow-md" :
                    isB ? "bg-[#D4AF37] text-[#002855] border-[#D4AF37] shadow-md" :
                    picked ? "" :
                    "bg-white text-[#334155] border-[#E2E8F0] hover:border-[#002855]/40 hover:bg-[#F8FAFC]"
                  }`}
                  data-testid={`seg-pick-${c.id}`}
                >
                  {c.short}
                </button>
              );
            })}
          </div>

          {/* Selected classes display */}
          {classA && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#002855] text-white px-3 py-1.5 rounded-lg">
                <span className="text-[12px] font-bold">{infoA.short}</span>
                <span className="text-[10px] opacity-70">{infoA.name}</span>
              </div>
              {classB ? (
                <>
                  <span className="text-[12px] font-bold text-[#64748B]">+</span>
                  <div className="flex items-center gap-1.5 bg-[#D4AF37] text-[#002855] px-3 py-1.5 rounded-lg">
                    <span className="text-[12px] font-bold">{infoB.short}</span>
                    <span className="text-[10px] opacity-70">{infoB.name}</span>
                  </div>
                </>
              ) : (
                <span className="text-[11px] text-[#94A3B8] italic">+ pick a second class above</span>
              )}
            </div>
          )}

          {/* RESULT — plain language */}
          {result !== null && pt && (
            <div className={`rounded-xl border-2 p-4 space-y-2 ${
              result === "X" ? "border-red-400 bg-red-50" :
              result === "O" ? "border-yellow-400 bg-yellow-50" :
              result === "*" ? "border-orange-400 bg-orange-50" :
              "border-emerald-400 bg-emerald-50"
            }`} data-testid="seg-result">
              {/* Big verdict */}
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black flex-shrink-0 ${
                  result === "X" ? "bg-red-500 text-white" :
                  result === "O" ? "bg-yellow-400 text-yellow-900" :
                  result === "*" ? "bg-orange-400 text-white" :
                  "bg-emerald-500 text-white"
                }`}>
                  {result === "X" ? "X" : result === "O" ? "O" : result === "*" ? "*" : "OK"}
                </div>
                <div>
                  <p className={`text-[14px] font-bold ${
                    result === "X" ? "text-red-700" : result === "O" ? "text-yellow-800" : result === "*" ? "text-orange-700" : "text-emerald-700"
                  }`}>{pt.short}</p>
                  <p className="text-[10px] text-[#64748B]">{infoA.short} ({infoA.name}) + {infoB.short} ({infoB.name})</p>
                </div>
              </div>

              {/* What this means */}
              <div className="space-y-1.5">
                <p className="text-[11px] leading-relaxed text-[#334155]"><strong>What this means:</strong> {pt.detail}</p>
                <p className="text-[11px] leading-relaxed text-[#334155]"><strong>What to do:</strong> {pt.action}</p>
              </div>

              {/* Explosives compatibility table — shown when "*" */}
              {pt.showCompat && <ExplosivesCompatibility />}

              {/* Ref */}
              <p className="text-[10px] text-[#94A3B8]">Per <CfrLink r="177.848" /> segregation table</p>
              <StepLink step={7} label="Loading & Segregation" onNavigate={onNavigate} />
            </div>
          )}

          {/* Grid table — reference */}
          <div>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Full Segregation Grid — 177.848(d)</p>
            <div className="overflow-x-auto -mx-1">
              <table className="border-collapse text-[9px]" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-1 py-1 text-left text-[9px] font-bold text-[#64748B] w-14"></th>
                    {SEG_CLASSES.map((c) => (
                      <th key={c.id} className="px-0.5 py-1 text-center">
                        <button
                          onClick={() => pickClass(c.id)}
                          className={`w-full px-1 py-1 rounded text-[9px] font-bold transition-all ${
                            classA === c.id ? "bg-[#002855] text-white shadow-md" :
                            classB === c.id ? "bg-[#D4AF37] text-[#002855] shadow-md" :
                            "text-[#002855] hover:bg-[#002855]/10"
                          }`}
                          data-testid={`seg-col-${c.id}`}
                        >
                          {c.short}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SEG_CLASSES.map((row) => {
                    const rowMatch = classA === row.id || classB === row.id;
                    return (
                      <tr key={row.id}>
                        <td className="sticky left-0 z-10 bg-white px-1 py-0.5">
                          <button
                            onClick={() => pickClass(row.id)}
                            className={`w-full text-left px-1 py-1 rounded text-[9px] font-bold transition-all whitespace-nowrap ${
                              classA === row.id ? "bg-[#002855] text-white shadow-md" :
                              classB === row.id ? "bg-[#D4AF37] text-[#002855] shadow-md" :
                              "text-[#002855] hover:bg-[#002855]/10"
                            }`}
                            data-testid={`seg-row-${row.id}`}
                          >
                            {row.short}
                          </button>
                        </td>
                        {SEG_CLASSES.map((col) => {
                          const val = getCell(row.id, col.id);
                          const colMatch = classA === col.id || classB === col.id;
                          const isExact = (classA === row.id && classB === col.id) || (classB === row.id && classA === col.id);
                          const hl = !classA || !classB || rowMatch || colMatch;
                          return (
                            <td key={col.id} className="px-0.5 py-0.5">
                              <div
                                className={`w-full h-6 rounded-sm flex items-center justify-center text-[9px] transition-all ${cellStyle(val, hl)} ${isExact ? "ring-2 ring-[#002855] ring-offset-1 scale-125 z-10 relative" : ""}`}
                              >
                                {cellLabel(val)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-4 rounded-sm bg-red-500" />
              <span className="text-[10px] text-[#334155]"><strong>X</strong> — May NOT load together</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-4 rounded-sm bg-yellow-400" />
              <span className="text-[10px] text-[#334155]"><strong>O</strong> — Only if separated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-4 rounded-sm bg-emerald-500/80" />
              <span className="text-[10px] text-[#334155]">No restriction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-4 rounded-sm bg-orange-400" />
              <span className="text-[10px] text-[#334155]"><strong>*</strong> — Explosives compatibility</span>
            </div>
          </div>

          {/* Additional rules */}
          <div className="text-[10px] text-[#64748B] space-y-1 border-t pt-2">
            <p><strong>Additional rules per <CfrLink r="177.848(c)" />:</strong></p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong>Cyanides</strong> may not be loaded with <strong>acids</strong> if mixing would generate hydrogen cyanide</li>
              <li><strong>Div 4.2</strong> may not be loaded with <strong>Class 8 liquids</strong></li>
              <li><strong>Div 6.1 PG I Zone A</strong> may not be loaded with Class 3, Class 8 liquids, or Div 4.1/4.2/4.3/5.1/5.2</li>
            </ul>
            <p className="italic">Subsidiary hazards: when a package has a subsidiary label, use the more restrictive segregation — <CfrLink r="177.848(e)(6)" /></p>
          </div>
        </div>
      )}
    </div>
  );
}


/* ================================================================
   PLACARD DETERMINATION HELPER — 49 CFR 172.504
   ================================================================ */
const TABLE1 = [
  { div: "1.1", placard: "EXPLOSIVES 1.1", color: "#C2410C" },
  { div: "1.2", placard: "EXPLOSIVES 1.2", color: "#C2410C" },
  { div: "1.3", placard: "EXPLOSIVES 1.3", color: "#C2410C" },
  { div: "2.3", placard: "POISON GAS", color: "#DC2626" },
  { div: "4.3", placard: "DANGEROUS WHEN WET", color: "#1D4ED8" },
  { div: "5.2*", placard: "ORGANIC PEROXIDE (Type B, temp. controlled)", color: "#DC2626" },
  { div: "6.1 PIH", placard: "POISON INHALATION HAZARD", color: "#DC2626" },
  { div: "7", placard: "RADIOACTIVE (Yellow III label)", color: "#EAB308" },
];

const TABLE2 = [
  { div: "1.4", placard: "EXPLOSIVES 1.4", color: "#C2410C" },
  { div: "1.5", placard: "EXPLOSIVES 1.5", color: "#C2410C" },
  { div: "1.6", placard: "EXPLOSIVES 1.6", color: "#C2410C" },
  { div: "2.1", placard: "FLAMMABLE GAS", color: "#DC2626" },
  { div: "2.2", placard: "NON-FLAMMABLE GAS", color: "#16A34A" },
  { div: "3", placard: "FLAMMABLE", color: "#DC2626" },
  { div: "Comb. Liq.", placard: "COMBUSTIBLE", color: "#DC2626" },
  { div: "4.1", placard: "FLAMMABLE SOLID", color: "#DC2626" },
  { div: "4.2", placard: "SPONTANEOUSLY COMBUSTIBLE", color: "#DC2626" },
  { div: "5.1", placard: "OXIDIZER", color: "#EAB308" },
  { div: "5.2", placard: "ORGANIC PEROXIDE (other)", color: "#EAB308" },
  { div: "6.1", placard: "POISON (other than PIH)", color: "#DC2626" },
  { div: "6.2", placard: "NONE", color: "#94A3B8" },
  { div: "8", placard: "CORROSIVE", color: "#1E293B" },
  { div: "9", placard: "CLASS 9 (not req'd for domestic highway)", color: "#64748B" },
];

const PLACARD_EXCEPTIONS = [
  { id: "ltd_qty", title: "Limited Quantities", ref: "172.500(b)(2)", desc: "Materials identified as limited quantity on the shipping paper per 172.203(b) or marked per 172.315 are exempt from ALL placarding requirements. Includes consumer commodities." },
  { id: "small_qty", title: "Small Quantities", ref: "172.500(b)(4)", desc: "Materials packaged under small quantity provisions (173.4, 173.4a, 173.4b) are exempt from placarding." },
  { id: "infectious", title: "Infectious Substances (Div 6.2)", ref: "172.500(b)(1)", desc: "Division 6.2 infectious substances are exempt from placarding entirely. Still require proper packaging, marking, labeling, and shipping papers." },
  { id: "comb_nonbulk", title: "Combustible Liquids in Non-Bulk", ref: "172.500(b)(5)", desc: "Combustible liquids (flash point >140°F and <200°F) in non-bulk packages (≤119 gal) are exempt from placarding." },
  { id: "under_1001", title: "Less than 1,001 lbs of Table 2 Material", ref: "172.504(c)", desc: "Table 2 materials (in non-bulk packages only) do NOT require placards if the aggregate gross weight on the vehicle is under 454 kg (1,001 lbs). Does NOT apply to Table 1 materials or bulk packages." },
  { id: "empty", title: "Empty Non-Bulk Packages (Table 2 only)", ref: "172.504(d)", desc: "Non-bulk packages containing only the residue of a Table 2 material do not count toward the placarding determination. Does NOT apply to Table 1 residue." },
  { id: "dangerous_sub", title: "DANGEROUS Placard Substitution", ref: "172.504(b)", desc: "When carrying 2+ categories of Table 2 materials in non-bulk packages, a single DANGEROUS placard may replace the individual Table 2 placards. EXCEPTION: If 2,205 lbs (1,000 kg) or more of one Table 2 category is loaded at one facility, that specific placard must be displayed." },
  { id: "class1_lowest", title: "Class 1 — Only Lowest Division", ref: "172.504(f)(1)", desc: "When multiple Class 1 division placards are required, only the placard for the LOWEST division number needs to be displayed. E.g., if carrying Div 1.1 and Div 1.3, only EXPLOSIVES 1.1 is needed." },
  { id: "flam_for_comb", title: "FLAMMABLE for COMBUSTIBLE", ref: "172.504(f)(2)", desc: "A FLAMMABLE placard may be used in place of a COMBUSTIBLE placard on a cargo tank, portable tank, or a compartmented tank car with both flammable and combustible liquids." },
  { id: "nonfg_oxygen", title: "NON-FLAMMABLE GAS Not Required", ref: "172.504(f)(3)", desc: "A NON-FLAMMABLE GAS placard is not required if the vehicle also contains flammable gas or oxygen and is already placarded FLAMMABLE GAS or OXYGEN." },
  { id: "oxidizer_exp", title: "OXIDIZER Not Required with Explosives", ref: "172.504(f)(4)/(5)", desc: "OXIDIZER placards are not required when the vehicle also contains Div 1.1, 1.2, or 1.5 explosives and is placarded with those explosive placards." },
  { id: "1_4s", title: "Division 1.4S Exception", ref: "172.504(f)(6)", desc: "Div 1.4 Compatibility Group S (1.4S) materials that are not required to be labeled 1.4S do NOT require an EXPLOSIVES 1.4 placard." },
  { id: "oxygen_dom", title: "OXYGEN for Domestic Transport", ref: "172.504(f)(7)", desc: "For domestic transport of oxygen (compressed or refrigerated liquid), the OXYGEN placard may be used instead of NON-FLAMMABLE GAS." },
  { id: "pih_pg", title: "POISON GAS Covers PIH", ref: "172.504(f)(8)", desc: "For domestic transport, a POISON INHALATION HAZARD placard is not required if the vehicle already displays a POISON GAS placard." },
  { id: "class9_dom", title: "Class 9 — Domestic Exception", ref: "172.504(f)(9)", desc: "A CLASS 9 placard is NOT required for domestic highway transport. However, bulk packages must still display the ID number on a Class 9 placard, orange panel, or white square-on-point." },
  { id: "poison_dom", title: "POISON Not Required with PIH/Poison Gas", ref: "172.504(f)(11)", desc: "For domestic transport, a POISON placard is not required if the vehicle already displays a POISON INHALATION HAZARD or POISON GAS placard." },
];

export function PlacardHelper({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showExceptions, setShowExceptions] = useState(false);

  const reset = useCallback(() => { setAnswers({}); }, []);

  const QUESTIONS = [
    { id: "table", question: "Is the material a Table 1 or Table 2 hazard class?", help: null, helpType: "tables" },
    { id: "weight", question: "Is the aggregate gross weight of ALL Table 2 materials on this vehicle 1,001 lbs (454 kg) or more?", help: "Add up the gross weight (including packaging) of ALL Table 2 materials on the vehicle — not just one class. If the total is 1,001 lbs or more, placards are required. If under 1,001 lbs, placards are not required for the Table 2 materials (unless in bulk packaging).", condition: (a) => a.table === "table2" },
    { id: "exception", question: "Does any placarding exception in 172.504(f) apply?", help: null, helpType: "exception_check", condition: (a) => {
      if (a.table === "table1") return true;
      if (a.table === "table2" && a.weight === true) return true;
      return false;
    }},
    { id: "bulk", question: "Is the hazardous material in a BULK packaging?", help: "Bulk = capacity greater than 119 gal for liquids, 882 lbs for solids, or water capacity greater than 1,000 lbs for gases (171.8). Cargo tanks, portable tanks, IBCs over these thresholds, and tank cars are all bulk. Bulk packaging must be placarded when it contains any quantity of HM.", condition: (a) => {
      if (a.table === "table1" && a.exception !== undefined) return true;
      if (a.table === "table2" && a.weight === true && a.exception !== undefined) return true;
      if (a.table === "table2" && a.weight === false) return true;
      return false;
    }},
    { id: "bulkException", question: "Does any bulk placarding exception in 172.514 apply?", help: null, helpType: "bulk_exception_check", condition: (a) => a.bulk === true },
  ];

  const visibleQs = QUESTIONS.filter(q => !q.condition || q.condition(answers));

  const allDone = visibleQs.every(q => answers[q.id] !== undefined);

  // Determine result
  let verdict = null;
  let endorsement = false;
  const a = answers;

  if (a.table === "neither") {
    verdict = { required: false, reason: "The material does not appear to fall under Table 1 or Table 2. Check if an exception applies (limited quantity, Materials of Trade, etc.) that may remove it from the HMR entirely." };
  } else if (a.table === "table2" && a.weight === false && a.bulk === false) {
    verdict = { required: false, reason: "Table 2 materials in non-bulk packages under 1,001 lbs aggregate do NOT require placards (172.504(c)). However, all other HMR requirements (shipping papers, marking, labeling, packaging) still apply." };
  } else if (a.table === "table2" && a.weight === false && a.bulk === true) {
    verdict = { required: true, reason: "Even though the aggregate weight is under 1,001 lbs, bulk packaging must be placarded when it contains any quantity of hazardous material (172.514(a))." };
    endorsement = true;
  } else if (a.table === "table1" && a.exception !== undefined && a.bulk !== undefined) {
    verdict = { required: true, reason: "Table 1 materials require placards in ANY quantity — even a single package." };
    endorsement = true;
  } else if (a.table === "table2" && a.weight === true && a.exception !== undefined && a.bulk !== undefined) {
    verdict = { required: true, reason: "The aggregate gross weight of Table 2 materials on this vehicle meets or exceeds 1,001 lbs (454 kg)." };
    endorsement = true;
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="placard-helper">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="placard-helper-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#002855]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">Does It Need a Placard?</p>
          <p className="text-[10px] text-[#94A3B8]">Placard determination, Tables 1 & 2, exceptions, CDL HM endorsement</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          <InfoBox>
            <strong>Placarding overview:</strong> Placards are 250mm (9.84 in) diamond-shaped signs displayed on all four sides of a vehicle to identify hazard classes. <strong>Table 1</strong> materials require placards in <strong>any amount</strong>. <strong>Table 2</strong> materials require placards only when the aggregate gross weight on the vehicle is <strong>1,001 lbs or more</strong> (unless in bulk packaging). See <CfrLink r="172.504" />.
          </InfoBox>

          {/* Questions */}
          {visibleQs.map((q, idx) => {
            const prev = idx === 0 || answers[visibleQs[idx - 1].id] !== undefined;
            if (!prev) return null;
            const val = answers[q.id];
            const isAnswered = val !== undefined;

            // Skip questions that don't apply to this path
            if (q.id === "weight" && (answers.table === "table1" || answers.table === "neither")) return null;
            if (q.id === "exception" && (answers.table === "neither" || (answers.table === "table2" && answers.weight === false))) return null;
            if (q.id === "bulk" && answers.table === "neither") return null;
            if (q.id === "bulkException" && answers.bulk !== true) return null;

            return (
              <div key={q.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    !isAnswered ? "bg-[#002855]/10 text-[#002855]" :
                    "bg-[#002855] text-white"
                  }`}>
                    {idx + 1}
                  </div>
                  <p className={`text-[11px] font-bold ${isAnswered ? "text-[#64748B]" : "text-[#002855]"}`}>{q.question}</p>
                </div>

                {!isAnswered && (
                  <>
                    {q.helpType === "tables" ? (
                      <div className="space-y-2 pl-7">
                        <p className="text-[10px] text-[#64748B]">Find the material's primary hazard class from the shipping paper, then locate it below:</p>
                        {/* Table 1 */}
                        <div className="rounded-lg border-2 border-red-300 bg-red-50/50 p-2.5">
                          <p className="text-[11px] font-bold text-red-700 mb-1.5">TABLE 1 — Placard required in ANY quantity</p>
                          <div className="space-y-0.5">
                            {TABLE1.map(t => (
                              <div key={t.div} className="flex items-center gap-2 text-[10px]">
                                <span className="font-mono font-bold text-red-800 w-12 flex-shrink-0">{t.div}</span>
                                <span className="text-[#334155]">{t.placard}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Table 2 */}
                        <div className="rounded-lg border-2 border-[#002855]/20 bg-[#002855]/5 p-2.5">
                          <p className="text-[11px] font-bold text-[#002855] mb-1.5">TABLE 2 — Placard required at 1,001 lbs+ aggregate</p>
                          <div className="space-y-0.5">
                            {TABLE2.map(t => (
                              <div key={t.div} className="flex items-center gap-2 text-[10px]">
                                <span className="font-mono font-bold text-[#002855] w-12 flex-shrink-0">{t.div}</span>
                                <span className="text-[#334155]">{t.placard}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, table: "table1" }))} testId="plac-table1">
                            <span className="font-semibold text-red-700">Table 1</span>
                          </OptionButton>
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, table: "table2" }))} testId="plac-table2">
                            <span className="font-semibold text-[#002855]">Table 2</span>
                          </OptionButton>
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, table: "neither" }))} testId="plac-neither">
                            <span className="font-semibold">Neither/Unsure</span>
                          </OptionButton>
                        </div>
                      </div>
                    ) : q.helpType === "exception_check" ? (
                      <div className="pl-7 space-y-2">
                        <InfoBox color="amber">
                          <strong>Check if any placarding exception in <CfrLink r="172.504(f)" /> reduces or eliminates the placard requirement.</strong> Review the exceptions list below. If none apply, placards are required.
                        </InfoBox>
                        <div className="grid grid-cols-2 gap-2">
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, exception: false }))} testId="plac-no-exception">
                            <span className="font-semibold">No exception applies</span>
                          </OptionButton>
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, exception: true }))} testId="plac-has-exception">
                            <span className="font-semibold">Exception applies</span>
                          </OptionButton>
                        </div>
                      </div>
                    ) : q.helpType === "bulk_exception_check" ? (
                      <div className="pl-7 space-y-2">
                        <InfoBox>
                          <strong>Bulk packaging must be placarded</strong> when it contains any quantity of HM, and must remain placarded when emptied unless cleaned/purged (<CfrLink r="172.514(a)(b)" />).
                        </InfoBox>
                        <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-[10px] text-[#1E40AF] space-y-1">
                          <p className="font-bold">Bulk placarding exceptions — <CfrLink r="172.514(c)" />:</p>
                          <p>The following may be placarded on <strong>only two opposite sides</strong>, or may be <strong>labeled instead of placarded</strong>:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            <li>Portable tank with capacity less than 1,000 gallons (3,785 L)</li>
                            <li>DOT 106 or 110 multi-unit tank car tank</li>
                            <li>Bulk packaging (other than portable tank, cargo tank, flexible bulk container, or tank car) with volumetric capacity less than 640 cubic feet (e.g., bulk bag or box)</li>
                            <li>IBC labeled per Subpart E — may display proper shipping name and UN ID markings in lieu of orange panel/placard</li>
                            <li>Large Packaging as defined in <CfrLink r="171.8" /></li>
                          </ul>
                          <p>Flexible bulk containers may be placarded on <strong>two opposing positions</strong> — <CfrLink r="172.514(d)" />.</p>
                          <p className="font-bold mt-1">Emptied bulk packaging — <CfrLink r="172.514(b)" />:</p>
                          <p>Must remain placarded when emptied, <strong>unless</strong>: (1) sufficiently cleaned/purged of residue and vapors, (2) refilled with a material requiring different or no placards, or (3) contains residue of Class 9 hazardous substance below the reportable quantity.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, bulkException: false }))} testId="plac-no-bulk-exception">
                            <span className="font-semibold">No bulk exception</span>
                          </OptionButton>
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, bulkException: true }))} testId="plac-has-bulk-exception">
                            <span className="font-semibold">Exception applies</span>
                          </OptionButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        {q.help && <div className="pl-7"><InfoBox>{q.help}</InfoBox></div>}
                        <div className="grid grid-cols-2 gap-2 pl-7">
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, [q.id]: true }))} testId={`plac-${q.id}-yes`}>
                            <span className="font-semibold">Yes</span>
                          </OptionButton>
                          <OptionButton onClick={() => setAnswers(p => ({ ...p, [q.id]: false }))} testId={`plac-${q.id}-no`}>
                            <span className="font-semibold">No</span>
                          </OptionButton>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Show answered state inline */}
                {isAnswered && q.id === "table" && (
                  <div className={`ml-7 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    val === "table1" ? "bg-red-100 text-red-700" : val === "table2" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {val === "table1" ? "Table 1" : val === "table2" ? "Table 2" : "Neither"}
                  </div>
                )}
                {isAnswered && q.id !== "table" && (
                  <div className={`ml-7 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${val ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {typeof val === "boolean" ? (val ? "Yes" : "No") : val}
                  </div>
                )}
              </div>
            );
          })}

          {/* VERDICT */}
          {verdict && (
            <div className={`rounded-xl border-2 p-4 space-y-3 ${verdict.required ? "border-red-400 bg-red-50" : "border-emerald-400 bg-emerald-50"}`} data-testid="placard-result">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${verdict.required ? "bg-red-500" : "bg-emerald-500"}`}>
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className={`text-[16px] font-bold ${verdict.required ? "text-red-700" : "text-emerald-700"}`}>
                    {answers.exception === true ? "EXCEPTION MAY REDUCE REQUIREMENTS" : verdict.required ? "PLACARDS REQUIRED" : "PLACARDS NOT REQUIRED"}
                  </p>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{answers.exception === true ? "An exception was identified. Review the exceptions list below to determine which specific requirements are reduced or eliminated." : verdict.reason}</p>
                </div>
              </div>

              {/* CDL HM ENDORSEMENT */}
              {verdict.required && !answers.exception && (
                <div className="rounded-lg border border-[#002855]/30 bg-[#002855]/5 p-3 space-y-1.5">
                  <p className="text-[12px] font-bold text-[#002855]">CDL Hazardous Materials Endorsement (H)</p>
                  <p className="text-[11px] text-[#334155] leading-relaxed">
                    Per <CfrLink r="383.93" />, a CDL with an <strong>"H" endorsement</strong> is required to operate any CMV transporting hazardous materials <strong>required to be placarded</strong> under 49 CFR Part 172, Subpart F.
                  </p>
                  <ul className="list-disc pl-4 text-[10px] text-[#475569] space-y-0.5">
                    <li><strong>Placards displayed = H endorsement required.</strong> No exceptions for quantity — if placards go on the truck, the driver needs the H endorsement.</li>
                    <li>The H endorsement requires passing a <strong>knowledge test</strong> and a <strong>TSA security threat assessment</strong> (background check).</li>
                    <li>If also hauling in a <strong>cargo tank</strong>, both the H (HazMat) and N (Tank) endorsements are needed — combined as the <strong>"X" endorsement</strong>.</li>
                    <li>Loads <strong>below placarding thresholds</strong> still require HM employee training per <CfrLink r="172.704" /> but do NOT require the CDL H endorsement.</li>
                  </ul>
                </div>
              )}

              {!verdict.required && (
                <InfoBox>
                  <strong>No placard = No CDL H endorsement required</strong> for this load. However, the driver must still have completed HM employee training per <CfrLink r="172.704" /> if handling hazardous materials. All other applicable HMR requirements (shipping papers, marking, labeling, packaging) still apply.
                </InfoBox>
              )}
            </div>
          )}

          {/* Step link */}
          {verdict && <StepLink step={4} label="Placarding Compliance" onNavigate={onNavigate} />}

          {/* EXCEPTIONS LIST — always available */}
          <div>
            <button
              onClick={() => setShowExceptions(!showExceptions)}
              className="w-full flex items-center justify-between py-2"
              data-testid="placard-exceptions-toggle"
            >
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Placarding Exceptions — 172.500 & 172.504(f)</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${showExceptions ? "rotate-180" : ""}`} />
            </button>
            {showExceptions && (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] text-[#64748B] italic">These exceptions may reduce or eliminate placarding requirements. Review each one carefully before determining compliance.</p>
                {PLACARD_EXCEPTIONS.map((ex) => (
                  <div key={ex.id} className="rounded-lg border bg-[#F8FAFC] p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-[#0F172A]">{ex.title} — <CfrLink r={ex.ref} /></p>
                        <p className="text-[10px] text-[#475569] leading-relaxed mt-0.5">{ex.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          {Object.keys(answers).length > 0 && (
            <button onClick={reset} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] hover:text-[#002855] transition-colors" data-testid="placard-reset">
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/* ================================================================
   RQ / MARINE POLLUTANT LOOKUP — Appendix A & B to 172.101
   ================================================================ */
const API = process.env.REACT_APP_BACKEND_URL;

export function SubstanceLookup({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResults, setOcrResults] = useState(null);
  const debounceRef = useRef(null);
  const cameraRef = useRef(null);

  const search = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/hazmat-substances/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrResults(null);
    try {
      // Resize image to max 1024px to keep payload small
      const base64 = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl.split(",")[1]);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
      });

      // Send to OCR endpoint with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API}/api/hazmat-substances/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.substances && data.substances.length > 0) {
          const allResults = [];
          for (const name of data.substances.slice(0, 5)) {
            try {
              const sr = await fetch(`${API}/api/hazmat-substances/search?q=${encodeURIComponent(name)}`);
              if (sr.ok) {
                const matches = await sr.json();
                allResults.push({ searchedName: name, matches });
              }
            } catch { /* skip individual search errors */ }
          }
          setOcrResults(allResults);
        } else {
          setOcrResults([]);
        }
      } else {
        setOcrResults([]);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setOcrResults([]);
    }
    setOcrLoading(false);
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="substance-lookup">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="substance-lookup-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <Search className="w-4 h-4 text-[#002855]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">RQ & Marine Pollutant Lookup</p>
          <p className="text-[10px] text-[#94A3B8]">Appendix A (Reportable Quantity) & Appendix B (Marine Pollutant)</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          <InfoBox>
            <strong>What is this?</strong> Search <CfrLink r="172.101" label="Appendix A" /> to check if a material is a <strong>hazardous substance</strong> with a reportable quantity (RQ), and <CfrLink r="172.101" label="Appendix B" /> to check if it's a <strong>marine pollutant</strong>. Type a substance name to search.
          </InfoBox>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search by substance name (e.g., chlorine, benzene, aldrin)..."
              className="w-full pl-9 pr-12 py-2.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#002855] focus:ring-1 focus:ring-[#002855] outline-none"
              data-testid="substance-search-input"
            />
            {loading && <div className="absolute right-10 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#002855] border-t-transparent rounded-full animate-spin" />}
            {/* Camera button */}
            <button
              onClick={() => cameraRef.current?.click()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#002855] transition-colors"
              title="Scan shipping paper with camera"
              data-testid="substance-camera-btn"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <input ref={cameraRef} type="file" accept="image/*" className="hidden" onChange={handleCameraCapture} data-testid="substance-camera-input" />
          </div>
          <p className="text-[10px] text-[#64748B] italic">Search by substance name or tap the camera icon to scan a shipping paper.</p>

          {/* OCR Loading */}
          {ocrLoading && (
            <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
              <div className="w-4 h-4 border-2 border-[#002855] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-[11px] text-[#1E40AF]">Reading image... this may take a few seconds</span>
              <button onClick={() => { setOcrLoading(false); setOcrResults(null); }} className="ml-auto text-[10px] text-[#64748B] hover:text-[#002855]">Cancel</button>
            </div>
          )}

          {/* OCR Results */}
          {ocrResults !== null && !ocrLoading && (
            <div className="space-y-2">
              {ocrResults.length === 0 ? (
                <div className="text-center py-3 px-3 rounded-lg bg-[#FEF2F2] border border-red-200 text-[11px] text-red-600">
                  No substance names detected in the photo. Try again with a clearer image of the shipping paper.
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-[#F0FDF4] border border-green-200 px-3 py-2">
                    <p className="text-[10px] font-bold text-green-700">Found {ocrResults.reduce((a, r) => a + (r.matches?.length || 0), 0)} matches from {ocrResults.length} substance(s) detected:</p>
                  </div>
                  {ocrResults.map((ocrItem, oi) => (
                    <div key={oi}>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-1 mb-1">Detected: "{ocrItem.searchedName}"</p>
                      {ocrItem.matches && ocrItem.matches.length > 0 ? (
                        ocrItem.matches.slice(0, 3).map((r, i) => (
                          <div key={i} className="rounded-lg border bg-[#FAFBFC] p-3 mb-1.5" data-testid={`ocr-result-${oi}-${i}`}>
                            <p className="text-[12px] font-bold text-[#0F172A] mb-1.5">{r.name}</p>
                            <div className="flex flex-wrap gap-2">
                              {r.is_hazardous_substance ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#002855] text-white">
                                  <span className="text-[10px] font-bold">RQ: {r.rq_lbs?.toLocaleString()} lbs</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F1F5F9] text-[#94A3B8]">
                                  <span className="text-[10px]">Not a Hazardous Substance</span>
                                </div>
                              )}
                              {r.is_marine_pollutant ? (
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${r.is_severe_marine_pollutant ? "bg-red-500 text-white" : "bg-yellow-400 text-yellow-900"}`}>
                                  <span className="text-[10px] font-bold">{r.is_severe_marine_pollutant ? "Severe Marine Pollutant (PP)" : "Marine Pollutant"}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F1F5F9] text-[#94A3B8]">
                                  <span className="text-[10px]">Not a Marine Pollutant</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-[#94A3B8] italic px-1">No matches in Appendix A/B database</p>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setOcrResults(null)} className="text-[10px] text-[#94A3B8] hover:text-[#002855] transition-colors">Clear scan results</button>
                </>
              )}
            </div>
          )}

          {/* Results */}
          {results && results.length === 0 && query.length >= 2 && (
            <div className="text-center py-4 text-[11px] text-[#94A3B8]">
              No matches found for "{query}". Try a different name or spelling.
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border bg-[#FAFBFC] p-3" data-testid={`substance-result-${i}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[12px] font-bold text-[#0F172A]">{r.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* RQ Badge */}
                    {r.is_hazardous_substance ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#002855] text-white">
                        <span className="text-[10px] font-bold">RQ: {r.rq_lbs?.toLocaleString()} lbs</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F1F5F9] text-[#94A3B8]">
                        <span className="text-[10px]">Not a Hazardous Substance</span>
                      </div>
                    )}
                    {/* Marine Pollutant Badge */}
                    {r.is_marine_pollutant ? (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${r.is_severe_marine_pollutant ? "bg-red-500 text-white" : "bg-yellow-400 text-yellow-900"}`}>
                        <span className="text-[10px] font-bold">
                          {r.is_severe_marine_pollutant ? "Severe Marine Pollutant (PP)" : "Marine Pollutant"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F1F5F9] text-[#94A3B8]">
                        <span className="text-[10px]">Not a Marine Pollutant</span>
                      </div>
                    )}
                  </div>
                  {/* Explanation */}
                  {r.is_hazardous_substance && (
                    <p className="text-[10px] text-[#475569] mt-1.5 leading-relaxed">
                      If shipped in one package at or above <strong>{r.rq_lbs?.toLocaleString()} lbs</strong>, "RQ" must appear on the shipping paper per <CfrLink r="172.203(c)" />. Package must be marked "RQ" per <CfrLink r="172.324" />.
                    </p>
                  )}
                  {r.is_marine_pollutant && (
                    <p className="text-[10px] text-[#475569] mt-1 leading-relaxed">
                      {r.is_severe_marine_pollutant ? "Severe marine pollutant (PP) — " : ""}
                      Bulk packages require marine pollutant marking per <CfrLink r="172.322" />. Shipping paper must note "Marine Pollutant" per <CfrLink r="172.203(l)" />.
                    </p>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <p className="text-[9px] text-[#94A3B8] italic">Data from 49 CFR 172.101 Appendix A & B.</p>
                <StepLink step={2} label="Shipping Paper" onNavigate={onNavigate} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
