import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Calculator, Scale, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "../components/ui/button";

/* ================================================================
   BRIDGE CHART DATA — From Federal Bridge Formula Table
   Format: { distance: { axles: maxWeight } }
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
   WEIGHT RULES DATA
   ================================================================ */
const WEIGHT_RULES = [
  {
    title: "Maximum Allowable Weights",
    cfr: "§60-6,294",
    items: [
      "Any single axle — 20,000 lbs.",
      "Any tandem axle — 34,000 lbs.",
      "On State highways — 95,000 lbs.",
      "On Interstate — 80,000 lbs. or 95,000 lbs. with Conditional Interstate Use Permit",
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
    items: [
      "The maximum gross load on any group of two axles, the distance between the extremes of which is more than 8' but less than 8'6\", shall be 38,000 lbs.",
    ],
    highlight: true,
  },
  {
    title: "Measuring Distance",
    items: [
      "Distance between axles shall be measured to the nearest foot.",
      "When a fraction is exactly one-half foot, the next larger whole number shall be used.",
      "Exception: Any group of 3 axles shall be restricted to a maximum load of 34,000 lbs. unless the distance between the extremes of the first and third axle is at least 96\" in fact.",
    ],
  },
  {
    title: "Tandem Exception (36'-38')",
    items: [
      "If you have two consecutive sets of tandem axles that measure a minimum of 36', 37', or 38', you may carry 34,000 lbs. each on such consecutive sets of tandem axles.",
    ],
    highlight: true,
  },
  {
    title: "Weight Tolerance (5% Shift)",
    items: [
      "There is a 5% weight shift if only overweight on one axle, one tandem axle, or one group of axles when the distance between the first and last axle of such group of axles is 12' or less.",
    ],
    highlight: true,
  },
  {
    title: "Sliding Fifth-Wheel",
    items: [
      "It shall be unlawful to reposition the fifth-wheel connection device of a truck-tractor and semitrailer combination carrying cargo and on the state highway system, except when done pursuant to state statute §60-6,301.",
    ],
  },
  {
    title: "Dummy Axles",
    items: [
      "Shall be disregarded in determining the legal weight if the dummy axle does not carry the lesser of 8,000 lbs. or 8% of the gross weight of the vehicle, or vehicle combination including the load.",
    ],
  },
  {
    title: "Idle Reduction Technology or APU",
    items: [
      "Maximum gross weight limit and axle weight limit may be increased by an amount necessary to cover the additional weight of the APU.",
      "Additional weight shall not exceed 550 lbs. or the weight specified on the unit, whichever is less.",
      "This shall not be in addition to the 5% shift tolerance.",
    ],
  },
  {
    title: "Natural Gas Powered Vehicles",
    items: [
      "May exceed any vehicle weight limit up to 2,000 lbs. to cover the difference between the natural gas fuel system and a comparable diesel fuel system.",
      "No vehicle using this exception may exceed 82,000 lbs. overall gross on the National System of Interstate and Defense Highways.",
    ],
  },
];

/* ================================================================
   CALCULATOR COMPONENT
   ================================================================ */
function BridgeCalculator() {
  const [distance, setDistance] = useState("");
  const [axles, setAxles] = useState("");
  const [actualWeight, setActualWeight] = useState("");

  const result = useMemo(() => {
    const d = parseInt(distance);
    const a = parseInt(axles);
    if (!d || !a || d < 4 || d > 60 || a < 2 || a > 7) return null;

    const row = BRIDGE_DATA[d];
    if (!row || !row[a]) return { distance: d, axles: a, maxWeight: null, message: "No data for this combination" };

    const maxWeight = row[a];
    const actual = parseInt(actualWeight) || 0;
    const overweight = actual > 0 ? actual - maxWeight : 0;
    const toleranceWeight = maxWeight * 1.05;

    return {
      distance: d,
      axles: a,
      maxWeight,
      actual: actual || null,
      overweight: overweight > 0 ? overweight : 0,
      withinTolerance: actual > maxWeight && actual <= toleranceWeight,
      toleranceWeight: Math.round(toleranceWeight),
    };
  }, [distance, axles, actualWeight]);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="bridge-calculator">
      <div className="bg-[#002855] px-4 py-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#D4AF37]" />
          <h2 className="text-sm font-bold text-white">Bridge Weight Calculator</h2>
        </div>
        <p className="text-[10px] text-[#8FAEC5] mt-0.5">Enter axle group details to check max legal weight</p>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Distance (ft)</label>
            <input
              type="number"
              inputMode="numeric"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="4-60"
              min="4" max="60"
              className="w-full px-3 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none"
              data-testid="calc-distance"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Axles</label>
            <select
              value={axles}
              onChange={(e) => setAxles(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none bg-white"
              data-testid="calc-axles"
            >
              <option value="">—</option>
              {ALL_AXLES.map(a => <option key={a} value={a}>{a} Axles</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Actual (lbs)</label>
            <input
              type="number"
              inputMode="numeric"
              value={actualWeight}
              onChange={(e) => setActualWeight(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2.5 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none"
              data-testid="calc-actual"
            />
          </div>
        </div>

        {result && (
          <div className={`rounded-lg p-3 ${
            result.maxWeight === null
              ? "bg-[#FEF3C7] border border-[#F59E0B]/30"
              : result.overweight > 0
              ? result.withinTolerance
                ? "bg-[#FFF7ED] border border-[#F97316]/30"
                : "bg-[#FEE2E2] border border-[#EF4444]/30"
              : "bg-[#F0FDF4] border border-[#16A34A]/30"
          }`} data-testid="calc-result">
            {result.maxWeight === null ? (
              <p className="text-xs text-[#92400E] font-medium">{result.message}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Max Legal Weight</span>
                  <span className="text-lg font-black text-[#002855]">{result.maxWeight.toLocaleString()} lbs</span>
                </div>
                {result.actual && (
                  <>
                    <div className="h-px bg-black/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold">Actual Weight</span>
                      <span className="text-sm font-bold text-[#334155]">{result.actual.toLocaleString()} lbs</span>
                    </div>
                    {result.overweight > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold flex items-center gap-1 text-[#DC2626]">
                          <AlertTriangle className="w-3 h-3" /> Overweight
                        </span>
                        <span className="text-sm font-black text-[#DC2626]">+{result.overweight.toLocaleString()} lbs</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
                        <span className="text-[10px] font-bold text-[#16A34A] uppercase">Within legal limit</span>
                      </div>
                    )}
                    {result.withinTolerance && (
                      <p className="text-[10px] text-[#F97316] font-medium bg-[#FFF7ED] rounded px-2 py-1">
                        Within 5% tolerance ({result.toleranceWeight.toLocaleString()} lbs) — may apply if only one axle/group overweight and distance is 12' or less
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function BridgeChartPage() {
  const navigate = useNavigate();
  const [searchDist, setSearchDist] = useState("");
  const [showRules, setShowRules] = useState(false);

  const highlightDist = parseInt(searchDist) || null;

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="bridge-chart-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-white/10 h-8 px-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-sm sm:text-lg font-semibold text-white leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                Bridge Chart
              </h1>
              <p className="text-[10px] text-[#8FAEC5] hidden sm:block">Federal Bridge Formula — §60-6,294</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRules(!showRules)}
            className={`text-xs h-8 px-3 ${showRules ? "bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432]" : "text-[#D4AF37] hover:bg-white/10"}`}
            data-testid="toggle-rules-btn"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            Rules
          </Button>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {/* Calculator */}
        <BridgeCalculator />

        {/* Weight Rules Panel */}
        {showRules && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="weight-rules">
            <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-sm font-bold text-white">Size & Weight Rules</h2>
              </div>
              <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {WEIGHT_RULES.map((rule, i) => (
                <div key={i} className={`px-4 py-3 ${rule.highlight ? "bg-[#D4AF37]/5" : ""}`}>
                  <h3 className="text-xs font-bold text-[#002855] mb-1.5">
                    {rule.title}
                    {rule.cfr && <span className="ml-1.5 text-[10px] font-mono text-[#D4AF37]">{rule.cfr}</span>}
                  </h3>
                  <ul className="space-y-1">
                    {rule.items.map((item, j) => (
                      <li key={j} className="text-[12px] text-[#475569] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#CBD5E1]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bridge Chart Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Bridge Chart — Max Load (lbs)</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="number"
                inputMode="numeric"
                value={searchDist}
                onChange={(e) => setSearchDist(e.target.value)}
                placeholder="Jump to distance..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] w-40 focus:ring-1 focus:ring-[#002855] outline-none"
                data-testid="table-search"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#002855] text-white">
                  <th className="px-3 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider sticky left-0 bg-[#002855] z-20">Dist (ft)</th>
                  {ALL_AXLES.map(a => (
                    <th key={a} className="px-3 py-2.5 text-right font-bold text-[10px] uppercase tracking-wider">{a} Axles</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_DISTANCES.map((d) => {
                  const row = BRIDGE_DATA[d];
                  const isHighlighted = d === highlightDist;
                  return (
                    <tr
                      key={d}
                      id={`row-${d}`}
                      className={`border-b border-[#F1F5F9] ${isHighlighted ? "bg-[#D4AF37]/15 ring-1 ring-[#D4AF37]/40" : d % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]"} hover:bg-[#F1F5F9]`}
                      data-testid={`row-${d}`}
                    >
                      <td className={`px-3 py-2 font-bold sticky left-0 z-10 ${isHighlighted ? "text-[#002855] bg-[#D4AF37]/15" : "text-[#002855] bg-inherit"}`}>{d}</td>
                      {ALL_AXLES.map(a => (
                        <td key={a} className="px-3 py-2 text-right tabular-nums">
                          {row[a] ? (
                            <span className="text-[#334155] font-medium">{row[a].toLocaleString()}</span>
                          ) : (
                            <span className="text-[#E2E8F0]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
