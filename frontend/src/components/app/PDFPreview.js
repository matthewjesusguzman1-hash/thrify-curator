import { useState, useRef, useCallback } from "react";
import { X, Share2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function PDFPreview({ open, onOpenChange, title, filename, children }) {
  const contentRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const generatePDF = useCallback(async () => {
    if (!contentRef.current) return null;
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));

      const el = contentRef.current;
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth() - 16;
      const pdfHeight = pdf.internal.pageSize.getHeight() - 16;

      // Helper: clone elements into an off-screen wrapper and capture.
      // This avoids flex-container height inflation on iOS Safari.
      const captureElements = async (elements) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `position:absolute;left:-9999px;top:0;width:${el.scrollWidth}px;background:#fff;padding:20px 16px;font-family:'IBM Plex Sans',Arial,sans-serif;font-size:13px;color:#0F172A;line-height:1.6;`;
        elements.forEach(e => wrapper.appendChild(e.cloneNode(true)));
        document.body.appendChild(wrapper);
        await new Promise((r) => setTimeout(r, 50));
        const c = await html2canvas(wrapper, {
          scale: 2, useCORS: true, allowTaint: true, logging: false,
          backgroundColor: "#ffffff",
          width: wrapper.scrollWidth, height: wrapper.scrollHeight,
        });
        document.body.removeChild(wrapper);
        return c;
      };

      const addCanvasToPDF = (canvas, pdfDoc, addPage) => {
        if (addPage) pdfDoc.addPage();
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgH = (canvas.height * pdfWidth) / canvas.width;
        if (imgH <= pdfHeight) {
          pdfDoc.addImage(imgData, "JPEG", 8, 8, pdfWidth, imgH);
        } else {
          const scale = pdfHeight / imgH;
          const sw = pdfWidth * scale;
          pdfDoc.addImage(imgData, "JPEG", 8 + (pdfWidth - sw) / 2, 8, sw, pdfHeight);
        }
      };

      const headerEl = el.querySelector("[data-pdf-section='header']") || el.querySelector("[data-pdf-section='insp-header']");
      const articleSections = Array.from(el.querySelectorAll("[data-pdf-section]")).filter(
        s => s.dataset.pdfSection?.startsWith("article-") || s.dataset.pdfSection?.startsWith("assessment-")
      );

      if (articleSections.length <= 1) {
        // Single article or no sections: capture ALL children as one page
        const canvas = await captureElements(Array.from(el.children));
        addCanvasToPDF(canvas, pdf, false);
      } else {
        // Multiple articles: each article gets its own page with header
        for (let i = 0; i < articleSections.length; i++) {
          const parts = [];
          if (headerEl) parts.push(headerEl);
          parts.push(articleSections[i]);
          // Add footer on last article
          const footer = el.querySelector("[data-pdf-footer]");
          if (footer && i === articleSections.length - 1) parts.push(footer);
          const canvas = await captureElements(parts);
          addCanvasToPDF(canvas, pdf, i > 0);
        }
      }

      return pdf;
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF generation failed. Try again.");
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleSave = async () => {
    const pdf = await generatePDF();
    if (!pdf) return;

    const pdfBlob = pdf.output("blob");
    const pdfFilename = `${filename || "report"}.pdf`;

    if (navigator.share) {
      try {
        const file = new File([pdfBlob], pdfFilename, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFilename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    toast.success("PDF downloaded");
  };

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
