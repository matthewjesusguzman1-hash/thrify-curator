import { useState, useEffect } from "react";
import { Loader2, ArrowRight, ExternalLink, X } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "../ui/drawer";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[92vh] bg-white"
        data-testid="similar-violations-sheet"
      >
        {/* Swipe handle */}
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[#CBD5E1] mt-3 mb-2" />

        {/* Close button - always visible */}
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-3 h-8 w-8 p-0 rounded-full hover:bg-[#F1F5F9]"
            data-testid="close-detail-btn"
          >
            <X className="w-4 h-4 text-[#64748B]" />
          </Button>
        </DrawerClose>

        <div className="px-4 sm:px-6 pb-2">
          <DrawerHeader className="p-0">
            <DrawerTitle
              className="text-base sm:text-lg text-[#002855] text-left"
              style={{ fontFamily: "Outfit, sans-serif" }}
              data-testid="similar-sheet-title"
            >
              Violation Details
            </DrawerTitle>
            <DrawerDescription className="text-xs text-[#64748B] text-left">
              Swipe down to close
            </DrawerDescription>
          </DrawerHeader>

          {/* Selected violation detail */}
          <div className="mt-3 p-3 sm:p-4 rounded-lg border bg-[#F8FAFC]" data-testid="selected-violation-detail">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              {ecfrUrl ? (
                <a href={ecfrUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#002855] hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1" data-testid="detail-ecfr-link">
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

        <Separator />

        <div className="px-4 sm:px-6 pt-3 pb-1">
          <h3 className="text-sm font-semibold text-[#002855] flex items-center gap-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            <ArrowRight className="w-4 h-4" />
            Similar Violations
            {!loading && <span className="text-xs font-normal text-[#94A3B8]">({total})</span>}
          </h3>
        </div>

        <ScrollArea className="flex-1 px-4 sm:px-6 pb-6 max-h-[45vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 loading-spin text-[#002855]" />
              <span className="ml-2 text-sm text-[#64748B]">Finding similar...</span>
            </div>
          ) : similar.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-8">No similar violations found.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {similar.map((v, idx) => (
                <div key={v.id || idx} className="p-3 rounded-md border active:bg-[#F8FAFC] transition-colors" data-testid={`similar-violation-${idx}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#002855]">{v.regulatory_reference}</span>
                    {v.oos_value === "Y" && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold bg-[#DC2626] text-white">OOS</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#475569] leading-snug">{v.violation_text}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
