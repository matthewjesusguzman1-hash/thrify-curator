import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle,
  Info, ChevronDown, Link2, ShieldAlert, RotateCcw, Download, Save, ClipboardList
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "../components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ================================================================
   CONSTANTS — 49 CFR 393.108 WLL CHART
   ================================================================ */
const QUICK_PRESETS = [
  { label: '2" Synthetic Web', wll: 2000 },
  { label: '5/16" Gr70 Chain', wll: 6600 },
  { label: '3/8" Gr70 Chain', wll: 9200 },
  { label: '1/2" Gr70 Chain', wll: 14800 },
];

const WLL_CHART = [
  { category: "Chain — Grade 30 (Proof Coil)", items: [
    { label: '1/4" Gr30', wll: 1560 },
    { label: '5/16" Gr30', wll: 2470 },
    { label: '3/8" Gr30', wll: 3880 },
    { label: '1/2" Gr30', wll: 6000 },
    { label: '5/8" Gr30', wll: 6900 },
  ]},
  { category: "Chain — Grade 43 (High Test)", items: [
    { label: '1/4" Gr43', wll: 3100 },
    { label: '5/16" Gr43', wll: 5400 },
    { label: '3/8" Gr43', wll: 7600 },
    { label: '7/16" Gr43', wll: 9000 },
    { label: '1/2" Gr43', wll: 12200 },
    { label: '5/8" Gr43', wll: 13000 },
  ]},
  { category: "Chain — Grade 70 (Transport)", items: [
    { label: '1/4" Gr70', wll: 3880 },
    { label: '9/32" Gr70', wll: 5500 },
    { label: '5/16" Gr70', wll: 6600 },
    { label: '3/8" Gr70', wll: 9200 },
    { label: '7/16" Gr70', wll: 10950 },
    { label: '1/2" Gr70', wll: 14800 },
    { label: '5/8" Gr70', wll: 15800 },
  ]},
  { category: "Chain — Grade 80 (Alloy)", items: [
    { label: '1/4" Gr80', wll: 4400 },
    { label: '5/16" Gr80', wll: 7100 },
    { label: '3/8" Gr80', wll: 10000 },
    { label: '1/2" Gr80', wll: 16000 },
    { label: '5/8" Gr80', wll: 18100 },
  ]},
  { category: "Synthetic Webbing", items: [
    { label: '1-3/4" Web', wll: 1750 },
    { label: '2" Web', wll: 2000 },
    { label: '3" Web', wll: 3000 },
    { label: '4" Web', wll: 4000 },
  ]},
  { category: "Wire Rope (6x37 Fiber Core)", items: [
    { label: '1/4" Wire Rope', wll: 1400 },
    { label: '5/16" Wire Rope', wll: 2100 },
    { label: '3/8" Wire Rope', wll: 3000 },
    { label: '7/16" Wire Rope', wll: 4100 },
    { label: '1/2" Wire Rope', wll: 5300 },
    { label: '5/8" Wire Rope', wll: 8300 },
    { label: '3/4" Wire Rope', wll: 10900 },
  ]},
  { category: "Steel Strapping", items: [
    { label: '2"x.050 Steel', wll: 2650 },
  ]},
];

const FAVORITES_KEY = "tiedown-favorites";

/** Effective WLL per 49 CFR 393.102: direct = 50%, indirect = 100% */
function effectiveWll(td) {
  if (td.defective) return 0;
  return td.method === "direct" ? td.wll * 0.5 : td.wll;
}

/* ================================================================
   SVG CIRCULAR GAUGE
   ================================================================ */
function Gauge({ percent, size = 128, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percent, 0), 120);
  const display = Math.min(clamped, 100);
  const offset = circ - (display / 100) * circ;
  const c = size / 2;
  const color = clamped >= 100 ? "#10B981" : clamped >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx={c} cy={c} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-black leading-none" style={{ color }}>
          {Math.round(percent)}%
        </span>
        <span className="text-[9px] text-[#94A3B8] font-semibold tracking-widest mt-0.5">
          WLL
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   COUNT DOTS  (visual minimum-vs-actual indicator)
   ================================================================ */
function CountDots({ active, required, defective }) {
  /* Show defective (red), then active (green), then still-needed (empty dashed).
     A defective tie-down does NOT count toward the minimum, so "missing"
     is based purely on active vs required. */
  const missing = Math.max(0, required - active);
  const dots = [];
  for (let i = 0; i < defective; i++) {
    dots.push(
      <div key={`d${i}`} className="w-[22px] h-[22px] rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center">
        <XCircle className="w-3 h-3 text-red-500" />
      </div>
    );
  }
  for (let i = 0; i < active; i++) {
    dots.push(
      <div key={`a${i}`} className="w-[22px] h-[22px] rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center">
        <CheckCircle2 className="w-3 h-3 text-white" />
      </div>
    );
  }
  for (let i = 0; i < missing; i++) {
    dots.push(
      <div key={`m${i}`} className="w-[22px] h-[22px] rounded-full border-2 border-dashed border-[#CBD5E1]" />
    );
  }
  return <div className="flex flex-wrap gap-1.5">{dots}</div>;
}

/* ================================================================
   DIRECT vs INDIRECT INFOGRAPHIC
   ================================================================ */
function DirectIndirectGraphic({ open, onToggle }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors" data-testid="toggle-wll-info">
        <span className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">How WLL Is Counted (393.102)</span>
        <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#F1F5F9]">

          {/* DIRECT — Method 1: Vehicle anchor → Cargo anchor (50%) */}
          <div className="rounded-lg border border-[#002855]/15 bg-[#002855]/[0.02] p-3 space-y-2 mt-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#002855] text-white">DIRECT</span>
              <span className="text-[10px] text-[#DC2626] font-bold">50% WLL</span>
            </div>
            {/* Rectangular cargo with tie-downs from vehicle corners to cargo corners */}
            <svg viewBox="0 0 300 120" className="w-full" style={{ maxHeight: 95 }}>
              {/* Flatbed trailer */}
              <rect x="40" y="70" width="220" height="8" rx="2" fill="#B0BEC5" />
              <rect x="35" y="78" width="230" height="4" rx="1" fill="#90A4AE" />
              <circle cx="70" cy="88" r="5" fill="#607D8B" /><circle cx="230" cy="88" r="5" fill="#607D8B" />
              {/* Large rectangular cargo */}
              <rect x="80" y="25" width="140" height="45" rx="3" fill="#E0E0E0" stroke="#BDBDBD" strokeWidth="1.5" />
              <text x="150" y="52" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#757575">CARGO</text>
              {/* Vehicle anchor points (bottom corners of trailer) */}
              <circle cx="50" cy="70" r="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="250" cy="70" r="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="50" cy="75" r="0" /><circle cx="250" cy="75" r="0" />
              {/* Cargo attachment points */}
              <circle cx="88" cy="35" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="212" cy="35" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="88" cy="60" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="212" cy="60" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              {/* Tie-down lines — vehicle to cargo (red, curved slightly) */}
              <line x1="50" y1="70" x2="88" y2="60" stroke="#E53935" strokeWidth="1.5" />
              <line x1="50" y1="70" x2="88" y2="35" stroke="#E53935" strokeWidth="1.5" />
              <line x1="250" y1="70" x2="212" y2="60" stroke="#E53935" strokeWidth="1.5" />
              <line x1="250" y1="70" x2="212" y2="35" stroke="#E53935" strokeWidth="1.5" />
              {/* Labels */}
              <text x="50" y="108" textAnchor="middle" fontSize="7" fill="#78909C">Vehicle Anchor</text>
              <text x="250" y="108" textAnchor="middle" fontSize="7" fill="#78909C">Vehicle Anchor</text>
            </svg>
            <p className="text-[10px] text-[#475569]">Vehicle anchor <strong>&rarr;</strong> attachment point on cargo. Only <span className="text-[#DC2626] font-bold">50%</span> of WLL counts.</p>
          </div>

          {/* DIRECT — Method 2: Over/around cargo → SAME side (50%) — Cylinder */}
          <div className="rounded-lg border border-[#002855]/15 bg-[#002855]/[0.02] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#002855] text-white">DIRECT</span>
              <span className="text-[10px] text-[#DC2626] font-bold">50% WLL</span>
              <span className="text-[9px] text-[#94A3B8]">same side</span>
            </div>
            {/* Cylindrical cargo with tie-downs going over, returning to same side */}
            <svg viewBox="0 0 300 120" className="w-full" style={{ maxHeight: 95 }}>
              {/* Flatbed */}
              <rect x="40" y="70" width="220" height="8" rx="2" fill="#B0BEC5" />
              <rect x="35" y="78" width="230" height="4" rx="1" fill="#90A4AE" />
              <circle cx="70" cy="88" r="5" fill="#607D8B" /><circle cx="230" cy="88" r="5" fill="#607D8B" />
              {/* Cylinder cargo */}
              <ellipse cx="150" cy="45" rx="60" ry="25" fill="#E0E0E0" stroke="#BDBDBD" strokeWidth="1.5" />
              <text x="150" y="49" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#757575">CARGO</text>
              {/* Vehicle anchors — left side only (same side) */}
              <circle cx="55" cy="70" r="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="95" cy="70" r="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              {/* Cargo anchor points on top */}
              <circle cx="120" cy="23" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="180" cy="23" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              {/* Tie-down — from vehicle anchor, over cargo, back to same side */}
              <path d="M55,70 Q55,30 120,23" fill="none" stroke="#E53935" strokeWidth="1.5" />
              <path d="M120,23 Q185,15 180,23" fill="none" stroke="#E53935" strokeWidth="1.5" opacity="0.6" />
              <path d="M180,23 Q245,30 245,70" fill="none" stroke="#E53935" strokeWidth="1.5" />
              <path d="M95,70 Q95,35 150,20" fill="none" stroke="#E53935" strokeWidth="1.5" />
              {/* Same-side indicator arrow */}
              <text x="55" y="108" textAnchor="middle" fontSize="7" fill="#78909C">Vehicle Anchor</text>
              <text x="150" y="10" textAnchor="middle" fontSize="7" fill="#B8960C" fontWeight="bold">Anchor Points on Cargo</text>
              <text x="245" y="108" textAnchor="middle" fontSize="7" fill="#002855" fontWeight="bold">Same Side</text>
            </svg>
            <p className="text-[10px] text-[#475569]">Vehicle anchor <strong>&rarr;</strong> over/around cargo <strong>&rarr;</strong> back to <strong>same side</strong>. Still only <span className="text-[#DC2626] font-bold">50%</span> of WLL.</p>
          </div>

          {/* INDIRECT — Over cargo → OTHER side (100%) — Smaller rectangle */}
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">INDIRECT</span>
              <span className="text-[10px] text-emerald-700 font-bold">100% WLL</span>
              <span className="text-[9px] text-[#94A3B8]">other side</span>
            </div>
            {/* Smaller rectangular cargo with tie-downs to other side */}
            <svg viewBox="0 0 300 120" className="w-full" style={{ maxHeight: 95 }}>
              {/* Flatbed */}
              <rect x="40" y="70" width="220" height="8" rx="2" fill="#B0BEC5" />
              <rect x="35" y="78" width="230" height="4" rx="1" fill="#90A4AE" />
              <circle cx="70" cy="88" r="5" fill="#607D8B" /><circle cx="230" cy="88" r="5" fill="#607D8B" />
              {/* Smaller rectangular cargo */}
              <rect x="100" y="28" width="100" height="42" rx="3" fill="#E0E0E0" stroke="#BDBDBD" strokeWidth="1.5" />
              <text x="150" y="53" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#757575">CARGO</text>
              {/* Vehicle anchors — opposite sides */}
              <circle cx="55" cy="70" r="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="245" cy="70" r="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              {/* Cargo anchor points */}
              <circle cx="110" cy="35" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="190" cy="35" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="110" cy="62" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              <circle cx="190" cy="62" r="3" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
              {/* Tie-down — from left vehicle to over cargo to RIGHT side */}
              <path d="M55,70 Q55,30 110,28 Q150,15 190,28 Q245,30 245,70" fill="none" stroke="#10B981" strokeWidth="2" />
              <path d="M55,70 Q80,50 110,62" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.5" />
              <path d="M245,70 Q220,50 190,62" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.5" />
              {/* Labels */}
              <text x="45" y="108" textAnchor="middle" fontSize="7" fill="#78909C">Vehicle Anchor</text>
              <text x="255" y="108" textAnchor="middle" fontSize="7" fill="#059669" fontWeight="bold">OTHER Side</text>
              <text x="150" y="10" textAnchor="middle" fontSize="7" fill="#B8960C" fontWeight="bold">Anchor Points on Cargo</text>
            </svg>
            <p className="text-[10px] text-[#475569]">Vehicle anchor <strong>&rarr;</strong> over/around cargo <strong>&rarr;</strong> anchor on <strong>other side</strong>. Full <span className="text-emerald-700 font-bold">100%</span> of WLL counts.</p>
          </div>

          <p className="text-[9px] text-[#94A3B8] italic">Always use the WLL marked on the tie-down. If not marked, use <a href="https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-I/section-393.108" target="_blank" rel="noopener noreferrer" className="text-[#002855] underline">393.108(b) table</a>.</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   393.108 WLL CHART PICKER (collapsible)
   ================================================================ */
function WLLChartPicker({ onAdd, favorites, toggleFavorite }) {
  const [openSections, setOpenSections] = useState({});

  const toggle = (cat) =>
    setOpenSections((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="space-y-1" data-testid="wll-chart-picker">
      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
        393.108 WLL Table
      </p>
      {WLL_CHART.map(({ category, items }) => {
        const isOpen = !!openSections[category];
        return (
          <div key={category} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(category)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#FAFBFC] hover:bg-[#F1F5F9] transition-colors"
              data-testid={`chart-section-${category.replace(/[\s/—()]/g, "-")}`}
            >
              <span className="text-[11px] font-semibold text-[#002855]">{category}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#94A3B8]">{items.length}</span>
                <ChevronDown className={`w-3 h-3 text-[#94A3B8] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {isOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2 bg-white border-t border-[#F1F5F9]">
                {items.map((item) => {
                  const isFav = favorites.some((f) => f.label === item.label);
                  return (
                    <div key={item.label} className="flex items-center border border-[#E2E8F0] rounded-md overflow-hidden hover:border-[#002855]/30 transition-colors">
                      <button
                        onClick={() => onAdd(item)}
                        className="flex-1 flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#002855] hover:text-white active:scale-[0.97] transition-all text-left group"
                        data-testid={`chart-add-${item.label.replace(/[\s/"]/g, "-")}`}
                      >
                        <Plus className="w-2.5 h-2.5 flex-shrink-0 text-[#94A3B8] group-hover:text-white" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium truncate">{item.label}</p>
                          <p className="text-[9px] opacity-60">{item.wll.toLocaleString()} lbs</p>
                        </div>
                      </button>
                      <button
                        onClick={() => toggleFavorite(item)}
                        className={`px-1.5 py-1.5 transition-colors flex-shrink-0 ${isFav ? "text-[#D4AF37]" : "text-[#CBD5E1] hover:text-[#D4AF37]"}`}
                        data-testid={`fav-${item.label.replace(/[\s/"]/g, "-")}`}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[9px] text-[#94A3B8] italic pt-1">Per 49 CFR 393.108(b). Use manufacturer WLL when marked on tie-down.</p>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function TieDownCalculator() {
  const navigate = useNavigate();

  const [cargoWeight, setCargoWeight] = useState("");
  const [cargoLength, setCargoLength] = useState("");
  const [tiedowns, setTiedowns] = useState([]);
  const [showRef, setShowRef] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [sections, setSections] = useState({ tiedowns: true, wllInfo: false, photos: true, breakdown: true });

  /* ── Favorites (persisted in localStorage) ── */
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
    catch { return []; }
  });
  const toggleFavorite = (item) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.label === item.label);
      const next = exists ? prev.filter((f) => f.label !== item.label) : [...prev, item];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const weight = parseFloat(cargoWeight) || 0;
  const length = parseFloat(cargoLength) || 0;

  /* ── derived calculations ── */
  const minByLength = useMemo(() => {
    if (length <= 0) return 0;
    if (length < 5 && weight <= 1100) return 1;
    if (length <= 10) return 2;
    return 2 + Math.ceil((length - 10) / 10);
  }, [length, weight]);

  const requiredWLL = weight * 0.5;

  const totalWLL = useMemo(
    () => tiedowns.reduce((s, td) => s + effectiveWll(td), 0),
    [tiedowns],
  );

  const activeTiedowns = tiedowns.filter((t) => !t.defective).length;
  const defectiveCount = tiedowns.filter((t) => t.defective).length;

  const wllOk = weight > 0 && totalWLL >= requiredWLL;
  const countOk = weight > 0 && activeTiedowns >= minByLength;
  const allOk = wllOk && countOk;
  const wllPct = requiredWLL > 0 ? (totalWLL / requiredWLL) * 100 : 0;

  /* ── handlers ── */
  const addTiedown = (preset) =>
    setTiedowns((p) => [
      ...p,
      {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        type: preset.label,
        wll: preset.wll,
        method: "direct",
        defective: false,
      },
    ]);

  const removeTiedown = (id) =>
    setTiedowns((p) => p.filter((t) => t.id !== id));

  const toggleDefective = (id) =>
    setTiedowns((p) =>
      p.map((t) => (t.id === id ? { ...t, defective: !t.defective } : t)),
    );

  const toggleMethod = (id) =>
    setTiedowns((p) =>
      p.map((t) =>
        t.id === id
          ? { ...t, method: t.method === "direct" ? "indirect" : "direct" }
          : t,
      ),
    );

  const updateWLL = (id, val) =>
    setTiedowns((p) =>
      p.map((t) => (t.id === id ? { ...t, wll: parseFloat(val) || 0 } : t)),
    );

  const resetAll = () => {
    setCargoWeight("");
    setCargoLength("");
    setTiedowns([]);
    setPhotos([]);
  };

  /* ── Photo handlers ── */
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/tiedown-photos`, formData);
      setPhotos((p) => [...p, res.data]);
      toast.success("Photo added");
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const removePhoto = (photoId) => {
    setPhotos((p) => p.filter((ph) => ph.photo_id !== photoId));
  };

  /* ── Save to inspection state ── */
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchInspections = async () => {
    setLoadingInspections(true);
    try {
      const res = await axios.get(`${API}/inspections`);
      setInspections(res.data.inspections || []);
    } catch {
      toast.error("Failed to load inspections");
    } finally {
      setLoadingInspections(false);
    }
  };

  const openSaveModal = () => {
    fetchInspections();
    setShowSaveModal(true);
  };

  const saveToInspection = async (inspectionId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/inspections/${inspectionId}/tiedown`, {
        cargo_weight: weight,
        cargo_length: length,
        tiedowns: tiedowns.map((td) => ({
          type: td.type,
          wll: td.wll,
          method: td.method,
          defective: td.defective,
        })),
        photos: photos,
      });
      toast.success("Tie-down assessment saved to inspection");
      setShowSaveModal(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── Standalone HTML export ── */
  const exportStandalone = () => {
    const tds = tiedowns.map((td) => {
      const eff = effectiveWll(td);
      return { ...td, effective_wll: eff };
    });
    const pct = requiredWLL > 0 ? Math.round((totalWLL / requiredWLL) * 100) : 0;
    const barColor = pct >= 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
    const statusColor = allOk ? "#10B981" : "#DC2626";
    const statusText = allOk ? "COMPLIANT" : "NOT COMPLIANT";
    const now = new Date().toLocaleString();

    const rows = tds
      .map((td, i) => {
        const methodBadge =
          td.method === "indirect"
            ? '<span style="background:#10B981;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">INDIRECT 100%</span>'
            : '<span style="background:#002855;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">DIRECT 50%</span>';
        const defBadge = td.defective
          ? ' <span style="background:#DC2626;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">DEFECTIVE</span>'
          : "";
        const defStyle = td.defective ? "text-decoration:line-through;color:#999;" : "";
        const effColor = td.defective ? "#DC2626" : "#002855";
        return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;${defStyle}">${i + 1}. ${td.type}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${methodBadge}${defBadge}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;${defStyle}">${td.wll.toLocaleString()}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:${effColor}">${td.effective_wll.toLocaleString()}</td></tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tie-Down Assessment Report</title>
<style>body{font-family:'IBM Plex Sans',Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#0F172A;}
@media print{body{padding:0;}button{display:none!important;}}</style></head>
<body>
<div style="background:#002855;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
<h1 style="margin:0;font-size:20px;">Tie-Down Assessment Report</h1>
<p style="margin:4px 0 0;font-size:12px;opacity:0.7;">${now} | 49 CFR 393 Subpart I</p>
</div>
<div style="display:flex;gap:12px;margin-bottom:16px;">
<div style="background:#f8fafc;padding:10px 14px;border-radius:6px;flex:1;text-align:center;">
<div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Cargo Weight</div>
<div style="font-size:20px;font-weight:bold;color:#002855;">${weight.toLocaleString()} lbs</div>
</div>
<div style="background:#f8fafc;padding:10px 14px;border-radius:6px;flex:1;text-align:center;">
<div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Cargo Length</div>
<div style="font-size:20px;font-weight:bold;color:#002855;">${length} ft</div>
</div>
</div>
<div style="display:flex;gap:12px;margin-bottom:16px;">
<div style="background:#f8fafc;padding:10px 14px;border-radius:6px;flex:1;text-align:center;">
<div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Required Agg. WLL</div>
<div style="font-size:18px;font-weight:bold;color:#002855;">${requiredWLL.toLocaleString()} lbs</div>
<div style="font-size:10px;color:#94A3B8;">50% of cargo weight &middot; 393.104</div>
</div>
<div style="background:#f8fafc;padding:10px 14px;border-radius:6px;flex:1;text-align:center;">
<div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Min Tie-Downs</div>
<div style="font-size:18px;font-weight:bold;color:#002855;">${minByLength}</div>
<div style="font-size:10px;color:#94A3B8;">Based on ${length} ft &middot; 393.106</div>
</div>
</div>
<div style="margin-bottom:16px;">
<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
<span>Aggregate WLL</span>
<strong style="color:${pct >= 100 ? "#10B981" : "#EF4444"}">${totalWLL.toLocaleString()} / ${requiredWLL.toLocaleString()} lbs (${pct}%)</strong>
</div>
<div style="height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden;">
<div style="height:100%;width:${Math.min(pct, 100)}%;background:${barColor};border-radius:5px;"></div>
</div>
</div>
<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:8px;margin-bottom:16px;background:${allOk ? "#ecfdf5" : "#fef2f2"};border:1px solid ${allOk ? "#a7f3d0" : "#fecaca"};">
<span style="font-size:20px;">${allOk ? "&#10003;" : "&#10007;"}</span>
<div>
<div style="font-weight:bold;color:${statusColor};">${statusText}</div>
<div style="font-size:11px;color:${statusColor};opacity:0.8;">Active: ${activeTiedowns}/${minByLength} min | WLL: ${pct}% of required</div>
</div>
</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
<thead><tr style="background:#f8fafc;">
<th style="padding:8px;text-align:left;font-size:11px;color:#64748B;">Tie-Down</th>
<th style="padding:8px;text-align:center;font-size:11px;color:#64748B;">Method</th>
<th style="padding:8px;text-align:right;font-size:11px;color:#64748B;">Rated WLL</th>
<th style="padding:8px;text-align:right;font-size:11px;color:#64748B;">Effective</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr style="border-top:2px solid #002855;">
<td colspan="3" style="padding:8px;font-weight:bold;color:#002855;">Total Effective WLL</td>
<td style="padding:8px;text-align:right;font-weight:bold;font-size:15px;color:${pct >= 100 ? "#10B981" : "#EF4444"}">${totalWLL.toLocaleString()} lbs</td>
</tr></tfoot>
</table>
<p style="font-size:10px;color:#94A3B8;font-style:italic;">Per 49 CFR 393.102/104/106 &mdash; Direct: 50% WLL, Indirect: 100% WLL, Required aggregate WLL: 50% of cargo weight</p>
<div style="text-align:center;margin-top:24px;padding:16px;">
<button onclick="window.print()" style="background:#002855;color:white;border:none;padding:10px 24px;border-radius:6px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiedown-assessment-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const hasData = weight > 0 && tiedowns.length > 0;

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="tiedown-calculator">
      <Toaster position="top-right" richColors />

      {/* ─── HEADER ─── */}
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-3">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate("/")}
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1
              className="text-sm sm:text-base font-semibold text-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Tie-Down Calculator
            </h1>
            <p className="text-[10px] text-white/50">49 CFR 393 Subpart I</p>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={resetAll}
            className="text-white/50 hover:text-white hover:bg-white/10 h-8 text-xs gap-1"
            data-testid="reset-btn"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      {/* ─── FLOATING ACTION BAR ─── */}
      {hasData && (
        <div className="sticky top-[45px] z-40 bg-white/95 backdrop-blur border-b shadow-sm">
          <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
            <Button
              size="sm"
              onClick={exportStandalone}
              className="bg-[#002855] text-white hover:bg-[#001a3a] h-8 text-xs flex-1 sm:flex-none"
              data-testid="export-standalone-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export Report
            </Button>
            <Button
              size="sm"
              onClick={openSaveModal}
              variant="outline"
              className="border-[#D4AF37] text-[#002855] hover:bg-[#D4AF37]/10 h-8 text-xs flex-1 sm:flex-none"
              data-testid="save-to-inspection-btn"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save to Inspection
            </Button>
          </div>
        </div>
      )}

      <main className="max-w-[800px] mx-auto px-3 sm:px-6 py-4 pb-24 space-y-4">

        {/* ═══════════════════════════════════════════
            SECTION 1 — CARGO INFORMATION
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border p-4 space-y-4" data-testid="cargo-section">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">
            Cargo Information
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#64748B] mb-1 block">Weight (lbs)</Label>
              <Input
                data-testid="cargo-weight"
                type="number" inputMode="decimal"
                placeholder="e.g. 30000"
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
                className="h-14 text-xl font-bold text-[#002855] text-center border-2 focus:border-[#D4AF37] transition-colors"
              />
            </div>
            <div>
              <Label className="text-xs text-[#64748B] mb-1 block">Length (ft)</Label>
              <Input
                data-testid="cargo-length"
                type="number" inputMode="decimal"
                placeholder="e.g. 20"
                value={cargoLength}
                onChange={(e) => setCargoLength(e.target.value)}
                className="h-14 text-xl font-bold text-[#002855] text-center border-2 focus:border-[#D4AF37] transition-colors"
              />
            </div>
          </div>

          {weight > 0 && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[#002855]/5 rounded-xl p-3 border border-[#002855]/10">
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">
                  Required Agg. WLL
                </p>
                <p className="text-xl font-black text-[#002855]">
                  {requiredWLL.toLocaleString()}
                </p>
                <p className="text-[9px] text-[#94A3B8]">
                  lbs (50% of weight) &middot; 393.104
                </p>
              </div>
              <div className="bg-[#002855]/5 rounded-xl p-3 border border-[#002855]/10">
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">
                  Min Tie-Downs
                </p>
                <p className="text-xl font-black text-[#002855]">{minByLength}</p>
                <p className="text-[9px] text-[#94A3B8]">
                  based on {length > 0 ? `${length} ft` : "length"} &middot; 393.106
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 2 — COMPLIANCE DASHBOARD
            ═══════════════════════════════════════════ */}
        {weight > 0 && (
          <div className="bg-white rounded-xl border p-4" data-testid="compliance-dashboard">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B] mb-4 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Compliance Status
            </h2>

            <div className="flex items-start gap-5">
              {/* Circular gauge */}
              <Gauge percent={wllPct} />

              {/* Right-side stats */}
              <div className="flex-1 space-y-3 min-w-0 pt-1">
                {/* WLL progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#64748B]">Aggregate WLL</span>
                    <span
                      className={`text-[11px] font-bold ${wllOk ? "text-emerald-600" : "text-[#EF4444]"}`}
                    >
                      {totalWLL.toLocaleString()} / {requiredWLL.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        wllPct >= 100
                          ? "bg-emerald-500"
                          : wllPct >= 60
                            ? "bg-amber-400"
                            : "bg-[#EF4444]"
                      }`}
                      style={{ width: `${Math.min(100, wllPct)}%` }}
                    />
                  </div>
                </div>

                {/* Count dots */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[#64748B]">Tie-Down Count</span>
                    <span
                      className={`text-[11px] font-bold ${countOk ? "text-emerald-600" : "text-[#EF4444]"}`}
                    >
                      {activeTiedowns} / {minByLength} min
                    </span>
                  </div>
                  <CountDots
                    active={activeTiedowns}
                    required={minByLength}
                    defective={defectiveCount}
                  />
                </div>
              </div>
            </div>

            {/* Overall pass / fail banner */}
            <div
              className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300 ${
                allOk
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
              data-testid="compliance-status"
            >
              {allOk ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">COMPLIANT</p>
                    <p className="text-[10px] text-emerald-600">
                      Meets 49 CFR 393 securement requirements
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-[#EF4444] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#DC2626]">NOT COMPLIANT</p>
                    <p className="text-[10px] text-red-600">
                      {!wllOk && !countOk
                        ? "Insufficient WLL and tie-down count"
                        : !wllOk
                          ? `Need ${(requiredWLL - totalWLL).toLocaleString()} more lbs WLL`
                          : `Need ${minByLength - activeTiedowns} more tie-down(s)`}
                    </p>
                  </div>
                </>
              )}
            </div>

            {defectiveCount > 0 && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  {defectiveCount} defective tie-down(s) excluded from calculation
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 3 — TIE-DOWNS
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="tiedowns-section">
          <button
            onClick={() => setSections((s) => ({ ...s, tiedowns: !s.tiedowns }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
          >
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">
              Tie-Downs ({tiedowns.length})
              {tiedowns.length > 0 && (
                <span className="text-[10px] text-[#94A3B8] font-normal ml-2 normal-case tracking-normal">
                  {activeTiedowns} active &middot; {defectiveCount} defective
                </span>
              )}
            </h2>
            <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${sections.tiedowns ? "rotate-180" : ""}`} />
          </button>
          {sections.tiedowns && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#F1F5F9]">

          {/* Favorites section */}
          {favorites.length > 0 && (
            <div data-testid="favorites-section">
              <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Favorites
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {favorites.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => addTiedown(f)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/60 active:scale-[0.97] transition-all text-left"
                    data-testid={`fav-add-${f.label.replace(/[\s/"]/g, "-")}`}
                  >
                    <Plus className="w-3 h-3 flex-shrink-0 text-[#D4AF37]" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-[#002855] truncate">{f.label}</p>
                      <p className="text-[9px] text-[#94A3B8]">{f.wll.toLocaleString()} lbs</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick-add preset grid */}
          <div>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Common (393.108)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="preset-grid">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => addTiedown(p)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#002855] hover:text-white hover:border-[#002855] active:scale-[0.97] transition-all text-left group"
                  data-testid={`add-${p.label.replace(/[\s/"]/g, "-")}`}
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0 text-[#94A3B8] group-hover:text-white" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium truncate">{p.label}</p>
                    <p className="text-[9px] opacity-60">{p.wll.toLocaleString()} lbs</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => addTiedown({ label: "Custom", wll: 0 })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#94A3B8] hover:bg-[#F8FAFC] active:scale-[0.97] transition-all text-left"
                data-testid="add-custom"
              >
                <Plus className="w-3.5 h-3.5 text-[#94A3B8]" />
                <div>
                  <p className="text-[10px] font-medium text-[#64748B]">Custom</p>
                  <p className="text-[9px] text-[#94A3B8]">Enter WLL</p>
                </div>
              </button>
            </div>
          </div>

          {/* 393.108 full chart picker (collapsible) */}
          <WLLChartPicker onAdd={addTiedown} favorites={favorites} toggleFavorite={toggleFavorite} />

          {/* Direct vs Indirect infographic — now its own collapsible section */}

          {/* Tie-down cards */}
          {tiedowns.length === 0 ? (
            <div className="text-center py-8" data-testid="empty-tiedowns">
              <div className="w-14 h-14 rounded-full bg-[#F1F5F9] mx-auto mb-3 flex items-center justify-center">
                <Link2 className="w-6 h-6 text-[#CBD5E1]" />
              </div>
              <p className="text-sm text-[#64748B] font-medium">No tie-downs added</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Tap a type above to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tiedowns.map((td, idx) => {
                const eff = effectiveWll(td);
                return (
                  <div
                    key={td.id}
                    className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                      td.defective
                        ? "bg-red-50/60 border-red-200"
                        : "bg-white border-[#E2E8F0] hover:border-[#002855]/30"
                    }`}
                    data-testid={`tiedown-${idx}`}
                  >
                    {/* ── top row: index, label, WLL, remove ── */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                          td.defective
                            ? "bg-red-100 text-red-500 line-through"
                            : "bg-[#002855] text-white"
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            td.defective
                              ? "line-through text-[#94A3B8]"
                              : "text-[#0F172A]"
                          }`}
                        >
                          {td.type}
                        </p>
                        {td.type === "Custom" ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="number" inputMode="decimal"
                              placeholder="WLL in lbs"
                              value={td.wll || ""}
                              onChange={(e) => updateWLL(td.id, e.target.value)}
                              className="h-7 text-xs w-28"
                              data-testid={`custom-wll-${idx}`}
                            />
                            <span className="text-[10px] text-[#94A3B8]">lbs</span>
                          </div>
                        ) : (
                          <p
                            className={`text-[11px] ${
                              td.defective ? "text-red-400" : "text-[#64748B]"
                            }`}
                          >
                            Rated: {td.wll.toLocaleString()} lbs WLL
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => removeTiedown(td.id)}
                        className="text-[#CBD5E1] hover:text-[#EF4444] transition-colors p-1"
                        data-testid={`remove-tiedown-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ── bottom row: method toggle + effective WLL + defective ── */}
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-[#F1F5F9] bg-[#FAFBFC]">
                      {/* Direct / Indirect toggle */}
                      <div
                        className="flex rounded-lg border border-[#E2E8F0] overflow-hidden flex-shrink-0"
                        data-testid={`method-toggle-${idx}`}
                      >
                        <button
                          onClick={() => td.method !== "direct" && toggleMethod(td.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
                            td.method === "direct"
                              ? "bg-[#002855] text-white"
                              : "bg-white text-[#94A3B8] hover:text-[#64748B]"
                          }`}
                          data-testid={`method-direct-${idx}`}
                        >
                          DIRECT 50%
                        </button>
                        <button
                          onClick={() => td.method !== "indirect" && toggleMethod(td.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
                            td.method === "indirect"
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-[#94A3B8] hover:text-[#64748B]"
                          }`}
                          data-testid={`method-indirect-${idx}`}
                        >
                          INDIRECT 100%
                        </button>
                      </div>

                      {/* Effective WLL readout */}
                      <div className="flex-1 text-right">
                        {td.defective ? (
                          <span className="text-[10px] text-red-500 font-bold">
                            DEFECTIVE &mdash; 0 lbs
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-[#002855]">
                            {td.method === "direct" && (
                              <span className="text-[9px] text-[#DC2626] font-semibold mr-1">
                                50%
                              </span>
                            )}
                            {eff.toLocaleString()} lbs eff.
                          </span>
                        )}
                      </div>

                      {/* Defective switch */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        <Switch
                          checked={td.defective}
                          onCheckedChange={() => toggleDefective(td.id)}
                          className="scale-[0.7]"
                          data-testid={`defective-toggle-${idx}`}
                        />
                        <span
                          className={`text-[9px] font-bold w-5 ${
                            td.defective ? "text-[#EF4444]" : "text-[#CBD5E1]"
                          }`}
                        >
                          {td.defective ? "DEF" : "OK"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION — DIRECT vs INDIRECT INFO
            ═══════════════════════════════════════════ */}
        <DirectIndirectGraphic
          open={sections.wllInfo}
          onToggle={() => setSections((s) => ({ ...s, wllInfo: !s.wllInfo }))}
        />

        {/* ═══════════════════════════════════════════
            SECTION 3B — PHOTOS
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border overflow-hidden" data-testid="photos-section">
          <button
            onClick={() => setSections((s) => ({ ...s, photos: !s.photos }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
          >
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">
              Photos ({photos.length})
            </h2>
            <div className="flex items-center gap-2">
              {!sections.photos && (
                <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#CBD5E1] bg-[#F8FAFC] text-[10px] text-[#334155] cursor-pointer hover:bg-[#002855] hover:text-white hover:border-[#002855] transition-all" onClick={(e) => e.stopPropagation()} data-testid="add-photo-btn-collapsed">
                  <Plus className="w-3 h-3" /> Add
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </label>
              )}
              <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${sections.photos ? "rotate-180" : ""}`} />
            </div>
          </button>
          {sections.photos && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#F1F5F9]">
            <div className="flex justify-end mt-2">
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#002855] hover:text-white hover:border-[#002855] transition-all cursor-pointer text-xs text-[#334155] ${uploadingPhoto ? "opacity-50 pointer-events-none" : ""}`} data-testid="add-photo-btn">
                {uploadingPhoto ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{uploadingPhoto ? "Uploading..." : "Add Photo"}</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>

          {photos.length === 0 ? (
            <p className="text-xs text-[#94A3B8] text-center py-2">
              No photos. Tap "Add Photo" to document cargo and tie-downs.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {photos.map((ph) => (
                <div key={ph.photo_id} className="relative group" data-testid={`photo-${ph.photo_id}`}>
                  <img
                    src={`${API}/files/${ph.storage_path}`}
                    alt={ph.original_filename}
                    className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewPhoto(`${API}/files/${ph.storage_path}`)}
                  />
                  <button
                    onClick={() => removePhoto(ph.photo_id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#DC2626] text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shadow-sm"
                    data-testid={`remove-photo-${ph.photo_id}`}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 4 — WLL BREAKDOWN
            ═══════════════════════════════════════════ */}
        {tiedowns.length > 0 && weight > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden" data-testid="wll-breakdown">
            <button
              onClick={() => setSections((s) => ({ ...s, breakdown: !s.breakdown }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
            >
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">
                WLL Contribution Breakdown
              </h2>
              <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${sections.breakdown ? "rotate-180" : ""}`} />
            </button>
            {sections.breakdown && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#F1F5F9]">

            <div className="space-y-1.5">
              {tiedowns.map((td, idx) => {
                const eff = effectiveWll(td);
                const pct = requiredWLL > 0 ? (eff / requiredWLL) * 100 : 0;
                return (
                  <div key={td.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94A3B8] w-4 text-right font-medium">
                      {idx + 1}
                    </span>
                    <div className="flex-1 h-3.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          td.defective
                            ? "bg-red-300"
                            : td.method === "indirect"
                              ? "bg-emerald-500"
                              : "bg-[#002855]"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] w-16 text-right font-semibold ${
                        td.defective ? "text-red-400 line-through" : "text-[#334155]"
                      }`}
                    >
                      {eff.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Totals row */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
              <span className="text-[10px] text-[#64748B] w-4 text-right font-bold">&Sigma;</span>
              <div className="flex-1 text-[11px] font-bold text-[#002855]">
                Total Effective WLL
              </div>
              <span
                className={`text-[11px] font-black ${wllOk ? "text-emerald-600" : "text-[#EF4444]"}`}
              >
                {totalWLL.toLocaleString()} lbs
              </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#002855]" />
                <span className="text-[10px] text-[#64748B]">Direct (50% WLL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                <span className="text-[10px] text-[#64748B]">Indirect (100% WLL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-300" />
                <span className="text-[10px] text-[#64748B]">Defective (0 lbs)</span>
              </div>
            </div>
            </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 5 — REGULATION REFERENCE
            ═══════════════════════════════════════════ */}
        <div
          className="bg-[#002855]/5 rounded-xl border border-[#002855]/10 overflow-hidden"
          data-testid="reference-section"
        >
          <button
            onClick={() => setShowRef(!showRef)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            data-testid="toggle-reference"
          >
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#002855]" />
              <span className="text-xs font-bold text-[#002855]">
                Quick Reference &mdash; 49 CFR 393
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#002855] transition-transform duration-200 ${showRef ? "rotate-180" : ""}`}
            />
          </button>

          {showRef && (
            <div className="px-4 pb-4 space-y-2">
              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">
                  393.106 &mdash; Minimum Number of Tie-Downs
                </p>
                <p>Under 5 ft &amp; under 1,100 lbs: <strong>1</strong> tie-down</p>
                <p>5 ft to 10 ft: <strong>2</strong> tie-downs</p>
                <p>Over 10 ft: <strong>2 + 1</strong> for each additional 10 ft or fraction</p>
              </div>

              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">
                  393.104 &mdash; Aggregate Working Load Limit
                </p>
                <p>Total effective WLL must be &ge; <strong>50%</strong> of cargo weight</p>
                <p>Direct tie-down: <strong>50%</strong> of rated WLL counts toward aggregate</p>
                <p>Indirect tie-down: <strong>100%</strong> of rated WLL counts toward aggregate</p>
              </div>

              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">
                  Direct vs. Indirect Tie-Downs
                </p>
                <p>
                  <strong>Direct (50%):</strong> Vehicle anchor to cargo attachment, OR vehicle
                  anchor over/around cargo to <strong>same side</strong> vehicle anchor.
                </p>
                <p>
                  <strong>Indirect (100%):</strong> Vehicle anchor, over or around cargo, to
                  anchor on <strong>other side</strong> of vehicle.
                </p>
              </div>

              <p className="text-[9px] text-[#94A3B8] italic px-1">
                This calculator provides estimates. Always verify with current regulations.
              </p>
              <a href="https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-I/section-393.108" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#002855] font-semibold underline hover:text-[#D4AF37] px-1">
                View 393.108 WLL Table on eCFR.gov
              </a>
            </div>
          )}
        </div>
      </main>

      {/* ─── SAVE TO INSPECTION MODAL ─── */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden" data-testid="save-modal">
          <div className="bg-[#002855] px-4 py-3">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              Save to Inspection
            </h3>
            <p className="text-[10px] text-white/50">Attach this tie-down assessment</p>
          </div>
          <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
            {loadingInspections ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#002855] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-6">
                <ClipboardList className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                <p className="text-sm text-[#64748B]">No inspections found</p>
                <p className="text-xs text-[#94A3B8] mt-1">Create one from the Inspections page first</p>
              </div>
            ) : (
              inspections.map((insp) => (
                <button
                  key={insp.id}
                  onClick={() => saveToInspection(insp.id)}
                  disabled={saving}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#002855]/30 hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors disabled:opacity-50"
                  data-testid={`save-to-${insp.id}`}
                >
                  <p className="text-sm font-semibold text-[#002855] truncate">{insp.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#94A3B8]">
                    <span>{insp.items?.length || 0} violations</span>
                    <span>{insp.created_at?.slice(0, 10)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PHOTO PREVIEW ─── */}
      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            <img src={previewPhoto} alt="Photo" className="w-full h-auto max-h-[80vh] object-contain rounded" />
            <Button onClick={() => setPreviewPhoto(null)} className="w-full mt-2 bg-[#002855] text-white">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
