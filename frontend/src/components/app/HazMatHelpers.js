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
    help: "Materials of Trade (MOT) are HM carried by employees for their work — not as the primary cargo. Examples: a pest control tech carrying pesticides, a plumber with propane for soldering, a pool company with chlorine, a farmer with fuel. The HM must be needed for the person's primary job.",
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
    help: "MOT packaging rules (173.6(b)): The material must be contained in a package authorized by the HMR for that material, OR in a non-bulk packaging that is: closed, secured against movement, protected from damage, and does not leak under normal transport conditions. Inner packagings must be closed and cushioned to prevent breakage. Packaging must be marked with the common name or proper shipping name.",
    yes: "vehicle",
    no: "not_mot_packaging",
  },
  {
    id: "vehicle",
    question: "Is the material being transported by a motor vehicle (not rail, air, or vessel)?",
    help: "The MOT exception under 173.6 applies ONLY to highway transportation. Materials of trade transported by rail, aircraft, or vessel must comply with the full HMR.",
    yes: "is_mot",
    no: "not_mot_mode",
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
                    <strong>MOT Quantity Limits per vehicle</strong> — <CfrLink r="173.6(a)" />:
                    <table className="w-full mt-1.5 text-[10px]">
                      <thead>
                        <tr className="border-b border-amber-300/50">
                          <th className="text-left py-1 font-bold">Material Type</th>
                          <th className="text-right py-1 font-bold">Per Package</th>
                          <th className="text-right py-1 font-bold">Per Vehicle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-200/30">
                        <tr><td className="py-1">Division 2.1 or 2.2 gases</td><td className="text-right">200 lbs gross</td><td className="text-right" rowSpan={5}>See Note</td></tr>
                        <tr><td className="py-1">Div 6.1 PG III, Class 8 PG III, Class 9, ORM-D</td><td className="text-right">No limit*</td></tr>
                        <tr><td className="py-1">Other HM (e.g., flammable liquids, PG I/II poisons)</td><td className="text-right">≤ 0.5 L or 0.5 kg (net)</td></tr>
                        <tr><td className="py-1">Div 2.3 Zone C/D, Div 6.1 PG I/II</td><td className="text-right">≤ 1 mL or 1 g (net)</td></tr>
                        <tr><td className="py-1">Diesel fuel / fuel oil in non-bulk tanks</td><td className="text-right">≤ 119 gal per tank</td></tr>
                      </tbody>
                    </table>
                    <p className="mt-1 text-[9px] italic">* For Div 6.1 PG III / Class 8 PG III / Class 9 / ORM-D, the limit is based on what is appropriate for the direct support of the business. Total aggregate gross weight of all MOT materials on the vehicle may not exceed <strong>440 lbs</strong> (200 kg).</p>
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
                <li>HM employee training — <CfrLink r="172.704" /></li>
              </ul>
              <p><strong>What STILL applies to MOT:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Package must be marked</strong> with common name or proper shipping name of the HM — <CfrLink r="173.6(b)(5)" /></li>
                <li><strong>Cylinders</strong> must be properly labeled or marked per CGA — <CfrLink r="173.6(b)(4)" /></li>
                <li>Package closures must be secure, no leakage, protected from damage</li>
                <li>Aggregate gross weight of ALL MOT on the vehicle: <strong>max 440 lbs (200 kg)</strong></li>
                <li>The outer packaging must be marked <strong>"MATERIALS OF TRADE"</strong> or the abbreviation <strong>"MOT"</strong> when transported on a vehicle that does not need to be placarded</li>
              </ul>
              <InfoBox color="green">
                <strong>Common MOT scenarios:</strong> Pest control (pesticides/fumigants in small containers), HVAC/plumbing (propane/acetylene cylinders), pool service (chlorine), agriculture (small quantities of fertilizer/pesticide), painting (flammable paints/solvents), cleaning services (corrosive cleaners).
              </InfoBox>
            </ResultBox>
          )}

          {currentQ === "not_mot_purpose" && (
            <ResultBox title="Does NOT qualify as Materials of Trade" compliant={false}>
              <p>The material must be carried for the <strong>direct support of a principal business other than transportation</strong>. If the primary purpose is to transport the HM as cargo (e.g., a delivery), the MOT exception does not apply.</p>
              <InfoBox color="amber">
                <strong>Key distinction:</strong> A plumber carrying a propane torch to a job site = MOT. A propane delivery company delivering cylinders to customers = NOT MOT (transportation IS the principal business).
              </InfoBox>
              <p>This shipment must comply with all applicable HMR requirements including shipping papers, placarding, labeling, marking, and packaging.</p>
            </ResultBox>
          )}

          {currentQ === "not_mot_quantity" && (
            <ResultBox title="Does NOT qualify — exceeds quantity limits" compliant={false}>
              <p>The quantity of material exceeds the limits allowed under <CfrLink r="173.6(a)" /> for Materials of Trade.</p>
              <p>The total aggregate gross weight of all MOT on one vehicle may not exceed <strong>440 lbs (200 kg)</strong>. Individual package limits also apply per material type.</p>
              <p>This shipment must comply with all applicable HMR requirements. Consider whether a <strong>Limited Quantity</strong> exception (<CfrLink r="173.150" /> through <CfrLink r="173.156" />) might apply instead.</p>
            </ResultBox>
          )}

          {currentQ === "not_mot_packaging" && (
            <ResultBox title="Does NOT qualify — packaging issue" compliant={false}>
              <p>MOT materials must be in packaging that is authorized by the HMR for that specific material, or in a non-bulk package that is: properly closed, secured against movement, protected from damage, and does not leak under normal transport conditions.</p>
              <p>Correct the packaging issue before transport, or comply with full HMR requirements.</p>
            </ResultBox>
          )}

          {currentQ === "not_mot_mode" && (
            <ResultBox title="Does NOT qualify — transport mode" compliant={false}>
              <p>The <CfrLink r="173.6" /> MOT exception applies <strong>only to highway transportation</strong>. Materials transported by aircraft, rail, or vessel must comply with the full HMR for that mode, even if quantities are small.</p>
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
