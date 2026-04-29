import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";

// Load worker from /public — same-origin, no CORS issues, works in iOS PWA.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * Reliable in-app PDF viewer powered by pdf.js (via react-pdf).
 *
 * The previous <iframe src=".pdf"> approach worked on desktop browsers but
 * intermittently broke on iOS Safari and especially when the app is run as
 * an installed PWA — iOS would replace the iframe content with a plain
 * "Open in Preview" download prompt that has no visible Close control.
 *
 * This component renders each PDF page to a canvas client-side using pdf.js,
 * so it is identical on iOS / Android / desktop. A Close (X) button is
 * always visible at the top right and a Download button stays accessible.
 */
export function PdfViewerModal({ src, title, downloadName, onClose, "data-testid": testid }) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(800);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Match page width to container width (responsive on phone, fits on desktop).
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 16; // small horizontal padding
        setPageWidth(Math.max(280, Math.min(1100, w)));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Body scroll lock while the modal is open (so the page underneath doesn't
  // scroll when the inspector flicks through PDF pages on a phone).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 flex flex-col"
      data-testid={testid}
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar — always visible regardless of PDF render state. */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#002855] text-white shadow-lg flex-shrink-0">
        <p className="text-[12.5px] font-bold flex-1 truncate">{title}</p>
        <a
          href={src}
          download={downloadName}
          className="text-[11px] font-bold bg-[#D4AF37] text-[#002855] hover:bg-[#E0BE50] rounded px-2 py-1 transition-colors flex items-center gap-1"
          data-testid={`${testid}-download`}
        >
          <Download className="w-3 h-3" /> Download
        </a>
        <button
          onClick={onClose}
          className="text-white/90 hover:text-white p-1 rounded hover:bg-white/10"
          data-testid={`${testid}-close`}
          aria-label="Close PDF viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrolling page list. */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-[#525659] flex flex-col items-center py-3 gap-3"
      >
        {error ? (
          <div className="bg-white rounded-lg p-4 text-center max-w-md mt-8">
            <p className="text-sm font-bold text-[#7F1D1D] mb-2">Could not display this PDF.</p>
            <p className="text-[11.5px] text-[#475569] mb-3">{error}</p>
            <a
              href={src}
              download={downloadName}
              className="inline-block bg-[#002855] text-white px-3 py-2 rounded text-[12px] font-bold"
            >
              Download instead
            </a>
          </div>
        ) : (
          <Document
            file={src}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(e) => setError(e?.message || "Unknown error")}
            loading={<p className="text-white/80 text-sm mt-8">Loading memo…</p>}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            ))}
          </Document>
        )}
      </div>

      {/* Always-visible floating Close button as a safety net for any iOS
          edge case where the top bar is somehow obscured. */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 z-[130] bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-2xl sm:hidden"
        data-testid={`${testid}-close-fab`}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
