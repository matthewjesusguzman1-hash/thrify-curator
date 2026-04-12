import { useState, useEffect } from "react";
import { X, Loader2, ArrowRight } from "lucide-react";
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
        className="w-full sm:max-w-[560px] p-0"
        data-testid="similar-violations-sheet"
      >
        <div className="p-6 pb-4">
          <SheetHeader>
            <SheetTitle
              className="text-lg text-[#002855]"
              style={{ fontFamily: "Outfit, sans-serif" }}
              data-testid="similar-sheet-title"
            >
              Violation Details
            </SheetTitle>
            <SheetDescription className="text-xs text-[#6B7280]">
              Selected violation and similar records
            </SheetDescription>
          </SheetHeader>

          {/* Selected Violation Detail */}
          <div
            className="mt-4 p-4 rounded-lg border bg-[#002855]/[0.03]"
            data-testid="selected-violation-detail"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-[#002855]">
                {violation.regulatory_reference}
              </span>
              {violation.oos_value === "Y" && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-2 py-0.5 font-bold bg-[#DC2626] text-white"
                >
                  OOS
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5"
              >
                {violation.violation_class}
              </Badge>
            </div>
            <p className="text-sm text-[#374151] leading-relaxed">
              {violation.violation_text}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[#6B7280]">
              <span>
                <strong>Code:</strong> {violation.violation_code}
              </span>
              <span>
                <strong>CFR:</strong> {violation.cfr_part}
              </span>
              <span>
                <strong>Category:</strong> {violation.violation_category}
              </span>
              <span>
                <strong>Level III:</strong> {violation.level_iii}
              </span>
              <span>
                <strong>Critical:</strong> {violation.critical}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Similar Violations */}
        <div className="px-6 pt-4 pb-2">
          <h3
            className="text-sm font-semibold text-[#002855] flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <ArrowRight className="w-4 h-4" />
            Similar Violations
            {!loading && (
              <span className="text-xs font-normal text-[#6B7280]">
                ({total} found)
              </span>
            )}
          </h3>
        </div>

        <ScrollArea className="h-[calc(100vh-380px)] px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 loading-spin text-[#002855]" />
              <span className="ml-2 text-sm text-[#6B7280]">
                Finding similar violations...
              </span>
            </div>
          ) : similar.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-10">
              No similar violations found.
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {similar.map((v, idx) => (
                <div
                  key={v.id || idx}
                  className="p-3 rounded-md border hover:border-[#002855]/30 transition-colors bg-white"
                  data-testid={`similar-violation-${idx}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#002855]">
                      {v.regulatory_reference}
                    </span>
                    {v.oos_value === "Y" && (
                      <Badge
                        variant="destructive"
                        className="text-[9px] px-1.5 py-0 font-bold bg-[#DC2626] text-white"
                      >
                        OOS
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0"
                    >
                      {v.violation_class}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#374151] leading-snug">
                    {v.violation_text}
                  </p>
                  <span className="text-[10px] text-[#9CA3AF] mt-1 block">
                    Code: {v.violation_code} | CFR: {v.cfr_part}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
