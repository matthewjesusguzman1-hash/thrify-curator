import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calculator, Scale, AlertTriangle, Info, X, Download, Share2, FolderPlus, Plus, Trash2, Eye, EyeOff, CheckCircle2, XCircle, ChevronDown, ChevronUp, Camera } from "lucide-react";
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
  { title: "Dummy Axles", items: ["Disregarded if weight is < 8,000 lbs AND < 8% of gross.", "If NOT disregarded, dummy weight is applied to the adjacent axle group check (e.g., tandem 34k rule)."] },
  { title: "APU Allowance", items: ["Up to 550 lbs. Not in addition to 5% tolerance."] },
  { title: "Natural Gas Vehicles", items: ["Up to 2,000 lbs extra. Max 82,000 lbs on Interstate."] },
];

const COLORS = ["#D4AF37", "#3B82F6", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899"];

/* ================================================================
   TRUCK DIAGRAM — improved with tight grouped axles
   ================================================================ */
function TruckDiagram({ groups, grossWeight, overallDist, svgRef, groupViolations = [], grossMax = null, grossOver = false, hideViolations = false, toleranceApplies = false }) {
  // Larger viewBox aspect so diagram renders TALL when given full-width container
  const w = 900, h = 620, mL = 90, mR = 90;
  const tTop = 150;                // trailer top
  const tH = 220;                  // trailer height
  const axleY = tTop + tH + 40;    // axle line y
  const TIGHT = 34;                // px between axles in same group

  const totalAxles = groups.reduce((s, g) => s + (parseInt(g.axles) || 0), 0);
  if (totalAxles === 0) return null;

  const groupSizes = groups.map(g => parseInt(g.axles) || 0).filter(n => n > 0);
  const totalGroups = groupSizes.length;
  const totalTight = groupSizes.reduce((s, n) => s + (n - 1) * TIGHT, 0);
  const usable = w - mL - mR - totalTight;
  const gapCount = Math.max(totalGroups - 1, 1);
  const groupGap = totalGroups > 1 ? usable / gapCount : 0;

  const allAxles = [];
  const groupMeta = [];
  let runningAxleNum = 1;
  let x = mL;

  groups.forEach((g, gi) => {
    const n = parseInt(g.axles) || 0;
    if (n === 0) return;
    const viol = groupViolations[gi];
    const baseN = viol?.baseN ?? n;
    const mainOver = !hideViolations && viol && viol.max && viol.actual > viol.max;
    const tandemOver = !hideViolations && viol?.tandemCheck && viol.tandemCheck.actual > viol.tandemCheck.max;
    const isOver = mainOver || tandemOver;
    const withinTol = !hideViolations && toleranceApplies && viol && mainOver && viol.actual <= viol.max * 1.05;
    const startAxleNum = runningAxleNum;
    const startX = x;
    for (let i = 0; i < n; i++) {
      const isDummy = viol?.dummy?.hasDummy && i === baseN;
      const dummyDisregarded = isDummy && viol.dummy.disregarded && !hideViolations;
      allAxles.push({ x, axleNum: runningAxleNum, groupIdx: gi, isDummy, dummyDisregarded, isOver, withinTol });
      runningAxleNum++;
      if (i < n - 1) x += TIGHT;
    }
    const endX = x;
    const overBy = isOver ? (mainOver ? viol.actual - viol.max : (viol.tandemCheck.actual - viol.tandemCheck.max)) : 0;
    groupMeta.push({ gi, startX, endX, label: g.label, startAxleNum, endAxleNum: runningAxleNum - 1, distFt: roundDist(g.distFt, "0"), n, gWeight: viol ? viol.actual : 0, isOver, withinTol, overBy, max: viol?.max || (viol?.tandemCheck?.max ?? null), source: viol?.source });
    if (gi < groups.length - 1) x += groupGap;
  });

  const OVER_RED = "#DC2626";
  const WARN_ORANGE = "#F97316";
  const OK_GREEN = "#16A34A";
  const grossActuallyOver = grossOver && !hideViolations;
  const grossColor = grossActuallyOver ? OVER_RED : "#D4AF37";

  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full block" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: "75vh" }}>
      <defs>
        <linearGradient id="trailerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="#0F172A" rx="14" />

      {/* Group weight banners — above trailer, one per group */}
      {groupMeta.map((gm, i) => {
        const cx = (gm.startX + gm.endX) / 2;
        const color = gm.isOver ? (gm.withinTol ? WARN_ORANGE : OVER_RED) : (hideViolations ? "#D4AF37" : OK_GREEN);
        const pillW = 230, pillH = 86;
        return (
          <g key={`banner-${i}`}>
            <rect x={cx - pillW / 2} y={14} width={pillW} height={pillH} rx="12" fill={gm.isOver ? (gm.withinTol ? "#3B2415" : "#3B1818") : (hideViolations ? "#1E293B" : "#0F2A1F")} stroke={color} strokeWidth="2.5" />
            <text x={cx} y={38} textAnchor="middle" fill="#94A3B8" fontSize="15" fontWeight="bold">
              {gm.endAxleNum !== gm.startAxleNum ? `A${gm.startAxleNum}-A${gm.endAxleNum}` : `A${gm.startAxleNum}`}
            </text>
            <text x={cx} y={70} textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="monospace">{gm.gWeight > 0 ? gm.gWeight.toLocaleString() : "—"}</text>
            {!hideViolations && gm.isOver ? (
              <text x={cx} y={92} textAnchor="middle" fill={color} fontSize="14" fontWeight="900">+{gm.overBy.toLocaleString()} OVER{gm.withinTol ? " (5% tol)" : ""}</text>
            ) : !hideViolations && gm.max ? (
              <text x={cx} y={92} textAnchor="middle" fill="#64748B" fontSize="14" fontWeight="bold">max {gm.max.toLocaleString()}</text>
            ) : null}
          </g>
        );
      })}

      {/* Trailer body */}
      {allAxles.length > 0 && (
        <g>
          <rect x={allAxles[0].x - 28} y={tTop} width={Math.max(allAxles[allAxles.length - 1].x - allAxles[0].x + 56, 80)} height={tH} rx="10" fill="url(#trailerGrad)" stroke={grossActuallyOver ? OVER_RED : "#334155"} strokeWidth={grossActuallyOver ? 2.5 : 1.5} />
          <rect x={allAxles[0].x - 20} y={tTop + 12} width={46} height={tH - 24} rx="6" fill="#1E293B" stroke="#D4AF37" strokeWidth="0.8" opacity="0.35" />
        </g>
      )}

      {/* Gross label inside trailer */}
      <text x={w / 2} y={tTop + 54} textAnchor="middle" fill="#8FAEC5" fontSize="18" fontWeight="bold">GROSS WEIGHT</text>
      <text x={w / 2} y={tTop + 118} textAnchor="middle" fill={grossColor} fontSize="56" fontWeight="900" fontFamily="monospace">{grossWeight ? grossWeight.toLocaleString() : "—"}</text>
      {!hideViolations && grossMax && (
        <text x={w / 2} y={tTop + 152} textAnchor="middle" fill={grossActuallyOver ? OVER_RED : "#64748B"} fontSize="17" fontWeight="bold">
          {grossActuallyOver ? `+${(grossWeight - grossMax).toLocaleString()} OVER max ${grossMax.toLocaleString()}` : `max ${grossMax.toLocaleString()} lbs`}
        </text>
      )}
      {!hideViolations && grossMax && (
        <text x={w / 2} y={tTop + 184} textAnchor="middle" fill={grossActuallyOver ? OVER_RED : OK_GREEN} fontSize="18" fontWeight="900">
          {grossActuallyOver ? "OVERWEIGHT" : "LEGAL"}
        </text>
      )}

      {/* Axles */}
      {allAxles.map((a, i) => {
        const axleIsOver = !hideViolations && a.isOver;
        const wheelFill = axleIsOver ? (a.withinTol ? WARN_ORANGE : OVER_RED) : (a.isDummy ? (a.dummyDisregarded ? "#64748B" : "#D4AF37") : "#334155");
        const wheelStroke = axleIsOver ? (a.withinTol ? WARN_ORANGE : OVER_RED) : (a.isDummy ? "#D4AF37" : "#64748B");
        return (
          <g key={i}>
            <line x1={a.x} y1={axleY - 28} x2={a.x} y2={axleY + 14} stroke={axleIsOver ? OVER_RED : "#94A3B8"} strokeWidth="5" strokeLinecap="round" />
            <circle cx={a.x} cy={axleY + 22} r="19" fill={wheelFill} stroke={wheelStroke} strokeWidth={axleIsOver ? 3.5 : 3} opacity={a.dummyDisregarded ? 0.5 : 1} />
            <text x={a.x} y={axleY - 34} textAnchor="middle" fill={axleIsOver ? OVER_RED : "#CBD5E1"} fontSize="15" fontWeight="900">A{a.axleNum}</text>
            {a.isDummy && (
              <text x={a.x + 22} y={axleY + 28} fill={a.dummyDisregarded ? "#64748B" : "#D4AF37"} fontSize="14" fontWeight="900">D</text>
            )}
          </g>
        );
      })}

      {/* Group brackets + labels below axles */}
      {groupMeta.map((gm, i) => {
        const cx = (gm.startX + gm.endX) / 2;
        const brColor = !hideViolations && gm.isOver ? (gm.withinTol ? WARN_ORANGE : OVER_RED) : "#CBD5E1";
        const y = axleY + 72;
        return (
          <g key={`gm-${i}`}>
            {gm.n > 1 && (
              <>
                <line x1={gm.startX} y1={y} x2={gm.endX} y2={y} stroke={brColor} strokeWidth="3" opacity="0.7" />
                <line x1={gm.startX} y1={y - 7} x2={gm.startX} y2={y + 7} stroke={brColor} strokeWidth="3" opacity="0.7" />
                <line x1={gm.endX} y1={y - 7} x2={gm.endX} y2={y + 7} stroke={brColor} strokeWidth="3" opacity="0.7" />
                {gm.distFt && (
                  <text x={cx} y={y - 4} textAnchor="middle" fill="#D4AF37" fontSize="14" fontWeight="900">{gm.distFt} ft</text>
                )}
              </>
            )}
            <text x={cx} y={y + 28} textAnchor="middle" fill={brColor} fontSize="16" fontWeight="bold">
              {gm.label || (gm.n > 1 ? `A${gm.startAxleNum}–A${gm.endAxleNum}` : `A${gm.startAxleNum}`)}
            </text>
          </g>
        );
      })}

      {/* Overall distance */}
      {allAxles.length > 1 && overallDist && (
        <g>
          <line x1={allAxles[0].x} y1={axleY + 120} x2={allAxles[allAxles.length - 1].x} y2={axleY + 120} stroke="#64748B" strokeWidth="2" />
          <line x1={allAxles[0].x} y1={axleY + 112} x2={allAxles[0].x} y2={axleY + 128} stroke="#64748B" strokeWidth="2" />
          <line x1={allAxles[allAxles.length - 1].x} y1={axleY + 112} x2={allAxles[allAxles.length - 1].x} y2={axleY + 128} stroke="#64748B" strokeWidth="2" />
          <text x={(allAxles[0].x + allAxles[allAxles.length - 1].x) / 2} y={axleY + 146} textAnchor="middle" fill="#94A3B8" fontSize="16" fontWeight="bold">{overallDist} ft overall</text>
        </g>
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

  // Record tab — persisted to localStorage per-badge until user clicks Clear
  const STORAGE_KEY = `bridge-record-${badge || "anon"}`;
  const [isCustom, setIsCustom] = useState(false);
  const [showViolations, setShowViolations] = useState(true);
  const [isInputsCollapsed, setIsInputsCollapsed] = useState(false);
  const captureRef = useRef(null);
  const makeGroup = (label, preset, axles) => ({
    label, preset, axles: String(axles), distFt: "", useGroup: axles > 1, groupWeight: "", weights: Array(axles).fill(""), maxOverride: "", dummyAxle: false
  });
  // Initialize from localStorage if present
  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const initial = loadSaved();
  const [groups, setGroups] = useState(initial?.groups || [makeGroup("Steer", "Single", 1)]);
  const [overallDistFt, setOverallDistFt] = useState(initial?.overallDistFt || "");
  const [customGrossMax, setCustomGrossMax] = useState(initial?.customGrossMax || "");
  const [photos, setPhotos] = useState(initial?.photos || []);
  useEffect(() => { if (initial?.isCustom) setIsCustom(true); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups, overallDistFt, customGrossMax, photos, isCustom }));
    } catch {}
  }, [STORAGE_KEY, groups, overallDistFt, customGrossMax, photos, isCustom]);

  const clearRecord = () => {
    if (!window.confirm("Clear all recorded weights, distances, and photos?")) return;
    setGroups([makeGroup("Steer", "Single", 1)]);
    setOverallDistFt("");
    setCustomGrossMax("");
    setPhotos([]);
    setIsCustom(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.success("Cleared");
  };

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
        // Preserve the user's useGroup choice — tandem 34k check simply won't evaluate in group mode
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
    // Helpers: read group's base weight and dummy weight separately
    const readDummy = (g) => {
      const baseN = parseInt(g.axles) || 0;
      if (!g.dummyAxle || baseN < 2) return 0;
      return parseInt(g.weights?.[baseN]) || 0;
    };
    const readBaseWeight = (g) => {
      // In group mode, base weight = groupWeight (excludes dummy, which is a separate field when dummy is on)
      // In individual mode, base weight = sum of first baseN weights
      const baseN = parseInt(g.axles) || 0;
      if (g.useGroup) return parseInt(g.groupWeight) || 0;
      return (g.weights || []).slice(0, baseN).reduce((s, w) => s + (parseInt(w) || 0), 0);
    };

    // Pass 1: raw gross = sum of every physical axle weight (base + dummy across all groups)
    let rawGross = 0;
    groups.forEach(g => { rawGross += readBaseWeight(g) + readDummy(g); });

    // Pass 2: evaluate dummy-axle disregard status for each group
    // Rule: Dummy is disregarded if it bears < 8,000 lbs AND < 8% of gross (raw gross).
    const dummyInfoList = groups.map(g => {
      const baseN = parseInt(g.axles) || 0;
      const hasDummy = !!g.dummyAxle && baseN >= 2;
      if (!hasDummy) return { hasDummy: false, dummyWeight: 0, disregarded: false, unknownSplit: false };
      const dummyWeight = readDummy(g);
      const disregarded = dummyWeight > 0 && dummyWeight < 8000 && dummyWeight < rawGross * 0.08;
      return { hasDummy: true, dummyWeight, disregarded, unknownSplit: false };
    });

    // Effective (rule-relevant) axle count per group — excludes disregarded dummies.
    // Note: the dummy's WEIGHT is still applied to the group + gross; only the axle COUNT drops.
    const ruleAxles = (g, gi) => {
      const base = parseInt(g.axles) || 0;
      const di = dummyInfoList[gi];
      return base + (di.hasDummy && !di.disregarded ? 1 : 0);
    };
    const totalAxles = groups.reduce((s, g, gi) => s + ruleAxles(g, gi), 0);

    // Gross weight ALWAYS includes every physical weight (including disregarded dummies).
    // Only the axle-COUNT used for the gross bridge lookup changes when dummies are disregarded.
    const gross = rawGross;

    const overallRound = roundDist(overallDistFt, "0");

    const groupViolations = groups.map((g, gi) => {
      const baseN = parseInt(g.axles) || 0;
      const di = dummyInfoList[gi];
      const n = ruleAxles(g, gi);
      const baseWeight = readBaseWeight(g);
      const dummyWeight = readDummy(g);
      // Group weight ALWAYS includes dummy weight (counted or disregarded) —
      // disregarded only removes the axle from the COUNT, not the weight.
      const gWeight = baseWeight + dummyWeight;
      const gDist = roundDist(g.distFt, "0");
      let max = null, source = "";
      if (isCustom && g.maxOverride) { max = parseInt(g.maxOverride); source = "Custom"; }
      else if (n === 1) { max = 20000; source = "Single axle"; }
      else if (n === 2 && !gDist) { max = 34000; source = "Tandem"; }
      else if (n >= 2 && gDist) {
        const lk = bridgeLookup(gDist, n);
        if (lk) { max = lk; source = `Bridge (${gDist}ft, ${n}ax${di.hasDummy && !di.disregarded ? " +dummy" : di.hasDummy ? " (dummy disregarded)" : ""})`; }
        else if (n === 2) { max = 34000; source = "Tandem"; }
      }
      else if (n === 2) { max = 34000; source = "Tandem"; }

      // Secondary tandem 34k check — only needed when dummy is COUNTED on a base-tandem group.
      // When disregarded, the main group check (n=2 → 34k) already covers base+dummy vs 34k.
      let tandemCheck = null;
      if (di.hasDummy && baseN === 2 && !di.disregarded && di.dummyWeight > 0) {
        const tandemActual = baseWeight + di.dummyWeight;
        if (tandemActual > 0) {
          tandemCheck = { actual: tandemActual, max: 34000, source: `Tandem (A${axleNumbers[gi].start}-A${axleNumbers[gi].start + 1}) — dummy applied` };
        }
      }

      const an = axleNumbers[gi];
      const axLabel = an.start === an.end ? `A${an.start}` : `A${an.start}-${an.end}`;
      return { gi, label: g.label || axLabel, actual: gWeight, max, source, n, baseN, distRound: gDist, tandemCheck, dummy: di };
    });

    // Count how many axle groups/tandem-checks are in violation (for 5% tolerance rule)
    // 5% tolerance applies ONLY when exactly one violation exists across all groups.
    let violationCount = 0;
    groupViolations.forEach(v => {
      if (v.max && v.actual > v.max) violationCount++;
      if (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max) violationCount++;
    });
    // Note: gross weight never gets tolerance, so don't count it
    const toleranceApplies = violationCount === 1;

    // Gross max lookup
    let grossMax = null, grossSource = "", grossNote = "";
    if (isCustom && customGrossMax) {
      grossMax = parseInt(customGrossMax); grossSource = "Custom";
    } else if (overallRound && totalAxles >= 2) {
      const lk = bridgeLookup(overallRound, totalAxles);
      if (lk) { grossMax = lk; grossSource = `Bridge (${overallRound}ft, ${totalAxles}ax)`; }
      else { grossNote = `No bridge data for ${overallRound}ft / ${totalAxles} axles`; }
    } else if (!overallRound && totalAxles >= 2) {
      const colMax = Math.max(...Object.values(BD).map(row => row[totalAxles] || 0));
      if (colMax > 0) { grossMax = colMax; grossSource = `Max for ${totalAxles} axles (enter distance for accuracy)`; }
    }

    const conflicts = [];
    if (totalAxles < 1) conflicts.push("No axles defined");
    if (!isCustom) groups.forEach((g, i) => {
      const n = ruleAxles(g, i), d = roundDist(g.distFt, "0");
      if (n > 1 && d && (d < 4 || d > 60)) conflicts.push(`${g.label || `Group ${i + 1}`}: ${d}ft outside bridge range (4-60)`);
      if (!isCustom && n >= 2 && d && !bridgeLookup(d, n)) conflicts.push(`${g.label || `Group ${i + 1}`}: no data for ${d}ft / ${n} axles`);
    });
    return { totalAxles, gross, rawGross, overallRound, groupViolations, grossMax, grossSource, grossNote, conflicts, valid: conflicts.length === 0 && totalAxles > 0, dummyInfoList, toleranceApplies };
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
          <div className="flex items-center gap-1">
            {tab === "record" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => photoRef.current?.click()} className="text-white hover:bg-white/10 h-8 px-2" title="Add photos" data-testid="header-photo-btn"><Camera className="w-4 h-4" /></Button>
                <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} />
                <Button variant="ghost" size="sm" onClick={shareDiag} className="text-white hover:bg-white/10 h-8 px-2" title="Share" data-testid="header-share-btn"><Share2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={openInspPicker} className="text-[#D4AF37] hover:bg-white/10 h-8 px-2" title="Add to inspection" data-testid="header-inspection-btn"><FolderPlus className="w-4 h-4" /></Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} className={`text-xs h-8 px-3 ${showRules ? "bg-[#D4AF37] text-[#002855]" : "text-[#D4AF37] hover:bg-white/10"}`} data-testid="toggle-rules-btn"><Info className="w-3.5 h-3.5 mr-1" />Rules</Button>
          </div>
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
              <button onClick={clearRecord} className="flex items-center gap-1 text-[11px] font-medium text-[#DC2626] hover:text-[#991B1B]" data-testid="clear-record-btn" title="Clear all weights, distances, photos">
                <Trash2 className="w-3.5 h-3.5" />Clear
              </button>
            </div>
          </div>

          {/* Everything below this line is captured for Save/Share/Add-to-Inspection */}
          <div ref={captureRef} className="space-y-4" data-testid="record-capture-area">
          {/* Axle Groups */}
          {!isInputsCollapsed && (<>
          <div className="space-y-2">
            {groups.map((g, gi) => {
              const n = parseInt(g.axles) || 0;
              const an = axleNumbers[gi];
              const axLabel = an.count === 1 ? `Axle ${an.start}` : `Axles ${an.start}-${an.end}`;
              // Inline violation (already accounts for disregarded dummy in viol.actual)
              const viol = record.groupViolations[gi];
              const gWeight = viol ? viol.actual : 0;
              const hasViol = showViolations && viol && viol.max && gWeight > 0;
              const mainOver = hasViol && gWeight > viol.max;
              const tandemOver = showViolations && viol?.tandemCheck && viol.tandemCheck.actual > viol.tandemCheck.max;
              const isOver = mainOver || tandemOver;
              const withinTol = hasViol && !isCustom && record.toleranceApplies && mainOver && gWeight <= Math.round(viol.max * 1.05);
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
                          <AlertTriangle className="w-2.5 h-2.5" />+{(mainOver ? (gWeight - viol.max) : (viol.tandemCheck.actual - viol.tandemCheck.max)).toLocaleString()}
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
                        <div className="flex gap-1.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-[7px] text-[#94A3B8] font-bold">A{an.start}-A{an.start + n - 1 - (g.dummyAxle ? 1 : 0)} combined</span>
                            <input type="number" inputMode="numeric" value={g.groupWeight} onChange={e => updateGroup(gi, "groupWeight", e.target.value)} placeholder="combined (lbs)" className={`w-full px-2 py-2 text-xs font-bold text-center rounded-lg border outline-none ${isOver && !(viol?.dummy?.hasDummy && !viol.dummy.disregarded) ? "border-[#EF4444]/50 bg-[#FEE2E2]/30" : "border-[#E2E8F0]"}`} />
                          </div>
                          {g.dummyAxle && (() => {
                            const di = viol?.dummy;
                            const counted = di && di.hasDummy && !di.disregarded && di.dummyWeight > 0;
                            return (
                              <div className="w-24 flex-shrink-0">
                                <span className={`text-[7px] font-bold flex items-center gap-0.5 ${counted ? "text-[#DC2626]" : "text-[#D4AF37]"}`}>A{an.end} (dummy){counted && <AlertTriangle className="w-2 h-2" />}</span>
                                <input type="number" inputMode="numeric" value={g.weights?.[parseInt(g.axles)] || ""} onChange={e => updateWeight(gi, parseInt(g.axles), e.target.value)} placeholder="dummy lbs" className={`w-full px-2 py-2 text-xs font-bold text-center rounded-lg border outline-none ${counted ? "border-[#EF4444]/70 bg-[#FEE2E2]/50 text-[#DC2626]" : "border-[#D4AF37]/50 bg-[#D4AF37]/5"}`} />
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          {Array.from({ length: effAxles(g) }, (_, wi) => {
                            const baseNum = parseInt(g.axles) || 0;
                            const isDummy = g.dummyAxle && wi === baseNum;
                            const di = viol?.dummy;
                            const counted = isDummy && di && di.hasDummy && !di.disregarded && di.dummyWeight > 0;
                            return (
                              <div key={wi} className="flex-1 min-w-0">
                                <span className={`text-[7px] font-bold flex items-center gap-0.5 ${isDummy ? (counted ? "text-[#DC2626]" : "text-[#D4AF37]") : "text-[#94A3B8]"}`}>
                                  A{an.start + wi}{isDummy ? " (dummy)" : ""}{counted && <AlertTriangle className="w-2 h-2" />}
                                </span>
                                <input type="number" inputMode="numeric" value={g.weights?.[wi] || ""} onChange={e => updateWeight(gi, wi, e.target.value)} placeholder={isDummy ? "dummy lbs" : "lbs"} className={`w-full px-1 py-1.5 text-[11px] font-bold text-center rounded border outline-none ${isDummy ? (counted ? "border-[#EF4444]/70 bg-[#FEE2E2]/50 text-[#DC2626]" : "border-[#D4AF37]/50 bg-[#D4AF37]/5") : isOver ? "border-[#EF4444]/50 bg-[#FEE2E2]/30" : "border-[#E2E8F0]"}`} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dummy Axle toggle — for base tandem / triple / quad */}
                      {parseInt(g.axles) >= 2 && parseInt(g.axles) <= 4 && (
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-[10px] text-[#64748B] cursor-pointer select-none" data-testid={`dummy-axle-toggle-${gi}`}>
                            <input type="checkbox" checked={!!g.dummyAxle} onChange={e => updateGroup(gi, "dummyAxle", e.target.checked)} className="w-3 h-3 accent-[#D4AF37]" />
                            <span>Add <strong className="text-[#D4AF37]">dummy axle</strong> <span className="text-[#94A3B8]">(disregarded if under 8,000 lbs AND under 8% of gross; otherwise weight applies to this group's check)</span></span>
                          </label>
                          {g.dummyAxle && viol?.dummy?.dummyWeight > 0 && (
                            <div className={`text-[10px] rounded px-2 py-1 font-medium ${viol.dummy.disregarded ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                              {viol.dummy.disregarded
                                ? `Dummy (${viol.dummy.dummyWeight.toLocaleString()} lbs) is DISREGARDED — axle count drops to ${parseInt(g.axles)}; weight still counted in group + gross`
                                : `Dummy (${viol.dummy.dummyWeight.toLocaleString()} lbs) is IN VIOLATION — axle count ${parseInt(g.axles) + 1}${parseInt(g.axles) === 2 ? "; tandem 34k rule still applies" : ""}`}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline violation */}
                      {hasViol && gWeight > 0 && (
                        <div className={`rounded px-2 py-1 text-[10px] flex items-center justify-between ${mainOver ? withinTol ? "bg-[#FFF7ED]" : "bg-[#FEE2E2]" : "bg-[#F0FDF4]"}`}>
                          <span className="text-[#64748B]">{viol.source}: {viol.max.toLocaleString()} max</span>
                          {mainOver ? <span className={`font-bold ${withinTol ? "text-[#F97316]" : "text-[#DC2626]"}`}>+{(gWeight - viol.max).toLocaleString()} over{withinTol ? " (5% tol)" : ""}</span> : <span className="text-[#16A34A] font-bold">Legal</span>}
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
            <div className="flex gap-2 print:hidden" data-html2canvas-ignore="true">
              <button onClick={() => addGroup("Tandem (2)", 2)} data-testid="add-tandem-btn" className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#002855] text-white text-xs font-bold hover:bg-[#001a3a] active:scale-[0.98] transition-all shadow-sm"><Plus className="w-4 h-4" />Add Tandem</button>
              <button onClick={() => addGroup("Triple (3)", 3)} data-testid="add-triple-btn" className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#002855] text-white text-xs font-bold hover:bg-[#001a3a] active:scale-[0.98] transition-all shadow-sm"><Plus className="w-4 h-4" />Add Triple</button>
              <button onClick={() => addGroup("Custom", 0)} data-testid="add-custom-btn" className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#D4AF37] text-[#002855] text-xs font-bold hover:bg-[#BC9A2F] active:scale-[0.98] transition-all shadow-sm"><Plus className="w-4 h-4" />Custom</button>
            </div>
          </div>

          {/* Overall + Gross */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3">
            <div className={`grid gap-3 ${isCustom ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[#94A3B8] uppercase block h-7 leading-tight">Overall Distance (ft)</label>
                <input type="number" inputMode="numeric" value={overallDistFt} onChange={e => setOverallDistFt(e.target.value)} placeholder="—" className="w-full px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" />
                {record.grossMax && !isCustom && (
                  <p className="text-[10px] text-[#002855] font-medium text-center bg-[#F8FAFC] rounded-md px-2 py-1 border border-[#E2E8F0] h-10 flex flex-col justify-center">
                    <span>Max: <strong>{record.grossMax.toLocaleString()}</strong> lbs</span>
                    <span className="text-[9px] text-[#94A3B8] font-normal truncate">{record.grossSource}</span>
                  </p>
                )}
                {!record.grossMax && record.grossNote && !isCustom && (
                  <p className="text-[10px] text-[#92400E] bg-[#FEF3C7]/60 rounded-md px-2 py-1 border border-[#F59E0B]/30 text-center h-10 flex items-center justify-center">
                    {record.grossNote}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[#002855] uppercase block h-7 leading-tight">Gross Weight<span className="block text-[8px] text-[#94A3B8] font-normal normal-case">Sum of axles</span></label>
                <div className="px-2 h-10 text-sm font-black text-center text-[#002855] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-center">
                  {record.gross > 0 ? record.gross.toLocaleString() : "—"}
                </div>
                {record.gross > 0 && (
                  <p className="text-[10px] text-[#64748B] font-mono text-center bg-[#F8FAFC] rounded-md px-2 py-1 border border-[#E2E8F0] h-10 flex items-center justify-center truncate" title={record.groupViolations.map(v => `${v.label}=${v.actual.toLocaleString()}`).join(" + ")}>
                    {record.groupViolations.map(v => v.actual.toLocaleString()).join(" + ")}
                  </p>
                )}
              </div>
              {isCustom && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-[#94A3B8] uppercase block h-7 leading-tight">Gross Max (lbs)</label>
                  <input type="number" inputMode="numeric" value={customGrossMax} onChange={e => setCustomGrossMax(e.target.value)} placeholder="Custom" className="w-full px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" />
                  <p className="text-[10px] text-[#94A3B8] italic text-center h-10 flex items-center justify-center">Custom permit</p>
                </div>
              )}
            </div>
            {!isCustom && !overallDistFt && (
              <p className="mt-2 text-[10px] text-[#92400E] bg-[#FEF3C7]/60 border border-[#F59E0B]/30 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Enter an <strong>Overall Distance</strong> for the most accurate gross max. Without a distance, we show the maximum allowed weight for the current axle count.</span>
              </p>
            )}
            {record.dummyInfoList.some(di => di.disregarded) && (
              <p className="mt-2 text-[10px] text-[#16A34A] bg-[#F0FDF4] border border-[#16A34A]/30 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Dummy axle(s) disregarded from axle count (weight still counted in gross). Gross max uses {record.totalAxles} axles.</span>
              </p>
            )}
          </div>
          </>)}{/* end !isInputsCollapsed */}

          {/* ===== CAPTURED SECTION — Weight Report ===== */}
          <div className="bg-[#F0F2F5] p-3 rounded-xl -mx-3 sm:-mx-6 md:mx-0 space-y-4" data-testid="record-report-section">
            <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1">
              <div className="flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-bold text-[#002855]">Weight Report</span>
                {badge && <span className="text-[#94A3B8]">· Badge {badge}</span>}
              </div>
              <span>{new Date().toLocaleString()}</span>
            </div>
          {/* Violations */}
          {showViolations && record.gross > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Violations</h3>
                {!isCustom && !record.toleranceApplies && record.groupViolations.some(v => (v.max && v.actual > v.max) || (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max)) && (
                  <span className="text-[9px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">5% tolerance does not apply (more than one violation)</span>
                )}
              </div>
              {record.groupViolations.map((v, i) => (
                <React.Fragment key={i}>
                  {v.max && v.actual > 0 && <ViolationCard label={`${v.label} (${v.source})`} actual={v.actual} max={v.max} tolerance={!isCustom && record.toleranceApplies} />}
                  {v.tandemCheck && <ViolationCard label={v.tandemCheck.source} actual={v.tandemCheck.actual} max={v.tandemCheck.max} tolerance={!isCustom && record.toleranceApplies} />}
                </React.Fragment>
              ))}
              {record.grossMax && record.gross > 0 && <ViolationCard label={`Gross (${record.grossSource})`} actual={record.gross} max={record.grossMax} tolerance={false} />}
              {record.groupViolations.every(v => (!v.max || v.actual <= (v.max || Infinity)) && (!v.tandemCheck || v.tandemCheck.actual <= v.tandemCheck.max)) && (!record.grossMax || record.gross <= record.grossMax) && record.gross > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] border border-[#16A34A]/30 rounded-lg"><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /><span className="text-xs font-bold text-[#16A34A]">All weights within legal limits</span></div>
              )}
            </div>
          )}

          {/* Calculation Details — explains HOW each number was derived */}
          {showViolations && record.gross > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Calculation Details</h3>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {record.groupViolations.map((v, i) => {
                  const g = groups[i];
                  const baseN = v.baseN;
                  const baseW = g.useGroup ? (parseInt(g.groupWeight) || 0) : (g.weights || []).slice(0, baseN).reduce((s, w) => s + (parseInt(w) || 0), 0);
                  const di = v.dummy || {};
                  const overVal = v.max && v.actual > v.max ? v.actual - v.max : 0;
                  const withinTol5 = v.max && v.actual > v.max && v.actual <= Math.round(v.max * 1.05) && !isCustom && record.toleranceApplies;
                  // Build the weight expression
                  const parts = [];
                  if (g.useGroup) parts.push(`${baseW.toLocaleString()} (combined)`);
                  else (g.weights || []).slice(0, baseN).forEach((w, k) => parts.push(`A${axleNumbers[i].start + k}=${(parseInt(w) || 0).toLocaleString()}`));
                  if (di.hasDummy && di.dummyWeight > 0) parts.push(`A${axleNumbers[i].start + baseN}(dummy)=${di.dummyWeight.toLocaleString()}`);
                  const sum = baseW + (di.dummyWeight || 0);
                  return (
                    <div key={i} className="px-4 py-2.5 text-[11px] leading-relaxed">
                      <p className="font-bold text-[#002855] mb-0.5">{v.label} <span className="font-normal text-[#94A3B8]">· {baseN} axle{baseN > 1 ? "s" : ""}{di.hasDummy ? " + 1 dummy" : ""}</span></p>
                      <p className="text-[#475569] font-mono">{parts.join(" + ")} = <strong>{sum.toLocaleString()} lbs</strong></p>
                      {di.hasDummy && di.dummyWeight > 0 && (
                        <p className={`mt-1 ${di.disregarded ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                          Dummy discount check: {di.dummyWeight.toLocaleString()} under 8,000? <strong>{di.dummyWeight < 8000 ? "YES" : "NO"}</strong> · {di.dummyWeight.toLocaleString()} under 8% of {record.gross.toLocaleString()} ({Math.round(record.gross * 0.08).toLocaleString()})? <strong>{di.dummyWeight < record.gross * 0.08 ? "YES" : "NO"}</strong> → {di.disregarded ? "DISREGARDED (axle count − 1)" : "IN VIOLATION (axle counts, applies to group)"}
                        </p>
                      )}
                      {v.max ? (
                        <p className={`mt-1 font-mono ${overVal > 0 ? (withinTol5 ? "text-[#F97316]" : "text-[#DC2626]") : "text-[#16A34A]"}`}>
                          {v.source}: {sum.toLocaleString()} {overVal > 0 ? "exceeds" : "within"} {v.max.toLocaleString()} → <strong>{overVal > 0 ? `+${overVal.toLocaleString()} OVER${withinTol5 ? ` (within 5% tol ${Math.round(v.max * 1.05).toLocaleString()})` : ""}` : "LEGAL"}</strong>
                        </p>
                      ) : (
                        <p className="mt-1 text-[#94A3B8] italic">No max rule applied (enter distance or set Custom).</p>
                      )}
                      {v.tandemCheck && (
                        <p className={`mt-1 font-mono ${v.tandemCheck.actual > v.tandemCheck.max ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                          {v.tandemCheck.source}: {v.tandemCheck.actual.toLocaleString()} {v.tandemCheck.actual > v.tandemCheck.max ? "exceeds" : "within"} {v.tandemCheck.max.toLocaleString()} → <strong>{v.tandemCheck.actual > v.tandemCheck.max ? `+${(v.tandemCheck.actual - v.tandemCheck.max).toLocaleString()} OVER` : "LEGAL"}</strong>
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="px-4 py-2.5 text-[11px] bg-[#F8FAFC]">
                  <p className="font-bold text-[#002855] mb-0.5">Gross Weight</p>
                  <p className="text-[#475569] font-mono">
                    {record.groupViolations.map((v, i) => `${v.label}=${v.actual.toLocaleString()}`).join(" + ")} = <strong>{record.gross.toLocaleString()} lbs</strong>
                  </p>
                  {record.grossMax ? (
                    <p className={`mt-1 font-mono ${record.gross > record.grossMax ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                      {record.grossSource}: {record.gross.toLocaleString()} {record.gross > record.grossMax ? "exceeds" : "within"} {record.grossMax.toLocaleString()} → <strong>{record.gross > record.grossMax ? `+${(record.gross - record.grossMax).toLocaleString()} OVER (no tolerance on gross)` : "LEGAL"}</strong>
                    </p>
                  ) : (
                    <p className="mt-1 text-[#94A3B8] italic">Enter Overall Distance for an exact gross max.</p>
                  )}
                  {record.dummyInfoList.some(di => di.disregarded) && (
                    <p className="mt-1 text-[10px] text-[#64748B]">Axle count for gross: <strong>{record.totalAxles}</strong> (disregarded dummies excluded; their weight stays in gross).</p>
                  )}
                </div>
              </div>
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
              <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#002855] uppercase">Weight Diagram</h3>
                <button onClick={downloadDiag} title="Save" className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]" data-testid="diagram-save-btn" data-html2canvas-ignore="true"><Download className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-2"><TruckDiagram groups={groups.map(g => ({ ...g, axles: String(effAxles(g)) }))} grossWeight={record.gross} overallDist={record.overallRound} svgRef={svgRef} groupViolations={record.groupViolations} grossMax={record.grossMax} grossOver={!!(record.grossMax && record.gross > record.grossMax)} hideViolations={!showViolations} toleranceApplies={record.toleranceApplies} /></div>
              {photos.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">{photos.map((p, i) => <div key={i} className="relative flex-shrink-0"><img src={p.dataUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E2E8F0]" /><button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] rounded-full flex items-center justify-center" data-html2canvas-ignore="true"><X className="w-2.5 h-2.5 text-white" /></button></div>)}</div>
                </div>
              )}
            </div>
          )}
          </div>{/* end record-report-section */}

          </div>{/* end captureRef */}
        </>)}
      </main>

      {showInspPicker && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-4" style={{ zIndex: 2147483647 }} onClick={() => setShowInspPicker(false)}>
          <div className="bg-[#0F1D2F] rounded-2xl w-full sm:max-w-sm max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"><h3 className="text-sm font-bold text-white">Add to Inspection</h3><button onClick={() => setShowInspPicker(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="px-3 pt-3 pb-2 border-b border-white/10"><div className="flex gap-1.5"><input type="text" value={newInspTitle} onChange={e => setNewInspTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createAndAdd()} placeholder="New inspection..." className="flex-1 px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs placeholder:text-white/30 outline-none" /><button onClick={createAndAdd} disabled={saving} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold disabled:opacity-50">{saving ? "..." : "Create & Add"}</button></div></div>
            <div className="overflow-y-auto max-h-[50vh] p-2">{inspections.map(insp => <button key={insp.id} onClick={() => addToInsp(insp.id)} disabled={saving} className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 text-left"><div><p className="text-xs font-medium text-white truncate">{insp.title}</p><p className="text-[10px] text-white/30">{new Date(insp.created_at).toLocaleDateString()}</p></div><FolderPlus className="w-4 h-4 text-white/20" /></button>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
