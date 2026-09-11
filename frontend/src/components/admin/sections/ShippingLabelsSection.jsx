import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, FileText, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShippingLabelsSection({ getAuthHeader }) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

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
    let success = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        await axios.post(`${API}/orders/labels/upload`, form, {
          headers: { ...getAuthHeader().headers, "Content-Type": "multipart/form-data" },
        });
        success++;
      } catch (err) {
        failed++;
      }
    }
    setUploading(false);
    if (success > 0) toast.success(`${success} label${success > 1 ? "s" : ""} uploaded`);
    if (failed > 0) toast.error(`${failed} file${failed > 1 ? "s" : ""} failed`);
    fetchLabels();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleDelete = async (labelId) => {
    try {
      await axios.delete(`${API}/orders/labels/${labelId}`, getAuthHeader());
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      toast.success("Label deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="dashboard-card" data-testid="shipping-labels-section">
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
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer mb-4 ${
          dragOver
            ? "border-[#FF6B35] bg-[#FF6B35]/5"
            : "border-[#ddd] hover:border-[#bbb] bg-[#fafafa]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="label-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => uploadFiles(Array.from(e.target.files))}
        />
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
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-[#ccc] animate-spin" />
        </div>
      ) : labels.length === 0 ? (
        <p className="text-sm text-[#aaa] text-center py-2">No labels uploaded yet</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#f8f8f8] border border-[#eee] group"
              data-testid={`label-item-${label.id}`}
            >
              <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                {label.content_type?.startsWith("image/") ? (
                  <ImageIcon className="w-5 h-5 text-[#FF6B35]" />
                ) : (
                  <FileText className="w-5 h-5 text-[#FF6B35]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#333] truncate font-medium">{label.filename}</p>
                <div className="flex items-center gap-2 text-xs text-[#999]">
                  <span>{formatSize(label.file_size)}</span>
                  {label.platform_guess && (
                    <span className="px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#666] capitalize text-[10px]">
                      {label.platform_guess}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={`${API}/orders/labels/${label.id}/file?token=${localStorage.getItem("token")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00A8CC] hover:underline flex-shrink-0 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                View
              </a>
              <button
                onClick={() => handleDelete(label.id)}
                className="text-[#ccc] hover:text-red-500 transition-colors flex-shrink-0"
                data-testid={`delete-label-${label.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
