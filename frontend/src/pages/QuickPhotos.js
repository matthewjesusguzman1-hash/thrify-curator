import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, Camera, Upload, Trash2, Pencil, FolderPlus, Check, Plus, X, Share2, Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { toast, Toaster } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { savePhoto as savePhotoToDevice, deletePhoto as deletePhotoFromDevice, getPhotoBlob } from "../lib/devicePhotos";
import { DevicePhoto } from "../components/app/DevicePhoto";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * QuickPhotos — rapid field documentation page.
 *
 * Flow:
 *   1. Tap "Take Photo" (camera) or "Choose" (library) — can add many in a row.
 *   2. Each captured photo lands in a grid with its own note textarea.
 *   3. When done, tap "Save all to Inspection" → pick / create inspection →
 *      every photo's blob is already on-device (IndexedDB); metadata + per-
 *      photo note is posted to the inspection as general_photos with the
 *      note attached.
 *   4. Inspector can also tap "Annotate" on any photo to jump into the
 *      existing annotator for that specific photo.
 *
 * Photos and notes live only in component state until save. A draft store in
 * localStorage keeps them across page reloads so a dropped signal / phone
 * doze doesn't lose a session.
 */
const DRAFT_KEY = (badge) => `inspnav_quickphotos_draft_${badge || "anon"}`;

export default function QuickPhotos() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const [searchParams] = useSearchParams();
  const prefillInspection = searchParams.get("inspection");

  // Each photo = { photo_id (device), note, thumbUrl (object URL) }
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [loadingInsps, setLoadingInsps] = useState(false);
  const [newInspTitle, setNewInspTitle] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [previewId, setPreviewId] = useState(null); // photo_id being previewed

  const cameraRef = useRef(null);
  const libraryRef = useRef(null);

  // Restore draft on first load
  useEffect(() => {
    if (!badge) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(badge));
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!Array.isArray(draft) || draft.length === 0) return;
      setPhotos(draft.map((p) => ({ ...p, thumbUrl: null })));
    } catch { /* ignore */ }
  }, [badge]);

  // Persist draft (only photo_id + note; blobs live in IndexedDB already)
  useEffect(() => {
    if (!badge) return;
    try {
      const draft = photos.map(({ photo_id, note }) => ({ photo_id, note }));
      localStorage.setItem(DRAFT_KEY(badge), JSON.stringify(draft));
    } catch { /* ignore */ }
  }, [photos, badge]);

  // Resolve thumbnail object URLs lazily
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

  // Revoke any object URLs on unmount
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
        added.push({ photo_id: meta.photo_id, note: "", thumbUrl: null });
      } catch {
        toast.error(`Failed to save ${f.name}`);
      }
    }
    if (added.length > 0) {
      setPhotos((prev) => [...prev, ...added]);
      toast.success(`${added.length} photo${added.length === 1 ? "" : "s"} added`);
    }
  }, []);

  const updateNote = (pid, note) => {
    setPhotos((prev) => prev.map((p) => p.photo_id === pid ? { ...p, note } : p));
  };

  const removePhoto = async (pid) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.photo_id === pid);
      if (p?.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      return prev.filter((x) => x.photo_id !== pid);
    });
    try { await deletePhotoFromDevice(pid); } catch { /* ignore */ }
  };

  const clearAll = () => {
    if (photos.length === 0) return;
    if (!window.confirm(`Discard all ${photos.length} photo${photos.length === 1 ? "" : "s"} and notes?`)) return;
    photos.forEach((p) => {
      if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      deletePhotoFromDevice(p.photo_id).catch(() => {});
    });
    setPhotos([]);
  };

  const openPicker = async () => {
    if (photos.length === 0) {
      toast.message("Take or choose at least one photo first");
      return;
    }
    setShowPicker(true);
    setLoadingInsps(true);
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch { toast.error("Failed to load inspections"); }
    setLoadingInsps(false);
  };

  const saveToInspection = async (inspectionId) => {
    setSaving(true);
    try {
      for (const p of photos) {
        const blob = await getPhotoBlob(p.photo_id);
        if (!blob) continue;
        // Attach metadata (photo binary stays on device).
        await axios.post(`${API}/inspections/${inspectionId}/annotated-photos`, {
          photo_id: p.photo_id,
          original_filename: `quickphoto-${new Date().toISOString().slice(0, 10)}.jpg`,
          mime: blob.type || "image/jpeg",
          size: blob.size || 0,
        });
        // Append the note to the inspection's general notes field.
        if (p.note && p.note.trim()) {
          const { data: insp } = await axios.get(`${API}/inspections/${inspectionId}`);
          const existing = (insp.notes || "").trim();
          const stamp = new Date().toLocaleString();
          const appended = `${existing ? existing + "\n\n" : ""}[Photo note · ${stamp}]\n${p.note.trim()}`;
          await axios.put(`${API}/inspections/${inspectionId}`, { notes: appended });
        }
      }
      toast.success(`${photos.length} photo${photos.length === 1 ? "" : "s"} added to inspection`);
      // Reset — the blobs are now "owned" by the inspection via its photo_ids,
      // so we clear our local state but leave the IndexedDB entries intact.
      photos.forEach((p) => p.thumbUrl && URL.revokeObjectURL(p.thumbUrl));
      setPhotos([]);
      setShowPicker(false);
      navigate(`/inspections/${inspectionId}`);
    } catch {
      toast.error("Failed to save — please try again");
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

  // If prefillInspection is in URL, save directly without picker.
  useEffect(() => {
    if (prefillInspection && photos.length > 0 && !showPicker && !saving) {
      // Ask the user — we don't want to silently dump photos.
    }
  }, [prefillInspection, photos.length, showPicker, saving]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-32" data-testid="quick-photos-page">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" data-testid="back-btn">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="flex-1 text-sm sm:text-base font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Quick Photos
            {photos.length > 0 && <span className="ml-2 text-[#D4AF37]">· {photos.length}</span>}
          </h1>
          {photos.length > 0 && (
            <button onClick={clearAll} className="text-[11px] text-white/60 hover:text-white" data-testid="clear-all-btn">Clear all</button>
          )}
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      <main className="max-w-[900px] mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Capture buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#D4AF37]/50 bg-gradient-to-br from-[#002855] to-[#001a3a] text-white py-5 hover:border-[#D4AF37] transition-colors"
            data-testid="take-photo-btn"
          >
            <Camera className="w-6 h-6 text-[#D4AF37]" />
            <span className="text-xs font-bold">Take Photo</span>
          </button>
          <button
            onClick={() => libraryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white text-[#002855] py-5 hover:border-[#002855] transition-colors"
            data-testid="choose-photo-btn"
          >
            <Upload className="w-6 h-6 text-[#64748B]" />
            <span className="text-xs font-bold">Choose Photos</span>
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* Photo grid with notes */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
            <Camera className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#334155]">No photos yet</p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Capture photos quickly, add a note for each, then save them all to an inspection.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="photo-grid">
            {photos.map((p, idx) => (
              <div key={p.photo_id} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div
                    className="relative sm:w-40 sm:h-40 w-full h-52 bg-[#F1F5F9] flex-shrink-0 cursor-pointer"
                    onClick={() => setPreviewId(p.photo_id)}
                    data-testid={`photo-${idx}`}
                  >
                    {p.thumbUrl ? (
                      <img src={p.thumbUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full animate-pulse bg-[#E2E8F0]" />
                    )}
                    <span className="absolute top-1.5 left-1.5 bg-[#002855] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">#{idx + 1}</span>
                  </div>

                  {/* Note + actions */}
                  <div className="flex-1 p-3 flex flex-col">
                    <textarea
                      value={p.note}
                      onChange={(e) => updateNote(p.photo_id, e.target.value)}
                      placeholder="Note for this photo… (what it shows, why it matters)"
                      className="flex-1 min-h-[88px] w-full resize-none text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] border-0 outline-none bg-transparent leading-relaxed"
                      data-testid={`note-${idx}`}
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                      <span className="text-[10px] text-[#94A3B8]">
                        {p.note.length} chars
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/photo-annotator?quickphoto=${p.photo_id}`)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#F1F5F9] text-[#475569] text-[10px] font-semibold hover:bg-[#E2E8F0]"
                          data-testid={`annotate-${idx}`}
                        >
                          <Pencil className="w-3 h-3" /> Annotate
                        </button>
                        <button
                          onClick={() => removePhoto(p.photo_id)}
                          className="p-1.5 rounded-md text-[#CBD5E1] hover:text-[#DC2626] hover:bg-[#FEE2E2]"
                          title="Remove photo"
                          data-testid={`remove-${idx}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Sticky save bar */}
      {photos.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[600px]">
          <div className="bg-white rounded-xl border-2 border-[#D4AF37] shadow-2xl p-3 flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-[#64748B]">Ready to save</p>
              <p className="text-sm font-bold text-[#002855]">
                {photos.length} photo{photos.length === 1 ? "" : "s"}
                {photos.some((p) => p.note.trim()) ? " · with notes" : ""}
              </p>
            </div>
            <Button
              onClick={openPicker}
              disabled={saving}
              className="bg-[#002855] text-white hover:bg-[#001a3a] h-11 px-5 font-bold"
              data-testid="save-to-inspection-btn"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Save to Inspection
            </Button>
          </div>
        </div>
      )}

      {/* Photo preview modal */}
      {previewId && (
        <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
          <DialogContent className="max-w-[92vw] max-h-[92vh] p-2">
            <DevicePhoto photoId={previewId} alt="Photo" className="w-full h-auto max-h-[82vh] object-contain rounded" />
            <Button onClick={() => setPreviewId(null)} className="w-full mt-2 bg-[#002855] text-white">Close</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Inspection picker */}
      <Dialog open={showPicker} onOpenChange={(o) => { if (!o) { setShowPicker(false); setCreatingNew(false); setNewInspTitle(""); } }}>
        <DialogContent className="max-w-[480px] w-[95vw] max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="inspection-picker">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Save photos to…</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowPicker(false)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-[#F8FAFC]">
            {saving && (
              <div className="flex items-center justify-center gap-2 py-3 mb-2 text-[#002855] text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving {photos.length} photo{photos.length === 1 ? "" : "s"}…
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
