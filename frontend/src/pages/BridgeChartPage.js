import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calculator, Scale, AlertTriangle, Info, X, Download, Share2, FolderPlus, Plus, Trash2, Eye, EyeOff, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

const BD = {4:{2:34000},5:{2:34000},6:{2:34000},7:{2:34000},8:{2:34000,3:42000},9:{2:39000,3:42500},10:{2:40000,3:43500},11:{3:44000},12:{3:45000,4:50000},13:{3:45500,4:50500},14:{3:46500,4:51500},15:{3:47000,4:52000},16:{3:48000,4:52500,5:58000},17:{3:48500,4:53500,5:58500},18:{3:49500,4:54000,5:59000},19:{3:50000,4:54500,5:60000},20:{3:51000,4:55500,5:60500},21:{3:51500,4:56000,5:61000},22:{3:52500,4:56500,5:61500},23:{3:53000,4:57500,5:62500},24:{3:54000,4:58000,5:63000},25:{3:54500,4:58500,5:63500,6:69000},26:{3:55500,4:59500,5:64000,6:69500},27:{3:56000,4:60000,5:65000,6:70000},28:{3:57000,4:60500,5:65500,6:71000},29:{3:57500,4:61500,5:66000,6:71500},30:{3:58500,4:62000,5:66500,6:72000},31:{3:59000,4:62500,5:67500,6:72500},32:{3:60000,4:63500,5:68000,6:73000},33:{4:64000,5:68500,6:74000},34:{4:64500,5:69000,6:74500},35:{4:65500,5:70000,6:75000},36:{4:66000,5:70500,6:75500},37:{4:66500,5:71000,6:76000,7:81500},38:{4:67500,5:72000,6:77000,7:82000},39:{4:68000,5:72500,6:77500,7:82500},40:{4:68500,5:73000,6:78000,7:83500},41:{4:69500,5:73500,6:78500,7:84000},42:{4:70000,5:74000,6:79000,7:84500},43:{4:70500,5:75000,6:80000,7:85000},44:{4:71500,5:75500,6:80500,7:85500},45:{4:72000,5:76000,6:81000,7:86000},46:{4:72500,5:76500,6:81500,7:87000},47:{4:73500,5:77500,6:82000,7:87500},48:{4:74000,5:78000,6:83000,7:88000},49:{4:74500,5:78500,6:83500,7:88500},50:{4:75500,5:79000,6:84000,7:89000},51:{4:76000,5:80000,6:84500,7:89500},52:{4:76500,5:80500,6:85500,7:90500},53:{4:77500,5:81000,6:86000,7:91000},54:{4:78000,5:81500,6:86500,7:91500},55:{4:78500,5:82500,6:87000,7:92000},56:{4:79500,5:83000,6:87500,7:92500},57:{4:80000,5:83500,6:88000,7:93000},58:{5:84000,6:89000,7:94000},59:{5:85000,6:89500,7:94500},60:{5:85500,6:90000,7:95000}};
const ALL_DIST = Object.keys(BD).map(Number).sort((a, b) => a - b);
const ALL_AX = [2, 3, 4, 5, 6, 7];
function bridgeLookup(d, a) { return d && a && BD[d] ? BD[d][a] || null : null; }
function roundDist(ft, inc) { const f = parseInt(ft) || 0, i = parseInt(inc) || 0; if (!f && !i) return null; return Math.round((f * 12 + i) / 12); }

const RULES = [
  { title: "Maximum Allowable Weights", cfr: "§60-6,294", items: ["Any single axle — 20,000 lbs.", "Any tandem axle — 34,000 lbs.", "On State highways — 95,000 lbs.", "On Interstate — 80,000 lbs. or 95,000 lbs. with Conditional Interstate Use Permit"] },
  { title: "Tandem Axle", items: ["Any two consecutive axles whose centers are more than 40\" and not more than 96\" apart."] },
  { title: "Two-Axle Group (8' to 8'6\")", hl: true, items: ["Max gross load on group of two axles, distance > 8' but < 8'6\", shall be 38,000 lbs."] },
  { title: "Measuring Distance", items: ["Measured to the nearest foot. At exactly 6\", round up.", "3 axle group max 34,000 lbs unless distance at least 96\"."] },
  { title: "Tandem Exception (36'-38')", hl: true, items: ["Two consecutive tandem sets at 36'-38' may carry 34,000 lbs each."] },
  { title: "Weight Tolerance (5% Shift)", hl: true, items: ["5% shift if only one axle/group overweight and distance 12' or less."] },
  { title: "Dummy Axles", items: ["Disregarded if < 8,000 lbs or < 8% of gross."] },
  { title: "APU Allowance", items: ["Up to 550 lbs. Not in addition to 5% tolerance."] },
  { title: "Natural Gas Vehicles", items: ["Up to 2,000 lbs extra. Max 82,000 lbs on Interstate."] },
];

const COLORS = ["#D4AF37", "#3B82F6", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899"];

/* ================================================================
   TRUCK DIAGRAM — improved with tight grouped axles
   ================================================================ */
function TruckDiagram({ groups, grossWeight, overallDist, svgRef }) {
  const w = 720, h = 360, mL = 70, mR = 70, axleY = h - 90, tTop = 55, tH = axleY - tTop - 30;

  // Build axle layout: groups are spaced apart, axles within a group are close
  const TIGHT = 22; // px between axles in same group
  const totalGroups = groups.filter(g => (parseInt(g.axles) || 0) > 0).length;
  const totalAxles = groups.reduce((s, g) => s + (parseInt(g.axles) || 0), 0);
  if (totalAxles === 0) return null;

  // Calculate total tight width and distribute remaining space as group gaps
  const groupSizes = groups.map(g => parseInt(g.axles) || 0).filter(n => n > 0);
  const totalTight = groupSizes.reduce((s, n) => s + (n - 1) * TIGHT, 0);
  const usable = w - mL - mR - totalTight;
  const gapCount = Math.max(totalGroups - 1, 1);
  const groupGap = totalGroups > 1 ? usable / gapCount : 0;

  let allAxles = [];
  let runningAxleNum = 1;
  let x = mL;
  let groupMeta = [];

  groups.forEach((g, gi) => {
    const n = parseInt(g.axles) || 0;
    if (n === 0) return;
    const startAxleNum = runningAxleNum;
    const startX = x;
    for (let i = 0; i < n; i++) {
      allAxles.push({ x, axleNum: runningAxleNum, weight: parseInt(g.useGroup ? "" : g.weights?.[i]) || 0, groupIdx: gi, isSingle: n === 1 });
      runningAxleNum++;
      if (i < n - 1) x += TIGHT;
    }
    const endX = x;
    const endAxleNum = runningAxleNum - 1;
    const axleLabel = startAxleNum === endAxleNum ? `A${startAxleNum}` : `A${startAxleNum}-${endAxleNum}`;
    const gWeight = g.useGroup ? (parseInt(g.groupWeight) || 0) : (g.weights || []).reduce((s, wt) => s + (parseInt(wt) || 0), 0);
    groupMeta.push({ gi, startX, endX, label: g.label, axleLabel, distFt: roundDist(g.distFt, "0"), n, gWeight });
    if (gi < groups.length - 1) x += groupGap;
  });

  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 310 }}>
      <rect width={w} height={h} fill="#0F172A" rx="12" />
      {allAxles.length > 0 && (
        <>
          <rect x={allAxles[0].x - 25} y={tTop} width={Math.max(allAxles[allAxles.length - 1].x - allAxles[0].x + 50, 60)} height={tH} rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
          <rect x={allAxles[0].x - 25} y={tTop + 10} width={45} height={tH - 10} rx="6" fill="#1E293B" stroke="#D4AF37" strokeWidth="0.8" opacity="0.4" />
        </>
      )}
      <text x={w / 2} y={tTop + tH / 2 - 6} textAnchor="middle" fill="#8FAEC5" fontSize="9" fontWeight="bold">GROSS</text>
      <text x={w / 2} y={tTop + tH / 2 + 14} textAnchor="middle" fill="#D4AF37" fontSize="18" fontWeight="900" fontFamily="monospace">{grossWeight ? grossWeight.toLocaleString() : "—"}</text>
      {/* Axles — single wheel per axle */}
      {allAxles.map((a, i) => (
        <g key={i}>
          <line x1={a.x} y1={axleY - 14} x2={a.x} y2={axleY + 8} stroke="#94A3B8" strokeWidth="2.5" />
          <circle cx={a.x} cy={axleY + 9} r="7" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
          <rect x={a.x - 2} y={axleY - 17} width="4" height="2" fill={COLORS[a.groupIdx % COLORS.length]} rx="1" />
        </g>
      ))}
      {/* Group labels + weights above */}
      {groupMeta.map((gm, i) => {
        const cx = (gm.startX + gm.endX) / 2;
        return (
          <g key={`gm-${i}`}>
            <text x={cx} y={tTop - 18} textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="monospace">{gm.gWeight > 0 ? gm.gWeight.toLocaleString() : ""}</text>
            <text x={cx} y={tTop - 6} textAnchor="middle" fill={COLORS[i % COLORS.length]} fontSize="8" fontWeight="bold">{gm.axleLabel}</text>
            {gm.n > 1 && (
              <>
                <line x1={gm.startX} y1={axleY + 26} x2={gm.endX} y2={axleY + 26} stroke={COLORS[i % COLORS.length]} strokeWidth="1.5" opacity="0.6" />
                <line x1={gm.startX} y1={axleY + 20} x2={gm.startX} y2={axleY + 32} stroke={COLORS[i % COLORS.length]} strokeWidth="1" opacity="0.5" />
                <line x1={gm.endX} y1={axleY + 20} x2={gm.endX} y2={axleY + 32} stroke={COLORS[i % COLORS.length]} strokeWidth="1" opacity="0.5" />
                <text x={cx} y={axleY + 44} textAnchor="middle" fill={COLORS[i % COLORS.length]} fontSize="8" fontWeight="bold">
                  {gm.distFt ? `${gm.distFt}ft ` : ""}{gm.label || ""}
                </text>
              </>
            )}
            {gm.n === 1 && <text x={cx} y={axleY + 32} textAnchor="middle" fill={COLORS[i % COLORS.length]} fontSize="8" fontWeight="bold">{gm.label || ""}</text>}
          </g>
        );
      })}
      {/* Overall distance */}
      {allAxles.length > 1 && overallDist && (
        <>
          <line x1={allAxles[0].x} y1={axleY + 58} x2={allAxles[allAxles.length - 1].x} y2={axleY + 58} stroke="#64748B" strokeWidth="1" />
          <text x={(allAxles[0].x + allAxles[allAxles.length - 1].x) / 2} y={axleY + 72} textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="bold">{overallDist} ft overall</text>
        </>
      )}
    </svg>
  );
}

function ViolationCard({ label, actual, max, tolerance }) {
  if (!actual || !max) return null;
  const over = actual - max;
  const tol = tolerance ? Math.round(max * 1.05) : max;
  const isOver = over > 0;
  const withinTol = tolerance && actual > max && actual <= tol;
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${isOver ? withinTol ? "bg-[#FFF7ED] border border-[#F97316]/30" : "bg-[#FEE2E2] border border-[#EF4444]/30" : "bg-[#F0FDF4] border border-[#16A34A]/30"}`}>
      <div className="flex items-center justify-between"><span className="font-bold text-[#334155]">{label}</span><span className="font-bold text-[#002855]">{max.toLocaleString()} max</span></div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[#64748B]">Actual: {actual.toLocaleString()}</span>
        {isOver ? <span className="font-black text-[#DC2626] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />+{over.toLocaleString()}</span> : <span className="text-[#16A34A] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Legal</span>}
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
  const [tab, setTab] = useState("chart");
  const [showRules, setShowRules] = useState(false);

  // Chart tab
  const [cFt, setCFt] = useState(""); const [cIn, setCIn] = useState(""); const [cAxles, setCAxles] = useState(""); const [cActual, setCActual] = useState("");
  const cRound = useMemo(() => roundDist(cFt, cIn), [cFt, cIn]);
  const cResult = useMemo(() => {
    if (!cRound || !cAxles) return null;
    const a = parseInt(cAxles), max = bridgeLookup(cRound, a);
    if (!max) return { dist: cRound, axles: a, max: null };
    const act = parseInt(cActual) || 0, over = act > 0 ? act - max : 0;
    return { dist: cRound, axles: a, max, actual: act || null, over: Math.max(0, over), tol: Math.round(max * 1.05), withinTol: act > max && act <= max * 1.05 };
  }, [cRound, cAxles, cActual]);
  const cLocked = cResult?.max != null;

  // Record tab
  const [isCustom, setIsCustom] = useState(false);
  const [showViolations, setShowViolations] = useState(true);
  const [isInputsCollapsed, setIsInputsCollapsed] = useState(false);
  const captureRef = useRef(null);
  const makeGroup = (label, preset, axles) => ({
    label, preset, axles: String(axles), distFt: "", useGroup: axles > 1, groupWeight: "", weights: Array(axles).fill(""), maxOverride: "", dummyAxle: false
  });
  const [groups, setGroups] = useState([makeGroup("Steer", "Single", 1)]);
  const [overallDistFt, setOverallDistFt] = useState("");
  const [customGrossMax, setCustomGrossMax] = useState("");
  const [photos, setPhotos] = useState([]);
  const [showInspPicker, setShowInspPicker] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const addGroup = (preset = "Tandem (2)", axles = 2) => setGroups(p => [...p, makeGroup("", preset, axles)]);
  const removeGroup = (i) => setGroups(p => p.filter((_, j) => j !== i));
  const updateGroup = (i, field, val) => {
    setGroups(p => {
      const n = [...p]; n[i] = { ...n[i], [field]: val };
      if (field === "preset") {
        const map = { "Single": 1, "Tandem (2)": 2, "Triple (3)": 3, "Quad (4)": 4 };
        const ax = map[val] || 0;
        if (ax > 0) { n[i].axles = String(ax); n[i].useGroup = ax > 1; n[i].weights = Array(ax).fill(""); n[i].groupWeight = ""; n[i].dummyAxle = false; }
        if (val === "Custom") { n[i].useGroup = false; n[i].dummyAxle = false; }
      }
      if (field === "axles") { const c = parseInt(val) || 0; n[i].weights = Array(c).fill(""); n[i].useGroup = c > 1; n[i].groupWeight = ""; n[i].dummyAxle = false; }
      if (field === "dummyAxle") {
        // Expand/contract weights array to include/exclude the dummy axle slot
        const base = parseInt(n[i].axles) || 0;
        const target = val ? base + 1 : base;
        const cur = n[i].weights || [];
        const next = Array(target).fill("").map((_, k) => cur[k] || "");
        n[i].weights = next;
        n[i].useGroup = false; // force individual so tandem check can evaluate
        n[i].groupWeight = "";
      }
      return n;
    });
  };
  const updateWeight = (gi, wi, val) => setGroups(p => { const n = [...p]; const w = [...(n[gi].weights || [])]; w[wi] = val; n[gi] = { ...n[gi], weights: w }; return n; });

  // Effective axle count (includes dummy axle if present)
  const effAxles = (g) => (parseInt(g.axles) || 0) + (g.dummyAxle ? 1 : 0);

  // Compute sequential axle numbers (using effective count so dummy gets its own number)
  const axleNumbers = useMemo(() => {
    let num = 1;
    return groups.map(g => {
      const n = effAxles(g);
      const start = num;
      num += n;
      return { start, end: num - 1, count: n };
    });
  }, [groups]);

  const record = useMemo(() => {
    const totalAxles = groups.reduce((s, g) => s + effAxles(g), 0);
    let gross = 0;
    groups.forEach(g => {
      if (g.useGroup) gross += parseInt(g.groupWeight) || 0;
      else gross += (g.weights || []).reduce((s, w) => s + (parseInt(w) || 0), 0);
    });
    const overallRound = roundDist(overallDistFt, "0");

    const groupViolations = groups.map((g, gi) => {
      const baseN = parseInt(g.axles) || 0;
      const n = effAxles(g); // includes dummy for bridge calc
      const gWeight = g.useGroup ? (parseInt(g.groupWeight) || 0) : (g.weights || []).reduce((s, w) => s + (parseInt(w) || 0), 0);
      const gDist = roundDist(g.distFt, "0");
      let max = null, source = "";
      if (isCustom && g.maxOverride) { max = parseInt(g.maxOverride); source = "Custom"; }
      else if (n === 1) { max = 20000; source = "Single axle"; }
      else if (n === 2 && !gDist) { max = 34000; source = "Tandem"; }
      else if (n >= 2 && gDist) {
        const lk = bridgeLookup(gDist, n);
        if (lk) { max = lk; source = `Bridge (${gDist}ft, ${n}ax${g.dummyAxle ? " +dummy" : ""})`; }
        else if (n === 2) { max = 34000; source = "Tandem"; }
      }
      else if (n === 2) { max = 34000; source = "Tandem"; }

      // Secondary tandem check if dummy axle is active on a base-tandem group
      let tandemCheck = null;
      if (g.dummyAxle && baseN === 2 && !g.useGroup) {
        const wA = parseInt(g.weights?.[0]) || 0;
        const wB = parseInt(g.weights?.[1]) || 0;
        const tandemActual = wA + wB;
        if (tandemActual > 0) {
          tandemCheck = { actual: tandemActual, max: 34000, source: "Tandem (first 2 axles)" };
        }
      }

      const an = axleNumbers[gi];
      const axLabel = an.start === an.end ? `A${an.start}` : `A${an.start}-${an.end}`;
      return { gi, label: g.label || axLabel, actual: gWeight, max, source, n, distRound: gDist, tandemCheck };
    });

    let grossMax = null, grossSource = "";
    if (isCustom && customGrossMax) { grossMax = parseInt(customGrossMax); grossSource = "Custom"; }
    else if (overallRound && totalAxles >= 2) { const lk = bridgeLookup(overallRound, totalAxles); if (lk) { grossMax = lk; grossSource = `Bridge (${overallRound}ft, ${totalAxles}ax)`; } }

    const conflicts = [];
    if (totalAxles < 1) conflicts.push("No axles defined");
    if (!isCustom) groups.forEach((g, i) => {
      const n = effAxles(g), d = roundDist(g.distFt, "0");
      if (n > 1 && d && (d < 4 || d > 60)) conflicts.push(`${g.label || `Group ${i + 1}`}: ${d}ft outside bridge range (4-60)`);
      if (!isCustom && n >= 2 && d && !bridgeLookup(d, n)) conflicts.push(`${g.label || `Group ${i + 1}`}: no data for ${d}ft / ${n} axles`);
    });
    return { totalAxles, gross, overallRound, groupViolations, grossMax, grossSource, conflicts, valid: conflicts.length === 0 && totalAxles > 0 };
  }, [groups, overallDistFt, isCustom, customGrossMax, axleNumbers]);

  const handlePhoto = (e) => { Array.from(e.target.files || []).forEach(f => { const r = new FileReader(); r.onload = (ev) => setPhotos(p => [...p, { dataUrl: ev.target.result, file: f }]); r.readAsDataURL(f); }); e.target.value = ""; };

  // Capture the ENTIRE record tab content (violations, inputs, diagram) as a single PNG
  const getCaptureBlob = useCallback(async () => {
    const node = captureRef.current;
    if (!node) return null;
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#F0F2F5",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return await new Promise(r => canvas.toBlob(r, "image/png"));
    } catch (err) {
      console.error("Capture failed", err);
      return null;
    }
  }, []);

  const downloadDiag = async () => {
    const b = await getCaptureBlob();
    if (!b) { toast.error("Capture failed"); return; }
    const l = document.createElement("a");
    l.download = `weight-${new Date().toISOString().slice(0, 10)}.png`;
    l.href = URL.createObjectURL(b);
    l.click();
    toast.success("Saved");
  };
  const shareDiag = async () => {
    const b = await getCaptureBlob();
    if (!b) { toast.error("Capture failed"); return; }
    try {
      const f = new File([b], "weight.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f] });
      } else {
        downloadDiag();
      }
    } catch {
      downloadDiag();
    }
  };
  const openInspPicker = async () => { setShowInspPicker(true); try { const r = await fetch(`${API}/api/inspections?badge=${badge}`); if (r.ok) { const d = await r.json(); setInspections(d.inspections || []); } } catch {} };
  const addToInsp = async (id) => {
    setSaving(true);
    const b = await getCaptureBlob();
    if (b) {
      const fd = new FormData();
      fd.append("file", b, "weight.png");
      await fetch(`${API}/api/inspections/${id}/annotated-photos`, { method: "POST", body: fd });
    }
    for (const p of photos) {
      if (p.file) {
        const fd = new FormData();
        fd.append("file", p.file, p.file.name);
        await fetch(`${API}/api/inspections/${id}/annotated-photos`, { method: "POST", body: fd });
      }
    }
    toast.success("Added to inspection");
    setShowInspPicker(false);
    setSaving(false);
  };
  const createAndAdd = async () => { setSaving(true); try { const r = await fetch(`${API}/api/inspections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newInspTitle.trim() || `Weight ${new Date().toLocaleDateString()}`, badge }) }); if (r.ok) { const i = await r.json(); setNewInspTitle(""); await addToInsp(i.id); } } catch {} setSaving(false); };

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="bridge-chart-page">
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-white/10 h-8 px-2"><ChevronLeft className="w-4 h-4" /></Button>
            <h1 className="text-sm sm:text-lg font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Bridge Chart</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} className={`text-xs h-8 px-3 ${showRules ? "bg-[#D4AF37] text-[#002855]" : "text-[#D4AF37] hover:bg-white/10"}`} data-testid="toggle-rules-btn"><Info className="w-3.5 h-3.5 mr-1" />Rules</Button>
        </div>
        <div className="max-w-4xl mx-auto px-3 sm:px-6 flex gap-1 pb-2">
          {[["chart", "Bridge Chart"], ["record", "Record Weights"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${tab === k ? "bg-[#D4AF37] text-[#002855]" : "text-white/50 hover:text-white/80"}`} data-testid={`tab-${k}`}>{l}</button>
          ))}
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {showRules && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Scale className="w-4 h-4 text-[#D4AF37]" /><h2 className="text-sm font-bold text-white">Size & Weight Rules</h2></div><button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="divide-y divide-[#F1F5F9]">{RULES.map((r, i) => (<div key={i} className={`px-4 py-2.5 ${r.hl ? "bg-[#D4AF37]/5" : ""}`}><h3 className="text-xs font-bold text-[#002855] mb-1">{r.title}{r.cfr && <span className="ml-1 text-[10px] font-mono text-[#D4AF37]">{r.cfr}</span>}</h3>{r.items.map((it, j) => <p key={j} className="text-[11px] text-[#475569] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#CBD5E1]">{it}</p>)}</div>))}</div>
          </div>
        )}

        {/* ===== CHART TAB ===== */}
        {tab === "chart" && (<>
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#002855] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-[#D4AF37]" /><h2 className="text-sm font-bold text-white">Bridge Weight Calculator</h2></div>
              {cLocked && <button onClick={() => { setCFt(""); setCIn(""); setCAxles(""); setCActual(""); }} className="text-xs text-white/50 hover:text-white flex items-center gap-1"><X className="w-3 h-3" />Clear</button>}
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div><label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Feet</label><input type="number" inputMode="numeric" value={cFt} onChange={e => setCFt(e.target.value)} placeholder="0" disabled={cLocked} className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-feet" /></div>
                <div><label className="text-[10px] font-bold text-[#64748B]/50 uppercase block mb-1">Inches <span className="font-normal normal-case">(optional)</span></label><input type="number" inputMode="numeric" value={cIn} onChange={e => setCIn(e.target.value)} placeholder="rounds to ft" disabled={cLocked} className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none placeholder:text-[9px] placeholder:font-normal placeholder:text-[#CBD5E1] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] text-[#64748B]/60" data-testid="calc-inches" /></div>
                <div><label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Axles</label><select value={cAxles} onChange={e => setCAxles(e.target.value)} disabled={cLocked} className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none bg-white disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-axles"><option value="">—</option>{ALL_AX.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Actual (lbs)</label><input type="number" inputMode="numeric" value={cActual} onChange={e => setCActual(e.target.value)} placeholder="—" className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" data-testid="calc-actual" /></div>
              </div>
              {cRound != null && cIn && parseInt(cIn) > 0 && <p className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 rounded-md px-3 py-1.5 font-medium">{cFt}'{cIn}" rounds to <strong>{cRound} ft</strong> — measured to nearest foot. At exactly 6", round up.</p>}
              {cResult && (<div className={`rounded-lg p-3 ${!cResult.max ? "bg-[#FEF3C7] border border-[#F59E0B]/30" : cResult.over > 0 ? cResult.withinTol ? "bg-[#FFF7ED] border border-[#F97316]/30" : "bg-[#FEE2E2] border border-[#EF4444]/30" : "bg-[#F0FDF4] border border-[#16A34A]/30"}`}>
                {!cResult.max ? <p className="text-xs text-[#92400E] font-medium">No data for {cResult.dist}ft / {cResult.axles} axles</p> : (<div className="space-y-1.5">
                  <div className="flex items-center justify-between"><span className="text-[10px] text-[#64748B] uppercase font-bold">Max Legal</span><span className="text-lg font-black text-[#002855]">{cResult.max.toLocaleString()} lbs</span></div>
                  {cResult.actual && (<><div className="h-px bg-black/10" /><div className="flex items-center justify-between"><span className="text-[10px] text-[#64748B] uppercase font-bold">Actual</span><span className="text-sm font-bold">{cResult.actual.toLocaleString()} lbs</span></div>
                    {cResult.over > 0 ? (<><div className="flex items-center justify-between"><span className="text-[10px] uppercase font-bold text-[#DC2626] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Overweight</span><span className="text-sm font-black text-[#DC2626]">+{cResult.over.toLocaleString()}</span></div>{cResult.withinTol && <p className="text-[10px] text-[#F97316]">Within 5% tolerance ({cResult.tol.toLocaleString()} lbs)</p>}</>)
                      : <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#16A34A]" /><span className="text-[10px] font-bold text-[#16A34A] uppercase">Legal</span></div>}
                  </>)}
                </div>)}
              </div>)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Bridge Chart — Max Load (lbs)</h2>
              <p className="text-[10px] text-[#94A3B8]">Tap any cell to highlight</p>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="sticky top-0 z-10"><tr className="bg-[#002855] text-white"><th className="px-3 py-2.5 text-left font-bold text-[10px] uppercase sticky left-0 bg-[#002855] z-20">Dist (ft)</th>{ALL_AX.map(a => <th key={a} onClick={() => { setCAxles(String(a)); }} className={`px-3 py-2.5 text-right font-bold text-[10px] uppercase cursor-pointer hover:bg-[#D4AF37]/20 ${String(cAxles) === String(a) ? "bg-[#D4AF37] text-[#002855]" : ""}`} data-testid={`chart-col-${a}`}>{a} Ax</th>)}</tr></thead>
              <tbody>{ALL_DIST.map(d => { const row = BD[d]; const isRow = String(cFt) === String(d) && !cIn; return (<tr key={d} className={`border-b border-[#F1F5F9] ${isRow ? "bg-[#D4AF37]/15" : d % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]"}`}><td onClick={() => { setCFt(String(d)); setCIn(""); }} className={`px-3 py-2 font-bold sticky left-0 z-10 cursor-pointer hover:bg-[#D4AF37]/20 ${isRow ? "text-[#002855] bg-[#D4AF37]/15" : "text-[#002855] bg-inherit"}`} data-testid={`chart-row-${d}`}>{d}</td>{ALL_AX.map(a => { const isCell = String(cFt) === String(d) && !cIn && String(cAxles) === String(a); return <td key={a} onClick={() => { setCFt(String(d)); setCIn(""); setCAxles(String(a)); }} className={`px-3 py-2 text-right tabular-nums cursor-pointer hover:bg-[#D4AF37]/10 ${isCell ? "bg-[#D4AF37] text-[#002855] font-black text-sm" : ""}`} data-testid={`chart-cell-${d}-${a}`}>{row[a] ? <span className={isCell ? "" : "text-[#334155] font-medium"}>{row[a].toLocaleString()}</span> : <span className="text-[#E2E8F0]">—</span>}</td>; })}</tr>); })}</tbody>
            </table></div>
          </div>
        </>)}

        {/* ===== RECORD TAB ===== */}
        {tab === "record" && (<>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsCustom(false)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${!isCustom ? "bg-[#002855] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`} data-testid="mode-bridge">Bridge Formula</button>
              <button onClick={() => setIsCustom(true)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${isCustom ? "bg-[#002855] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`} data-testid="mode-custom">Custom / Permit</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsInputsCollapsed(v => !v)} className="flex items-center gap-1 text-[11px] font-bold text-[#002855]" data-testid="toggle-inputs-collapse">
                {isInputsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}{isInputsCollapsed ? "Show Inputs" : "Hide Inputs"}
              </button>
              <button onClick={() => setShowViolations(!showViolations)} className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]" data-testid="toggle-violations">
                {showViolations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}{showViolations ? "Violations On" : "Violations Off"}
              </button>
            </div>
          </div>

          {/* Everything below is captured together for Save/Share/Add to Inspection */}
          <div ref={captureRef} className="space-y-4" data-testid="record-capture-area">

          {/* Axle Groups */}
          {!isInputsCollapsed && (<>
          <div className="space-y-2">
            {groups.map((g, gi) => {
              const n = parseInt(g.axles) || 0;
              const an = axleNumbers[gi];
              const axLabel = an.count === 1 ? `Axle ${an.start}` : `Axles ${an.start}-${an.end}`;
              const gWeight = g.useGroup ? (parseInt(g.groupWeight) || 0) : (g.weights || []).reduce((s, w) => s + (parseInt(w) || 0), 0);
              // Inline violation
              const viol = record.groupViolations[gi];
              const hasViol = showViolations && viol && viol.max && gWeight > 0;
              const isOver = hasViol && gWeight > viol.max;
              const withinTol = hasViol && !isCustom && gWeight > viol.max && gWeight <= Math.round(viol.max * 1.05);
              const isCollapsed = g._collapsed && gWeight > 0;

              return (
                <div key={gi} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isOver ? withinTol ? "border-[#F97316]/40" : "border-[#EF4444]/40" : "border-[#E2E8F0]"}`}>
                  {/* Header — always visible, clickable to collapse/expand */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => updateGroup(gi, "_collapsed", !g._collapsed)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); updateGroup(gi, "_collapsed", !g._collapsed); } }}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[gi % COLORS.length] }} />
                      <span className="text-xs font-bold text-[#002855] truncate">{g.label || axLabel}</span>
                      <span className="text-[9px] text-[#94A3B8] font-mono flex-shrink-0">{axLabel}</span>
                      {gWeight > 0 && <span className="text-[10px] font-bold text-[#334155] flex-shrink-0">{gWeight.toLocaleString()} lbs</span>}
                      {isOver && (
                        <span className={`text-[9px] font-bold flex-shrink-0 flex items-center gap-0.5 ${withinTol ? "text-[#F97316]" : "text-[#DC2626]"}`}>
                          <AlertTriangle className="w-2.5 h-2.5" />+{(gWeight - viol.max).toLocaleString()}
                        </span>
                      )}
                      {hasViol && !isOver && gWeight > 0 && <CheckCircle2 className="w-3 h-3 text-[#16A34A] flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={g.preset} onClick={e => e.stopPropagation()} onChange={e => updateGroup(gi, "preset", e.target.value)} className="text-[10px] bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5 outline-none">
                        {[{ l: "Single", v: "Single" }, { l: "Tandem", v: "Tandem (2)" }, { l: "Triple", v: "Triple (3)" }, { l: "Quad", v: "Quad (4)" }, { l: "Custom", v: "Custom" }].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                      </select>
                      {groups.length > 1 && <button onClick={e => { e.stopPropagation(); removeGroup(gi); }} className="text-[#94A3B8] hover:text-[#DC2626] p-0.5"><Trash2 className="w-3 h-3" /></button>}
                    </div>
                  </div>

                  {/* Body — collapsible */}
                  {!isCollapsed && (
                    <div className="px-3 py-2 space-y-2">
                      {/* Config row */}
                      <div className="flex gap-2 items-end flex-wrap">
                        {g.preset === "Custom" && (
                          <div className="w-16"><label className="text-[8px] font-bold text-[#94A3B8] uppercase block">Axles</label><input type="number" inputMode="numeric" min="1" max="7" value={g.axles} onChange={e => updateGroup(gi, "axles", e.target.value)} className="w-full px-1.5 py-1.5 text-xs font-bold text-center rounded border border-[#E2E8F0] outline-none" /></div>
                        )}
                        <div className="w-16"><label className="text-[8px] font-bold text-[#94A3B8] uppercase block">Name</label><input type="text" value={g.label} onChange={e => updateGroup(gi, "label", e.target.value)} placeholder={axLabel} className="w-full px-1.5 py-1.5 text-xs font-bold text-center rounded border border-[#E2E8F0] outline-none placeholder:text-[#CBD5E1] placeholder:font-normal" /></div>
                        {n > 1 && <div className="w-20"><label className="text-[8px] font-bold text-[#94A3B8] uppercase block">Dist (ft)</label><input type="number" inputMode="numeric" value={g.distFt} onChange={e => updateGroup(gi, "distFt", e.target.value)} placeholder={n === 2 ? "Std" : "ft"} className="w-full px-1.5 py-1.5 text-xs font-bold text-center rounded border border-[#E2E8F0] outline-none placeholder:text-[#CBD5E1]" /></div>}
                        {isCustom && <div className="w-20"><label className="text-[8px] font-bold text-[#94A3B8] uppercase block">Max (lbs)</label><input type="number" inputMode="numeric" value={g.maxOverride} onChange={e => updateGroup(gi, "maxOverride", e.target.value)} placeholder="Custom" className="w-full px-1.5 py-1.5 text-xs font-bold text-center rounded border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" /></div>}
                        {n > 1 && (
                          <div className="flex gap-1 ml-auto">
                            <button onClick={() => updateGroup(gi, "useGroup", true)} className={`text-[9px] px-1.5 py-1 rounded ${g.useGroup ? "bg-[#002855] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>Group</button>
                            <button onClick={() => updateGroup(gi, "useGroup", false)} className={`text-[9px] px-1.5 py-1 rounded ${!g.useGroup ? "bg-[#002855] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>Individual</button>
                          </div>
                        )}
                      </div>

                      {/* Weight input */}
                      {n === 1 ? (
                        <input type="number" inputMode="numeric" value={g.weights?.[0] || ""} onChange={e => updateWeight(gi, 0, e.target.value)} placeholder="Weight (lbs)" className={`w-full px-2 py-2 text-xs font-bold text-center rounded-lg border outline-none ${isOver ? "border-[#EF4444]/50 bg-[#FEE2E2]/30" : "border-[#E2E8F0]"}`} />
                      ) : g.useGroup ? (
                        <input type="number" inputMode="numeric" value={g.groupWeight} onChange={e => updateGroup(gi, "groupWeight", e.target.value)} placeholder={`A${an.start},${an.end} combined (lbs)`} className={`w-full px-2 py-2 text-xs font-bold text-center rounded-lg border outline-none ${isOver ? "border-[#EF4444]/50 bg-[#FEE2E2]/30" : "border-[#E2E8F0]"}`} />
                      ) : (
                        <div className="flex gap-1.5">
                          {Array.from({ length: effAxles(g) }, (_, wi) => {
                            const isDummy = g.dummyAxle && parseInt(g.axles) === 2 && wi === 2;
                            return (
                              <div key={wi} className="flex-1 min-w-0">
                                <span className={`text-[7px] font-bold ${isDummy ? "text-[#D4AF37]" : "text-[#94A3B8]"}`}>A{an.start + wi}{isDummy ? " (dummy)" : ""}</span>
                                <input type="number" inputMode="numeric" value={g.weights?.[wi] || ""} onChange={e => updateWeight(gi, wi, e.target.value)} placeholder={isDummy ? "dummy lbs" : "lbs"} className={`w-full px-1 py-1.5 text-[11px] font-bold text-center rounded border outline-none ${isDummy ? "border-[#D4AF37]/50 bg-[#D4AF37]/5" : isOver ? "border-[#EF4444]/50 bg-[#FEE2E2]/30" : "border-[#E2E8F0]"}`} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dummy Axle toggle — only for base tandems */}
                      {parseInt(g.axles) === 2 && (
                        <label className="flex items-center gap-1.5 text-[10px] text-[#64748B] cursor-pointer select-none" data-testid={`dummy-axle-toggle-${gi}`}>
                          <input type="checkbox" checked={!!g.dummyAxle} onChange={e => updateGroup(gi, "dummyAxle", e.target.checked)} className="w-3 h-3 accent-[#D4AF37]" />
                          <span>Add <strong className="text-[#D4AF37]">dummy axle</strong> <span className="text-[#94A3B8]">(group counts as triple for bridge; tandem 34k still applies to first 2 axles)</span></span>
                        </label>
                      )}

                      {/* Inline violation */}
                      {hasViol && gWeight > 0 && (
                        <div className={`rounded px-2 py-1 text-[10px] flex items-center justify-between ${isOver ? withinTol ? "bg-[#FFF7ED]" : "bg-[#FEE2E2]" : "bg-[#F0FDF4]"}`}>
                          <span className="text-[#64748B]">{viol.source}: {viol.max.toLocaleString()} max</span>
                          {isOver ? <span className={`font-bold ${withinTol ? "text-[#F97316]" : "text-[#DC2626]"}`}>+{(gWeight - viol.max).toLocaleString()} over{withinTol ? " (5% tol)" : ""}</span> : <span className="text-[#16A34A] font-bold">Legal</span>}
                        </div>
                      )}

                      {/* Secondary tandem check for dummy-axle groups */}
                      {showViolations && viol?.tandemCheck && (
                        <div className={`rounded px-2 py-1 text-[10px] flex items-center justify-between ${viol.tandemCheck.actual > viol.tandemCheck.max ? "bg-[#FEE2E2]" : "bg-[#F0FDF4]"}`}>
                          <span className="text-[#64748B]">{viol.tandemCheck.source}: {viol.tandemCheck.max.toLocaleString()} max</span>
                          {viol.tandemCheck.actual > viol.tandemCheck.max ? (
                            <span className="font-bold text-[#DC2626]">+{(viol.tandemCheck.actual - viol.tandemCheck.max).toLocaleString()} over</span>
                          ) : (
                            <span className="text-[#16A34A] font-bold">Tandem legal ({viol.tandemCheck.actual.toLocaleString()})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2">
              <button onClick={() => addGroup("Tandem (2)", 2)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-[#E2E8F0] text-xs font-medium text-[#94A3B8] hover:border-[#002855] hover:text-[#002855] transition-colors"><Plus className="w-3.5 h-3.5" />Add Tandem</button>
              <button onClick={() => addGroup("Triple (3)", 3)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-[#E2E8F0] text-xs font-medium text-[#94A3B8] hover:border-[#002855] hover:text-[#002855] transition-colors"><Plus className="w-3.5 h-3.5" />Add Triple</button>
              <button onClick={() => addGroup("Custom", 0)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-[#E2E8F0] text-xs font-medium text-[#94A3B8] hover:border-[#002855] hover:text-[#002855] transition-colors"><Plus className="w-3.5 h-3.5" />Custom</button>
            </div>
          </div>

          {/* Overall + Gross */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3">
            <div className={`grid gap-3 ${isCustom ? "grid-cols-3" : "grid-cols-2"}`}>
              <div><label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Overall Distance (ft)</label><input type="number" inputMode="numeric" value={overallDistFt} onChange={e => setOverallDistFt(e.target.value)} placeholder="—" className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" /></div>
              <div><label className="text-[9px] font-bold text-[#002855] uppercase block mb-0.5">Gross Weight</label><div className="px-2 py-2 text-sm font-black text-center text-[#002855] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">{record.gross > 0 ? record.gross.toLocaleString() : "—"}</div></div>
              {isCustom && <div><label className="text-[9px] font-bold text-[#94A3B8] uppercase block mb-0.5">Gross Max (lbs)</label><input type="number" inputMode="numeric" value={customGrossMax} onChange={e => setCustomGrossMax(e.target.value)} placeholder="Custom" className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" /></div>}
            </div>
          </div>
          </>)}{/* end !isInputsCollapsed */}
          {/* Violations */}
          {showViolations && record.gross > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-1">Violations</h3>
              {record.groupViolations.map((v, i) => v.max && v.actual > 0 && <ViolationCard key={i} label={`${v.label} (${v.source})`} actual={v.actual} max={v.max} tolerance={!isCustom} />)}
              {record.grossMax && record.gross > 0 && <ViolationCard label={`Gross (${record.grossSource})`} actual={record.gross} max={record.grossMax} tolerance={!isCustom} />}
              {record.groupViolations.every(v => !v.max || v.actual <= (v.max || Infinity)) && (!record.grossMax || record.gross <= record.grossMax) && record.gross > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] border border-[#16A34A]/30 rounded-lg"><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /><span className="text-xs font-bold text-[#16A34A]">All weights within legal limits</span></div>
              )}
            </div>
          )}

          {/* Conflicts */}
          {!record.valid && record.conflicts.length > 0 && !isCustom && (
            <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold text-[#92400E] uppercase">Diagram issues:</p>
              {record.conflicts.map((c, i) => <p key={i} className="text-[11px] text-[#92400E] flex items-center gap-1"><XCircle className="w-3 h-3 flex-shrink-0" />{c}</p>)}
            </div>
          )}

          {/* Diagram */}
          {(record.valid || isCustom) && record.totalAxles > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#002855] uppercase">Weight Diagram</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={downloadDiag} className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]"><Download className="w-3.5 h-3.5" /></button>
                  <button onClick={shareDiag} className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]"><Share2 className="w-3.5 h-3.5" /></button>
                  <button onClick={openInspPicker} className="p-1.5 rounded-md text-[#D4AF37] hover:bg-[#D4AF37]/10"><FolderPlus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="p-2"><TruckDiagram groups={groups.map(g => ({ ...g, axles: String(effAxles(g)) }))} grossWeight={record.gross} overallDist={record.overallRound} svgRef={svgRef} /></div>
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-bold text-[#64748B] uppercase">Photos</span><button onClick={() => photoRef.current?.click()} className="flex items-center gap-1 text-[10px] text-[#002855] font-medium hover:underline"><Plus className="w-3 h-3" />Add</button><input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} /></div>
                {photos.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{photos.map((p, i) => <div key={i} className="relative flex-shrink-0"><img src={p.dataUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E2E8F0]" /><button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button></div>)}</div>}
              </div>
            </div>
          )}

          </div>{/* end captureRef */}
        </>)}
      </main>

      {showInspPicker && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowInspPicker(false)}>
          <div className="bg-[#0F1D2F] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[70vh] overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"><h3 className="text-sm font-bold text-white">Add to Inspection</h3><button onClick={() => setShowInspPicker(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="px-3 pt-3 pb-2 border-b border-white/10"><div className="flex gap-1.5"><input type="text" value={newInspTitle} onChange={e => setNewInspTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createAndAdd()} placeholder="New inspection..." className="flex-1 px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs placeholder:text-white/30 outline-none" /><button onClick={createAndAdd} disabled={saving} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold disabled:opacity-50">{saving ? "..." : "Create & Add"}</button></div></div>
            <div className="overflow-y-auto max-h-[50vh] p-2">{inspections.map(insp => <button key={insp.id} onClick={() => addToInsp(insp.id)} disabled={saving} className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 text-left"><div><p className="text-xs font-medium text-white truncate">{insp.title}</p><p className="text-[10px] text-white/30">{new Date(insp.created_at).toLocaleDateString()}</p></div><FolderPlus className="w-4 h-4 text-white/20" /></button>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
