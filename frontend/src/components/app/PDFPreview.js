import { useState, useRef, useCallback } from "react";
import { X, Share2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { toast } from "sonner";
import { generatePDFBlob, sharePDFBlob } from "../../lib/pdfShare";

export function PDFPreview({ open, onOpenChange, title, filename, children, hideShareButton = false }) {
  const contentRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const handleSave = useCallback(async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const blob = await generatePDFBlob(contentRef.current);
      await sharePDFBlob(blob, `${filename || "report"}.pdf`, { title });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  }, [filename, title]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="pdf-preview-modal">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
          <h2 className="text-sm font-semibold text-white truncate pr-2" style={{ fontFamily: "Outfit, sans-serif" }}>{title || "Report Preview"}</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#E5E7EB] p-3 sm:p-4">
          <div ref={contentRef} data-pdf-content="true" className="bg-white rounded-lg shadow-sm mx-auto" style={{ maxWidth: 700, padding: "20px 16px", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 13, color: "#0F172A", lineHeight: 1.6 }}>
            {children}
          </div>
        </div>
        {!hideShareButton && (
          <div className="flex-shrink-0 border-t px-4 py-3 pb-6 bg-white">
            <Button onClick={handleSave} disabled={generating} className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-11 text-sm font-semibold" data-testid="pdf-save-btn">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
              {generating ? "Generating PDF..." : "Save / Share PDF"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
