import { useState, useCallback } from "react";
import { ChevronDown, ExternalLink, Package, RotateCcw, HelpCircle, Truck } from "lucide-react";

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

/* ================================================================
   PACKAGE CLASSIFICATION HELPER
   ================================================================ */
export function PackageClassHelper() {
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
const MOT_QUESTIONS = [
  {
    id: "purpose",
    question: "Is the hazardous material carried for the direct support of a principal business (other than transportation)?",
    help: "Materials of Trade (MOT) are HM carried by employees for their work — not as the primary cargo. Examples: a pest control tech carrying pesticides, a plumber with propane for soldering, a pool company with chlorine, a farmer carrying small quantities of fertilizer. The HM must be needed for the person's primary job. Note: PIH (Poison Inhalation Hazard) materials, self-reactive materials, hazardous waste, and Class 7 (radioactive) are NEVER eligible for MOT.",
    yes: "quantity",
    no: "not_mot_purpose",
  },
  {
    id: "quantity",
    question: "Does the material meet the quantity limits?",
    help: null, // custom rendering
    helpType: "quantity_table",
    yes: "packaging",
    no: "not_mot_quantity",
  },
  {
    id: "packaging",
    question: "Is the material in a packaging authorized by the HMR (or a non-spec packaging per 173.6)?",
    help: "MOT packaging rules per 173.6(b): Packagings must be leak tight for liquids and gases, sift proof for solids, securely closed, secured against shifting, and protected against damage. Each material must be in the manufacturer's original packaging or one of equal or greater strength. For gasoline, the container must be metal or plastic conforming to the HMR or OSHA standards (29 CFR 1910.106). Cylinders must conform to all packaging, qualification, maintenance, and use requirements of the HMR.",
    yes: "is_mot",
    no: "not_mot_packaging",
  },
];

export function MaterialsOfTradeHelper() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState("purpose");

  const reset = useCallback(() => {
    setAnswers({});
    setCurrentQ("purpose");
  }, []);

  const answer = (qId, value) => {
    const q = MOT_QUESTIONS.find((x) => x.id === qId);
    const next = value ? q.yes : q.no;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    setCurrentQ(next);
  };

  // Find which questions have been answered to show the trail
  const trail = [];
  let walkId = "purpose";
  while (answers[walkId] !== undefined) {
    const q = MOT_QUESTIONS.find((x) => x.id === walkId);
    trail.push({ ...q, answer: answers[walkId] });
    walkId = answers[walkId] ? q.yes : q.no;
  }

  const isResult = currentQ.startsWith("not_mot") || currentQ === "is_mot";

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
            <strong>What is Materials of Trade?</strong> Under <CfrLink r="173.6" />, certain small quantities of HM carried by employees as tools of their trade are partially exempt from the HMR. If a shipment qualifies as MOT, it is <strong>exempt from</strong>: shipping papers, placarding, emergency response info, and HM training requirements. <strong>However</strong>, MOT materials must still be properly packaged and marked, and the vehicle must carry no more than the quantity limits.
          </InfoBox>

          {/* Answered questions trail */}
          {trail.map((t) => (
            <div key={t.id} className="space-y-1">
              <p className="text-[11px] font-bold text-[#64748B]">{t.question}</p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${t.answer ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {t.answer ? "Yes" : "No"}
              </div>
            </div>
          ))}

          {/* Current question */}
          {!isResult && (() => {
            const q = MOT_QUESTIONS.find((x) => x.id === currentQ);
            if (!q) return null;
            return (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#002855] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {q.question}
                </p>

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
                    <p className="mt-1.5 text-[9px]"><strong>NOT eligible for MOT:</strong> Poison Inhalation Hazard (PIH) materials, self-reactive materials, hazardous waste, or Class 7 (radioactive) — per 173.6(a)(5)/(a)(6).</p>
                    <p className="mt-1 text-[9px] italic">Aggregate gross weight of ALL MOT materials on one vehicle may not exceed <strong>440 lbs (200 kg)</strong> — per 173.6(d). Exception: Class 9 diluted mixtures per (a)(1)(iii) are excluded from this aggregate limit.</p>
                  </InfoBox>
                ) : q.help ? (
                  <InfoBox>{q.help}</InfoBox>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <OptionButton onClick={() => answer(currentQ, true)} testId={`mot-${currentQ}-yes`}>
                    <span className="font-semibold">Yes</span>
                  </OptionButton>
                  <OptionButton onClick={() => answer(currentQ, false)} testId={`mot-${currentQ}-no`}>
                    <span className="font-semibold">No</span>
                  </OptionButton>
                </div>
              </div>
            );
          })()}

          {/* RESULTS */}
          {currentQ === "is_mot" && (
            <ResultBox title="This likely qualifies as Materials of Trade (MOT)" compliant={true}>
              <p>Based on your answers, this shipment appears to meet the <CfrLink r="173.6" /> criteria for Materials of Trade.</p>
              <p><strong>What is EXEMPT for MOT:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Shipping papers — <CfrLink r="172.200" label="Subpart C" /></li>
                <li>Placarding — <CfrLink r="172.500" label="Subpart F" /></li>
                <li>Emergency response information — <CfrLink r="172.600" label="Subpart G" /></li>
                <li>HM employee training — <CfrLink r="172.700" label="Subpart H" /></li>
              </ul>
              <p><strong>What STILL applies to MOT — per <CfrLink r="173.6" />:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Packaging</strong> must be leak tight (liquids/gases), sift proof (solids), securely closed, and protected from damage — <CfrLink r="173.6(b)" /></li>
                <li><strong>Non-bulk packages</strong> (other than cylinders) must be marked with common name or proper shipping name, plus "RQ" if a reportable quantity — <CfrLink r="173.6(c)" /></li>
                <li><strong>DOT spec cylinders</strong> (except DOT-39) must be marked and labeled as prescribed by the HMR — <CfrLink r="173.6(c)" /></li>
                <li><strong>Gasoline</strong> containers must be metal or plastic conforming to HMR or OSHA 29 CFR 1910.106 — <CfrLink r="173.6(b)" /></li>
                <li><strong>Driver must be informed</strong> of the presence of the HM and the requirements of 173.6 — <CfrLink r="173.6(c)" /></li>
                <li>Aggregate gross weight of ALL MOT on the vehicle: <strong>max 440 lbs (200 kg)</strong> — <CfrLink r="173.6(d)" /></li>
              </ul>
              <InfoBox color="green">
                <strong>Common MOT scenarios:</strong> Pest control (pesticides/fumigants in small containers), HVAC/plumbing (propane/acetylene cylinders), pool service (chlorine), agriculture (small quantities of fertilizer/pesticide), painting (flammable paints/solvents), cleaning services (corrosive cleaners).
              </InfoBox>
              <InfoBox color="amber">
                <strong>Even when MOT applies, still check:</strong> Is the packaging intact and not leaking? Is the package marked with a common name or proper shipping name? Are cylinders properly marked/labeled? Does the total MOT weight stay under 440 lbs? Are any PIH, self-reactive, or hazardous waste materials mixed in (which would NOT qualify)?
              </InfoBox>
            </ResultBox>
          )}

          {currentQ === "not_mot_purpose" && (
            <ResultBox title="Does NOT qualify as Materials of Trade" compliant={false}>
              <p>The material must be carried for the <strong>direct support of a principal business other than transportation</strong>. If the primary purpose is to transport the HM as cargo (e.g., a delivery), the MOT exception does not apply.</p>
              <InfoBox color="amber">
                <strong>Key distinction:</strong> A plumber carrying a propane torch to a job site = MOT. A propane delivery company delivering cylinders to customers = NOT MOT (transportation IS the principal business).
              </InfoBox>
              <p>This shipment must comply with all applicable HMR requirements. However, <strong>check these other exceptions</strong> that may still reduce requirements:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li><strong>Limited Quantity</strong> — Column 8A of 172.101 and <CfrLink r="172.315" /></li>
                <li><strong>Small Quantity</strong> — <CfrLink r="173.4" /></li>
                <li><strong>Agricultural operations</strong> — <CfrLink r="173.5" /></li>
                <li><strong>Consumer Commodity</strong> — <CfrLink r="173.150" /></li>
              </ul>
            </ResultBox>
          )}

          {currentQ === "not_mot_quantity" && (
            <ResultBox title="Does NOT qualify — exceeds quantity limits" compliant={false}>
              <p>The quantity of material exceeds the per-package limits in <CfrLink r="173.6(a)" />, or the total aggregate gross weight of all MOT materials on the vehicle exceeds <strong>440 lbs (200 kg)</strong> per <CfrLink r="173.6(d)" />.</p>
              <p>This shipment must comply with all applicable HMR requirements. However, <strong>check these other exceptions</strong> that allow larger quantities with reduced requirements:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li><strong>Limited Quantity</strong> — higher quantity thresholds, reduced marking/labeling/placarding — Column 8A of <CfrLink r="172.101" /> and <CfrLink r="173.150" /> through <CfrLink r="173.155" /></li>
                <li><strong>Agricultural operations</strong> — special exceptions for farm materials — <CfrLink r="173.5" /></li>
                <li><strong>Non-spec intrastate</strong> — some intrastate packagings may qualify — <CfrLink r="173.8" /></li>
              </ul>
            </ResultBox>
          )}

          {currentQ === "not_mot_packaging" && (
            <ResultBox title="Does NOT qualify — packaging issue" compliant={false}>
              <p>MOT materials must be in packaging that is authorized by the HMR for that specific material, or a non-bulk package that is: properly closed, secured against movement, protected from damage, and does not leak under normal transport conditions.</p>
              <p>Correct the packaging issue before transport, or comply with full HMR requirements.</p>
              <InfoBox color="amber">
                <strong>Check for packaging exceptions:</strong> Even if MOT doesn't apply, the material may qualify for reduced packaging under <strong>Limited Quantity</strong> (Column 8A of <CfrLink r="172.101" />) or <strong>non-spec intrastate</strong> (<CfrLink r="173.8" />). Also check Column 7 special provisions (<CfrLink r="172.102" />) for material-specific packaging alternatives.
              </InfoBox>
            </ResultBox>
          )}

          {/* Reset */}
          {Object.keys(answers).length > 0 && (
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

export function SegregationTable() {
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
      detail: "Segregation between different Class 1 (explosive) divisions and compatibility groups is governed by the separate compatibility table in 177.848(f), not this segregation table.",
      action: "Check the explosives compatibility groups (letters A through S on the shipping paper) and refer to 177.848(f) for specific rules.",
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

              {/* Ref */}
              <p className="text-[10px] text-[#94A3B8]">Per <CfrLink r="177.848" /> segregation table</p>
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
