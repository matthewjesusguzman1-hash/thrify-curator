import { ChevronLeft, ChevronRight, FileSearch, ArrowUp, ArrowDown, ArrowUpDown, GripVertical, ArrowLeftToLine, Settings2 } from "lucide-react";
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

function renderCell(v, colKey, idx) {
  switch (colKey) {
    case "regulatory_reference":
      return (
        <TableCell key={colKey} className="font-medium text-[#D4AF37] text-sm" data-testid={`reg-ref-${idx}`}>
          {v.regulatory_reference}
        </TableCell>
      );
    case "violation_text":
      return (
        <TableCell key={colKey} className="text-sm text-[#C8D6E0] leading-snug" data-testid={`vio-text-${idx}`}>
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
      return <TableCell key={colKey} className="text-xs text-[#7B8FA3] font-mono">{v.violation_code}</TableCell>;
    case "cfr_part":
      return <TableCell key={colKey} className="text-xs text-[#7B8FA3]">{v.cfr_part}</TableCell>;
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
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full loading-spin" />
          <p className="text-sm text-[#7B8FA3]">Loading violations...</p>
        </div>
      </div>
    );
  }

  if (!violations || violations.length === 0) {
    return (
      <div data-testid="empty-state" className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <FileSearch className="w-12 h-12 text-[#0a3d6b]" />
          <p className="text-sm font-medium text-[#C8D6E0]">No violations found</p>
          <p className="text-xs text-[#546A7F] mt-1">Try adjusting your search or filters</p>
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
        <p className="text-xs text-[#7B8FA3]" data-testid="results-count">
          Showing <strong className="text-[#F9FAFB]">{startItem}-{endItem}</strong> of{" "}
          <strong className="text-[#F9FAFB]">{total.toLocaleString()}</strong> results
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-[#546A7F]">Click a row to see similar violations</p>
          <ColumnOrderPopover
            columnOrder={columnOrder}
            onMoveToFront={moveToFront}
          />
        </div>
      </div>

      <div className="border border-[#0a3d6b] rounded-lg overflow-hidden bg-[#001229]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#001f45] border-b border-[#0a3d6b]">
                {orderedColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    data-testid={`sort-header-${col.key}`}
                    onClick={() => handleSort(col.key)}
                    className={`text-xs font-bold tracking-wide uppercase text-[#7B8FA3] ${col.width} ${col.center ? "text-center" : ""} cursor-pointer select-none hover:text-[#D4AF37] hover:bg-[#002855] transition-colors`}
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
                  className="violation-row cursor-pointer border-b border-[#0a3d6b]/50"
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
          <p className="text-xs text-[#7B8FA3]">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button data-testid="prev-page-btn" variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="pagination-btn h-8 text-xs border-[#0a3d6b] text-[#C8D6E0] bg-transparent hover:bg-[#D4AF37] hover:text-[#001229] hover:border-[#D4AF37]">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            <Button data-testid="next-page-btn" variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="pagination-btn h-8 text-xs border-[#0a3d6b] text-[#C8D6E0] bg-transparent hover:bg-[#D4AF37] hover:text-[#001229] hover:border-[#D4AF37]">
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
          className="h-7 px-2 text-xs border-[#0a3d6b] text-[#7B8FA3] bg-transparent hover:bg-[#001f45] hover:text-[#D4AF37]"
          data-testid="column-order-btn"
        >
          <Settings2 className="w-3.5 h-3.5 mr-1" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-2 bg-[#001f45] border-[#0a3d6b]"
        align="end"
        data-testid="column-order-popover"
      >
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#546A7F] px-2 pb-2">
          Reorder columns
        </p>
        {columnOrder.map((key, idx) => {
          const col = getColumnDef(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#002855] transition-colors group"
              data-testid={`column-item-${key}`}
            >
              <span className="text-xs text-[#C8D6E0] flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-[#546A7F]" />
                {col.label}
              </span>
              {idx > 0 && (
                <button
                  onClick={() => onMoveToFront(key)}
                  className="col-move-btn p-0.5 rounded text-[#546A7F] opacity-0 group-hover:opacity-100"
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
    return <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-bold bg-[#EF4444] text-white" data-testid="oos-badge-yes">OOS</Badge>;
  }
  return <span className="text-xs text-[#546A7F]" data-testid="oos-badge-no">--</span>;
}

function YnIndicator({ value }) {
  if (value === "Y") {
    return <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-bold">Y</span>;
  }
  return <span className="text-xs text-[#0a3d6b]">--</span>;
}

function ClassBadge({ value }) {
  const colorMap = {
    "Hazardous Materials": "bg-amber-900/30 text-amber-300 border-amber-700/40",
    "Driver": "bg-sky-900/30 text-sky-300 border-sky-700/40",
    "Vehicle": "bg-emerald-900/30 text-emerald-300 border-emerald-700/40",
    "Motor Carrier": "bg-purple-900/30 text-purple-300 border-purple-700/40",
    "Intermodal Equip Provider": "bg-slate-800/30 text-slate-300 border-slate-600/40",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium whitespace-nowrap ${colorMap[value] || "bg-gray-800/30 text-gray-300 border-gray-600/40"}`} data-testid="class-badge">
      {value}
    </Badge>
  );
}

export { ALL_COLUMNS };
