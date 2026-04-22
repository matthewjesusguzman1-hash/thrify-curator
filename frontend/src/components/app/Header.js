import { useState, useEffect, useCallback, useMemo } from "react";
import { Upload, ExternalLink, Smartphone, GraduationCap, Globe, ClipboardList, Calculator, Camera, FileText, Briefcase, ChevronDown, ChevronRight, LogOut, Shield, KeyRound, MessageSquarePlus, Scale, Hourglass, Settings2, ChevronLeft, HardDrive } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { NotesPanel } from "./NotesPanel";
import { StorageInfoDialog } from "./StorageInfoDialog";
import { requestPersistentStorage, shouldNudgeExport, daysSinceLastExport } from "../../lib/storageManager";
import { useLiteMode } from "./LiteModeContext";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

const CVSA_LINKS = [
  {
    label: "OOS App (iOS)",
    url: "https://apps.apple.com/us/app/cvsa-out-of-service-criteria/id1424204784",
    description: "Download for iPhone/iPad",
    icon: Smartphone,
  },
  {
    label: "OOS App (Android)",
    url: "https://play.google.com/store/apps/details?id=com.cvsa&hl=en_US",
    description: "Download for Android",
    icon: Smartphone,
  },
  {
    label: "Operational Policies",
    url: "https://www.cvsa.org/wp-content/uploads/Roadside-Inspection-Operational-Policies.pdf",
    description: "Roadside inspection policies (PDF)",
    icon: Globe,
  },
  {
    label: "Inspection Bulletins",
    url: "https://cvsa.org/inspections/inspection-bulletins/",
    description: "Current CVSA bulletins",
    icon: Globe,
  },
  {
    label: "CVSA Training",
    url: "https://cvsa.org",
    description: "Training & resources",
    icon: GraduationCap,
  },
  {
    label: "NSP Truck Guide",
    url: "https://statepatrol.nebraska.gov/sites/default/files/2025-2026-Truck-Guide.pdf",
    description: "NE State Patrol 2025-2026",
    icon: Smartphone,
  },
  {
    label: "FMCSA Portal",
    url: "https://portal.fmcsa.gov",
    description: "State user portal",
    icon: Globe,
  },
];

const FLOWCHARTS = [
  {
    label: "Is a USDOT Number Required?",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/ysauzg1k_cvsa_daaf1c2cc0cecc39aeb7decb7f74a0eb.pdf",
    description: "CVSA decision tree",
    icon: FileText,
  },
  {
    label: "Finding Responsible Carrier & USDOT Number",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/x5ejnwu7_How_To_Find_The_Responsible_Carrier_and_Correct_USDOT_Number_508CLN.pdf",
    description: "FMCSA carrier identification guide",
    icon: FileText,
  },
  {
    label: "Determining Class of CDL Required",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/su07qof5_cvsa_05b838b9b6a2166cfaf418d5f97c34e2.pdf",
    description: "CVSA CDL class flowchart",
    icon: FileText,
  },
  {
    label: "Post-Accident DA Testing Requirements",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/g1p8yd97_Flowchart_Post-Accident_DA_Testing_Requirements.pdf",
    description: "FMCSA post-accident testing flowchart",
    icon: FileText,
  },
  {
    label: "Windshield Damage Reference",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/y6quiga3_IMG_1553.jpeg",
    description: "Acceptable vs unacceptable damage zones",
    icon: FileText,
  },
  {
    label: "Agricultural Operations",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/mnzrncpv_visorcard.pdf",
    description: "Quick reference visor card (PDF)",
    icon: FileText,
  },
];

const JOB_AIDS = [
  {
    label: "CVSA Decals Reference",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/nu3n21lh_IMG_1552.jpeg",
    description: "Quarter by color, month by corner",
  },
  {
    label: "ABS Inspection Procedure",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/skwbdvl9_IMG_1550.jpeg",
    description: "Antilock Brake System field reference",
  },
  {
    label: "HOS / RODS Inspection Flowchart",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/zbhlfbts_IMG_1542.jpeg",
    description: "All records of duty status",
  },
  {
    label: "Ag Exemptions Job Aid",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/qd97fk82_IMG_1543.jpeg",
    description: "Interstate FMCSR agricultural flowchart",
  },
];

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Nav buttons are data-driven so users can pick which ones appear in the header.
// `style`: "primary" = gold pill, "outline" = ghost bordered. `kind`: button | resources.
// `liteAllowed`: true means this button is kept when Inspection Navigator Lite is on.
const NAV_BUTTONS = [
  { id: "level3", label: "Level 3", short: "3", icon: null, path: "/level3", style: "primary", testid: "level3-nav-btn", liteAllowed: true },
  { id: "tiedown", label: "Tie-Down Calc", icon: Calculator, path: "/calculator", style: "primary", testid: "calculator-nav-btn" },
  { id: "bridge", label: "Bridge", icon: Scale, path: "/bridge-chart", style: "primary", testid: "bridge-chart-nav-btn" },
  { id: "hos", label: "HOS", icon: Hourglass, path: "/hours-of-service", style: "primary", testid: "hos-nav-btn", liteAllowed: true },
  { id: "hazmat", label: "HazMat", short: "HM", icon: null, path: "/hazmat-worksheet", style: "primary", testid: "hazmat-nav-btn" },
  { id: "photo", label: "Photos", icon: Camera, path: "/quick-photos", style: "outline", testid: "photo-annotator-nav-btn", liteAllowed: true },
  { id: "inspections", label: "Inspections", icon: ClipboardList, path: "/inspections", style: "outline", testid: "inspections-nav-btn", liteAllowed: true },
  { id: "resources", label: "Resources", icon: null, kind: "resources", style: "gold-outline", testid: "cvsa-btn", liteAllowed: true },
];

const DEFAULT_ENABLED = NAV_BUTTONS.map((b) => b.id);
const prefsKey = (badge) => `inspnav_headerButtons_${badge || "anon"}`;

function loadEnabled(badge) {
  try {
    const raw = localStorage.getItem(prefsKey(badge));
    if (!raw) return DEFAULT_ENABLED;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_ENABLED;
    return arr.filter((id) => NAV_BUTTONS.some((b) => b.id === id));
  } catch { return DEFAULT_ENABLED; }
}
function saveEnabled(badge, ids) {
  try { localStorage.setItem(prefsKey(badge), JSON.stringify(ids)); } catch {}
}

function CustomizeButtons({ badge, enabled, onChange, onBack }) {
  const toggle = (id) => {
    const next = enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id];
    onChange(next);
  };
  const resetDefaults = () => onChange(DEFAULT_ENABLED);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <button onClick={onBack} className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#002855]" data-testid="customize-back">
          <ChevronLeft className="w-3 h-3" /> Back
        </button>
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Header Buttons</p>
      </div>
      <div className="max-h-[260px] overflow-y-auto space-y-0.5 -mx-1 px-1">
        {NAV_BUTTONS.map((b) => {
          const isOn = enabled.includes(b.id);
          return (
            <label
              key={b.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F1F5F9] cursor-pointer"
              data-testid={`customize-toggle-${b.id}`}
            >
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => toggle(b.id)}
                className="w-3.5 h-3.5 accent-[#D4AF37]"
              />
              <span className="text-xs text-[#334155] flex-1">{b.label}</span>
              {isOn && <span className="text-[9px] text-[#16A34A] font-bold">ON</span>}
            </label>
          );
        })}
      </div>
      <div className="flex gap-1.5 pt-1 border-t border-[#E2E8F0]">
        <button onClick={resetDefaults} className="flex-1 px-2 py-1.5 text-[10px] rounded-md bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]" data-testid="customize-reset">Reset</button>
        <button onClick={onBack} className="flex-1 px-2 py-1.5 text-[10px] rounded-md bg-[#D4AF37] text-[#002855] font-bold hover:bg-[#c9a432]" data-testid="customize-done">Done</button>
      </div>
    </div>
  );
}

function ChangePinPopover({ badge, navigate, logout, enabledButtons, setEnabledButtons, openStorageInfo, liteMode, setLiteMode }) {
  const [mode, setMode] = useState("menu"); // menu | change | customize
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePin = async () => {
    if (currentPin.length < 4) { setError("Enter current PIN"); return; }
    if (newPin.length < 4) { setError("New PIN must be 4+ digits"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/change-pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge, current_pin: currentPin, new_pin: newPin }),
      });
      if (res.ok) {
        setMode("menu");
        setCurrentPin("");
        setNewPin("");
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to change PIN");
      }
    } catch { setError("Connection error"); }
    setSaving(false);
  };

  if (mode === "change") {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider px-1">Change PIN</p>
        <input
          type="password"
          inputMode="numeric"
          value={currentPin}
          onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
          placeholder="Current PIN"
          autoFocus
          className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:ring-1 focus:ring-[#002855] outline-none text-center font-mono tracking-widest"
          data-testid="current-pin-input"
        />
        <input
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleChangePin()}
          placeholder="New PIN"
          className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:ring-1 focus:ring-[#002855] outline-none text-center font-mono tracking-widest"
          data-testid="new-pin-input"
        />
        {error && <p className="text-[10px] text-[#EF4444] text-center" data-testid="change-pin-error">{error}</p>}
        <div className="flex gap-1.5">
          <button onClick={() => { setMode("menu"); setError(""); setCurrentPin(""); setNewPin(""); }} className="flex-1 px-2 py-1.5 text-[10px] rounded-md bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]">Cancel</button>
          <button onClick={handleChangePin} disabled={saving} className="flex-1 px-2 py-1.5 text-[10px] rounded-md bg-[#D4AF37] text-[#002855] font-bold hover:bg-[#c9a432] disabled:opacity-50" data-testid="save-pin-btn">{saving ? "..." : "Save"}</button>
        </div>
      </div>
    );
  }

  if (mode === "customize") {
    return (
      <CustomizeButtons
        badge={badge}
        enabled={enabledButtons}
        onChange={setEnabledButtons}
        onBack={() => setMode("menu")}
      />
    );
  }

  return (
    <>
      <p className="text-[10px] text-[#94A3B8] px-2 pb-1">Badge #{badge}</p>

      {/* Inspection Navigator Lite — inspector-level simplification toggle */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-[#F1F5F9] cursor-pointer" onClick={() => setLiteMode(!liteMode)} data-testid="lite-mode-toggle">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#334155] leading-tight">Inspection Navigator Lite</p>
            <p className="text-[10px] text-[#64748B] leading-tight">Level III only · simplified view</p>
          </div>
        </div>
        <div
          className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${liteMode ? "bg-[#D4AF37]" : "bg-[#CBD5E1]"}`}
          role="switch"
          aria-checked={liteMode}
        >
          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${liteMode ? "left-4" : "left-0.5"}`} />
        </div>
      </div>
      <div className="h-px bg-[#E2E8F0] my-1" />

      <button
        onClick={() => setMode("customize")}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[#F1F5F9] text-xs text-[#334155] transition-colors"
        data-testid="customize-header-link"
      >
        <Settings2 className="w-3.5 h-3.5 text-[#64748B]" />
        Customize Header
      </button>
      <button
        onClick={openStorageInfo}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[#F1F5F9] text-xs text-[#334155] transition-colors"
        data-testid="about-storage-link"
      >
        <HardDrive className="w-3.5 h-3.5 text-[#64748B]" />
        About Photo Storage
      </button>
      <button
        onClick={() => setMode("change")}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[#F1F5F9] text-xs text-[#334155] transition-colors"
        data-testid="change-pin-link"
      >
        <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
        Change PIN
      </button>
      {badge === "121" && (
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[#F1F5F9] text-xs text-[#334155] transition-colors"
          data-testid="admin-link"
        >
          <Shield className="w-3.5 h-3.5 text-[#64748B]" />
          Admin Panel
        </button>
      )}
      <button
        onClick={logout}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-[#FEE2E2] text-xs text-[#DC2626] transition-colors"
        data-testid="logout-btn"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign Out
      </button>
    </>
  );
}


export function Header({ onUploadClick, stats }) {
  const navigate = useNavigate();
  const { badge, logout } = useAuth();
  const { liteMode, setLiteMode } = useLiteMode();
  const [openSections, setOpenSections] = useState({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [enabledButtons, setEnabledButtonsState] = useState(() => loadEnabled(badge));
  const [storageInfoOpen, setStorageInfoOpen] = useState(false);
  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Silently request persistent storage once per badge. No prompt if already granted.
  useEffect(() => {
    if (!badge) return;
    (async () => {
      try { await requestPersistentStorage(); } catch { /* ignore */ }
    })();
  }, [badge]);

  // Gentle reminder to export inspections after every EXPORT_NUDGE_INTERVAL_DAYS
  // of no exports. Only shows once per session per badge.
  useEffect(() => {
    if (!badge) return;
    const sessKey = `inspnav_exportNudgeShown_${badge}`;
    if (sessionStorage.getItem(sessKey)) return;
    if (!shouldNudgeExport()) return;
    const days = daysSinceLastExport();
    const msg = days === null
      ? "Reminder: export/share your inspection reports to keep a permanent copy."
      : `It's been ${days} days since you last exported. Share your inspections to keep a permanent copy.`;
    // Fire after a short delay so it doesn't collide with login.
    const t = setTimeout(() => {
      toast.message("Retention reminder", {
        description: msg,
        action: { label: "Learn more", onClick: () => setStorageInfoOpen(true) },
        duration: 8000,
      });
      sessionStorage.setItem(sessKey, "1");
    }, 2500);
    return () => clearTimeout(t);
  }, [badge]);

  // Reload prefs whenever badge changes (e.g., re-login).
  useEffect(() => { setEnabledButtonsState(loadEnabled(badge)); }, [badge]);
  const setEnabledButtons = useCallback((ids) => {
    setEnabledButtonsState(ids);
    saveEnabled(badge, ids);
  }, [badge]);

  const visibleButtons = useMemo(
    () => {
      const base = NAV_BUTTONS.filter((b) => enabledButtons.includes(b.id));
      return liteMode ? base.filter((b) => b.liteAllowed) : base;
    },
    [enabledButtons, liteMode]
  );

  const lastSeenKey = `inspnav_notes_lastSeen_${badge || "anon"}`;

  // Poll latest note timestamp so the button can badge when a new note drops.
  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notes`);
      if (!res.ok) return;
      const data = await res.json();
      const notes = data.notes || [];
      if (notes.length === 0) { setUnreadCount(0); return; }
      const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || "0");
      // Notes are sorted desc by created_at; count how many are newer than lastSeen
      // and not authored by the current badge.
      const unread = notes.filter(n => {
        const t = Date.parse(n.created_at || "");
        return t && t > lastSeen && n.badge !== badge;
      }).length;
      setUnreadCount(unread);
    } catch {}
  }, [badge, lastSeenKey]);

  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const openNotes = () => {
    setNotesOpen(true);
    // Mark all as read the moment the panel opens.
    try { localStorage.setItem(lastSeenKey, String(Date.now())); } catch {}
    setUnreadCount(0);
  };

  const renderNavButton = (b) => {
    if (b.kind === "resources") {
      return (
        <Popover key={b.id}>
          <PopoverTrigger asChild>
            <Button
              data-testid={b.testid}
              variant="outline"
              size="sm"
              className="border-[#D4AF37]/40 text-[#D4AF37] bg-transparent hover:bg-[#D4AF37] hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs font-bold flex-shrink-0"
            >
              Resources
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[280px] p-2 max-h-[480px] overflow-y-auto"
            align="end"
            data-testid="cvsa-popover"
          >
            {/* CVSA Resources — collapsible */}
            <button onClick={() => toggle("cvsa")} className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-[#F8FAFC] transition-colors">
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8]">CVSA Resources</p>
              {openSections.cvsa ? <ChevronDown className="w-3 h-3 text-[#94A3B8]" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
            </button>
            {openSections.cvsa && (
              <div className="space-y-0.5 mb-1">
                {CVSA_LINKS.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#F1F5F9] transition-colors group"
                    data-testid={`cvsa-link-${link.label.replace(/\s/g, '-').toLowerCase()}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#002855]/10 flex-shrink-0">
                      <link.icon className="w-4 h-4 text-[#002855]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                        {link.label}
                        <ExternalLink className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-[#002855]" />
                      </p>
                      <p className="text-[10px] text-[#64748B]">{link.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Flowcharts — collapsible */}
            <div className="border-t border-[#E2E8F0] mt-1 pt-1">
              <button onClick={() => toggle("flowcharts")} className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-[#F8FAFC] transition-colors">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8]">Flowcharts / Visor Cards</p>
                {openSections.flowcharts ? <ChevronDown className="w-3 h-3 text-[#94A3B8]" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
              </button>
              {openSections.flowcharts && (
                <div className="space-y-0.5 mb-1">
                  {FLOWCHARTS.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#F1F5F9] transition-colors group"
                      data-testid={`flowchart-${link.label.replace(/[\s/()]/g, '-').toLowerCase()}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#D4AF37]/10 flex-shrink-0">
                        <link.icon className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                          {link.label}
                          <ExternalLink className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-[#002855]" />
                        </p>
                        <p className="text-[10px] text-[#64748B]">{link.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Job Aids — collapsible */}
            <div className="border-t border-[#E2E8F0] mt-1 pt-1">
              <button onClick={() => toggle("jobaids")} className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-[#F8FAFC] transition-colors">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8]">Job Aids</p>
                {openSections.jobaids ? <ChevronDown className="w-3 h-3 text-[#94A3B8]" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8]" />}
              </button>
              {openSections.jobaids && (
                <div className="space-y-0.5 mb-1">
                  {JOB_AIDS.map((aid) => (
                    <a
                      key={aid.url}
                      href={aid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#F1F5F9] transition-colors group"
                      data-testid={`job-aid-${aid.label.replace(/[\s/()]/g, '-').toLowerCase()}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#16A34A]/10 flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-[#16A34A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                          {aid.label}
                          <ExternalLink className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-[#002855]" />
                        </p>
                        <p className="text-[10px] text-[#64748B]">{aid.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    const Icon = b.icon;
    if (b.style === "primary") {
      return (
        <Button
          key={b.id}
          data-testid={b.testid}
          size="sm"
          onClick={() => navigate(b.path)}
          className="bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432] transition-colors h-8 px-3 sm:px-4 text-xs font-bold shadow-sm flex-shrink-0"
        >
          {b.short ? <span className="text-[11px] font-black sm:mr-1">{b.short}</span> : null}
          {Icon ? <Icon className="w-3.5 h-3.5 sm:mr-1.5" /> : null}
          <span className={b.short ? "hidden sm:inline" : "hidden sm:inline"}>{b.label}</span>
        </Button>
      );
    }
    // outline
    return (
      <Button
        key={b.id}
        data-testid={b.testid}
        variant="outline"
        size="sm"
        onClick={() => navigate(b.path)}
        className="border-white/30 text-white bg-transparent hover:bg-white hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs flex-shrink-0"
      >
        {Icon ? <Icon className="w-3.5 h-3.5 sm:mr-1.5" /> : null}
        <span className="hidden sm:inline">{b.label}</span>
      </Button>
    );
  };

  return (
    <>
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]"
    >
      {/* Top row: app title + badge */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-2 sm:pt-3 pb-1 flex items-center justify-between">
        <h1
          data-testid="app-title"
          className="text-[11px] sm:text-sm font-semibold tracking-tight text-white/70 leading-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Inspection Navigator
          <span className="text-[10px] sm:text-xs text-[#8FAEC5] font-normal ml-2 hidden sm:inline">
            FMCSA Violations Database
          </span>
        </h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openNotes}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${unreadCount > 0 ? "bg-[#D4AF37] hover:bg-[#E0C14F] shadow-[0_0_0_2px_rgba(212,175,55,0.35)] animate-pulse" : "bg-white/10 hover:bg-white/15"}`}
            data-testid="notes-btn"
            aria-label={unreadCount > 0 ? `${unreadCount} new note${unreadCount > 1 ? "s" : ""}` : "Notes"}
          >
            <MessageSquarePlus className={`w-4 h-4 ${unreadCount > 0 ? "text-[#002855]" : "text-[#8FAEC5]"}`} />
            <span className={`text-xs font-medium ${unreadCount > 0 ? "text-[#002855] font-bold" : "text-[#8FAEC5]"}`}>Test Notes</span>
            {unreadCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-black flex items-center justify-center" data-testid="notes-unread-count">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${liteMode ? "bg-[#D4AF37]/20 ring-1 ring-[#D4AF37]/60" : "bg-white/10 hover:bg-white/15"}`} data-testid="badge-display">
                <Shield className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-[11px] font-bold text-[#D4AF37] tracking-wider">{badge}</span>
                {liteMode && <span className="text-[8px] font-black tracking-widest text-[#D4AF37] bg-[#002855] rounded px-1 py-px" data-testid="lite-badge">LITE</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-2" align="end">
              <ChangePinPopover
                badge={badge}
                navigate={navigate}
                logout={logout}
                enabledButtons={enabledButtons}
                setEnabledButtons={setEnabledButtons}
                openStorageInfo={() => setStorageInfoOpen(true)}
                liteMode={liteMode}
                setLiteMode={setLiteMode}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bottom row: nav buttons (user-customizable) */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          {visibleButtons.length === 0 ? (
            <span className="text-[11px] text-white/40 italic px-2">
              No buttons — tap your badge → Customize Header
            </span>
          ) : (
            visibleButtons.map(renderNavButton)
          )}
        </div>

        {stats && (
          <div className="hidden md:flex items-center gap-4 text-xs text-[#8FAEC5] flex-shrink-0 ml-3">
            <span data-testid="stat-total">
              <strong className="text-[#D4AF37]">{stats.total?.toLocaleString()}</strong> violations
            </span>
            <span className="w-px h-4 bg-white/20" />
            <span data-testid="stat-oos">
              <strong className="text-[#EF4444]">{stats.oos_count?.toLocaleString()}</strong> OOS
            </span>
          </div>
        )}
      </div>

      <div className="gold-accent h-[2px]" />
    </header>
    <NotesPanel open={notesOpen} onClose={() => { setNotesOpen(false); refreshUnread(); }} />
    <StorageInfoDialog open={storageInfoOpen} onOpenChange={setStorageInfoOpen} />
    </>
  );
}
