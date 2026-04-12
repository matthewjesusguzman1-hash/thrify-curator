import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function UploadDialog({ open, onOpenChange, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/violations/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.error) {
        setResult({ success: false, message: res.data.error });
      } else {
        setResult({ success: true, message: res.data.message });
        onUploadSuccess?.();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.error || "Upload failed. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]" data-testid="upload-dialog">
        <DialogHeader>
          <DialogTitle
            className="text-lg font-semibold text-[#002855]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Upload Violation Data
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B7280]">
            Upload an Excel file (.xlsx) to refresh the violations database.
            The file should match the SafeSpect format with headers in row 5.
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="upload-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-[#002855] hover:bg-[#002855]/5"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="file-input"
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-10 h-10 text-[#002855]" />
              <p className="text-sm font-medium text-[#0A0A0A]">{file.name}</p>
              <p className="text-xs text-[#6B7280]">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-[#D1D5DB]" />
              <p className="text-sm font-medium text-[#374151]">
                Drop your Excel file here
              </p>
              <p className="text-xs text-[#6B7280]">or click to browse</p>
            </div>
          )}
        </div>

        {result && (
          <div
            data-testid="upload-result"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              result.success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {result.message}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            data-testid="upload-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-[#002855] text-white hover:bg-[#001a3a]"
            data-testid="upload-confirm-btn"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 loading-spin" />
                Uploading...
              </>
            ) : (
              "Upload & Replace"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
