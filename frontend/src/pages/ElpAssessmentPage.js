import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, ChevronRight, Eye, Share2, Save,
  CheckCircle2, XCircle, AlertTriangle, Languages, Info,
  RotateCcw, Maximize2, Minimize2, ShieldAlert,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Toaster, toast } from "sonner";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { PDFPreview } from "../components/app/PDFPreview";
import { useAuth } from "../components/app/AuthContext";
import { generatePDFBlob, sharePDFBlob } from "../lib/pdfShare";
import {
  ELP_INTERVIEW_QUESTIONS, ELP_SIGNS, ELP_CITATION,
  ELP_PASS_THRESHOLD_NOTE, ELP_REQUIRED_SIGNS, ELP_SIGN_PASS_THRESHOLD,
  ELP_INSTRUCTIONS,
} from "../lib/elpContent";
import { SignDisplay } from "../components/elp/SignDisplay";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ElpAssessmentPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();

  // Optional company / USDOT context (no driver PII per agency guidance).
  const [companyName, setCompanyName] = useState("");
  const [usdotNumber, setUsdotNumber] = useState("");
  const [showHmQuestions, setShowHmQuestions] = useState(false);

  // Phase: 'interview' → 'sign-select' → 'signs' → 'summary'
  const [phase, setPhase] = useState("interview");

  // Interview: per-question optional notes + overall inspector judgment.
  const [interviewAsked, setInterviewAsked] = useState({});      // key -> bool (was the question asked?)
  const [interviewNotes, setInterviewNotes] = useState({});      // key -> string
  const [interviewDisposition, setInterviewDisposition] = useState(""); // "pass" | "inconclusive" | "fail"

  // Sign test
  const [selectedSignIds, setSelectedSignIds] = useState([]);    // exactly 4
  const [signRunIdx, setSignRunIdx] = useState(0);                // index inside selectedSignIds
  const [signResults, setSignResults] = useState({});             // sign_id -> "pass" | "fail"
  const [signNotes, setSignNotes] = useState({});                 // sign_id -> string
  const [showingToDriver, setShowingToDriver] = useState(false);  // fullscreen mode

  // Final disposition + notes
  const [overallDisposition, setOverallDisposition] = useState("");
  const [inspectorNotes, setInspectorNotes] = useState("");

  // Report dialog state
  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const hiddenReportRef = useRef(null);

  // Visible questions: HM block toggled by inspector.
  const visibleQuestions = useMemo(
    () => ELP_INTERVIEW_QUESTIONS.filter((q) => !q.hm || showHmQuestions),
    [showHmQuestions]
  );

  const interviewAdministered = interviewDisposition !== "";
  const signsAdministered = selectedSignIds.length === ELP_REQUIRED_SIGNS &&
    selectedSignIds.every((id) => signResults[id]);
  const passCount = selectedSignIds.filter((id) => signResults[id] === "pass").length;
  const failCount = selectedSignIds.filter((id) => signResults[id] === "fail").length;
  const signTestResult = signsAdministered
    ? (passCount >= ELP_SIGN_PASS_THRESHOLD ? "sufficient" : "insufficient")
    : "";

  const hasData = interviewAdministered || selectedSignIds.length > 0;

  /* ── Reset ── */
  const resetAll = () => {
    setCompanyName(""); setUsdotNumber(""); setShowHmQuestions(false);
    setInterviewAsked({}); setInterviewNotes({}); setInterviewDisposition("");
    setSelectedSignIds([]); setSignRunIdx(0); setSignResults({}); setSignNotes({});
    setShowingToDriver(false);
    setOverallDisposition(""); setInspectorNotes("");
    setPhase("interview");
  };

  /* ── Sign selection toggle (cap at 4) ── */
  const toggleSignSelect = (id) => {
    setSelectedSignIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= ELP_REQUIRED_SIGNS) {
        toast.error(`Pick exactly ${ELP_REQUIRED_SIGNS} signs`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const startSignRun = () => {
    if (selectedSignIds.length !== ELP_REQUIRED_SIGNS) {
      toast.error(`Select ${ELP_REQUIRED_SIGNS} signs first`);
      return;
    }
    setSignRunIdx(0);
    setShowingToDriver(false);
    setPhase("signs");
  };

  /* ── Auto-suggest a final disposition ── */
  const suggestedDisposition = useMemo(() => {
    if (!interviewAdministered && !signsAdministered) return "";
    const interviewBad = interviewDisposition === "fail" || interviewDisposition === "inconclusive";
    const signsBad = signsAdministered && signTestResult === "insufficient";
    if (interviewBad && (!signsAdministered || signsBad)) return "not_proficient";
    if (interviewDisposition === "pass" && !signsAdministered) return "proficient";
    if (signsAdministered && signTestResult === "sufficient" && interviewDisposition !== "fail") return "proficient";
    return "";
  }, [interviewAdministered, interviewDisposition, signsAdministered, signTestResult]);

  /* ── Share / save ── */
  const handleShare = useCallback(async () => {
    if (!hiddenReportRef.current) { toast.error("Report not ready"); return; }
    setSharing(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      const blob = await generatePDFBlob(hiddenReportRef.current);
      await sharePDFBlob(blob, `elp-assessment-${new Date().toISOString().slice(0, 10)}.pdf`, {
        title: "ELP Assessment Report",
        text: `English Language Proficiency Assessment · ${overallDisposition || "in-progress"}`,
      });
    } catch (e) {
      console.error("Share failed", e);
      toast.error("Could not generate the report. Try Preview.");
    } finally { setSharing(false); }
  }, [overallDisposition]);

  const fetchInspections = async () => {
    setLoadingInspections(true);
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch { toast.error("Failed to load inspections"); }
    finally { setLoadingInspections(false); }
  };
  const openSaveModal = () => { fetchInspections(); setShowSaveModal(true); };

  const buildPayload = () => ({
    company_name: companyName,
    usdot_number: usdotNumber,
    interview_administered: interviewAdministered,
    interview_disposition: interviewDisposition,
    interview_answers: visibleQuestions
      .filter((q) => interviewAsked[q.key] || interviewNotes[q.key])
      .map((q) => ({
        key: q.key,
        question: q.text,
        asked: !!interviewAsked[q.key],
        notes: interviewNotes[q.key] || "",
      })),
    signs_administered: signsAdministered,
    sign_test_result: signTestResult,
    sign_pass_count: passCount,
    sign_fail_count: failCount,
    sign_answers: selectedSignIds
      .map((id) => ELP_SIGNS.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => ({
        sign_id: s.id,
        text: s.text.replace(/\n/g, " "),
        meaning: s.meaning,
        result: signResults[s.id] || "",
        notes: signNotes[s.id] || "",
      })),
    overall_disposition: overallDisposition,
    citation_ref: overallDisposition === "not_proficient" ? ELP_CITATION.ref : "",
    inspector_notes: inspectorNotes,
  });

  const saveToInspection = async (inspId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/inspections/${inspId}/elp`, buildPayload());
      toast.success("Saved to inspection");
      setShowSaveModal(false);
      navigate(`/inspections/${inspId}`);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const createAndSave = async () => {
    const title = newInspTitle.trim() || `ELP ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/inspections`, { title, badge });
      await axios.post(`${API}/inspections/${res.data.id}/elp`, buildPayload());
      toast.success("Saved to new inspection");
      setShowSaveModal(false);
      setNewInspTitle("");
      navigate(`/inspections/${res.data.id}`);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  /* ──────────────── Show-to-driver fullscreen mode ──────────────── */
  // Saved scroll position so the page returns to where the inspector was
  // when exiting fullscreen. The fullscreen view is rendered as a sibling
  // overlay (not an early return) so the main page stays mounted underneath
  // and the browser preserves scrollY automatically. We additionally lock
  // body scroll while fullscreen is active so the saved position can't drift.
  useEffect(() => {
    if (showingToDriver) {
      const y = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      return () => {
        const restored = -parseInt(document.body.style.top || "0", 10) || 0;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        window.scrollTo(0, restored);
      };
    }
  }, [showingToDriver]);
  // ESC exits fullscreen.
  useEffect(() => {
    if (!showingToDriver) return;
    const onKey = (e) => { if (e.key === "Escape") setShowingToDriver(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showingToDriver]);

  /* ──────────────── RENDER ──────────────── */
  const currentSign = phase === "signs" && selectedSignIds.length
    ? ELP_SIGNS.find((s) => s.id === selectedSignIds[signRunIdx])
    : null;
  const driverSign = showingToDriver
    ? ELP_SIGNS.find((s) => s.id === selectedSignIds[signRunIdx])
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Toaster richColors position="top-center" />

      {/* Header bar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[800px] mx-auto px-3 sm:px-6 h-[45px] flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-[#002855] flex items-center gap-1 text-sm font-bold" data-testid="elp-back-btn">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 ml-2">
            <Languages className="w-4 h-4 text-[#D4AF37]" />
            <h1 className="text-sm font-bold text-[#002855]">English Language Proficiency · Roadside Assessment</h1>
          </div>
          <button onClick={resetAll} className="ml-auto text-[10px] text-[#64748B] hover:text-[#002855] flex items-center gap-1 font-bold" data-testid="elp-reset-btn">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      {/* Floating action bar */}
      {hasData && (
        <div className="sticky top-[45px] z-40 bg-white/95 backdrop-blur border-b shadow-sm">
          <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
            <Button size="sm" onClick={() => setShowPreview(true)} className="bg-[#002855] text-white hover:bg-[#001a3a] h-9 text-xs font-bold flex-1" data-testid="elp-preview-btn">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
            </Button>
            <Button size="sm" onClick={handleShare} disabled={sharing} variant="outline" className="border-[#D4AF37] text-[#002855] hover:bg-[#D4AF37]/10 h-9 text-xs font-bold flex-1" data-testid="elp-share-btn">
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> {sharing ? "Preparing…" : "Share"}
            </Button>
            <Button size="sm" onClick={openSaveModal} variant="outline" className="border-[#002855]/20 text-[#002855] hover:bg-[#002855]/5 h-9 text-xs font-bold flex-1" data-testid="elp-save-btn">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save
            </Button>
          </div>
        </div>
      )}

      <main className="max-w-[800px] mx-auto px-3 sm:px-6 py-4 pb-24 space-y-4">

        {/* Reference / regulation block */}
        <div className="rounded-xl border-l-[3px] border-[#3B82F6] bg-[#EEF6FF] p-3" data-testid="elp-reference">
          <div className="flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#1D4ED8]">Reference · {ELP_CITATION.ref}</p>
          </div>
          <p className="text-[12px] text-[#1E3A8A] leading-relaxed font-bold mb-1">{ELP_CITATION.title}</p>
          <p className="text-[11.5px] text-[#1E3A8A] leading-relaxed">{ELP_CITATION.summary}</p>
        </div>

        {/* Optional context — NO driver PII */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-[#002855] text-white px-3 py-2 flex items-center gap-2">
            <p className="text-[12px] font-bold">Optional Context</p>
            <span className="ml-auto text-[10px] text-white/70">Both fields optional</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Company name</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Optional" className="h-8 text-[12px]" data-testid="elp-company-name" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">USDOT #</label>
                <Input value={usdotNumber} onChange={(e) => setUsdotNumber(e.target.value)} placeholder="Optional" className="h-8 text-[12px]" data-testid="elp-usdot" />
              </div>
            </div>
            <p className="text-[10px] text-[#64748B] italic leading-relaxed">No driver name or CDL # is recorded on this assessment to avoid evidentiary issues with sensitive personal information.</p>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="grid grid-cols-4 gap-1 bg-white rounded-xl border p-1" data-testid="elp-phase-tabs">
          <PhaseTab label="Interview" active={phase === "interview"} onClick={() => setPhase("interview")} testid="elp-tab-interview" />
          <PhaseTab label={`Pick ${ELP_REQUIRED_SIGNS} Signs`} active={phase === "sign-select"} onClick={() => setPhase("sign-select")} testid="elp-tab-pick" />
          <PhaseTab label="Run Signs" active={phase === "signs"} onClick={() => selectedSignIds.length === ELP_REQUIRED_SIGNS && setPhase("signs")} disabled={selectedSignIds.length !== ELP_REQUIRED_SIGNS} testid="elp-tab-signs" />
          <PhaseTab label="Disposition" active={phase === "summary"} onClick={() => setPhase("summary")} testid="elp-tab-summary" />
        </div>

        {/* PHASE: INTERVIEW */}
        {phase === "interview" && (
          <section className="space-y-2" data-testid="elp-phase-interview">
            <div className="rounded-md bg-[#F8FAFC] border-l-[3px] border-[#94A3B8] p-2.5">
              <p className="text-[10.5px] text-[#475569] leading-relaxed">{ELP_INSTRUCTIONS}</p>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-[#002855] text-white px-3 py-2 flex items-center gap-2">
                <p className="text-[12px] font-bold">Test 1 — Driver Interview</p>
                <span className="ml-auto text-[10px] text-white/70">Attachment A</span>
              </div>
              <div className="divide-y">
                {visibleQuestions.filter((q) => !q.hm).map((q) => (
                  <InterviewRow
                    key={q.key}
                    q={q}
                    asked={!!interviewAsked[q.key]}
                    note={interviewNotes[q.key] || ""}
                    onToggleAsked={(v) => setInterviewAsked((a) => ({ ...a, [q.key]: v }))}
                    onNote={(v) => setInterviewNotes((a) => ({ ...a, [q.key]: v }))}
                  />
                ))}
              </div>
              {/* HM toggle */}
              <div className="border-t bg-[#FFFBEB] px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#92400E]">Hazardous Material Questions (If applicable)</p>
                  <p className="text-[10px] text-[#92400E]">Show 2 additional HM-specific questions when the driver is hauling hazmat.</p>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#92400E]">
                  <input type="checkbox" checked={showHmQuestions} onChange={(e) => setShowHmQuestions(e.target.checked)} data-testid="elp-hm-toggle" />
                  Show HM Qs
                </label>
              </div>
              {showHmQuestions && (
                <div className="divide-y border-t">
                  {visibleQuestions.filter((q) => q.hm).map((q) => (
                    <InterviewRow
                      key={q.key}
                      q={q}
                      asked={!!interviewAsked[q.key]}
                      note={interviewNotes[q.key] || ""}
                      onToggleAsked={(v) => setInterviewAsked((a) => ({ ...a, [q.key]: v }))}
                      onNote={(v) => setInterviewNotes((a) => ({ ...a, [q.key]: v }))}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Inspector judgment */}
            <div className="bg-white rounded-xl border p-3" data-testid="elp-interview-judgment">
              <p className="text-[12px] font-bold text-[#002855] mb-1">Inspector’s Judgment</p>
              <p className="text-[10.5px] text-[#64748B] leading-relaxed mb-2">There is no required minimum number of questions. Use your judgment to decide whether the driver can sufficiently respond in English.</p>
              <div className="grid grid-cols-3 gap-2">
                <DispBtn label="Pass" desc="Driver responded sufficiently in English." active={interviewDisposition === "pass"} onClick={() => setInterviewDisposition("pass")} color="#10B981" testid="elp-interview-pass" />
                <DispBtn label="Inconclusive" desc="Need the sign test." active={interviewDisposition === "inconclusive"} onClick={() => setInterviewDisposition("inconclusive")} color="#F59E0B" testid="elp-interview-inconclusive" />
                <DispBtn label="Fail" desc="Did not respond sufficiently." active={interviewDisposition === "fail"} onClick={() => setInterviewDisposition("fail")} color="#DC2626" testid="elp-interview-fail" />
              </div>
            </div>

            {interviewAdministered && (
              <div className={`rounded-xl border p-3 ${interviewDisposition === "pass" ? "border-[#10B981] bg-[#F0FDF4]" : "border-[#F59E0B] bg-[#FFFBEB]"}`} data-testid="elp-interview-result">
                {interviewDisposition === "pass" ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <p className="text-[12px] font-bold text-[#065F46]">Interview marked PASS.</p>
                    </div>
                    <p className="text-[11px] text-[#065F46] leading-relaxed">You can record a final disposition now or still administer the sign test for additional documentation.</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button onClick={() => setPhase("sign-select")} variant="outline" className="border-[#94A3B8] h-9 text-[11px]" data-testid="elp-go-sign-pick-btn">
                        Optional sign test <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                      <Button onClick={() => setPhase("summary")} className="bg-[#10B981] text-white hover:bg-[#059669] h-9 text-[11px]" data-testid="elp-go-summary-btn">
                        Record disposition <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                      <p className="text-[12px] font-bold text-[#92400E]">Proficiency in question — administer the sign test.</p>
                    </div>
                    <p className="text-[11px] text-[#92400E] leading-relaxed">Continue to the highway sign recognition test. Pick {ELP_REQUIRED_SIGNS} signs and show each to the driver.</p>
                    <Button onClick={() => setPhase("sign-select")} className="w-full mt-2 bg-[#92400E] text-white hover:bg-[#7C2D12] h-9 text-[12px]" data-testid="elp-go-signs-btn">
                      Continue to Sign Selection <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* PHASE: SIGN SELECTION */}
        {phase === "sign-select" && (
          <section className="space-y-2" data-testid="elp-phase-sign-select">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-[#002855] text-white px-3 py-2 flex items-center gap-2">
                <p className="text-[12px] font-bold">Test 2 — Pick {ELP_REQUIRED_SIGNS} Highway Signs</p>
                <span className="ml-auto text-[10px] text-white/70">{selectedSignIds.length}/{ELP_REQUIRED_SIGNS} selected</span>
              </div>
              <div className="p-3">
                <p className="text-[11px] text-[#64748B] italic leading-relaxed mb-3">{ELP_PASS_THRESHOLD_NOTE}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-testid="elp-sign-grid">
                  {ELP_SIGNS.map((s) => {
                    const selected = selectedSignIds.includes(s.id);
                    const idx = selectedSignIds.indexOf(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSignSelect(s.id)}
                        className={`relative bg-[#0F172A] rounded-lg p-1.5 transition-all border-2 ${selected ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40" : "border-transparent hover:border-[#64748B]"}`}
                        data-testid={`elp-sign-pick-${s.id}`}
                      >
                        <div style={{ aspectRatio: "1 / 1" }}>
                          <SignDisplay sign={s} size={120} />
                        </div>
                        <p className="text-center text-white/70 text-[9px] mt-1 font-bold uppercase tracking-wider">#{s.id}</p>
                        {selected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#D4AF37] text-[#002855] flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Button
              onClick={startSignRun}
              disabled={selectedSignIds.length !== ELP_REQUIRED_SIGNS}
              className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-10 text-[12px] disabled:opacity-50"
              data-testid="elp-start-sign-run-btn"
            >
              {selectedSignIds.length === ELP_REQUIRED_SIGNS
                ? "Start Sign Test"
                : `Pick ${ELP_REQUIRED_SIGNS - selectedSignIds.length} more`}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </section>
        )}

        {/* PHASE: SIGN RUN */}
        {phase === "signs" && currentSign && (
          <section className="space-y-2" data-testid="elp-phase-signs">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-[#002855] text-white px-3 py-1.5 flex items-center gap-2">
                <p className="text-[12px] font-bold">Sign {signRunIdx + 1} of {ELP_REQUIRED_SIGNS}</p>
                <span className="ml-auto text-[10px] text-white/70 font-bold">Tap sign to show driver</span>
              </div>
              <div className="p-2.5 space-y-2">
                {/* Tap-to-show-driver inspector preview (clicking it opens fullscreen). */}
                <button
                  type="button"
                  onClick={() => setShowingToDriver(true)}
                  className="block w-full bg-[#0F172A] rounded-xl p-2 mx-auto relative group focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  style={{ maxWidth: 240 }}
                  data-testid="elp-show-to-driver-btn"
                  aria-label="Show this sign to the driver in fullscreen"
                >
                  <div style={{ aspectRatio: "1 / 1" }}>
                    <SignDisplay sign={currentSign} size={300} />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#D4AF37] text-[#002855] text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> SHOW DRIVER
                    </span>
                  </div>
                  <p className="text-center text-[#D4AF37] text-[9.5px] mt-1.5 font-black uppercase tracking-wider">Tap to show · Sign #{currentSign.id}</p>
                </button>

                {/* Reference (driver does not see) */}
                <div className="rounded-md bg-[#F8FAFC] border-l-[3px] border-[#3B82F6] px-2 py-1.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1D4ED8]">Inspector reference</p>
                  <p className="text-[12px] font-bold text-[#002855] leading-tight">{currentSign.meaning}</p>
                </div>

                {/* Pass / Fail */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setSignResults((r) => ({ ...r, [currentSign.id]: "pass" }))}
                    variant={signResults[currentSign.id] === "pass" ? "default" : "outline"}
                    className={`h-10 text-[12px] font-bold ${signResults[currentSign.id] === "pass" ? "bg-[#10B981] text-white hover:bg-[#059669]" : "border-[#10B981] text-[#065F46] hover:bg-[#F0FDF4]"}`}
                    data-testid="elp-sign-pass-btn"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Identified
                  </Button>
                  <Button
                    onClick={() => setSignResults((r) => ({ ...r, [currentSign.id]: "fail" }))}
                    variant={signResults[currentSign.id] === "fail" ? "default" : "outline"}
                    className={`h-10 text-[12px] font-bold ${signResults[currentSign.id] === "fail" ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "border-[#DC2626] text-[#991B1B] hover:bg-[#FEE2E2]"}`}
                    data-testid="elp-sign-fail-btn"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Not Identified
                  </Button>
                </div>

                {/* Notes */}
                <textarea
                  value={signNotes[currentSign.id] || ""}
                  onChange={(e) => setSignNotes((n) => ({ ...n, [currentSign.id]: e.target.value }))}
                  rows={2}
                  placeholder="Notes (optional)…"
                  className="w-full rounded-md border px-2 py-1.5 text-[12px] outline-none focus:border-[#002855]"
                  data-testid="elp-sign-notes"
                />

                {/* Prev / Next */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSignRunIdx((i) => Math.max(0, i - 1))}
                    disabled={signRunIdx === 0}
                    variant="outline"
                    className="flex-1 h-9 text-[12px]"
                    data-testid="elp-sign-prev-btn"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                  </Button>
                  <Button
                    onClick={() => signRunIdx === ELP_REQUIRED_SIGNS - 1 ? setPhase("summary") : setSignRunIdx((i) => i + 1)}
                    disabled={!signResults[currentSign.id]}
                    className="flex-1 h-9 text-[12px] bg-[#002855] text-white hover:bg-[#001a3a] disabled:opacity-50"
                    data-testid="elp-sign-next-btn"
                  >
                    {signRunIdx === ELP_REQUIRED_SIGNS - 1 ? "Finish → Disposition" : "Next sign"}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                {/* Progress dots */}
                <div className="grid grid-cols-4 gap-1" data-testid="elp-sign-progress">
                  {selectedSignIds.map((sid, i) => (
                    <button
                      key={sid}
                      onClick={() => setSignRunIdx(i)}
                      className={`h-6 rounded text-[10px] font-bold ${
                        i === signRunIdx ? "bg-[#002855] text-white ring-2 ring-[#D4AF37]" :
                        signResults[sid] === "pass" ? "bg-[#10B981] text-white" :
                        signResults[sid] === "fail" ? "bg-[#DC2626] text-white" :
                        "bg-[#E2E8F0] text-[#64748B]"
                      }`}
                      data-testid={`elp-sign-jump-${i}`}
                    >
                      #{sid}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PHASE: SUMMARY */}
        {phase === "summary" && (
          <section className="space-y-2" data-testid="elp-phase-summary">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-[#002855] text-white px-3 py-2">
                <p className="text-[12px] font-bold">Disposition</p>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-md bg-[#F8FAFC] border p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Interview</p>
                    <p className="font-bold text-[#002855]">
                      {interviewAdministered ? interviewDisposition.toUpperCase() : "Not administered"}
                    </p>
                  </div>
                  <div className="rounded-md bg-[#F8FAFC] border p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Sign Test</p>
                    <p className="font-bold text-[#002855]">
                      {signsAdministered
                        ? `${passCount}/${ELP_REQUIRED_SIGNS} — ${signTestResult.toUpperCase()}`
                        : "Not administered"}
                    </p>
                    {signsAdministered && (
                      <p className="text-[10.5px] text-[#475569]">
                        Threshold: {ELP_SIGN_PASS_THRESHOLD} of {ELP_REQUIRED_SIGNS}
                      </p>
                    )}
                  </div>
                </div>

                {suggestedDisposition && (
                  <div className="rounded border-l-[3px] border-[#3B82F6] bg-[#EEF6FF] p-2">
                    <p className="text-[10.5px] text-[#1E3A8A]">
                      <span className="font-bold">Suggested:</span> {suggestedDisposition === "proficient" ? "ELP PASS" : "ELP FAIL"} (based on the test results above; inspector’s judgment overrides).
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Inspector’s overall finding</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      onClick={() => setOverallDisposition("proficient")}
                      variant={overallDisposition === "proficient" ? "default" : "outline"}
                      className={overallDisposition === "proficient" ? "bg-[#10B981] text-white hover:bg-[#059669]" : "border-[#10B981] text-[#065F46] hover:bg-[#F0FDF4]"}
                      data-testid="elp-disp-proficient"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> ELP Pass
                    </Button>
                    <Button
                      onClick={() => setOverallDisposition("not_proficient")}
                      variant={overallDisposition === "not_proficient" ? "default" : "outline"}
                      className={overallDisposition === "not_proficient" ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "border-[#DC2626] text-[#991B1B] hover:bg-[#FEE2E2]"}
                      data-testid="elp-disp-not-proficient"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> ELP Fail
                    </Button>
                  </div>
                </div>

                {overallDisposition === "not_proficient" && (
                  <div className="space-y-2" data-testid="elp-fail-block">
                    <div className="rounded-md border-l-[3px] border-[#DC2626] bg-[#FEE2E2] p-2.5" data-testid="elp-citation-card">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B] mb-1">Citation</p>
                      <p className="text-[12px] font-bold text-[#7F1D1D]">{ELP_CITATION.ref} — {ELP_CITATION.title}</p>
                      <p className="text-[11px] text-[#7F1D1D] leading-relaxed mt-1">Cite based on the documented test result. The interview test (Attachment A) and/or the highway-sign recognition test (Attachment B) results captured in this report support the §391.11(b)(2) violation.</p>
                    </div>
                    <div className="rounded-md border-2 border-[#DC2626] bg-[#7F1D1D] p-2.5 text-white" data-testid="elp-oos-card">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-4 h-4 text-[#FCA5A5]" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#FCA5A5]">Place Driver Out of Service</p>
                      </div>
                      <p className="text-[12.5px] font-black leading-tight">Place the driver out of service per the current CVSA OOS criteria for §391.11(b)(2).</p>
                      <p className="text-[10.5px] mt-1 text-white/85 leading-relaxed">A driver who fails the English language proficiency assessment must be placed out of service. Document the OOS in the inspection record and notify the carrier.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Inspector notes</label>
                  <textarea
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border px-2 py-1.5 text-[12px] outline-none focus:border-[#002855]"
                    placeholder="Document context, demeanor, additional observations…"
                    data-testid="elp-inspector-notes"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Hidden report content for PDF generation */}
      <div ref={hiddenReportRef} aria-hidden="true" style={{ position: "absolute", left: -99999, top: 0, width: 700, padding: "20px 16px", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 13, color: "#0F172A", lineHeight: 1.6, background: "#fff", pointerEvents: "none" }}>
        <ElpReportContent
          companyName={companyName} usdotNumber={usdotNumber}
          visibleQuestions={visibleQuestions} interviewAsked={interviewAsked} interviewNotes={interviewNotes}
          interviewAdministered={interviewAdministered} interviewDisposition={interviewDisposition}
          selectedSignIds={selectedSignIds} signResults={signResults} signNotes={signNotes}
          signsAdministered={signsAdministered} signTestResult={signTestResult}
          passCount={passCount} failCount={failCount}
          overallDisposition={overallDisposition} inspectorNotes={inspectorNotes}
        />
      </div>

      {/* PDF preview */}
      <PDFPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        title="ELP Roadside Assessment"
        filename={`elp-assessment-${new Date().toISOString().slice(0, 10)}`}
        hideShareButton
      >
        <ElpReportContent
          companyName={companyName} usdotNumber={usdotNumber}
          visibleQuestions={visibleQuestions} interviewAsked={interviewAsked} interviewNotes={interviewNotes}
          interviewAdministered={interviewAdministered} interviewDisposition={interviewDisposition}
          selectedSignIds={selectedSignIds} signResults={signResults} signNotes={signNotes}
          signsAdministered={signsAdministered} signTestResult={signTestResult}
          passCount={passCount} failCount={failCount}
          overallDisposition={overallDisposition} inspectorNotes={inspectorNotes}
        />
      </PDFPreview>

      {/* Save modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden" data-testid="elp-save-modal">
          <div className="bg-[#002855] px-4 py-3">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Save to Inspection</h3>
            <p className="text-[10px] text-white/50">Attach this ELP assessment</p>
          </div>
          <div className="px-3 pt-3 pb-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-[10px] text-[#64748B] font-medium mb-1.5 uppercase">New Inspection</p>
            <div className="flex gap-1.5">
              <input value={newInspTitle} onChange={(e) => setNewInspTitle(e.target.value)} placeholder="Title…"
                className="flex-1 px-2 py-1 text-[12px] border border-[#CBD5E1] rounded outline-none focus:border-[#002855]"
                data-testid="elp-new-insp-title" />
              <Button size="sm" onClick={createAndSave} disabled={saving} className="bg-[#10B981] text-white hover:bg-[#059669] h-7 text-[10px]" data-testid="elp-create-and-save">
                {saving ? "Saving…" : "Create + Save"}
              </Button>
            </div>
          </div>
          <div className="px-3 py-2 max-h-[280px] overflow-y-auto">
            <p className="text-[10px] text-[#64748B] font-medium mb-1.5 uppercase">Existing Inspections</p>
            {loadingInspections ? <p className="text-[11px] text-[#64748B] italic">Loading…</p> : (
              <div className="space-y-1">
                {inspections.length === 0 && <p className="text-[11px] text-[#64748B] italic">No inspections yet.</p>}
                {inspections.map((i) => (
                  <button key={i.id} onClick={() => saveToInspection(i.id)} disabled={saving}
                    className="w-full text-left px-2 py-1.5 rounded border border-[#E2E8F0] hover:border-[#002855] hover:bg-[#F8FAFC] text-[11.5px]"
                    data-testid={`elp-save-existing-${i.id}`}>
                    <span className="font-bold">{i.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Show-to-Driver fullscreen overlay (rendered as a sibling so the
          underlying page stays mounted and scroll position is preserved when
          the inspector exits). Tapping anywhere on the sign exits. */}
      {showingToDriver && driverSign && (
        <button
          type="button"
          onClick={() => setShowingToDriver(false)}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer focus:outline-none"
          aria-label="Tap to return"
          data-testid="elp-driver-view"
        >
          <div className="w-full max-w-[640px] px-4 sm:px-8" style={{ aspectRatio: "1 / 1" }}>
            <SignDisplay sign={driverSign} size={640} />
          </div>
          <p
            className="absolute top-8 left-0 right-0 text-center text-white/70 text-xs font-bold uppercase tracking-[0.2em] elp-fade-hint"
            data-testid="elp-driver-tap-hint"
          >
            Tap to return
          </p>
        </button>
      )}
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function PhaseTab({ label, active, onClick, disabled, testid }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2 py-2 rounded-lg text-[10.5px] font-bold ${
        active ? "bg-[#002855] text-white" :
        disabled ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" :
        "bg-white text-[#002855] hover:bg-[#F1F5F9]"
      }`}
      data-testid={testid}
    >{label}</button>
  );
}

function DispBtn({ label, desc, active, onClick, color, testid }) {
  return (
    <button onClick={onClick}
      className={`px-2 py-2 rounded-lg text-left ${active ? "text-white" : "border bg-white"}`}
      style={active ? { background: color } : { borderColor: color, color }}
      data-testid={testid}
    >
      <p className="text-[12px] font-bold">{label}</p>
      <p className={`text-[9.5px] leading-tight mt-0.5 ${active ? "opacity-90" : "opacity-80"}`}>{desc}</p>
    </button>
  );
}

function InterviewRow({ q, asked, note, onToggleAsked, onNote }) {
  return (
    <div className="px-3 py-2 space-y-1" data-testid={`elp-q-${q.key}`}>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={asked}
          onChange={(e) => onToggleAsked(e.target.checked)}
          className="mt-1"
          data-testid={`elp-q-${q.key}-asked`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#002855]">
            <span className="text-[#D4AF37]">{q.num}.</span> {q.text}
            {q.hm && <span className="text-[9px] font-bold text-[#92400E] ml-1.5 uppercase">HM</span>}
          </p>
          {q.paraphrases?.length > 0 && (
            <p className="text-[10.5px] text-[#64748B] italic leading-snug mt-0.5">
              Paraphrase: {q.paraphrases.join(" · ")}
            </p>
          )}
        </div>
      </label>
      {asked && (
        <input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Optional notes…"
          className="w-full px-2 py-1 ml-6 border border-[#E2E8F0] rounded text-[11.5px] outline-none focus:border-[#002855]"
          style={{ width: "calc(100% - 1.5rem)" }}
          data-testid={`elp-q-${q.key}-note`}
        />
      )}
    </div>
  );
}

/* ──────────────── REPORT CONTENT ──────────────── */

function ElpReportContent({
  companyName, usdotNumber,
  visibleQuestions, interviewAsked, interviewNotes,
  interviewAdministered, interviewDisposition,
  selectedSignIds, signResults, signNotes,
  signsAdministered, signTestResult, passCount, failCount,
  overallDisposition, inspectorNotes,
}) {
  const today = new Date().toLocaleDateString();
  const askedQs = visibleQuestions.filter((q) => interviewAsked[q.key] || interviewNotes[q.key]);
  return (
    <div>
      <div style={{ borderBottom: "2px solid #002855", paddingBottom: 8, marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#002855", margin: 0 }}>English Language Proficiency · Roadside Assessment</h1>
        <p style={{ fontSize: 11, color: "#64748B", margin: 0, marginTop: 4 }}>49 CFR §391.11(b)(2) · Two-Test Protocol · {today}</p>
      </div>

      {(companyName || usdotNumber) && (
        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <p style={{ margin: 0 }}>
            {companyName && <><strong>Company:</strong> {companyName}</>}
            {companyName && usdotNumber ? " · " : ""}
            {usdotNumber && <><strong>USDOT #:</strong> {usdotNumber}</>}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 13, color: "#002855", margin: 0, marginBottom: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 2 }}>TEST 1 — Driver Interview (Attachment A)</h2>
        <p style={{ margin: 0, fontSize: 12, marginBottom: 6 }}>
          <strong>Inspector judgment:</strong>{" "}
          <span style={{ fontWeight: 800, color: interviewDisposition === "pass" ? "#065F46" : interviewDisposition === "fail" ? "#991B1B" : "#92400E" }}>
            {interviewAdministered ? interviewDisposition.toUpperCase() : "NOT ADMINISTERED"}
          </span>
        </p>
        {askedQs.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #CBD5E1" }}>
              <th style={{ textAlign: "left", padding: "4px 6px", width: 28 }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Question</th>
              <th style={{ textAlign: "center", padding: "4px 6px", width: 60 }}>Asked</th>
              <th style={{ textAlign: "left", padding: "4px 6px", width: 220 }}>Notes</th>
            </tr></thead>
            <tbody>
              {askedQs.map((q) => (
                <tr key={q.key} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "4px 6px" }}>{q.num}</td>
                  <td style={{ padding: "4px 6px" }}>{q.text}{q.hm ? " (HM)" : ""}</td>
                  <td style={{ padding: "4px 6px", textAlign: "center" }}>{interviewAsked[q.key] ? "✓" : ""}</td>
                  <td style={{ padding: "4px 6px", color: "#475569" }}>{interviewNotes[q.key] || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 13, color: "#002855", margin: 0, marginBottom: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 2 }}>TEST 2 — Highway Sign Recognition (Attachment B)</h2>
        {signsAdministered ? (
          <>
            <p style={{ margin: 0, fontSize: 12, marginBottom: 6 }}>
              <strong>Result:</strong>{" "}
              <span style={{ fontWeight: 800, color: signTestResult === "sufficient" ? "#065F46" : "#991B1B" }}>
                {signTestResult.toUpperCase()}
              </span>
              {" "}({passCount}/{selectedSignIds.length} identified · threshold {ELP_SIGN_PASS_THRESHOLD} of {ELP_REQUIRED_SIGNS})
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #CBD5E1" }}>
                <th style={{ textAlign: "left", padding: "4px 6px", width: 30 }}>#</th>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>Sign meaning</th>
                <th style={{ textAlign: "center", padding: "4px 6px", width: 80 }}>Result</th>
                <th style={{ textAlign: "left", padding: "4px 6px", width: 200 }}>Notes</th>
              </tr></thead>
              <tbody>
                {selectedSignIds.map((id) => {
                  const s = ELP_SIGNS.find((x) => x.id === id);
                  if (!s) return null;
                  const r = signResults[id];
                  return (
                    <tr key={id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "4px 6px" }}>{id}</td>
                      <td style={{ padding: "4px 6px" }}>{s.meaning}</td>
                      <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: r === "pass" ? "#065F46" : "#991B1B" }}>
                        {r === "pass" ? "IDENTIFIED" : r === "fail" ? "NOT IDENTIFIED" : "—"}
                      </td>
                      <td style={{ padding: "4px 6px", color: "#475569" }}>{signNotes[id] || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 11.5, color: "#64748B", fontStyle: "italic" }}>Sign test not administered.</p>
        )}
      </div>

      <div style={{ marginTop: 14, padding: 10, border: `2px solid ${overallDisposition === "proficient" ? "#10B981" : "#DC2626"}`, borderRadius: 6, background: overallDisposition === "proficient" ? "#F0FDF4" : "#FEE2E2" }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: overallDisposition === "proficient" ? "#065F46" : "#7F1D1D" }}>
          DISPOSITION: {overallDisposition === "proficient" ? "ELP PASS" : overallDisposition === "not_proficient" ? "ELP FAIL — DRIVER PLACED OUT OF SERVICE" : "Pending"}
        </p>
        {overallDisposition === "not_proficient" && (
          <p style={{ margin: 0, marginTop: 4, fontSize: 11.5, color: "#7F1D1D" }}>
            <strong>Citation:</strong> {ELP_CITATION.ref} — {ELP_CITATION.title}
          </p>
        )}
      </div>

      {inspectorNotes && (
        <div style={{ marginTop: 12, fontSize: 11.5 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#002855" }}>Inspector notes:</p>
          <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>{inspectorNotes}</p>
        </div>
      )}

      <div style={{ marginTop: 18, fontSize: 9.5, color: "#94A3B8", borderTop: "1px solid #E2E8F0", paddingTop: 6 }}>
        <p style={{ margin: 0 }}>Generated by Inspection Navigator · ELP Roadside Assessment Module · No driver PII recorded</p>
      </div>
    </div>
  );
}
