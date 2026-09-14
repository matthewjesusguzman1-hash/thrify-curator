import { useState, useRef } from "react";
import { Upload, Check, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CSVUpdateButton({ getAuthHeader }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    if (!isCSV) {
      toast.error("Please select a CSV file");
      return;
    }

    setUploading(true);
    try {
      // Clear existing data first
      await fetch(`${API_URL}/api/inventory/clear-all`, {
        method: "DELETE",
        headers: { ...getAuthHeader() },
      });

      // Upload new CSV
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", "vendoo");

      const resp = await fetch(`${API_URL}/api/inventory/import`, {
        method: "POST",
        headers: { ...getAuthHeader() },
        body: formData,
      });

      const data = await resp.json();
      if (resp.ok) {
        const count = data.details?.rows_processed || data.imported || data.total_imported || 0;
        toast.success(`CSV updated — ${count} items imported`);
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach(w => toast.warning(w, { duration: 10000 }));
        }
      } else {
        toast.error(data.detail || "Import failed");
      }
    } catch (err) {
      toast.error("Failed to upload CSV");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
        data-testid="orders-csv-input"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-white/70 hover:text-white transition-all disabled:opacity-50"
        data-testid="orders-update-csv-btn"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        {uploading ? "Updating..." : "Update CSV"}
      </button>
    </div>
  );
}
