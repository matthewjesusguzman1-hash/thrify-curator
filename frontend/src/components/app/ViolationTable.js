import { ChevronLeft, ChevronRight, FileSearch } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";

export function ViolationTable({
  violations,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div
        data-testid="loading-state"
        className="flex items-center justify-center py-20"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
          <p className="text-sm text-[#6B7280]">Loading violations...</p>
        </div>
      </div>
    );
  }

  if (!violations || violations.length === 0) {
    return (
      <div
        data-testid="empty-state"
        className="flex items-center justify-center py-20"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <FileSearch className="w-12 h-12 text-[#D1D5DB]" />
          <div>
            <p className="text-sm font-medium text-[#374151]">
              No violations found
            </p>
            <p className="text-xs text-[#6B7280] mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      </div>
    );
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div data-testid="violation-table-container">
      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6B7280]" data-testid="results-count">
          Showing <strong className="text-[#0A0A0A]">{startItem}-{endItem}</strong> of{" "}
          <strong className="text-[#0A0A0A]">{total.toLocaleString()}</strong> results
        </p>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[140px]">
                  Reg. Reference
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] min-w-[320px]">
                  Violation Text
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[120px]">
                  Class
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[80px] text-center">
                  OOS
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[80px] text-center">
                  Level III
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[80px] text-center">
                  Critical
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[100px]">
                  Code
                </TableHead>
                <TableHead className="text-xs font-bold tracking-wide uppercase text-[#002855] w-[70px]">
                  CFR
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v, idx) => (
                <TableRow
                  key={v.id || idx}
                  className="violation-row"
                  data-testid={`violation-row-${idx}`}
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  <TableCell className="font-medium text-[#002855] text-sm" data-testid={`reg-ref-${idx}`}>
                    {v.regulatory_reference}
                  </TableCell>
                  <TableCell className="text-sm text-[#374151] leading-snug" data-testid={`vio-text-${idx}`}>
                    {v.violation_text}
                  </TableCell>
                  <TableCell>
                    <ClassBadge value={v.violation_class} />
                  </TableCell>
                  <TableCell className="text-center">
                    <OosBadge value={v.oos_value} />
                  </TableCell>
                  <TableCell className="text-center">
                    <YnIndicator value={v.level_iii} />
                  </TableCell>
                  <TableCell className="text-center">
                    <YnIndicator value={v.critical} />
                  </TableCell>
                  <TableCell className="text-xs text-[#6B7280] font-mono">
                    {v.violation_code}
                  </TableCell>
                  <TableCell className="text-xs text-[#6B7280]">
                    {v.cfr_part}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          data-testid="pagination"
          className="flex items-center justify-between mt-4"
        >
          <p className="text-xs text-[#6B7280]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              data-testid="prev-page-btn"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="pagination-btn h-8 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>
            <Button
              data-testid="next-page-btn"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="pagination-btn h-8 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OosBadge({ value }) {
  if (value === "Y") {
    return (
      <Badge
        variant="destructive"
        className="text-[10px] px-2 py-0.5 font-bold bg-[#DC2626] text-white"
        data-testid="oos-badge-yes"
      >
        OOS
      </Badge>
    );
  }
  return (
    <span className="text-xs text-[#9CA3AF]" data-testid="oos-badge-no">
      --
    </span>
  );
}

function YnIndicator({ value }) {
  if (value === "Y") {
    return (
      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-[#002855]/10 text-[#002855] text-[10px] font-bold">
        Y
      </span>
    );
  }
  return <span className="text-xs text-[#D1D5DB]">--</span>;
}

function ClassBadge({ value }) {
  const colorMap = {
    "Hazardous Materials": "bg-amber-100 text-amber-800 border-amber-200",
    "Driver": "bg-blue-100 text-blue-800 border-blue-200",
    "Vehicle": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Motor Carrier": "bg-purple-100 text-purple-800 border-purple-200",
    "Intermodal Equip Provider": "bg-slate-100 text-slate-800 border-slate-200",
  };
  const colors = colorMap[value] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-2 py-0.5 font-medium whitespace-nowrap ${colors}`}
      data-testid="class-badge"
    >
      {value}
    </Badge>
  );
}
