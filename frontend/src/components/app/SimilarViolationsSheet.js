import { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[560px] p-0 bg-[#001229] border-l border-[#0a3d6b]"
        data-testid="similar-violations-sheet"
      >
        <div className="p-6 pb-4">
          <SheetHeader>
            <SheetTitle
              className="text-lg text-[#D4AF37]"
              style={{ fontFamily: "Outfit, sans-serif" }}
              data-testid="similar-sheet-title"
            >
              Violation Details
            </SheetTitle>
            <SheetDescription className="text-xs text-[#546A7F]">
              Selected violation and similar records
            </SheetDescription>
          </SheetHeader>

          <div
            className="mt-4 p-4 rounded-lg border border-[#0a3d6b] bg-[#001f45]"
            data-testid="selected-violation-detail"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-[#D4AF37]">
                {violation.regulatory_reference}
              </span>
              {violation.oos_value === "Y" && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-2 py-0.5 font-bold bg-[#EF4444] text-white"
                >
                  OOS
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 border-[#0a3d6b] text-[#7B8FA3]"
              >
                {violation.violation_class}
              </Badge>
            </div>
            <p className="text-sm text-[#C8D6E0] leading-relaxed">
              {violation.violation_text}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[#7B8FA3]">
              <span><strong className="text-[#C8D6E0]">Code:</strong> {violation.violation_code}</span>
              <span><strong className="text-[#C8D6E0]">CFR:</strong> {violation.cfr_part}</span>
              <span><strong className="text-[#C8D6E0]">Category:</strong> {violation.violation_category}</span>
              <span><strong className="text-[#C8D6E0]">Level III:</strong> {violation.level_iii}</span>
              <span><strong className="text-[#C8D6E0]">Critical:</strong> {violation.critical}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-[#0a3d6b]" />

        <div className="px-6 pt-4 pb-2">
          <h3
            className="text-sm font-semibold text-[#D4AF37] flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <ArrowRight className="w-4 h-4" />
            Similar Violations
            {!loading && (
              <span className="text-xs font-normal text-[#546A7F]">
                ({total} found)
              </span>
            )}
          </h3>
        </div>

        <ScrollArea className="h-[calc(100vh-380px)] px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 loading-spin text-[#D4AF37]" />
              <span className="ml-2 text-sm text-[#7B8FA3]">Finding similar violations...</span>
            </div>
          ) : similar.length === 0 ? (
            <p className="text-sm text-[#546A7F] text-center py-10">No similar violations found.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {similar.map((v, idx) => (
                <div
                  key={v.id || idx}
                  className="p-3 rounded-md border border-[#0a3d6b] hover:border-[#D4AF37]/30 transition-colors bg-[#001f45]"
                  data-testid={`similar-violation-${idx}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#D4AF37]">{v.regulatory_reference}</span>
                    {v.oos_value === "Y" && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold bg-[#EF4444] text-white">OOS</Badge>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#0a3d6b] text-[#7B8FA3]">{v.violation_class}</Badge>
                  </div>
                  <p className="text-xs text-[#C8D6E0] leading-snug">{v.violation_text}</p>
                  <span className="text-[10px] text-[#546A7F] mt-1 block">Code: {v.violation_code} | CFR: {v.cfr_part}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
