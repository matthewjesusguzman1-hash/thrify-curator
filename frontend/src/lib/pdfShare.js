// Shared PDF generation + native share utilities.
// Used by InspectionDetail, TieDownCalculator, HoursOfServicePage, and PDFPreview
// so "Preview" and "Share" behave identically across the app.

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { markInspectionExported } from "./storageManager";

/**
 * Render a content element (and its [data-pdf-section] children) into a PDF.
 *
 * If `existingPdf` is provided, the content is APPENDED to it (starts on a new
 * page — used by bulk export to produce a single multi-inspection PDF).
 * If not provided, a fresh PDF is created and returned as a Blob.
 *
 * Returns:
 *   - When existingPdf is null: the finalized PDF Blob.
 *   - When existingPdf is provided: the same jsPDF instance (for chaining).
 */
export async function generatePDFBlob(el, existingPdf = null) {
  if (!el) throw new Error("No content element provided");

  const pdf = existingPdf || new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth() - 16;
  const pdfHeight = pdf.internal.pageSize.getHeight() - 16;
  const isAppending = !!existingPdf;
  // Track whether this is the very first page being written; when appending
  // we always start on a fresh page.
  let wroteFirstPage = false;

  const captureElements = async (elements) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `position:absolute;left:-9999px;top:0;width:${el.scrollWidth}px;background:#fff;padding:20px 16px;font-family:'IBM Plex Sans',Arial,sans-serif;font-size:13px;color:#0F172A;line-height:1.6;`;
    elements.forEach((e) => wrapper.appendChild(e.cloneNode(true)));
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

  const addCanvasToPDF = (canvas, forceNewPage) => {
    if (forceNewPage || (isAppending && !wroteFirstPage)) pdf.addPage();
    wroteFirstPage = true;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgH = (canvas.height * pdfWidth) / canvas.width;
    if (imgH <= pdfHeight) {
      pdf.addImage(imgData, "JPEG", 8, 8, pdfWidth, imgH);
    } else {
      const scale = pdfHeight / imgH;
      const sw = pdfWidth * scale;
      pdf.addImage(imgData, "JPEG", 8 + (pdfWidth - sw) / 2, 8, sw, pdfHeight);
    }
  };

  const headerEl = el.querySelector("[data-pdf-section='header']") || el.querySelector("[data-pdf-section='insp-header']");
  const articleSections = Array.from(el.querySelectorAll("[data-pdf-section]")).filter(
    (s) => s.dataset.pdfSection?.startsWith("article-") || s.dataset.pdfSection?.startsWith("assessment-")
  );

  if (articleSections.length <= 1) {
    const canvas = await captureElements(Array.from(el.children));
    addCanvasToPDF(canvas, false);
  } else {
    for (let i = 0; i < articleSections.length; i++) {
      const parts = [];
      if (headerEl) parts.push(headerEl);
      parts.push(articleSections[i]);
      const footer = el.querySelector("[data-pdf-footer]");
      if (footer && i === articleSections.length - 1) parts.push(footer);
      const canvas = await captureElements(parts);
      addCanvasToPDF(canvas, i > 0);
    }
  }

  return isAppending ? pdf : pdf.output("blob");
}

/** Finalize an in-progress jsPDF into a Blob. */
export function finalizePdf(pdf) {
  return pdf.output("blob");
}

export { jsPDF };

/**
 * Share a PDF blob via the native Web Share API when possible (attaches the file).
 * Falls back to downloading the PDF + opening a mailto with a note prompting
 * the user to attach the downloaded file.
 * Returns the outcome: "shared" | "aborted" | "downloaded".
 */
export async function sharePDFBlob(blob, filename, { title, text } = {}) {
  const safeName = filename?.endsWith(".pdf") ? filename : `${filename || "report"}.pdf`;
  const file = new File([blob], safeName, { type: "application/pdf" });

  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      // Track successful export for retention reminder.
      markInspectionExported();
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "aborted";
      // fall through to download fallback
    }
  }

  // Fallback: download + mailto
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = safeName; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  // Count the download as an export — the PDF is now off the device.
  markInspectionExported();

  const mailSubject = encodeURIComponent(title || "Report");
  const mailBody = encodeURIComponent(
    `${text ? text + "\n\n" : ""}The full report PDF has been downloaded; please attach it to this email.`
  );
  // Defer mailto slightly so the download is visibly queued first.
  setTimeout(() => { window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`; }, 300);
  return "downloaded";
}
