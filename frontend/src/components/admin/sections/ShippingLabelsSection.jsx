import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, FileText, Trash2, Image as ImageIcon, Loader2,
  Check, Tag, ChevronDown, ChevronUp, Printer
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShippingLabelsSection({ getAuthHeader }) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  const [skuInput, setSkuInput] = useState("");
  const [previewId, setPreviewId] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const fileInputRef = useRef(null);
  const skuInputRef = useRef(null);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/orders/labels`, getAuthHeader());
      setLabels(data.labels || []);
    } catch (err) {
      toast.error("Failed to load labels");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let success = 0, failed = 0;
    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        await axios.post(`${API}/orders/labels/upload`, form, {
          headers: { ...getAuthHeader().headers, "Content-Type": "multipart/form-data" },
        });
        success++;
      } catch (err) { failed++; }
    }
    setUploading(false);
    if (success > 0) toast.success(`${success} label${success > 1 ? "s" : ""} uploaded`);
    if (failed > 0) toast.error(`${failed} failed`);
    fetchLabels();
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); uploadFiles(Array.from(e.dataTransfer.files)); };

  const handleDelete = async (labelId) => {
    try {
      await axios.delete(`${API}/orders/labels/${labelId}`, getAuthHeader());
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      toast.success("Deleted");
    } catch (err) { toast.error("Failed to delete"); }
  };

  const startSkuEdit = (label) => {
    setEditingSku(label.id);
    setSkuInput(label.sku_tag || "");
    setTimeout(() => skuInputRef.current?.focus(), 50);
  };

  const saveSku = async (labelId) => {
    try {
      await axios.patch(`${API}/orders/labels/${labelId}`, { sku_tag: skuInput }, getAuthHeader());
      setLabels((prev) => prev.map((l) => l.id === labelId ? { ...l, sku_tag: skuInput.trim().toUpperCase() } : l));
      setEditingSku(null);
      setSkuInput("");
    } catch (err) { toast.error("Failed to save SKU"); }
  };

  const handleSkuKeyDown = (e, labelId) => {
    if (e.key === "Enter") { e.preventDefault(); saveSku(labelId); }
    else if (e.key === "Escape") { setEditingSku(null); setSkuInput(""); }
  };

  const togglePreview = async (label) => {
    if (previewId === label.id) {
      setPreviewId(null);
      setPreviewBlob(null);
      return;
    }
    setPreviewId(label.id);
    setPreviewBlob(null);
    try {
      const token = localStorage.getItem("token");
      const url = `${API}/orders/labels/${label.id}/preview?token=${token}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      setPreviewBlob(URL.createObjectURL(blob));
    } catch (err) {
      toast.error("Failed to load preview");
      setPreviewId(null);
    }
  };

  const getLabelUrl = (labelId) =>
    `${API}/orders/labels/${labelId}/file?token=${localStorage.getItem("token")}`;

  const getPreviewUrl = (labelId) =>
    `${API}/orders/labels/${labelId}/preview?token=${localStorage.getItem("token")}`;

  const printLabel = (label) => {
    const url = getLabelUrl(label.id);
    const isImg = label.content_type?.startsWith("image/");
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { toast.error("Pop-up blocked — allow pop-ups to print"); return; }
    win.document.write(`
      <html><head><title>Print Label</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: flex-start; }
        img { max-width: 100%; height: auto; }
        iframe { width: 100%; height: 100vh; border: none; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${isImg
        ? `<img src="${url}" onload="setTimeout(()=>{window.print();},300)" />`
        : `<iframe src="${url}" onload="setTimeout(()=>{window.print();},500)"></iframe>`
      }
      </body></html>
    `);
    win.document.close();
  };

  const printAllLabels = () => {
    if (labels.length === 0) { toast.error("No labels to print"); return; }
    const token = localStorage.getItem("token");
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { toast.error("Pop-up blocked — allow pop-ups to print"); return; }
    const imgs = labels.map((l) =>
      `<div class="label-page"><img src="${API}/orders/labels/${l.id}/preview?token=${token}" /></div>`
    ).join("\n");
    win.document.write(`
      <html><head><title>Print All Labels</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        .label-page { page-break-after: always; display: flex; justify-content: center; align-items: flex-start; padding: 0; }
        .label-page:last-child { page-break-after: auto; }
        .label-page img { max-width: 100%; height: auto; }
        @media print { .label-page { padding: 0; } }
      </style></head><body>
      ${imgs}
      <script>
        var total = ${labels.length}, loaded = 0;
        document.querySelectorAll('img').forEach(function(img) {
          if (img.complete) { loaded++; } else {
            img.onload = function() { loaded++; if (loaded >= total) setTimeout(function(){ window.print(); }, 300); };
            img.onerror = function() { loaded++; if (loaded >= total) setTimeout(function(){ window.print(); }, 300); };
          }
        });
        if (loaded >= total) setTimeout(function(){ window.print(); }, 500);
      </script>
      </body></html>
    `);
    win.document.close();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (ct) => ct && ct.startsWith("image/");

  return (
    <div className="dashboard-card" style={{ overflow: "visible" }} data-testid="shipping-labels-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#E85D2C] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-playfair text-xl font-semibold text-[#333]">Shipping Labels</h2>
          {labels.length > 0 && (
            <span className="text-xs bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full font-medium">
              {labels.length}
            </span>
          )}
        </div>
        {labels.length > 0 && (
          <button
            onClick={printAllLabels}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-colors text-xs font-medium"
            data-testid="print-all-labels-btn"
          >
            <Printer className="w-3.5 h-3.5" />
            Print All
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer mb-4 ${
          dragOver ? "border-[#FF6B35] bg-[#FF6B35]/5" : "border-[#ddd] hover:border-[#bbb] bg-[#fafafa]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="label-drop-zone"
      >
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
          onChange={(e) => uploadFiles(Array.from(e.target.files))} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
            <p className="text-sm text-[#888]">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-[#ccc]" />
            <p className="text-sm text-[#888]">
              Drag & drop labels here, or <span className="text-[#FF6B35] font-medium underline">browse files</span>
            </p>
            <p className="text-xs text-[#bbb]">PDF, PNG, JPG — up to 25MB each</p>
          </div>
        )}
      </div>

      {/* Labels List */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#ccc] animate-spin" /></div>
      ) : labels.length === 0 ? (
        <p className="text-sm text-[#aaa] text-center py-2">No labels uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label.id} className="rounded-lg bg-[#f8f8f8] border border-[#eee] cursor-pointer" data-testid={`label-item-${label.id}`} onClick={() => togglePreview(label)}>
              {/* Label Header Row */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                  {isImage(label.content_type) ? (
                    <ImageIcon className="w-5 h-5 text-[#FF6B35]" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#FF6B35]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#333] truncate font-medium">{label.display_name || label.filename}</p>
                  <div className="flex items-center gap-2 text-xs text-[#999]">
                    {label.display_name && (
                      <span className="truncate max-w-[120px]" title={label.filename}>{label.filename}</span>
                    )}
                    <span>{formatSize(label.file_size)}</span>
                    {label.platform_guess && (
                      <span className="px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#666] capitalize text-[10px]">
                        {label.platform_guess}
                      </span>
                    )}
                  </div>
                </div>
                {previewId === label.id && (
                  <ChevronUp className="w-4 h-4 text-[#FF6B35] flex-shrink-0" />
                )}
                {previewId !== label.id && (
                  <ChevronDown className="w-4 h-4 text-[#aaa] flex-shrink-0" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); printLabel(label); }}
                  className="text-[#bbb] hover:text-[#00D4FF] transition-colors flex-shrink-0"
                  data-testid={`print-label-${label.id}`}
                  title="Print label"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(label.id); }}
                  className="text-[#ccc] hover:text-red-500 transition-colors flex-shrink-0"
                  data-testid={`delete-label-${label.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* SKU Tag Row */}
              <div className="px-3 pb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {editingSku === label.id ? (
                  <>
                    <Tag className="w-3.5 h-3.5 text-[#8B5CF6] flex-shrink-0" />
                    <input
                      ref={skuInputRef}
                      type="text"
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      onKeyDown={(e) => handleSkuKeyDown(e, label.id)}
                      onBlur={() => { if (skuInput.trim()) saveSku(label.id); else setEditingSku(null); }}
                      placeholder="e.g. A6"
                      className="flex-1 bg-white border border-[#8B5CF6]/30 rounded px-2 py-1 text-sm text-[#333] font-mono uppercase focus:outline-none focus:border-[#8B5CF6]"
                      style={{ maxWidth: 120 }}
                      autoComplete="off"
                      data-testid={`sku-input-${label.id}`}
                    />
                    <button onClick={() => saveSku(label.id)} className="text-[#10B981] hover:text-[#059669]" data-testid={`sku-save-${label.id}`}>
                      <Check className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startSkuEdit(label)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                      label.sku_tag
                        ? "bg-[#10B981]/10 text-[#10B981] font-bold font-mono"
                        : "bg-[#f0f0f0] text-[#aaa] hover:text-[#666] hover:bg-[#e8e8e8]"
                    }`}
                    data-testid={`sku-tag-${label.id}`}
                  >
                    <Tag className="w-3 h-3" />
                    {label.sku_tag || "Add SKU"}
                  </button>
                )}
              </div>

              {/* Inline Preview */}
              {previewId === label.id && (
                <div className="border-t border-[#eee] bg-[#f0f0f0] p-2" data-testid={`preview-panel-${label.id}`}>
                  {!previewBlob ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-[#aaa] animate-spin" />
                    </div>
                  ) : (
                    <img src={previewBlob} alt={label.filename} className="w-full rounded" style={{ maxHeight: 500, objectFit: "contain" }} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
