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
   SVG SYMBOL COMPONENTS — Based on DOT Chart 17 specifications
   ================================================================ */
function FlameSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C12 2 6 9 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6C18 9 12 2 12 2zm0 17c-1.7 0-3-1.3-3-3 0-1.2 1-3 3-5.5 2 2.5 3 4.3 3 5.5 0 1.7-1.3 3-3 3z"/>
    </svg>
  );
}

function ExplodingBombSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="14" r="5" />
      <line x1="12" y1="9" x2="14" y2="3" stroke={color} strokeWidth="1.5" />
      <circle cx="14" cy="3" r="1.5" fill={color} />
      <line x1="8" y1="5" x2="5" y2="3" stroke={color} strokeWidth="1" />
      <line x1="16" y1="5" x2="19" y2="3" stroke={color} strokeWidth="1" />
      <line x1="6" y1="10" x2="3" y2="9" stroke={color} strokeWidth="1" />
      <line x1="18" y1="10" x2="21" y2="9" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function SkullSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C8 2 5 5.5 5 9c0 2.5 1.2 4.5 3 5.7V17h2v-1h4v1h2v-2.3c1.8-1.2 3-3.2 3-5.7 0-3.5-3-7-7-7zM9 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
      <path d="M10 19h4v2h-4z"/>
      <path d="M9 18h1v3H9zM14 18h1v3h-1z"/>
    </svg>
  );
}

function GasCylinderSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <rect x="8" y="6" width="8" height="14" rx="2" />
      <path d="M10 6V4a2 2 0 014 0v2" />
      <line x1="8" y1="10" x2="16" y2="10" />
    </svg>
  );
}

function FlameOverCircleSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="14" r="5" fill="none" stroke={color} strokeWidth="1.8" />
      <path d="M12 4c0 0-3 3.5-3 6 0 1.7 1.3 3 3 3s3-1.3 3-3c0-2.5-3-6-3-6z" />
    </svg>
  );
}

function TrefoilSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10 L9 4 A4 4 0 0 1 15 4 Z" opacity="0.9" />
      <path d="M10.3 12.7 L4 15 A4 4 0 0 1 6 9 Z" opacity="0.9" />
      <path d="M13.7 12.7 L20 15 A4 4 0 0 0 18 9 Z" opacity="0.9" />
    </svg>
  );
}

function CorrosiveSymbol({ color = "#000", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M8 3h2v4l-2 2v3h-2V9L4 7V3h2v3l1 1V3h1z" />
      <path d="M14 3h2v4l2 2v3h-2V9l-2-2V3z" />
      <path d="M4 14c0 0 2 2 4 4s2 4 2 4h4s0-2 2-4 4-4 4-4H4z" />
    </svg>
  );
}

function StripesSymbol({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {[3, 7, 11, 15, 19].map(x => (
        <line key={x} x1={x} y1="2" x2={x} y2="22" stroke="#000" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ================================================================
   PLACARD DIAMOND — Realistic DOT placard visual
   ================================================================ */
function PlacardVisual({ placard, size = 80 }) {
  const s = size;
  const half = s / 2;
  const borderW = 2;

  return (
    <div style={{ width: s, height: s, flexShrink: 0, position: "relative" }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {/* Outer diamond border */}
        <polygon
          points={`${half},${borderW} ${s - borderW},${half} ${half},${s - borderW} ${borderW},${half}`}
          fill="none"
          stroke="#000"
          strokeWidth={borderW}
        />
        {/* Inner border line */}
        <polygon
          points={`${half},${borderW + 4} ${s - borderW - 4},${half} ${half},${s - borderW - 4} ${borderW + 4},${half}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
        />
        {/* Top half fill */}
        <polygon
          points={`${half},${borderW + 5} ${s - borderW - 5},${half} ${borderW + 5},${half}`}
          fill={placard.topColor}
        />
        {/* Bottom half fill */}
        <polygon
          points={`${s - borderW - 5},${half} ${half},${s - borderW - 5} ${borderW + 5},${half}`}
          fill={placard.bottomColor || placard.topColor}
        />
        {/* Vertical stripes for 4.1 */}
        {placard.stripes && (
          <>
            {[0.25, 0.375, 0.5, 0.625, 0.75].map((pct, i) => {
              const x = s * pct;
              return <line key={i} x1={x} y1={half * 0.3} x2={x} y2={half} stroke="#DC2626" strokeWidth="2" opacity="0.7" />;
            })}
          </>
        )}
      </svg>
      {/* Content overlay */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12%" }}>
        {/* Symbol */}
        <div style={{ marginBottom: 1 }}>
          {placard.symbolType === "flame" && <FlameSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "bomb" && <ExplodingBombSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "skull" && <SkullSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "cylinder" && <GasCylinderSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "flameCircle" && <FlameOverCircleSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "trefoil" && <TrefoilSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "corrosive" && <CorrosiveSymbol color={placard.symbolColor || "#000"} size={s * 0.22} />}
          {placard.symbolType === "stripes" && <StripesSymbol size={s * 0.22} />}
        </div>
        {/* Name text */}
        <span style={{ fontSize: s * 0.09, fontWeight: 900, color: placard.textColor || "#000", textAlign: "center", lineHeight: 1.1, letterSpacing: -0.3 }}>
          {placard.displayName || placard.name}
        </span>
        {/* Class number at bottom */}
        <span style={{ fontSize: s * 0.14, fontWeight: 900, color: placard.numColor || placard.textColor || "#000", marginTop: 1 }}>
          {placard.classNum}
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   PLACARD CATALOG — Per DOT Chart 17 / 49 CFR 172.519-172.560
   ================================================================ */
const PLACARDS = [
  // Class 1 — Explosives (orange background, black bomb symbol)
  { id: "1.1", searchTerms: "1.1 explosives mass explosion class 1", name: "EXPLOSIVES 1.1", displayName: "EXPLOSIVES", classNum: "1.1", topColor: "#F97316", symbolType: "bomb", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Mass explosion hazard", table: 1 },
  { id: "1.2", searchTerms: "1.2 explosives projection class 1", name: "EXPLOSIVES 1.2", displayName: "EXPLOSIVES", classNum: "1.2", topColor: "#F97316", symbolType: "bomb", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Projection hazard", table: 1 },
  { id: "1.3", searchTerms: "1.3 explosives fire minor blast class 1", name: "EXPLOSIVES 1.3", displayName: "EXPLOSIVES", classNum: "1.3", topColor: "#F97316", symbolType: "bomb", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Fire hazard, minor blast or projection", table: 1 },
  { id: "1.4", searchTerms: "1.4 explosives minor class 1", name: "EXPLOSIVES 1.4", displayName: "EXPLOSIVES", classNum: "1.4", topColor: "#F97316", symbolType: "bomb", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Minor explosion hazard — largely confined to package", table: 2 },
  { id: "1.5", searchTerms: "1.5 explosives very insensitive class 1", name: "EXPLOSIVES 1.5", displayName: "EXPLOSIVES", classNum: "1.5", topColor: "#F97316", symbolType: "bomb", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Very insensitive — mass explosion hazard", table: 2 },
  { id: "1.6", searchTerms: "1.6 explosives extremely insensitive class 1", name: "EXPLOSIVES 1.6", displayName: "EXPLOSIVES", classNum: "1.6", topColor: "#F97316", symbolType: "bomb", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Extremely insensitive articles", table: 2 },

  // Class 2 — Gases
  { id: "2.1", searchTerms: "2.1 flammable gas propane hydrogen lpg acetylene class 2", name: "FLAMMABLE GAS", displayName: "FLAMMABLE\nGAS", classNum: "2", topColor: "#DC2626", symbolType: "flame", symbolColor: "#FFF", textColor: "#FFF", numColor: "#FFF", desc: "Flammable gas (propane, hydrogen, LPG, acetylene)", table: 2 },
  { id: "2.2", searchTerms: "2.2 non-flammable gas nonflammable compressed nitrogen helium co2 class 2", name: "NON-FLAMMABLE GAS", displayName: "NON-FLAMMABLE\nGAS", classNum: "2", topColor: "#16A34A", symbolType: "cylinder", symbolColor: "#FFF", textColor: "#FFF", numColor: "#FFF", desc: "Non-flammable, non-poisonous compressed gas", table: 2 },
  { id: "2.2o", searchTerms: "oxygen compressed refrigerated 2.2 class 2", name: "OXYGEN", displayName: "OXYGEN", classNum: "2", topColor: "#EAB308", symbolType: "flameCircle", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Oxygen, compressed or refrigerated liquid", table: 2, note: "May use NON-FLAMMABLE GAS placard instead (172.530)" },
  { id: "2.3", searchTerms: "2.3 poison gas toxic gas inhalation class 2", name: "POISON GAS", displayName: "POISON\nGAS", classNum: "2", topColor: "#FFFFFF", symbolType: "skull", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Gas poisonous by inhalation", table: 1 },

  // Class 3 — Flammable Liquids (red, white flame)
  { id: "3", searchTerms: "3 flammable liquid gasoline alcohol fuel class 3", name: "FLAMMABLE", displayName: "FLAMMABLE", classNum: "3", topColor: "#DC2626", symbolType: "flame", symbolColor: "#FFF", textColor: "#FFF", numColor: "#FFF", desc: "Flammable liquid — flash point below 60\u00B0C (140\u00B0F)", table: 2 },
  { id: "comb", searchTerms: "combustible liquid fuel oil diesel class 3", name: "COMBUSTIBLE", displayName: "COMBUSTIBLE", classNum: "3", topColor: "#DC2626", symbolType: "flame", symbolColor: "#FFF", textColor: "#FFF", numColor: "#FFF", desc: "Combustible liquid — flash point 60-93\u00B0C (140-200\u00B0F)", table: 2, note: "Not req'd for non-bulk. FLAMMABLE may substitute." },

  // Class 4 — Flammable Solids
  { id: "4.1", searchTerms: "4.1 flammable solid self-reactive desensitized class 4", name: "FLAMMABLE SOLID", displayName: "FLAMMABLE\nSOLID", classNum: "4", topColor: "#FFFFFF", symbolType: "flame", symbolColor: "#000", textColor: "#000", numColor: "#000", stripes: true, desc: "Flammable solid — white with red vertical stripes", table: 2 },
  { id: "4.2", searchTerms: "4.2 spontaneously combustible spontaneous class 4", name: "SPONTANEOUSLY COMBUSTIBLE", displayName: "SPONTANEOUSLY\nCOMBUSTIBLE", classNum: "4", topColor: "#FFFFFF", bottomColor: "#DC2626", symbolType: "flame", symbolColor: "#000", textColor: "#000", numColor: "#FFF", desc: "Top half white, bottom half red", table: 2 },
  { id: "4.3", searchTerms: "4.3 dangerous when wet water reactive class 4", name: "DANGEROUS WHEN WET", displayName: "DANGEROUS\nWHEN WET", classNum: "4", topColor: "#2563EB", symbolType: "flame", symbolColor: "#FFF", textColor: "#FFF", numColor: "#FFF", desc: "Blue — emits flammable gas on contact with water", table: 1 },

  // Class 5 — Oxidizers & Organic Peroxides
  { id: "5.1", searchTerms: "5.1 oxidizer oxidizing class 5", name: "OXIDIZER", displayName: "OXIDIZER", classNum: "5.1", topColor: "#EAB308", symbolType: "flameCircle", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Yellow — may cause or enhance fire", table: 2 },
  { id: "5.2", searchTerms: "5.2 organic peroxide class 5", name: "ORGANIC PEROXIDE", displayName: "ORGANIC\nPEROXIDE", classNum: "5.2", topColor: "#DC2626", bottomColor: "#EAB308", symbolType: "flame", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Top red, bottom yellow", table: 2, note: "Type B liquid/solid temp controlled = Table 1" },

  // Class 6 — Toxic & Infectious
  { id: "6.1", searchTerms: "6.1 poison toxic pg class 6", name: "POISON", displayName: "POISON", classNum: "6", topColor: "#FFFFFF", symbolType: "skull", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "White — toxic substance (other than inhalation hazard)", table: 2 },
  { id: "6.1p", searchTerms: "6.1 poison inhalation hazard pih zone class 6", name: "POISON INHALATION HAZARD", displayName: "POISON\nINHALATION\nHAZARD", classNum: "6", topColor: "#FFFFFF", symbolType: "skull", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Toxic by inhalation — Zone A or B", table: 1, note: "Not req'd if POISON GAS placard displayed" },

  // Class 7 — Radioactive (yellow top, white bottom, trefoil)
  { id: "7", searchTerms: "7 radioactive nuclear trefoil class 7", name: "RADIOACTIVE", displayName: "RADIOACTIVE", classNum: "7", topColor: "#FDE047", bottomColor: "#FFFFFF", symbolType: "trefoil", symbolColor: "#000", textColor: "#000", numColor: "#000", desc: "Yellow top, white bottom — trefoil symbol", table: 1 },

  // Class 8 — Corrosive (white top, black bottom)
  { id: "8", searchTerms: "8 corrosive acid base class 8", name: "CORROSIVE", displayName: "CORROSIVE", classNum: "8", topColor: "#FFFFFF", bottomColor: "#1E293B", symbolType: "corrosive", symbolColor: "#000", textColor: "#000", numColor: "#FFF", desc: "White top, black bottom — destroys skin tissue, corrodes metals", table: 2 },

  // Class 9 — Miscellaneous (white with black stripes top)
  { id: "9", searchTerms: "9 miscellaneous lithium battery dry ice elevated temperature class 9", name: "CLASS 9", displayName: "", classNum: "9", topColor: "#FFFFFF", symbolType: "stripes", textColor: "#000", numColor: "#000", desc: "White with black vertical stripes — miscellaneous dangerous goods", table: 2, note: "NOT required for domestic transport. Bulk must display ID number." },

  // Special
  { id: "danger", searchTerms: "dangerous substitute multiple table 2", name: "DANGEROUS", displayName: "DANGEROUS", classNum: "", topColor: "#DC2626", bottomColor: "#FFFFFF", textColor: "#FFF", numColor: "#000", desc: "Red top, white bottom — substitutes for 2+ Table 2 placards (172.504(b))", isSpecial: true },
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
                      <PlacardVisual placard={p} size={80} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-[#0F172A] tracking-tight">{p.name}</p>
                        <p className="text-[11px] text-[#475569] mt-0.5">{p.desc}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {!p.isSpecial && (
                            <>
                              <span className="text-[10px] font-mono font-bold text-[#002855] bg-[#002855]/10 px-1.5 py-0.5 rounded">
                                {p.id.includes("p") ? `Div ${p.id.replace("p","")} PIH` : p.id === "comb" ? "Comb. Liquid" : p.id === "2.2o" ? "Div 2.2 (Oxygen)" : `Div ${p.id}`}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.table === 1 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                                {p.table === 1 ? "Table 1 — Any Qty" : "Table 2 — 1,001+ lbs"}
                              </span>
                            </>
                          )}
                          {p.isSpecial && (
                            <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">Substitute Placard</span>
                          )}
                        </div>
                        {p.note && <p className="text-[9px] text-[#D4AF37] mt-1 font-medium">{p.note}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

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
