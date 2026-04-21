import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Hourglass, ChevronLeft, AlertTriangle, CheckCircle2, RotateCcw, Info,
  Eye, Save, ClipboardList, ChevronDown, ChevronUp, HelpCircle, Clock,
  Lightbulb, X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { toast, Toaster } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { PDFPreview } from "../components/app/PDFPreview";
import { HosReportContent } from "../components/app/ReportContent";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LS_WALKTHROUGH_KEY = "hos-walkthrough-dismissed-v1";

function parseHours(v) {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmt(n) {
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

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
function startOfDay(d) { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d, n) { const out = new Date(d); out.setDate(out.getDate() + n); return out; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function makeRows(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    drive: "",
    onDuty: "",
    total: "",
  }));
}

// Simple info icon with plain-language popover
function InfoHelp({ title, body, testid }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[#94A3B8] hover:text-[#D4AF37]" data-testid={testid}>
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-xs" side="top">
        <div className="font-bold text-[#002855] mb-1">{title}</div>
        <div className="text-[#475569] leading-relaxed">{body}</div>
      </PopoverContent>
    </Popover>
  );
}

export default function HoursOfServicePage() {
  const navigate = useNavigate();
  const { badge } = useAuth();

  const [ruleType, setRuleType] = useState("property");
  const [rowsProp, setRowsProp] = useState(() => makeRows(8));
  const [rowsPass, setRowsPass] = useState(() => makeRows(7));
  const [anchorProp, setAnchorProp] = useState(() => startOfDay(new Date()));
  const [anchorPass, setAnchorPass] = useState(() => startOfDay(new Date()));

  // Time of stop picker (HH:MM) — replaces "hours remaining" text input
  const [stopTime, setStopTime] = useState("");

  // UX toggles
  const [showMath, setShowMath] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(LS_WALKTHROUGH_KEY) === "1";
    if (dismissed) setWalkthroughOpen(false);
  }, []);
  const dismissWalkthrough = () => {
    localStorage.setItem(LS_WALKTHROUGH_KEY, "1");
    setWalkthroughOpen(false);
  };

  // Save / Export state
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = ruleType === "property" ? rowsProp : rowsPass;
  const setRows = ruleType === "property" ? setRowsProp : setRowsPass;
  const anchor = ruleType === "property" ? anchorProp : anchorPass;
  const setAnchor = ruleType === "property" ? setAnchorProp : setAnchorPass;
  const limit = ruleType === "property" ? 70 : 60;
  const dayCount = ruleType === "property" ? 8 : 7;

  const today = startOfDay(new Date());
  const dateFor = (idx) => addDays(anchor, -(dayCount - 1 - idx));

  const updateDriveOrOnDuty = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value, total: "" } : r)));
  const updateTotal = (id, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, total: value, drive: value ? "" : r.drive, onDuty: value ? "" : r.onDuty } : r)));
  const updateRowDate = (idx, newDateStr) => {
    if (!newDateStr) return;
    const newDate = fromDateInput(newDateStr);
    if (isNaN(newDate.getTime())) return;
    setAnchor(startOfDay(addDays(newDate, dayCount - 1 - idx)));
  };
  const resetToToday = () => setAnchor(startOfDay(new Date()));
  const clearAll = () => {
    setRows(makeRows(dayCount));
    resetToToday();
    setStopTime("");
  };

  const dayTotals = useMemo(
    () => rows.map((r) => {
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

  // Convert HH:MM stop time → hours until midnight
  const hoursLeftFromStopTime = useMemo(() => {
    if (!stopTime) return null;
    const [h, m] = stopTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const decimal = h + m / 60;
    return Math.max(0, 24 - decimal);
  }, [stopTime]);

  const oosSim = useMemo(() => {
    if (!isOOS) return null;
    const hLeft = hoursLeftFromStopTime;
    if (hLeft == null || hLeft <= 0) return { needsInput: true };

    const steps = [];
    let cumulativeOOS = hLeft;
    let runningTotal = grandTotal;
    let daysDropped = 1;
    runningTotal = runningTotal - dayTotals[0].value;
    const oldestDate0 = addDays(anchor, -(dayCount - 1));
    steps.push({
      stepNum: 1,
      oosHours: cumulativeOOS,
      description: `Rest remainder of today (${fmt(hLeft)} hr). At midnight, oldest day ${DAY_NAMES[oldestDate0.getDay()]} ${oldestDate0.getMonth() + 1}/${oldestDate0.getDate()} (${fmt(dayTotals[0].value)} hr) ages off.`,
      runningTotal,
      passes: runningTotal <= limit,
    });

    while (runningTotal > limit && cumulativeOOS < 34 && daysDropped < dayTotals.length) {
      cumulativeOOS += 24;
      daysDropped += 1;
      const idx = daysDropped - 1;
      runningTotal = runningTotal - dayTotals[idx].value;
      const dropDate = addDays(anchor, -(dayCount - 1 - idx));
      steps.push({
        stepNum: steps.length + 1,
        oosHours: cumulativeOOS,
        description: `+24 hr rest. Next oldest day ${DAY_NAMES[dropDate.getDay()]} ${dropDate.getMonth() + 1}/${dropDate.getDate()} (${fmt(dayTotals[idx].value)} hr) ages off.`,
        runningTotal,
        passes: runningTotal <= limit,
      });
    }

    const solved = runningTotal <= limit;
    const exceedsRestart = cumulativeOOS >= 34;
    return {
      needsInput: false,
      steps,
      cumulativeOOS,
      finalTotal: runningTotal,
      solved,
      recommendRestart: !solved || exceedsRestart,
    };
  }, [isOOS, hoursLeftFromStopTime, grandTotal, dayTotals, limit, anchor, dayCount]);

  const anchorIsToday = sameDay(anchor, today);
  const hasData = grandTotal > 0;

  // Build snapshot for save / preview
  const snapshot = useMemo(() => ({
    ruleType,
    limitHours: limit,
    dayCount,
    days: rows.map((r, idx) => {
      const d = dateFor(idx);
      const dt = dayTotals[idx];
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
        dayLabel: idx === rows.length - 1 && sameDay(d, today) ? "Today" : DAY_NAMES[d.getDay()],
        drive: parseHours(r.drive),
        onDuty: parseHours(r.onDuty),
        total: dt.value,
      };
    }),
    grandTotal,
    isOos: isOOS,
    overBy,
    hoursLeftToday: hoursLeftFromStopTime,
    recoverySteps: oosSim && !oosSim.needsInput ? oosSim.steps : [],
    oosDuration: oosSim && !oosSim.needsInput && !oosSim.recommendRestart ? oosSim.cumulativeOOS : null,
    recommendRestart: !!(oosSim && !oosSim.needsInput && oosSim.recommendRestart),
  }), [rows, ruleType, limit, dayCount, grandTotal, isOOS, overBy, hoursLeftFromStopTime, oosSim, anchor, dayTotals, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInspections = async () => {
    setLoadingInspections(true);
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch { toast.error("Failed to load inspections"); }
    finally { setLoadingInspections(false); }
  };
  const openSaveModal = () => { fetchInspections(); setShowSaveModal(true); };

  const saveToInspection = async (inspectionId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/inspections/${inspectionId}/hos`, {
        rule_type: snapshot.ruleType,
        limit_hours: snapshot.limitHours,
        day_count: snapshot.dayCount,
        days: snapshot.days.map((d) => ({ date: d.date, day_label: d.dayLabel, drive: d.drive, on_duty: d.onDuty, total: d.total })),
        total_hours: snapshot.grandTotal,
        is_oos: snapshot.isOos,
        over_by: snapshot.overBy,
        hours_left_today: snapshot.hoursLeftToday,
        recovery_steps: snapshot.recoverySteps.map((s) => ({ step_num: s.stepNum, description: s.description, oos_hours: s.oosHours, running_total: s.runningTotal, passes: s.passes })),
        oos_duration: snapshot.oosDuration,
        recommend_restart: snapshot.recommendRestart,
      });
      toast.success("HOS recap saved to inspection");
      setShowSaveModal(false);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const createAndSave = async () => {
    const title = newInspTitle.trim() || `HOS ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/inspections`, { title, badge });
      if (res.data?.id) { setNewInspTitle(""); await saveToInspection(res.data.id); }
    } catch { toast.error("Failed to create inspection"); }
    finally { setSaving(false); }
  };

  // Verdict label for top banner
  let verdict = null;
  if (hasData) {
    if (!isOOS) {
      verdict = {
        tone: "ok",
        title: "Within Limit",
        sub: `${fmt(remaining)} hr available before reaching the ${limit}-hour limit.`,
      };
    } else if (!stopTime) {
      verdict = {
        tone: "oos",
        title: "Out of Service",
        sub: `Total ${fmt(grandTotal)} hr exceeds ${limit}-hour limit by ${fmt(overBy)} hr. Enter stop time below to see rest requirement.`,
      };
    } else if (oosSim && !oosSim.needsInput && oosSim.recommendRestart) {
      verdict = {
        tone: "oos",
        title: "34-Hour Restart Required",
        sub: `Driver must take 34 consecutive hours off duty to fully reset the ${limit}-hour clock.`,
      };
    } else if (oosSim && !oosSim.needsInput) {
      verdict = {
        tone: "oos",
        title: `Rest ${fmt(oosSim.cumulativeOOS)} hr before driving`,
        sub: `After ${fmt(oosSim.cumulativeOOS)} hours off duty, total drops to ${fmt(oosSim.finalTotal)} hr (under ${limit}).`,
      };
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <Toaster position="top-right" richColors />

      {/* HEADER */}
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

      {/* FLOATING ACTION BAR */}
      {hasData && (
        <div className="sticky top-[52px] z-30 bg-white/95 backdrop-blur border-b border-[#E2E8F0] shadow-sm">
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
            <Button size="sm" onClick={() => setShowPreview(true)} className="bg-[#002855] text-white hover:bg-[#001a3a] h-9 text-xs font-bold flex-1" data-testid="export-standalone-btn">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview &amp; Export
            </Button>
            <Button size="sm" onClick={openSaveModal} variant="outline" className="border-[#002855]/20 text-[#002855] hover:bg-[#002855]/5 h-9 text-xs font-bold flex-1" data-testid="save-to-inspection-btn">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save to Inspection
            </Button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">

        {/* VERDICT BANNER — big, clear answer up top */}
        {verdict && (
          <div
            className={`rounded-xl border-2 p-4 shadow-sm ${
              verdict.tone === "ok"
                ? "bg-[#F0FDF4] border-[#16A34A]"
                : "bg-[#FEE2E2] border-[#DC2626]"
            }`}
            data-testid="hos-verdict-banner"
          >
            <div className="flex items-start gap-3">
              {verdict.tone === "ok" ? (
                <CheckCircle2 className="w-7 h-7 text-[#16A34A] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-[#DC2626] flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-black uppercase tracking-widest ${verdict.tone === "ok" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {verdict.tone === "ok" ? "Legal" : "Out of Service"}
                </div>
                <div className={`text-xl sm:text-2xl font-black leading-tight mt-0.5 ${verdict.tone === "ok" ? "text-[#14532D]" : "text-[#7F1D1D]"}`} data-testid="hos-verdict-title">
                  {verdict.title}
                </div>
                <div className="text-xs text-[#475569] mt-1 leading-relaxed">{verdict.sub}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Total</div>
                <div className={`text-2xl font-black tabular-nums ${isOOS ? "text-[#DC2626]" : "text-[#002855]"}`}>
                  {fmt(grandTotal)}
                </div>
                <div className="text-[10px] text-[#64748B] font-medium">/ {limit} hr</div>
              </div>
            </div>
          </div>
        )}

        {/* 3-STEP WALKTHROUGH (dismissible) */}
        {walkthroughOpen && (
          <div className="bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/40 p-3 relative" data-testid="hos-walkthrough">
            <button
              onClick={dismissWalkthrough}
              className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-[#D4AF37]/20 flex items-center justify-center text-[#64748B]"
              data-testid="hos-walkthrough-close"
              aria-label="Dismiss walkthrough"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-xs font-black text-[#002855] uppercase tracking-wider">New here? Three quick steps.</h3>
            </div>
            <ol className="space-y-1 text-[11px] text-[#475569] pr-6">
              <li className="flex gap-2"><span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#002855] text-white text-[9px] font-black text-center leading-4">1</span>Pick the rule type — <strong>Property</strong> (70 hr) or <strong>Passenger</strong> (60 hr).</li>
              <li className="flex gap-2"><span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#002855] text-white text-[9px] font-black text-center leading-4">2</span>Enter each day's total hours (or expand to split Drive &amp; On-Duty).</li>
              <li className="flex gap-2"><span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#002855] text-white text-[9px] font-black text-center leading-4">3</span>If OUT OF SERVICE, enter the stop time to get the required rest.</li>
            </ol>
          </div>
        )}

        {/* STEP 1: RULE TYPE */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#002855] px-4 py-2.5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#002855] text-[10px] font-black flex items-center justify-center">1</span>
            <h2 className="text-sm font-bold text-white">Choose the rule</h2>
            <InfoHelp
              title="Rule type"
              body={
                <>
                  <strong>Property</strong> carrier: 70 hr on duty in any rolling 8 days.<br />
                  <strong>Passenger</strong> carrier: 60 hr on duty in any rolling 7 days.<br />
                  Driving after reaching the limit = Out of Service until hours drop back below.
                </>
              }
              testid="hos-ruletype-help"
            />
          </div>
          <div className="p-4">
            <div className="flex items-center gap-0 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden w-fit" data-testid="hos-rule-toggle">
              <button onClick={() => setRuleType("property")} className={`px-4 py-2 text-xs font-bold ${ruleType === "property" ? "bg-[#D4AF37] text-[#002855]" : "text-[#64748B]"}`} data-testid="hos-rule-property">
                Property · 70 hr / 8 day
              </button>
              <button onClick={() => setRuleType("passenger")} className={`px-4 py-2 text-xs font-bold ${ruleType === "passenger" ? "bg-[#D4AF37] text-[#002855]" : "text-[#64748B]"}`} data-testid="hos-rule-passenger">
                Passenger · 60 hr / 7 day
              </button>
            </div>
          </div>
        </div>

        {/* STEP 2: DAILY HOURS */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#002855] px-4 py-2.5 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#002855] text-[10px] font-black flex items-center justify-center">2</span>
            <h2 className="text-sm font-bold text-white">Enter daily hours</h2>
            <InfoHelp
              title="How to enter"
              body={
                <>
                  Enter each day's <strong>total on-duty hours</strong> (drive + on-duty not driving). If you want to show the split, toggle <em>"Show split"</em> and enter Drive and On-Duty separately — the Total will auto-fill.<br /><br />
                  Tap any <strong>date</strong> to shift the whole {dayCount}-day window.
                </>
              }
              testid="hos-daily-help"
            />
          </div>

          {/* Split toggle + window reset */}
          <div className="px-3 sm:px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-[11px] text-[#475569] cursor-pointer" data-testid="hos-split-toggle">
              <input
                type="checkbox"
                checked={showSplit}
                onChange={(e) => setShowSplit(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#D4AF37]"
              />
              Show Drive / On-Duty split
            </label>
            {!anchorIsToday && (
              <button onClick={resetToToday} className="text-[10px] font-bold text-[#D4AF37] hover:text-[#002855] underline" data-testid="hos-reset-today-btn">
                Reset to today
              </button>
            )}
          </div>

          {/* Column headers */}
          <div className={`px-3 sm:px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] grid gap-2 items-center text-[9px] font-bold text-[#64748B] uppercase tracking-wider ${showSplit ? "grid-cols-[110px_1fr_1fr_1fr]" : "grid-cols-[110px_1fr]"}`}>
            <div>Day</div>
            {showSplit && <div className="text-center">Drive (hr)</div>}
            {showSplit && <div className="text-center">On-Duty (hr)</div>}
            <div className="text-center">Total (hr)</div>
          </div>

          {rows.map((r, idx) => {
            const dt = dayTotals[idx];
            const totalEntered = dt.source === "total";
            const totalDisplay = totalEntered ? r.total : dt.value > 0 ? fmt(dt.value) : "";
            const d = dateFor(idx);
            const isAnchor = idx === rows.length - 1;
            const isTodayRow = sameDay(d, today);
            const dayLabel = isAnchor && isTodayRow ? "Today" : DAY_NAMES[d.getDay()];
            return (
              <div
                key={r.id}
                className={`px-3 sm:px-4 py-2.5 grid gap-2 items-center border-b border-[#F1F5F9] ${showSplit ? "grid-cols-[110px_1fr_1fr_1fr]" : "grid-cols-[110px_1fr]"} ${isAnchor ? "bg-[#D4AF37]/5" : ""}`}
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
                {showSplit && (
                  <input
                    type="number" inputMode="decimal" step="0.25" min="0"
                    value={r.drive}
                    onChange={(e) => updateDriveOrOnDuty(r.id, "drive", e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-2 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] placeholder:text-[#CBD5E1]"
                    data-testid={`hos-drive-${r.id}`}
                  />
                )}
                {showSplit && (
                  <input
                    type="number" inputMode="decimal" step="0.25" min="0"
                    value={r.onDuty}
                    onChange={(e) => updateDriveOrOnDuty(r.id, "onDuty", e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-2 text-sm font-bold text-center rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] placeholder:text-[#CBD5E1]"
                    data-testid={`hos-onduty-${r.id}`}
                  />
                )}
                <input
                  type="number" inputMode="decimal" step="0.25" min="0"
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

        {/* STEP 3: OOS DETAILS (only if OOS) */}
        {isOOS && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#7F1D1D] px-4 py-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#002855] text-[10px] font-black flex items-center justify-center">3</span>
              <h2 className="text-sm font-bold text-white">When did you stop them?</h2>
              <InfoHelp
                title="Why we ask"
                body={
                  <>
                    The driver must rest for the remainder of today first. We use the stop time to calculate how much of today is left, then roll the window forward to see if that's enough — or if a 34-hour restart is required.
                  </>
                }
                testid="hos-stoptime-help"
              />
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Stop time
                </label>
                <input
                  type="time"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-base font-bold rounded-lg border border-[#E2E8F0] outline-none focus:border-[#D4AF37] font-mono"
                  data-testid="hos-stoptime-input"
                />
                {stopTime && hoursLeftFromStopTime != null && (
                  <p className="mt-1.5 text-[11px] text-[#64748B]">
                    <strong>{fmt(hoursLeftFromStopTime)} hr</strong> remain in today's calendar day (until midnight).
                  </p>
                )}
                {!stopTime && (
                  <p className="mt-1.5 text-[11px] text-[#D4AF37] italic">
                    Enter stop time to calculate the rest requirement.
                  </p>
                )}
              </div>

              {oosSim && !oosSim.needsInput && (
                <div className="border-t border-[#F1F5F9] pt-3">
                  <button
                    onClick={() => setShowMath(!showMath)}
                    className="text-[11px] font-bold text-[#002855] hover:text-[#D4AF37] flex items-center gap-1"
                    data-testid="hos-toggle-math-btn"
                  >
                    {showMath ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showMath ? "Hide" : "Show"} the math
                  </button>

                  {showMath && (
                    <div className="mt-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-2" data-testid="hos-oos-sim">
                      <div className="text-[10px] font-black text-[#002855] uppercase tracking-wide">Recovery Logic</div>
                      <ol className="space-y-2 text-[11px] text-[#475569] leading-relaxed">
                        {oosSim.steps.map((s) => (
                          <li key={s.stepNum} className="flex gap-2" data-testid={`hos-oos-step-${s.stepNum}`}>
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${s.passes ? "bg-[#16A34A] text-white" : "bg-[#CBD5E1] text-[#475569]"}`}>
                              {s.stepNum}
                            </span>
                            <div className="flex-1">
                              <div>{s.description}</div>
                              <div className="mt-0.5 text-[10px]">
                                <span className="text-[#64748B]">Cumulative OOS:</span>{" "}
                                <strong className="text-[#002855]">{fmt(s.oosHours)} hr</strong>
                                <span className="mx-1 text-[#CBD5E1]">·</span>
                                <span className="text-[#64748B]">New total:</span>{" "}
                                <strong className={s.passes ? "text-[#16A34A]" : "text-[#DC2626]"}>
                                  {fmt(s.runningTotal)} hr {s.passes ? "✓ under limit" : "— still over"}
                                </strong>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* PDF PREVIEW */}
      <PDFPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        title="Hours of Service Recap"
        filename={`hos-recap-${new Date().toISOString().slice(0, 10)}`}
      >
        <HosReportContent snapshot={snapshot} />
      </PDFPreview>

      {/* SAVE MODAL */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden" data-testid="save-modal">
          <div className="bg-[#002855] px-4 py-3">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Save to Inspection</h3>
            <p className="text-[10px] text-white/50">Attach HOS recap ({ruleType === "passenger" ? "60 hr / 7 day" : "70 hr / 8 day"})</p>
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
    </div>
  );
}
