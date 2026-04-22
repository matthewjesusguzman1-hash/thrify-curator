import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, ChevronRight, ClipboardList, ChevronLeft, CheckSquare, Square, X, Share2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Toaster, toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";
import { InspectionReportContent } from "../components/app/ReportContent";
import { generatePDFBlob, sharePDFBlob, finalizePdf, jsPDF } from "../lib/pdfShare";
import { markInspectionExported } from "../lib/storageManager";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hidden off-screen container that we render one inspection's report into so
// html2canvas can capture it. Using a portal on document.body sidesteps any
// scroll container clipping issues.
function HiddenReport({ inspection, bulkMeta, containerRef }) {
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
      {/* Bulk separator banner — prints as the first block on each
          inspection's page(s) so the combined PDF has obvious dividers. */}
      {bulkMeta && (
        <div
          data-pdf-section="bulk-banner"
          style={{
            borderRadius: 8,
            border: "2px solid #D4AF37",
            background: "linear-gradient(135deg, #002855 0%, #001a3a 100%)",
            color: "#fff",
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#D4AF37", textTransform: "uppercase" }}>
              Inspection {bulkMeta.index} of {bulkMeta.total}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              {inspection.title || "Untitled inspection"}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#8FAEC5" }}>
            <div>Badge {inspection.badge || "—"}</div>
            <div>{(inspection.created_at || "").slice(0, 10)}</div>
          </div>
        </div>
      )}
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
  const [bulkMeta, setBulkMeta] = useState(null); // { index, total } during bulk export
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
   * Bulk export entry point. When 2+ are selected, asks the user whether
   * they want a single combined PDF or one file per inspection, then routes.
   */
  const [bulkModeChooser, setBulkModeChooser] = useState(false);

  const startBulkShare = () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size === 1) {
      runBulkExport("combined");
      return;
    }
    setBulkModeChooser(true);
  };

  /**
   * Bulk export flow.
   *   mode = "combined" → one PDF with all inspections, page break between.
   *   mode = "separate" → one PDF per inspection, shared via Web Share with
   *     multiple files (iOS 15+ / Chrome Android support this). Falls back to
   *     sequential downloads when multi-file share is unavailable.
   */
  const runBulkExport = async (mode = "combined") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkModeChooser(false);
    setBulkExporting(true);
    setBulkProgress({ current: 0, total: ids.length, title: "" });

    const combined = mode === "combined" ? new jsPDF("p", "mm", "a4") : null;
    const separateFiles = []; // [{ name, blob }]
    let successCount = 0;
    let firstTitle = "";

    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        let full;
        try {
          const res = await axios.get(`${API}/inspections/${id}`);
          full = res.data;
        } catch {
          toast.error(`Skipped one inspection — could not load`);
          continue;
        }
        setBulkProgress({ current: i + 1, total: ids.length, title: full.title || "Inspection" });
        if (i === 0) firstTitle = full.title || "";
        // Banner only in combined mode; separate PDFs already have their own headers.
        setBulkMeta(mode === "combined" ? { index: i + 1, total: ids.length } : null);
        setRenderQueue(full);
        await new Promise((r) => setTimeout(r, 400));
        if (!hiddenRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        try {
          if (mode === "combined") {
            await generatePDFBlob(hiddenRef.current, combined);
          } else {
            const blob = await generatePDFBlob(hiddenRef.current);
            const safeTitle = (full.title || `inspection-${i + 1}`).replace(/[^a-z0-9_\-]+/gi, "_");
            separateFiles.push({ name: `${safeTitle}.pdf`, blob });
          }
          successCount++;
        } catch (err) {
          console.error("PDF gen failed", err);
          toast.error(`Failed to add "${full.title || id}"`);
        }
      }
      setRenderQueue(null);
      setBulkMeta(null);

      if (successCount === 0) {
        toast.error("No PDFs were generated");
        return;
      }

      if (mode === "combined") {
        try { combined.deletePage(1); } catch { /* ignore */ }
        const blob = finalizePdf(combined);
        const dateTag = new Date().toISOString().slice(0, 10);
        const filename = successCount === 1
          ? `${(firstTitle || "inspection").replace(/[^a-z0-9_\-]+/gi, "_")}.pdf`
          : `inspections-${dateTag}-${successCount}.pdf`;
        await sharePDFBlob(blob, filename, {
          title: successCount === 1 ? firstTitle || "Inspection Report" : `${successCount} Inspection Reports`,
          text: successCount === 1 ? "Inspection Report" : `${successCount} inspections combined into one PDF`,
        });
      } else {
        // Separate files path
        const files = separateFiles.map(f => new File([f.blob], f.name, { type: "application/pdf" }));
        if (files.length === 1) {
          await sharePDFBlob(separateFiles[0].blob, separateFiles[0].name, {
            title: separateFiles[0].name.replace(/\.pdf$/i, ""),
            text: "Inspection Report",
          });
        } else if (navigator.canShare && navigator.canShare({ files })) {
          try {
            // Omit `text` on purpose — iOS writes it out as a separate .txt
            // snippet file when "Save to Files" is used.
            await navigator.share({ files, title: `${files.length} Inspection Reports` });
            // Successful share counts as an export.
            try { (await import("../lib/storageManager")).markInspectionExported(); } catch {}
          } catch (err) {
            if (err?.name !== "AbortError") {
              sequentialDownload(separateFiles);
            }
          }
        } else {
          sequentialDownload(separateFiles);
        }
      }
      exitSelectMode();
    } finally {
      setBulkExporting(false);
      setBulkProgress({ current: 0, total: 0, title: "" });
    }
  };

  // Fallback for browsers without multi-file Web Share — triggers one download
  // per file with a small delay between so the browser queues them properly.
  const sequentialDownload = async (files) => {
    for (let i = 0; i < files.length; i++) {
      const url = URL.createObjectURL(files[i].blob);
      const a = document.createElement("a");
      a.href = url; a.download = files[i].name; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      await new Promise((r) => setTimeout(r, 250));
    }
    try { (await import("../lib/storageManager")).markInspectionExported(); } catch {}
    toast.success(`${files.length} PDFs downloaded to your device`);
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

      {/* Floating bulk-export bar — raised above the Emergent watermark */}
      {selectMode && selectedCount > 0 && !bulkExporting && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[600px]">
          <div className="bg-white rounded-xl border-2 border-[#D4AF37] shadow-2xl p-3 flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-[#64748B]">Ready to share</p>
              <p className="text-sm font-bold text-[#002855]">{selectedCount} inspection{selectedCount === 1 ? "" : "s"}</p>
            </div>
            <Button
              onClick={startBulkShare}
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

      <HiddenReport inspection={renderQueue} bulkMeta={bulkMeta} containerRef={hiddenRef} />

      {/* Mode chooser — combined vs separate */}
      {bulkModeChooser && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" data-testid="bulk-mode-chooser" onClick={() => setBulkModeChooser(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-[440px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#002855] mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>How would you like to share?</h3>
            <p className="text-xs text-[#64748B] mb-4">{selectedCount} inspections selected</p>
            <div className="space-y-2">
              <button
                onClick={() => runBulkExport("separate")}
                className="w-full text-left rounded-lg border-2 border-[#D4AF37] bg-[#FFFBEB] hover:bg-[#FEF3C7] p-3 transition-colors"
                data-testid="bulk-mode-separate-btn"
              >
                <p className="text-sm font-bold text-[#002855]">Separate PDFs (recommended)</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">One file per inspection. Saves as individual files in your Files app or wherever you share them.</p>
              </button>
              <button
                onClick={() => runBulkExport("combined")}
                className="w-full text-left rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] p-3 transition-colors"
                data-testid="bulk-mode-combined-btn"
              >
                <p className="text-sm font-bold text-[#002855]">Combined PDF</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">All inspections merged into one file with page breaks between them. Good for emailing a whole shift as one attachment.</p>
              </button>
            </div>
            <button
              onClick={() => setBulkModeChooser(false)}
              className="w-full mt-3 py-2 text-xs text-[#64748B] hover:text-[#002855]"
              data-testid="bulk-mode-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
