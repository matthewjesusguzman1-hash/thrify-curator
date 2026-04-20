import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hourglass, ChevronLeft, AlertTriangle, CheckCircle2, RotateCcw, Info } from "lucide-react";
import { Button } from "../components/ui/button";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseHours(v) {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmt(n) {
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

function makeRows(n) {
  // oldest first, today at bottom
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      id: i,
      date: d,
      dayLabel: DAY_NAMES[d.getDay()],
      dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: i === 0,
      drive: "",
      onDuty: "",
      override: "",
    });
  }
  return out;
}

export default function HoursOfServicePage() {
  const navigate = useNavigate();
  const [ruleType, setRuleType] = useState("property"); // "property" | "passenger"
  const [rowsProp, setRowsProp] = useState(() => makeRows(8));
  const [rowsPass, setRowsPass] = useState(() => makeRows(7));

  const rows = ruleType === "property" ? rowsProp : rowsPass;
  const setRows = ruleType === "property" ? setRowsProp : setRowsPass;
  const limit = ruleType === "property" ? 70 : 60;
  const dayCount = ruleType === "property" ? 8 : 7;

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const clearAll = () => {
    setRows(makeRows(dayCount));
  };

  const dayTotals = useMemo(() => {
    return rows.map((r) => {
      const ov = parseHours(r.override);
      if (r.override && ov > 0) return { total: ov, source: "override" };
      const total = parseHours(r.drive) + parseHours(r.onDuty);
      return { total, source: "split" };
    });
  }, [rows]);

  const grandTotal = useMemo(() => dayTotals.reduce((s, d) => s + d.total, 0), [dayTotals]);
  const remaining = Math.max(0, limit - grandTotal);
  const overBy = Math.max(0, grandTotal - limit);
  const isOOS = grandTotal > limit;

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <header className="sticky top-0 z-40 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-white hover:text-[#D4AF37] flex items-center gap-1.5 text-sm font-medium" data-testid="hos-back-btn">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-white">
            <Hourglass className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Hours of Service</span>
          </div>
          <button onClick={clearAll} className="text-white/70 hover:text-white flex items-center gap-1.5 text-xs font-medium" data-testid="hos-clear-btn">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {/* Title card */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#002855] px-4 py-3 flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-bold text-white">60 / 70 Hour Rule Calculator</h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Rule toggle */}
            <div>
              <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1.5">Rule Type</label>
              <div className="flex items-center gap-0 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden w-fit" data-testid="hos-rule-toggle">
                <button
                  onClick={() => setRuleType("property")}
                  className={`px-4 py-2 text-xs font-bold ${ruleType === "property" ? "bg-[#D4AF37] text-[#002855]" : "text-[#64748B]"}`}
                  data-testid="hos-rule-property"
                >
                  Property · 70 hr / 8 day
                </button>
                <button
                  onClick={() => setRuleType("passenger")}
                  className={`px-4 py-2 text-xs font-bold ${ruleType === "passenger" ? "bg-[#D4AF37] text-[#002855]" : "text-[#64748B]"}`}
                  data-testid="hos-rule-passenger"
                >
                  Passenger · 60 hr / 7 day
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#64748B] flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#94A3B8]" />
                {ruleType === "property"
                  ? "Property-carrying drivers may not drive after 70 hours on duty in 8 consecutive days."
                  : "Passenger-carrying drivers may not drive after 60 hours on duty in 7 consecutive days."}
              </p>
            </div>
          </div>
        </div>

        {/* Day entries */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Daily Hours (on-duty + drive)</h3>
            <span className="text-[10px] text-[#94A3B8]">Oldest first · today at bottom</span>
          </div>

          {/* Column headers */}
          <div className="px-3 sm:px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] grid grid-cols-[80px_1fr_1fr_1fr_70px] gap-2 items-center text-[9px] font-bold text-[#64748B] uppercase tracking-wider">
            <div>Day</div>
            <div className="text-center">Drive (hr)</div>
            <div className="text-center">On-Duty (hr)</div>
            <div className="text-center">Override Total</div>
            <div className="text-right">Total</div>
          </div>

          {rows.map((r, idx) => {
            const dt = dayTotals[idx];
            const hasOverride = dt.source === "override";
            return (
              <div
                key={r.id}
                className={`px-3 sm:px-4 py-2.5 grid grid-cols-[80px_1fr_1fr_1fr_70px] gap-2 items-center border-b border-[#F1F5F9] ${r.isToday ? "bg-[#D4AF37]/5" : ""}`}
                data-testid={`hos-row-${r.id}`}
              >
                <div>
                  <div className="text-[11px] font-bold text-[#002855] leading-tight">
                    {r.isToday ? "Today" : r.dayLabel}
                  </div>
                  <div className="text-[10px] text-[#94A3B8] leading-tight">{r.dateStr}</div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  value={r.drive}
                  onChange={(e) => updateRow(r.id, "drive", e.target.value)}
                  disabled={hasOverride}
                  placeholder="0"
                  className="w-full px-2 py-2 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] disabled:bg-[#F8FAFC] disabled:text-[#CBD5E1]"
                  data-testid={`hos-drive-${r.id}`}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  value={r.onDuty}
                  onChange={(e) => updateRow(r.id, "onDuty", e.target.value)}
                  disabled={hasOverride}
                  placeholder="0"
                  className="w-full px-2 py-2 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] disabled:bg-[#F8FAFC] disabled:text-[#CBD5E1]"
                  data-testid={`hos-onduty-${r.id}`}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  value={r.override}
                  onChange={(e) => updateRow(r.id, "override", e.target.value)}
                  placeholder="—"
                  className={`w-full px-2 py-2 text-sm font-bold text-center rounded-lg border outline-none focus:border-[#D4AF37] ${hasOverride ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#002855]" : "border-[#E2E8F0] placeholder:text-[#CBD5E1]"}`}
                  data-testid={`hos-override-${r.id}`}
                />
                <div className="text-right">
                  <span className={`text-sm font-black tabular-nums ${dt.total > 0 ? "text-[#002855]" : "text-[#CBD5E1]"}`}>
                    {dt.total > 0 ? fmt(dt.total) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result card */}
        <div className={`rounded-xl border shadow-sm overflow-hidden ${isOOS ? "bg-[#FEE2E2] border-[#EF4444]/40" : grandTotal > 0 ? "bg-[#F0FDF4] border-[#16A34A]/30" : "bg-white border-[#E2E8F0]"}`} data-testid="hos-result-card">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Total Hours ({dayCount} days)</span>
              <span className={`text-2xl font-black tabular-nums ${isOOS ? "text-[#DC2626]" : "text-[#002855]"}`} data-testid="hos-total">
                {fmt(grandTotal)} <span className="text-sm font-bold text-[#64748B]">/ {limit}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full transition-all ${isOOS ? "bg-[#DC2626]" : "bg-[#16A34A]"}`}
                style={{ width: `${Math.min(100, (grandTotal / limit) * 100)}%` }}
              />
            </div>

            <div className="h-px bg-black/5" />

            {isOOS ? (
              <div className="flex items-start gap-2" data-testid="hos-oos">
                <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-black text-[#DC2626] uppercase tracking-wide">Out of Service</div>
                  <div className="text-xs text-[#991B1B] mt-0.5">
                    Exceeded the {limit}-hour limit by <strong>{fmt(overBy)} hr</strong>. Driver may not drive until available hours drop below the limit.
                  </div>
                </div>
              </div>
            ) : grandTotal > 0 ? (
              <div className="flex items-start gap-2" data-testid="hos-ok">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-black text-[#16A34A] uppercase tracking-wide">Within Limit</div>
                  <div className="text-xs text-[#166534] mt-0.5">
                    <strong>{fmt(remaining)} hr</strong> remaining before reaching the {limit}-hour limit.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#64748B] italic">Enter drive and on-duty hours above to calculate.</div>
            )}
          </div>
        </div>

        {/* Helper text */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-[11px] text-[#64748B] leading-relaxed">
          <div className="font-bold text-[#002855] mb-1">How to use</div>
          <ul className="space-y-1 pl-4 list-disc">
            <li>For each day, enter <strong>Drive</strong> and <strong>On-Duty</strong> hours directly from the driver's logbook.</li>
            <li>If you've already totaled a day on your own, enter it in the <strong>Override Total</strong> column — that value replaces Drive + On-Duty for that day.</li>
            <li>The calculator sums all {dayCount} days and compares against the {limit}-hour limit.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
