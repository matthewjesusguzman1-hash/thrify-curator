import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hourglass, ChevronLeft, AlertTriangle, CheckCircle2, RotateCcw, Info } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseHours(v) {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmt(n) {
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

// yyyy-mm-dd string for <input type="date"> in local time
function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInput(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function makeRows(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i, // fixed position; index 0 is oldest, index n-1 is anchor/today
    drive: "",
    onDuty: "",
    total: "",
  }));
}

export default function HoursOfServicePage() {
  const navigate = useNavigate();
  const [ruleType, setRuleType] = useState("property"); // "property" | "passenger"
  const [rowsProp, setRowsProp] = useState(() => makeRows(8));
  const [rowsPass, setRowsPass] = useState(() => makeRows(7));
  const [anchorProp, setAnchorProp] = useState(() => startOfDay(new Date()));
  const [anchorPass, setAnchorPass] = useState(() => startOfDay(new Date()));

  const rows = ruleType === "property" ? rowsProp : rowsPass;
  const setRows = ruleType === "property" ? setRowsProp : setRowsPass;
  const anchor = ruleType === "property" ? anchorProp : anchorPass;
  const setAnchor = ruleType === "property" ? setAnchorProp : setAnchorPass;
  const limit = ruleType === "property" ? 70 : 60;
  const dayCount = ruleType === "property" ? 8 : 7;

  const today = startOfDay(new Date());

  // compute actual date per row index; idx 0 = oldest, idx n-1 = anchor
  const dateFor = (idx) => addDays(anchor, -(dayCount - 1 - idx));

  const updateDriveOrOnDuty = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, total: "" } : r)),
    );
  };

  const updateTotal = (id, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              total: value,
              drive: value ? "" : r.drive,
              onDuty: value ? "" : r.onDuty,
            }
          : r,
      ),
    );
  };

  // User edited the date on row `idx` — shift anchor so that row idx lands on newDate
  const updateRowDate = (idx, newDateStr) => {
    if (!newDateStr) return;
    const newDate = fromDateInput(newDateStr);
    if (isNaN(newDate.getTime())) return;
    // row idx corresponds to anchor - (dayCount - 1 - idx) days
    // → newAnchor = newDate + (dayCount - 1 - idx) days
    const newAnchor = addDays(newDate, dayCount - 1 - idx);
    setAnchor(startOfDay(newAnchor));
  };

  const resetToToday = () => setAnchor(startOfDay(new Date()));

  const clearAll = () => {
    setRows(makeRows(dayCount));
    resetToToday();
  };

  const dayTotals = useMemo(
    () =>
      rows.map((r) => {
        if (r.total !== "" && !isNaN(parseFloat(r.total))) {
          return { value: parseHours(r.total), source: "total" };
        }
        return { value: parseHours(r.drive) + parseHours(r.onDuty), source: "split" };
      }),
    [rows],
  );

  const grandTotal = useMemo(() => dayTotals.reduce((s, d) => s + d.value, 0), [dayTotals]);
  const remaining = Math.max(0, limit - grandTotal);
  const overBy = Math.max(0, grandTotal - limit);
  const isOOS = grandTotal > limit;

  const anchorIsToday = sameDay(anchor, today);

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
        {/* Title + rule toggle */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#002855] px-4 py-3 flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-bold text-white">60 / 70 Hour Rule Calculator</h2>
          </div>
          <div className="p-4 space-y-3">
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
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-[#002855] uppercase tracking-wider">Daily Hours (on-duty + drive)</h3>
            <div className="flex items-center gap-2">
              {!anchorIsToday && (
                <button
                  onClick={resetToToday}
                  className="text-[10px] font-bold text-[#D4AF37] hover:text-[#002855] underline"
                  data-testid="hos-reset-today-btn"
                >
                  Reset to today
                </button>
              )}
              <span className="text-[10px] text-[#94A3B8]">Tap any date to shift the window</span>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] grid grid-cols-[110px_1fr_1fr_1fr] gap-2 items-center text-[9px] font-bold text-[#64748B] uppercase tracking-wider">
            <div>Day</div>
            <div className="text-center">Drive (hr)</div>
            <div className="text-center">On-Duty (hr)</div>
            <div className="text-center">Total (hr)</div>
          </div>

          {rows.map((r, idx) => {
            const dt = dayTotals[idx];
            const totalEntered = dt.source === "total";
            const totalDisplay = totalEntered
              ? r.total
              : dt.value > 0
                ? fmt(dt.value)
                : "";
            const d = dateFor(idx);
            const isAnchor = idx === rows.length - 1;
            const isTodayRow = sameDay(d, today);
            const dayLabel = isAnchor && isTodayRow ? "Today" : DAY_NAMES[d.getDay()];
            return (
              <div
                key={r.id}
                className={`px-3 sm:px-4 py-2.5 grid grid-cols-[110px_1fr_1fr_1fr] gap-2 items-center border-b border-[#F1F5F9] ${isAnchor ? "bg-[#D4AF37]/5" : ""}`}
                data-testid={`hos-row-${r.id}`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="text-[11px] font-bold text-[#002855] leading-tight">{dayLabel}</div>
                  <input
                    type="date"
                    value={toDateInput(d)}
                    onChange={(e) => updateRowDate(idx, e.target.value)}
                    className="text-[10px] text-[#475569] leading-tight bg-transparent border-0 outline-none focus:text-[#002855] cursor-pointer p-0 w-full"
                    data-testid={`hos-date-${r.id}`}
                  />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  value={r.drive}
                  onChange={(e) => updateDriveOrOnDuty(r.id, "drive", e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-2 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] placeholder:text-[#CBD5E1]"
                  data-testid={`hos-drive-${r.id}`}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  value={r.onDuty}
                  onChange={(e) => updateDriveOrOnDuty(r.id, "onDuty", e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-2 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] placeholder:text-[#CBD5E1]"
                  data-testid={`hos-onduty-${r.id}`}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  value={totalDisplay}
                  onChange={(e) => updateTotal(r.id, e.target.value)}
                  placeholder="0"
                  className={`w-full px-2 py-2 text-sm font-black text-center rounded-lg border outline-none focus:border-[#D4AF37] ${
                    totalEntered
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#002855]"
                      : dt.value > 0
                        ? "border-[#E2E8F0] bg-[#F8FAFC] text-[#002855]"
                        : "border-[#E2E8F0] placeholder:text-[#CBD5E1]"
                  }`}
                  data-testid={`hos-total-${r.id}`}
                />
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
            <li>For each day, enter <strong>Drive</strong> and <strong>On-Duty</strong> hours from the driver's logbook — the <strong>Total</strong> column auto-fills.</li>
            <li>Or, type your own calculated <strong>Total</strong> directly into that column — it will clear Drive and On-Duty for that day.</li>
            <li>Tap any <strong>date</strong> to shift the whole {dayCount}-day window. All other dates update to match.</li>
            <li>The calculator sums all {dayCount} days and compares against the {limit}-hour limit.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
