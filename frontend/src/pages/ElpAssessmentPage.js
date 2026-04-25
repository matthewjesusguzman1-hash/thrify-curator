import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, ChevronRight, Eye, Share2, Save,
  CheckCircle2, XCircle, AlertTriangle, FileText, Languages, Info,
  RotateCcw,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Toaster, toast } from "sonner";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { PDFPreview } from "../components/app/PDFPreview";
import { useAuth } from "../components/app/AuthContext";
import { generatePDFBlob, sharePDFBlob } from "../lib/pdfShare";
import { ELP_INTERVIEW_QUESTIONS, ELP_SIGNS, ELP_CITATION, ELP_PASS_THRESHOLD_NOTE } from "../lib/elpContent";
import { SignDisplay } from "../components/elp/SignDisplay";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ElpAssessmentPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();

  // Driver context
  const [driverName, setDriverName] = useState("");
  const [cdlNumber, setCdlNumber] = useState("");
  const [hauling, setHauling] = useState({ hm: false });

  // Phase: 'interview' (Test 1) → 'signs' (Test 2, optional) → 'summary'
  const [phase, setPhase] = useState("interview");

  // Interview answers — keyed by question key. Values: "pass" | "inconclusive" | "fail"
  const [interviewAnswers, setInterviewAnswers] = useState({});
  const [interviewNotes, setInterviewNotes] = useState({});

  // Sign answers — keyed by sign id. Values: "pass" | "fail"
  const [signIdx, setSignIdx] = useState(0);
  const [signAnswers, setSignAnswers] = useState({});
  const [signResponses, setSignResponses] = useState({});

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

  // Visible questions — HM questions show only when driver is hauling HM
  const visibleQuestions = useMemo(
    () => ELP_INTERVIEW_QUESTIONS.filter((q) => !q.hm || hauling.hm),
    [hauling.hm]
  );

  // Counts for progress + grading
  const interviewStats = useMemo(() => {
    const total = visibleQuestions.length;
    const answered = visibleQuestions.filter((q) => interviewAnswers[q.key]).length;
    const fails = visibleQuestions.filter((q) => interviewAnswers[q.key] === "fail").length;
    const inconclusive = visibleQuestions.filter((q) => interviewAnswers[q.key] === "inconclusive").length;
    const passes = visibleQuestions.filter((q) => interviewAnswers[q.key] === "pass").length;
    return { total, answered, fails, inconclusive, passes };
  }, [visibleQuestions, interviewAnswers]);

  const signStats = useMemo(() => {
    const total = ELP_SIGNS.length;
    const answered = Object.keys(signAnswers).length;
    const fails = Object.values(signAnswers).filter((v) => v === "fail").length;
    const passes = Object.values(signAnswers).filter((v) => v === "pass").length;
    return { total, answered, fails, passes };
  }, [signAnswers]);

  const interviewComplete = interviewStats.answered === interviewStats.total && interviewStats.total > 0;
  const interviewNeedsSignTest = interviewComplete && (interviewStats.fails + interviewStats.inconclusive) > 0;
  const signsAdministered = Object.keys(signAnswers).length > 0;
  const hasData = interviewStats.answered > 0;

  /* ── Interview answer setters ── */
  const setInterviewAnswer = (key, value) => setInterviewAnswers((a) => ({ ...a, [key]: value }));
  const setInterviewNote = (key, value) => setInterviewNotes((a) => ({ ...a, [key]: value }));

  /* ── Sign answer setters ── */
  const setSignAnswer = (id, value) => setSignAnswers((a) => ({ ...a, [id]: value }));
  const setSignResponse = (id, value) => setSignResponses((a) => ({ ...a, [id]: value }));

  /* ── Reset ── */
  const resetAll = () => {
    setDriverName(""); setCdlNumber(""); setHauling({ hm: false });
    setInterviewAnswers({}); setInterviewNotes({});
    setSignIdx(0); setSignAnswers({}); setSignResponses({});
    setOverallDisposition(""); setInspectorNotes("");
    setPhase("interview");
  };

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
    driver_name: driverName,
    cdl_number: cdlNumber,
    interview_administered: interviewStats.answered > 0,
    interview_answers: visibleQuestions
      .filter((q) => interviewAnswers[q.key])
      .map((q) => ({
        key: q.key,
        question: q.text,
        result: interviewAnswers[q.key],
        notes: interviewNotes[q.key] || "",
      })),
    signs_administered: signsAdministered,
    sign_answers: ELP_SIGNS
      .filter((s) => signAnswers[s.id])
      .map((s) => ({
        sign_id: s.id,
        text: s.text.replace(/\n/g, " "),
        meaning: s.meaning,
        result: signAnswers[s.id],
        driver_response: signResponses[s.id] || "",
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

  /* ──────────────── RENDER ──────────────── */
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
          <p className="text-[10.5px] text-[#1E3A8A] leading-relaxed mt-2 italic">Test protocol: <span className="font-bold">Interview first.</span> If proficiency remains in question after the interview, escalate to the highway sign recognition test.</p>
        </div>

        {/* Driver context */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-[#002855] text-white px-3 py-2">
            <p className="text-[12px] font-bold">Driver context</p>
          </div>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Driver name</label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="h-8 text-[12px]" data-testid="elp-driver-name" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">CDL #</label>
                <Input value={cdlNumber} onChange={(e) => setCdlNumber(e.target.value)} className="h-8 text-[12px]" data-testid="elp-cdl" />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={hauling.hm} onChange={(e) => setHauling({ hm: e.target.checked })} data-testid="elp-hm-checkbox" />
              <span className="text-[12px] text-[#334155]">Driver is hauling hazardous materials (adds HM-specific interview questions)</span>
            </label>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="grid grid-cols-3 gap-1 bg-white rounded-xl border p-1" data-testid="elp-phase-tabs">
          <PhaseTab label={`Interview (${interviewStats.answered}/${interviewStats.total})`} active={phase === "interview"} onClick={() => setPhase("interview")} testid="elp-tab-interview" />
          <PhaseTab label={`Sign Test (${signStats.answered}/${signStats.total})`} active={phase === "signs"} onClick={() => setPhase("signs")} disabled={!interviewComplete} testid="elp-tab-signs" />
          <PhaseTab label="Disposition" active={phase === "summary"} onClick={() => setPhase("summary")} disabled={!interviewComplete} testid="elp-tab-summary" />
        </div>

        {/* PHASE: INTERVIEW */}
        {phase === "interview" && (
          <section className="space-y-2" data-testid="elp-phase-interview">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-[#002855] text-white px-3 py-2 flex items-center gap-2">
                <p className="text-[12px] font-bold">Test 1 — Interview</p>
                <span className="ml-auto text-[10px] text-white/70">Attachment A</span>
              </div>
              <div className="divide-y">
                {visibleQuestions.map((q, i) => (
                  <InterviewRow
                    key={q.key}
                    idx={i + 1}
                    q={q}
                    answer={interviewAnswers[q.key]}
                    note={interviewNotes[q.key] || ""}
                    onSet={(v) => setInterviewAnswer(q.key, v)}
                    onNote={(v) => setInterviewNote(q.key, v)}
                  />
                ))}
              </div>
            </div>
            {interviewComplete && (
              <div className={`rounded-xl border p-3 ${interviewNeedsSignTest ? "border-[#F59E0B] bg-[#FFFBEB]" : "border-[#10B981] bg-[#F0FDF4]"}`} data-testid="elp-interview-result">
                {interviewNeedsSignTest ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                      <p className="text-[12px] font-bold text-[#92400E]">Proficiency still in question — administer the sign test.</p>
                    </div>
                    <p className="text-[11px] text-[#92400E] leading-relaxed">{interviewStats.fails} fail · {interviewStats.inconclusive} inconclusive · {interviewStats.passes} pass. Continue to <span className="font-bold">Test 2 — Sign Recognition</span> to complete the assessment.</p>
                    <Button onClick={() => setPhase("signs")} className="w-full mt-2 bg-[#92400E] text-white hover:bg-[#7C2D12] h-9 text-[12px]" data-testid="elp-go-signs-btn">
                      Continue to Sign Recognition Test <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <p className="text-[12px] font-bold text-[#065F46]">Interview clean — driver passed all interview questions.</p>
                    </div>
                    <p className="text-[11px] text-[#065F46] leading-relaxed">No need to escalate to the sign test. Go to <span className="font-bold">Disposition</span> to record your finding.</p>
                    <Button onClick={() => setPhase("summary")} className="w-full mt-2 bg-[#10B981] text-white hover:bg-[#059669] h-9 text-[12px]" data-testid="elp-go-summary-btn">
                      Record disposition <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* PHASE: SIGNS */}
        {phase === "signs" && (
          <section className="space-y-2" data-testid="elp-phase-signs">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-[#002855] text-white px-3 py-2 flex items-center gap-2">
                <p className="text-[12px] font-bold">Test 2 — Highway Sign Recognition</p>
                <span className="ml-auto text-[10px] text-white/70">Attachment B · Sign {signIdx + 1} of {ELP_SIGNS.length}</span>
              </div>
              <div className="p-3 space-y-3">
                <p className="text-[11px] text-[#64748B] italic leading-relaxed">Hold the device up to the cab window so the driver can see the sign. Ask: <span className="font-bold not-italic text-[#002855]">"What does this sign mean?"</span> Record their response in English below and mark Pass / Fail.</p>
                <div className="bg-[#0F172A] rounded-xl p-3 mx-auto" style={{ maxWidth: 360 }} data-testid="elp-sign-display">
                  <div style={{ aspectRatio: "1 / 1" }}>
                    <SignDisplay sign={ELP_SIGNS[signIdx]} />
                  </div>
                  <p className="text-center text-white/70 text-[10.5px] mt-2 font-bold uppercase tracking-wider">Sign {ELP_SIGNS[signIdx].id}</p>
                </div>
                <div className="rounded-md bg-[#F8FAFC] border p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Inspector reference (driver should not see)</p>
                  <p className="text-[12px] font-bold text-[#002855]">Meaning: {ELP_SIGNS[signIdx].meaning}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Driver's response</label>
                  <Input
                    value={signResponses[ELP_SIGNS[signIdx].id] || ""}
                    onChange={(e) => setSignResponse(ELP_SIGNS[signIdx].id, e.target.value)}
                    placeholder="What did the driver say?"
                    className="h-8 text-[12px]"
                    data-testid="elp-sign-response"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setSignAnswer(ELP_SIGNS[signIdx].id, "pass")}
                    variant={signAnswers[ELP_SIGNS[signIdx].id] === "pass" ? "default" : "outline"}
                    className={signAnswers[ELP_SIGNS[signIdx].id] === "pass" ? "bg-[#10B981] text-white hover:bg-[#059669]" : "border-[#10B981] text-[#065F46] hover:bg-[#F0FDF4]"}
                    data-testid="elp-sign-pass">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Pass
                  </Button>
                  <Button onClick={() => setSignAnswer(ELP_SIGNS[signIdx].id, "fail")}
                    variant={signAnswers[ELP_SIGNS[signIdx].id] === "fail" ? "default" : "outline"}
                    className={signAnswers[ELP_SIGNS[signIdx].id] === "fail" ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "border-[#DC2626] text-[#991B1B] hover:bg-[#FEE2E2]"}
                    data-testid="elp-sign-fail">
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Fail
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setSignIdx((i) => Math.max(0, i - 1))} disabled={signIdx === 0} variant="outline" className="flex-1 h-9 text-[12px]" data-testid="elp-sign-prev">
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                  </Button>
                  <Button onClick={() => signIdx === ELP_SIGNS.length - 1 ? setPhase("summary") : setSignIdx((i) => i + 1)} className="flex-1 h-9 text-[12px] bg-[#002855] text-white hover:bg-[#001a3a]" data-testid="elp-sign-next">
                    {signIdx === ELP_SIGNS.length - 1 ? "Finish → Disposition" : "Next sign"} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-1 pt-2 border-t" data-testid="elp-sign-progress">
                  {ELP_SIGNS.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setSignIdx(i)}
                      className={`h-6 rounded text-[9px] font-bold ${
                        i === signIdx ? "bg-[#002855] text-white ring-2 ring-[#D4AF37]" :
                        signAnswers[s.id] === "pass" ? "bg-[#10B981] text-white" :
                        signAnswers[s.id] === "fail" ? "bg-[#DC2626] text-white" :
                        "bg-[#E2E8F0] text-[#64748B]"
                      }`}
                      data-testid={`elp-sign-jump-${s.id}`}
                    >{s.id}</button>
                  ))}
                </div>
                <p className="text-[10.5px] text-[#64748B] italic leading-relaxed pt-1 border-t">{ELP_PASS_THRESHOLD_NOTE}</p>
              </div>
            </div>
          </section>
        )}

        {/* PHASE: SUMMARY / DISPOSITION */}
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
                    <p className="font-bold text-[#002855]">{interviewStats.answered}/{interviewStats.total} answered</p>
                    <p className="text-[11px] text-[#475569]">{interviewStats.passes} pass · {interviewStats.inconclusive} inconclusive · {interviewStats.fails} fail</p>
                  </div>
                  <div className="rounded-md bg-[#F8FAFC] border p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Sign Test</p>
                    <p className="font-bold text-[#002855]">{signStats.answered}/{signStats.total} signs</p>
                    <p className="text-[11px] text-[#475569]">{signStats.passes} pass · {signStats.fails} fail</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Inspector's overall finding</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button onClick={() => setOverallDisposition("proficient")}
                      variant={overallDisposition === "proficient" ? "default" : "outline"}
                      className={overallDisposition === "proficient" ? "bg-[#10B981] text-white hover:bg-[#059669]" : "border-[#10B981] text-[#065F46] hover:bg-[#F0FDF4]"}
                      data-testid="elp-disp-proficient">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Proficient
                    </Button>
                    <Button onClick={() => setOverallDisposition("not_proficient")}
                      variant={overallDisposition === "not_proficient" ? "default" : "outline"}
                      className={overallDisposition === "not_proficient" ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "border-[#DC2626] text-[#991B1B] hover:bg-[#FEE2E2]"}
                      data-testid="elp-disp-not-proficient">
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Not Proficient
                    </Button>
                  </div>
                </div>
                {overallDisposition === "not_proficient" && (
                  <div className="rounded-md border-l-[3px] border-[#DC2626] bg-[#FEE2E2] p-2.5" data-testid="elp-citation-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B] mb-1">Citation</p>
                    <p className="text-[12px] font-bold text-[#7F1D1D]">{ELP_CITATION.ref} — {ELP_CITATION.title}</p>
                    <p className="text-[11px] text-[#7F1D1D] leading-relaxed mt-1">Cite based on the documented test result. The interview test (Attachment A) and/or the highway sign recognition test (Attachment B) results captured in this report support the §391.11(b)(2) violation.</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Inspector notes</label>
                  <textarea value={inspectorNotes} onChange={(e) => setInspectorNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border px-2 py-1.5 text-[12px] outline-none focus:border-[#002855]"
                    placeholder="Document context, demeanor, additional observations…"
                    data-testid="elp-inspector-notes" />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Hidden report content for PDF generation */}
      <div ref={hiddenReportRef} aria-hidden="true" style={{ position: "absolute", left: -99999, top: 0, width: 700, padding: "20px 16px", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 13, color: "#0F172A", lineHeight: 1.6, background: "#fff", pointerEvents: "none" }}>
        <ElpReportContent
          driverName={driverName} cdlNumber={cdlNumber} hauling={hauling}
          visibleQuestions={visibleQuestions} interviewAnswers={interviewAnswers} interviewNotes={interviewNotes}
          signsAdministered={signsAdministered} signAnswers={signAnswers} signResponses={signResponses}
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
          driverName={driverName} cdlNumber={cdlNumber} hauling={hauling}
          visibleQuestions={visibleQuestions} interviewAnswers={interviewAnswers} interviewNotes={interviewNotes}
          signsAdministered={signsAdministered} signAnswers={signAnswers} signResponses={signResponses}
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
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function PhaseTab({ label, active, onClick, disabled, testid }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2 py-2 rounded-lg text-[11px] font-bold ${
        active ? "bg-[#002855] text-white" :
        disabled ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed" :
        "bg-white text-[#002855] hover:bg-[#F1F5F9]"
      }`}
      data-testid={testid}
    >{label}</button>
  );
}

function InterviewRow({ idx, q, answer, note, onSet, onNote }) {
  return (
    <div className="px-3 py-2.5 space-y-1.5" data-testid={`elp-q-${q.key}`}>
      <p className="text-[12.5px] font-bold text-[#002855]"><span className="text-[#D4AF37]">{idx}.</span> {q.text}{q.hm && <span className="text-[9px] font-bold text-[#92400E] ml-1.5 uppercase">HM</span>}</p>
      <div className="grid grid-cols-3 gap-1">
        <RowBtn label="Pass"     active={answer === "pass"}         onClick={() => onSet("pass")}         color="#10B981" testid={`elp-q-${q.key}-pass`} />
        <RowBtn label="Inconcl." active={answer === "inconclusive"} onClick={() => onSet("inconclusive")} color="#F59E0B" testid={`elp-q-${q.key}-inconclusive`} />
        <RowBtn label="Fail"     active={answer === "fail"}         onClick={() => onSet("fail")}         color="#DC2626" testid={`elp-q-${q.key}-fail`} />
      </div>
      {answer && (
        <input value={note} onChange={(e) => onNote(e.target.value)}
          placeholder="Optional notes…"
          className="w-full px-2 py-1 border border-[#E2E8F0] rounded text-[11.5px] outline-none focus:border-[#002855]"
          data-testid={`elp-q-${q.key}-note`} />
      )}
    </div>
  );
}

function RowBtn({ label, active, onClick, color, testid }) {
  return (
    <button onClick={onClick}
      className={`px-2 py-1 rounded text-[10.5px] font-bold ${active ? "text-white" : "border bg-white"}`}
      style={active ? { background: color } : { borderColor: color, color }}
      data-testid={testid}
    >{label}</button>
  );
}

/* ──────────────── REPORT CONTENT ──────────────── */

function ElpReportContent({ driverName, cdlNumber, hauling, visibleQuestions, interviewAnswers, interviewNotes, signsAdministered, signAnswers, signResponses, overallDisposition, inspectorNotes }) {
  const today = new Date().toLocaleDateString();
  return (
    <div>
      <div style={{ borderBottom: "2px solid #002855", paddingBottom: 8, marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#002855", margin: 0 }}>English Language Proficiency · Roadside Assessment</h1>
        <p style={{ fontSize: 11, color: "#64748B", margin: 0, marginTop: 4 }}>49 CFR §391.11(b)(2) · Two-Test Protocol · {today}</p>
      </div>

      {(driverName || cdlNumber) && (
        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <p style={{ margin: 0 }}><strong>Driver:</strong> {driverName || "—"}{cdlNumber ? ` · CDL ${cdlNumber}` : ""}{hauling.hm ? " · hauling HM" : ""}</p>
        </div>
      )}

      {visibleQuestions.some((q) => interviewAnswers[q.key]) && (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, color: "#002855", margin: 0, marginBottom: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 2 }}>TEST 1 — Interview (Attachment A)</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #CBD5E1" }}>
              <th style={{ textAlign: "left", padding: "4px 6px", width: 28 }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Question</th>
              <th style={{ textAlign: "center", padding: "4px 6px", width: 70 }}>Result</th>
              <th style={{ textAlign: "left", padding: "4px 6px", width: 180 }}>Notes</th>
            </tr></thead>
            <tbody>
              {visibleQuestions.map((q, i) => {
                const r = interviewAnswers[q.key];
                if (!r) return null;
                return (
                  <tr key={q.key} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "4px 6px" }}>{i + 1}</td>
                    <td style={{ padding: "4px 6px" }}>{q.text}{q.hm ? " (HM)" : ""}</td>
                    <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: r === "pass" ? "#065F46" : r === "fail" ? "#991B1B" : "#92400E" }}>{r.toUpperCase()}</td>
                    <td style={{ padding: "4px 6px", color: "#475569" }}>{interviewNotes[q.key] || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {signsAdministered && (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, color: "#002855", margin: 0, marginBottom: 6, borderBottom: "1px solid #E2E8F0", paddingBottom: 2 }}>TEST 2 — Highway Sign Recognition (Attachment B)</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr style={{ background: "#F8FAFC", borderBottom: "1px solid #CBD5E1" }}>
              <th style={{ textAlign: "left", padding: "4px 6px", width: 28 }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Sign meaning</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Driver's response</th>
              <th style={{ textAlign: "center", padding: "4px 6px", width: 60 }}>Result</th>
            </tr></thead>
            <tbody>
              {ELP_SIGNS.map((s) => {
                const r = signAnswers[s.id];
                if (!r) return null;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "4px 6px" }}>{s.id}</td>
                    <td style={{ padding: "4px 6px" }}>{s.meaning}</td>
                    <td style={{ padding: "4px 6px", color: "#475569" }}>{signResponses[s.id] || "—"}</td>
                    <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: r === "pass" ? "#065F46" : "#991B1B" }}>{r.toUpperCase()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 14, padding: 10, border: `2px solid ${overallDisposition === "proficient" ? "#10B981" : "#DC2626"}`, borderRadius: 6, background: overallDisposition === "proficient" ? "#F0FDF4" : "#FEE2E2" }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: overallDisposition === "proficient" ? "#065F46" : "#7F1D1D" }}>
          DISPOSITION: {overallDisposition === "proficient" ? "PROFICIENT" : overallDisposition === "not_proficient" ? "NOT PROFICIENT" : "Pending"}
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
        <p style={{ margin: 0 }}>Generated by Inspection Navigator · ELP Roadside Assessment Module</p>
      </div>
    </div>
  );
}
