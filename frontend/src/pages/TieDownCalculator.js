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
   CONSTANTS
   ================================================================ */
const PRESETS = [
  { label: '1" Ratchet Strap', wll: 3300 },
  { label: '2" Ratchet Strap', wll: 3300 },
  { label: '4" Ratchet Strap', wll: 5400 },
  { label: '3/8" Gr70 Chain', wll: 6600 },
  { label: '1/2" Gr70 Chain', wll: 11300 },
];

/** Effective WLL accounting for method: direct = 100%, indirect = 50% */
function effectiveWll(td) {
  if (td.defective) return 0;
  return td.method === "indirect" ? td.wll * 0.5 : td.wll;
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
   MAIN COMPONENT
   ================================================================ */
export default function TieDownCalculator() {
  const navigate = useNavigate();

  const [cargoWeight, setCargoWeight] = useState("");
  const [cargoLength, setCargoLength] = useState("");
  const [tiedowns, setTiedowns] = useState([]);
  const [showRef, setShowRef] = useState(false);

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
            ? '<span style="background:#D4AF37;color:#002855;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">INDIRECT 50%</span>'
            : '<span style="background:#002855;color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:bold;">DIRECT</span>';
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
<p style="font-size:10px;color:#94A3B8;font-style:italic;">Per 49 CFR 393.104/.106 &mdash; Direct: 100% WLL, Indirect: 50% WLL, Required aggregate WLL: 50% of cargo weight</p>
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
        <div className="bg-white rounded-xl border p-4 space-y-3" data-testid="tiedowns-section">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">
              Tie-Downs ({tiedowns.length})
            </h2>
            {tiedowns.length > 0 && (
              <span className="text-[10px] text-[#94A3B8]">
                {activeTiedowns} active &middot; {defectiveCount} defective
              </span>
            )}
          </div>

          {/* Quick-add preset grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="preset-grid">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => addTiedown(p)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#002855] hover:text-white hover:border-[#002855] active:scale-[0.97] transition-all text-left group"
                data-testid={`add-${p.label.replace(/[\s/"]/g, "-")}`}
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0 text-[#94A3B8] group-hover:text-white" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.label}</p>
                  <p className="text-[10px] opacity-60">{p.wll.toLocaleString()} lbs</p>
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
                <p className="text-xs font-medium text-[#64748B]">Custom</p>
                <p className="text-[10px] text-[#94A3B8]">Enter WLL</p>
              </div>
            </button>
          </div>

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
                          DIRECT
                        </button>
                        <button
                          onClick={() => td.method !== "indirect" && toggleMethod(td.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors ${
                            td.method === "indirect"
                              ? "bg-[#D4AF37] text-[#002855]"
                              : "bg-white text-[#94A3B8] hover:text-[#64748B]"
                          }`}
                          data-testid={`method-indirect-${idx}`}
                        >
                          INDIRECT
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
                            {td.method === "indirect" && (
                              <span className="text-[9px] text-[#D4AF37] font-semibold mr-1">
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

        {/* ═══════════════════════════════════════════
            SECTION 4 — WLL BREAKDOWN
            ═══════════════════════════════════════════ */}
        {tiedowns.length > 0 && weight > 0 && (
          <div className="bg-white rounded-xl border p-4 space-y-3" data-testid="wll-breakdown">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-[#64748B]">
              WLL Contribution Breakdown
            </h2>

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
                              ? "bg-[#D4AF37]"
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
                <span className="text-[10px] text-[#64748B]">Direct (100% WLL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#D4AF37]" />
                <span className="text-[10px] text-[#64748B]">Indirect (50% WLL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-300" />
                <span className="text-[10px] text-[#64748B]">Defective (0 lbs)</span>
              </div>
            </div>
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
                <p>Direct tie-down: <strong>100%</strong> of rated WLL counts toward aggregate</p>
                <p>Indirect tie-down: <strong>50%</strong> of rated WLL counts toward aggregate</p>
              </div>

              <div className="bg-white rounded-lg p-3 border text-[11px] text-[#475569] space-y-0.5">
                <p className="font-bold text-[#002855] text-[10px] uppercase tracking-wider mb-1.5">
                  Direct vs. Indirect Tie-Downs
                </p>
                <p>
                  <strong>Direct:</strong> Attached from cargo anchor to vehicle anchor (chain binder,
                  direct-attach strap). Full WLL applies.
                </p>
                <p>
                  <strong>Indirect:</strong> Goes over or around cargo, secured to vehicle on both
                  sides (belly strap, over-the-top). Only 50% of WLL applies.
                </p>
              </div>

              <p className="text-[9px] text-[#94A3B8] italic px-1">
                This calculator provides estimates. Always verify with current FMCSA regulations and
                inspection standards.
              </p>
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
    </div>
  );
}
