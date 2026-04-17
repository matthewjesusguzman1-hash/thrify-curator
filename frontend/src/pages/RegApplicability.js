import { useState, useCallback } from "react";
import { ChevronLeft, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const CFR_PARTS = [
  { part: "382", title: "Controlled Substances and Alcohol Use and Testing" },
  { part: "385", title: "Safety Fitness Procedures" },
  { part: "386", title: "Rules of Practice for FMCSA Proceedings" },
  { part: "387", title: "Minimum Levels of Financial Responsibility" },
  { part: "390", title: "Federal Motor Carrier Safety Regulations; General" },
  { part: "391", title: "Qualifications of Drivers and LCV Driver Instructors" },
  { part: "392", title: "Driving of Commercial Motor Vehicles" },
  { part: "393", title: "Parts and Accessories Necessary for Safe Operation" },
  { part: "395", title: "Hours of Service of Drivers" },
  { part: "396", title: "Inspection, Repair, and Maintenance" },
  { part: "397", title: "Transportation of Hazardous Materials; Driving and Parking Rules" },
  { part: "398", title: "Transportation of Migrant Workers" },
];

function getResults(answers) {
  const { tripType, vehicleType, cdlRequired, farmWeight, preCdl, agSeason } = answers;

  // Interstate — all federal rules apply as written
  if (tripType === "interstate") {
    return CFR_PARTS.map(p => ({ ...p, status: "applies", note: "Interstate commerce — full federal regulations apply" }));
  }

  // Intrastate — check if statute applies at all
  // 75-363(2)(b) thresholds
  const meetsThreshold =
    vehicleType === "cmv_over_10k" ||
    vehicleType === "passenger_hire" ||
    vehicleType === "passenger_nothire" ||
    vehicleType === "placarded_hm" ||
    cdlRequired === "yes" ||
    vehicleType === "farm_truck" ||
    vehicleType === "covered_farm" ||
    vehicleType === "ag_chemical";

  if (!meetsThreshold && vehicleType === "other_under_10k") {
    return CFR_PARTS.map(p => ({
      ...p,
      status: "does_not_apply",
      note: "Vehicle does not meet any threshold in 75-363(2)(b) — under 10,000 lbs, no CDL required, not carrying passengers or placarded HazMat"
    }));
  }

  // Farm truck ≤16 tons — exempt from ALL
  if (vehicleType === "farm_truck" && farmWeight === "16_or_less") {
    return CFR_PARTS.map(p => ({
      ...p,
      status: "does_not_apply",
      note: "75-363(5): Farm truck registered under §60-3,146 with gross weight ≤16 tons — all adopted regulations exempt"
    }));
  }

  // Start with everything applying, then carve out exceptions
  const results = CFR_PARTS.map(p => ({ ...p, status: "applies", note: "Adopted under 75-363(3)", notes: [] }));
  const find = (part) => results.find(r => r.part === part);

  // Farm truck >16 tons intrastate
  if (vehicleType === "farm_truck" && farmWeight === "over_16") {
    const p391 = find("391");
    p391.status = "does_not_apply";
    p391.note = "75-363(5)(a): Farm truck drivers (intrastate, registered under §60-3,146) — all of Part 391 exempt";

    const p395 = find("395");
    p395.notes.push("75-363(5)(b): §395.8 (records of duty status) does not apply to farm truck drivers");

    const p396 = find("396");
    p396.notes.push("75-363(5)(c): §396.11 (driver vehicle condition report) does not apply to farm truck drivers");

    const p390 = find("390");
    p390.notes.push("75-363(11): §390.21 (CMV marking) does not apply to farm trucks operated solely in intrastate commerce");
  }

  // Covered farm vehicle
  if (vehicleType === "covered_farm") {
    find("382").status = "does_not_apply";
    find("382").note = "75-363(6)(a): Covered farm vehicles — Part 382 exempt";

    const p391 = find("391");
    p391.notes.push("75-363(6)(b): Covered farm vehicles — Part 391 Subpart E (Physical Qualifications) exempt");

    find("395").status = "does_not_apply";
    find("395").note = "75-363(6)(c): Covered farm vehicles — Part 395 exempt";

    find("396").status = "does_not_apply";
    find("396").note = "75-363(6)(d): Covered farm vehicles — Part 396 exempt";
  }

  // Ag chemical/fertilizer equipment ≤3,500 gal
  if (vehicleType === "ag_chemical") {
    find("393").status = "does_not_apply";
    find("393").note = "75-363(7): Fertilizer/ag chemical equipment ≤3,500 gallons — Part 393 exempt";

    find("396").status = "does_not_apply";
    find("396").note = "75-363(7): Fertilizer/ag chemical equipment ≤3,500 gallons — Part 396 exempt";
  }

  // Pre-1996 CDL holder intrastate
  if (preCdl === "yes") {
    const p391 = find("391");
    p391.notes.push("75-363(4): CDL held prior to July 30, 1996 (intrastate only) — Part 391 Subpart E (Physical Qualifications) exempt");
  }

  // Intrastate HOS modifications
  if (vehicleType !== "covered_farm") {
    const p395 = find("395");
    if (p395.status === "applies") {
      if (agSeason === "yes") {
        p395.status = "does_not_apply";
        p395.note = "75-363(10): Transporting ag commodities/farm supplies during planting and harvesting season within 150 air miles — Part 395 exempt";
      } else {
        p395.status = "modified";
        p395.note = "75-363(9): Intrastate HOS — 12 hrs driving / 16 hrs on-duty (after 10 consecutive off); 70 hrs in 7 days or 80 hrs in 8 days";
      }
    }
  }

  // 392.9a does not apply intrastate
  const p392 = find("392");
  p392.notes.push("75-363(12): §392.9a (Operating Authority) does not apply to NE intrastate-only carriers");

  // Consolidate notes into note field
  for (const r of results) {
    if (r.notes && r.notes.length > 0) {
      if (r.status === "applies") r.status = "partial";
      r.note = (r.note ? r.note + ". " : "") + r.notes.join(". ");
    }
    delete r.notes;
  }

  return results;
}

const QUESTIONS = [
  {
    id: "tripType",
    question: "Is the carrier operating in interstate or intrastate commerce?",
    options: [
      { value: "interstate", label: "Interstate" },
      { value: "intrastate", label: "Intrastate (within Nebraska)" },
    ],
  },
  {
    id: "vehicleType",
    question: "What type of vehicle?",
    condition: (a) => a.tripType === "intrastate",
    options: [
      { value: "cmv_over_10k", label: "CMV over 10,000 lbs (GVW/GVWR/GCW/GCWR)" },
      { value: "passenger_hire", label: "9-15 passengers including driver (for compensation)" },
      { value: "passenger_nothire", label: "16+ passengers including driver (not for compensation)" },
      { value: "placarded_hm", label: "Transporting placarded hazardous materials" },
      { value: "farm_truck", label: "Farm truck (registered under §60-3,146)" },
      { value: "covered_farm", label: "Covered farm vehicle" },
      { value: "ag_chemical", label: "Fertilizer/ag chemical equipment (≤3,500 gallons)" },
      { value: "other_under_10k", label: "Other vehicle under 10,000 lbs" },
    ],
  },
  {
    id: "cdlRequired",
    question: "Does the driver need a CDL to operate this vehicle?",
    condition: (a) => a.tripType === "intrastate" && a.vehicleType === "other_under_10k",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "farmWeight",
    question: "What is the registered gross weight of the farm truck?",
    condition: (a) => a.vehicleType === "farm_truck",
    options: [
      { value: "16_or_less", label: "16 tons or less" },
      { value: "over_16", label: "Over 16 tons" },
    ],
  },
  {
    id: "preCdl",
    question: "Did the driver hold a Nebraska CDL prior to July 30, 1996?",
    condition: (a) => a.tripType === "intrastate" && a.vehicleType !== "other_under_10k" && a.vehicleType !== "farm_truck" && a.vehicleType !== "ag_chemical",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "agSeason",
    question: "Is this driver transporting ag commodities or farm supplies during planting/harvesting season within 150 air miles?",
    condition: (a) => a.tripType === "intrastate" && a.vehicleType !== "covered_farm" && a.vehicleType !== "other_under_10k" && !(a.vehicleType === "farm_truck" && a.farmWeight === "16_or_less"),
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
];

const STATUS_STYLES = {
  applies: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-600 text-white", label: "APPLIES" },
  modified: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", badge: "bg-amber-500 text-white", label: "MODIFIED" },
  partial: { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", badge: "bg-blue-500 text-white", label: "PARTIAL EXCEPTIONS" },
  does_not_apply: { bg: "bg-[#F8FAFC] border-[#E2E8F0]", text: "text-[#94A3B8]", badge: "bg-[#94A3B8] text-white", label: "DOES NOT APPLY" },
};

export default function RegApplicability() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});

  const setAnswer = useCallback((id, value) => {
    setAnswers(prev => {
      const next = { ...prev, [id]: value };
      // Clear downstream answers when a parent changes
      const qIds = QUESTIONS.map(q => q.id);
      const idx = qIds.indexOf(id);
      for (let i = idx + 1; i < qIds.length; i++) delete next[qIds[i]];
      return next;
    });
  }, []);

  const reset = () => setAnswers({});

  // Determine which questions to show
  const visibleQuestions = QUESTIONS.filter(q => !q.condition || q.condition(answers));

  // Check if we have enough answers for results
  const allAnswered = visibleQuestions.every(q => answers[q.id] !== undefined);
  const results = allAnswered ? getResults(answers) : null;

  return (
    <div className="min-h-screen bg-[#0B1729]" data-testid="reg-applicability">
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#D4AF37]/20 px-3 py-2">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white p-1" data-testid="back-btn">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Regulation Applicability</h1>
              <p className="text-[10px] text-white/50">NRS 75-363 — What regulations apply?</p>
            </div>
          </div>
          {Object.keys(answers).length > 0 && (
            <Button onClick={reset} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-3 text-xs">
              Start Over
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-4 pb-24 space-y-3">
        {/* Questions */}
        {visibleQuestions.map((q) => (
          <div key={q.id} className="bg-white rounded-xl border p-4 space-y-2.5" data-testid={`q-${q.id}`}>
            <p className="text-[12px] font-semibold text-[#0F172A]">{q.question}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAnswer(q.id, opt.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border-2 text-[11px] transition-all ${
                    answers[q.id] === opt.value
                      ? "border-[#002855] bg-[#002855] text-white font-bold"
                      : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#002855]/50"
                  }`}
                  data-testid={`opt-${q.id}-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Results */}
        {results && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 pb-1">
              <Scale className="w-4 h-4 text-[#D4AF37]" />
              <p className="text-[12px] font-bold text-white">Applicable Regulations — 49 CFR Parts Adopted by NRS 75-363</p>
            </div>

            {/* OOS notice — always applies */}
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-3">
              <p className="text-[11px] font-bold text-red-800">Out-of-Service Orders — Always Applies</p>
              <p className="text-[10px] text-red-700 mt-0.5">No carrier shall permit or require a CMV driver to violate any out-of-service order. No driver shall violate any out-of-service order. — 75-363(13)</p>
            </div>

            {results.map((r) => {
              const style = STATUS_STYLES[r.status];
              return (
                <div key={r.part} className={`rounded-xl border p-3 ${style.bg}`} data-testid={`result-part-${r.part}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[13px] font-black ${r.status === "does_not_apply" ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>Part {r.part}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${r.status === "does_not_apply" ? "text-[#94A3B8]" : "text-[#475569]"}`}>{r.title}</p>
                    </div>
                  </div>
                  <p className={`text-[10px] mt-1.5 leading-relaxed ${style.text}`}>{r.note}</p>
                </div>
              );
            })}

            <p className="text-[9px] text-white/30 italic text-center pt-2">Based on Nebraska Revised Statute 75-363. Operative June 5, 2025.</p>
          </div>
        )}
      </div>
    </div>
  );
}
