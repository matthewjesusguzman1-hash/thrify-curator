import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calculator, Scale, AlertTriangle, Info, X, Download, Share2, FolderPlus, Camera, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

/* ================================================================
   BRIDGE CHART DATA
   ================================================================ */
const BRIDGE_DATA = {
  4:{2:34000},5:{2:34000},6:{2:34000},7:{2:34000},
  8:{2:34000,3:42000},9:{2:39000,3:42500},10:{2:40000,3:43500},
  11:{3:44000},12:{3:45000,4:50000},13:{3:45500,4:50500},14:{3:46500,4:51500},
  15:{3:47000,4:52000},16:{3:48000,4:52500,5:58000},17:{3:48500,4:53500,5:58500},
  18:{3:49500,4:54000,5:59000},19:{3:50000,4:54500,5:60000},
  20:{3:51000,4:55500,5:60500},21:{3:51500,4:56000,5:61000},
  22:{3:52500,4:56500,5:61500},23:{3:53000,4:57500,5:62500},
  24:{3:54000,4:58000,5:63000},25:{3:54500,4:58500,5:63500,6:69000},
  26:{3:55500,4:59500,5:64000,6:69500},27:{3:56000,4:60000,5:65000,6:70000},
  28:{3:57000,4:60500,5:65500,6:71000},29:{3:57500,4:61500,5:66000,6:71500},
  30:{3:58500,4:62000,5:66500,6:72000},31:{3:59000,4:62500,5:67500,6:72500},
  32:{3:60000,4:63500,5:68000,6:73000},33:{4:64000,5:68500,6:74000},
  34:{4:64500,5:69000,6:74500},35:{4:65500,5:70000,6:75000},
  36:{4:66000,5:70500,6:75500},37:{4:66500,5:71000,6:76000,7:81500},
  38:{4:67500,5:72000,6:77000,7:82000},39:{4:68000,5:72500,6:77500,7:82500},
  40:{4:68500,5:73000,6:78000,7:83500},41:{4:69500,5:73500,6:78500,7:84000},
  42:{4:70000,5:74000,6:79000,7:84500},43:{4:70500,5:75000,6:80000,7:85000},
  44:{4:71500,5:75500,6:80500,7:85500},45:{4:72000,5:76000,6:81000,7:86000},
  46:{4:72500,5:76500,6:81500,7:87000},47:{4:73500,5:77500,6:82000,7:87500},
  48:{4:74000,5:78000,6:83000,7:88000},49:{4:74500,5:78500,6:83500,7:88500},
  50:{4:75500,5:79000,6:84000,7:89000},51:{4:76000,5:80000,6:84500,7:89500},
  52:{4:76500,5:80500,6:85500,7:90500},53:{4:77500,5:81000,6:86000,7:91000},
  54:{4:78000,5:81500,6:86500,7:91500},55:{4:78500,5:82500,6:87000,7:92000},
  56:{4:79500,5:83000,6:87500,7:92500},57:{4:80000,5:83500,6:88000,7:93000},
  58:{5:84000,6:89000,7:94000},59:{5:85000,6:89500,7:94500},60:{5:85500,6:90000,7:95000},
};
const ALL_DISTANCES = Object.keys(BRIDGE_DATA).map(Number).sort((a, b) => a - b);
const ALL_AXLES = [2, 3, 4, 5, 6, 7];

/* ================================================================
   WEIGHT RULES
   ================================================================ */
const WEIGHT_RULES = [
  { title: "Maximum Allowable Weights", cfr: "§60-6,294", items: [
    "Any single axle — 20,000 lbs.", "Any tandem axle — 34,000 lbs.",
    "On State highways — 95,000 lbs.", "On Interstate — 80,000 lbs. or 95,000 lbs. with Conditional Interstate Use Permit",
  ]},
  { title: "Tandem Axle", items: ["Any two consecutive axles whose centers are more than 40\" and not more than 96\" apart, measured to the nearest inch between any two adjacent axles in the series."]},
  { title: "Two-Axle Group (8' to 8'6\")", highlight: true, items: ["The maximum gross load on any group of two axles, the distance between the extremes of which is more than 8' but less than 8'6\", shall be 38,000 lbs."]},
  { title: "Measuring Distance", items: ["Distance between axles shall be measured to the nearest foot.", "When a fraction is exactly one-half foot, the next larger whole number shall be used.", "Exception: Any group of 3 axles restricted to max 34,000 lbs. unless distance between extremes of first and third axle is at least 96\"."]},
  { title: "Tandem Exception (36'-38')", highlight: true, items: ["If you have two consecutive sets of tandem axles measuring a minimum of 36', 37', or 38', you may carry 34,000 lbs. each on such sets."]},
  { title: "Weight Tolerance (5% Shift)", highlight: true, items: ["5% weight shift if only overweight on one axle, one tandem axle, or one group of axles when distance between first and last axle is 12' or less."]},
  { title: "Sliding Fifth-Wheel", items: ["Unlawful to reposition the fifth-wheel connection device of a truck-tractor and semitrailer combination carrying cargo on the state highway system, except per §60-6,301."]},
  { title: "Dummy Axles", items: ["Disregarded if dummy axle does not carry the lesser of 8,000 lbs. or 8% of the gross weight including the load."]},
  { title: "APU Allowance", items: ["Max gross weight may increase to cover APU weight. Not to exceed 550 lbs. or weight on unit, whichever is less. Not in addition to 5% tolerance."]},
  { title: "Natural Gas Vehicles", items: ["May exceed weight limit up to 2,000 lbs. for fuel system difference. Cannot exceed 82,000 lbs. gross on Interstate."]},
];

/* ================================================================
   ROUNDING HELPER
   ================================================================ */
function roundDistance(feet, inches) {
  const f = parseInt(feet) || 0;
  const i = parseInt(inches) || 0;
  if (f === 0 && i === 0) return null;
  const totalInches = f * 12 + i;
  const totalFeet = totalInches / 12;
  // Round to nearest foot; at exactly 0.5, round UP
  return Math.round(totalFeet);
}

/* ================================================================
   TRUCK DIAGRAM
   ================================================================ */
function TruckDiagram({ axleCount, axleWeights, grossWeight, distanceFt, canvasRef }) {
  const w = 700, h = 320;
  const margin = { left: 60, right: 60, top: 50, bottom: 80 };
  const axleY = h - margin.bottom;
  const truckTop = margin.top + 20;
  const truckH = axleY - truckTop - 30;
  const axleSpacing = (w - margin.left - margin.right) / Math.max(axleCount - 1, 1);

  const axles = Array.from({ length: axleCount }, (_, i) => ({
    x: margin.left + i * axleSpacing,
    weight: axleWeights[i] || 0,
    label: `Axle ${i + 1}`,
  }));

  return (
    <svg ref={canvasRef} viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 280 }}>
      <rect width={w} height={h} fill="#0F172A" rx="12" />
      {/* Truck body */}
      <rect x={axles[0]?.x - 20} y={truckTop} width={(axles[axleCount - 1]?.x || 0) - (axles[0]?.x || 0) + 40} height={truckH} rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
      {/* Cab */}
      <rect x={axles[0]?.x - 20} y={truckTop + 10} width={60} height={truckH - 10} rx="6" fill="#1E293B" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
      {/* Gross weight label */}
      <text x={w / 2} y={truckTop + truckH / 2 - 8} textAnchor="middle" fill="#8FAEC5" fontSize="10" fontWeight="bold">GROSS WEIGHT</text>
      <text x={w / 2} y={truckTop + truckH / 2 + 12} textAnchor="middle" fill="#D4AF37" fontSize="20" fontWeight="900" fontFamily="monospace">
        {grossWeight ? `${grossWeight.toLocaleString()} lbs` : "—"}
      </text>
      {/* Distance line */}
      {axleCount > 1 && (
        <>
          <line x1={axles[0].x} y1={axleY + 28} x2={axles[axleCount - 1].x} y2={axleY + 28} stroke="#64748B" strokeWidth="1" />
          <line x1={axles[0].x} y1={axleY + 22} x2={axles[0].x} y2={axleY + 34} stroke="#64748B" strokeWidth="1" />
          <line x1={axles[axleCount - 1].x} y1={axleY + 22} x2={axles[axleCount - 1].x} y2={axleY + 34} stroke="#64748B" strokeWidth="1" />
          <text x={(axles[0].x + axles[axleCount - 1].x) / 2} y={axleY + 50} textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="bold">
            {distanceFt ? `${distanceFt} ft` : "— ft"}
          </text>
        </>
      )}
      {/* Axles */}
      {axles.map((a, i) => (
        <g key={i}>
          {/* Axle line */}
          <line x1={a.x} y1={axleY - 18} x2={a.x} y2={axleY + 6} stroke="#94A3B8" strokeWidth="2" />
          {/* Wheels */}
          <circle cx={a.x - 10} cy={axleY + 6} r="8" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
          <circle cx={a.x + 10} cy={axleY + 6} r="8" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
          {/* Weight label */}
          <text x={a.x} y={truckTop - 8} textAnchor="middle" fill={a.weight > 0 ? "#FFFFFF" : "#475569"} fontSize="12" fontWeight="bold" fontFamily="monospace">
            {a.weight > 0 ? a.weight.toLocaleString() : "—"}
          </text>
          {/* Axle number */}
          <text x={a.x} y={axleY - 24} textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="bold">A{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function BridgeChartPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const svgRef = useRef(null);

  // Calculator state
  const [distFeet, setDistFeet] = useState("");
  const [distInches, setDistInches] = useState("");
  const [axleCount, setAxleCount] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [axleWeights, setAxleWeights] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showInspPicker, setShowInspPicker] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef(null);

  const roundedDist = useMemo(() => roundDistance(distFeet, distInches), [distFeet, distInches]);
  const numAxles = parseInt(axleCount) || 0;

  // Update axle weights array when axle count changes
  const setAxleCountAndWeights = (val) => {
    setAxleCount(val);
    const n = parseInt(val) || 0;
    setAxleWeights(prev => {
      const next = [...prev];
      while (next.length < n) next.push("");
      return next.slice(0, n);
    });
  };

  const updateAxleWeight = (idx, val) => {
    setAxleWeights(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const clearAll = () => {
    setDistFeet(""); setDistInches(""); setAxleCount(""); setGrossWeight(""); setAxleWeights([]); setPhotos([]);
  };

  // Bridge lookup
  const result = useMemo(() => {
    if (!roundedDist || !numAxles || roundedDist < 4 || roundedDist > 60 || numAxles < 2 || numAxles > 7) return null;
    const row = BRIDGE_DATA[roundedDist];
    if (!row || !row[numAxles]) return { distance: roundedDist, axles: numAxles, maxWeight: null };
    const maxWeight = row[numAxles];
    const gw = parseInt(grossWeight) || 0;
    const overweight = gw > 0 ? gw - maxWeight : 0;
    return { distance: roundedDist, axles: numAxles, maxWeight, gross: gw || null, overweight: Math.max(0, overweight), toleranceWeight: Math.round(maxWeight * 1.05), withinTolerance: gw > maxWeight && gw <= maxWeight * 1.05 };
  }, [roundedDist, numAxles, grossWeight]);

  const hasHighlight = result?.maxWeight != null;

  // Photo handling
  const handlePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos(prev => [...prev, { dataUrl: ev.target.result, file: f }]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  // Export SVG to canvas for sharing
  const getSvgBlob = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return null;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1400; canvas.height = 640;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => { ctx.drawImage(img, 0, 0, 1400, 640); canvas.toBlob(resolve, "image/png"); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    });
  }, []);

  const downloadDiagram = async () => {
    const blob = await getSvgBlob();
    if (!blob) return;
    const link = document.createElement("a");
    link.download = `bridge-weight-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    toast.success("Diagram saved");
  };

  const shareDiagram = async () => {
    const blob = await getSvgBlob();
    if (!blob) return;
    try {
      const file = new File([blob], "bridge-weight.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] });
      else downloadDiagram();
    } catch { downloadDiagram(); }
  };

  const openInspPicker = async () => {
    setShowInspPicker(true);
    try {
      const res = await fetch(`${API}/api/inspections?badge=${badge}`);
      if (res.ok) { const d = await res.json(); setInspections(Array.isArray(d) ? d : d.inspections || []); }
    } catch {}
  };

  const addToInspection = async (inspId) => {
    setSaving(true);
    const blob = await getSvgBlob();
    if (blob) {
      const formData = new FormData();
      formData.append("file", blob, `bridge-weight-${new Date().toISOString().slice(0, 10)}.png`);
      await fetch(`${API}/api/inspections/${inspId}/annotated-photos`, { method: "POST", body: formData });
    }
    for (const p of photos) {
      if (p.file) {
        const fd = new FormData();
        fd.append("file", p.file, p.file.name);
        await fetch(`${API}/api/inspections/${inspId}/annotated-photos`, { method: "POST", body: fd });
      }
    }
    toast.success("Added to inspection");
    setShowInspPicker(false);
    setSaving(false);
  };

  const createAndAdd = async () => {
    const title = newInspTitle.trim() || `Bridge Weight ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/inspections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, badge }) });
      if (res.ok) { const insp = await res.json(); setNewInspTitle(""); await addToInspection(insp.id); }
    } catch { toast.error("Failed"); }
    setSaving(false);
  };

  const parsedAxleWeights = axleWeights.map(w => parseInt(w) || 0);

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="bridge-chart-page">
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-white/10 h-8 px-2"><ChevronLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-sm sm:text-lg font-semibold text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>Bridge Chart</h1>
              <p className="text-[10px] text-[#8FAEC5] hidden sm:block">Federal Bridge Formula — §60-6,294</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRules(!showRules)} className={`text-xs h-8 px-3 ${showRules ? "bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432]" : "text-[#D4AF37] hover:bg-white/10"}`} data-testid="toggle-rules-btn">
              <Info className="w-3.5 h-3.5 mr-1" />Rules
            </Button>
            {hasHighlight && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-white/50 hover:text-white hover:bg-white/10 h-8 px-2 text-xs" data-testid="clear-btn">
                <X className="w-3.5 h-3.5 mr-1" />Clear
              </Button>
            )}
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {/* CALCULATOR */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="bridge-calculator">
          <div className="bg-[#002855] px-4 py-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-sm font-bold text-white">Bridge Weight Calculator</h2>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {/* Distance + Axles row */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Feet</label>
                <input type="number" inputMode="numeric" value={distFeet} onChange={(e) => setDistFeet(e.target.value)} placeholder="0" disabled={hasHighlight}
                  className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-feet" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Inches</label>
                <input type="number" inputMode="numeric" value={distInches} onChange={(e) => setDistInches(e.target.value)} placeholder="0" min="0" max="11" disabled={hasHighlight}
                  className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 outline-none disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-inches" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Axles</label>
                <select value={axleCount} onChange={(e) => setAxleCountAndWeights(e.target.value)} disabled={hasHighlight}
                  className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 outline-none bg-white disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]" data-testid="calc-axles">
                  <option value="">—</option>
                  {ALL_AXLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Gross (lbs)</label>
                <input type="number" inputMode="numeric" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="—"
                  className="w-full px-2 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 outline-none" data-testid="calc-gross" />
              </div>
            </div>

            {/* Rounding note */}
            {roundedDist != null && (distInches && parseInt(distInches) > 0) && (
              <p className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 rounded-md px-3 py-1.5 font-medium" data-testid="rounding-note">
                {distFeet}'{distInches}" rounds to <strong>{roundedDist} ft</strong> — distance is measured to the nearest foot. At exactly 6", round up.
              </p>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-lg p-3 ${
                result.maxWeight == null ? "bg-[#FEF3C7] border border-[#F59E0B]/30"
                  : result.overweight > 0 ? result.withinTolerance ? "bg-[#FFF7ED] border border-[#F97316]/30" : "bg-[#FEE2E2] border border-[#EF4444]/30"
                  : "bg-[#F0FDF4] border border-[#16A34A]/30"
              }`} data-testid="calc-result">
                {result.maxWeight == null ? (
                  <p className="text-xs text-[#92400E] font-medium">No data for {result.distance}ft with {result.axles} axles</p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold">Max Legal Weight</span>
                      <span className="text-lg font-black text-[#002855]">{result.maxWeight.toLocaleString()} lbs</span>
                    </div>
                    {result.gross && (
                      <>
                        <div className="h-px bg-black/10" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#64748B] uppercase font-bold">Gross Weight</span>
                          <span className="text-sm font-bold text-[#334155]">{result.gross.toLocaleString()} lbs</span>
                        </div>
                        {result.overweight > 0 ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold flex items-center gap-1 text-[#DC2626]"><AlertTriangle className="w-3 h-3" /> Overweight</span>
                              <span className="text-sm font-black text-[#DC2626]">+{result.overweight.toLocaleString()} lbs</span>
                            </div>
                            {result.withinTolerance && (
                              <p className="text-[10px] text-[#F97316] font-medium bg-[#FFF7ED] rounded px-2 py-1">Within 5% tolerance ({result.toleranceWeight.toLocaleString()} lbs) — may apply if only one axle/group overweight, distance 12' or less</p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#16A34A]" /><span className="text-[10px] font-bold text-[#16A34A] uppercase">Within legal limit</span></div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Individual axle weights */}
            {numAxles >= 2 && (
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">Individual Axle Weights (lbs)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {Array.from({ length: numAxles }, (_, i) => (
                    <div key={i}>
                      <span className="text-[9px] text-[#94A3B8] font-bold block mb-0.5">A{i + 1}</span>
                      <input type="number" inputMode="numeric" value={axleWeights[i] || ""} onChange={(e) => updateAxleWeight(i, e.target.value)} placeholder="—"
                        className="w-full px-2 py-2 text-xs font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-1 focus:ring-[#002855]/20 outline-none" data-testid={`axle-${i}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TRUCK DIAGRAM */}
        {numAxles >= 2 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Weight Diagram</h3>
              <div className="flex items-center gap-1.5">
                <button onClick={downloadDiagram} className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]" data-testid="download-diagram"><Download className="w-3.5 h-3.5" /></button>
                <button onClick={shareDiagram} className="p-1.5 rounded-md text-[#64748B] hover:text-[#002855] hover:bg-[#F1F5F9]" data-testid="share-diagram"><Share2 className="w-3.5 h-3.5" /></button>
                <button onClick={openInspPicker} className="p-1.5 rounded-md text-[#D4AF37] hover:bg-[#D4AF37]/10" data-testid="add-to-insp-btn"><FolderPlus className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="p-2">
              <TruckDiagram axleCount={numAxles} axleWeights={parsedAxleWeights} grossWeight={parseInt(grossWeight) || 0} distanceFt={roundedDist} canvasRef={svgRef} />
            </div>
            {/* Photos */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#64748B] uppercase">Photos</span>
                <button onClick={() => photoInputRef.current?.click()} className="flex items-center gap-1 text-[10px] text-[#002855] font-medium hover:underline"><Plus className="w-3 h-3" />Add</button>
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} data-testid="photo-input" />
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

        {/* RULES */}
        {showRules && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="weight-rules">
            <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Scale className="w-4 h-4 text-[#D4AF37]" /><h2 className="text-sm font-bold text-white">Size & Weight Rules</h2></div>
              <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {WEIGHT_RULES.map((rule, i) => (
                <div key={i} className={`px-4 py-3 ${rule.highlight ? "bg-[#D4AF37]/5" : ""}`}>
                  <h3 className="text-xs font-bold text-[#002855] mb-1">{rule.title}{rule.cfr && <span className="ml-1.5 text-[10px] font-mono text-[#D4AF37]">{rule.cfr}</span>}</h3>
                  <ul className="space-y-0.5">
                    {rule.items.map((item, j) => <li key={j} className="text-[12px] text-[#475569] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#CBD5E1]">{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRIDGE CHART TABLE */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Bridge Chart — Max Load (lbs)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#002855] text-white">
                  <th className="px-3 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider sticky left-0 bg-[#002855] z-20">Dist</th>
                  {ALL_AXLES.map(a => (
                    <th key={a} className={`px-3 py-2.5 text-right font-bold text-[10px] uppercase tracking-wider ${hasHighlight && result.axles === a ? "bg-[#D4AF37] text-[#002855]" : ""}`}>{a} Axles</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_DISTANCES.map((d) => {
                  const row = BRIDGE_DATA[d];
                  const isHighlightRow = hasHighlight && d === result.distance;
                  return (
                    <tr key={d} className={`border-b border-[#F1F5F9] ${isHighlightRow ? "bg-[#D4AF37]/15" : d % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]"}`} data-testid={`row-${d}`}>
                      <td className={`px-3 py-2 font-bold sticky left-0 z-10 ${isHighlightRow ? "text-[#002855] bg-[#D4AF37]/15" : "text-[#002855] bg-inherit"}`}>{d}</td>
                      {ALL_AXLES.map(a => {
                        const isCell = hasHighlight && d === result.distance && a === result.axles;
                        return (
                          <td key={a} className={`px-3 py-2 text-right tabular-nums ${isCell ? "bg-[#D4AF37] text-[#002855] font-black text-sm" : ""}`}>
                            {row[a] ? <span className={isCell ? "" : "text-[#334155] font-medium"}>{row[a].toLocaleString()}</span> : <span className="text-[#E2E8F0]">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Inspection Picker Modal */}
      {showInspPicker && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowInspPicker(false)}>
          <div className="bg-[#0F1D2F] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[70vh] overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Add to Inspection</h3>
              <button onClick={() => setShowInspPicker(false)} className="text-white/40 hover:text-white p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-3 pt-3 pb-2 border-b border-white/10">
              <p className="text-[10px] text-white/40 font-medium mb-1.5">New Inspection</p>
              <div className="flex gap-1.5">
                <input type="text" value={newInspTitle} onChange={(e) => setNewInspTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAndAdd()} placeholder="Inspection name..."
                  className="flex-1 px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs placeholder:text-white/30 focus:ring-1 focus:ring-[#D4AF37] outline-none" />
                <button onClick={createAndAdd} disabled={saving} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold disabled:opacity-50 flex-shrink-0">{saving ? "..." : "Create & Add"}</button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-2">
              {inspections.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-6">No existing inspections</p>
              ) : inspections.map((insp) => (
                <button key={insp.id} onClick={() => addToInspection(insp.id)} disabled={saving} className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 transition-colors text-left group">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{insp.title || "Untitled"}</p>
                    <p className="text-[10px] text-white/30">{new Date(insp.created_at).toLocaleDateString()}</p>
                  </div>
                  <FolderPlus className="w-4 h-4 text-white/20 group-hover:text-[#D4AF37] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
