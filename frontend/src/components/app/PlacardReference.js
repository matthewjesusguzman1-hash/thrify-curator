import { useState, useMemo } from "react";
import { ChevronDown, ExternalLink, Search, BookOpen } from "lucide-react";

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
   PLACARD VISUAL — Renders a realistic diamond placard
   ================================================================ */
function PlacardDiamond({ topColor, bottomColor, borderColor, textColor, name, divLabel, symbol, size = "lg" }) {
  const px = size === "lg" ? "w-20 h-20" : "w-12 h-12";
  const textSz = size === "lg" ? "text-[8px]" : "text-[5px]";
  const divSz = size === "lg" ? "text-[10px]" : "text-[6px]";
  const symSz = size === "lg" ? "text-[14px]" : "text-[9px]";

  return (
    <div className={`${px} flex-shrink-0 transform rotate-45 rounded-sm overflow-hidden relative`} style={{ border: `2px solid ${borderColor || "#333"}` }}>
      {/* Top half */}
      <div className="absolute inset-0 bottom-1/2" style={{ backgroundColor: topColor }} />
      {/* Bottom half */}
      <div className="absolute inset-0 top-1/2" style={{ backgroundColor: bottomColor || topColor }} />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center transform -rotate-45">
        {symbol && <span className={`${symSz} leading-none`} style={{ color: textColor }}>{symbol}</span>}
        {name && <span className={`${textSz} font-black leading-tight text-center px-0.5`} style={{ color: textColor }}>{name}</span>}
        {divLabel && <span className={`${divSz} font-black leading-none mt-0.5`} style={{ color: textColor }}>{divLabel}</span>}
      </div>
    </div>
  );
}

/* ================================================================
   FULL PLACARD CATALOG — Based on DOT Chart 17
   ================================================================ */
const PLACARDS = [
  // Class 1 — Explosives
  { div: "1.1", searchTerms: "1.1 explosives mass explosion class 1", name: "EXPLOSIVES", divLabel: "1.1", topColor: "#F97316", bottomColor: "#F97316", borderColor: "#333", textColor: "#000", symbol: "💥", desc: "Mass explosion hazard", classes: ["1"] },
  { div: "1.2", searchTerms: "1.2 explosives projection class 1", name: "EXPLOSIVES", divLabel: "1.2", topColor: "#F97316", bottomColor: "#F97316", borderColor: "#333", textColor: "#000", symbol: "💥", desc: "Projection hazard", classes: ["1"] },
  { div: "1.3", searchTerms: "1.3 explosives fire minor blast class 1", name: "EXPLOSIVES", divLabel: "1.3", topColor: "#F97316", bottomColor: "#F97316", borderColor: "#333", textColor: "#000", symbol: "💥", desc: "Fire hazard, minor blast or projection", classes: ["1"] },
  { div: "1.4", searchTerms: "1.4 explosives minor class 1", name: "EXPLOSIVES", divLabel: "1.4", topColor: "#F97316", bottomColor: "#F97316", borderColor: "#333", textColor: "#000", desc: "Minor explosion hazard, largely confined to package", classes: ["1"] },
  { div: "1.5", searchTerms: "1.5 explosives very insensitive class 1", name: "EXPLOSIVES", divLabel: "1.5", topColor: "#F97316", bottomColor: "#F97316", borderColor: "#333", textColor: "#000", desc: "Very insensitive — mass explosion hazard", classes: ["1"] },
  { div: "1.6", searchTerms: "1.6 explosives extremely insensitive class 1", name: "EXPLOSIVES", divLabel: "1.6", topColor: "#F97316", bottomColor: "#F97316", borderColor: "#333", textColor: "#000", desc: "Extremely insensitive articles", classes: ["1"] },

  // Class 2 — Gases
  { div: "2.1", searchTerms: "2.1 flammable gas propane hydrogen lpg class 2", name: "FLAMMABLE GAS", divLabel: "2", topColor: "#DC2626", bottomColor: "#DC2626", borderColor: "#333", textColor: "#FFF", symbol: "🔥", desc: "Flammable gas (propane, hydrogen, LPG, acetylene)", classes: ["2"] },
  { div: "2.2", searchTerms: "2.2 non-flammable gas nonflammable compressed nitrogen helium class 2", name: "NON-FLAMMABLE GAS", divLabel: "2", topColor: "#16A34A", bottomColor: "#16A34A", borderColor: "#333", textColor: "#FFF", symbol: "⬤", desc: "Non-flammable, non-poisonous compressed gas (nitrogen, helium, CO2)", classes: ["2"] },
  { div: "2.2 (O)", searchTerms: "oxygen compressed refrigerated 2.2 class 2", name: "OXYGEN", divLabel: "2", topColor: "#EAB308", bottomColor: "#EAB308", borderColor: "#333", textColor: "#000", symbol: "⬤", desc: "Oxygen, compressed or refrigerated liquid. May use NON-FLAMMABLE GAS instead.", classes: ["2"], note: "172.530" },
  { div: "2.3", searchTerms: "2.3 poison gas toxic inhalation class 2", name: "POISON GAS", divLabel: "2", topColor: "#FFF", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", symbol: "☠", desc: "Gas poisonous by inhalation", classes: ["2"] },

  // Class 3 — Flammable Liquids
  { div: "3", searchTerms: "3 flammable liquid gasoline alcohol fuel class 3", name: "FLAMMABLE", divLabel: "3", topColor: "#DC2626", bottomColor: "#DC2626", borderColor: "#333", textColor: "#FFF", symbol: "🔥", desc: "Flammable liquid — flash point below 60°C (140°F)", classes: ["3"] },
  { div: "Comb. Liq.", searchTerms: "combustible liquid fuel oil diesel class 3", name: "COMBUSTIBLE", divLabel: "3", topColor: "#DC2626", bottomColor: "#DC2626", borderColor: "#333", textColor: "#FFF", symbol: "🔥", desc: "Combustible liquid — flash point 60-93°C (140-200°F)", classes: ["3"], note: "Not required for non-bulk (172.504(f)(10)). FLAMMABLE may substitute." },

  // Class 4 — Flammable Solids
  { div: "4.1", searchTerms: "4.1 flammable solid self-reactive desensitized class 4", name: "FLAMMABLE SOLID", divLabel: "4", topColor: "#FFF", bottomColor: "#FFF", borderColor: "#DC2626", textColor: "#000", symbol: "🔥", desc: "Flammable solid, self-reactive substance, desensitized explosive", classes: ["4"], note: "Red & white vertical stripes" },
  { div: "4.2", searchTerms: "4.2 spontaneously combustible spontaneous class 4", name: "SPONTANEOUSLY COMBUSTIBLE", divLabel: "4", topColor: "#FFF", bottomColor: "#DC2626", borderColor: "#333", textColor: "#000", symbol: "🔥", desc: "Liable to spontaneous combustion — top white, bottom red", classes: ["4"] },
  { div: "4.3", searchTerms: "4.3 dangerous when wet water reactive class 4", name: "DANGEROUS WHEN WET", divLabel: "4", topColor: "#2563EB", bottomColor: "#2563EB", borderColor: "#333", textColor: "#FFF", symbol: "🔥", desc: "Emits flammable gas on contact with water", classes: ["4"] },

  // Class 5 — Oxidizers & Organic Peroxides
  { div: "5.1", searchTerms: "5.1 oxidizer oxidizing class 5", name: "OXIDIZER", divLabel: "5.1", topColor: "#EAB308", bottomColor: "#EAB308", borderColor: "#333", textColor: "#000", symbol: "⭕", desc: "Oxidizer — may cause or enhance fire", classes: ["5"] },
  { div: "5.2", searchTerms: "5.2 organic peroxide class 5", name: "ORGANIC PEROXIDE", divLabel: "5.2", topColor: "#DC2626", bottomColor: "#EAB308", borderColor: "#333", textColor: "#000", symbol: "🔥", desc: "Organic peroxide — top red, bottom yellow", classes: ["5"], note: "Type B liquid/solid temp controlled = Table 1; all others = Table 2" },

  // Class 6 — Toxic & Infectious
  { div: "6.1", searchTerms: "6.1 poison toxic pg class 6", name: "POISON", divLabel: "6", topColor: "#FFF", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", symbol: "☠", desc: "Toxic substance (other than inhalation hazard)", classes: ["6"] },
  { div: "6.1 PIH", searchTerms: "6.1 poison inhalation hazard pih zone class 6", name: "POISON INHALATION HAZARD", divLabel: "6", topColor: "#FFF", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", symbol: "☠", desc: "Toxic by inhalation — Hazard Zone A or B", classes: ["6"], note: "Not required if POISON GAS placard displayed (172.504(f)(8))" },

  // Class 7 — Radioactive
  { div: "7", searchTerms: "7 radioactive nuclear trefoil class 7", name: "RADIOACTIVE", divLabel: "7", topColor: "#FDE047", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", symbol: "☢", desc: "Radioactive material — Yellow III label required", classes: ["7"] },

  // Class 8 — Corrosive
  { div: "8", searchTerms: "8 corrosive acid base class 8", name: "CORROSIVE", divLabel: "8", topColor: "#FFF", bottomColor: "#1E293B", borderColor: "#333", textColor: "#000", symbol: "⚗", desc: "Destroys skin tissue, corrodes metals — top white, bottom black", classes: ["8"] },

  // Class 9 — Miscellaneous
  { div: "9", searchTerms: "9 miscellaneous lithium battery dry ice elevated temperature class 9", name: "CLASS 9", divLabel: "9", topColor: "#FFF", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", symbol: "|||", desc: "Miscellaneous dangerous goods (lithium batteries, dry ice, elevated temp)", classes: ["9"], note: "NOT required for domestic transport. Bulk must still display ID number." },

  // Special
  { div: "DANGEROUS", searchTerms: "dangerous substitute multiple table 2", name: "DANGEROUS", divLabel: "", topColor: "#DC2626", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", desc: "Substitutes for 2+ Table 2 placards when all non-bulk and none over 2,205 lbs from one facility (172.504(b))", classes: [], isSpecial: true },
  { div: "CHLORINE", searchTerms: "chlorine poison gas cargo tank", name: "CHLORINE", divLabel: "", topColor: "#FFF", bottomColor: "#FFF", borderColor: "#333", textColor: "#000", symbol: "☠", desc: "May replace POISON GAS on cargo tank/portable tank transporting chlorine (172.542)", classes: [], isSpecial: true },
];

/* Table 1 and Table 2 simple lists (matching existing format) */
const TABLE1_LIST = [
  { div: "1.1", placard: "EXPLOSIVES 1.1" },
  { div: "1.2", placard: "EXPLOSIVES 1.2" },
  { div: "1.3", placard: "EXPLOSIVES 1.3" },
  { div: "2.3", placard: "POISON GAS" },
  { div: "4.3", placard: "DANGEROUS WHEN WET" },
  { div: "5.2*", placard: "ORGANIC PEROXIDE (Type B, temp. controlled)" },
  { div: "6.1 PIH", placard: "POISON INHALATION HAZARD" },
  { div: "7", placard: "RADIOACTIVE (Yellow III label)" },
];

const TABLE2_LIST = [
  { div: "1.4", placard: "EXPLOSIVES 1.4" },
  { div: "1.5", placard: "EXPLOSIVES 1.5" },
  { div: "1.6", placard: "EXPLOSIVES 1.6" },
  { div: "2.1", placard: "FLAMMABLE GAS" },
  { div: "2.2", placard: "NON-FLAMMABLE GAS" },
  { div: "3", placard: "FLAMMABLE" },
  { div: "Comb. Liq.", placard: "COMBUSTIBLE" },
  { div: "4.1", placard: "FLAMMABLE SOLID" },
  { div: "4.2", placard: "SPONTANEOUSLY COMBUSTIBLE" },
  { div: "5.1", placard: "OXIDIZER" },
  { div: "5.2", placard: "ORGANIC PEROXIDE (other)" },
  { div: "6.1", placard: "POISON (other than PIH)" },
  { div: "6.2", placard: "(none — exempt from placarding)" },
  { div: "8", placard: "CORROSIVE" },
  { div: "9", placard: "CLASS 9 (not req'd for domestic highway)" },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export function PlacardReference() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const matchedPlacards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return PLACARDS.filter(p =>
      p.searchTerms.includes(q) ||
      p.div.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="bg-white rounded-xl border overflow-hidden" data-testid="placard-reference">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
        data-testid="placard-reference-toggle"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#002855]/10 flex-shrink-0">
          <BookOpen className="w-4 h-4 text-[#002855]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-[#0F172A]">Placard Quick Reference (Chart 17)</p>
          <p className="text-[10px] text-[#94A3B8]">Table 1 & 2, placard lookup by hazard class</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-4">

          {/* ---- TABLE 1 ---- */}
          <div className="rounded-lg border-2 border-red-300 bg-red-50/50 p-2.5">
            <p className="text-[11px] font-bold text-red-700 mb-1.5">TABLE 1 — Placard required in ANY quantity <CfrLink r="172.504(e)" /></p>
            <div className="space-y-0.5">
              {TABLE1_LIST.map(t => (
                <div key={t.div} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono font-bold text-red-800 w-12 flex-shrink-0">{t.div}</span>
                  <span className="text-[#334155]">{t.placard}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ---- TABLE 2 ---- */}
          <div className="rounded-lg border-2 border-[#002855]/20 bg-[#002855]/5 p-2.5">
            <p className="text-[11px] font-bold text-[#002855] mb-1.5">TABLE 2 — Placard required at 1,001 lbs+ aggregate <CfrLink r="172.504(e)" /></p>
            <div className="space-y-0.5">
              {TABLE2_LIST.map(t => (
                <div key={t.div} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono font-bold text-[#002855] w-14 flex-shrink-0">{t.div}</span>
                  <span className="text-[#334155]">{t.placard}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ---- PLACARD LOOKUP ---- */}
          <div className="pt-1 border-t border-[#E2E8F0]">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Placard Lookup — type a hazard class or division</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 2.1, flammable, corrosive, 8, poison..."
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#002855] focus:ring-1 focus:ring-[#002855] outline-none"
                data-testid="placard-ref-search"
              />
            </div>

            {/* Search results — visual placard cards */}
            {searchQuery.trim().length > 0 && (
              <div className="mt-3 space-y-3">
                {matchedPlacards.length === 0 ? (
                  <p className="text-center py-3 text-[11px] text-[#94A3B8]">No matching placards for "{searchQuery}"</p>
                ) : (
                  matchedPlacards.map((p, i) => (
                    <div key={i} className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFC] p-3 flex items-center gap-4" data-testid={`placard-result-${i}`}>
                      {/* Visual placard diamond */}
                      <PlacardDiamond
                        topColor={p.topColor}
                        bottomColor={p.bottomColor}
                        borderColor={p.borderColor}
                        textColor={p.textColor}
                        name={p.name.length > 12 ? "" : p.name}
                        divLabel={p.divLabel}
                        symbol={p.symbol}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-[#0F172A] tracking-tight">{p.name}</p>
                        <p className="text-[11px] text-[#475569] mt-0.5">{p.desc}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-[#002855] bg-[#002855]/10 px-1.5 py-0.5 rounded">
                            {p.isSpecial ? "Substitute" : `Div ${p.div}`}
                          </span>
                          {!p.isSpecial && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              ["1.1","1.2","1.3","2.3","4.3","6.1 PIH"].includes(p.div) || (p.div === "5.2" && p.note?.includes("Table 1")) || p.div === "7"
                                ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {["1.1","1.2","1.3","2.3","4.3","6.1 PIH"].includes(p.div) || p.div === "7" ? "Table 1 — Any Qty" : "Table 2 — 1,001+ lbs"}
                            </span>
                          )}
                        </div>
                        {p.note && <p className="text-[9px] text-[#D4AF37] mt-1 font-medium">{p.note}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Hint when no search */}
            {searchQuery.trim().length === 0 && (
              <p className="text-[10px] text-[#94A3B8] italic mt-2">Type a hazard class (e.g., "3"), division (e.g., "2.1"), or placard name (e.g., "corrosive") to see the corresponding placard.</p>
            )}
          </div>

          <p className="text-[9px] text-[#94A3B8] italic text-center">Reference: DOT Chart 17 / <CfrLink r="172.504" /> / <CfrLink r="172.519" label="Placard specs" /></p>
        </div>
      )}
    </div>
  );
}
