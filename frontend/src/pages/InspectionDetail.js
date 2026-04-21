import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Header } from "../components/app/Header";
import { Plus, Trash2, ChevronLeft, Camera, FileText, Pencil, Check, X, Image, ShieldAlert, XCircle, Eye, Hourglass, Scale, Repeat } from "lucide-react";
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/inspections/${id}/violations/${itemId}/photos`, formData);
      fetchInspection();
      toast.success("Photo added");
    } catch {
      toast.error("Photo upload failed");
    }
  };

  const removePhoto = async (itemId, photoId) => {
    await axios.delete(`${API}/inspections/${id}/violations/${itemId}/photos/${photoId}`);
    fetchInspection();
  };

  const removeTiedown = async (assessmentId) => {
    await axios.delete(`${API}/inspections/${id}/tiedown/${assessmentId}`);
    fetchInspection();
    toast.success("Tie-down assessment removed");
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
      fetchInspection();
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleAssessmentPhotoUpload = async (assessmentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/inspections/${id}/tiedown/${assessmentId}/photos`, formData);
      fetchInspection();
      toast.success("Photo added to assessment");
    } catch {
      toast.error("Photo upload failed");
    }
  };

  const removeAssessmentPhoto = async (assessmentId, photoId) => {
    await axios.delete(`${API}/inspections/${id}/tiedown/${assessmentId}/photos/${photoId}`);
    fetchInspection();
  };

  const handleExport = (includePhotos) => {
    const url = `${API}/inspections/${id}/export?include_photos=${includePhotos ? "Y" : "N"}`;
    window.open(url, "_blank");
  };

  const handleEmail = () => {
    const exportUrl = `${API}/inspections/${id}/export?include_photos=Y`;
    const subject = encodeURIComponent(inspection?.title || "Inspection Report");
    const body = encodeURIComponent(`Inspection Report: ${inspection?.title}\n\nView the full report here:\n${exportUrl}\n\nViolations: ${inspection?.items?.length || 0}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

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
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview &amp; Export
          </Button>
          <Button size="sm" onClick={handleEmail} variant="outline" className="border-[#D4AF37] text-[#002855] hover:bg-[#D4AF37]/10 h-8 text-xs flex-1 sm:flex-none" data-testid="email-btn">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Email
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

                  {/* Photos */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.photos?.map((photo) => (
                      <div key={photo.photo_id} className="relative group">
                        <img
                          src={`${API}/files/${photo.storage_path}`}
                          alt={photo.original_filename}
                          className="w-16 h-16 object-cover rounded-md border cursor-pointer"
                          onClick={() => setPreviewPhoto(`${API}/files/${photo.storage_path}`)}
                        />
                        {photo.annotations?.length > 0 && (
                          <div className="absolute top-0 left-0 w-3 h-3 bg-[#D4AF37] rounded-full border border-white" title="Has annotations" />
                        )}
                        <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 sm:opacity-100">
                          <button
                            onClick={() => navigate(`/photo-annotator?inspection=${inspection.id}&photo=${photo.photo_id}&path=${encodeURIComponent(photo.storage_path)}`)}
                            className="w-4 h-4 bg-[#002855] text-white rounded-full flex items-center justify-center text-[8px]"
                            title="Edit annotations"
                            data-testid={`edit-photo-${photo.photo_id}`}
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
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

                  {/* Add photo button */}
                  <label className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#002855] cursor-pointer transition-colors">
                    <Camera className="w-3 h-3" />
                    <span>Add photo</span>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(item.item_id, e)} className="hidden" />
                  </label>
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
                        <p className="text-[9px] text-[#94A3B8] uppercase">WLL %</p>
                        <p className={`text-xs font-bold ${pct >= 100 ? "text-emerald-600" : "text-[#EF4444]"}`}>{pct}%</p>
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
                          <img
                            src={`${API}/files/${photo.storage_path}`}
                            alt={photo.original_filename}
                            className="w-16 h-16 object-cover rounded-md border cursor-pointer"
                            onClick={() => setPreviewPhoto(`${API}/files/${photo.storage_path}`)}
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
                    <label className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#002855] cursor-pointer transition-colors mt-1">
                      <Camera className="w-3 h-3" />
                      <span>Add photo</span>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleAssessmentPhotoUpload(a.assessment_id, e)} className="hidden" />
                    </label>
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
                          return (
                            <div key={gi} className="grid grid-cols-[1fr_70px_70px_90px] gap-2 px-3 py-1.5 border-t border-[#F1F5F9] text-xs">
                              <div className="font-medium text-[#334155] truncate">
                                <span className="font-bold text-[#002855]">A{gi + 1}</span>
                                {g.label ? ` · ${g.label}` : ` · ${g.preset || "Group"}`}
                                {g.dummyAxle && <span className="ml-1 text-[10px] text-[#D4AF37]">+dummy</span>}
                              </div>
                              <div className="text-center text-[#475569]">{axles || "—"}</div>
                              <div className="text-center text-[#475569]">{distStr}</div>
                              <div className="text-right font-bold text-[#002855]">{actual > 0 ? actual.toLocaleString() : "—"}</div>
                            </div>
                          );
                        })}
                        {a.overall_dist_ft && (
                          <div className="grid grid-cols-[1fr_70px_70px_90px] gap-2 px-3 py-1.5 border-t-2 border-[#002855] bg-[#F8FAFC] text-xs">
                            <div className="font-bold text-[#002855]">Overall</div>
                            <div className="text-center text-[#475569]">{a.total_axles}</div>
                            <div className="text-center text-[#475569]">{a.overall_dist_ft}'</div>
                            <div className="text-right font-bold text-[#002855]">{a.gross_weight?.toLocaleString() || "—"}</div>
                          </div>
                        )}
                      </div>
                    )}

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

        {/* Additional Photos — inspector-taken camera photos */}
        {(inspection.general_photos || []).length > 0 && (
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
                    <img
                      src={`${API}/files/${photo.storage_path}`}
                      alt={photo.original_filename || "Inspection photo"}
                      className="w-full rounded-md border cursor-pointer bg-white"
                      onClick={() => setPreviewPhoto(`${API}/files/${photo.storage_path}`)}
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

      {/* Photo preview */}
      {/* PDF PREVIEW */}
      <PDFPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        title={inspection?.title || "Inspection Report"}
        filename={`inspection-${inspection?.title?.replace(/\s+/g, "-").toLowerCase() || id}-${new Date().toISOString().slice(0, 10)}`}
      >
        <InspectionReportContent inspection={inspection} />
      </PDFPreview>

      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            <img src={previewPhoto} alt="Photo" className="w-full h-auto max-h-[80vh] object-contain rounded" />
            <Button onClick={() => setPreviewPhoto(null)} className="w-full mt-2 bg-[#002855] text-white">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
