import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { zipSync, strToU8 } from "fflate";
import { Plus, Trash2, ChevronRight, ClipboardList, ChevronLeft, CheckSquare, Square, X, Share2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Toaster, toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { InspectionReportContent } from "../components/app/ReportContent";
import { generatePDFBlob, sharePDFBlob } from "../lib/pdfShare";
import { markInspectionExported } from "../lib/storageManager";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hidden off-screen container that we render one inspection's report into so
// html2canvas can capture it. Using a portal on document.body sidesteps any
// scroll container clipping issues.
function HiddenReport({ inspection, containerRef }) {
  if (!inspection) return null;
  return createPortal(
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: -99999,
        top: 0,
        width: 700,
        padding: "20px 16px",
        fontFamily: "'IBM Plex Sans', Arial, sans-serif",
        fontSize: 13,
        color: "#0F172A",
        lineHeight: 1.6,
        background: "#fff",
        pointerEvents: "none",
      }}
    >
      <InspectionReportContent inspection={inspection} />
    </div>,
    document.body
  );
}

export default function InspectionsPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, title: "" });
  const [renderQueue, setRenderQueue] = useState(null); // inspection currently being rendered off-screen
  const hiddenRef = useRef(null);

  const fetchInspections = async () => {
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch {
      toast.error("Failed to load inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInspections(); }, []); // eslint-disable-line

  const handleCreate = async () => {
    try {
      const res = await axios.post(`${API}/inspections`, {
        title: newTitle || undefined,
        badge,
      });
      setCreating(false);
      setNewTitle("");
      navigate(`/inspections/${res.data.id}`);
    } catch {
      toast.error("Failed to create inspection");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await axios.delete(`${API}/inspections/${id}`);
    fetchInspections();
    toast.success("Inspection deleted");
  };

  const toggleSelection = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(inspections.map((i) => i.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  /**
   * Bulk export flow:
   * 1. For each selected inspection, fetch its full record (so all nested data is present).
   * 2. Render it into the off-screen hidden div (via state → React renders → useEffect fires).
   * 3. Capture PDF via generatePDFBlob.
   * 4. If only 1 inspection → share the single PDF.
   *    If 2+ → add each PDF to a ZIP, then share the ZIP.
   */
  const runBulkExport = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkExporting(true);
    setBulkProgress({ current: 0, total: ids.length, title: "" });
    const pdfs = [];
    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        // Fetch full inspection
        let full;
        try {
          const res = await axios.get(`${API}/inspections/${id}`);
          full = res.data;
        } catch {
          toast.error(`Skipped one inspection — could not load`);
          continue;
        }
        setBulkProgress({ current: i + 1, total: ids.length, title: full.title || "Inspection" });
        // Render off-screen
        setRenderQueue(full);
        // Wait for the DOM to render + images/photos to resolve
        await new Promise((r) => setTimeout(r, 400));
        if (!hiddenRef.current) {
          toast.error("Report container not ready, retrying");
          await new Promise((r) => setTimeout(r, 200));
        }
        try {
          const blob = await generatePDFBlob(hiddenRef.current);
          const safeTitle = (full.title || "inspection").replace(/[^a-z0-9_\-]+/gi, "_");
          pdfs.push({ name: `${safeTitle}.pdf`, blob });
        } catch (err) {
          console.error("PDF gen failed", err);
          toast.error(`Failed to generate PDF for "${full.title || id}"`);
        }
      }
      setRenderQueue(null);

      if (pdfs.length === 0) {
        toast.error("No PDFs were generated");
        return;
      }

      if (pdfs.length === 1) {
        await sharePDFBlob(pdfs[0].blob, pdfs[0].name, {
          title: pdfs[0].name.replace(/\.pdf$/i, ""),
          text: "Inspection Report",
        });
      } else {
        // Build a ZIP with fflate (synchronous, no streaming needed for small report PDFs)
        const files = {};
        for (const p of pdfs) {
          const ab = await p.blob.arrayBuffer();
          files[p.name] = new Uint8Array(ab);
        }
        const zipped = zipSync(files, { level: 0 }); // level 0 — PDFs are already compressed
        const zipBlob = new Blob([zipped], { type: "application/zip" });
        const dateTag = new Date().toISOString().slice(0, 10);
        const zipName = `inspections-${dateTag}-${pdfs.length}.zip`;

        // Web Share with ZIP
        const file = new File([zipBlob], zipName, { type: "application/zip" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `${pdfs.length} Inspection Reports`, text: `${pdfs.length} inspection PDFs` });
            markInspectionExported();
          } catch (err) {
            if (err?.name !== "AbortError") {
              // Fallback to download
              downloadBlob(zipBlob, zipName);
              markInspectionExported();
            }
          }
        } else {
          // Fallback: download the ZIP
          downloadBlob(zipBlob, zipName);
          markInspectionExported();
          toast.success(`${pdfs.length} reports downloaded as a ZIP`);
        }
      }
      exitSelectMode();
    } finally {
      setBulkExporting(false);
      setBulkProgress({ current: 0, total: 0, title: "" });
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="inspections-page">
      <Toaster position="top-right" richColors />
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" data-testid="back-to-search-btn">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm sm:text-base font-semibold text-white flex-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Inspections
          </h1>
          {!selectMode ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectMode(true)}
              className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-white/10 h-8 text-xs font-bold"
              data-testid="enter-select-mode-btn"
              disabled={inspections.length === 0}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" /> Select
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={exitSelectMode}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 text-xs"
              data-testid="exit-select-mode-btn"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      <main className="max-w-[800px] mx-auto px-3 sm:px-6 py-4 pb-32 space-y-4">
        {/* Create new — hidden in select mode */}
        {!selectMode && (creating ? (
          <div className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Inspection title (optional)"
              className="text-sm h-9"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              data-testid="new-inspection-title"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} className="bg-[#002855] text-white hover:bg-[#001a3a] h-9" data-testid="create-inspection-btn">Create</Button>
              <Button size="sm" variant="outline" onClick={() => setCreating(false)} className="h-9">Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setCreating(true)} className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-10" data-testid="new-inspection-btn">
            <Plus className="w-4 h-4 mr-2" /> New Inspection
          </Button>
        ))}

        {/* Select-all row */}
        {selectMode && inspections.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg border px-3 py-2">
            <p className="text-xs text-[#64748B]">
              <strong className="text-[#002855]">{selectedCount}</strong> of {inspections.length} selected
            </p>
            <div className="flex gap-1.5">
              <button onClick={selectAll} className="text-[11px] font-semibold text-[#002855] hover:underline" data-testid="select-all-btn">Select all</button>
              <span className="text-[#CBD5E1]">·</span>
              <button onClick={clearSelection} className="text-[11px] font-semibold text-[#64748B] hover:underline" data-testid="clear-selection-btn">Clear</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <ClipboardList className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#334155]">No inspections yet</p>
            <p className="text-xs text-[#64748B] mt-1">Create one to start documenting violations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inspections.map((insp) => {
              const isSelected = selectedIds.has(insp.id);
              return (
                <div
                  key={insp.id}
                  onClick={(e) => {
                    if (selectMode) toggleSelection(insp.id, e);
                    else navigate(`/inspections/${insp.id}`);
                  }}
                  className={`bg-white rounded-lg border p-4 flex items-center gap-3 cursor-pointer active:bg-[#F8FAFC] transition-colors ${isSelected ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/30 bg-[#FFFBEB]" : "hover:border-[#002855]/30"}`}
                  data-testid={`inspection-card-${insp.id}`}
                >
                  {selectMode && (
                    <div className="flex-shrink-0" onClick={(e) => toggleSelection(insp.id, e)}>
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#D4AF37]" />
                      ) : (
                        <Square className="w-5 h-5 text-[#CBD5E1]" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#002855] truncate">{insp.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[#64748B]">
                      <span>{insp.items?.length || 0} violations</span>
                      <span>{insp.created_at?.slice(0, 10)}</span>
                      {insp.items?.some(i => i.oos_value === "Y") && (
                        <Badge variant="destructive" className="text-[8px] px-1 py-0 bg-[#DC2626] text-white">HAS OOS</Badge>
                      )}
                    </div>
                  </div>
                  {!selectMode && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={(e) => handleDelete(insp.id, e)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating bulk-export bar */}
      {selectMode && selectedCount > 0 && !bulkExporting && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[600px]">
          <div className="bg-white rounded-xl border-2 border-[#D4AF37] shadow-2xl p-3 flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-[#64748B]">Ready to share</p>
              <p className="text-sm font-bold text-[#002855]">{selectedCount} inspection{selectedCount === 1 ? "" : "s"}</p>
            </div>
            <Button
              onClick={runBulkExport}
              className="bg-[#002855] text-white hover:bg-[#001a3a] h-11 px-5 font-bold"
              data-testid="bulk-share-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* Bulk export progress modal */}
      {bulkExporting && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" data-testid="bulk-progress">
          <div className="bg-white rounded-xl p-6 w-full max-w-[440px] text-center shadow-2xl">
            <Loader2 className="w-8 h-8 text-[#002855] mx-auto mb-3 animate-spin" />
            <p className="text-sm font-bold text-[#002855]">Generating PDFs</p>
            <p className="text-xs text-[#64748B] mt-1">
              {bulkProgress.current} of {bulkProgress.total}
              {bulkProgress.title ? ` — ${bulkProgress.title}` : ""}
            </p>
            <div className="mt-3 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D4AF37] transition-all"
                style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-[#94A3B8] italic mt-3">
              Keep this tab open — photos pulled from device storage into each PDF.
            </p>
          </div>
        </div>
      )}

      <HiddenReport inspection={renderQueue} containerRef={hiddenRef} />
    </div>
  );
}
