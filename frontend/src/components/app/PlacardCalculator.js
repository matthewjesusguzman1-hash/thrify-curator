import { useState, useCallback } from "react";
import { ChevronDown, ExternalLink, Plus, Trash2, Calculator } from "lucide-react";

/* Shared helpers (duplicated minimally to keep this self-contained) */
function CfrLink({ r, label }) {
  const clean = r.replace(/\(.*\)/g, "").replace(/[*X]/g, "").trim();
  const parts = clean.split(".");
  let url;
  if (parts.length >= 2 && parts[1].length > 0) url = `https://www.ecfr.gov/current/title-49/section-${parts[0]}.${parts[1]}`;
  else if (parts.length >= 1 && /^\d+$/.test(parts[0])) url = `https://www.ecfr.gov/current/title-49/part-${parts[0]}`;
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#002855] hover:text-[#D4AF37] hover:underline transition-colors">
      {label || r}<ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-50" />
    </a>
  ) : <span className="text-[10px] font-mono text-[#94A3B8]">{label || r}</span>;
}

/* ================================================================
   HAZARD CLASS DEFINITIONS
   ================================================================ */
const HAZARD_CLASSES = [
  { value: "1.1", label: "Div 1.1 — Explosives (mass explosion)", table: 1 },
  { value: "1.2", label: "Div 1.2 — Explosives (projection)", table: 1 },
  { value: "1.3", label: "Div 1.3 — Explosives (fire/minor blast)", table: 1 },
  { value: "1.4", label: "Div 1.4 — Explosives (minor)", table: 2 },
  { value: "1.5", label: "Div 1.5 — Very insensitive explosives", table: 2 },
  { value: "1.6", label: "Div 1.6 — Extremely insensitive explosives", table: 2 },
  { value: "2.1", label: "Div 2.1 — Flammable Gas", table: 2 },
  { value: "2.2", label: "Div 2.2 — Non-flammable Gas", table: 2 },
  { value: "2.3", label: "Div 2.3 — Poison Gas", table: 1 },
  { value: "3", label: "Class 3 — Flammable Liquid", table: 2 },
  { value: "combustible", label: "Combustible Liquid", table: 2 },
  { value: "4.1", label: "Div 4.1 — Flammable Solid", table: 2 },
  { value: "4.2", label: "Div 4.2 — Spontaneously Combustible", table: 2 },
  { value: "4.3", label: "Div 4.3 — Dangerous When Wet", table: 1 },
  { value: "5.1", label: "Div 5.1 — Oxidizer", table: 2 },
  { value: "5.2", label: "Div 5.2 — Organic Peroxide", table: 1, note: "Type B, liquid/solid, temp controlled" },
  { value: "6.1-pih", label: "Div 6.1 — Poison Inhalation Hazard (PIH)", table: 1 },
  { value: "6.1", label: "Div 6.1 — Toxic (other than PIH)", table: 2 },
  { value: "7", label: "Class 7 — Radioactive (Yellow III label)", table: 1 },
  { value: "8", label: "Class 8 — Corrosive", table: 2 },
  { value: "9", label: "Class 9 — Miscellaneous", table: 2 },
];

/* Placard names by class */
const PLACARD_NAMES = {
  "1.1": "EXPLOSIVES 1.1", "1.2": "EXPLOSIVES 1.2", "1.3": "EXPLOSIVES 1.3",
  "1.4": "EXPLOSIVES 1.4", "1.5": "EXPLOSIVES 1.5", "1.6": "EXPLOSIVES 1.6",
  "2.1": "FLAMMABLE GAS", "2.2": "NON-FLAMMABLE GAS", "2.3": "POISON GAS",
  "3": "FLAMMABLE", "combustible": "COMBUSTIBLE",
  "4.1": "FLAMMABLE SOLID", "4.2": "SPONTANEOUSLY COMBUSTIBLE", "4.3": "DANGEROUS WHEN WET",
  "5.1": "OXIDIZER", "5.2": "ORGANIC PEROXIDE",
  "6.1-pih": "POISON INHALATION HAZARD", "6.1": "POISON",
  "7": "RADIOACTIVE", "8": "CORROSIVE", "9": "CLASS 9",
};

const PLACARD_COLORS = {
  "1.1": "bg-orange-500", "1.2": "bg-orange-500", "1.3": "bg-orange-500",
  "1.4": "bg-orange-400", "1.5": "bg-orange-400", "1.6": "bg-orange-400",
  "2.1": "bg-red-500", "2.2": "bg-green-600", "2.3": "bg-white border border-gray-400",
  "3": "bg-red-500", "combustible": "bg-red-500",
  "4.1": "bg-red-500", "4.2": "bg-red-500", "4.3": "bg-blue-600",
  "5.1": "bg-yellow-400", "5.2": "bg-yellow-400",
  "6.1-pih": "bg-white border border-gray-400", "6.1": "bg-white border border-gray-400",
  "7": "bg-yellow-300", "8": "bg-white border border-gray-400", "9": "bg-white border border-gray-400",
};

/* ================================================================
   EXCEPTIONS (172.504(f))
   ================================================================ */
const EXCEPTIONS = [
  { id: 1, text: "Div 1.4 Compatibility Group S explosives are excepted from placarding.", applies: ["1.4"] },
  { id: 2, text: "A FLAMMABLE placard is not required on a transport vehicle or freight container required to display a FUEL OIL placard.", applies: ["3"] },
  { id: 3, text: "A NON-FLAMMABLE GAS placard is not required on a nurse tank meeting 173.315(m).", applies: ["2.2"] },
  { id: 4, text: "A OXIDIZER placard is not required for Div 5.1 materials on a vehicle that also displays a FLAMMABLE placard.", applies: ["5.1"] },
  { id: 5, text: "The POISON INHALATION HAZARD placard is not required if POISON GAS placard is displayed.", applies: ["6.1-pih"] },
  { id: 6, text: "COMBUSTIBLE placard is not required for a combustible liquid in a non-bulk packaging.", applies: ["combustible"] },
  { id: 7, text: "COMBUSTIBLE placard is not required on a fuel oil cargo tank (marked 'Fuel Oil' or placarded per 172.544(c)).", applies: ["combustible"] },
  { id: 8, text: "A POISON placard is not required if the vehicle also displays a POISON INHALATION HAZARD or POISON GAS placard.", applies: ["6.1"] },
  { id: 9, text: "For Class 9, a CLASS 9 placard is NOT required for domestic transportation. However, bulk packaging must still display the ID number on a CLASS 9 placard, orange panel, or white square-on-point configuration.", applies: ["9"] },
  { id: 10, text: "Certain limited quantity and excepted quantity shipments are excepted from placarding.", applies: [] },
  { id: 11, text: "The DANGEROUS placard may replace individual Table 2 placards when 2+ Table 2 categories are present in non-bulk packages and no single category exceeds 2,205 lbs from one facility.", applies: [] },
];

/* ================================================================
   PLACARD CALCULATOR COMPONENT
   ================================================================ */
export function PlacardCalculator({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const addMaterial = useCallback(() => {
    setMaterials(prev => [...prev, { id: Date.now(), classValue: "", weight: "", isBulk: false }]);
    setShowResults(false);
  }, []);

  const removeMaterial = useCallback((id) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    setShowResults(false);
  }, []);

  const updateMaterial = useCallback((id, field, value) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setShowResults(false);
  }, []);

  const reset = useCallback(() => {
    setMaterials([]);
    setShowResults(false);
  }, []);

  const calculate = useCallback(() => {
    setShowResults(true);
  }, []);

  /* Compute results */
  const results = (() => {
    if (!showResults || materials.length === 0) return null;

    const requiredPlacards = new Map(); // classValue -> { name, reason, color }
    const warnings = [];
    const exceptions = [];
    let hasBulk = false;
    let hasTable1 = false;
    let table2Weight = 0;
    const table2Classes = new Map(); // classValue -> total weight
    let needsEndorsement = false;

    for (const mat of materials) {
      if (!mat.classValue) continue;
      const classDef = HAZARD_CLASSES.find(c => c.value === mat.classValue);
      if (!classDef) continue;
      const weight = parseFloat(mat.weight) || 0;

      if (mat.isBulk) hasBulk = true;

      if (classDef.table === 1) {
        hasTable1 = true;
        needsEndorsement = true;
        requiredPlacards.set(mat.classValue, {
          name: PLACARD_NAMES[mat.classValue],
          reason: "Table 1 — required in ANY quantity",
          color: PLACARD_COLORS[mat.classValue],
        });
      } else {
        // Table 2
        table2Weight += weight;
        table2Classes.set(mat.classValue, (table2Classes.get(mat.classValue) || 0) + weight);

        if (mat.isBulk) {
          needsEndorsement = true;
          requiredPlacards.set(mat.classValue, {
            name: PLACARD_NAMES[mat.classValue],
            reason: "Bulk packaging — placard required regardless of weight",
            color: PLACARD_COLORS[mat.classValue],
          });
        }
      }
    }

    // Table 2 threshold check
    if (table2Weight >= 1001) {
      needsEndorsement = true;
      for (const [cv] of table2Classes) {
        if (!requiredPlacards.has(cv)) {
          requiredPlacards.set(cv, {
            name: PLACARD_NAMES[cv],
            reason: `Table 2 — aggregate weight ${Math.round(table2Weight).toLocaleString()} lbs meets/exceeds 1,001 lbs`,
            color: PLACARD_COLORS[cv],
          });
        }
      }
    }

    // Apply exceptions
    // Class 9 domestic exception
    if (requiredPlacards.has("9")) {
      const mat9 = materials.find(m => m.classValue === "9");
      const isBulk9 = mat9 && mat9.isBulk;
      if (!isBulk9) {
        exceptions.push("Class 9: CLASS 9 placard is NOT required for domestic transportation per 172.504(f)(9). Bulk packaging must still display ID number.");
        requiredPlacards.delete("9");
      } else {
        warnings.push("Class 9 bulk: ID number must be displayed on CLASS 9 placard, orange panel, or white square-on-point per 172.504(f)(9).");
      }
    }

    // DANGEROUS placard substitution check
    const table2PlacardsNeeded = [...requiredPlacards.entries()].filter(([cv]) => {
      const def = HAZARD_CLASSES.find(c => c.value === cv);
      return def && def.table === 2;
    });
    const allTable2NonBulk = materials.filter(m => {
      const def = HAZARD_CLASSES.find(c => c.value === m.classValue);
      return def && def.table === 2;
    }).every(m => !m.isBulk);

    if (table2PlacardsNeeded.length >= 2 && allTable2NonBulk) {
      // Check if any single class exceeds 2,205 lbs
      let over2205 = false;
      const specificRequired = [];
      for (const [cv, w] of table2Classes) {
        if (w >= 2205) {
          over2205 = true;
          specificRequired.push(cv);
        }
      }
      if (over2205) {
        warnings.push(`DANGEROUS placard may be used for Table 2 classes under 2,205 lbs, but specific placards required for: ${specificRequired.map(cv => PLACARD_NAMES[cv]).join(", ")} (over 2,205 lbs from one facility per 172.504(b)).`);
      } else {
        warnings.push("DANGEROUS placard option: May replace all individual Table 2 placards since 2+ Table 2 categories are present, all in non-bulk, and none exceed 2,205 lbs from one facility (172.504(b)).");
      }
    }

    // Table 2 under threshold
    if (table2Weight > 0 && table2Weight < 1001 && !hasBulk && table2Classes.size > 0) {
      const nonBulkTable2Only = [...table2Classes.keys()].every(cv => !requiredPlacards.has(cv));
      if (nonBulkTable2Only) {
        warnings.push(`Table 2 aggregate weight is ${Math.round(table2Weight).toLocaleString()} lbs — under the 1,001 lb threshold. Placards NOT required for Table 2 materials (but all other HMR requirements still apply).`);
      }
    }

    const placardList = [...requiredPlacards.entries()].map(([cv, info]) => ({ classValue: cv, ...info }));

    return {
      placards: placardList,
      warnings,
      exceptions,
      needsEndorsement,
      totalMaterials: materials.filter(m => m.classValue).length,
      table2Aggregate: Math.round(table2Weight),
    };
  })();

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="placard-calculator">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="placard-calculator-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <Calculator className="w-4 h-4 text-[#002855]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">Placard Calculator</p>
          <p className="text-[10px] text-[#94A3B8]">Input your load — get required placards</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-[11px] leading-relaxed text-[#1E40AF]">
            Add each hazardous material on the vehicle with its hazard class and gross weight. The calculator will determine required placards per <CfrLink r="172.504" />.
          </div>

          {/* Material entries */}
          {materials.map((mat, idx) => (
            <div key={mat.id} className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFC] p-3 space-y-2" data-testid={`material-entry-${idx}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Material {idx + 1}</span>
                <button onClick={() => removeMaterial(mat.id)} className="text-[#94A3B8] hover:text-red-500 transition-colors" data-testid={`remove-material-${idx}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <select
                value={mat.classValue}
                onChange={(e) => updateMaterial(mat.id, "classValue", e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0F172A] bg-white focus:border-[#002855] focus:ring-1 focus:ring-[#002855] outline-none"
                data-testid={`material-class-${idx}`}
              >
                <option value="">Select hazard class/division...</option>
                {HAZARD_CLASSES.map(c => (
                  <option key={c.value} value={c.value}>{c.label} {c.note ? `(${c.note})` : ""} — Table {c.table}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={mat.weight}
                    onChange={(e) => updateMaterial(mat.id, "weight", e.target.value)}
                    placeholder="Gross weight (lbs)"
                    className="w-full px-2.5 py-2 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#002855] focus:ring-1 focus:ring-[#002855] outline-none"
                    data-testid={`material-weight-${idx}`}
                  />
                </div>
                <label className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                  <input
                    type="checkbox"
                    checked={mat.isBulk}
                    onChange={(e) => updateMaterial(mat.id, "isBulk", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#002855] focus:ring-[#002855]"
                    data-testid={`material-bulk-${idx}`}
                  />
                  <span className="text-[11px] text-[#475569] whitespace-nowrap">Bulk</span>
                </label>
              </div>
            </div>
          ))}

          {/* Add material + Calculate buttons */}
          <div className="flex gap-2">
            <button
              onClick={addMaterial}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-dashed border-[#CBD5E1] text-[11px] font-semibold text-[#64748B] hover:border-[#002855] hover:text-[#002855] transition-colors"
              data-testid="add-material-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add Material
            </button>
            {materials.length > 0 && (
              <button
                onClick={calculate}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#002855] text-white text-[11px] font-bold hover:bg-[#001a3d] transition-colors shadow-sm"
                data-testid="calculate-placards-btn"
              >
                <Calculator className="w-3.5 h-3.5" /> Calculate
              </button>
            )}
          </div>

          {materials.length > 0 && (
            <button onClick={reset} className="text-[10px] text-[#94A3B8] hover:text-[#002855] transition-colors">
              Clear all
            </button>
          )}

          {/* RESULTS */}
          {results && (
            <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Results</p>

              {/* Required Placards */}
              {results.placards.length > 0 ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-[11px] font-bold text-red-800 mb-2">Required Placards — display on all 4 sides of vehicle:</p>
                    {results.placards.map((p) => (
                      <div key={p.classValue} className="flex items-center gap-2 py-1">
                        <div className={`w-6 h-6 rounded-sm flex items-center justify-center transform rotate-45 flex-shrink-0 ${p.color}`}>
                          <span className="transform -rotate-45 text-[6px] font-bold text-white" style={{ textShadow: "0 0 2px rgba(0,0,0,0.5)" }}>{p.classValue.replace("-pih","")}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-[#0F172A]">{p.name}</span>
                          <span className="text-[10px] text-[#64748B] ml-1.5">({p.reason})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-green-800">No placards required for these materials based on the information provided.</p>
                  <p className="text-[10px] text-green-700 mt-1">All other HMR requirements (shipping papers, marking, labeling, packaging) still apply.</p>
                </div>
              )}

              {/* CDL HM Endorsement */}
              {results.needsEndorsement && (
                <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
                  <p className="text-[10px] text-[#92400E]">
                    <strong>CDL HM Endorsement (H):</strong> Required when operating a vehicle placarded for HM or carrying 1,001+ lbs of a Table 2 material.
                  </p>
                </div>
              )}

              {/* Aggregate weight */}
              {results.table2Aggregate > 0 && (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-[10px] text-[#475569]">
                    <strong>Table 2 aggregate weight:</strong> {results.table2Aggregate.toLocaleString()} lbs {results.table2Aggregate >= 1001 ? "(meets 1,001 lb threshold)" : "(under 1,001 lb threshold)"}
                  </p>
                </div>
              )}

              {/* Exceptions applied */}
              {results.exceptions.length > 0 && (
                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-[#1E40AF]">Exceptions Applied:</p>
                  {results.exceptions.map((ex, i) => (
                    <p key={i} className="text-[10px] text-[#1E40AF]">{ex}</p>
                  ))}
                </div>
              )}

              {/* Warnings / Notes */}
              {results.warnings.length > 0 && (
                <div className="space-y-1">
                  {results.warnings.map((w, i) => (
                    <div key={i} className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
                      <p className="text-[10px] text-[#92400E]">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Placement reminder */}
              {results.placards.length > 0 && (
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                  <p className="text-[10px] text-[#475569] leading-relaxed">
                    <strong>Placement per <CfrLink r="172.504(a)" />:</strong> Placards must be displayed on each end and each side of the vehicle. On a tractor-trailer, front placard on the tractor, rear on the trailer. Must be clearly visible, at least 3 inches from other markings, in diamond orientation per <CfrLink r="172.516" />.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
