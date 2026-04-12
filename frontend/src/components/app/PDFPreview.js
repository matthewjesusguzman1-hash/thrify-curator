import { useState, useRef } from "react";
import { X, Download, Share2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function PDFPreview({ open, onOpenChange, title, filename, children }) {
  const contentRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    if (!contentRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 900,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -(pageHeight - 10) * (Math.ceil(imgHeight / pageHeight) - Math.ceil(heightLeft / pageHeight));
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      return pdf;
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const pdf = await generatePDF();
    if (!pdf) return;
    const blob = pdf.output("blob");
    const pdfFile = new File([blob], `${filename || "report"}.pdf`, { type: "application/pdf" });

    // On mobile with Web Share API, use share so user can pick "Save to Files" / "Save to Photos" / AirDrop etc.
    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: title || "Report" });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
        // Fall through to download
      }
    }

    // Desktop / fallback: direct download via blob URL
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "report"}.pdf`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    toast.success("PDF downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="pdf-preview-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
          <h2 className="text-sm font-semibold text-white truncate pr-2" style={{ fontFamily: "Outfit, sans-serif" }}>{title || "Report Preview"}</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable preview */}
        <div className="flex-1 overflow-y-auto bg-[#E5E7EB] p-3 sm:p-4">
          <div ref={contentRef} className="bg-white rounded-lg shadow-sm mx-auto" style={{ maxWidth: 700, padding: "20px 16px", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 13, color: "#0F172A", lineHeight: 1.5 }}>
            {children}
          </div>
        </div>

        {/* Single save/share button */}
        <div className="flex-shrink-0 border-t px-4 py-3 pb-6 bg-white">
          <Button onClick={handleSave} disabled={generating} className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-11 text-sm font-semibold" data-testid="pdf-save-btn">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            {generating ? "Generating PDF..." : "Save / Share PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
