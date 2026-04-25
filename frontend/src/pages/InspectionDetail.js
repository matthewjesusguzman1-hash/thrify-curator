import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Header } from "../components/app/Header";
import { Plus, Trash2, ChevronLeft, Camera, Pencil, Check, X, Image, ShieldAlert, XCircle, Eye, Hourglass, Scale, Repeat, Share2, Languages } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "../components/ui/dialog";
import { PDFPreview } from "../components/app/PDFPreview";
import { InspectionReportContent } from "../components/app/ReportContent";
import { generatePDFBlob, sharePDFBlob } from "../lib/pdfShare";
import { savePhoto as savePhotoToDevice, deletePhoto as deletePhotoFromDevice, getPhotoBlob } from "../lib/devicePhotos";
import { DevicePhoto } from "../components/app/DevicePhoto";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Circular WLL gauge matching the TieDown Calculator preview
function WLLGauge({ pct, size = 84, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const display = Math.min(Math.max(pct || 0, 0), 100);
  const offset = circ - (display / 100) * circ;
  const c = size / 2;
  const color = pct >= 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black leading-none" style={{ color }}>{Math.round(pct || 0)}%</span>
        <span className="text-[8px] font-bold tracking-widest text-[#94A3B8] mt-1">WLL</span>
      </div>
    </div>
  );
}

// Count dots: green check = active, red X = defective, dashed circle = missing
function CountDots({ tiedowns = [], required = 0 }) {
  const active = tiedowns.filter((t) => !t.defective).length;
  const missing = Math.max(0, required - active);
  return (
    <div className="flex flex-wrap gap-1">
      {tiedowns.map((td, i) =>
        td.defective ? (
          <div key={`t${i}`} className="w-5 h-5 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center text-[10px] font-black text-red-600">✕</div>
        ) : (
          <div key={`t${i}`} className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center text-[10px] font-black text-white">✓</div>
        )
      )}
      {Array.from({ length: missing }).map((_, i) => (
        <div key={`m${i}`} className="w-5 h-5 rounded-full border-2 border-dashed border-[#CBD5E1]" />
      ))}
    </div>
  );
}

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [editingItemNotes, setEditingItemNotes] = useState(null);
  const [itemNotesDraft, setItemNotesDraft] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState(null); // photo_id
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Hidden content ref used to render the full report invisibly for PDF generation
  const hiddenReportRef = useRef(null);

  const fetchInspection = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/inspections/${id}`);
      setInspection(res.data);
    } catch {
      toast.error("Failed to load inspection");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInspection(); }, [fetchInspection]);

  // Resolve preview URL from device IndexedDB whenever a photo id is selected.
  useEffect(() => {
    let url = null;
    let cancelled = false;
    (async () => {
      if (!previewPhoto) { setPreviewPhotoUrl(null); return; }
      const blob = await getPhotoBlob(previewPhoto);
      if (cancelled) return;
      if (blob) {
        url = URL.createObjectURL(blob);
        setPreviewPhotoUrl(url);
      } else {
        setPreviewPhotoUrl(null);
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [previewPhoto]);

  const saveTitle = async () => {
    await axios.put(`${API}/inspections/${id}`, { title: titleDraft });
    setEditingTitle(false);
    fetchInspection();
  };

  const saveNotes = async () => {
    await axios.put(`${API}/inspections/${id}`, { notes: notesDraft });
    setEditingNotes(false);
    fetchInspection();
  };

  const saveItemNotes = async (itemId) => {
    await axios.put(`${API}/inspections/${id}/violations/${itemId}/notes`, { notes: itemNotesDraft });
    setEditingItemNotes(null);
    fetchInspection();
  };

  const removeItem = async (itemId) => {
    await axios.delete(`${API}/inspections/${id}/violations/${itemId}`);
    fetchInspection();
    toast.success("Violation removed");
  };

  const handlePhotoUpload = async (itemId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const meta = await savePhotoToDevice(file, { inspectionId: id, category: "item", itemId, originalFilename: file.name });
      await axios.post(`${API}/inspections/${id}/violations/${itemId}/photos`, {
        photo_id: meta.photo_id, original_filename: meta.original_filename, mime: meta.mime, size: meta.size,
      });
      fetchInspection();
      toast.success("Photo saved on this device");
    } catch {
      toast.error("Photo save failed");
    }
  };

  const removePhoto = async (itemId, photoId) => {
    await axios.delete(`${API}/inspections/${id}/violations/${itemId}/photos/${photoId}`);
    await deletePhotoFromDevice(photoId);
    fetchInspection();
  };

  const removeTiedown = async (assessmentId) => {
    await axios.delete(`${API}/inspections/${id}/tiedown/${assessmentId}`);
    fetchInspection();
    toast.success("Tie-down assessment removed");
  };

  const removeElp = async (assessmentId) => {
    await axios.delete(`${API}/inspections/${id}/elp/${assessmentId}`);
    fetchInspection();
    toast.success("ELP assessment removed");
  };

  const removeHos = async (assessmentId) => {
    await axios.delete(`${API}/inspections/${id}/hos/${assessmentId}`);
    fetchInspection();
    toast.success("HOS recap removed");
  };

  const removeWeight = async (assessmentId) => {
    await axios.delete(`${API}/inspections/${id}/weight-assessments/${assessmentId}`);
    fetchInspection();
    toast.success("Weight assessment removed");
  };

  const removeGeneralPhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/inspections/${id}/annotated-photos/${photoId}`);
      await deletePhotoFromDevice(photoId);
      fetchInspection();
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleAssessmentPhotoUpload = async (assessmentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const meta = await savePhotoToDevice(file, { inspectionId: id, category: "tiedown", assessmentId, originalFilename: file.name });
      await axios.post(`${API}/inspections/${id}/tiedown/${assessmentId}/photos`, {
        photo_id: meta.photo_id, original_filename: meta.original_filename, mime: meta.mime, size: meta.size,
      });
      fetchInspection();
      toast.success("Photo saved on this device");
    } catch {
      toast.error("Photo save failed");
    }
  };

  const removeAssessmentPhoto = async (assessmentId, photoId) => {
    await axios.delete(`${API}/inspections/${id}/tiedown/${assessmentId}/photos/${photoId}`);
    await deletePhotoFromDevice(photoId);
    fetchInspection();
  };

  const handleExport = (includePhotos) => {
    const url = `${API}/inspections/${id}/export?include_photos=${includePhotos ? "Y" : "N"}`;
    window.open(url, "_blank");
  };

  const handleEmail = useCallback(async () => {
    if (!hiddenReportRef.current || !inspection) {
      toast.error("Report not ready");
      return;
    }
    setSharing(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      const blob = await generatePDFBlob(hiddenReportRef.current);
      const safeTitle = (inspection.title || "inspection").replace(/[^a-z0-9_\-]+/gi, "_");
      await sharePDFBlob(blob, `${safeTitle}.pdf`, {
        title: inspection.title || "Inspection Report",
        text: `Inspection Report: ${inspection.title || ""}\nItems: ${inspection.items?.length || 0}`,
      });
    } catch (err) {
      console.error("Share failed:", err);
      toast.error("Could not generate the report. Try Preview.");
    } finally {
      setSharing(false);
    }
  }, [inspection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EFF2F7]">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
        </div>
      </div>
    );
  }

  if (!inspection) return null;

  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="inspection-detail">
      <Toaster position="top-right" richColors />
      {/* Compact header */}
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/inspections")} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" data-testid="back-btn">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="h-8 text-sm bg-white/10 border-white/20 text-white" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTitle()} />
              <Button size="sm" onClick={saveTitle} className="h-8 w-8 p-0 bg-[#D4AF37] text-[#002855]"><Check className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="h-8 w-8 p-0 text-white/60"><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-white truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{inspection.title}</h1>
              <button onClick={() => { setTitleDraft(inspection.title); setEditingTitle(true); }} className="text-white/40 hover:text-white/80"><Pencil className="w-3 h-3" /></button>
            </div>
          )}
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      <main className="max-w-[800px] mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {/* Actions bar — sticky like calculator */}
        <div className="sticky top-[45px] z-40 bg-white/95 backdrop-blur border rounded-xl shadow-sm -mx-1 px-3 py-2 flex items-center gap-2">
          <Button size="sm" onClick={() => setShowPreview(true)} className="bg-[#002855] text-white hover:bg-[#001a3a] h-8 text-xs flex-1 sm:flex-none" data-testid="export-btn">
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
          </Button>
          <Button size="sm" onClick={handleEmail} disabled={sharing} variant="outline" className="border-[#D4AF37] text-[#002855] hover:bg-[#D4AF37]/10 h-8 text-xs flex-1 sm:flex-none" data-testid="email-btn">
            <Share2 className="w-3.5 h-3.5 mr-1.5" /> {sharing ? "Preparing…" : "Share"}
          </Button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Inspection Notes</span>
            {!editingNotes && (
              <button onClick={() => { setNotesDraft(inspection.notes || ""); setEditingNotes(true); }} className="text-[#94A3B8] hover:text-[#002855]"><Pencil className="w-3 h-3" /></button>
            )}
          </div>
          {editingNotes ? (
            <div className="flex flex-col gap-2">
              <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} className="w-full border rounded-md p-2 text-sm min-h-[60px] resize-none" placeholder="Add inspection notes..." autoFocus />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNotes} className="h-7 text-xs bg-[#002855] text-white">Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)} className="h-7 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#334155]">{inspection.notes || <span className="text-[#94A3B8] italic">No notes yet. Tap pencil to add.</span>}</p>
          )}
        </div>

        {/* Violations list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Violations ({inspection.items.length})</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/")} className="h-7 text-xs" data-testid="add-violation-btn">
              <Plus className="w-3 h-3 mr-1" /> Add from Search
            </Button>
          </div>

          {inspection.items.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-sm text-[#64748B]">No violations saved yet.</p>
              <Button size="sm" onClick={() => navigate("/")} className="mt-3 bg-[#002855] text-white h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Search & Add Violations
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {inspection.items.map((item) => (
                <div key={item.item_id} className="bg-white rounded-lg border p-3" data-testid={`inspection-item-${item.item_id}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-sm font-bold text-[#002855]">{item.regulatory_reference}</span>
                      {item.oos_value === "Y" && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold bg-[#DC2626] text-white">OOS</Badge>}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.violation_class}</Badge>
                    </div>
                    <button onClick={() => removeItem(item.item_id)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors flex-shrink-0" data-testid={`remove-item-${item.item_id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#475569] leading-relaxed mb-2">{item.violation_text}</p>

                  {/* Item notes */}
                  {editingItemNotes === item.item_id ? (
                    <div className="flex flex-col gap-1.5 mb-2">
                      <textarea value={itemNotesDraft} onChange={(e) => setItemNotesDraft(e.target.value)} className="w-full border rounded-md p-2 text-xs min-h-[40px] resize-none" placeholder="Notes for this violation..." autoFocus />
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => saveItemNotes(item.item_id)} className="h-6 text-[10px] bg-[#002855] text-white px-2">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItemNotes(null)} className="h-6 text-[10px] px-2">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setItemNotesDraft(item.notes || ""); setEditingItemNotes(item.item_id); }} className="text-xs text-[#94A3B8] hover:text-[#002855] mb-2 block">
                      {item.notes ? <span className="text-[#64748B]">{item.notes}</span> : <span className="italic">+ Add notes</span>}
                    </button>
                  )}

                  {/* Photos hidden pre-launch — existing photos still render,
                      new-photo UI is suppressed. */}
                  {(item.photos?.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.photos.map((photo) => (
                        <div key={photo.photo_id} className="relative group">
                          <DevicePhoto
                            photoId={photo.photo_id}
                            alt={photo.original_filename}
                            className="w-16 h-16 object-cover rounded-md border cursor-pointer"
                            onClick={() => setPreviewPhoto(photo.photo_id)}
                          />
                          <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 sm:opacity-100">
                            <button
                              onClick={() => removePhoto(item.item_id, photo.photo_id)}
                              className="w-4 h-4 bg-[#DC2626] text-white rounded-full flex items-center justify-center text-[8px]"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tie-Down Assessments */}
        {inspection.tiedown_assessments?.length > 0 && (
          <div data-testid="tiedown-assessments-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Tie-Down Assessments ({inspection.tiedown_assessments.length})
              </span>
            </div>
            <div className="space-y-3">
              {inspection.tiedown_assessments.map((a) => {
                const pct = a.required_wll > 0 ? Math.round((a.total_effective_wll / a.required_wll) * 100) : 0;
                return (
                  <div key={a.assessment_id} className="bg-white rounded-lg border p-3" data-testid={`tiedown-assessment-${a.assessment_id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#002855]" />
                        <span className="text-sm font-bold text-[#002855]">Tie-Down Assessment</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.compliant ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {a.compliant ? "COMPLIANT" : "NOT COMPLIANT"}
                        </span>
                      </div>
                      <button onClick={() => removeTiedown(a.assessment_id)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors flex-shrink-0" data-testid={`remove-tiedown-${a.assessment_id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-[auto_1fr] gap-3 mb-3 items-center">
                      <WLLGauge pct={pct} />
                      <div className="space-y-2 min-w-0">
                        <div className="text-xs text-[#64748B]">
                          Total Eff. WLL: <strong className="text-[#002855]">{a.total_effective_wll?.toLocaleString() || 0}</strong> / <strong className="text-[#002855]">{a.required_wll?.toLocaleString() || 0}</strong> lbs
                        </div>
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
                            Tie-Downs ({a.active_count || 0}/{a.min_tiedowns || 0} required)
                          </div>
                          <CountDots tiedowns={a.tiedowns || []} required={a.min_tiedowns || 0} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-2 text-center">
                      <div className="bg-[#F8FAFC] rounded p-1.5">
                        <p className="text-[9px] text-[#94A3B8] uppercase">Weight</p>
                        <p className="text-xs font-bold text-[#002855]">{a.cargo_weight?.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#F8FAFC] rounded p-1.5">
                        <p className="text-[9px] text-[#94A3B8] uppercase">Length</p>
                        <p className="text-xs font-bold text-[#002855]">{a.cargo_length} ft</p>
                      </div>
                      <div className="bg-[#F8FAFC] rounded p-1.5">
                        <p className="text-[9px] text-[#94A3B8] uppercase">Eff. WLL</p>
                        <p className={`text-xs font-bold ${pct >= 100 ? "text-emerald-600" : "text-[#EF4444]"}`}>{a.total_effective_wll?.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#F8FAFC] rounded p-1.5">
                        <p className="text-[9px] text-[#94A3B8] uppercase">Req. WLL</p>
                        <p className="text-xs font-bold text-[#002855]">{a.required_wll?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {a.tiedowns?.map((td, i) => (
                        <div key={i} className={`flex items-center justify-between text-[11px] px-2 py-1 rounded ${td.defective ? "bg-red-50 text-red-400 line-through" : "bg-[#FAFBFC]"}`}>
                          <span className="font-medium">{i + 1}. {td.type}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${td.method === "indirect" ? "bg-emerald-100 text-emerald-700" : "bg-[#002855]/10 text-[#002855]"}`}>
                              {td.method === "indirect" ? "INDIRECT 100%" : "DIRECT 50%"}
                            </span>
                            {td.defective && <span className="text-[9px] font-bold text-red-500">DEF</span>}
                            <span className="font-bold w-14 text-right">{td.effective_wll?.toLocaleString()} lbs</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] text-[#94A3B8] mt-2">
                      {a.created_at?.slice(0, 16).replace("T", " ")} | {a.active_count} active, {a.defective_count} defective | Min: {a.min_tiedowns} | Req: {a.required_wll?.toLocaleString()} lbs
                    </p>

                    {/* Assessment photos */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {a.photos?.map((photo) => (
                        <div key={photo.photo_id} className="relative group">
                          <DevicePhoto
                            photoId={photo.photo_id}
                            alt={photo.original_filename}
                            className="w-16 h-16 object-cover rounded-md border cursor-pointer"
                            onClick={() => setPreviewPhoto(photo.photo_id)}
                          />
                          <button
                            onClick={() => removeAssessmentPhoto(a.assessment_id, photo.photo_id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                          >
                            <XCircle className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Tie-Down assessment "Add photo" hidden pre-launch */}
                    <button
                      onClick={() => navigate("/calculator", { state: { recreateTiedown: a } })}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[#002855] text-white text-[11px] font-bold hover:bg-[#001a3a] transition-colors"
                      data-testid={`recreate-tiedown-${a.assessment_id}`}
                    >
                      <Repeat className="w-3 h-3" /> Recreate in Tie-Down Calculator
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ELP (English Language Proficiency) Assessments */}
        {inspection.elp_assessments?.length > 0 && (
          <div data-testid="elp-assessments-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                ELP Assessments ({inspection.elp_assessments.length})
              </span>
            </div>
            <div className="space-y-3">
              {inspection.elp_assessments.map((a) => {
                const interviewItems = (a.interview_answers || []).filter((q) => q.result);
                const signItems = (a.sign_answers || []).filter((s) => s.result);
                const interviewFails = interviewItems.filter((q) => q.result === "fail").length;
                const interviewInconclusive = interviewItems.filter((q) => q.result === "inconclusive").length;
                const interviewPasses = interviewItems.filter((q) => q.result === "pass").length;
                const signFails = signItems.filter((s) => s.result === "fail").length;
                const signPasses = signItems.filter((s) => s.result === "pass").length;
                const proficient = a.overall_disposition === "proficient";
                return (
                  <div key={a.assessment_id} className="bg-white rounded-lg border p-3" data-testid={`elp-assessment-${a.assessment_id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Languages className="w-4 h-4 text-[#002855]" />
                        <span className="text-sm font-bold text-[#002855]">ELP Assessment</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${proficient ? "bg-emerald-100 text-emerald-700" : a.overall_disposition === "not_proficient" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {proficient ? "PROFICIENT" : a.overall_disposition === "not_proficient" ? "NOT PROFICIENT" : "PENDING"}
                        </span>
                        {a.driver_name && (
                          <span className="text-[10.5px] text-[#475569]">· {a.driver_name}</span>
                        )}
                      </div>
                      <button onClick={() => removeElp(a.assessment_id)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors flex-shrink-0" data-testid={`remove-elp-${a.assessment_id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {a.interview_administered && (
                        <div className="bg-[#F8FAFC] rounded p-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Test 1 — Interview</p>
                          <p className="text-xs font-bold text-[#002855]">{interviewItems.length} answered</p>
                          <p className="text-[10.5px] text-[#475569]">
                            <span className="text-emerald-700 font-bold">{interviewPasses} pass</span>
                            <span className="mx-1">·</span>
                            <span className="text-amber-700 font-bold">{interviewInconclusive} inc.</span>
                            <span className="mx-1">·</span>
                            <span className="text-red-700 font-bold">{interviewFails} fail</span>
                          </p>
                        </div>
                      )}
                      {a.signs_administered && (
                        <div className="bg-[#F8FAFC] rounded p-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Test 2 — Sign Recognition</p>
                          <p className="text-xs font-bold text-[#002855]">{signItems.length} signs</p>
                          <p className="text-[10.5px] text-[#475569]">
                            <span className="text-emerald-700 font-bold">{signPasses} pass</span>
                            <span className="mx-1">·</span>
                            <span className="text-red-700 font-bold">{signFails} fail</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {a.overall_disposition === "not_proficient" && a.citation_ref && (
                      <div className="rounded border-l-[3px] border-[#DC2626] bg-[#FEE2E2] px-2 py-1.5 mb-2">
                        <p className="text-[10.5px] text-[#7F1D1D]">
                          <span className="font-bold">Citation:</span> {a.citation_ref} — Driver lacks sufficient English language proficiency
                        </p>
                      </div>
                    )}

                    {a.inspector_notes && (
                      <div className="bg-[#FAFBFC] rounded px-2 py-1.5 mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Inspector Notes</p>
                        <p className="text-[11px] text-[#334155] whitespace-pre-wrap">{a.inspector_notes}</p>
                      </div>
                    )}

                    <p className="text-[9px] text-[#94A3B8]">
                      {a.created_at?.slice(0, 16).replace("T", " ")}
                      {a.cdl_number ? ` | CDL ${a.cdl_number}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HOS Recaps */}
        {inspection.hos_assessments?.length > 0 && (
          <div data-testid="hos-assessments-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Hours of Service ({inspection.hos_assessments.length})
              </span>
            </div>
            <div className="space-y-3">
              {inspection.hos_assessments.map((a) => (
                <div key={a.assessment_id} className="bg-white rounded-lg border p-3" data-testid={`hos-assessment-${a.assessment_id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Hourglass className="w-4 h-4 text-[#002855]" />
                      <span className="text-sm font-bold text-[#002855]">HOS Recap</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#002855]/10 text-[#002855]">
                        {a.rule_type === "passenger" ? "PASS · 60" : "PROP · 70"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.is_oos ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {a.is_oos ? "OUT OF SERVICE" : "WITHIN LIMIT"}
                      </span>
                    </div>
                    <button onClick={() => removeHos(a.assessment_id)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors flex-shrink-0" data-testid={`remove-hos-${a.assessment_id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2 text-center">
                    <div className="bg-[#F8FAFC] rounded p-1.5">
                      <p className="text-[9px] text-[#94A3B8] uppercase">Total</p>
                      <p className={`text-xs font-bold ${a.is_oos ? "text-[#DC2626]" : "text-[#002855]"}`}>{a.total_hours?.toFixed(1)} / {a.limit_hours} hr</p>
                    </div>
                    <div className="bg-[#F8FAFC] rounded p-1.5">
                      <p className="text-[9px] text-[#94A3B8] uppercase">{a.is_oos ? "Over By" : "Available"}</p>
                      <p className={`text-xs font-bold ${a.is_oos ? "text-[#DC2626]" : "text-emerald-600"}`}>
                        {a.is_oos ? `+${a.over_by?.toFixed(1)}` : `${((a.limit_hours || 0) - (a.total_hours || 0)).toFixed(1)}`} hr
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] rounded p-1.5">
                      <p className="text-[9px] text-[#94A3B8] uppercase">Rest Needed</p>
                      <p className="text-xs font-bold text-[#002855]">
                        {a.recommend_restart ? "34-hr Restart" : (a.oos_duration != null ? `${a.oos_duration.toFixed(1)} hr` : "—")}
                      </p>
                    </div>
                  </div>

                  {a.days?.length > 0 && (
                    <div className="space-y-0.5 mb-1.5">
                      {a.days.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded bg-[#FAFBFC]">
                          <span className="font-medium text-[#475569]">{d.day_label} {d.date}</span>
                          <span className="font-bold text-[#002855] tabular-nums">{Number(d.total || 0).toFixed(1)} hr</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-[#94A3B8] mt-1">{a.created_at?.slice(0, 16).replace("T", " ")}</p>
                  <button
                    onClick={() => navigate("/hours-of-service", { state: { recreateHos: a } })}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[#002855] text-white text-[11px] font-bold hover:bg-[#001a3a] transition-colors"
                    data-testid={`recreate-hos-${a.assessment_id}`}
                  >
                    <Repeat className="w-3 h-3" /> Recreate in HOS Calculator
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weight Assessments — structured Bridge Chart recaps */}
        {inspection.weight_assessments?.length > 0 && (
          <div data-testid="weight-assessments-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Weight Assessments ({inspection.weight_assessments.length})
              </span>
            </div>
            <div className="space-y-3">
              {inspection.weight_assessments.map((a) => {
                const isOver = a.gross_max && a.gross_weight > a.gross_max;
                const hasViolations = a.violation_count > 0;
                // Recompute tolerance at render time: only applies when EXACTLY one
                // group/axle/tandem overage exists and we're in Bridge Formula mode.
                // Gross weight and interior bridge are NEVER subject to the 5% tolerance
                // and are NOT counted toward the one-violation threshold.
                let _overCount = 0;
                let _toleranceSavedOne = false;
                (a.group_violations || []).forEach((v) => {
                  if (v.max && v.actual > v.max) {
                    _overCount++;
                    if (v.actual <= v.max * 1.05) _toleranceSavedOne = true;
                  }
                  if (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max) {
                    _overCount++;
                    if (v.tandemCheck.actual <= v.tandemCheck.max * 1.05) _toleranceSavedOne = true;
                  }
                  (v.axleOverages || []).forEach((ao) => {
                    if ((ao.actual || 0) > (ao.max || 0)) {
                      _overCount++;
                      if (ao.actual <= ao.max * 1.05) _toleranceSavedOne = true;
                    }
                  });
                  (v.tandemSubsetChecks || []).forEach((t) => {
                    if (t.over) {
                      _overCount++;
                      if (t.actual <= t.max * 1.05) _toleranceSavedOne = true;
                    }
                  });
                });
                // Tolerance is "applied" only if eligible (1 overage, not custom) AND
                // that overage was actually forgiven (within 5%).
                const toleranceEligible = !a.is_custom && _overCount === 1;
                const toleranceApplies = toleranceEligible && _toleranceSavedOne;
                return (
                  <div key={a.assessment_id} className="bg-white rounded-lg border p-4" data-testid={`weight-assessment-${a.assessment_id}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Scale className="w-5 h-5 text-[#002855]" />
                        <span className="text-base font-bold text-[#002855]">Weight Report</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#002855]/10 text-[#002855]">
                          {a.mode_label || (a.is_custom ? "Custom" : "Bridge Formula")}
                        </span>
                        {!a.is_custom && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#92570D]">
                            {a.is_interstate ? "INTERSTATE" : "NON-INTERSTATE"}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${hasViolations ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {hasViolations ? `${a.violation_count} VIOLATION${a.violation_count === 1 ? "" : "S"}` : "COMPLIANT"}
                        </span>
                      </div>
                      <button onClick={() => removeWeight(a.assessment_id)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors flex-shrink-0" data-testid={`remove-weight-${a.assessment_id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Uniform 3-stat row */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="bg-[#F8FAFC] rounded p-2">
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Gross Weight</p>
                        <p className={`text-base font-bold ${isOver ? "text-[#DC2626]" : "text-[#002855]"}`}>{a.gross_weight?.toLocaleString() || "—"} <span className="text-[10px] text-[#64748B] font-normal">lbs</span></p>
                      </div>
                      <div className="bg-[#F8FAFC] rounded p-2">
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Gross Max</p>
                        <p className="text-base font-bold text-[#002855]">{a.gross_max?.toLocaleString() || "—"} <span className="text-[10px] text-[#64748B] font-normal">lbs</span></p>
                      </div>
                      <div className="bg-[#F8FAFC] rounded p-2">
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Axles</p>
                        <p className="text-base font-bold text-[#002855]">{a.total_axles || 0}</p>
                      </div>
                    </div>

                    {/* Axle groups table */}
                    {a.groups?.length > 0 && (
                      <div className="mb-3 border border-[#E2E8F0] rounded-md overflow-hidden">
                        <div className="grid grid-cols-[1fr_70px_70px_90px] gap-2 px-3 py-1.5 bg-[#F8FAFC] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                          <div>Group</div>
                          <div className="text-center">Axles</div>
                          <div className="text-center">Dist</div>
                          <div className="text-right">Actual</div>
                        </div>
                        {a.groups.map((g, gi) => {
                          const axles = (parseInt(g.axles) || 0) + (g.dummyAxle ? 1 : 0);
                          const distStr = g.distFt ? `${g.distFt}'` : "—";
                          const actual = g.useGroup
                            ? (g.groupWeight ? Number(g.groupWeight) : 0)
                            : (g.weights || []).reduce((s, w) => s + (Number(w) || 0), 0);
                          // Determine legality for this group from saved violations
                          const v = (a.group_violations || [])[gi] || {};
                          const isGroupOver = (v.max && v.actual > v.max)
                            || (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max)
                            || (v.axleOverages || []).some((ao) => (ao.actual || 0) > (ao.max || 0))
                            || (v.tandemSubsetChecks || []).some((t) => t.over);
                          const hasRule = !!v.max || !!v.tandemCheck;
                          // Tolerance-saved styling (orange) when this single overage is within 5% and tolerance applies
                          const groupWithinTol = toleranceApplies && v.max && v.actual > v.max && v.actual <= v.max * 1.05;
                          const rowBg = isGroupOver
                            ? (groupWithinTol ? "bg-[#FFF7ED]" : "bg-[#FEF2F2]")
                            : hasRule ? "bg-[#F0FDF4]" : "";
                          const rowText = isGroupOver
                            ? (groupWithinTol ? "text-[#92400E]" : "text-[#991B1B]")
                            : hasRule ? "text-[#166534]" : "text-[#334155]";
                          const labelText = isGroupOver
                            ? (groupWithinTol ? "text-[#92400E]" : "text-[#991B1B]")
                            : hasRule ? "text-[#166534]" : "text-[#002855]";
                          return (
                            <div key={gi} className={`grid grid-cols-[1fr_70px_70px_90px] gap-2 px-3 py-1.5 border-t border-[#F1F5F9] text-xs ${rowBg} ${rowText}`}>
                              <div className="font-medium truncate flex items-center gap-1">
                                {hasRule && (
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isGroupOver ? (groupWithinTol ? "bg-[#F59E0B]" : "bg-[#DC2626]") : "bg-[#16A34A]"}`} />
                                )}
                                <span className={`font-bold ${labelText}`}>A{gi + 1}</span>
                                {g.label ? ` · ${g.label}` : ` · ${g.preset || "Group"}`}
                                {g.dummyAxle && <span className="ml-1 text-[10px] text-[#D4AF37]">+dummy</span>}
                              </div>
                              <div className="text-center">{axles || "—"}</div>
                              <div className="text-center">{distStr}</div>
                              <div className={`text-right font-bold ${labelText}`}>{actual > 0 ? actual.toLocaleString() : "—"}</div>
                            </div>
                          );
                        })}
                        {a.overall_dist_ft && (
                          <div className={`grid grid-cols-[1fr_70px_70px_90px] gap-2 px-3 py-1.5 border-t-2 border-[#002855] text-xs ${isOver ? "bg-[#FEF2F2] text-[#991B1B]" : "bg-[#F0FDF4] text-[#166534]"}`}>
                            <div className="font-bold flex items-center gap-1">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOver ? "bg-[#DC2626]" : "bg-[#16A34A]"}`} />
                              Overall (Gross)
                            </div>
                            <div className="text-center">{a.total_axles}</div>
                            <div className="text-center">{a.overall_dist_ft}'</div>
                            <div className="text-right font-bold">{a.gross_weight?.toLocaleString() || "—"}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calculation Details — mirrors the live Bridge Chart section */}
                    {(a.group_violations?.length > 0 || (a.interior && a.interior.enabled)) && a.gross_weight > 0 && (() => {
                      // Reconstruct axle numbering from saved groups for backward compatibility
                      const axleStart = (idx) => {
                        if (Array.isArray(a.axle_numbers) && a.axle_numbers[idx]?.start) return a.axle_numbers[idx].start;
                        let s = 1;
                        for (let k = 0; k < idx; k++) {
                          const gk = a.groups?.[k] || {};
                          s += (parseInt(gk.axles) || 0) + (gk.dummyAxle ? 1 : 0);
                        }
                        return s;
                      };
                      const grossSrcLabel = a.gross_source || (a.is_custom ? "Custom" : (a.overall_dist_ft && a.total_axles >= 2 ? `Bridge (${a.overall_dist_ft}ft, ${a.total_axles}ax)` : "Bridge formula"));
                      return (
                        <div className="mb-3 bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                          <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                            <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                              Calculation Details
                              {toleranceApplies && <span className="ml-2 text-[#D4AF37] normal-case">· 5% tolerance applied</span>}
                            </h3>
                          </div>
                          <div className="divide-y divide-[#F1F5F9]">
                            {a.group_violations?.map((v, i) => {
                              const g = a.groups?.[i] || {};
                              const baseN = v.baseN || (parseInt(g.axles) || 0);
                              const baseW = g.useGroup
                                ? (parseInt(g.groupWeight) || 0)
                                : (g.weights || []).slice(0, baseN).reduce((s, w) => s + (parseInt(w) || 0), 0);
                              const di = v.dummy || {};
                              const overVal = v.max && v.actual > v.max ? v.actual - v.max : 0;
                              const withinTol5 = v.max && v.actual > v.max && v.actual <= Math.round(v.max * 1.05) && toleranceApplies;
                              const start = axleStart(i);
                              const parts = [];
                              if (g.useGroup) parts.push(`${baseW.toLocaleString()} (combined)`);
                              else (g.weights || []).slice(0, baseN).forEach((w, k) => parts.push(`A${start + k}=${(parseInt(w) || 0).toLocaleString()}`));
                              if (di.hasDummy && di.dummyWeight > 0) parts.push(`A${start + baseN}(dummy)=${di.dummyWeight.toLocaleString()}`);
                              const sum = baseW + (di.dummyWeight || 0);
                              return (
                                <div key={i} className="px-4 py-2.5 text-[11px] leading-relaxed">
                                  <p className="font-bold text-[#002855] mb-0.5">{v.label || `A${i + 1}`} <span className="font-normal text-[#94A3B8]">· {baseN} axle{baseN > 1 ? "s" : ""}{di.hasDummy ? " + 1 dummy" : ""}</span></p>
                                  <p className="text-[#475569] font-mono">{parts.join(" + ")} = <strong>{sum.toLocaleString()} lbs</strong></p>
                                  {di.hasDummy && di.dummyWeight > 0 && (
                                    <p className={`mt-1 ${di.disregarded ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                                      Dummy discount check: {di.dummyWeight.toLocaleString()} meets 8,000? <strong>{di.dummyWeight >= 8000 ? "YES" : "NO"}</strong> · {di.dummyWeight.toLocaleString()} meets 8% of {a.gross_weight.toLocaleString()} ({Math.round(a.gross_weight * 0.08).toLocaleString()})? <strong>{di.dummyWeight >= a.gross_weight * 0.08 ? "YES" : "NO"}</strong> → {di.disregarded ? "DISREGARDED (neither threshold met)" : "COUNTS (at least one threshold met)"}
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
                                    <p key={`tsub-${t.pairIndex}`} className="mt-1 font-mono text-[#DC2626]">
                                      Tandem subset {t.label}: {t.actual.toLocaleString()} exceeds {t.max.toLocaleString()}{t.distFt ? ` (Bridge at ${t.distFt}ft)` : " (Standard 34,000)"} → <strong>+{t.overBy.toLocaleString()} OVER</strong>
                                    </p>
                                  ))}
                                </div>
                              );
                            })}
                            <div className="px-4 py-2.5 text-[11px] bg-[#F8FAFC]">
                              <p className="font-bold text-[#002855] mb-0.5">Gross Weight</p>
                              <p className="text-[#475569] font-mono">
                                {a.group_violations?.map((v, i) => `${v.label || `A${i + 1}`}=${(v.actual || 0).toLocaleString()}`).join(" + ")} = <strong>{a.gross_weight.toLocaleString()} lbs</strong>
                              </p>
                              {a.gross_max ? (
                                <p className={`mt-1 font-mono ${a.gross_weight > a.gross_max ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                                  {grossSrcLabel}: {a.gross_weight.toLocaleString()} {a.gross_weight > a.gross_max ? "exceeds" : "within"} {a.gross_max.toLocaleString()} → <strong>{a.gross_weight > a.gross_max ? `+${(a.gross_weight - a.gross_max).toLocaleString()} OVER (no tolerance on gross)` : "LEGAL"}</strong>
                                </p>
                              ) : (
                                <p className="mt-1 text-[#94A3B8] italic">No gross max recorded.</p>
                              )}
                            </div>
                            {a.interior?.enabled && (
                              <div className="px-4 py-2.5 text-[11px]">
                                <p className="font-bold text-[#002855] mb-0.5">Interior Bridge <span className="font-normal text-[#94A3B8]">· A{a.interior.startAxleNum} → A{a.interior.endAxleNum} ({a.interior.axleCount} axles)</span></p>
                                <p className="text-[#475569] font-mono">
                                  Gross {a.gross_weight.toLocaleString()} − A{a.interior.startAxleNum - 1} ({(a.interior.a1Weight || 0).toLocaleString()}) = <strong>{(a.interior.actual || 0).toLocaleString()} lbs</strong>
                                </p>
                                {a.interior.max ? (
                                  <p className={`mt-1 font-mono ${a.interior.over ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                                    {a.interior.source}: {(a.interior.actual || 0).toLocaleString()} {a.interior.over ? "exceeds" : "within"} {a.interior.max.toLocaleString()} → <strong>{a.interior.over ? `+${(a.interior.overBy || 0).toLocaleString()} OVER` : "LEGAL"}</strong>
                                  </p>
                                ) : (
                                  <p className="mt-1 text-[#94A3B8] italic">No bridge data for {a.interior.distFt}ft / {a.interior.axleCount} axles.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Truck diagram (inline SVG) */}
                    {a.truck_diagram_svg && (
                      <div className="mb-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-2 overflow-x-auto">
                        <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Truck Diagram</div>
                        <div dangerouslySetInnerHTML={{ __html: a.truck_diagram_svg }} className="[&_svg]:max-w-full [&_svg]:h-auto" />
                      </div>
                    )}

                    <p className="text-[10px] text-[#94A3B8] mb-2">{a.created_at?.slice(0, 16).replace("T", " ")}</p>

                    <button
                      onClick={() => navigate("/bridge-chart", { state: { recreateWeight: a } })}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[#002855] text-white text-[11px] font-bold hover:bg-[#001a3a] transition-colors"
                      data-testid={`recreate-weight-${a.assessment_id}`}
                    >
                      <Repeat className="w-3 h-3" /> Recreate in Weights
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional Photos hidden pre-launch — agency review pending. */}
        {false && (inspection.general_photos || []).length > 0 && (
          <div data-testid="weight-photos-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Additional Photos ({inspection.general_photos.length})
              </span>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <div className="space-y-3">
                {inspection.general_photos.map((photo) => (
                  <div key={photo.photo_id} className="relative group" data-testid={`weight-photo-${photo.photo_id}`}>
                    <DevicePhoto
                      photoId={photo.photo_id}
                      alt={photo.original_filename || "Inspection photo"}
                      className="w-full rounded-md border cursor-pointer bg-white"
                      style={{ minHeight: 120 }}
                      onClick={() => setPreviewPhoto(photo.photo_id)}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeGeneralPhoto(photo.photo_id); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white text-[#CBD5E1] hover:text-[#DC2626] rounded-full flex items-center justify-center shadow-md border border-[#E2E8F0] transition-colors"
                      data-testid={`remove-weight-photo-${photo.photo_id}`}
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden report content for Email/Share PDF generation — rendered off-screen,
          so the Email button can attach a full PDF without opening the preview modal. */}
      <div ref={hiddenReportRef} aria-hidden="true" style={{ position: "absolute", left: -99999, top: 0, width: 700, padding: "20px 16px", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 13, color: "#0F172A", lineHeight: 1.6, background: "#fff", pointerEvents: "none" }}>
        <InspectionReportContent inspection={inspection} />
      </div>

      {/* Photo preview */}
      {/* PDF PREVIEW */}
      <PDFPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        title={inspection?.title || "Inspection Report"}
        filename={`inspection-${inspection?.title?.replace(/\s+/g, "-").toLowerCase() || id}-${new Date().toISOString().slice(0, 10)}`}
        hideShareButton
      >
        <InspectionReportContent inspection={inspection} />
      </PDFPreview>

      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            {previewPhotoUrl ? (
              <img src={previewPhotoUrl} alt="Photo" className="w-full h-auto max-h-[80vh] object-contain rounded" />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[#64748B]">
                <XCircle className="w-10 h-10 text-[#CBD5E1] mb-2" />
                <p className="text-sm font-semibold text-[#334155]">Photo not on this device</p>
                <p className="text-xs mt-1">Photos are stored only on the device they were captured on.</p>
              </div>
            )}
            <Button onClick={() => setPreviewPhoto(null)} className="w-full mt-2 bg-[#002855] text-white">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
