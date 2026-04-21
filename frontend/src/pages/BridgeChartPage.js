import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom/client";
import WeightReportPrintable from "../components/app/WeightReportPrintable";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Calculator, Scale, AlertTriangle, Info, X, Download, Share2, FolderPlus, Plus, Trash2, Eye, EyeOff, CheckCircle2, XCircle, ChevronDown, ChevronUp, Camera, Ruler } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { getDefaultInterstate, savePrefs } from "../components/app/userPrefs";

const API = process.env.REACT_APP_BACKEND_URL;

const BD = {4:{2:34000},5:{2:34000},6:{2:34000},7:{2:34000},8:{2:34000,3:42000},9:{2:39000,3:42500},10:{2:40000,3:43500},11:{3:44000},12:{3:45000,4:50000},13:{3:45500,4:50500},14:{3:46500,4:51500},15:{3:47000,4:52000},16:{3:48000,4:52500,5:58000},17:{3:48500,4:53500,5:58500},18:{3:49500,4:54000,5:59000},19:{3:50000,4:54500,5:60000},20:{3:51000,4:55500,5:60500},21:{3:51500,4:56000,5:61000},22:{3:52500,4:56500,5:61500},23:{3:53000,4:57500,5:62500},24:{3:54000,4:58000,5:63000},25:{3:54500,4:58500,5:63500,6:69000},26:{3:55500,4:59500,5:64000,6:69500},27:{3:56000,4:60000,5:65000,6:70000},28:{3:57000,4:60500,5:65500,6:71000},29:{3:57500,4:61500,5:66000,6:71500},30:{3:58500,4:62000,5:66500,6:72000},31:{3:59000,4:62500,5:67500,6:72500},32:{3:60000,4:63500,5:68000,6:73000},33:{4:64000,5:68500,6:74000},34:{4:64500,5:69000,6:74500},35:{4:65500,5:70000,6:75000},36:{4:66000,5:70500,6:75500},37:{4:66500,5:71000,6:76000,7:81500},38:{4:67500,5:72000,6:77000,7:82000},39:{4:68000,5:72500,6:77500,7:82500},40:{4:68500,5:73000,6:78000,7:83500},41:{4:69500,5:73500,6:78500,7:84000},42:{4:70000,5:74000,6:79000,7:84500},43:{4:70500,5:75000,6:80000,7:85000},44:{4:71500,5:75500,6:80500,7:85500},45:{4:72000,5:76000,6:81000,7:86000},46:{4:72500,5:76500,6:81500,7:87000},47:{4:73500,5:77500,6:82000,7:87500},48:{4:74000,5:78000,6:83000,7:88000},49:{4:74500,5:78500,6:83500,7:88500},50:{4:75500,5:79000,6:84000,7:89000},51:{4:76000,5:80000,6:84500,7:89500},52:{4:76500,5:80500,6:85500,7:90500},53:{4:77500,5:81000,6:86000,7:91000},54:{4:78000,5:81500,6:86500,7:91500},55:{4:78500,5:82500,6:87000,7:92000},56:{4:79500,5:83000,6:87500,7:92500},57:{4:80000,5:83500,6:88000,7:93000},58:{5:84000,6:89000,7:94000},59:{5:85000,6:89500,7:94500},60:{5:85500,6:90000,7:95000}};
const ALL_DIST = Object.keys(BD).map(Number).sort((a, b) => a - b);
const ALL_AX = [2, 3, 4, 5, 6, 7];
function bridgeLookup(d, a) { return d && a && BD[d] ? BD[d][a] || null : null; }
function roundDist(ft, inc) { const f = parseInt(ft) || 0, i = parseInt(inc) || 0; if (!f && !i) return null; return Math.round((f * 12 + i) / 12); }

const RULES = [
  {
    title: "Maximum Allowable Weights",
    cfr: "§60-6,294",
    note: "(refer to bridge chart)",
    items: [
      "Any single axle - 20,000 lbs.",
      "Any tandem axle - 34,000 lbs.",
      "On State highways - 95,000 lbs.",
      "On Interstate - 80,000 lbs. or 95,000 lbs. with Conditional Interstate Use Permit",
    ],
  },
  {
    title: "Tandem Axle",
    items: [
      "Any two consecutive axles whose centers are more than 40\" and not more than 96\" apart, measured to the nearest inch between any two adjacent axles in the series.",
    ],
  },
  {
    title: "Two-Axle Group (8' to 8'6\")",
    hl: true,
    items: [
      "The maximum gross load on any group of two axles, the distance between the extremes of which is more than 8' but less than 8'6\", shall be 38,000 lbs.",
    ],
  },
  {
    title: "Measuring Distance",
    items: [
      "The distance between axles shall be measured to the nearest foot. When a fraction is exactly one-half foot, the next larger whole number shall be used, except that any group of 3 axles shall be restricted to a maximum load of 34,000 lbs. unless the distance between the extremes of the first and third axle is at least 96\" in fact.",
    ],
  },
  {
    title: "Tandem Exception (36'-38')",
    hl: true,
    items: [
      "Gross weights are subject to all wheel and axle load restrictions indicated in the bridge chart, except if you have two consecutive sets of tandem axles that measure a minimum of 36', 37', or 38', you may carry 34,000 lbs. each on such consecutive sets of tandem axles.",
    ],
  },
  {
    title: "Sliding Fifth-Wheel",
    cfr: "§60-6,301",
    items: [
      "It shall be unlawful to reposition the fifth-wheel connection device of a truck-tractor and semitrailer combination carrying cargo and on the state highway system, except when done pursuant to state statute §60-6,301.",
    ],
  },
  {
    title: "Weight Tolerance",
    hl: true,
    items: [
      "There is a 5% weight shift if only overweight on one axle, one tandem axle, or one group of axles when the distance between the first and last axle of such group of axles is 12' or less.",
    ],
  },
  {
    title: "Dummy Axles",
    items: [
      "Shall be disregarded in determining the legal weight of a vehicle or combination of vehicles if the dummy axle does not carry the lesser of 8,000 lbs. or 8% of the gross weight of the vehicle, or vehicle combination including the load.",
    ],
  },
  {
    title: "Idle Reduction Technology or APU",
    items: [
      "The maximum gross weight limit and the axle weight limit for any vehicle or combination of vehicles equipped with an APU may be increased by an amount necessary to cover the additional weight of the APU. The additional weight shall not exceed 550 lbs. or the weight specified on the unit, whichever is less. This shall not be in addition to the 5% shift tolerance.",
    ],
  },
  {
    title: "Natural Gas Powered Vehicles",
    items: [
      "A vehicle primarily fueled by natural gas may exceed any vehicle weight limit up to 2,000 lbs. to cover the difference between the natural gas fuel system and a comparable diesel fuel system. No vehicle using this exception may exceed 82,000 lbs. overall gross on the National System of Interstate and Defense Highways.",
    ],
  },
];

const COLORS = ["#D4AF37", "#3B82F6", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899"];

/* ================================================================
   TRUCK DIAGRAM — improved with tight grouped axles
   ================================================================ */
function TruckDiagram({ groups, grossWeight, overallDist, svgRef, groupViolations = [], grossMax = null, grossOver = false, hideViolations = false, toleranceApplies = false, interior = null }) {
  // Larger viewBox aspect so diagram renders TALL when given full-width container
  const w = 900, h = 760, mL = 140, mR = 140;
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
    let reducedEndX = x; // x-position of the last non-dummy axle
    for (let i = 0; i < n; i++) {
      const isDummy = viol?.dummy?.hasDummy && i === baseN;
      const dummyDisregarded = isDummy && viol.dummy.disregarded && !hideViolations;
      const axleOver = !hideViolations && viol?.axleOverages?.some(o => o.axleIndex === i);
      allAxles.push({ x, axleNum: runningAxleNum, groupIdx: gi, isDummy, dummyDisregarded, isOver, withinTol, axleOver });
      if (!isDummy) reducedEndX = x;
      runningAxleNum++;
      if (i < n - 1) x += TIGHT;
    }
    const endX = x;
    const overBy = isOver ? (mainOver ? viol.actual - viol.max : (viol.tandemCheck.actual - viol.tandemCheck.max)) : 0;
    groupMeta.push({ gi, startX, endX, reducedEndX, label: g.label, startAxleNum, endAxleNum: runningAxleNum - 1, distFt: roundDist(g.distFt, "0"), distFtFull: viol?.distFtFull, distFtReduced: viol?.distFtReduced, dummyDisregarded: viol?.dummy?.hasDummy && viol.dummy.disregarded, hasDummy: viol?.dummy?.hasDummy, n, gWeight: viol ? viol.actual : 0, isOver, withinTol, overBy, max: viol?.max || (viol?.tandemCheck?.max ?? null), source: viol?.source });
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
        const pillW = 240, pillH = 96;
        // Clamp banner center so the pill never overflows the canvas
        const PAD = 10;
        const pillCx = Math.max(pillW / 2 + PAD, Math.min(w - pillW / 2 - PAD, cx));
        return (
          <g key={`banner-${i}`}>
            <rect x={pillCx - pillW / 2} y={14} width={pillW} height={pillH} rx="12" fill={gm.isOver ? (gm.withinTol ? "#3B2415" : "#3B1818") : (hideViolations ? "#1E293B" : "#0F2A1F")} stroke={color} strokeWidth="2.5" />
            <text x={pillCx} y={38} textAnchor="middle" fill="#94A3B8" fontSize="18" fontWeight="bold">
              {gm.endAxleNum !== gm.startAxleNum ? `A${gm.startAxleNum}-A${gm.endAxleNum}` : `A${gm.startAxleNum}`}
            </text>
            <text x={pillCx} y={70} textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="monospace">{gm.gWeight > 0 ? gm.gWeight.toLocaleString() : "—"}</text>
            {!hideViolations && gm.isOver ? (
              <text x={pillCx} y={94} textAnchor="middle" fill={color} fontSize="17" fontWeight="900">{`+${gm.overBy.toLocaleString()} OVER${gm.withinTol ? " (5% tol)" : ""}`}</text>
            ) : !hideViolations && gm.max ? (
              <text x={pillCx} y={94} textAnchor="middle" fill="#64748B" fontSize="17" fontWeight="bold">{`max ${gm.max.toLocaleString()}`}</text>
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
      <text x={w / 2} y={tTop + 54} textAnchor="middle" fill="#8FAEC5" fontSize="21" fontWeight="bold">GROSS WEIGHT</text>
      <text x={w / 2} y={tTop + 118} textAnchor="middle" fill={grossColor} fontSize="56" fontWeight="900" fontFamily="monospace">{grossWeight ? grossWeight.toLocaleString() : "—"}</text>
      {!hideViolations && grossMax && (
        <text x={w / 2} y={tTop + 154} textAnchor="middle" fill={grossActuallyOver ? OVER_RED : "#94A3B8"} fontSize="20" fontWeight="bold">
          {grossActuallyOver ? `+${(grossWeight - grossMax).toLocaleString()} OVER max ${grossMax.toLocaleString()}` : `max ${grossMax.toLocaleString()} lbs`}
        </text>
      )}
      {!hideViolations && grossMax && (
        <text x={w / 2} y={tTop + 188} textAnchor="middle" fill={grossActuallyOver ? OVER_RED : OK_GREEN} fontSize="21" fontWeight="900">
          {grossActuallyOver ? "OVERWEIGHT" : "LEGAL"}
        </text>
      )}

      {/* Axles */}
      {allAxles.map((a, i) => {
        const axleIsOver = !hideViolations && (a.isOver || a.axleOver);
        const wheelFill = axleIsOver ? ((a.withinTol && !a.axleOver) ? WARN_ORANGE : OVER_RED) : (a.isDummy ? (a.dummyDisregarded ? "#64748B" : "#D4AF37") : "#334155");
        const wheelStroke = axleIsOver ? ((a.withinTol && !a.axleOver) ? WARN_ORANGE : OVER_RED) : (a.isDummy ? "#D4AF37" : "#64748B");
        return (
          <g key={i}>
            <line x1={a.x} y1={axleY - 28} x2={a.x} y2={axleY + 14} stroke={axleIsOver ? OVER_RED : "#94A3B8"} strokeWidth="5" strokeLinecap="round" />
            <circle cx={a.x} cy={axleY + 22} r="19" fill={wheelFill} stroke={wheelStroke} strokeWidth={axleIsOver ? 3.5 : 3} opacity={a.dummyDisregarded ? 0.5 : 1} />
            <text x={a.x} y={axleY - 34} textAnchor="middle" fill={axleIsOver ? OVER_RED : "#CBD5E1"} fontSize="18" fontWeight="900">{`A${a.axleNum}`}</text>
            {a.isDummy && (
              <text x={a.x + 22} y={axleY + 28} fill={a.dummyDisregarded ? "#64748B" : "#D4AF37"} fontSize="17" fontWeight="900">D</text>
            )}
          </g>
        );
      })}

      {/* Group brackets + labels below axles */}
      {groupMeta.map((gm, i) => {
        const cx = (gm.startX + gm.endX) / 2;
        const brColor = !hideViolations && gm.isOver ? (gm.withinTol ? WARN_ORANGE : OVER_RED) : "#CBD5E1";
        const y = axleY + 72;            // outer/full bracket y
        const yReduced = axleY + 100;    // inner/reduced bracket y (below outer)
        const showReduced = gm.hasDummy && gm.distFtReduced && gm.reducedEndX !== undefined;
        return (
          <g key={`gm-${i}`}>
            {gm.n > 1 && (
              <>
                {/* Outer (full) bracket */}
                <line x1={gm.startX} y1={y} x2={gm.endX} y2={y} stroke={brColor} strokeWidth="3" opacity={gm.dummyDisregarded ? 0.35 : 0.7} strokeDasharray={gm.dummyDisregarded ? "6 4" : "0"} />
                <line x1={gm.startX} y1={y - 7} x2={gm.startX} y2={y + 7} stroke={brColor} strokeWidth="3" opacity={gm.dummyDisregarded ? 0.35 : 0.7} />
                <line x1={gm.endX} y1={y - 7} x2={gm.endX} y2={y + 7} stroke={brColor} strokeWidth="3" opacity={gm.dummyDisregarded ? 0.35 : 0.7} />
                {gm.distFtFull && (
                  <text x={cx} y={y - 6} textAnchor="middle" fill={gm.dummyDisregarded ? "#64748B" : "#D4AF37"} fontSize="17" fontWeight="900" style={gm.dummyDisregarded ? { textDecoration: "line-through" } : {}}>{`${gm.distFtFull} ft${gm.dummyDisregarded ? " (unused)" : ""}`}</text>
                )}
              </>
            )}
            {/* Inner bracket for reduced (dummy-disregarded) calc */}
            {showReduced && (
              <>
                <line x1={gm.startX} y1={yReduced} x2={gm.reducedEndX} y2={yReduced} stroke="#16A34A" strokeWidth="3" opacity="0.9" />
                <line x1={gm.startX} y1={yReduced - 7} x2={gm.startX} y2={yReduced + 7} stroke="#16A34A" strokeWidth="3" opacity="0.9" />
                <line x1={gm.reducedEndX} y1={yReduced - 7} x2={gm.reducedEndX} y2={yReduced + 7} stroke="#16A34A" strokeWidth="3" opacity="0.9" />
                <text x={(gm.startX + gm.reducedEndX) / 2} y={yReduced - 6} textAnchor="middle" fill="#16A34A" fontSize="16" fontWeight="900">{`${gm.distFtReduced} ft (calc)`}</text>
              </>
            )}
            <text x={cx} y={(showReduced ? yReduced : y) + 30} textAnchor="middle" fill={brColor} fontSize="19" fontWeight="bold">
              {gm.label || (gm.n > 1 ? `A${gm.startAxleNum}–A${gm.endAxleNum}` : `A${gm.startAxleNum}`)}
            </text>
          </g>
        );
      })}

      {/* Interior Bridge bracket (A2 → last axle) */}
      {interior && interior.enabled && allAxles.length >= 2 && (() => {
        const startX = allAxles[1].x;
        const endX = allAxles[allAxles.length - 1].x;
        const iY = axleY + 145;
        const intOver = !hideViolations && interior.over;
        const intColor = intOver ? OVER_RED : "#D4AF37";
        const pillW = 440, pillH = 42;
        const cx = (startX + endX) / 2;
        return (
          <g>
            <line x1={startX} y1={iY} x2={endX} y2={iY} stroke={intColor} strokeWidth="3" opacity="0.85" strokeDasharray="4 3" />
            <line x1={startX} y1={iY - 7} x2={startX} y2={iY + 7} stroke={intColor} strokeWidth="3" opacity="0.85" />
            <line x1={endX} y1={iY - 7} x2={endX} y2={iY + 7} stroke={intColor} strokeWidth="3" opacity="0.85" />
            <rect x={cx - pillW / 2} y={iY + 12} width={pillW} height={pillH} rx="8" fill="#0F172A" stroke={intColor} strokeWidth="2" />
            <text x={cx} y={iY + 40} textAnchor="middle" fill={intColor} fontSize="22" fontWeight="900">
              {interior.isCustom && !interior.distFt
                ? (intOver
                    ? `INTERIOR A${interior.startAxleNum}-A${interior.endAxleNum} · Custom · +${interior.overBy.toLocaleString()} OVER`
                    : `INTERIOR A${interior.startAxleNum}-A${interior.endAxleNum} · Custom max ${(interior.max || 0).toLocaleString()}`)
                : interior.distFt
                  ? (intOver
                      ? `INTERIOR A${interior.startAxleNum}-A${interior.endAxleNum} · ${interior.distFt} ft · +${interior.overBy.toLocaleString()} OVER`
                      : (interior.max
                          ? `INTERIOR A${interior.startAxleNum}-A${interior.endAxleNum} · ${interior.distFt} ft · max ${interior.max.toLocaleString()}`
                          : `INTERIOR A${interior.startAxleNum}-A${interior.endAxleNum} · ${interior.distFt} ft (no bridge data)`))
                  : `INTERIOR A${interior.startAxleNum}-A${interior.endAxleNum}`}
            </text>
          </g>
        );
      })()}

      {/* Overall distance */}
      {allAxles.length > 1 && overallDist && (
        <g>
          <line x1={allAxles[0].x} y1={axleY + 225} x2={allAxles[allAxles.length - 1].x} y2={axleY + 225} stroke="#64748B" strokeWidth="2" />
          <line x1={allAxles[0].x} y1={axleY + 217} x2={allAxles[0].x} y2={axleY + 233} stroke="#64748B" strokeWidth="2" />
          <line x1={allAxles[allAxles.length - 1].x} y1={axleY + 217} x2={allAxles[allAxles.length - 1].x} y2={axleY + 233} stroke="#64748B" strokeWidth="2" />
          <text x={(allAxles[0].x + allAxles[allAxles.length - 1].x) / 2} y={axleY + 253} textAnchor="middle" fill="#CBD5E1" fontSize="19" fontWeight="bold">{`${overallDist} ft overall`}</text>
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
  const location = useLocation();
  const { badge } = useAuth();
  const svgRef = useRef(null);
  const photoRef = useRef(null);
  const [tab, setTab] = useState("chart");
  const [showRules, setShowRules] = useState(false);
  const [rulesTab, setRulesTab] = useState("rules"); // "rules" | "measure"

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
  const [isGrossCollapsed, setIsGrossCollapsed] = useState(false);
  // React-controlled mirror of the saved default-interstate preference so the dot
  // indicator updates immediately when the user taps "Set as default".
  const [userDefaultInterstate, setUserDefaultInterstate] = useState(() => getDefaultInterstate(badge));
  const captureRef = useRef(null);
  const makeGroup = (label, preset, axles) => ({
    label, preset, axles: String(axles), distFt: "", distFtReduced: "", useGroup: axles > 1, groupWeight: "", weights: Array(axles).fill(""), maxOverride: "", dummyAxle: false
  });
  // Initialize from localStorage if present
  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const defaultGroups = () => [
    makeGroup("Steer", "Single", 1),
    makeGroup("Drive", "Tandem (2)", 2),
    makeGroup("Trailer", "Tandem (2)", 2),
  ];
  const initial = loadSaved();
  // Two fully independent slots: Bridge Formula vs Custom / Permit. Each preserves its own
  // groups/weights/distances/gross max/interior/photos so switching tabs never mutates the other.
  const loadSlot = (slotName) => {
    const slot = initial?.slots?.[slotName];
    return {
      groups: slot?.groups || defaultGroups(),
      overallDistFt: slot?.overallDistFt || "",
      customGrossMax: slot?.customGrossMax || "",
      photos: slot?.photos || [],
      interiorDistFt: slot?.interiorDistFt || "",
      customInteriorMax: slot?.customInteriorMax || "",
      isInterstate: slot?.isInterstate !== undefined ? slot.isInterstate : getDefaultInterstate(badge),
    };
  };
  // Migrate legacy single-slot saves into the "bridge" slot on first load.
  const legacyBridgeSlot = initial && !initial.slots ? {
    groups: initial.groups || defaultGroups(),
    overallDistFt: initial.overallDistFt || "",
    customGrossMax: initial.customGrossMax || "",
    photos: initial.photos || [],
    interiorDistFt: initial.interiorDistFt || "",
    customInteriorMax: initial.customInteriorMax || "",
    isInterstate: getDefaultInterstate(badge),
  } : null;

  const initialBridge = legacyBridgeSlot && !initial?.isCustom ? legacyBridgeSlot : loadSlot("bridge");
  const initialCustom = legacyBridgeSlot && initial?.isCustom ? legacyBridgeSlot : loadSlot("custom");
  const initialActive = initial?.isCustom ? initialCustom : initialBridge;

  const [groups, setGroups] = useState(initialActive.groups);
  const [overallDistFt, setOverallDistFt] = useState(initialActive.overallDistFt);
  const [customGrossMax, setCustomGrossMax] = useState(initialActive.customGrossMax);
  const [photos, setPhotos] = useState(initialActive.photos);
  const [interiorDistFt, setInteriorDistFt] = useState(initialActive.interiorDistFt);
  const [customInteriorMax, setCustomInteriorMax] = useState(initialActive.customInteriorMax);
  const [isInterstate, setIsInterstate] = useState(initialActive.isInterstate);
  const [isInteriorBridgeCollapsed, setIsInteriorBridgeCollapsed] = useState(true);
  // Stored state for the inactive tab
  const [otherSlot, setOtherSlot] = useState(initial?.isCustom ? initialBridge : initialCustom);

  useEffect(() => { if (initial?.isCustom) setIsCustom(true); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rehydrate from saved weight assessment (via "Recreate in Weights")
  useEffect(() => {
    const saved = location.state?.recreateWeight;
    if (!saved) return;
    if (saved.is_custom) setIsCustom(true); else setIsCustom(false);
    if (saved.groups?.length) setGroups(saved.groups);
    if (saved.overall_dist_ft != null) setOverallDistFt(saved.overall_dist_ft);
    if (saved.custom_gross_max != null) setCustomGrossMax(saved.custom_gross_max);
    if (saved.interior_dist_ft != null) setInteriorDistFt(saved.interior_dist_ft);
    if (saved.custom_interior_max != null) setCustomInteriorMax(saved.custom_interior_max);
    if (saved.is_interstate != null) setIsInterstate(saved.is_interstate);
    // Jump to the Record Weights tab so data lands exactly where it was saved from
    setTab("record");
    // Clear the state so a refresh doesn't re-hydrate
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSlotObj = useCallback(() => ({ groups, overallDistFt, customGrossMax, photos, interiorDistFt, customInteriorMax, isInterstate }), [groups, overallDistFt, customGrossMax, photos, interiorDistFt, customInteriorMax, isInterstate]);

  // Switch to the other tab: snapshot current → otherSlot, restore otherSlot → active state.
  const switchMode = (newIsCustom) => {
    if (newIsCustom === isCustom) return;
    const snapshot = currentSlotObj();
    const restore = otherSlot;
    setOtherSlot(snapshot);
    setGroups(restore.groups);
    setOverallDistFt(restore.overallDistFt);
    setCustomGrossMax(restore.customGrossMax);
    setPhotos(restore.photos);
    setInteriorDistFt(restore.interiorDistFt);
    setCustomInteriorMax(restore.customInteriorMax);
    setIsInterstate(restore.isInterstate !== undefined ? restore.isInterstate : getDefaultInterstate(badge));
    setIsCustom(newIsCustom);
  };

  // Persist on change — both slots.
  useEffect(() => {
    try {
      const active = { groups, overallDistFt, customGrossMax, photos, interiorDistFt, customInteriorMax, isInterstate };
      const slots = isCustom ? { bridge: otherSlot, custom: active } : { bridge: active, custom: otherSlot };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, isCustom }));
    } catch {}
  }, [STORAGE_KEY, groups, overallDistFt, customGrossMax, photos, isCustom, interiorDistFt, customInteriorMax, isInterstate, otherSlot]);

  const clearRecord = () => {
    if (!window.confirm("Clear all recorded weights, distances, and photos for this tab?")) return;
    setGroups(defaultGroups());
    setOverallDistFt("");
    setCustomGrossMax("");
    setPhotos([]);
    setInteriorDistFt("");
    setCustomInteriorMax("");
    setIsInterstate(getDefaultInterstate(badge));
    // leave otherSlot intact so switching tabs restores its data
    toast.success("Cleared");
  };

  const [showInspPicker, setShowInspPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [isReportCollapsed, setIsReportCollapsed] = useState(false);
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState(false);

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
    // Rule: To COUNT, dummy must meet AT LEAST ONE threshold: ≥ 8,000 lbs OR ≥ 8% of gross.
    // Disregarded only when it fails BOTH (< 8,000 lbs AND < 8% of gross).
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
      // Distance selection:
      //   • No dummy → use g.distFt (standard group span)
      //   • Dummy counted → use g.distFt (full span including dummy)
      //   • Dummy disregarded → use g.distFtReduced ONLY. If not provided, treat as
      //     a standard group with no distance (so a tandem reverts to the 34k rule).
      const gDistFull = roundDist(g.distFt, "0");
      const gDistReduced = roundDist(g.distFtReduced, "0");
      const gDist = di.hasDummy && di.disregarded ? gDistReduced : gDistFull;
      const baseDescMap = { 1: "Single", 2: "Tandem", 3: "Triple", 4: "Quad", 5: "5-axle", 6: "6-axle", 7: "7-axle" };
      const baseDesc = baseDescMap[baseN] || `${baseN}-axle`;
      const dummySuffix = di.hasDummy ? (di.disregarded ? "" : "+dummy") : "";
      const configLabel = di.hasDummy ? `${baseDesc}${dummySuffix ? `+dummy` : ""}` : baseDesc;

      let max = null, source = "";
      if (isCustom && g.maxOverride) { max = parseInt(g.maxOverride); source = "Custom"; }
      else if (n === 1) { max = 20000; source = "Single axle"; }
      else if (n === 2 && !gDist) { max = 34000; source = "Tandem"; }
      else if (n >= 2 && gDist) {
        const lk = bridgeLookup(gDist, n);
        if (lk) {
          max = lk;
          if (di.hasDummy && !di.disregarded) {
            source = `${baseDesc}+dummy · Bridge ${gDist}ft, ${n} axles`;
          } else if (di.hasDummy && di.disregarded) {
            source = `${baseDesc} (dummy disregarded) · Bridge ${gDist}ft, ${n} axles`;
          } else {
            source = `${configLabel} · Bridge ${gDist}ft, ${n} axles`;
          }
        } else if (n === 2) { max = 34000; source = "Tandem"; }
      }
      else if (n === 2) { max = 34000; source = "Tandem"; }

      // Secondary tandem 34k check — only when dummy is COUNTED AND we know the base-tandem
      // sum without the dummy (individual-weights mode). In group-weights mode the app
      // cannot separate base-tandem from dummy, so the new tandemSubsetChecks
      // (on individual pairs) handles it instead when in individual mode, and group
      // mode relies on the triple bridge formula for the whole group.
      let tandemCheck = null;
      if (di.hasDummy && baseN === 2 && !di.disregarded && di.dummyWeight > 0 && !g.useGroup) {
        // Use the summed base-tandem weight (A1+A2), NOT the dummy, so we never double-count.
        const w1 = parseInt(g.weights?.[0]) || 0;
        const w2 = parseInt(g.weights?.[1]) || 0;
        const tandemActual = w1 + w2;
        if (tandemActual > 0) {
          tandemCheck = { actual: tandemActual, max: 34000, source: `Base tandem (A${axleNumbers[gi].start}-A${axleNumbers[gi].start + 1}) — dummy counted as 3rd axle` };
        }
      }

      // Reminder to enter a distance for any 3+ axle group so the bridge lookup can apply.
      // When the dummy axle is what pushed the count past a tandem, this is extra critical —
      // otherwise the app falls back to the 34,000 tandem cap which is overly strict for a triple+.
      const needsTripleDistance = n >= 3 && !gDistFull;
      const dummyCreatedTriple = di.hasDummy && !di.disregarded && baseN === 2 && n >= 3;

      // Single-axle 20,000 lb rule — applies to every axle individually (base + dummy if counted)
      // Only evaluable in Individual weights mode
      const SINGLE_AXLE_MAX = 20000;
      const axleOverages = [];
      if (!g.useGroup && !isCustom) {
        for (let k = 0; k < baseN; k++) {
          const w = parseInt(g.weights?.[k]) || 0;
          if (w > SINGLE_AXLE_MAX) {
            axleOverages.push({ axleNum: axleNumbers[gi].start + k, axleIndex: k, weight: w, max: SINGLE_AXLE_MAX, over: w - SINGLE_AXLE_MAX });
          }
        }
        // Include dummy axle too when it's counted (not disregarded)
        if (di.hasDummy && !di.disregarded) {
          const dw = di.dummyWeight;
          if (dw > SINGLE_AXLE_MAX) {
            axleOverages.push({ axleNum: axleNumbers[gi].start + baseN, axleIndex: baseN, weight: dw, max: SINGLE_AXLE_MAX, over: dw - SINGLE_AXLE_MAX, isDummy: true });
          }
        }
      }

      const an = axleNumbers[gi];
      const axLabel = an.start === an.end ? `A${an.start}` : `A${an.start}-${an.end}`;

      // Consecutive tandem-subset checks within groups of 3+ axles (triples, quads, ...)
      // Each consecutive pair is checked against 34,000 lb (standard tandem max), or against
      // the bridge formula if the user supplies a per-pair distance in g.tandemDists[i].
      // Only evaluable in Individual weights mode and only when not in Custom / Permit mode.
      const tandemSubsetChecks = [];
      if (!g.useGroup && !isCustom && baseN >= 3) {
        const pairCount = baseN - 1;
        for (let i = 0; i < pairCount; i++) {
          const w1 = parseInt(g.weights?.[i]) || 0;
          const w2 = parseInt(g.weights?.[i + 1]) || 0;
          const sum = w1 + w2;
          if (sum <= 0) continue;
          const pairDistRaw = g.tandemDists?.[i];
          const pairDistRound = roundDist(pairDistRaw, "0");
          let pairMax = 34000, pairSource = "Tandem";
          if (pairDistRound) {
            const lk = bridgeLookup(pairDistRound, 2);
            if (lk) { pairMax = lk; pairSource = `Bridge (${pairDistRound}ft, 2ax)`; }
          }
          const startAn = an.start + i;
          const endAn = an.start + i + 1;
          tandemSubsetChecks.push({
            pairIndex: i,
            startAxleNum: startAn,
            endAxleNum: endAn,
            label: `A${startAn}-A${endAn}`,
            actual: sum,
            max: pairMax,
            source: pairSource,
            distFt: pairDistRound,
            over: sum > pairMax,
            overBy: sum > pairMax ? sum - pairMax : 0,
            hasDistanceInput: !!pairDistRaw,
          });
        }
      }

      return { gi, label: g.label || axLabel, actual: gWeight, max, source, n, baseN, distRound: gDist, distFtFull: gDistFull, distFtReduced: gDistReduced, tandemCheck, dummy: di, axleOverages, tandemSubsetChecks, needsTripleDistance, dummyCreatedTriple };
    });

    // Count how many violations exist across all groups (for 5% tolerance rule)
    // 5% tolerance applies ONLY when exactly one violation exists.
    let violationCount = 0;
    groupViolations.forEach(v => {
      if (v.max && v.actual > v.max) violationCount++;
      if (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max) violationCount++;
      if (v.axleOverages) violationCount += v.axleOverages.length;
      if (v.tandemSubsetChecks) violationCount += v.tandemSubsetChecks.filter(t => t.over).length;
    });
    // Note: gross weight never gets tolerance, so don't count it

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
    // Interstate rule: gross can never exceed 80,000 lb regardless of axles/bridge formula.
    // Only applies in Bridge Formula mode (Custom / Permit uses whatever max the permit grants).
    if (!isCustom && isInterstate) {
      if (grossMax == null || grossMax > 80000) {
        grossMax = 80000;
        grossSource = grossSource ? `Interstate 80,000 cap (was ${grossSource})` : "Interstate 80,000 cap";
      }
    }

    const conflicts = [];
    if (totalAxles < 1) conflicts.push("No axles defined");
    if (!isCustom) groups.forEach((g, i) => {
      const n = ruleAxles(g, i);
      const di = dummyInfoList[i];
      const d = di.hasDummy && di.disregarded ? roundDist(g.distFtReduced, "0") : roundDist(g.distFt, "0");
      if (n > 1 && d && (d < 4 || d > 60)) conflicts.push(`${g.label || `Group ${i + 1}`}: ${d}ft outside bridge range (4-60)`);
      if (!isCustom && n >= 2 && d && !bridgeLookup(d, n)) conflicts.push(`${g.label || `Group ${i + 1}`}: no data for ${d}ft / ${n} axles`);
    });

    // Interior Bridge (A2 → last axle). Optional check against bridge formula.
    // Axle count auto-computed from current setup. Weight = gross − A1 weight.
    // A1 weight: first axle of the first non-empty group. Uses individual weight when available,
    // otherwise approximates via (groupWeight / count) so group-mode entries still produce a usable check.
    let interior = null;
    const interiorDistRound = roundDist(interiorDistFt, "0");
    const firstGroupIdx = groups.findIndex(g => (parseInt(g.axles) || 0) > 0);
    if (totalAxles >= 2 && firstGroupIdx !== -1) {
      const g0 = groups[firstGroupIdx];
      const baseN0 = parseInt(g0.axles) || 0;
      let a1Weight = 0;
      if (g0.useGroup) {
        const gw = parseInt(g0.groupWeight) || 0;
        a1Weight = baseN0 > 0 ? Math.round(gw / baseN0) : gw;
      } else {
        a1Weight = parseInt(g0.weights?.[0]) || 0;
      }
      const interiorAxleCount = totalAxles - 1;
      const interiorActual = Math.max(0, gross - a1Weight);
      const interiorLastAxleNum = axleNumbers.reduce((last, an) => Math.max(last, an.end), 0);
      const interiorStartAxleNum = axleNumbers[firstGroupIdx]?.start + 1 || 2; // A2 of first group (or 2nd overall)
      let interiorMax = null, interiorSource = "";
      if (isCustom && customInteriorMax) {
        interiorMax = parseInt(customInteriorMax) || null;
        if (interiorMax) interiorSource = "Custom";
      } else if (interiorDistRound && interiorAxleCount >= 2) {
        const lk = bridgeLookup(interiorDistRound, interiorAxleCount);
        if (lk) { interiorMax = lk; interiorSource = `Bridge (${interiorDistRound}ft, ${interiorAxleCount}ax)`; }
        else if (interiorAxleCount === 2) { interiorMax = 34000; interiorSource = "Tandem"; }
      }
      interior = {
        enabled: isCustom ? !!customInteriorMax : !!interiorDistFt,
        distFt: interiorDistRound,
        axleCount: interiorAxleCount,
        actual: interiorActual,
        a1Weight,
        startAxleNum: interiorStartAxleNum,
        endAxleNum: interiorLastAxleNum,
        max: interiorMax,
        source: interiorSource,
        isCustom: isCustom && !!customInteriorMax,
        over: interiorMax != null && interiorActual > interiorMax,
        overBy: interiorMax != null && interiorActual > interiorMax ? interiorActual - interiorMax : 0,
        longerThanOverall: !!(interiorDistRound && overallRound && interiorDistRound > overallRound),
      };
      if (!isCustom && interiorDistRound && interiorAxleCount >= 2 && !interiorMax) {
        conflicts.push(`Interior bridge: no data for ${interiorDistRound}ft / ${interiorAxleCount} axles`);
      }
      if (!isCustom && interiorDistRound && (interiorDistRound < 4 || interiorDistRound > 60) && interiorAxleCount >= 2) {
        conflicts.push(`Interior bridge: ${interiorDistRound}ft outside bridge range (4-60)`);
      }
      if (interiorDistRound && overallRound && interiorDistRound > overallRound) {
        conflicts.push(`Interior bridge (${interiorDistRound}ft) is longer than Overall Distance (${overallRound}ft) — geometrically impossible (A2→last must be shorter than A1→last)`);
      }
    }

    // Finalize tolerance: interior bridge never gets the 5% tolerance (like gross weight),
    // and it is not counted toward the tolerance threshold.
    // Custom / Permit mode never applies the 5% tolerance (permits have their own rules).
    const toleranceApplies = !isCustom && violationCount === 1;

    return { totalAxles, gross, rawGross, overallRound, groupViolations, grossMax, grossSource, grossNote, conflicts, valid: conflicts.length === 0 && totalAxles > 0, dummyInfoList, toleranceApplies, interior };
  }, [groups, overallDistFt, isCustom, customGrossMax, axleNumbers, interiorDistFt, customInteriorMax, isInterstate]);

  const handlePhoto = (e) => { Array.from(e.target.files || []).forEach(f => { const r = new FileReader(); r.onload = (ev) => setPhotos(p => [...p, { dataUrl: ev.target.result, file: f }]); r.readAsDataURL(f); }); e.target.value = ""; };

  // Capture the Weight Report as a clean, printable PNG using the dedicated
  // WeightReportPrintable layout (900px wide, structured for readability),
  // rendered off-screen so the on-screen UI is unchanged.
  const getCaptureBlob = useCallback(async () => {
    // Build photo URLs for thumbnails
    const photoThumbs = photos.map((p, i) => ({ id: p.id || `p${i}`, url: p.dataUrl }));

    // Grab the live truck diagram SVG HTML so we preserve all its styling.
    const svgEl = svgRef.current;
    const svgHTML = svgEl ? svgEl.outerHTML : "";

    // Off-screen host
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.top = "-10000px";
    host.style.left = "0";
    host.style.width = "900px";
    host.style.pointerEvents = "none";
    host.style.zIndex = "-1";
    document.body.appendChild(host);

    let canvas;
    try {
      const root = ReactDOM.createRoot(host);
      await new Promise((resolve) => {
        root.render(
          <WeightReportPrintable
            groups={groups}
            record={record}
            overallDistFt={overallDistFt}
            isCustom={isCustom}
            isInterstate={isInterstate}
            diagramSvgMarkup={svgHTML}
            badge={badge}
            photos={photoThumbs}
            axleNumbers={axleNumbers}
          />
        );
        // Wait two animation frames so React commits and images start loading
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      // Give image thumbnails a beat to decode
      await new Promise((r) => setTimeout(r, 120));

      const target = host.firstElementChild;
      canvas = await html2canvas(target, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      root.unmount();
    } catch (err) {
      console.error("Capture failed", err);
      document.body.removeChild(host);
      return null;
    }
    document.body.removeChild(host);
    return await new Promise((r) => canvas.toBlob(r, "image/png"));
  }, [groups, record, overallDistFt, isCustom, isInterstate, badge, photos, axleNumbers]);

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
  const openPreview = async () => {
    const b = await getCaptureBlob();
    if (!b) { toast.error("Capture failed"); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(b));
    setShowPreview(true);
  };
  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };
  // Close preview on Escape key
  useEffect(() => {
    if (!showPreview) return;
    const onKey = (e) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);
  const openInspPicker = async () => { setShowInspPicker(true); try { const r = await fetch(`${API}/api/inspections?badge=${badge}`); if (r.ok) { const d = await r.json(); setInspections(d.inspections || []); } } catch {} };
  const addToInsp = async (id) => {
    setSaving(true);
    // Capture the truck diagram SVG markup so we can embed it in the inspection view / PDF
    let truckSvg = "";
    try {
      const svg = svgRef.current;
      if (svg) {
        // Clone + ensure proper xmlns for standalone rendering
        const clone = svg.cloneNode(true);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        truckSvg = clone.outerHTML;
      }
    } catch {}
    // Upload any inspector-taken photos (via camera icon) as general_photos
    for (const p of photos) {
      if (p.file) {
        const fd = new FormData();
        fd.append("file", p.file, p.file.name);
        await fetch(`${API}/api/inspections/${id}/annotated-photos`, { method: "POST", body: fd });
      }
    }
    // POST structured snapshot (data only — no report PNG)
    try {
      await fetch(`${API}/api/inspections/${id}/weight-assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_custom: !!isCustom,
          is_interstate: !!isInterstate,
          groups,
          overall_dist_ft: overallDistFt,
          custom_gross_max: customGrossMax,
          interior_dist_ft: interiorDistFt,
          custom_interior_max: customInteriorMax,
          total_axles: record.totalAxles || 0,
          gross_weight: record.gross || 0,
          gross_max: record.grossMax || null,
          violation_count: (record.groupViolations || []).reduce((s, v) => {
            let c = 0;
            if (v.max && v.actual > v.max) c++;
            if (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max) c++;
            if (v.axleOverages) c += v.axleOverages.length;
            if (v.tandemSubsetChecks) c += v.tandemSubsetChecks.filter(t => t.over).length;
            return s + c;
          }, 0) + (record.grossMax && record.gross > record.grossMax ? 1 : 0),
          mode_label: isCustom ? "Custom" : "Bridge Formula",
          truck_diagram_svg: truckSvg,
          group_violations: record.groupViolations || [],
          tolerance_applies: !!record.toleranceApplies,
          interior: record.interior || null,
        }),
      });
    } catch {}
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
            <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-bold text-white">Size &amp; Weight Rules</h2>
              </div>
              <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white" data-testid="close-rules-btn"><X className="w-4 h-4" /></button>
            </div>
            {/* Tabs — pill style matching page-level tabs above */}
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <button
                onClick={() => setRulesTab("rules")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${rulesTab === "rules" ? "bg-[#D4AF37] text-[#002855] shadow-sm" : "bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#002855]"}`}
                data-testid="rules-tab-rules"
              >
                <Info className="w-3.5 h-3.5" /> Rules
              </button>
              <button
                onClick={() => setRulesTab("measure")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${rulesTab === "measure" ? "bg-[#D4AF37] text-[#002855] shadow-sm" : "bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#002855]"}`}
                data-testid="rules-tab-measure"
              >
                <Ruler className="w-3.5 h-3.5" /> How to Measure Bridge
              </button>
            </div>
            {rulesTab === "rules" ? (
              <div className="divide-y divide-[#F1F5F9]">
                {RULES.map((r, i) => (
                  <div key={i} className={`px-4 py-2.5 ${r.hl ? "bg-[#D4AF37]/5" : ""}`}>
                    <h3 className="text-xs font-bold text-[#002855] mb-1">
                      {r.title}
                      {r.cfr && <span className="ml-1 text-[10px] font-mono text-[#D4AF37]">{r.cfr}</span>}
                      {r.note && <span className="ml-1 text-[10px] italic font-normal text-[#64748B]">{r.note}</span>}
                    </h3>
                    {r.items.map((it, j) => <p key={j} className="text-[11px] text-[#475569] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#CBD5E1]">{it}</p>)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 sm:p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <img src="https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/mr43ejti_IMG_1317.png" alt="Correct method for measuring groups of axles — page 1" className="w-full rounded-lg border border-[#E2E8F0] bg-white" loading="lazy" />
                <img src="https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/fiw8pnld_IMG_1318.png" alt="Correct method for measuring groups of axles — page 2" className="w-full rounded-lg border border-[#E2E8F0] bg-white" loading="lazy" />
              </div>
            )}
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
          {/* UNIFIED ACTION BAR — Preview & Export + Save to Inspection */}
          <div className="sticky top-[86px] z-40 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-white/95 backdrop-blur border-b border-[#E2E8F0] shadow-sm" data-html2canvas-ignore="true">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openPreview} className="bg-[#002855] text-white hover:bg-[#001a3a] h-9 text-xs font-bold flex-1" data-testid="export-standalone-btn"><Eye className="w-3.5 h-3.5 mr-1.5" /> Preview &amp; Export</Button>
              <Button size="sm" onClick={openInspPicker} variant="outline" className="border-[#002855]/20 text-[#002855] hover:bg-[#002855]/5 h-9 text-xs font-bold flex-1" data-testid="save-to-inspection-btn"><FolderPlus className="w-3.5 h-3.5 mr-1.5" /> Save to Inspection</Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => switchMode(false)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${!isCustom ? "bg-[#002855] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`} data-testid="mode-bridge">Bridge Formula</button>
              <button onClick={() => switchMode(true)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${isCustom ? "bg-[#002855] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`} data-testid="mode-custom">Custom / Permit</button>
              {!isCustom && (() => {
                const userDefault = userDefaultInterstate;
                const matches = userDefault === isInterstate;
                return (
                  <>
                    <div className="flex items-center gap-0 rounded-full bg-white border border-[#E2E8F0] overflow-hidden" data-testid="interstate-toggle">
                      <button onClick={() => setIsInterstate(true)} className={`relative px-3 py-1.5 text-[11px] font-bold ${isInterstate ? "bg-[#D4AF37] text-[#002855]" : "text-[#64748B]"}`} data-testid="interstate-on" title={userDefault === true ? "Your saved default" : ""}>
                        Interstate{userDefault === true && <span className="ml-1 text-[9px] font-black opacity-80">●</span>}
                      </button>
                      <button onClick={() => setIsInterstate(false)} className={`relative px-3 py-1.5 text-[11px] font-bold ${!isInterstate ? "bg-[#D4AF37] text-[#002855]" : "text-[#64748B]"}`} data-testid="interstate-off" title={userDefault === false ? "Your saved default" : ""}>
                        Non-interstate{userDefault === false && <span className="ml-1 text-[9px] font-black opacity-80">●</span>}
                      </button>
                    </div>
                    {!matches && (
                      <button
                        onClick={() => {
                          savePrefs(badge, { defaultInterstate: isInterstate });
                          setUserDefaultInterstate(isInterstate);
                          toast.success(`${isInterstate ? "Interstate" : "Non-interstate"} set as your default`);
                        }}
                        className="text-[10px] font-bold text-[#002855] underline decoration-dotted underline-offset-2 hover:text-[#D4AF37]"
                        data-testid="set-default-interstate"
                        title="Save the current selection as your default"
                      >
                        Set as default
                      </button>
                    )}
                  </>
                );
              })()}
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
              const anyAxleOver = showViolations && (viol?.axleOverages?.length > 0);
              const tandemSubsetOvers = showViolations ? (viol?.tandemSubsetChecks || []).filter(t => t.over) : [];
              const anyTandemSubsetOver = tandemSubsetOvers.length > 0;
              const isOver = mainOver || tandemOver || anyAxleOver || anyTandemSubsetOver;
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
                    className={`w-full px-3 py-4 min-h-[60px] flex items-center justify-between text-left cursor-pointer border-b leading-[1.6] ${isOver ? (withinTol ? "bg-[#F97316] border-[#F97316]" : "bg-[#DC2626] border-[#DC2626]") : "bg-[#002855] border-[#002855]"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/20" style={{ background: COLORS[gi % COLORS.length] }} />
                      <span className="text-sm font-bold text-white truncate">{g.label || axLabel}</span>
                      <span className="text-[10px] text-white/60 font-mono flex-shrink-0">{axLabel}</span>
                      {gWeight > 0 && <span className="text-xs font-black text-[#D4AF37] flex-shrink-0 font-mono">{gWeight.toLocaleString()}</span>}
                      {isOver && (
                        <span className={`text-[10px] font-bold flex-shrink-0 flex items-center gap-0.5 text-white bg-black/20 rounded px-1.5 py-0.5`}>
                          <AlertTriangle className="w-2.5 h-2.5" />
                          +{(
                            mainOver ? (gWeight - viol.max) :
                            tandemOver ? (viol.tandemCheck.actual - viol.tandemCheck.max) :
                            anyTandemSubsetOver ? tandemSubsetOvers.reduce((s, t) => s + t.overBy, 0) :
                            anyAxleOver ? viol.axleOverages.reduce((s, o) => s + o.over, 0) : 0
                          ).toLocaleString()}
                        </span>
                      )}
                      {hasViol && !isOver && gWeight > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" data-html2canvas-ignore="true">
                      <select value={g.preset} onClick={e => e.stopPropagation()} onChange={e => updateGroup(gi, "preset", e.target.value)} className="text-[10px] bg-white/10 text-white border border-white/20 rounded px-1.5 py-0.5 outline-none">
                        {[{ l: "Single", v: "Single" }, { l: "Tandem", v: "Tandem (2)" }, { l: "Triple", v: "Triple (3)" }, { l: "Quad", v: "Quad (4)" }, { l: "Custom", v: "Custom" }].map(p => <option key={p.v} value={p.v} className="text-[#002855]">{p.l}</option>)}
                      </select>
                      {groups.length > 1 && <button onClick={e => { e.stopPropagation(); removeGroup(gi); }} className="text-white/50 hover:text-white p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>}
                      {g._collapsed ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronUp className="w-4 h-4 text-white/80" />}
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
                        {n > 1 && (
                          <div className="w-24">
                            <label className={`text-[8px] font-bold uppercase block ${g.dummyAxle && viol?.dummy?.disregarded ? "text-[#94A3B8] line-through" : "text-[#94A3B8]"}`} title={g.dummyAxle ? "Full group span including dummy" : "Group span"}>
                              {g.dummyAxle ? "Full Span (ft)" : "Dist (ft)"}
                            </label>
                            <input type="number" inputMode="numeric" value={g.distFt} onChange={e => updateGroup(gi, "distFt", e.target.value)} placeholder={n === 2 ? "Std" : "ft"} className={`w-full px-1.5 py-1.5 text-xs font-bold text-center rounded border border-[#E2E8F0] outline-none placeholder:text-[#CBD5E1] ${g.dummyAxle && viol?.dummy?.disregarded ? "opacity-50" : ""}`} />
                          </div>
                        )}
                        {g.dummyAxle && n > 1 && (() => {
                          const baseNumLocal = parseInt(g.axles) || 0;
                          const reducedLabel = baseNumLocal === 1 ? `A${an.start}` : `A${an.start}-A${an.start + baseNumLocal - 1}`;
                          return (
                            <div className="w-24">
                              <label className={`text-[8px] font-bold uppercase block ${viol?.dummy?.disregarded ? "text-[#16A34A]" : "text-[#94A3B8]"}`} title="Distance of the remaining axles (used when dummy is disregarded)">
                                {reducedLabel} (ft)
                              </label>
                              <input type="number" inputMode="numeric" value={g.distFtReduced} onChange={e => updateGroup(gi, "distFtReduced", e.target.value)} placeholder={baseNumLocal === 2 ? "Std" : "ft"} className={`w-full px-1.5 py-1.5 text-xs font-bold text-center rounded border outline-none placeholder:text-[#CBD5E1] ${viol?.dummy?.disregarded ? "border-[#16A34A]/50 bg-[#F0FDF4]" : "border-[#E2E8F0]"}`} />
                            </div>
                          );
                        })()}
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
                                <span className="text-[7px] font-bold flex items-center gap-0.5 text-[#D4AF37]">A{an.end} (dummy){counted ? "" : ""}</span>
                                <input type="number" inputMode="numeric" value={g.weights?.[parseInt(g.axles)] || ""} onChange={e => updateWeight(gi, parseInt(g.axles), e.target.value)} placeholder="dummy lbs" className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/5 outline-none" />
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          {Array.from({ length: effAxles(g) }, (_, wi) => {
                            const baseNum = parseInt(g.axles) || 0;
                            const isDummy = g.dummyAxle && wi === baseNum;
                            const axleOver = showViolations && viol?.axleOverages?.some(o => o.axleIndex === wi);
                            return (
                              <div key={wi} className="flex-1 min-w-0">
                                <span className={`text-[7px] font-bold flex items-center gap-0.5 ${axleOver ? "text-[#DC2626]" : isDummy ? "text-[#D4AF37]" : "text-[#94A3B8]"}`}>
                                  A{an.start + wi}{isDummy ? " (dummy)" : ""}{axleOver && <AlertTriangle className="w-2 h-2" />}
                                </span>
                                <input type="number" inputMode="numeric" value={g.weights?.[wi] || ""} onChange={e => updateWeight(gi, wi, e.target.value)} placeholder={isDummy ? "dummy lbs" : "lbs"} className={`w-full px-1 py-1.5 text-[11px] font-bold text-center rounded border outline-none ${axleOver ? "border-[#EF4444]/80 bg-[#FEE2E2]/70 text-[#DC2626]" : isDummy ? "border-[#D4AF37]/50 bg-[#D4AF37]/5" : isOver ? "border-[#EF4444]/50 bg-[#FEE2E2]/30" : "border-[#E2E8F0]"}`} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dummy Axle toggle — for base tandem / triple / quad */}
                      {parseInt(g.axles) >= 2 && parseInt(g.axles) <= 4 && (
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-[10px] text-[#64748B] cursor-pointer select-none" data-testid={`dummy-axle-toggle-${gi}`}>
                            <input type="checkbox" checked={!!g.dummyAxle} onChange={e => {
                              const checked = e.target.checked;
                              // When enabling a dummy, clear the distance field so the user is prompted
                              // to enter the NEW full-span distance that now includes the dummy axle.
                              // When disabling, also clear distFtReduced so stale values don't linger.
                              setGroups(curr => curr.map((x, i) => i === gi ? {
                                ...x,
                                dummyAxle: checked,
                                ...(checked ? { distFt: "", distFtReduced: "" } : { distFtReduced: "" }),
                              } : x));
                            }} className="w-3 h-3 accent-[#D4AF37]" />
                            <span>Add <strong className="text-[#D4AF37]">dummy axle</strong> <span className="text-[#94A3B8]">(counts if it meets either threshold: ≥ 8,000 lbs OR ≥ 8% of gross; otherwise disregarded)</span></span>
                          </label>
                          {g.dummyAxle && viol?.dummy?.dummyWeight > 0 && (() => {
                            const anyGroupViol = !!((viol.max && viol.actual > viol.max) || (viol.tandemCheck && viol.tandemCheck.actual > viol.tandemCheck.max) || (viol.axleOverages && viol.axleOverages.length > 0));
                            const cls = viol.dummy.disregarded && anyGroupViol
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : "bg-[#FEF3C7] text-[#92400E]";
                            return (
                              <div className={`text-[10px] rounded px-2 py-1 font-medium ${cls}`}>
                                {viol.dummy.disregarded
                                  ? `Dummy (${viol.dummy.dummyWeight.toLocaleString()} lbs) is DISREGARDED — axle count drops to ${parseInt(g.axles)}; weight still counted in group + gross`
                                  : `Dummy (${viol.dummy.dummyWeight.toLocaleString()} lbs) COUNTS — axle count ${parseInt(g.axles) + 1}`}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Single-axle 20k overages */}
                      {showViolations && viol?.axleOverages?.map(o => (
                        <div key={`axle-${o.axleNum}`} className="rounded px-2 py-1 text-[10px] flex items-center justify-between bg-[#FEE2E2]">
                          <span className="text-[#64748B]">A{o.axleNum}{o.isDummy ? " (dummy)" : ""}: {o.max.toLocaleString()} single-axle max</span>
                          <span className="font-bold text-[#DC2626]">{o.weight.toLocaleString()} → +{o.over.toLocaleString()} over</span>
                        </div>
                      ))}

                      {/* Inline violation */}
                      {hasViol && gWeight > 0 && (
                        <div className={`rounded px-2 py-1 text-[10px] flex items-center justify-between ${mainOver ? withinTol ? "bg-[#FFF7ED]" : "bg-[#FEE2E2]" : "bg-[#F0FDF4]"}`}>
                          <span className="text-[#64748B]">{viol.source}: {viol.max.toLocaleString()} max</span>
                          {mainOver ? <span className={`font-bold ${withinTol ? "text-[#F97316]" : "text-[#DC2626]"}`}>+{(gWeight - viol.max).toLocaleString()} over{withinTol ? " (5% tol)" : ""}</span> : <span className="text-[#16A34A] font-bold">Legal</span>}
                        </div>
                      )}

                      {/* Firm reminder: 3+ axle group missing a distance → bridge formula can't apply. */}
                      {showViolations && viol?.needsTripleDistance && (
                        viol.dummyCreatedTriple ? (
                          <div className="rounded-md border-2 border-[#DC2626] bg-[#FEE2E2] px-3 py-2.5 text-[11px] text-[#991B1B] flex items-start gap-2" data-testid={`triple-distance-reminder-${gi}`}>
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#DC2626]" />
                            <div>
                              <div className="font-bold">Distance required — dummy made this a triple</div>
                              <div className="text-[10px] mt-0.5 leading-snug text-[#7F1D1D]">
                                The dummy axle is being counted (≥ 8,000 lbs or ≥ 8% of gross), so this group is now <strong>{viol.n} axles</strong>. Enter the full-span distance above so the triple bridge formula applies. Without it the app cannot verify the group.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-md border border-[#F59E0B]/50 bg-[#FEF3C7] px-2.5 py-2 text-[10px] text-[#92400E] flex items-start gap-2" data-testid={`triple-distance-reminder-${gi}`}>
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#F59E0B]" />
                            <span><strong>Enter a distance</strong> for this {viol.n}-axle group so the bridge formula can apply. Without it the group is only checked against the tandem 34,000 cap.</span>
                          </div>
                        )
                      )}

                      {/* Secondary tandem check for dummy-axle groups */}
                      {showViolations && viol?.tandemCheck && (
                        <div className={`rounded px-2 py-1 text-[10px] flex items-center justify-between ${viol.tandemCheck.actual > viol.tandemCheck.max ? "bg-[#FEE2E2]" : "bg-[#F0FDF4]"}`}>
                          <span className="text-[#64748B]">{viol.tandemCheck.source}: {viol.tandemCheck.max.toLocaleString()} max</span>
                          {viol.tandemCheck.actual > viol.tandemCheck.max ? (
                            <span className="font-bold text-[#DC2626]">+{(viol.tandemCheck.actual - viol.tandemCheck.max).toLocaleString()} over</span>
                          ) : (
                            <span className="text-[#16A34A] font-bold">Base tandem legal ({viol.tandemCheck.actual.toLocaleString()})</span>
                          )}
                        </div>
                      )}

                      {/* Tandem-subset checks within triples / quads / etc. */}
                      {showViolations && viol?.tandemSubsetChecks?.length > 0 && (() => {
                        const anyOver = viol.tandemSubsetChecks.some(t => t.over);
                        if (!anyOver) return null;
                        return (
                          <div className="space-y-1 pt-1 border-t border-[#FEE2E2]" data-testid={`tandem-subset-${gi}`}>
                            <p className="text-[9px] font-bold uppercase text-[#DC2626] tracking-wide">Tandem subset check</p>
                            {viol.tandemSubsetChecks.filter(t => t.over).map(t => (
                              <div key={`tsub-${t.pairIndex}`} className="rounded-md border border-[#DC2626]/30 bg-[#FEE2E2] p-2 space-y-1.5">
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-[#64748B] font-medium">{t.label}: {t.actual.toLocaleString()} lbs</span>
                                  <span className="font-bold text-[#DC2626]">+{t.overBy.toLocaleString()} over {t.max.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                                  <label className="text-[9px] font-bold text-[#002855] uppercase whitespace-nowrap">{t.label} dist (ft)</label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={g.tandemDists?.[t.pairIndex] || ""}
                                    onChange={e => {
                                      const next = [...(g.tandemDists || [])];
                                      next[t.pairIndex] = e.target.value;
                                      updateGroup(gi, "tandemDists", next);
                                    }}
                                    placeholder="Std (34k)"
                                    className="flex-1 px-2 h-7 text-[11px] font-bold text-center rounded-md border border-[#DC2626]/40 outline-none bg-white"
                                    data-testid={`tandem-dist-${gi}-${t.pairIndex}`}
                                  />
                                </div>
                                <p className="text-[9px] text-[#64748B] italic leading-snug" data-html2canvas-ignore="true">
                                  Leave blank for the 34,000 lb standard tandem rule, or enter the distance between {t.label} to apply the bridge formula for a higher max.
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
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
          {(() => {
            const grossOver = !!(record.grossMax && record.gross > record.grossMax);
            return (
              <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${grossOver ? "border-[#EF4444]/40" : "border-[#E2E8F0]"}`} data-testid="gross-panel">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsGrossCollapsed(v => !v)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsGrossCollapsed(v => !v); } }}
                  className={`w-full px-3 py-4 min-h-[60px] flex items-center justify-between text-left cursor-pointer border-b leading-[1.6] ${grossOver ? "bg-[#DC2626] border-[#DC2626]" : "bg-[#002855] border-[#002855]"}`}
                  data-testid="gross-toggle"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Scale className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                    <span className="text-sm font-bold text-white truncate">Gross Weight</span>
                    {record.gross > 0 && <span className="text-xs font-black text-[#D4AF37] flex-shrink-0 font-mono">{record.gross.toLocaleString()}</span>}
                    {grossOver && (
                      <span className="text-[10px] font-bold flex-shrink-0 flex items-center gap-0.5 text-white bg-black/20 rounded px-1.5 py-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        +{(record.gross - record.grossMax).toLocaleString()}
                      </span>
                    )}
                    {record.gross > 0 && record.grossMax && !grossOver && <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" data-html2canvas-ignore="true">
                    {isGrossCollapsed ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronUp className="w-4 h-4 text-white/80" />}
                  </div>
                </div>
                {!isGrossCollapsed && (
                <div className="p-3">
                <div className={`grid gap-3 ${isCustom ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-1 flex flex-col">
                <label className="text-[9px] font-bold text-[#94A3B8] uppercase block leading-tight min-h-[28px]">Overall Distance (ft)</label>
                <input type="number" inputMode="numeric" value={overallDistFt} onChange={e => setOverallDistFt(e.target.value)} placeholder="—" className="w-full px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] outline-none" />
                {record.grossMax && !isCustom && (
                  <p className="text-[10px] text-[#002855] font-medium text-center bg-[#F8FAFC] rounded-md px-2 py-1.5 border border-[#E2E8F0] flex-1 flex flex-col justify-center min-h-[40px]">
                    <span>Max: <strong>{record.grossMax.toLocaleString()}</strong> lbs</span>
                    <span className="text-[9px] text-[#94A3B8] font-normal">{record.grossSource}</span>
                  </p>
                )}
                {!record.grossMax && record.grossNote && !isCustom && (
                  <p className="text-[10px] text-[#92400E] bg-[#FEF3C7]/60 rounded-md px-2 py-1.5 border border-[#F59E0B]/30 text-center flex-1 flex items-center justify-center min-h-[40px]">
                    {record.grossNote}
                  </p>
                )}
              </div>
              <div className="space-y-1 flex flex-col">
                <label className="text-[9px] font-bold text-[#002855] uppercase block leading-tight min-h-[28px]">Gross Weight<span className="block text-[8px] text-[#94A3B8] font-normal normal-case">Sum of axles</span></label>
                <div className="px-2 h-10 text-sm font-black text-center text-[#002855] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-center">
                  {record.gross > 0 ? record.gross.toLocaleString() : "—"}
                </div>
                {record.gross > 0 && (
                  <p className="text-[10px] text-[#64748B] font-mono text-center bg-[#F8FAFC] rounded-md px-2 py-1.5 border border-[#E2E8F0] flex-1 flex items-center justify-center min-h-[40px] break-words leading-snug">
                    {record.groupViolations.map(v => v.actual.toLocaleString()).join(" + ")}
                  </p>
                )}
              </div>
              {isCustom && (
                <div className="space-y-1 flex flex-col">
                  <label className="text-[9px] font-bold text-[#94A3B8] uppercase block leading-tight min-h-[28px]">Gross Max (lbs)</label>
                  <input type="number" inputMode="numeric" value={customGrossMax} onChange={e => setCustomGrossMax(e.target.value)} placeholder="Custom" className="w-full px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" />
                  <p className="text-[10px] text-[#94A3B8] italic text-center flex-1 flex items-center justify-center min-h-[40px]">Custom permit</p>
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
              <p className="mt-2 text-[10px] text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#64748B]" />
                <span>Dummy axle(s) disregarded from axle count (weight still counted in gross). Gross max uses {record.totalAxles} axles.</span>
              </p>
            )}
            {record.gross > 0 && record.grossMax && (() => {
              const grossOver = record.gross > record.grossMax;
              return (
                <div className={`mt-2 rounded px-2 py-1.5 text-[11px] flex items-center justify-between ${grossOver ? "bg-[#FEE2E2]" : "bg-[#F0FDF4]"}`} data-testid="gross-status-pill">
                  <span className="text-[#64748B] font-medium">{record.grossSource}: {record.grossMax.toLocaleString()} max</span>
                  {grossOver ? (
                    <span className="font-black text-[#DC2626] flex items-center gap-1"><AlertTriangle className="w-3 h-3" />+{(record.gross - record.grossMax).toLocaleString()} over</span>
                  ) : (
                    <span className="text-[#16A34A] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Legal</span>
                  )}
                </div>
              );
            })()}
                </div>
                )}
              </div>
            );
          })()}
          </>)}{/* end !isInputsCollapsed */}

          {/* ===== INTERIOR BRIDGE — optional extra bridge check A2 → last axle ===== */}
          {record.totalAxles >= 2 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="interior-bridge-section">
              <button type="button" onClick={() => setIsInteriorBridgeCollapsed(v => !v)} className="w-full flex items-center justify-between px-3 py-4 min-h-[60px] leading-[1.6] hover:bg-[#F8FAFC] transition-colors border-l-4 border-[#D4AF37]" data-testid="toggle-interior-bridge">
                <div className="flex items-center gap-2 min-w-0">
                  <Calculator className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <span className="text-sm font-bold text-[#002855]">Interior Bridge</span>
                  <span className="text-[10px] text-[#94A3B8] font-normal hidden sm:inline">· Optional — A{(record.interior?.startAxleNum) || 2} → A{(record.interior?.endAxleNum) || record.totalAxles}</span>
                  {record.interior?.over && (
                    <span className="text-[9px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">OVER</span>
                  )}
                  {record.interior?.longerThanOverall && (
                    <span className="text-[9px] font-bold text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Check distance</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" data-html2canvas-ignore="true">
                  {isInteriorBridgeCollapsed ? <ChevronDown className="w-4 h-4 text-[#64748B]" /> : <ChevronUp className="w-4 h-4 text-[#64748B]" />}
                </div>
              </button>
              {!isInteriorBridgeCollapsed && (
                <div className="p-3 space-y-3 border-t border-[#E2E8F0]">
                  {record.interior?.longerThanOverall && (
                    <div className="bg-[#FEE2E2] border border-[#DC2626]/40 rounded-md px-3 py-2 text-[11px] text-[#991B1B] flex items-start gap-2" data-testid="interior-longer-warning">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#DC2626]" />
                      <span>
                        Interior bridge (<strong>{record.interior.distFt} ft</strong>) is longer than the Overall Distance (<strong>{record.overallRound} ft</strong>). That's geometrically impossible — A{record.interior.startAxleNum}→A{record.interior.endAxleNum} must be shorter than A1→A{record.interior.endAxleNum}. Double-check your measurements.
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-[#64748B] leading-relaxed">
                    {isCustom
                      ? <>Set a <strong>custom max weight</strong> for the interior span (from <strong>A{record.interior?.startAxleNum || 2}</strong> to <strong>A{record.interior?.endAxleNum || record.totalAxles}</strong>, excluding the first axle). Useful for permits where the bridge chart doesn't apply. Distance is optional in custom mode.</>
                      : <>Checks the bridge formula for an interior span (from <strong>A{record.interior?.startAxleNum || 2}</strong> to <strong>A{record.interior?.endAxleNum || record.totalAxles}</strong>, excluding the first axle). Axle count is auto-calculated from your setup. Enter the distance between these axles to cross-reference with the bridge chart.</>}
                  </p>
                  <div className={`grid gap-2 ${isCustom ? "grid-cols-4" : "grid-cols-3"}`}>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#94A3B8] uppercase block leading-tight">From Axle</label>
                      <div className="px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center text-[#002855]" data-testid="interior-from-axle">
                        {`A${record.interior?.startAxleNum || 2}`}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#94A3B8] uppercase block leading-tight">To Axle</label>
                      <div className="px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center text-[#002855]" data-testid="interior-to-axle">
                        {`A${record.interior?.endAxleNum || record.totalAxles}`}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#94A3B8] uppercase block leading-tight">Distance (ft){isCustom ? " · opt" : ""}</label>
                      <input type="number" inputMode="numeric" value={interiorDistFt} onChange={e => setInteriorDistFt(e.target.value)} placeholder="—" className="w-full px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/40 outline-none bg-[#D4AF37]/5" data-testid="interior-distance-input" />
                    </div>
                    {isCustom && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#D4AF37] uppercase block leading-tight">Max (lbs)</label>
                        <input type="number" inputMode="numeric" value={customInteriorMax} onChange={e => setCustomInteriorMax(e.target.value)} placeholder="Custom" className="w-full px-2 h-10 text-xs font-bold text-center rounded-lg border border-[#D4AF37]/60 outline-none bg-[#D4AF37]/10 text-[#002855]" data-testid="interior-custom-max-input" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#F8FAFC] rounded-md px-2 py-2 border border-[#E2E8F0] text-center">
                      <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Axles</div>
                      <div className="text-sm font-black text-[#002855]" data-testid="interior-axle-count">{record.interior?.axleCount ?? "—"}</div>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-md px-2 py-2 border border-[#E2E8F0] text-center">
                      <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Weight</div>
                      <div className="text-sm font-black text-[#002855]" data-testid="interior-actual">{record.interior?.actual > 0 ? record.interior.actual.toLocaleString() : "—"}</div>
                    </div>
                    <div className={`rounded-md px-2 py-2 border text-center ${record.interior?.over ? "bg-[#FEE2E2] border-[#DC2626]/30" : (record.interior?.max ? "bg-[#F0FDF4] border-[#16A34A]/30" : "bg-[#F8FAFC] border-[#E2E8F0]")}`}>
                      <div className="text-[9px] text-[#94A3B8] font-bold uppercase">Max Allowed</div>
                      <div className={`text-sm font-black ${record.interior?.over ? "text-[#DC2626]" : (record.interior?.max ? "text-[#16A34A]" : "text-[#94A3B8]")}`} data-testid="interior-max">
                        {record.interior?.max ? record.interior.max.toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>
                  {record.interior?.enabled && record.interior?.max ? (
                    <div className={`rounded-md px-3 py-2 text-[11px] font-mono flex items-start gap-2 ${record.interior.over ? "bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/30" : "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/30"}`} data-testid="interior-result">
                      {record.interior.over ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      <span>
                        <strong>{record.interior.source}:</strong> {record.interior.actual.toLocaleString()} {record.interior.over ? "exceeds" : "within"} {record.interior.max.toLocaleString()} → <strong>{record.interior.over ? `+${record.interior.overBy.toLocaleString()} OVER` : "LEGAL"}</strong>
                      </span>
                    </div>
                  ) : record.interior?.enabled ? (
                    <div className="bg-[#FEF3C7]/60 border border-[#F59E0B]/30 rounded-md px-3 py-2 text-[11px] text-[#92400E] flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>No bridge data for {record.interior.distFt}ft / {record.interior.axleCount} axles. Check distance is 4–60 ft and axle count is 2–7.</span>
                    </div>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-3 py-2 text-[11px] text-[#64748B] flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{isCustom ? "Enter a custom Max (lbs) to enable the interior bridge check for this permit." : "Enter a distance to cross-reference with the bridge chart. Any violation will be added to the report."}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== CAPTURED SECTION — Weight Report ===== */}
          <div className="bg-[#F0F2F5] p-3 rounded-xl -mx-3 sm:-mx-6 md:mx-0 space-y-4" data-testid="record-report-section">
            <button type="button" onClick={() => setIsReportCollapsed(v => !v)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#002855] text-white hover:bg-[#001a3a] transition-colors" data-testid="toggle-report-collapse" data-html2canvas-ignore="true">
              <div className="flex items-center gap-2 min-w-0">
                <Scale className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span className="text-sm font-bold text-white">Weight Report</span>
                {badge && <span className="text-[10px] text-white/60 font-mono">· Badge {badge}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-white/60 hidden sm:inline">{new Date().toLocaleString()}</span>
                {isReportCollapsed ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronUp className="w-4 h-4 text-white/80" />}
              </div>
            </button>
            {!isReportCollapsed && (<>
          {/* Violations */}
          {showViolations && record.gross > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Violations</h3>
                {!isCustom && !record.toleranceApplies && record.groupViolations.some(v => (v.max && v.actual > v.max) || (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max) || (v.axleOverages && v.axleOverages.length > 0) || (v.tandemSubsetChecks && v.tandemSubsetChecks.some(t => t.over))) && (
                  <span className="text-[9px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">5% tolerance does not apply (more than one violation)</span>
                )}
              </div>
              {record.groupViolations.map((v, i) => (
                <React.Fragment key={i}>
                  {v.max && v.actual > 0 && <ViolationCard label={`${v.label} (${v.source})`} actual={v.actual} max={v.max} tolerance={!isCustom && record.toleranceApplies} />}
                  {v.tandemCheck && <ViolationCard label={v.tandemCheck.source} actual={v.tandemCheck.actual} max={v.tandemCheck.max} tolerance={!isCustom && record.toleranceApplies} />}
                  {v.tandemSubsetChecks?.filter(t => t.over).map(t => <ViolationCard key={`tsub-v-${v.gi}-${t.pairIndex}`} label={`${v.label} · ${t.label} (${t.source})`} actual={t.actual} max={t.max} tolerance={!isCustom && record.toleranceApplies} />)}
                  {v.axleOverages?.map(o => <ViolationCard key={`axle-${o.axleNum}`} label={`A${o.axleNum}${o.isDummy ? " (dummy)" : ""} (Single axle max)`} actual={o.weight} max={o.max} tolerance={!isCustom && record.toleranceApplies} />)}
                </React.Fragment>
              ))}
              {record.grossMax && record.gross > 0 && <ViolationCard label={`Gross (${record.grossSource})`} actual={record.gross} max={record.grossMax} tolerance={false} />}
              {record.interior?.enabled && record.interior?.max && record.interior.over && (
                <ViolationCard label={`Interior Bridge A${record.interior.startAxleNum}–A${record.interior.endAxleNum} (${record.interior.source})`} actual={record.interior.actual} max={record.interior.max} tolerance={false} />
              )}
              {record.groupViolations.every(v => (!v.max || v.actual <= (v.max || Infinity)) && (!v.tandemCheck || v.tandemCheck.actual <= v.tandemCheck.max) && (!v.axleOverages || v.axleOverages.length === 0) && (!v.tandemSubsetChecks || !v.tandemSubsetChecks.some(t => t.over))) && (!record.grossMax || record.gross <= record.grossMax) && !(record.interior?.over) && record.gross > 0 && (
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
                          Dummy discount check: {di.dummyWeight.toLocaleString()} meets 8,000? <strong>{di.dummyWeight >= 8000 ? "YES" : "NO"}</strong> · {di.dummyWeight.toLocaleString()} meets 8% of {record.gross.toLocaleString()} ({Math.round(record.gross * 0.08).toLocaleString()})? <strong>{di.dummyWeight >= record.gross * 0.08 ? "YES" : "NO"}</strong> → {di.disregarded ? "DISREGARDED (neither threshold met)" : "COUNTS (at least one threshold met)"}
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
                      {v.axleOverages?.map(o => (
                        <p key={`axle-${o.axleNum}`} className="mt-1 font-mono text-[#DC2626]">
                          Single axle rule (A{o.axleNum}{o.isDummy ? " dummy" : ""}): {o.weight.toLocaleString()} exceeds {o.max.toLocaleString()} → <strong>+{o.over.toLocaleString()} OVER</strong>
                        </p>
                      ))}
                      {v.tandemSubsetChecks?.filter(t => t.over).map(t => (
                        <p key={`tsub-calc-${t.pairIndex}`} className="mt-1 font-mono text-[#DC2626]">
                          Tandem subset {t.label}: {t.actual.toLocaleString()} exceeds {t.max.toLocaleString()}{t.distFt ? ` (Bridge at ${t.distFt}ft)` : " (Standard 34,000)"} → <strong>+{t.overBy.toLocaleString()} OVER</strong>
                        </p>
                      ))}
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
                {record.interior?.enabled && (
                  <div className="px-4 py-2.5 text-[11px]">
                    <p className="font-bold text-[#002855] mb-0.5">Interior Bridge <span className="font-normal text-[#94A3B8]">· A{record.interior.startAxleNum} → A{record.interior.endAxleNum} ({record.interior.axleCount} axles)</span></p>
                    <p className="text-[#475569] font-mono">
                      Gross {record.gross.toLocaleString()} − A{record.interior.startAxleNum - 1} ({record.interior.a1Weight.toLocaleString()}) = <strong>{record.interior.actual.toLocaleString()} lbs</strong>
                    </p>
                    {record.interior.max ? (
                      <p className={`mt-1 font-mono ${record.interior.over ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                        {record.interior.source}: {record.interior.actual.toLocaleString()} {record.interior.over ? "exceeds" : "within"} {record.interior.max.toLocaleString()} → <strong>{record.interior.over ? `+${record.interior.overBy.toLocaleString()} OVER` : "LEGAL"}</strong>
                      </p>
                    ) : (
                      <p className="mt-1 text-[#94A3B8] italic">No bridge data for {record.interior.distFt}ft / {record.interior.axleCount} axles.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {!record.valid && record.conflicts.length > 0 && !isCustom && (            <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold text-[#92400E] uppercase">Diagram issues:</p>
              {record.conflicts.map((c, i) => <p key={i} className="text-[11px] text-[#92400E] flex items-center gap-1"><XCircle className="w-3 h-3 flex-shrink-0" />{c}</p>)}
            </div>
          )}
          </>)}{/* end !isReportCollapsed */}

          {/* Diagram — always show when there are axles */}
          {record.totalAxles > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <button type="button" onClick={() => setIsDiagramCollapsed(v => !v)} className="w-full px-3 py-2.5 flex items-center justify-between gap-2 bg-[#002855] text-white hover:bg-[#001a3a] transition-colors" data-testid="toggle-diagram-collapse" data-html2canvas-ignore="true">
                <div className="flex items-center gap-2 min-w-0">
                  <Calculator className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <span className="text-sm font-bold text-white">Weight Diagram</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span onClick={(e) => { e.stopPropagation(); downloadDiag(); }} title="Save" role="button" tabIndex={0} className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer" data-testid="diagram-save-btn"><Download className="w-4 h-4" /></span>
                  {isDiagramCollapsed ? <ChevronDown className="w-4 h-4 text-white/80" /> : <ChevronUp className="w-4 h-4 text-white/80" />}
                </div>
              </button>
              {!isDiagramCollapsed && (<>
              <div className="p-2"><TruckDiagram groups={groups.map(g => ({ ...g, axles: String((parseInt(g.axles) || 0) + (g.dummyAxle ? 1 : 0)) }))} grossWeight={record.gross} overallDist={record.overallRound} svgRef={svgRef} groupViolations={record.groupViolations} grossMax={record.grossMax} grossOver={!!(record.grossMax && record.gross > record.grossMax)} hideViolations={!showViolations} toleranceApplies={record.toleranceApplies} interior={record.interior} /></div>
              {photos.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">{photos.map((p, i) => <div key={i} className="relative flex-shrink-0"><img src={p.dataUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-[#E2E8F0]" /><button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] rounded-full flex items-center justify-center" data-html2canvas-ignore="true"><X className="w-2.5 h-2.5 text-white" /></button></div>)}</div>
                </div>
              )}
              </>)}
            </div>
          )}
          </div>{/* end record-report-section */}

          </div>{/* end captureRef */}
        </>)}
      </main>

      {showPreview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-3 sm:p-6" style={{ zIndex: 2147483647 }} onClick={closePreview} data-testid="preview-modal">
          <div className="bg-[#0F1D2F] rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <h3 className="text-sm font-bold text-white">Preview & Export</h3>
              <button onClick={closePreview} className="text-white/40 hover:text-white" data-testid="close-preview-btn"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 bg-[#F0F2F5]">
              {previewUrl && <img src={previewUrl} alt="Weight report preview" className="w-full h-auto rounded-lg shadow-lg" />}
            </div>
            <div className="px-3 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
              <Button onClick={downloadDiag} className="flex-1 bg-white/10 text-white hover:bg-white/20 h-10 text-xs font-bold" data-testid="preview-download-btn"><Download className="w-4 h-4 mr-1.5" /> Download</Button>
              <Button onClick={shareDiag} className="flex-1 bg-[#D4AF37] text-[#002855] hover:bg-[#BC9A2F] h-10 text-xs font-bold" data-testid="preview-share-btn"><Share2 className="w-4 h-4 mr-1.5" /> Share</Button>
            </div>
          </div>
        </div>
      )}

      {showInspPicker && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-4" style={{ zIndex: 2147483647 }} onClick={() => setShowInspPicker(false)}>
          <div className="bg-[#0F1D2F] rounded-2xl w-full sm:max-w-sm max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"><h3 className="text-sm font-bold text-white">Save to Inspection</h3><button onClick={() => setShowInspPicker(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="px-3 pt-3 pb-2 border-b border-white/10">
              <p className="text-[10px] text-white/40 font-medium mb-1.5">New Inspection</p>
              <div className="flex gap-1.5"><input type="text" value={newInspTitle} onChange={e => setNewInspTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createAndAdd()} placeholder="Inspection name..." className="flex-1 px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs placeholder:text-white/30 outline-none" data-testid="new-inspection-input" /><button onClick={createAndAdd} disabled={saving} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold disabled:opacity-50" data-testid="create-inspection-btn">{saving ? "..." : "Create & Add"}</button></div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {inspections.length === 0 ? (
                <div className="text-center py-6"><p className="text-xs text-white/40">No existing inspections</p><p className="text-[10px] text-white/25 mt-1">Create one above to get started</p></div>
              ) : (
                inspections.map(insp => <button key={insp.id} onClick={() => addToInsp(insp.id)} disabled={saving} className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 text-left" data-testid={`insp-option-${insp.id}`}><div><p className="text-xs font-medium text-white truncate">{insp.title}</p><p className="text-[10px] text-white/30">{new Date(insp.created_at).toLocaleDateString()}</p></div><FolderPlus className="w-4 h-4 text-white/20" /></button>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
