import { useState, useEffect } from "react";
import { Loader2, ArrowRight, ExternalLink, X } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";
import { Button } from "../ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function SimilarViolationsSheet({ violation, open, onOpenChange }) {
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (open && violation?.id) {
      fetchSimilar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, violation?.id]);

  const fetchSimilar = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/violations/${violation.id}/similar`);
      setSimilar(res.data.violations || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch similar violations:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!violation) return null;

  const buildEcfrUrl = (ref) => {
    if (!ref) return null;
    const base = ref.replace(/\(.*$/, '').trim();
    if (!base || !base.includes('.')) return null;
    return `https://www.ecfr.gov/current/title-49/section-${base}`;
  };

  const ecfrUrl = buildEcfrUrl(violation.regulatory_reference);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[600px] w-[95vw] sm:w-full h-[90vh] sm:h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl"
        data-testid="similar-violations-sheet"
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
          <h2
            className="text-sm sm:text-base font-semibold text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
            data-testid="similar-sheet-title"
          >
            Violation Details
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            data-testid="close-detail-btn"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" data-testid="detail-scroll-area">
          {/* Selected violation */}
          <div className="px-4 sm:px-5 py-4">
            <div className="p-3 sm:p-4 rounded-lg border bg-[#F8FAFC]" data-testid="selected-violation-detail">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                {ecfrUrl ? (
                  <a
                    href={ecfrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-[#002855] hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1"
                    data-testid="detail-ecfr-link"
                  >
                    {violation.regulatory_reference}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-sm font-bold text-[#002855]">{violation.regulatory_reference}</span>
                )}
                {violation.oos_value === "Y" && (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-bold bg-[#DC2626] text-white">OOS</Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">{violation.violation_class}</Badge>
              </div>
              <p className="text-sm text-[#334155] leading-relaxed">{violation.violation_text}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-[#64748B]">
                <span><strong>Code:</strong> {violation.violation_code}</span>
                <span><strong>CFR:</strong> {violation.cfr_part}</span>
                <span><strong>Level III:</strong> {violation.level_iii}</span>
                <span><strong>Critical:</strong> {violation.critical}</span>
              </div>
            </div>
          </div>

          {/* Similar violations */}
          <div className="border-t">
            <div className="px-4 sm:px-5 pt-3 pb-2">
              <h3 className="text-sm font-semibold text-[#002855] flex items-center gap-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                <ArrowRight className="w-4 h-4" />
                Similar Violations
                {!loading && <span className="text-xs font-normal text-[#94A3B8]">({total})</span>}
              </h3>
            </div>

            <div className="px-4 sm:px-5 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 loading-spin text-[#002855]" />
                  <span className="ml-2 text-sm text-[#64748B]">Finding similar...</span>
                </div>
              ) : similar.length === 0 ? (
                <p className="text-sm text-[#94A3B8] text-center py-8">No similar violations found.</p>
              ) : (
                <div className="space-y-2">
                  {similar.map((v, idx) => {
                    const simUrl = buildEcfrUrl(v.regulatory_reference);
                    return (
                      <div key={v.id || idx} className="p-3 rounded-md border hover:border-[#002855]/20 transition-colors" data-testid={`similar-violation-${idx}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {simUrl ? (
                            <a href={simUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#002855] hover:text-[#D4AF37] inline-flex items-center gap-1">
                              {v.regulatory_reference}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-[#002855]">{v.regulatory_reference}</span>
                          )}
                          {v.oos_value === "Y" && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold bg-[#DC2626] text-white">OOS</Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#475569] leading-snug">{v.violation_text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky close button at bottom */}
        <div className="flex-shrink-0 border-t px-4 py-3 bg-white">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-10 text-sm"
            data-testid="close-detail-bottom-btn"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
