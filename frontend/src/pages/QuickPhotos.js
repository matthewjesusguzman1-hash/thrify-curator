import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, Camera, Upload, Trash2, Pencil, FolderPlus, Check, Plus, X, Share2, Loader2, NotebookPen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { toast, Toaster } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { savePhoto as savePhotoToDevice, deletePhoto as deletePhotoFromDevice, getPhotoBlob } from "../lib/devicePhotos";
import { DevicePhoto } from "../components/app/DevicePhoto";
import { generatePDFBlob, sharePDFBlob } from "../lib/pdfShare";
import { jsPDF } from "jspdf";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DRAFT_KEY = (badge) => `inspnav_quickphotos_draft_${badge || "anon"}`;

/**
 * QuickPhotos — storage-first rapid capture.
 *
 * Flow: tap "Take Photo" repeatedly to snap a batch → thumbnails fill a tight
 * grid → inspector reviews and decides per batch what to do:
 *   • Save to inspection (with or without per-photo notes)
 *   • Share as PDF contact sheet
 *   • Delete
 * Photos live in IndexedDB (device only) + a localStorage draft that survives
 * reloads until the inspector commits or clears.
 */
export default function QuickPhotos() {
  const navigate = useNavigate();
  const { badge } = useAuth();

  // Each item: { photo_id, note, thumbUrl, selected }
  const [photos, setPhotos] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [noteEditorId, setNoteEditorId] = useState(null); // photo currently open for note editing
  const [showPicker, setShowPicker] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [loadingInsps, setLoadingInsps] = useState(false);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef(null);
  const libraryRef = useRef(null);

  // Restore draft metadata
  useEffect(() => {
    if (!badge) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(badge));
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!Array.isArray(draft) || draft.length === 0) return;
      setPhotos(draft.map((p) => ({ ...p, thumbUrl: null, selected: false })));
    } catch { /* ignore */ }
  }, [badge]);

  // Persist draft (photo_id + note only)
  useEffect(() => {
    if (!badge) return;
    try {
      const draft = photos.map(({ photo_id, note }) => ({ photo_id, note: note || "" }));
      localStorage.setItem(DRAFT_KEY(badge), JSON.stringify(draft));
    } catch { /* ignore */ }
  }, [photos, badge]);

  // Load thumbnails lazily
  useEffect(() => {
    const missing = photos.filter((p) => !p.thumbUrl);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const p of missing) {
        const blob = await getPhotoBlob(p.photo_id);
        if (cancelled || !blob) continue;
        const url = URL.createObjectURL(blob);
        setPhotos((prev) => prev.map((x) => x.photo_id === p.photo_id ? { ...x, thumbUrl: url } : x));
      }
    })();
    return () => { cancelled = true; };
  }, [photos]);

  useEffect(() => () => {
    photos.forEach((p) => p.thumbUrl && URL.revokeObjectURL(p.thumbUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const added = [];
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const meta = await savePhotoToDevice(f, { category: "quickphoto", originalFilename: f.name });
        added.push({ photo_id: meta.photo_id, note: "", thumbUrl: null, selected: false });
      } catch { toast.error(`Failed to save ${f.name}`); }
    }
    if (added.length > 0) setPhotos((prev) => [...prev, ...added]);
  }, []);

  const updateNote = (pid, note) => {
    setPhotos((prev) => prev.map((p) => p.photo_id === pid ? { ...p, note } : p));
  };

  const removeOne = async (pid) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.photo_id === pid);
      if (p?.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      return prev.filter((x) => x.photo_id !== pid);
    });
    try { await deletePhotoFromDevice(pid); } catch { /* ignore */ }
  };

  const toggleSel = (pid) => {
    setPhotos((prev) => prev.map((p) => p.photo_id === pid ? { ...p, selected: !p.selected } : p));
  };

  const selectedItems = photos.filter((p) => p.selected);
  const activeItems = selectionMode && selectedItems.length > 0 ? selectedItems : photos;

  const discardSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Delete ${selectedItems.length} photo${selectedItems.length === 1 ? "" : "s"}?`)) return;
    for (const p of selectedItems) await removeOne(p.photo_id);
    setSelectionMode(false);
  };

  const clearAll = () => {
    if (photos.length === 0) return;
    if (!window.confirm(`Discard all ${photos.length} photos and notes?`)) return;
    photos.forEach((p) => {
      if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      deletePhotoFromDevice(p.photo_id).catch(() => {});
    });
    setPhotos([]);
    setSelectionMode(false);
  };

  const openPicker = async () => {
    if (photos.length === 0) return toast.message("Take a photo first");
    setShowPicker(true);
    setLoadingInsps(true);
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch { toast.error("Failed to load inspections"); }
    setLoadingInsps(false);
  };

  const saveToInspection = async (inspectionId) => {
    const targets = activeItems;
    setSaving(true);
    try {
      for (const p of targets) {
        const blob = await getPhotoBlob(p.photo_id);
        if (!blob) continue;
        await axios.post(`${API}/inspections/${inspectionId}/annotated-photos`, {
          photo_id: p.photo_id,
          original_filename: `quickphoto-${new Date().toISOString().slice(0, 10)}.jpg`,
          mime: blob.type || "image/jpeg",
          size: blob.size || 0,
        });
        if (p.note && p.note.trim()) {
          const { data: insp } = await axios.get(`${API}/inspections/${inspectionId}`);
          const existing = (insp.notes || "").trim();
          const stamp = new Date().toLocaleString();
          const appended = `${existing ? existing + "\n\n" : ""}[Photo note · ${stamp}]\n${p.note.trim()}`;
          await axios.put(`${API}/inspections/${inspectionId}`, { notes: appended });
        }
      }
      toast.success(`${targets.length} photo${targets.length === 1 ? "" : "s"} saved`);
      // Remove saved items from the local set (kept in IndexedDB under the inspection).
      const savedIds = new Set(targets.map((t) => t.photo_id));
      setPhotos((prev) => {
        prev.forEach((p) => {
          if (savedIds.has(p.photo_id) && p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
        });
        return prev.filter((p) => !savedIds.has(p.photo_id));
      });
      setShowPicker(false);
      setSelectionMode(false);
      navigate(`/inspections/${inspectionId}`);
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const createAndSave = async () => {
    const title = (newInspTitle || `Field photos · ${new Date().toLocaleDateString()}`).trim();
    setSaving(true);
    try {
      const { data: created } = await axios.post(`${API}/inspections`, { title, badge });
      await saveToInspection(created.id);
      setNewInspTitle("");
      setCreatingNew(false);
    } catch {
      toast.error("Failed to create inspection");
      setSaving(false);
    }
  };

  // Share the active set as a contact-sheet-style PDF for off-app retention
  const sharePhotos = async () => {
    const targets = activeItems;
    if (targets.length === 0) return;
    setSaving(true);
    try {
      // Build a simple multi-page PDF: one photo per page with its note below.
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      for (let i = 0; i < targets.length; i++) {
        if (i > 0) pdf.addPage();
        const t = targets[i];
        const blob = await getPhotoBlob(t.photo_id);
        if (!blob) continue;
        const dataUrl = await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.readAsDataURL(blob);
        });
        // Fit image into a square slot at top of page
        const slot = pageW - 2 * margin;
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`Photo ${i + 1} of ${targets.length}`, margin, margin + 4);
        try {
          pdf.addImage(dataUrl, "JPEG", margin, margin + 8, slot, Math.min(slot, pageH - 2 * margin - 40));
        } catch { /* ignore */ }
        if (t.note?.trim()) {
          pdf.setFontSize(10);
          pdf.setTextColor(30);
          const y = Math.min(pageH - margin - 25, margin + 8 + slot + 8);
          pdf.text("Note:", margin, y);
          pdf.setFontSize(9);
          const wrapped = pdf.splitTextToSize(t.note.trim(), pageW - 2 * margin);
          pdf.text(wrapped, margin, y + 5);
        }
      }
      const out = pdf.output("blob");
      const dateTag = new Date().toISOString().slice(0, 10);
      await sharePDFBlob(out, `field-photos-${dateTag}-${targets.length}.pdf`, {
        title: `${targets.length} field photo${targets.length === 1 ? "" : "s"}`,
      });
    } catch {
      toast.error("Failed to share");
    }
    setSaving(false);
  };

  const noteEditorPhoto = noteEditorId ? photos.find((p) => p.photo_id === noteEditorId) : null;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-32" data-testid="quick-photos-page">
      <Toaster position="top-right" richColors />

      <div className="sticky top-0 z-40 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" data-testid="back-btn">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="flex-1 text-sm sm:text-base font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Quick Photos
            {photos.length > 0 && <span className="ml-2 text-[#D4AF37]">· {photos.length}</span>}
          </h1>
          {photos.length > 0 && (
            <button
              onClick={() => setSelectionMode((v) => !v)}
              className={`text-[11px] font-bold px-2 py-1 rounded ${selectionMode ? "bg-[#D4AF37] text-[#002855]" : "text-[#D4AF37] hover:bg-white/10"}`}
              data-testid="toggle-select-btn"
            >
              {selectionMode ? `${selectedItems.length} selected` : "Select"}
            </button>
          )}
          {photos.length > 0 && !selectionMode && (
            <button onClick={clearAll} className="text-[11px] text-white/60 hover:text-white px-1" data-testid="clear-all-btn">Clear</button>
          )}
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      <main className="max-w-[900px] mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Capture row — always visible so back-to-back snapping stays fast */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-gradient-to-br from-[#002855] to-[#001a3a] text-white py-4 hover:border-[#D4AF37] transition-colors"
            data-testid="take-photo-btn"
          >
            <Camera className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-xs font-bold">Take Photo</span>
          </button>
          <button
            onClick={() => libraryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white text-[#002855] py-4 hover:border-[#002855] transition-colors"
            data-testid="choose-photo-btn"
          >
            <Upload className="w-5 h-5 text-[#64748B]" />
            <span className="text-xs font-bold">Choose Photos</span>
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* Storage-first GRID (compact thumbnails) */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
            <Camera className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#334155]">No photos yet</p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Take photos back-to-back, then review and decide what to do.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-testid="photo-grid">
            {photos.map((p, idx) => {
              const hasNote = !!(p.note && p.note.trim());
              const isSel = p.selected;
              return (
                <div
                  key={p.photo_id}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group ${isSel ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40" : "border-[#E2E8F0] hover:border-[#002855]/40"}`}
                  onClick={() => {
                    if (selectionMode) toggleSel(p.photo_id);
                    else setPreviewId(p.photo_id);
                  }}
                  data-testid={`photo-${idx}`}
                >
                  {p.thumbUrl ? (
                    <img src={p.thumbUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full animate-pulse bg-[#E2E8F0]" />
                  )}
                  {/* Index badge */}
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded">#{idx + 1}</span>
                  {/* Selection check */}
                  {selectionMode && (
                    <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${isSel ? "bg-[#D4AF37] text-[#002855]" : "bg-white/80 border border-white"}`}>
                      {isSel && <Check className="w-3 h-3" />}
                    </div>
                  )}
                  {/* Has-note indicator */}
                  {hasNote && !selectionMode && (
                    <div className="absolute bottom-1 left-1 bg-[#D4AF37] text-[#002855] rounded-full p-1" title="Has note">
                      <NotebookPen className="w-3 h-3" />
                    </div>
                  )}
                  {/* Quick-note FAB on hover / when not in selection mode */}
                  {!selectionMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setNoteEditorId(p.photo_id); }}
                      className="absolute bottom-1 right-1 bg-white/90 text-[#002855] rounded-full p-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shadow"
                      title={hasNote ? "Edit note" : "Add note"}
                      data-testid={`note-btn-${idx}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky action bar */}
      {photos.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[640px]">
          <div className="bg-white rounded-xl border-2 border-[#D4AF37] shadow-2xl p-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0 px-1">
              <p className="text-[10px] text-[#64748B] leading-tight">
                {selectionMode && selectedItems.length > 0 ? "Acting on selection" : "All photos"}
              </p>
              <p className="text-sm font-bold text-[#002855] leading-tight">
                {(selectionMode && selectedItems.length > 0 ? selectedItems.length : photos.length)} photo{(selectionMode && selectedItems.length > 0 ? selectedItems.length : photos.length) === 1 ? "" : "s"}
              </p>
            </div>
            {selectionMode && selectedItems.length > 0 && (
              <button onClick={discardSelected} disabled={saving} className="p-2.5 rounded-lg text-[#DC2626] hover:bg-[#FEE2E2]" title="Delete selection" data-testid="discard-selected-btn">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <Button
              onClick={sharePhotos}
              disabled={saving || activeItems.length === 0}
              variant="outline"
              className="border-[#D4AF37] text-[#002855] hover:bg-[#D4AF37]/10 h-10 px-3 font-bold text-xs"
              data-testid="share-photos-btn"
            >
              <Share2 className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              onClick={openPicker}
              disabled={saving || activeItems.length === 0}
              className="bg-[#002855] text-white hover:bg-[#001a3a] h-10 px-3 sm:px-5 font-bold text-xs"
              data-testid="save-to-inspection-btn"
            >
              <FolderPlus className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Save to Inspection</span>
              <span className="sm:hidden">Save</span>
            </Button>
          </div>
        </div>
      )}

      {/* Photo preview modal */}
      {previewId && (
        <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
          <DialogContent className="max-w-[92vw] max-h-[92vh] p-2 gap-2">
            <DevicePhoto photoId={previewId} alt="Photo" className="w-full h-auto max-h-[70vh] object-contain rounded" />
            {(() => {
              const p = photos.find((x) => x.photo_id === previewId);
              return (
                <>
                  {p?.note && <p className="text-xs text-[#334155] bg-[#F8FAFC] p-2 rounded border">{p.note}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setNoteEditorId(previewId); setPreviewId(null); }} data-testid="preview-edit-note">
                      <Pencil className="w-3.5 h-3.5 mr-1" /> {p?.note ? "Edit note" : "Add note"}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => { navigate(`/photo-annotator?quickphoto=${previewId}`); }} data-testid="preview-annotate">
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Annotate
                    </Button>
                    <Button variant="outline" className="text-[#DC2626] border-[#FECACA]" onClick={() => { removeOne(previewId); setPreviewId(null); }} data-testid="preview-delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button onClick={() => setPreviewId(null)} className="w-full bg-[#002855] text-white">Close</Button>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Note editor modal */}
      {noteEditorPhoto && (
        <Dialog open={!!noteEditorId} onOpenChange={() => setNoteEditorId(null)}>
          <DialogContent className="max-w-[520px] w-[95vw] p-0 gap-0 overflow-hidden rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855]">
              <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Photo note</h2>
              <Button variant="ghost" size="sm" onClick={() => setNoteEditorId(null)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-3 space-y-3">
              <DevicePhoto photoId={noteEditorPhoto.photo_id} alt="Photo" className="w-full h-40 object-cover rounded border" />
              <textarea
                value={noteEditorPhoto.note || ""}
                onChange={(e) => updateNote(noteEditorPhoto.photo_id, e.target.value)}
                placeholder="What does this show? Why does it matter?"
                className="w-full h-32 resize-none text-[13px] border border-[#E2E8F0] rounded-md p-2 outline-none focus:border-[#002855] bg-white"
                data-testid="note-editor-textarea"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setNoteEditorId(null)}>Cancel</Button>
                <Button className="flex-1 bg-[#002855] text-white" onClick={() => setNoteEditorId(null)} data-testid="note-editor-save">
                  <Check className="w-3.5 h-3.5 mr-1" /> Save note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Inspection picker */}
      <Dialog open={showPicker} onOpenChange={(o) => { if (!o) { setShowPicker(false); setCreatingNew(false); setNewInspTitle(""); } }}>
        <DialogContent className="max-w-[480px] w-[95vw] max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="inspection-picker">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              Save {activeItems.length} photo{activeItems.length === 1 ? "" : "s"} to…
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowPicker(false)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-[#F8FAFC]">
            {saving && (
              <div className="flex items-center justify-center gap-2 py-3 mb-2 text-[#002855] text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </div>
            )}
            {creatingNew ? (
              <div className="bg-white rounded-lg border border-[#D4AF37] p-3 mb-2">
                <input
                  value={newInspTitle}
                  onChange={(e) => setNewInspTitle(e.target.value)}
                  placeholder="New inspection title"
                  autoFocus
                  className="w-full text-sm px-2 py-1.5 border border-[#E2E8F0] rounded-md outline-none focus:border-[#002855]"
                  data-testid="new-insp-title"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={createAndSave} disabled={saving} className="flex-1 bg-[#002855] text-white h-8 text-xs" data-testid="create-and-save-btn">
                    <Check className="w-3.5 h-3.5 mr-1" /> Create & save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setCreatingNew(false); setNewInspTitle(""); }} className="h-8 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreatingNew(true)}
                disabled={saving}
                className="w-full bg-[#FFFBEB] border border-[#D4AF37] rounded-lg px-3 py-2.5 mb-2 flex items-center gap-2 hover:bg-[#FEF3C7] transition-colors disabled:opacity-50"
                data-testid="new-inspection-btn"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm font-bold text-[#002855]">New inspection with these photos</span>
              </button>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] px-1 mb-1.5">Existing inspections</p>
            {loadingInsps ? (
              <p className="text-center text-[11px] text-[#94A3B8] py-6">Loading…</p>
            ) : inspections.length === 0 ? (
              <p className="text-center text-[11px] text-[#94A3B8] italic py-6">No inspections yet — create one above.</p>
            ) : (
              <div className="space-y-1">
                {inspections.map((insp) => (
                  <button
                    key={insp.id}
                    onClick={() => saveToInspection(insp.id)}
                    disabled={saving}
                    className="w-full flex items-center gap-2 bg-white rounded-md border border-[#E2E8F0] p-2.5 text-left hover:border-[#002855]/40 hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                    data-testid={`pick-inspection-${insp.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#002855] truncate">{insp.title}</p>
                      <p className="text-[10px] text-[#64748B]">{insp.items?.length || 0} violations · {insp.created_at?.slice(0, 10)}</p>
                    </div>
                    <Share2 className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
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
