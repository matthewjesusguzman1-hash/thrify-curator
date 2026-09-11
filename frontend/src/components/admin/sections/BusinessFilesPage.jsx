import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FolderOpen, Upload, Search, Tag, Trash2, FileText, Image as ImageIcon,
  Eye, Edit2, X, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Printer, Plus, Loader2,
  Landmark, ShieldCheck, FileCheck, Receipt, Scale, FolderClosed, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const FOLDER_ICONS = {
  "All": FolderOpen,
  "Banking": Landmark,
  "Licenses": ShieldCheck,
  "Insurance": FileCheck,
  "Tax": Receipt,
  "Legal": Scale,
  "Receipts": Receipt,
  "Other": FolderClosed,
};

const FOLDER_COLORS = {
  "All": "#00D4FF",
  "Banking": "#10B981",
  "Licenses": "#8B5CF6",
  "Insurance": "#F59E0B",
  "Tax": "#EF4444",
  "Legal": "#6366F1",
  "Receipts": "#F97316",
  "Other": "#6B7280",
};

export default function BusinessFilesPage({ getAuthHeader }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [activeFolder, setActiveFolder] = useState("All");
  const [activeTag, setActiveTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [uploadFolder, setUploadFolder] = useState("Other");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFolder && activeFolder !== "All") params.set("folder", activeFolder);
      if (activeTag) params.set("tag", activeTag);
      if (searchQuery) params.set("q", searchQuery);
      const res = await axios.get(`${API}/documents?${params}`, getAuthHeader());
      setDocuments(res.data.documents || []);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [activeFolder, activeTag, searchQuery, getAuthHeader]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/documents/folders`, getAuthHeader());
      setFolders(res.data.folders || []);
    } catch {}
  }, [getAuthHeader]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/documents/tags`, getAuthHeader());
      setAllTags(res.data.tags || []);
    } catch {}
  }, [getAuthHeader]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchFolders();
    fetchTags();
  }, [fetchFolders, fetchTags]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", uploadFolder);
        formData.append("tags", uploadTags);
        formData.append("display_name", uploadName);
        await axios.post(`${API}/documents/upload`, formData, {
          ...getAuthHeader(),
          headers: { ...getAuthHeader().headers, "Content-Type": "multipart/form-data" },
        });
        successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
      fetchDocuments();
      fetchFolders();
      fetchTags();
    }
    setUploading(false);
    setShowUploadForm(false);
    setUploadName("");
    setUploadTags("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files?.length > 0) handleUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDelete = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}`, getAuthHeader());
      toast.success("Document deleted");
      setDeleteConfirm(null);
      fetchDocuments();
      fetchFolders();
      fetchTags();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleUpdate = async (docId, updates) => {
    try {
      await axios.patch(`${API}/documents/${docId}`, updates, getAuthHeader());
      toast.success("Updated");
      setEditingDoc(null);
      fetchDocuments();
      fetchFolders();
      fetchTags();
    } catch {
      toast.error("Failed to update");
    }
  };

  const getFileUrl = (docId) =>
    `${API}/documents/${docId}/file?token=${localStorage.getItem("token")}`;

  const getPreviewUrl = (docId) =>
    `${API}/documents/${docId}/preview?token=${localStorage.getItem("token")}`;

  const printDocument = (doc) => {
    const url = getFileUrl(doc.id);
    const isImg = doc.content_type?.startsWith("image/");
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { toast.error("Pop-up blocked"); return; }
    win.document.write(`<html><head><title>Print</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:flex-start}img{max-width:100%;height:auto}iframe{width:100%;height:100vh;border:none}@media print{body{margin:0}}</style></head><body>
      ${isImg
        ? `<img src="${url}" onload="setTimeout(()=>{window.print()},300)" />`
        : `<iframe src="${url}" onload="setTimeout(()=>{window.print()},500)"></iframe>`
      }</body></html>`);
    win.document.close();
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Business Files</h2>
        <Button
          size="sm"
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-[#10B981] hover:bg-[#059669] text-white text-xs"
          data-testid="upload-document-btn"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Upload
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="p-4 rounded-xl border border-white/[0.08] bg-[#0f0f1a] space-y-3"
          data-testid="upload-form"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Folder</label>
              <select
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80"
                data-testid="upload-folder-select"
              >
                {["Banking", "Licenses", "Insurance", "Tax", "Legal", "Receipts", "Other"].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Name (optional)</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Auto-detect from file"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25"
                data-testid="upload-name-input"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Tags (comma-separated)</label>
              <input
                type="text"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g. chase, checking"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25"
                data-testid="upload-tags-input"
              />
            </div>
          </div>

          <div
            className="border-2 border-dashed border-white/[0.1] rounded-xl p-6 text-center cursor-pointer hover:border-[#10B981]/40 hover:bg-[#10B981]/[0.03] transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-white/50">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Uploading & scanning...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-white/20 mb-2" />
                <p className="text-sm text-white/40">Tap to select or drag & drop files</p>
                <p className="text-xs text-white/25 mt-1">PDF, images, documents up to 50MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
            data-testid="upload-file-input"
          />
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents, tags, or text inside files..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/[0.15]"
          data-testid="document-search-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Folder tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {folders.map(f => {
          const Icon = FOLDER_ICONS[f.name] || FolderClosed;
          const color = FOLDER_COLORS[f.name] || "#6B7280";
          const isActive = activeFolder === f.name;
          return (
            <button
              key={f.name}
              onClick={() => { setActiveFolder(f.name); setActiveTag(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-white/[0.1] text-white/90 border border-white/[0.15]"
                  : "bg-white/[0.03] text-white/40 border border-transparent hover:bg-white/[0.06] hover:text-white/60"
              }`}
              data-testid={`folder-tab-${f.name.toLowerCase()}`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? color : undefined }} />
              {f.name}
              {f.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/[0.1]" : "bg-white/[0.05]"}`}>
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tags filter */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {allTags.map(t => (
            <button
              key={t.name}
              onClick={() => setActiveTag(activeTag === t.name ? "" : t.name)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${
                activeTag === t.name
                  ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30"
                  : "bg-white/[0.03] text-white/35 border border-transparent hover:bg-white/[0.06]"
              }`}
              data-testid={`tag-filter-${t.name}`}
            >
              <Tag className="w-3 h-3" />
              {t.name}
              <span className="opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/30">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/30">
            {searchQuery ? "No documents match your search" : "No documents yet"}
          </p>
          <p className="text-xs text-white/20 mt-1">Upload business paperwork to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              previewDoc={previewDoc}
              setPreviewDoc={setPreviewDoc}
              editingDoc={editingDoc}
              setEditingDoc={setEditingDoc}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onPrint={printDocument}
              getFileUrl={getFileUrl}
              getPreviewUrl={getPreviewUrl}
              formatSize={formatSize}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  doc, previewDoc, setPreviewDoc, editingDoc, setEditingDoc,
  deleteConfirm, setDeleteConfirm, onDelete, onUpdate, onPrint,
  getFileUrl, getPreviewUrl, formatSize, formatDate,
}) {
  const [editName, setEditName] = useState(doc.display_name);
  const [editFolder, setEditFolder] = useState(doc.folder);
  const [editTags, setEditTags] = useState((doc.tags || []).join(", "));
  const [currentPage, setCurrentPage] = useState(0);
  const touchStartRef = useRef(null);
  const isExpanded = previewDoc === doc.id;
  const isEditing = editingDoc === doc.id;
  const isImage = doc.content_type?.startsWith("image/");
  const isPdf = doc.extension === "pdf";
  const hasPreview = isImage || isPdf;
  const pageCount = doc.page_count || 1;

  const FolderIcon = FOLDER_ICONS[doc.folder] || FolderClosed;
  const folderColor = FOLDER_COLORS[doc.folder] || "#6B7280";

  const goPage = (dir) => {
    setCurrentPage(p => Math.max(0, Math.min(pageCount - 1, p + dir)));
  };

  const handleTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goPage(diff > 0 ? 1 : -1);
    touchStartRef.current = null;
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const res = await fetch(getFileUrl(doc.id));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(getFileUrl(doc.id), "_blank");
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f0f1a] overflow-hidden" data-testid={`doc-row-${doc.id}`}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => { setPreviewDoc(isExpanded ? null : doc.id); setCurrentPage(0); }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${folderColor}15` }}>
          {isImage ? <ImageIcon className="w-4 h-4" style={{ color: folderColor }} /> : <FileText className="w-4 h-4" style={{ color: folderColor }} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/85 truncate font-medium">{doc.display_name}</p>
          <div className="flex items-center gap-2 text-xs text-white/35 mt-0.5">
            <span>{formatSize(doc.file_size)}</span>
            <span>{formatDate(doc.uploaded_at)}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${folderColor}15`, color: folderColor }}>
              {doc.folder}
            </span>
            {pageCount > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 text-[10px]">
                {pageCount} pages
              </span>
            )}
          </div>
          {doc.tags?.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {doc.tags.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] text-[10px]">{t}</span>
              ))}
            </div>
          )}
        </div>

        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/20 flex-shrink-0" />}

        {/* Action buttons */}
        <button
          onClick={(e) => { e.stopPropagation(); onPrint(doc); }}
          className="text-white/20 hover:text-[#00D4FF] transition-colors flex-shrink-0"
          title="Print"
          data-testid={`print-doc-${doc.id}`}
        >
          <Printer className="w-4 h-4" />
        </button>
        <button
          onClick={handleDownload}
          className="text-white/20 hover:text-[#10B981] transition-colors flex-shrink-0"
          title="Download"
          data-testid={`download-doc-${doc.id}`}
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setEditingDoc(isEditing ? null : doc.id); }}
          className="text-white/20 hover:text-[#F59E0B] transition-colors flex-shrink-0"
          title="Edit"
          data-testid={`edit-doc-${doc.id}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id); }}
          className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
          title="Delete"
          data-testid={`delete-doc-${doc.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm === doc.id && (
        <div className="px-3 py-2 bg-red-500/[0.08] border-t border-red-500/20 flex items-center justify-between">
          <span className="text-xs text-red-400">Delete this document permanently?</span>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-white/40 hover:text-white/70 px-2 py-1">Cancel</button>
            <button onClick={() => onDelete(doc.id)} className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-md hover:bg-red-500/20" data-testid={`confirm-delete-doc-${doc.id}`}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div className="px-3 py-3 bg-white/[0.02] border-t border-white/[0.06] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-white/40 block mb-0.5">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/80"
                data-testid={`edit-name-${doc.id}`}
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-0.5">Folder</label>
              <select
                value={editFolder}
                onChange={(e) => setEditFolder(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/80"
                data-testid={`edit-folder-${doc.id}`}
              >
                {["Banking", "Licenses", "Insurance", "Tax", "Legal", "Receipts", "Other"].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-0.5">Tags</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/80"
                placeholder="comma-separated"
                data-testid={`edit-tags-${doc.id}`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingDoc(null)} className="text-xs text-white/40 hover:text-white/70 px-3 py-1">Cancel</button>
            <button
              onClick={() => onUpdate(doc.id, { display_name: editName, folder: editFolder, tags: editTags })}
              className="text-xs bg-[#10B981]/20 text-[#10B981] px-3 py-1 rounded-md hover:bg-[#10B981]/30"
              data-testid={`save-edit-${doc.id}`}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Multi-page preview with swipe */}
      {isExpanded && hasPreview && (
        <div className="border-t border-white/[0.06] bg-white/[0.01]">
          <div
            className="relative touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            data-testid={`preview-container-${doc.id}`}
          >
            <img
              src={`${getPreviewUrl(doc.id)}&page=${currentPage}`}
              alt={`${doc.display_name} - Page ${currentPage + 1}`}
              className="max-w-full h-auto max-h-[500px] object-contain mx-auto block"
              data-testid={`preview-img-${doc.id}`}
            />

            {/* Page navigation arrows */}
            {pageCount > 1 && currentPage > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPage(-1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:bg-black/70 transition-colors"
                data-testid={`prev-page-${doc.id}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {pageCount > 1 && currentPage < pageCount - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/80 hover:bg-black/70 transition-colors"
                data-testid={`next-page-${doc.id}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Page indicator */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-xs text-white/40">
                Page {currentPage + 1} of {pageCount}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentPage ? "bg-[#00D4FF] w-4" : "bg-white/20 hover:bg-white/40"}`}
                    data-testid={`page-dot-${doc.id}-${i}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
