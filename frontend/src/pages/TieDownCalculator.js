import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle,
  Info, ChevronDown, Link2, ShieldAlert, RotateCcw, Save,
  ClipboardList, GripVertical, Package, Eye, Share2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Toaster, toast } from "sonner";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { PDFPreview } from "../components/app/PDFPreview";
import { TieDownReportContent } from "../components/app/ReportContent";
import { useAuth } from "../components/app/AuthContext";
import { generatePDFBlob, sharePDFBlob } from "../lib/pdfShare";
import { savePhoto as savePhotoToDevice, getPhotoBlob } from "../lib/devicePhotos";
import { DevicePhoto } from "../components/app/DevicePhoto";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ================================================================
   CONSTANTS — 49 CFR 393.108 WLL CHART
   ================================================================ */
const WLL_CHART = [
  { category: "Chain — Grade 30 (Proof Coil)", items: [
    { label: '1/4" Gr30', wll: 1300 },{ label: '5/16" Gr30', wll: 1900 },
    { label: '3/8" Gr30', wll: 2650 },{ label: '7/16" Gr30', wll: 3700 },
    { label: '1/2" Gr30', wll: 4500 },{ label: '5/8" Gr30', wll: 6900 },
  ]},
  { category: "Chain — Grade 43 (High Test)", items: [
    { label: '1/4" Gr43', wll: 2600 },{ label: '5/16" Gr43', wll: 3900 },
    { label: '3/8" Gr43', wll: 5400 },{ label: '7/16" Gr43', wll: 7200 },
    { label: '1/2" Gr43', wll: 9200 },{ label: '5/8" Gr43', wll: 13000 },
  ]},
  { category: "Chain — Grade 70 (Transport)", items: [
    { label: '1/4" Gr70', wll: 3150 },{ label: '5/16" Gr70', wll: 4700 },
    { label: '3/8" Gr70', wll: 6600 },{ label: '7/16" Gr70', wll: 8750 },
    { label: '1/2" Gr70', wll: 11300 },{ label: '5/8" Gr70', wll: 15800 },
  ]},
  { category: "Chain — Grade 80 (Alloy)", items: [
    { label: '1/4" Gr80', wll: 3500 },{ label: '5/16" Gr80', wll: 4500 },
    { label: '3/8" Gr80', wll: 7100 },{ label: '1/2" Gr80', wll: 12000 },
    { label: '5/8" Gr80', wll: 18100 },
  ]},
  { category: "Chain — Grade 100 (Alloy)", items: [
    { label: '1/4" Gr100', wll: 4300 },{ label: '5/16" Gr100', wll: 5700 },
    { label: '3/8" Gr100', wll: 8800 },{ label: '1/2" Gr100', wll: 15000 },
    { label: '5/8" Gr100', wll: 22600 },
  ]},
  { category: "Synthetic Webbing", items: [
    { label: '1-3/4" Web', wll: 1750 },{ label: '2" Web', wll: 2000 },
    { label: '3" Web', wll: 3000 },{ label: '4" Web', wll: 4000 },
  ]},
  { category: "Wire Rope (6x37 Fiber Core)", items: [
    { label: '1/4" Wire Rope', wll: 1400 },{ label: '5/16" Wire Rope', wll: 2100 },
    { label: '3/8" Wire Rope', wll: 3000 },{ label: '7/16" Wire Rope', wll: 4100 },
    { label: '1/2" Wire Rope', wll: 5300 },{ label: '5/8" Wire Rope', wll: 8300 },
    { label: '3/4" Wire Rope', wll: 10900 },{ label: '7/8" Wire Rope', wll: 16100 },
    { label: '1" Wire Rope', wll: 20900 },
  ]},
  { category: "Manila Rope", items: [
    { label: '3/8" Manila', wll: 205 },{ label: '7/16" Manila', wll: 265 },
    { label: '1/2" Manila', wll: 315 },{ label: '5/8" Manila', wll: 465 },
    { label: '3/4" Manila', wll: 640 },{ label: '1" Manila', wll: 1050 },
  ]},
  { category: "Polypropylene Fiber Rope", items: [
    { label: '3/8" Polypro', wll: 400 },{ label: '7/16" Polypro', wll: 525 },
    { label: '1/2" Polypro', wll: 625 },{ label: '5/8" Polypro', wll: 925 },
    { label: '3/4" Polypro', wll: 1275 },{ label: '1" Polypro', wll: 2100 },
  ]},
  { category: "Polyester Fiber Rope", items: [
    { label: '3/8" Polyester', wll: 555 },{ label: '7/16" Polyester', wll: 750 },
    { label: '1/2" Polyester', wll: 960 },{ label: '5/8" Polyester', wll: 1500 },
    { label: '3/4" Polyester', wll: 1880 },{ label: '1" Polyester', wll: 3300 },
  ]},
  { category: "Nylon Rope", items: [
    { label: '3/8" Nylon', wll: 336 },{ label: '7/16" Nylon', wll: 502 },
    { label: '1/2" Nylon', wll: 655 },{ label: '5/8" Nylon', wll: 1130 },
    { label: '3/4" Nylon', wll: 1840 },{ label: '1" Nylon', wll: 3250 },
  ]},
  { category: "Double Braided Nylon Rope", items: [
    { label: '3/8" Dbl Nylon', wll: 278 },{ label: '7/16" Dbl Nylon', wll: 410 },
    { label: '1/2" Dbl Nylon', wll: 525 },{ label: '5/8" Dbl Nylon', wll: 935 },
    { label: '3/4" Dbl Nylon', wll: 1420 },{ label: '1" Dbl Nylon', wll: 2520 },
  ]},
  { category: "Steel Strapping", items: [
    { label: '1-1/4"x.029 Steel', wll: 1190 },{ label: '1-1/4"x.031 Steel', wll: 1190 },
    { label: '1-1/4"x.035 Steel', wll: 1190 },{ label: '1-1/4"x.044 Steel', wll: 1690 },
    { label: '1-1/4"x.050 Steel', wll: 1690 },{ label: '1-1/4"x.057 Steel', wll: 1925 },
    { label: '2"x.044 Steel', wll: 2650 },{ label: '2"x.050 Steel', wll: 2650 },
  ]},
];

const FAVORITES_KEY = "tiedown-favorites";

function effectiveWll(td) {
  if (td.defective) return 0;
  return td.method === "direct" ? td.wll * 0.5 : td.wll;
}

function calcMinByLength(length, weight, hasBlocking) {
  if (length <= 0) return 0;
  if (hasBlocking) return Math.ceil(length / 10);
  if (length <= 5 && weight <= 1100) return 1;
  if (length <= 10) return 2;
  return 2 + Math.ceil((length - 10) / 10);
}

function calcArticle(a) {
  const w = parseFloat(a.cargoWeight) || 0;
  const l = parseFloat(a.cargoLength) || 0;
  const min = calcMinByLength(l, w, a.hasBlocking);
  const reqWLL = w * 0.5;
  const totWLL = a.tiedowns.reduce((s, td) => s + effectiveWll(td), 0);
  const active = a.tiedowns.filter((t) => !t.defective).length;
  const defective = a.tiedowns.filter((t) => t.defective).length;
  const wllOk = w > 0 && totWLL >= reqWLL;
  const countOk = w > 0 && active >= min;
  return { w, l, min, reqWLL, totWLL, active, defective, wllOk, countOk, allOk: wllOk && countOk, pct: reqWLL > 0 ? (totWLL / reqWLL) * 100 : 0 };
}

function newArticle(num) {
  return { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), label: `Article ${num}`, cargoWeight: "", cargoLength: "", hasBlocking: false, tiedowns: [], photos: [], expanded: true };
}

function uid() { return Date.now().toString() + Math.random().toString(36).slice(2, 6); }

/* ================================================================
   SMALL HELPER COMPONENTS
   ================================================================ */
function Gauge({ percent, size = 100, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const display = Math.min(Math.max(percent, 0), 100);
  const offset = circ - (display / 100) * circ;
  const c = size / 2;
  const color = percent >= 100 ? "#10B981" : percent >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black leading-none" style={{ color }}>{Math.round(percent)}%</span>
        <span className="text-[8px] text-[#94A3B8] font-semibold tracking-widest">WLL</span>
      </div>
    </div>
  );
}

function CountDots({ tiedowns, required }) {
  const active = tiedowns.filter((t) => !t.defective).length;
  const missing = Math.max(0, required - active);
  const dots = tiedowns.map((td, i) =>
    td.defective ? (
      <div key={`t${i}`} className="w-[20px] h-[20px] rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center"><XCircle className="w-2.5 h-2.5 text-red-500" /></div>
    ) : (
      <div key={`t${i}`} className="w-[20px] h-[20px] rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>
    ),
  );
  for (let i = 0; i < missing; i++) dots.push(<div key={`m${i}`} className="w-[20px] h-[20px] rounded-full border-2 border-dashed border-[#CBD5E1]" />);
  return <div className="flex flex-wrap gap-1">{dots}</div>;
}

function DirectIndirectGraphic({ open, onToggle }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors" data-testid="toggle-wll-info">
        <span className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">How WLL Is Counted (393.102)</span>
        <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#F1F5F9]">
          <div className="rounded-lg border border-[#002855]/15 p-3 space-y-2 mt-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#002855] text-white">DIRECT</span>
              <span className="text-[10px] text-[#DC2626] font-bold">50% WLL</span>
            </div>
            <div className="flex gap-3 items-start">
              <img src="/tiedown-direct1.png" alt="Direct: over cargo same side" className="rounded-lg border w-[45%] object-contain" />
              <img src="/tiedown-direct2.png" alt="Direct: vehicle to cargo" className="rounded-lg border w-[55%] object-contain" />
            </div>
            <div className="text-[10px] text-[#475569] space-y-1">
              <p><strong>Left:</strong> Vehicle anchor &rarr; over/around cargo &rarr; back to <strong>same side</strong></p>
              <p><strong>Right:</strong> Vehicle anchor &rarr; attachment point on cargo</p>
              <p className="text-[#DC2626] font-semibold">Both count as only 50% of the tie-down's WLL</p>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">INDIRECT</span>
              <span className="text-[10px] text-emerald-700 font-bold">100% WLL</span>
            </div>
            <img src="/tiedown-indirect.png" alt="Indirect: over cargo other side" className="rounded-lg border w-[60%] mx-auto object-contain" />
            <div className="text-[10px] text-[#475569] space-y-1">
              <p>Vehicle anchor &rarr; over/around cargo &rarr; anchor on <strong>other side</strong> of vehicle</p>
              <p className="text-emerald-700 font-semibold">Full 100% of the tie-down's WLL counts toward aggregate</p>
            </div>
          </div>
          <p className="text-[9px] text-[#94A3B8] italic">Always use the WLL marked on the tie-down. If not marked, use <a href="https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-I/section-393.108" target="_blank" rel="noopener noreferrer" className="text-[#002855] underline">393.108(b) table</a>.</p>
        </div>
      )}
    </div>
  );
}

function WLLChartPicker({ onAdd, favorites, toggleFavorite }) {
  const [openSections, setOpenSections] = useState({});
  const [tableOpen, setTableOpen] = useState(true);
  const toggle = (cat) => setOpenSections((p) => ({ ...p, [cat]: !p[cat] }));
  return (
    <div className="space-y-1" data-testid="wll-chart-picker">
      <button onClick={() => setTableOpen(o => !o)} className="w-full flex items-center justify-between mb-1" data-testid="toggle-wll-table">
        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">393.108 WLL Table</p>
        <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${tableOpen ? "rotate-180" : ""}`} />
      </button>
      {tableOpen && (
        <>
          {WLL_CHART.map(({ category, items }) => (
        <div key={category} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
          <button onClick={() => toggle(category)} className="w-full flex items-center justify-between px-3 py-2 bg-[#FAFBFC] hover:bg-[#F1F5F9] transition-colors" data-testid={`chart-section-${category.replace(/[\s/—()]/g, "-")}`}>
            <span className="text-[11px] font-semibold text-[#002855]">{category}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[#94A3B8]">{items.length}</span>
              <ChevronDown className={`w-3 h-3 text-[#94A3B8] transition-transform duration-200 ${openSections[category] ? "rotate-180" : ""}`} />
            </div>
          </button>
          {openSections[category] && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2 bg-white border-t border-[#F1F5F9]">
              {items.map((item) => {
                const isFav = favorites.some((f) => f.label === item.label);
                return (
                  <div key={item.label} className="flex items-center border border-[#E2E8F0] rounded-md overflow-hidden hover:border-[#002855]/30 transition-colors">
                    <button onClick={() => onAdd(item)} className="flex-1 flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#002855] hover:text-white active:scale-[0.97] transition-all text-left group" data-testid={`chart-add-${item.label.replace(/[\s/"]/g, "-")}`}>
                      <Plus className="w-2.5 h-2.5 flex-shrink-0 text-[#94A3B8] group-hover:text-white" />
                      <div className="min-w-0"><p className="text-[10px] font-medium truncate">{item.label}</p><p className="text-[9px] opacity-60">{item.wll.toLocaleString()} lbs</p></div>
                    </button>
                    <button onClick={() => toggleFavorite(item)} className={`px-1.5 py-1.5 transition-colors flex-shrink-0 ${isFav ? "text-[#D4AF37]" : "text-[#CBD5E1] hover:text-[#D4AF37]"}`} data-testid={`fav-${item.label.replace(/[\s/"]/g, "-")}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <p className="text-[9px] text-[#94A3B8] italic pt-1">Per 49 CFR 393.108(b). Use manufacturer WLL when marked on tie-down.</p>
        </>
      )}
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function TieDownCalculator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { badge } = useAuth();

  // Hydrate from saved assessment (via "Recreate in Section")
  const initialArticles = (() => {
    const saved = location.state?.recreateTiedown;
    if (saved) {
      return [{
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        label: "Article 1 (from saved)",
        cargoWeight: String(saved.cargo_weight || ""),
        cargoLength: String(saved.cargo_length || ""),
        hasBlocking: !!saved.has_blocking,
        tiedowns: (saved.tiedowns || []).map((td) => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          type: td.type || "Custom",
          method: td.method || "indirect",
          wll: Number(td.wll) || 0,
          defective: !!td.defective,
        })),
        photos: [],
        expanded: true,
      }];
    }
    return [newArticle(1)];
  })();

  const [articles, setArticles] = useState(initialArticles);
  const [showRef, setShowRef] = useState(false);
  const [showWllInfo, setShowWllInfo] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const hiddenReportRef = useRef(null);
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [saving, setSaving] = useState(false);

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
  });
  const toggleFavorite = (item) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.label === item.label);
      const next = exists ? prev.filter((f) => f.label !== item.label) : [...prev, item];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  /* ── Article CRUD ── */
  const updateArticle = (id, changes) => setArticles((p) => p.map((a) => a.id === id ? { ...a, ...changes } : a));
  const removeArticle = (id) => setArticles((p) => p.length > 1 ? p.filter((a) => a.id !== id) : p);
  const addArticle = () => setArticles((p) => [...p, newArticle(p.length + 1)]);
  const toggleExpanded = (id) => updateArticle(id, { expanded: !articles.find((a) => a.id === id)?.expanded });

  /* ── Tie-down handlers (scoped to article) ── */
  const addTiedown = (artId, preset) => updateArticle(artId, {
    tiedowns: [...(articles.find((a) => a.id === artId)?.tiedowns || []), { id: uid(), type: preset.label, wll: preset.wll, method: "indirect", defective: false }]
  });
  const removeTiedown = (artId, tdId) => updateArticle(artId, { tiedowns: articles.find((a) => a.id === artId).tiedowns.filter((t) => t.id !== tdId) });
  const updateTiedown = (artId, tdId, changes) => updateArticle(artId, { tiedowns: articles.find((a) => a.id === artId).tiedowns.map((t) => t.id === tdId ? { ...t, ...changes } : t) });
  const moveTiedown = (artId, fromIdx, toIdx) => {
    const art = articles.find((a) => a.id === artId);
    const next = [...art.tiedowns];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateArticle(artId, { tiedowns: next });
  };

  /* ── Photo handlers (scoped to article) ── */
  const handlePhotoUpload = async (artId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Pre-assessment photos: saved only on this device. They'll inherit the
      // inspection_id when the user later saves the tie-down assessment.
      const meta = await savePhotoToDevice(file, { category: "tiedown-pre", originalFilename: file.name });
      const art = articles.find((a) => a.id === artId);
      updateArticle(artId, { photos: [...art.photos, meta] });
      toast.success("Photo saved on this device");
    } catch { toast.error("Photo save failed"); }
    finally { e.target.value = ""; }
  };
  const removePhoto = async (artId, photoId) => {
    const art = articles.find((a) => a.id === artId);
    updateArticle(artId, { photos: art.photos.filter((p) => p.photo_id !== photoId) });
    try { const { deletePhoto: dp } = await import("../lib/devicePhotos"); await dp(photoId); } catch {}
  };

  const resetAll = () => setArticles([newArticle(1)]);

  /* ── Derived: any article has data? ── */
  const hasData = articles.some((a) => (parseFloat(a.cargoWeight) || 0) > 0 && a.tiedowns.length > 0);

  /* ── Save to inspection ── */
  const fetchInspections = async () => {
    setLoadingInspections(true);
    try { const res = await axios.get(`${API}/inspections?badge=${badge}`); setInspections(res.data.inspections || []); }
    catch { toast.error("Failed to load inspections"); }
    finally { setLoadingInspections(false); }
  };
  const openSaveModal = () => { fetchInspections(); setShowSaveModal(true); };

  const handleShare = useCallback(async () => {
    if (!hiddenReportRef.current) {
      toast.error("Report not ready");
      return;
    }
    setSharing(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      const blob = await generatePDFBlob(hiddenReportRef.current);
      await sharePDFBlob(blob, `tiedown-assessment-${new Date().toISOString().slice(0, 10)}.pdf`, {
        title: "Tie-Down Assessment Report",
        text: `Tie-Down Assessment · ${articles.length} article(s) evaluated`,
      });
    } catch (err) {
      console.error("Share failed:", err);
      toast.error("Could not generate the report. Try Preview.");
    } finally {
      setSharing(false);
    }
  }, [articles.length]);

  const createAndSave = async () => {
    const title = newInspTitle.trim() || `Tie-Down ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/inspections`, { title, badge });
      if (res.data?.id) {
        setNewInspTitle("");
        await saveToInspection(res.data.id);
      }
    } catch { toast.error("Failed to create inspection"); }
    finally { setSaving(false); }
  };
  const saveToInspection = async (inspectionId) => {
    setSaving(true);
    try {
      for (const a of articles) {
        const c = calcArticle(a);
        if (c.w <= 0 && a.tiedowns.length === 0) continue;
        await axios.post(`${API}/inspections/${inspectionId}/tiedown`, {
          cargo_weight: c.w, cargo_length: c.l, has_blocking: a.hasBlocking,
          tiedowns: a.tiedowns.map((td) => ({ type: td.type, wll: td.wll, method: td.method, defective: td.defective })),
          photos: a.photos,
        });
      }
      toast.success(`${articles.length} article(s) saved to inspection`);
      setShowSaveModal(false);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="tiedown-calculator">
      <Toaster position="top-right" richColors />

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" data-testid="back-btn"><ChevronLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-sm sm:text-base font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Tie-Down Calculator</h1>
            <p className="text-[10px] text-white/50">49 CFR 393 Subpart I &middot; {articles.length} article{articles.length > 1 ? "s" : ""}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetAll} className="text-white/50 hover:text-white hover:bg-white/10 h-8 text-xs gap-1" data-testid="reset-btn"><RotateCcw className="w-3 h-3" /> Reset</Button>
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      {/* FLOATING ACTION BAR — Preview + Share + Save (matches HOS / Bridge Chart / Photo) */}
      {hasData && (
        <div className="sticky top-[45px] z-40 bg-white/95 backdrop-blur border-b shadow-sm">
          <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
            <Button size="sm" onClick={() => setShowPreview(true)} className="bg-[#002855] text-white hover:bg-[#001a3a] h-9 text-xs font-bold flex-1" data-testid="export-standalone-btn"><Eye className="w-3.5 h-3.5 mr-1.5" /> Preview</Button>
            <Button size="sm" onClick={handleShare} disabled={sharing} variant="outline" className="border-[#D4AF37] text-[#002855] hover:bg-[#D4AF37]/10 h-9 text-xs font-bold flex-1" data-testid="share-btn"><Share2 className="w-3.5 h-3.5 mr-1.5" /> {sharing ? "Preparing…" : "Share"}</Button>
            <Button size="sm" onClick={openSaveModal} variant="outline" className="border-[#002855]/20 text-[#002855] hover:bg-[#002855]/5 h-9 text-xs font-bold flex-1" data-testid="save-to-inspection-btn"><Save className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
          </div>
        </div>
      )}

      <main className="max-w-[800px] mx-auto px-3 sm:px-6 py-4 pb-24 space-y-4">

        {/* ═══ ARTICLE CARDS ═══ */}
        {articles.map((art, artIdx) => {
          const c = calcArticle(art);
          return (
            <div key={art.id} className="bg-white rounded-xl border overflow-hidden" data-testid={`article-${artIdx}`}>
              {/* Article header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#002855] border-b border-[#002855] cursor-pointer" onClick={() => toggleExpanded(art.id)}>
                <Package className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <input
                  value={art.label}
                  onChange={(e) => { e.stopPropagation(); updateArticle(art.id, { label: e.target.value }); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-sm font-bold text-white placeholder-white/40 border-none outline-none"
                  data-testid={`article-label-${artIdx}`}
                />
                {c.w > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.allOk ? "bg-[#16A34A]/20 text-[#86EFAC]" : "bg-[#DC2626]/25 text-[#FCA5A5]"}`}>
                    {c.allOk ? "OK" : "FAIL"}
                  </span>
                )}
                {articles.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removeArticle(art.id); }} className="text-white/50 hover:text-[#FCA5A5] transition-colors p-1" data-testid={`remove-article-${artIdx}`}><Trash2 className="w-3.5 h-3.5" /></button>
                )}
                <ChevronDown className={`w-4 h-4 text-white/80 transition-transform duration-200 ${art.expanded ? "rotate-180" : ""}`} />
              </div>

              {art.expanded && (
                <div className="p-4 space-y-4">
                  {/* CARGO INFO */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-[#64748B] mb-1 block">Weight (lbs)</Label>
                        <Input type="number" inputMode="decimal" placeholder="e.g. 30000" value={art.cargoWeight} onChange={(e) => updateArticle(art.id, { cargoWeight: e.target.value })} className="h-12 text-lg font-bold text-[#002855] text-center border-2 focus:border-[#D4AF37] transition-colors" data-testid={`cargo-weight-${artIdx}`} />
                      </div>
                      <div>
                        <Label className="text-xs text-[#64748B] mb-1 block">Length (ft)</Label>
                        <Input type="number" inputMode="decimal" placeholder="e.g. 20" value={art.cargoLength} onChange={(e) => updateArticle(art.id, { cargoLength: e.target.value })} className="h-12 text-lg font-bold text-[#002855] text-center border-2 focus:border-[#D4AF37] transition-colors" data-testid={`cargo-length-${artIdx}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <div><p className="text-xs font-medium text-[#334155]">Headerboard / Blocking</p><p className="text-[10px] text-[#94A3B8]">393.110(c)</p></div>
                      <Switch checked={art.hasBlocking} onCheckedChange={(v) => updateArticle(art.id, { hasBlocking: v })} data-testid={`blocking-switch-${artIdx}`} />
                    </div>
                    {c.w > 0 && (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-[#002855]/5 rounded-xl p-2.5 border border-[#002855]/10">
                          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">Required Agg. WLL</p>
                          <p className="text-lg font-black text-[#002855]">{c.reqWLL.toLocaleString()}</p>
                          <p className="text-[9px] text-[#94A3B8]">lbs (50% of weight) &middot; 393.104</p>
                        </div>
                        <div className={`rounded-xl p-2.5 border ${art.hasBlocking ? "bg-emerald-50 border-emerald-200" : "bg-[#002855]/5 border-[#002855]/10"}`}>
                          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-medium">Min Tie-Downs by Length</p>
                          <p className="text-lg font-black text-[#002855]">{c.min}</p>
                          <p className="text-[9px] text-[#94A3B8]">for {c.l} ft {art.hasBlocking ? "w/ blocking" : ""} &middot; 393.110{art.hasBlocking ? "(c)" : "(b)"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COMPLIANCE */}
                  {c.w > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <Gauge percent={c.pct} />
                        <div className="flex-1 space-y-2 min-w-0 pt-1">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#64748B]">Aggregate WLL</span>
                              <span className={`text-[11px] font-bold ${c.wllOk ? "text-emerald-600" : "text-[#EF4444]"}`}>{c.totWLL.toLocaleString()} / {c.reqWLL.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ease-out ${c.pct >= 100 ? "bg-emerald-500" : c.pct >= 60 ? "bg-amber-400" : "bg-[#EF4444]"}`} style={{ width: `${Math.min(100, c.pct)}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#64748B]">Tie-Down Count</span>
                              <span className={`text-[11px] font-bold ${c.countOk ? "text-emerald-600" : "text-[#EF4444]"}`}>{c.active} / {c.min} min</span>
                            </div>
                            <CountDots tiedowns={art.tiedowns} required={c.min} />
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${c.allOk ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`} data-testid={`compliance-status-${artIdx}`}>
                        {c.allOk ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />}
                        <div>
                          <p className={`text-xs font-bold ${c.allOk ? "text-emerald-700" : "text-[#DC2626]"}`}>{c.allOk ? "COMPLIANT" : "NOT COMPLIANT"}</p>
                          <p className={`text-[10px] ${c.allOk ? "text-emerald-600" : "text-red-600"}`}>{!c.wllOk && !c.countOk ? "Insufficient WLL and tie-down count" : !c.wllOk ? `Need ${(c.reqWLL - c.totWLL).toLocaleString()} more lbs WLL` : !c.countOk ? `Need ${c.min - c.active} more tie-down(s)` : "Meets 49 CFR 393 securement requirements"}</p>
                        </div>
                      </div>
                      {c.defective > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">{c.defective} defective tie-down(s) excluded from calculation</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TIE-DOWNS */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Tie-Downs ({art.tiedowns.length})</p>

                    {/* Favorites */}
                    {favorites.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>Favorites
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {favorites.map((f) => (
                            <button key={f.label} onClick={() => addTiedown(art.id, f)} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/20 active:scale-[0.97] transition-all text-left" data-testid={`fav-add-${f.label.replace(/[\s/"]/g, "-")}-${artIdx}`}>
                              <Plus className="w-3 h-3 flex-shrink-0 text-[#D4AF37]" /><div className="min-w-0"><p className="text-[10px] font-medium text-[#002855] truncate">{f.label}</p><p className="text-[9px] text-[#94A3B8]">{f.wll.toLocaleString()} lbs</p></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom + Chart */}
                    <button onClick={() => addTiedown(art.id, { label: "Custom", wll: 0 })} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#94A3B8] hover:bg-[#F8FAFC] active:scale-[0.97] transition-all text-left" data-testid={`add-custom-${artIdx}`}>
                      <Plus className="w-3.5 h-3.5 text-[#94A3B8]" /><div><p className="text-[10px] font-medium text-[#64748B]">Custom WLL</p><p className="text-[9px] text-[#94A3B8]">Enter any WLL value</p></div>
                    </button>
                    <WLLChartPicker onAdd={(item) => addTiedown(art.id, item)} favorites={favorites} toggleFavorite={toggleFavorite} />

                    {/* Tie-down cards */}
                    {art.tiedowns.length === 0 ? (
                      <div className="text-center py-6"><Link2 className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" /><p className="text-sm text-[#64748B]">No tie-downs added</p></div>
                    ) : (
                      <div className="space-y-2">
                        {art.tiedowns.map((td, idx) => {
                          const eff = effectiveWll(td);
                          return (
                            <div key={td.id} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", idx.toString()); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData("text/plain")); if (!isNaN(from) && from !== idx) moveTiedown(art.id, from, idx); }} className={`rounded-xl border overflow-hidden transition-all duration-200 ${td.defective ? "bg-red-50/60 border-red-200" : "bg-white border-[#E2E8F0] hover:border-[#002855]/30"}`} data-testid={`tiedown-${artIdx}-${idx}`}>
                              <div className="flex items-center gap-2 px-2 py-2">
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <button onClick={() => idx > 0 && moveTiedown(art.id, idx, idx - 1)} disabled={idx === 0} className={`p-0.5 ${idx === 0 ? "text-[#E2E8F0]" : "text-[#94A3B8] hover:text-[#002855]"} transition-all`}><ChevronDown className="w-3.5 h-3.5 rotate-180" /></button>
                                  <GripVertical className="w-4 h-4 text-[#CBD5E1] cursor-grab active:cursor-grabbing" />
                                  <button onClick={() => idx < art.tiedowns.length - 1 && moveTiedown(art.id, idx, idx + 1)} disabled={idx === art.tiedowns.length - 1} className={`p-0.5 ${idx === art.tiedowns.length - 1 ? "text-[#E2E8F0]" : "text-[#94A3B8] hover:text-[#002855]"} transition-all`}><ChevronDown className="w-3.5 h-3.5" /></button>
                                </div>
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${td.defective ? "bg-red-100 text-red-500 line-through" : "bg-[#002855] text-white"}`}>{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${td.defective ? "line-through text-[#94A3B8]" : "text-[#0F172A]"}`}>{td.type}</p>
                                  {td.type === "Custom" ? (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Input type="number" inputMode="decimal" placeholder="WLL in lbs" value={td.wll || ""} onChange={(e) => updateTiedown(art.id, td.id, { wll: parseFloat(e.target.value) || 0 })} className="h-7 text-xs w-28" />
                                      <span className="text-[10px] text-[#94A3B8]">lbs</span>
                                    </div>
                                  ) : (
                                    <p className={`text-[11px] ${td.defective ? "text-red-400" : "text-[#64748B]"}`}>Rated: {td.wll.toLocaleString()} lbs WLL</p>
                                  )}
                                </div>
                                <button onClick={() => removeTiedown(art.id, td.id)} className="text-[#CBD5E1] hover:text-[#EF4444] transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 border-t border-[#F1F5F9] bg-[#FAFBFC]">
                                <div className="flex rounded-lg border border-[#E2E8F0] overflow-hidden flex-shrink-0">
                                  <button onClick={() => updateTiedown(art.id, td.id, { method: "direct" })} className={`px-2 py-1 text-[10px] font-bold tracking-wide transition-colors ${td.method === "direct" ? "bg-[#002855] text-white" : "bg-white text-[#94A3B8] hover:text-[#64748B]"}`}>DIRECT 50%</button>
                                  <button onClick={() => updateTiedown(art.id, td.id, { method: "indirect" })} className={`px-2 py-1 text-[10px] font-bold tracking-wide transition-colors ${td.method === "indirect" ? "bg-emerald-600 text-white" : "bg-white text-[#94A3B8] hover:text-[#64748B]"}`}>INDIRECT 100%</button>
                                </div>
                                <div className="flex-1 text-right">
                                  {td.defective ? (<span className="text-[10px] text-red-500 font-bold">DEFECTIVE &mdash; 0 lbs</span>) : (
                                    <span className="text-[11px] font-bold text-[#002855]">{td.method === "direct" && <span className="text-[9px] text-[#DC2626] font-semibold mr-1">50%</span>}{eff.toLocaleString()} lbs eff.</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                  <Switch checked={td.defective} onCheckedChange={() => updateTiedown(art.id, td.id, { defective: !td.defective })} className="scale-[0.7]" />
                                  <span className={`text-[9px] font-bold w-5 ${td.defective ? "text-[#EF4444]" : "text-[#CBD5E1]"}`}>{td.defective ? "DEF" : "OK"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* PHOTOS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Photos ({art.photos.length})</p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#002855] hover:text-white hover:border-[#002855] transition-all cursor-pointer text-xs text-[#334155]">
                        <Plus className="w-3.5 h-3.5" /><span>Add Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(art.id, e)} className="hidden" />
                      </label>
                    </div>
                    {art.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {art.photos.map((ph) => (
                          <div key={ph.photo_id} className="relative group">
                            <DevicePhoto photoId={ph.photo_id} alt={ph.original_filename} className="w-20 h-20 object-cover rounded-lg border cursor-pointer" onClick={() => setPreviewPhoto(ph.photo_id)} />
                            <button onClick={() => removePhoto(art.id, ph.photo_id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#DC2626] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shadow-sm"><XCircle className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ADD ANOTHER ARTICLE */}
        <button onClick={addArticle} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#D4AF37]/40 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/60 active:scale-[0.99] transition-all" data-testid="add-article-btn">
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-sm font-bold text-[#002855]">Add Article</span>
        </button>

        {/* DIRECT vs INDIRECT INFO */}
        <DirectIndirectGraphic open={showWllInfo} onToggle={() => setShowWllInfo(!showWllInfo)} />

        {/* QUICK REFERENCE */}
        <div className="bg-[#002855]/5 rounded-xl border border-[#002855]/10 overflow-hidden" data-testid="reference-section">
          <button onClick={() => setShowRef(!showRef)} className="w-full flex items-center justify-between px-4 py-3 text-left" data-testid="toggle-reference">
            <div className="flex items-center gap-2"><Info className="w-3.5 h-3.5 text-[#002855]" /><span className="text-xs font-bold text-[#002855]">Quick Reference &mdash; 49 CFR 393</span></div>
            <ChevronDown className={`w-4 h-4 text-[#002855] transition-transform duration-200 ${showRef ? "rotate-180" : ""}`} />
          </button>
          {showRef && (
            <div className="px-4 pb-4 space-y-2">
              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">393.110 &mdash; Minimum Number of Tie-Downs</p>
                <p className="font-semibold text-[#002855] mt-1">393.110(b) &mdash; Without Blocking:</p>
                <p>Under 5 ft &amp; under 1,100 lbs: <strong>1</strong> tie-down</p>
                <p>5 ft to 10 ft: <strong>2</strong> tie-downs</p>
                <p>Over 10 ft: <strong>2 + 1</strong> for each additional 10 ft or fraction</p>
                <p className="font-semibold text-[#002855] mt-2">393.110(c) &mdash; With Blocking (headerboard, bulkhead, end structure):</p>
                <p><strong>1</strong> tie-down for every 10 ft of cargo length or fraction</p>
                <p className="text-[10px] text-[#94A3B8] italic mt-1">Blocking prevents forward movement of cargo. When present, fewer tie-downs are required because the structure absorbs forward force.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">393.104 &mdash; Aggregate Working Load Limit</p>
                <p>Total effective WLL must be &ge; <strong>50%</strong> of cargo weight</p>
                <p>Direct tie-down: <strong>50%</strong> of rated WLL counts toward aggregate</p>
                <p>Indirect tie-down: <strong>100%</strong> of rated WLL counts toward aggregate</p>
              </div>
              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">Direct vs. Indirect Tie-Downs</p>
                <p><strong>Direct (50%):</strong> Vehicle anchor to cargo attachment, OR vehicle anchor over/around cargo to <strong>same side</strong> vehicle anchor.</p>
                <p><strong>Indirect (100%):</strong> Vehicle anchor, over or around cargo, to anchor on <strong>other side</strong> of vehicle.</p>
              </div>
              <p className="text-[9px] text-[#94A3B8] italic px-1">This calculator provides estimates. Always verify with current regulations.</p>
              <a href="https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-I/section-393.108" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#002855] font-semibold underline hover:text-[#D4AF37] px-1">View 393.108 WLL Table on eCFR.gov</a>
            </div>
          )}
        </div>
      </main>

      {/* Hidden content for Share PDF generation */}
      <div ref={hiddenReportRef} aria-hidden="true" style={{ position: "absolute", left: -99999, top: 0, width: 700, padding: "20px 16px", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 13, color: "#0F172A", lineHeight: 1.6, background: "#fff", pointerEvents: "none" }}>
        <TieDownReportContent articles={articles} />
      </div>

      {/* PDF PREVIEW */}
      <PDFPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        title="Tie-Down Assessment Report"
        filename={`tiedown-assessment-${new Date().toISOString().slice(0, 10)}`}
        hideShareButton
      >
        <TieDownReportContent articles={articles} />
      </PDFPreview>

      {/* SAVE MODAL */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden" data-testid="save-modal">
          <div className="bg-[#002855] px-4 py-3">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Save to Inspection</h3>
            <p className="text-[10px] text-white/50">Attach {articles.length} article(s) as tie-down assessments</p>
          </div>
          <div className="px-3 pt-3 pb-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-[10px] text-[#64748B] font-medium mb-1.5 uppercase">New Inspection</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newInspTitle}
                onChange={(e) => setNewInspTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAndSave()}
                placeholder="Inspection name..."
                className="flex-1 px-2.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#002855] text-xs placeholder:text-[#94A3B8] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                data-testid="new-inspection-input"
              />
              <button
                onClick={createAndSave}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold disabled:opacity-50 flex-shrink-0"
                data-testid="create-inspection-btn"
              >
                {saving ? "..." : "Create & Add"}
              </button>
            </div>
          </div>
          <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
            {loadingInspections ? (
              <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[#002855] border-t-transparent rounded-full animate-spin" /></div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-6"><ClipboardList className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" /><p className="text-sm text-[#64748B]">No existing inspections</p><p className="text-[10px] text-[#94A3B8] mt-1">Create one above to get started</p></div>
            ) : (
              inspections.map((insp) => (
                <button key={insp.id} onClick={() => saveToInspection(insp.id)} disabled={saving} className="w-full text-left px-3 py-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#002855]/30 hover:bg-[#F8FAFC] transition-colors disabled:opacity-50" data-testid={`save-to-${insp.id}`}>
                  <p className="text-sm font-semibold text-[#002855] truncate">{insp.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#94A3B8]"><span>{insp.items?.length || 0} violations</span><span>{insp.created_at?.slice(0, 10)}</span></div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PHOTO PREVIEW (on-device) */}
      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            <DevicePhoto photoId={previewPhoto} alt="Photo" className="w-full h-auto max-h-[80vh] object-contain rounded" />
            <Button onClick={() => setPreviewPhoto(null)} className="w-full mt-2 bg-[#002855] text-white">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
