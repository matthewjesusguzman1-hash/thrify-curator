import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calculator, Scale, AlertTriangle, Info, X, Download, Share2, FolderPlus, Plus, Trash2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

/* ================================================================
   BRIDGE DATA
   ================================================================ */
const BD = {4:{2:34000},5:{2:34000},6:{2:34000},7:{2:34000},8:{2:34000,3:42000},9:{2:39000,3:42500},10:{2:40000,3:43500},11:{3:44000},12:{3:45000,4:50000},13:{3:45500,4:50500},14:{3:46500,4:51500},15:{3:47000,4:52000},16:{3:48000,4:52500,5:58000},17:{3:48500,4:53500,5:58500},18:{3:49500,4:54000,5:59000},19:{3:50000,4:54500,5:60000},20:{3:51000,4:55500,5:60500},21:{3:51500,4:56000,5:61000},22:{3:52500,4:56500,5:61500},23:{3:53000,4:57500,5:62500},24:{3:54000,4:58000,5:63000},25:{3:54500,4:58500,5:63500,6:69000},26:{3:55500,4:59500,5:64000,6:69500},27:{3:56000,4:60000,5:65000,6:70000},28:{3:57000,4:60500,5:65500,6:71000},29:{3:57500,4:61500,5:66000,6:71500},30:{3:58500,4:62000,5:66500,6:72000},31:{3:59000,4:62500,5:67500,6:72500},32:{3:60000,4:63500,5:68000,6:73000},33:{4:64000,5:68500,6:74000},34:{4:64500,5:69000,6:74500},35:{4:65500,5:70000,6:75000},36:{4:66000,5:70500,6:75500},37:{4:66500,5:71000,6:76000,7:81500},38:{4:67500,5:72000,6:77000,7:82000},39:{4:68000,5:72500,6:77500,7:82500},40:{4:68500,5:73000,6:78000,7:83500},41:{4:69500,5:73500,6:78500,7:84000},42:{4:70000,5:74000,6:79000,7:84500},43:{4:70500,5:75000,6:80000,7:85000},44:{4:71500,5:75500,6:80500,7:85500},45:{4:72000,5:76000,6:81000,7:86000},46:{4:72500,5:76500,6:81500,7:87000},47:{4:73500,5:77500,6:82000,7:87500},48:{4:74000,5:78000,6:83000,7:88000},49:{4:74500,5:78500,6:83500,7:88500},50:{4:75500,5:79000,6:84000,7:89000},51:{4:76000,5:80000,6:84500,7:89500},52:{4:76500,5:80500,6:85500,7:90500},53:{4:77500,5:81000,6:86000,7:91000},54:{4:78000,5:81500,6:86500,7:91500},55:{4:78500,5:82500,6:87000,7:92000},56:{4:79500,5:83000,6:87500,7:92500},57:{4:80000,5:83500,6:88000,7:93000},58:{5:84000,6:89000,7:94000},59:{5:85000,6:89500,7:94500},60:{5:85500,6:90000,7:95000}};
const ALL_DIST = Object.keys(BD).map(Number).sort((a, b) => a - b);
const ALL_AX = [2, 3, 4, 5, 6, 7];

function bridgeLookup(dist, axles) {
  if (!dist || !axles) return null;
  const row = BD[dist];
  return row ? row[axles] || null : null;
}

function roundDist(ft, inches) {
  const f = parseInt(ft) || 0;
  const i = parseInt(inches) || 0;
  if (!f && !i) return null;
  return Math.round((f * 12 + i) / 12);
}

/* ================================================================
   WEIGHT RULES
   ================================================================ */
const RULES = [
  { title: "Maximum Allowable Weights", cfr: "§60-6,294", items: ["Any single axle — 20,000 lbs.", "Any tandem axle — 34,000 lbs.", "On State highways — 95,000 lbs.", "On Interstate — 80,000 lbs. or 95,000 lbs. with Conditional Interstate Use Permit"] },
  { title: "Tandem Axle", items: ["Any two consecutive axles whose centers are more than 40\" and not more than 96\" apart."] },
  { title: "Two-Axle Group (8' to 8'6\")", hl: true, items: ["Max gross load on any group of two axles, distance > 8' but < 8'6\", shall be 38,000 lbs."] },
  { title: "Measuring Distance", items: ["Measured to the nearest foot. At exactly 6\", round up.", "3 axle group max 34,000 lbs unless distance is at least 96\"."] },
  { title: "Tandem Exception (36'-38')", hl: true, items: ["Two consecutive tandem sets at 36'-38' may carry 34,000 lbs each."] },
  { title: "Weight Tolerance (5% Shift)", hl: true, items: ["5% shift if only one axle/group overweight and distance 12' or less."] },
  { title: "Dummy Axles", items: ["Disregarded if < 8,000 lbs or < 8% of gross including load."] },
  { title: "APU Allowance", items: ["Up to 550 lbs. Not in addition to 5% tolerance."] },
  { title: "Natural Gas Vehicles", items: ["Up to 2,000 lbs extra. Cannot exceed 82,000 lbs on Interstate."] },
];

const GROUP_PRESETS = [
  { label: "Single", axles: 1 },
  { label: "Tandem (2)", axles: 2 },
  { label: "Triple (3)", axles: 3 },
  { label: "Quad (4)", axles: 4 },
  { label: "Custom", axles: 0 },
];

/* ================================================================
   TRUCK DIAGRAM
   ================================================================ */
function TruckDiagram({ groups, grossWeight, totalDist, svgRef }) {
  const w = 720, h = 340;
  const mL = 70, mR = 70;
  const axleY = h - 85;
  const truckTop = 55;
  const truckH = axleY - truckTop - 30;

  // Build axle positions from groups
  let allAxles = [];
  let currentX = mL;
  const totalAxleCount = groups.reduce((s, g) => s + (parseInt(g.axles) || 0), 0);
  const usableW = w - mL - mR;
  const spacing = totalAxleCount > 1 ? usableW / (totalAxleCount - 1) : 0;

  let axleIdx = 0;
  groups.forEach((g, gi) => {
    const n = parseInt(g.axles) || 0;
    for (let i = 0; i < n; i++) {
      allAxles.push({ x: mL + axleIdx * spacing, weight: parseInt(g.weights?.[i]) || 0, groupIdx: gi, axleInGroup: i });
      axleIdx++;
    }
  });

  // Group spans for distance labels
  let groupSpans = [];
  let idx = 0;
  groups.forEach((g, gi) => {
    const n = parseInt(g.axles) || 0;
    if (n > 0) {
      const start = allAxles[idx]?.x || 0;
      const end = allAxles[idx + n - 1]?.x || start;
      groupSpans.push({ gi, start, end, label: g.label || `Group ${gi + 1}`, dist: g.distFt, n });
      idx += n;
    }
  });

  const colors = ["#D4AF37", "#3B82F6", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899"];

  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 300 }}>
      <rect width={w} height={h} fill="#0F172A" rx="12" />
      {/* Truck body */}
      {allAxles.length > 0 && (
        <>
          <rect x={allAxles[0].x - 20} y={truckTop} width={Math.max((allAxles[allAxles.length - 1]?.x || 0) - allAxles[0].x + 40, 60)} height={truckH} rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
          <rect x={allAxles[0].x - 20} y={truckTop + 10} width={50} height={truckH - 10} rx="6" fill="#1E293B" stroke="#D4AF37" strokeWidth="0.8" opacity="0.4" />
        </>
      )}
      {/* Gross weight */}
      <text x={w / 2} y={truckTop + truckH / 2 - 6} textAnchor="middle" fill="#8FAEC5" fontSize="9" fontWeight="bold">GROSS</text>
      <text x={w / 2} y={truckTop + truckH / 2 + 14} textAnchor="middle" fill="#D4AF37" fontSize="18" fontWeight="900" fontFamily="monospace">
        {grossWeight ? `${grossWeight.toLocaleString()}` : "—"}
      </text>
      {/* Group distance lines */}
      {groupSpans.map((gs, i) => gs.n > 1 && (
        <g key={`gd-${i}`}>
          <line x1={gs.start} y1={axleY + 30} x2={gs.end} y2={axleY + 30} stroke={colors[i % colors.length]} strokeWidth="1.5" opacity="0.6" />
          <line x1={gs.start} y1={axleY + 24} x2={gs.start} y2={axleY + 36} stroke={colors[i % colors.length]} strokeWidth="1" opacity="0.6" />
          <line x1={gs.end} y1={axleY + 24} x2={gs.end} y2={axleY + 36} stroke={colors[i % colors.length]} strokeWidth="1" opacity="0.6" />
          <text x={(gs.start + gs.end) / 2} y={axleY + 48} textAnchor="middle" fill={colors[i % colors.length]} fontSize="9" fontWeight="bold">
            {gs.dist ? `${gs.dist}ft` : ""} {gs.label}
          </text>
        </g>
      ))}
      {/* Overall distance */}
      {allAxles.length > 1 && totalDist && (
        <>
          <line x1={allAxles[0].x} y1={axleY + 60} x2={allAxles[allAxles.length - 1].x} y2={axleY + 60} stroke="#64748B" strokeWidth="1" />
          <text x={(allAxles[0].x + allAxles[allAxles.length - 1].x) / 2} y={axleY + 75} textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="bold">{totalDist} ft overall</text>
        </>
      )}
      {/* Axles */}
      {allAxles.map((a, i) => (
        <g key={i}>
          <line x1={a.x} y1={axleY - 16} x2={a.x} y2={axleY + 6} stroke="#94A3B8" strokeWidth="2" />
          <circle cx={a.x - 9} cy={axleY + 6} r="7" fill="#334155" stroke="#64748B" strokeWidth="1.2" />
          <circle cx={a.x + 9} cy={axleY + 6} r="7" fill="#334155" stroke="#64748B" strokeWidth="1.2" />
          <text x={a.x} y={truckTop - 8} textAnchor="middle" fill={a.weight > 0 ? "#FFFFFF" : "#475569"} fontSize="11" fontWeight="bold" fontFamily="monospace">
            {a.weight > 0 ? a.weight.toLocaleString() : ""}
          </text>
          <rect x={a.x - 2} y={axleY - 18} width="4" height="2" fill={colors[a.groupIdx % colors.length]} rx="1" />
        </g>
      ))}
    </svg>
  );
}

/* ================================================================
   VIOLATION CARD
   ================================================================ */
function ViolationCard({ label, actual, max, tolerance }) {
  if (!actual || !max) return null;
  const over = actual - max;
  const tol = tolerance ? Math.round(max * 1.05) : max;
  const isOver = over > 0;
  const withinTol = tolerance && actual > max && actual <= tol;

  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${isOver ? withinTol ? "bg-[#FFF7ED] border border-[#F97316]/30" : "bg-[#FEE2E2] border border-[#EF4444]/30" : "bg-[#F0FDF4] border border-[#16A34A]/30"}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#334155]">{label}</span>
        <span className="font-bold text-[#002855]">{max.toLocaleString()} max</span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[#64748B]">Actual: {actual.toLocaleString()}</span>
        {isOver ? (
          <span className="font-black text-[#DC2626] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />+{over.toLocaleString()}</span>
        ) : (
          <span className="text-[#16A34A] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Legal</span>
        )}
      </div>
      {withinTol && <p className="text-[10px] text-[#F97316] mt-1">Within 5% tolerance ({tol.toLocaleString()} lbs)</p>}
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function BridgeChartPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const svgRef = useRef(null);
  const photoRef = useRef(null);

  const [tab, setTab] = useState("chart"); // chart | record
  const [showRules, setShowRules] = useState(false);

  // ===== CHART TAB =====
  const [cFt, setCFt] = useState("");
  const [cIn, setCIn] = useState("");
  const [cAxles, setCAxles] = useState("");
  const [cActual, setCActual] = useState("");
  const cRound = useMemo(() => roundDist(cFt, cIn), [cFt, cIn]);
  const cResult = useMemo(() => {
    if (!cRound || !cAxles) return null;
    const a = parseInt(cAxles);
    const max = bridgeLookup(cRound, a);
    if (!max) return { dist: cRound, axles: a, max: null };
    const act = parseInt(cActual) || 0;
    const over = act > 0 ? act - max : 0;
    return { dist: cRound, axles: a, max, actual: act || null, over: Math.max(0, over), tol: Math.round(max * 1.05), withinTol: act > max && act <= max * 1.05 };
  }, [cRound, cAxles, cActual]);
  const cLocked = cResult?.max != null;

  // ===== RECORD TAB =====
  const [isCustom, setIsCustom] = useState(false);
  const [showViolations, setShowViolations] = useState(true);
  const [groups, setGroups] = useState([{ label: "Steer", preset: "Single", axles: "1", distFt: "", distIn: "", weights: [""], maxOverride: "" }]);
  const [overallDistFt, setOverallDistFt] = useState("");
  const [overallDistIn, setOverallDistIn] = useState("");
  const [customGrossMax, setCustomGrossMax] = useState("");
  const [photos, setPhotos] = useState([]);
  const [showInspPicker, setShowInspPicker] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const addGroup = () => setGroups(prev => [...prev, { label: "", preset: "Tandem (2)", axles: "2", distFt: "", distIn: "", weights: ["", ""], maxOverride: "" }]);
  const removeGroup = (i) => setGroups(prev => prev.filter((_, j) => j !== i));

  const updateGroup = (i, field, val) => {
    setGroups(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      if (field === "preset") {
        const p = GROUP_PRESETS.find(g => g.label === val);
        if (p && p.axles > 0) {
          next[i].axles = String(p.axles);
          const n = p.axles;
          next[i].weights = Array.from({ length: n }, (_, k) => next[i].weights?.[k] || "");
        }
      }
      if (field === "axles") {
        const n = parseInt(val) || 0;
        next[i].weights = Array.from({ length: n }, (_, k) => next[i].weights?.[k] || "");
      }
      return next;
    });
  };

  const updateWeight = (gi, wi, val) => {
    setGroups(prev => {
      const next = [...prev];
      const w = [...(next[gi].weights || [])];
      w[wi] = val;
      next[gi] = { ...next[gi], weights: w };
      return next;
    });
  };

  // Computed values for record tab
  const record = useMemo(() => {
    const totalAxles = groups.reduce((s, g) => s + (parseInt(g.axles) || 0), 0);
    const allWeights = groups.flatMap(g => (g.weights || []).map(w => parseInt(w) || 0));
    const gross = allWeights.reduce((s, w) => s + w, 0);
    const overallRound = roundDist(overallDistFt, overallDistIn);

    // Violations per group
    const groupViolations = groups.map((g, gi) => {
      const n = parseInt(g.axles) || 0;
      const gWeight = (g.weights || []).reduce((s, w) => s + (parseInt(w) || 0), 0);
      const gDistRound = roundDist(g.distFt, g.distIn);
      let max = null;
      let source = "";

      if (isCustom && g.maxOverride) {
        max = parseInt(g.maxOverride);
        source = "Custom";
      } else if (n === 1) {
        max = 20000;
        source = "Single axle max";
      } else if (n === 2 && gDistRound) {
        const lookup = bridgeLookup(gDistRound, 2);
        if (lookup) { max = lookup; source = `Bridge (${gDistRound}ft, 2ax)`; }
        else if (!isCustom) { max = 34000; source = "Tandem max"; }
      } else if (n >= 2 && gDistRound) {
        const lookup = bridgeLookup(gDistRound, n);
        if (lookup) { max = lookup; source = `Bridge (${gDistRound}ft, ${n}ax)`; }
      }

      return { gi, label: g.label || `Group ${gi + 1}`, actual: gWeight, max, source, n, distRound: gDistRound };
    });

    // Gross violation
    let grossMax = null;
    let grossSource = "";
    if (isCustom && customGrossMax) {
      grossMax = parseInt(customGrossMax);
      grossSource = "Custom";
    } else if (overallRound && totalAxles >= 2) {
      const lookup = bridgeLookup(overallRound, totalAxles);
      if (lookup) { grossMax = lookup; grossSource = `Bridge (${overallRound}ft, ${totalAxles}ax)`; }
    }

    // Validate for diagram
    const conflicts = [];
    if (totalAxles < 1) conflicts.push("No axles defined");
    groups.forEach((g, i) => {
      const n = parseInt(g.axles) || 0;
      const d = roundDist(g.distFt, g.distIn);
      if (n > 1 && !d && !isCustom) conflicts.push(`${g.label || `Group ${i + 1}`}: distance required for ${n} axles`);
      if (!isCustom && n >= 2 && d) {
        if (d < 4 || d > 60) conflicts.push(`${g.label || `Group ${i + 1}`}: ${d}ft is outside bridge chart range (4-60)`);
        else if (!bridgeLookup(d, n)) conflicts.push(`${g.label || `Group ${i + 1}`}: no bridge data for ${d}ft with ${n} axles`);
      }
    });

    return { totalAxles, gross, overallRound, groupViolations, grossMax, grossSource, conflicts, valid: conflicts.length === 0 && totalAxles > 0 };
  }, [groups, overallDistFt, overallDistIn, isCustom, customGrossMax]);

  // Photo handling
  const handlePhoto = (e) => {
    Array.from(e.target.files || []).forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => setPhotos(p => [...p, { dataUrl: ev.target.result, file: f }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  // Export
  const getSvgBlob = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return null;
    const data = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1440; canvas.height = 680;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    return new Promise(r => { img.onload = () => { ctx.drawImage(img, 0, 0, 1440, 680); canvas.toBlob(r, "image/png"); }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data); });
  }, []);

  const downloadDiagram = async () => { const b = await getSvgBlob(); if (!b) return; const l = document.createElement("a"); l.download = `weight-${new Date().toISOString().slice(0, 10)}.png`; l.href = URL.createObjectURL(b); l.click(); toast.success("Saved"); };
  const shareDiagram = async () => { const b = await getSvgBlob(); if (!b) return; try { const f = new File([b], "weight.png", { type: "image/png" }); if (navigator.share?.({ files: [f] })) await navigator.share({ files: [f] }); else downloadDiagram(); } catch { downloadDiagram(); } };

  const openInspPicker = async () => {
    setShowInspPicker(true);
    try { const r = await fetch(`${API}/api/inspections?badge=${badge}`); if (r.ok) { const d = await r.json(); setInspections(d.inspections || []); } } catch {}
  };
  const addToInsp = async (id) => {
    setSaving(true);
    const b = await getSvgBlob();
    if (b) { const fd = new FormData(); fd.append("file", b, "weight.png"); await fetch(`${API}/api/inspections/${id}/annotated-photos`, { method: "POST", body: fd }); }
    for (const p of photos) { if (p.file) { const fd = new FormData(); fd.append("file", p.file, p.file.name); await fetch(`${API}/api/inspections/${id}/annotated-photos`, { method: "POST", body: fd }); } }
    toast.success("Added to inspection"); setShowInspPicker(false); setSaving(false);
  };
  const createAndAdd = async () => {
    setSaving(true);
    try { const r = await fetch(`${API}/api/inspections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newInspTitle.trim() || `Weight Record ${new Date().toLocaleDateString()}`, badge }) }); if (r.ok) { const i = await r.json(); setNewInspTitle(""); await addToInsp(i.id); } } catch {}
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="bridge-chart-page">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-white/10 h-8 px-2"><ChevronLeft className="w-4 h-4" /></Button>
            <h1 className="text-sm sm:text-lg font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Bridge Chart</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} className={`text-xs h-8 px-3 ${showRules ? "bg-[#D4AF37] text-[#002855]" : "text-[#D4AF37] hover:bg-white/10"}`} data-testid="toggle-rules-btn">
              <Info className="w-3.5 h-3.5 mr-1" />Rules
            </Button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-3 sm:px-6 flex gap-1 pb-2">
          {[["chart", "Bridge Chart"], ["record", "Record Weights"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${tab === k ? "bg-[#D4AF37] text-[#002855]" : "text-white/50 hover:text-white/80"}`} data-testid={`tab-${k}`}>{l}</button>
          ))}
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {/* RULES */}
        {showRules && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Scale className="w-4 h-4 text-[#D4AF37]" /><h2 className="text-sm font-bold text-white">Size & Weight Rules</h2></div>
              <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {RULES.map((r, i) => (
                <div key={i} className={`px-4 py-2.5 ${r.hl ? "bg-[#D4AF37]/5" : ""}`}>
                  <h3 className="text-xs font-bold text-[#002855] mb-1">{r.title}{r.cfr && <span className="ml-1 text-[10px] font-mono text-[#D4AF37]">{r.cfr}</span>}</h3>
                  {r.items.map((it, j) => <p key={j} className="text-[11px] text-[#475569] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#CBD5E1]">{it}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== CHART TAB ========== */}
        {tab === "chart" && (
          <>
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="bg-[#002855] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-[#D4AF37]" /><h2 className="text-sm font-bold text-white">Bridge Weight Calculator</h2></div>
                {cLocked && <button onClick={() => { setCFt(""); setCIn(""); setCAxles(""); setCActual(""); }} className="text-xs text-white/50 hover:text-white flex items-center gap-1"><X className="w-3 h-3" />Clear</button>}
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Feet</label>
                    <input type="number" inputMode="numeric" value={cFt} onChange={e => setCFt(e.target.value)} placeholder="0" disabled={cLocked}
                      className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-feet" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B]/50 uppercase block mb-1">Inches <span className="font-normal normal-case">(optional)</span></label>
                    <input type="number" inputMode="numeric" value={cIn} onChange={e => setCIn(e.target.value)} placeholder="rounds to ft" disabled={cLocked}
                      className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none placeholder:text-[9px] placeholder:font-normal placeholder:text-[#CBD5E1] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] text-[#64748B]/60" data-testid="calc-inches" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Axles</label>
                    <select value={cAxles} onChange={e => setCAxles(e.target.value)} disabled={cLocked}
                      className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none bg-white disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-axles">
                      <option value="">—</option>
                      {ALL_AX.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Actual (lbs)</label>
                    <input type="number" inputMode="numeric" value={cActual} onChange={e => setCActual(e.target.value)} placeholder="—"
                      className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" data-testid="calc-actual" />
                  </div>
                </div>
                {cRound != null && cIn && parseInt(cIn) > 0 && (
                  <p className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 rounded-md px-3 py-1.5 font-medium">{cFt}'{cIn}" rounds to <strong>{cRound} ft</strong> — measured to nearest foot. At exactly 6", round up.</p>
                )}
                {cResult && (
                  <div className={`rounded-lg p-3 ${!cResult.max ? "bg-[#FEF3C7] border border-[#F59E0B]/30" : cResult.over > 0 ? cResult.withinTol ? "bg-[#FFF7ED] border border-[#F97316]/30" : "bg-[#FEE2E2] border border-[#EF4444]/30" : "bg-[#F0FDF4] border border-[#16A34A]/30"}`}>
                    {!cResult.max ? <p className="text-xs text-[#92400E] font-medium">No data for {cResult.dist}ft / {cResult.axles} axles</p> : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between"><span className="text-[10px] text-[#64748B] uppercase font-bold">Max Legal</span><span className="text-lg font-black text-[#002855]">{cResult.max.toLocaleString()} lbs</span></div>
                        {cResult.actual && (<>
                          <div className="h-px bg-black/10" />
                          <div className="flex items-center justify-between"><span className="text-[10px] text-[#64748B] uppercase font-bold">Actual</span><span className="text-sm font-bold">{cResult.actual.toLocaleString()} lbs</span></div>
                          {cResult.over > 0 ? (<><div className="flex items-center justify-between"><span className="text-[10px] uppercase font-bold text-[#DC2626] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Overweight</span><span className="text-sm font-black text-[#DC2626]">+{cResult.over.toLocaleString()}</span></div>{cResult.withinTol && <p className="text-[10px] text-[#F97316]">Within 5% tolerance ({cResult.tol.toLocaleString()} lbs)</p>}</>)
                            : <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#16A34A]" /><span className="text-[10px] font-bold text-[#16A34A] uppercase">Legal</span></div>}
                        </>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* TABLE */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0]"><h2 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Bridge Chart — Max Load (lbs)</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#002855] text-white">
                      <th className="px-3 py-2.5 text-left font-bold text-[10px] uppercase sticky left-0 bg-[#002855] z-20">Dist</th>
                      {ALL_AX.map(a => <th key={a} className={`px-3 py-2.5 text-right font-bold text-[10px] uppercase ${cLocked && cResult.axles === a ? "bg-[#D4AF37] text-[#002855]" : ""}`}>{a} Ax</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_DIST.map(d => {
                      const row = BD[d]; const isRow = cLocked && d === cResult.dist;
                      return (<tr key={d} className={`border-b border-[#F1F5F9] ${isRow ? "bg-[#D4AF37]/15" : d % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]"}`}>
                        <td className={`px-3 py-2 font-bold sticky left-0 z-10 ${isRow ? "text-[#002855] bg-[#D4AF37]/15" : "text-[#002855] bg-inherit"}`}>{d}</td>
                        {ALL_AX.map(a => { const isCell = cLocked && d === cResult.dist && a === cResult.axles; return (
                          <td key={a} className={`px-3 py-2 text-right tabular-nums ${isCell ? "bg-[#D4AF37] text-[#002855] font-black text-sm" : ""}`}>{row[a] ? <span className={isCell ? "" : "text-[#334155] font-medium"}>{row[a].toLocaleString()}</span> : <span className="text-[#E2E8F0]">—</span>}</td>
                        );})}
                      </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ========== RECORD TAB ========== */}
        {tab === "record" && (
          <>
            {/* Mode + Violation toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsCustom(false)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${!isCustom ? "bg-[#002855] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`} data-testid="mode-bridge">Bridge Formula</button>
                <button onClick={() => setIsCustom(true)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${isCustom ? "bg-[#002855] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`} data-testid="mode-custom">Custom / Permit</button>
              </div>
              <button onClick={() => setShowViolations(!showViolations)} className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]" data-testid="toggle-violations">
                {showViolations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showViolations ? "Violations On" : "Violations Off"}
              </button>
            </div>

            {/* Axle Groups */}
            <div className="space-y-3">
              {groups.map((g, gi) => (
                <div key={gi} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: ["#D4AF37", "#3B82F6", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899"][gi % 6] }} />
                      <input type="text" value={g.label} onChange={e => updateGroup(gi, "label", e.target.value)} placeholder="Group name..." className="text-xs font-bold text-[#002855] bg-transparent outline-none w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={g.preset} onChange={e => updateGroup(gi, "preset", e.target.value)} className="text-[10px] bg-white border border-[#E2E8F0] rounded px-2 py-1 outline-none">
                        {GROUP_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                      {groups.length > 1 && <button onClick={() => removeGroup(gi)} className="text-[#94A3B8] hover:text-[#DC2626] p-0.5"><Trash2 className="w-3 h-3" /></button>}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Axles</label>
                        <input type="number" inputMode="numeric" min="1" max="7" value={g.axles} onChange={e => updateGroup(gi, "axles", e.target.value)}
                          className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Dist (ft)</label>
                        <input type="number" inputMode="numeric" value={g.distFt} onChange={e => updateGroup(gi, "distFt", e.target.value)} placeholder="—"
                          className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" />
                      </div>
                      {isCustom && (
                        <div>
                          <label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Max (lbs)</label>
                          <input type="number" inputMode="numeric" value={g.maxOverride} onChange={e => updateGroup(gi, "maxOverride", e.target.value)} placeholder="Custom"
                            className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" />
                        </div>
                      )}
                    </div>
                    {/* Axle weights */}
                    <div className="flex gap-1.5 flex-wrap">
                      {(g.weights || []).map((wt, wi) => (
                        <div key={wi} className="flex-1 min-w-[60px]">
                          <span className="text-[8px] text-[#94A3B8] font-bold block mb-0.5">A{wi + 1}</span>
                          <input type="number" inputMode="numeric" value={wt} onChange={e => updateWeight(gi, wi, e.target.value)} placeholder="lbs"
                            className="w-full px-2 py-1.5 text-[11px] font-bold text-center rounded border border-[#E2E8F0] outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addGroup} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-[#E2E8F0] text-xs font-medium text-[#94A3B8] hover:border-[#002855] hover:text-[#002855] transition-colors" data-testid="add-group">
                <Plus className="w-3.5 h-3.5" />Add Axle Group
              </button>
            </div>

            {/* Overall distance + gross */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Overall Dist (ft)</label>
                  <input type="number" inputMode="numeric" value={overallDistFt} onChange={e => setOverallDistFt(e.target.value)} placeholder="—"
                    className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" data-testid="overall-dist" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#002855] uppercase block mb-0.5">Gross Weight</label>
                  <div className="px-2 py-2 text-sm font-black text-center text-[#002855] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" data-testid="gross-total">
                    {record.gross > 0 ? record.gross.toLocaleString() : "—"}
                  </div>
                </div>
                {isCustom && (
                  <div>
                    <label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Gross Max (lbs)</label>
                    <input type="number" inputMode="numeric" value={customGrossMax} onChange={e => setCustomGrossMax(e.target.value)} placeholder="Custom"
                      className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" data-testid="gross-max-custom" />
                  </div>
                )}
              </div>
            </div>

            {/* Violations */}
            {showViolations && record.gross > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-1">Violations</h3>
                {record.groupViolations.map((v, i) => v.max && v.actual > 0 && (
                  <ViolationCard key={i} label={v.label} actual={v.actual} max={v.max} tolerance={!isCustom} />
                ))}
                {record.grossMax && record.gross > 0 && (
                  <ViolationCard label={`Gross (${record.grossSource})`} actual={record.gross} max={record.grossMax} tolerance={!isCustom} />
                )}
                {record.groupViolations.every(v => !v.max || v.actual <= (v.max || Infinity)) && (!record.grossMax || record.gross <= record.grossMax) && record.gross > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] border border-[#16A34A]/30 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                    <span className="text-xs font-bold text-[#16A34A]">All weights within legal limits</span>
                  </div>
                )}
              </div>
            )}

            {/* Conflicts */}
            {!record.valid && record.conflicts.length > 0 && !isCustom && (
              <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg px-3 py-2 space-y-1">
                <p className="text-[10px] font-bold text-[#92400E] uppercase">Cannot generate diagram:</p>
                {record.conflicts.map((c, i) => <p key={i} className="text-[11px] text-[#92400E] flex items-center gap-1"><XCircle className="w-3 h-3 flex-shrink-0" />{c}</p>)}
              </div>
            )}

            {/* Truck Diagram */}
            {(record.valid || isCustom) && record.totalAxles > 0 && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#002855] uppercase">Weight Diagram</h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={downloadDiagram} className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={shareDiagram} className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]"><Share2 className="w-3.5 h-3.5" /></button>
                    <button onClick={openInspPicker} className="p-1.5 rounded-md text-[#D4AF37] hover:bg-[#D4AF37]/10"><FolderPlus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="p-2">
                  <TruckDiagram groups={groups} grossWeight={record.gross} totalDist={record.overallRound} svgRef={svgRef} />
                </div>
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Photos</span>
                    <button onClick={() => photoRef.current?.click()} className="flex items-center gap-1 text-[10px] text-[#002855] font-medium hover:underline"><Plus className="w-3 h-3" />Add</button>
                    <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} />
                  </div>
                  {photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {photos.map((p, i) => (
                        <div key={i} className="relative flex-shrink-0">
                          <img src={p.dataUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E2E8F0]" />
                          <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Inspection Picker */}
      {showInspPicker && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowInspPicker(false)}>
          <div className="bg-[#0F1D2F] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[70vh] overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Add to Inspection</h3>
              <button onClick={() => setShowInspPicker(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-3 pt-3 pb-2 border-b border-white/10">
              <div className="flex gap-1.5">
                <input type="text" value={newInspTitle} onChange={e => setNewInspTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createAndAdd()} placeholder="New inspection name..."
                  className="flex-1 px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs placeholder:text-white/30 outline-none" />
                <button onClick={createAndAdd} disabled={saving} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold disabled:opacity-50">{saving ? "..." : "Create & Add"}</button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {inspections.map(insp => (
                <button key={insp.id} onClick={() => addToInsp(insp.id)} disabled={saving} className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 text-left">
                  <div><p className="text-xs font-medium text-white truncate">{insp.title}</p><p className="text-[10px] text-white/30">{new Date(insp.created_at).toLocaleDateString()}</p></div>
                  <FolderPlus className="w-4 h-4 text-white/20" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
