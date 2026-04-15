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
   COMPLETE PLACARD DATA — From DOT Chart 17 & 49 CFR 172.504(e)
   ================================================================ */
const PLACARD_DATA = [
  // Table 1 — Placard required in ANY quantity
  { div: "1.1", name: "EXPLOSIVES 1.1", table: 1, color: "bg-orange-500", textColor: "text-white", symbol: "Exploding bomb", desc: "Mass explosion hazard" },
  { div: "1.2", name: "EXPLOSIVES 1.2", table: 1, color: "bg-orange-500", textColor: "text-white", symbol: "Exploding bomb", desc: "Projection hazard" },
  { div: "1.3", name: "EXPLOSIVES 1.3", table: 1, color: "bg-orange-500", textColor: "text-white", symbol: "Exploding bomb", desc: "Fire hazard, minor blast/projection" },
  { div: "2.3", name: "POISON GAS", table: 1, color: "bg-white border-2 border-gray-300", textColor: "text-black", symbol: "Skull & crossbones", desc: "Gas poisonous by inhalation" },
  { div: "4.3", name: "DANGEROUS WHEN WET", table: 1, color: "bg-blue-600", textColor: "text-white", symbol: "Flame", desc: "Emits flammable gas on contact with water" },
  { div: "5.2", name: "ORGANIC PEROXIDE", table: 1, color: "bg-yellow-400 border border-red-500", textColor: "text-black", symbol: "Flame over circle", desc: "Type B, liquid or solid, temperature controlled", note: "Only Type B liquid/solid temp controlled is Table 1" },
  { div: "6.1 (PIH)", name: "POISON INHALATION HAZARD", table: 1, color: "bg-white border-2 border-gray-300", textColor: "text-black", symbol: "Skull & crossbones", desc: "Toxic by inhalation (Hazard Zone A or B)" },
  { div: "7 (Yellow III)", name: "RADIOACTIVE", table: 1, color: "bg-yellow-300 border border-gray-400", textColor: "text-black", symbol: "Trefoil", desc: "Radioactive Yellow III label — Highway Route Controlled Qty" },

  // Table 2 — Placard required at 1,001 lbs aggregate
  { div: "1.4", name: "EXPLOSIVES 1.4", table: 2, color: "bg-orange-400", textColor: "text-white", symbol: "Compatibility group letter", desc: "Minor explosion hazard — largely confined to package" },
  { div: "1.5", name: "EXPLOSIVES 1.5", table: 2, color: "bg-orange-400", textColor: "text-white", symbol: "1.5", desc: "Very insensitive — mass explosion hazard" },
  { div: "1.6", name: "EXPLOSIVES 1.6", table: 2, color: "bg-orange-400", textColor: "text-white", symbol: "1.6", desc: "Extremely insensitive articles" },
  { div: "2.1", name: "FLAMMABLE GAS", table: 2, color: "bg-red-600", textColor: "text-white", symbol: "Flame", desc: "Flammable gas (e.g., propane, hydrogen, LPG)" },
  { div: "2.2", name: "NON-FLAMMABLE GAS", table: 2, color: "bg-green-600", textColor: "text-white", symbol: "Gas cylinder", desc: "Non-flammable, non-poisonous compressed gas" },
  { div: "3", name: "FLAMMABLE", table: 2, color: "bg-red-600", textColor: "text-white", symbol: "Flame", desc: "Flammable liquid (flash point < 60C / 140F)" },
  { div: "Combustible", name: "COMBUSTIBLE", table: 2, color: "bg-red-600", textColor: "text-white", symbol: "Flame", desc: "Combustible liquid (flash point 60-93C / 140-200F)", note: "Not required for non-bulk per 172.504(f)(10)" },
  { div: "4.1", name: "FLAMMABLE SOLID", table: 2, color: "bg-white border-2 border-red-500", textColor: "text-black", symbol: "Flame", desc: "Flammable solid, self-reactive, desensitized explosive", note: "Vertical red & white stripes" },
  { div: "4.2", name: "SPONTANEOUSLY COMBUSTIBLE", table: 2, color: "bg-white border-2 border-red-500", textColor: "text-black", symbol: "Flame", desc: "Liable to spontaneous combustion", note: "Top half white, bottom half red" },
  { div: "5.1", name: "OXIDIZER", table: 2, color: "bg-yellow-400", textColor: "text-black", symbol: "Flame over circle", desc: "Oxidizer — may cause or enhance fire" },
  { div: "5.2 (other)", name: "ORGANIC PEROXIDE", table: 2, color: "bg-yellow-400 border border-red-500", textColor: "text-black", symbol: "Flame over circle", desc: "Organic peroxide (Types C-G, or not temp controlled)", note: "Top half red, bottom half yellow" },
  { div: "6.1", name: "POISON", table: 2, color: "bg-white border-2 border-gray-300", textColor: "text-black", symbol: "Skull & crossbones", desc: "Toxic substance (other than inhalation hazard)" },
  { div: "8", name: "CORROSIVE", table: 2, color: "bg-white border-2 border-gray-300", textColor: "text-black", symbol: "Liquid pouring on hand/metal", desc: "Corrosive — destroys skin, corrodes metals", note: "Top half white, bottom half black" },
  { div: "9", name: "CLASS 9", table: 2, color: "bg-white border-2 border-gray-300", textColor: "text-black", symbol: "Vertical stripes", desc: "Miscellaneous dangerous goods (lithium batteries, dry ice, elevated temp)", note: "NOT required for domestic transport per 172.504(f)(9). Bulk must still display ID number." },
];

/* Additional/substitute placards */
const SPECIAL_PLACARDS = [
  { name: "DANGEROUS", color: "bg-white border-2 border-red-500", textColor: "text-red-600", desc: "May substitute for individual Table 2 placards when 2+ categories present, all non-bulk, none over 2,205 lbs from one facility (172.504(b))", note: "Top half red, bottom half white, word DANGEROUS in center" },
  { name: "OXYGEN", color: "bg-yellow-400", textColor: "text-black", desc: "For Div 2.2 Oxygen, compressed or refrigerated. May be replaced by NON-FLAMMABLE GAS placard.", note: "172.530" },
  { name: "CHLORINE", color: "bg-white border-2 border-gray-300", textColor: "text-black", desc: "May be used in place of POISON GAS on a cargo tank or portable tank transporting chlorine.", note: "172.542" },
  { name: "FUEL OIL", color: "bg-red-600", textColor: "text-white", desc: "Alternative marking for cargo tanks carrying only fuel oil. If marked 'Fuel Oil' on each side and rear (2 in+ letters), COMBUSTIBLE placard and ID number not required.", note: "172.544(c)" },
];

/* ================================================================
   PLACARD REFERENCE COMPONENT
   ================================================================ */
export function PlacardReference() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTable, setShowTable] = useState("both"); // "both" | "1" | "2"

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let items = PLACARD_DATA;
    if (showTable === "1") items = items.filter(p => p.table === 1);
    if (showTable === "2") items = items.filter(p => p.table === 2);
    if (!q) return items;
    return items.filter(p =>
      p.div.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      (p.note && p.note.toLowerCase().includes(q))
    );
  }, [searchQuery, showTable]);

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
          <p className="text-[10px] text-[#94A3B8]">Table 1 & 2, placard types by hazard class</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          {/* Info */}
          <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5 text-[11px] leading-relaxed text-[#1E40AF]">
            <strong>Table 1</strong> = placard required in <strong>ANY quantity</strong> (most dangerous). <strong>Table 2</strong> = placard required when aggregate gross weight on vehicle is <strong>1,001 lbs or more</strong>. Reference: <CfrLink r="172.504(e)" /> / DOT Chart 17.
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by class, division, or name..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#002855] focus:ring-1 focus:ring-[#002855] outline-none"
                data-testid="placard-ref-search"
              />
            </div>
          </div>

          {/* Table toggle */}
          <div className="flex gap-1">
            {[
              { val: "both", label: "All" },
              { val: "1", label: "Table 1 (Any Qty)" },
              { val: "2", label: "Table 2 (1,001+ lbs)" },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setShowTable(opt.val)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  showTable === opt.val
                    ? "bg-[#002855] text-white"
                    : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
                data-testid={`table-filter-${opt.val}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Placard list */}
          <div className="space-y-1.5">
            {filtered.length === 0 && (
              <p className="text-center py-3 text-[11px] text-[#94A3B8]">No matching placards found.</p>
            )}
            {filtered.map((p, i) => (
              <div key={i} className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFC] p-2.5 flex items-start gap-2.5" data-testid={`placard-ref-${p.div.replace(/[^a-z0-9]/gi, "-")}`}>
                {/* Placard diamond */}
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center transform rotate-45 flex-shrink-0 ${p.color}`}>
                  <span className={`transform -rotate-45 text-[7px] font-black leading-none text-center ${p.textColor}`}>
                    {p.div.replace(" (PIH)", "").replace(" (Yellow III)", "").replace(" (other)", "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#0F172A]">{p.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.table === 1 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      Table {p.table}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    <strong>Div {p.div}:</strong> {p.desc}
                  </p>
                  {p.note && (
                    <p className="text-[9px] text-[#D4AF37] mt-0.5 font-medium">{p.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Special / Substitute Placards */}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Substitute / Special Placards</p>
            <div className="space-y-1.5">
              {SPECIAL_PLACARDS.map((p, i) => (
                <div key={i} className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFC] p-2.5 flex items-start gap-2.5">
                  <div className={`w-10 h-10 rounded-sm flex items-center justify-center transform rotate-45 flex-shrink-0 ${p.color}`}>
                    <span className={`transform -rotate-45 text-[6px] font-black leading-none text-center ${p.textColor}`}>
                      {p.name.slice(0, 4)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-[#0F172A]">{p.name}</span>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{p.desc}</p>
                    {p.note && <p className="text-[9px] text-[#94A3B8] mt-0.5 font-mono">{p.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-[#94A3B8] italic text-center pt-1">Reference: DOT Chart 17 — Hazardous Materials Markings, Labeling and Placarding Guide</p>
        </div>
      )}
    </div>
  );
}
