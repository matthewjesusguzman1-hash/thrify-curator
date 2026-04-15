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
   OFFICIAL PLACARD IMAGES — From Federal Register (public domain)
   Per 49 CFR 172.521–172.560
   ================================================================ */
const PLACARDS = [
  { id: "1.1", searchTerms: "1.1 explosives mass explosion class 1", name: "EXPLOSIVES 1.1", cfr: "172.522", img: "https://img.federalregister.gov/EC02MR91.040/EC02MR91.040_original_size.png", desc: "Orange background. Symbol, text, numerals and inner border: black.", table: 1 },
  { id: "1.2", searchTerms: "1.2 explosives projection class 1", name: "EXPLOSIVES 1.2", cfr: "172.522", img: "https://img.federalregister.gov/EC02MR91.040/EC02MR91.040_original_size.png", desc: "Orange background. Symbol, text, numerals and inner border: black.", table: 1 },
  { id: "1.3", searchTerms: "1.3 explosives fire minor blast class 1", name: "EXPLOSIVES 1.3", cfr: "172.522", img: "https://img.federalregister.gov/EC02MR91.040/EC02MR91.040_original_size.png", desc: "Orange background. Symbol, text, numerals and inner border: black.", table: 1 },
  { id: "1.4", searchTerms: "1.4 explosives minor class 1", name: "EXPLOSIVES 1.4", cfr: "172.523", img: "https://img.federalregister.gov/EC02MR91.041/EC02MR91.041_original_size.png", desc: "Orange background. Text, numerals and inner border: black. Division numeral 1.4 at least 64mm high.", table: 2 },
  { id: "1.5", searchTerms: "1.5 explosives very insensitive class 1", name: "EXPLOSIVES 1.5", cfr: "172.524", img: "https://img.federalregister.gov/EC02MR91.042/EC02MR91.042_original_size.png", desc: "Orange background. Text, numerals and inner border: black. Division numeral 1.5 at least 64mm high.", table: 2 },
  { id: "1.6", searchTerms: "1.6 explosives extremely insensitive class 1", name: "EXPLOSIVES 1.6", cfr: "172.525", img: "https://img.federalregister.gov/EC02MR91.043/EC02MR91.043_original_size.png", desc: "Orange background. Text, numerals and inner border: black. Division numeral 1.6 at least 64mm high.", table: 2 },
  { id: "2.1", searchTerms: "2.1 flammable gas propane hydrogen lpg acetylene class 2", name: "FLAMMABLE GAS", cfr: "172.532", img: "https://img.federalregister.gov/EC02MR91.047/EC02MR91.047_original_size.png", desc: "Red background. Symbol, text, class number and inner border: white.", table: 2 },
  { id: "2.2", searchTerms: "2.2 non-flammable gas nonflammable compressed nitrogen helium co2 class 2", name: "NON-FLAMMABLE GAS", cfr: "172.528", img: "https://img.federalregister.gov/EC02MR91.045/EC02MR91.045_original_size.png", desc: "Green background. Symbol, text, class number and inner border: white.", table: 2 },
  { id: "2.2o", searchTerms: "oxygen compressed refrigerated 2.2 class 2", name: "OXYGEN", cfr: "172.530", img: "https://img.federalregister.gov/EC02MR91.046/EC02MR91.046_original_size.png", desc: "Yellow background. Symbol, text, class number and inner border: black.", table: 2, note: "May use NON-FLAMMABLE GAS placard instead. OXYGEN placard for domestic transport only (172.504(f)(7))." },
  { id: "2.3", searchTerms: "2.3 poison gas toxic gas inhalation class 2", name: "POISON GAS", cfr: "172.540", img: "https://img.federalregister.gov/ER22JY97.024/ER22JY97.024_original_size.png", desc: "White background. Upper diamond background: black. Symbol: white. Text, class number and inner border: black.", table: 1 },
  { id: "3", searchTerms: "3 flammable liquid gasoline alcohol fuel class 3", name: "FLAMMABLE", cfr: "172.542", img: "https://img.federalregister.gov/EC02MR91.049/EC02MR91.049_original_size.png", desc: "Red background. Symbol, text, class number and inner border: white. 'GASOLINE' may substitute on cargo/portable tanks.", table: 2 },
  { id: "comb", searchTerms: "combustible liquid fuel oil diesel class 3", name: "COMBUSTIBLE", cfr: "172.544", img: "https://img.federalregister.gov/EC02MR91.050/EC02MR91.050_original_size.png", desc: "Red background. Symbol, text, class number and inner border: white. 'FUEL OIL' may substitute on cargo/portable tanks.", table: 2, note: "Not required for non-bulk (172.500(b)(5)). FLAMMABLE may substitute (172.504(f)(2))." },
  { id: "4.1", searchTerms: "4.1 flammable solid self-reactive desensitized class 4", name: "FLAMMABLE SOLID", cfr: "172.546", img: "https://img.federalregister.gov/EC02MR91.051/EC02MR91.051_original_size.png", desc: "White background with 7 vertical red stripes equally spaced (25mm each). Symbol, text, class number and inner border: black.", table: 2 },
  { id: "4.2", searchTerms: "4.2 spontaneously combustible spontaneous class 4", name: "SPONTANEOUSLY COMBUSTIBLE", cfr: "172.547", img: "https://img.federalregister.gov/EC02MR91.052/EC02MR91.052_original_size.png", desc: "Upper half: white. Lower half: red. Symbol, text, class number and inner border: black.", table: 2 },
  { id: "4.3", searchTerms: "4.3 dangerous when wet water reactive class 4", name: "DANGEROUS WHEN WET", cfr: "172.548", img: "https://img.federalregister.gov/EC02MR91.053/EC02MR91.053_original_size.png", desc: "Blue background. Symbol, text, class number and inner border: white.", table: 1 },
  { id: "5.1", searchTerms: "5.1 oxidizer oxidizing class 5", name: "OXIDIZER", cfr: "172.550", img: "https://img.federalregister.gov/EC02MR91.054/EC02MR91.054_original_size.png", desc: "Yellow background. Symbol, text, division number and inner border: black.", table: 2 },
  { id: "5.2", searchTerms: "5.2 organic peroxide class 5", name: "ORGANIC PEROXIDE", cfr: "172.552", img: "https://img.federalregister.gov/ER29DE06.001/ER29DE06.001_original_size.png", desc: "Upper half: red. Lower half: yellow. Text, division number and inner border: black. Symbol: black or white.", table: 2, note: "Type B liquid/solid temp controlled = Table 1; all others = Table 2." },
  { id: "6.1", searchTerms: "6.1 poison toxic pg class 6", name: "POISON", cfr: "172.554", img: "https://img.federalregister.gov/EC02MR91.057/EC02MR91.057_original_size.png", desc: "White background. Symbol, text, class number and inner border: black. 'TOXIC' may be used in lieu of 'POISON'.", table: 2 },
  { id: "6.1p", searchTerms: "6.1 poison inhalation hazard pih zone class 6", name: "POISON INHALATION HAZARD", cfr: "172.555", img: "https://img.federalregister.gov/ER22JY97.025/ER22JY97.025_original_size.png", desc: "White background. Upper diamond background: black. Symbol: white. Text, class number and inner border: black.", table: 1, note: "Not required if POISON GAS placard displayed (172.504(f)(8))." },
  { id: "7", searchTerms: "7 radioactive nuclear trefoil class 7", name: "RADIOACTIVE", cfr: "172.556", img: "https://img.federalregister.gov/ER29SE00.001/ER29SE00.001_original_size.png", desc: "Upper portion: yellow triangle (base 29mm above center). Lower portion: white. Symbol, text, class number and inner border: black.", table: 1 },
  { id: "8", searchTerms: "8 corrosive acid base class 8", name: "CORROSIVE", cfr: "172.558", img: "https://img.federalregister.gov/ER29SE00.002/ER29SE00.002_original_size.png", desc: "Lower portion: black. Upper portion: white triangle (base 38mm above center). Text and class number: white. Symbol and inner border: black.", table: 2 },
  { id: "9", searchTerms: "9 miscellaneous lithium battery dry ice elevated temperature class 9", name: "CLASS 9", cfr: "172.560", img: "https://img.federalregister.gov/EC02MR91.060/EC02MR91.060_original_size.png", desc: "White background. 7 black vertical stripes on top half to 1 inch above center. Class number 9 underlined at bottom.", table: 2, note: "NOT required for domestic transport (172.504(f)(9)). Bulk must still display ID number." },
  { id: "danger", searchTerms: "dangerous substitute multiple table 2", name: "DANGEROUS", cfr: "172.521", img: "https://img.federalregister.gov/EC02MR91.039/EC02MR91.039_original_size.png", desc: "Red upper and lower triangle. Center area and border: white. Inscription: black.", isSpecial: true },
];

/* Table 1 and Table 2 simple lists */
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
      p.id.toLowerCase() === q ||
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

          {/* TABLE 1 */}
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

          {/* TABLE 2 */}
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

          {/* PLACARD LOOKUP */}
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

            {searchQuery.trim().length > 0 && (
              <div className="mt-3 space-y-3">
                {matchedPlacards.length === 0 ? (
                  <p className="text-center py-3 text-[11px] text-[#94A3B8]">No matching placards for "{searchQuery}"</p>
                ) : (
                  matchedPlacards.map((p, i) => (
                    <div key={i} className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFC] p-3 flex items-center gap-4" data-testid={`placard-result-${i}`}>
                      {/* Official placard image */}
                      <img
                        src={p.img}
                        alt={p.name}
                        className="w-20 h-20 object-contain flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-[#0F172A] tracking-tight">{p.name}</p>
                        <p className="text-[10px] text-[#475569] mt-0.5 leading-relaxed">{p.desc}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {!p.isSpecial && (
                            <>
                              <span className="text-[10px] font-mono font-bold text-[#002855] bg-[#002855]/10 px-1.5 py-0.5 rounded">
                                {p.id === "comb" ? "Comb. Liquid" : p.id === "2.2o" ? "Div 2.2 (Oxygen)" : p.id === "6.1p" ? "Div 6.1 PIH" : `Div ${p.id}`}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.table === 1 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                                {p.table === 1 ? "Table 1 — Any Qty" : "Table 2 — 1,001+ lbs"}
                              </span>
                            </>
                          )}
                          {p.isSpecial && (
                            <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">Substitute Placard</span>
                          )}
                          <CfrLink r={p.cfr} />
                        </div>
                        {p.note && <p className="text-[9px] text-[#D4AF37] mt-1 font-medium">{p.note}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {searchQuery.trim().length === 0 && (
              <p className="text-[10px] text-[#94A3B8] italic mt-2">Type a hazard class (e.g., "3"), division (e.g., "2.1"), or placard name (e.g., "corrosive") to see the official placard.</p>
            )}
          </div>

          <p className="text-[9px] text-[#94A3B8] italic text-center">Placard images from 49 CFR 172.521–172.560 / DOT Chart 17</p>
        </div>
      )}
    </div>
  );
}
