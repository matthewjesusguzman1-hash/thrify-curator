import { ChevronLeft, ChevronRight, FileSearch, ArrowUp, ArrowDown, ArrowUpDown, GripVertical, ArrowLeftToLine, Settings2, ExternalLink } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

const ALL_COLUMNS = [
  { key: "regulatory_reference", label: "Reg. Reference", width: "w-[140px]" },
  { key: "violation_text", label: "Violation Text", width: "min-w-[320px]" },
  { key: "violation_class", label: "Class", width: "w-[120px]" },
  { key: "oos", label: "OOS", width: "w-[80px]", center: true },
  { key: "level_iii", label: "Level III", width: "w-[80px]", center: true },
  { key: "critical", label: "Critical", width: "w-[80px]", center: true },
  { key: "violation_code", label: "Code", width: "w-[100px]" },
  { key: "cfr_part", label: "CFR", width: "w-[70px]" },
];

function getColumnDef(key) {
  return ALL_COLUMNS.find((c) => c.key === key) || ALL_COLUMNS[0];
}

function buildEcfrUrl(regRef) {
  if (!regRef) return null;
  // Strip parenthetical subsections: 393.40(a) → 393.40, 107.608(b) → 107.608
  const baseSection = regRef.replace(/\(.*$/, '').trim();
  if (!baseSection || !baseSection.includes('.')) return null;
  return `https://www.ecfr.gov/current/title-49/section-${baseSection}`;
}

function renderCell(v, colKey, idx) {
  switch (colKey) {
    case "regulatory_reference":
      return (
        <TableCell key={colKey} className="font-semibold text-[#002855] text-sm" data-testid={`reg-ref-${idx}`}>
          {v.regulatory_reference}
        </TableCell>
      );
    case "violation_text":
      return (
        <TableCell key={colKey} className="text-sm text-[#334155] leading-snug" data-testid={`vio-text-${idx}`}>
          {v.violation_text}
        </TableCell>
      );
    case "violation_class":
      return <TableCell key={colKey}><ClassBadge value={v.violation_class} /></TableCell>;
    case "oos":
      return <TableCell key={colKey} className="text-center"><OosBadge value={v.oos_value} /></TableCell>;
    case "level_iii":
      return <TableCell key={colKey} className="text-center"><YnIndicator value={v.level_iii} /></TableCell>;
    case "critical":
      return <TableCell key={colKey} className="text-center"><YnIndicator value={v.critical} /></TableCell>;
    case "violation_code":
      return <TableCell key={colKey} className="text-xs text-[#64748B] font-mono">{v.violation_code}</TableCell>;
    case "cfr_part":
      return <TableCell key={colKey} className="text-xs text-[#64748B]">{v.cfr_part}</TableCell>;
    default:
      return <TableCell key={colKey} />;
  }
}

export function ViolationTable({
  violations,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onViolationClick,
  columnOrder,
  onColumnOrderChange,
}) {
  const orderedColumns = columnOrder.map(getColumnDef);

  if (isLoading) {
    return (
      <div data-testid="loading-state" className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
          <p className="text-sm text-[#64748B]">Loading violations...</p>
        </div>
      </div>
    );
  }

  if (!violations || violations.length === 0) {
    return (
      <div data-testid="empty-state" className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <FileSearch className="w-12 h-12 text-[#CBD5E1]" />
          <p className="text-sm font-medium text-[#334155]">No violations found</p>
          <p className="text-xs text-[#64748B] mt-1">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      onSort(columnKey, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSort(columnKey, "asc");
    }
  };

  const moveToFront = (key) => {
    const newOrder = [key, ...columnOrder.filter((k) => k !== key)];
    onColumnOrderChange(newOrder);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortBy !== columnKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" />
      : <ArrowDown className="w-3 h-3 text-[#D4AF37]" />;
  };

  return (
    <div data-testid="violation-table-container">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#64748B]" data-testid="results-count">
          Showing <strong className="text-[#0F172A]">{startItem}-{endItem}</strong> of{" "}
          <strong className="text-[#0F172A]">{total.toLocaleString()}</strong> results
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-[#94A3B8]">Click a row to see similar violations</p>
          <ColumnOrderPopover
            columnOrder={columnOrder}
            onMoveToFront={moveToFront}
          />
        </div>
      </div>

      <div className="border border-[#CBD5E1] rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#002855]">
                {orderedColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    data-testid={`sort-header-${col.key}`}
                    onClick={() => handleSort(col.key)}
                    className={`text-xs font-bold tracking-wide uppercase text-white/80 ${col.width} ${col.center ? "text-center" : ""} cursor-pointer select-none hover:text-[#D4AF37] hover:bg-[#001a3a] transition-colors border-b-0`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon columnKey={col.key} />
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v, idx) => (
                <TableRow
                  key={v.id || idx}
                  className="violation-row cursor-pointer"
                  data-testid={`violation-row-${idx}`}
                  onClick={() => onViolationClick?.(v)}
                >
                  {columnOrder.map((colKey) => renderCell(v, colKey, idx))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div data-testid="pagination" className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#64748B]">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button data-testid="prev-page-btn" variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="pagination-btn h-8 text-xs">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            <Button data-testid="next-page-btn" variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="pagination-btn h-8 text-xs">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnOrderPopover({ columnOrder, onMoveToFront }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs border-[#CBD5E1] text-[#64748B] bg-white hover:bg-[#002855] hover:text-white hover:border-[#002855]"
          data-testid="column-order-btn"
        >
          <Settings2 className="w-3.5 h-3.5 mr-1" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="end" data-testid="column-order-popover">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] px-2 pb-2">
          Reorder columns
        </p>
        {columnOrder.map((key, idx) => {
          const col = getColumnDef(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#F1F5F9] transition-colors group"
              data-testid={`column-item-${key}`}
            >
              <span className="text-xs text-[#334155] flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-[#CBD5E1]" />
                {col.label}
              </span>
              {idx > 0 && (
                <button
                  onClick={() => onMoveToFront(key)}
                  className="col-move-btn p-0.5 rounded text-[#94A3B8] opacity-0 group-hover:opacity-100"
                  title="Move to front"
                  data-testid={`move-front-${key}`}
                >
                  <ArrowLeftToLine className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function OosBadge({ value }) {
  if (value === "Y") {
    return <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-bold bg-[#DC2626] text-white" data-testid="oos-badge-yes">OOS</Badge>;
  }
  return <span className="text-xs text-[#CBD5E1]" data-testid="oos-badge-no">--</span>;
}

function YnIndicator({ value }) {
  if (value === "Y") {
    return <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-[#002855]/10 text-[#002855] text-[10px] font-bold">Y</span>;
  }
  return <span className="text-xs text-[#CBD5E1]">--</span>;
}

function ClassBadge({ value }) {
  const colorMap = {
    "Hazardous Materials": "bg-amber-50 text-amber-800 border-amber-200",
    "Driver": "bg-blue-50 text-blue-800 border-blue-200",
    "Vehicle": "bg-emerald-50 text-emerald-800 border-emerald-200",
    "Motor Carrier": "bg-purple-50 text-purple-800 border-purple-200",
    "Intermodal Equip Provider": "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium whitespace-nowrap ${colorMap[value] || "bg-gray-50 text-gray-700 border-gray-200"}`} data-testid="class-badge">
      {value}
    </Badge>
  );
}

export { ALL_COLUMNS };
