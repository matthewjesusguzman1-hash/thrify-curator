import { useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function FilterBar({ filters, filterOptions, onFilterChange }) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div data-testid="filter-bar">
      {/* Mobile: collapsible trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex sm:hidden items-center gap-2 w-full py-2 text-xs font-bold tracking-[0.15em] uppercase text-[#64748B]"
        data-testid="filter-toggle"
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="bg-[#002855] text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {activeCount}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 ml-auto" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        )}
      </button>

      {/* Desktop: always visible label */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-3">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      {/* Filter controls - collapsible on mobile */}
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 ${expanded ? "flex" : "hidden sm:flex"}`}>
        <Select
          value={filters.violation_class || "all"}
          onValueChange={(val) => onFilterChange("violation_class", val === "all" ? "" : val)}
        >
          <SelectTrigger data-testid="filter-violation-class" className="w-full sm:w-[180px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]">
            <SelectValue placeholder="Violation Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {filterOptions.violation_classes?.map((vc) => (
              <SelectItem key={vc} value={vc}>{vc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={filters.oos || "all"}
            onValueChange={(val) => onFilterChange("oos", val === "all" ? "" : val)}
          >
            <SelectTrigger data-testid="filter-oos" className="flex-1 sm:w-[140px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]">
              <SelectValue placeholder="OOS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OOS</SelectItem>
              <SelectItem value="Y">OOS Only</SelectItem>
              <SelectItem value="N">Not OOS</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.hazmat || "all"}
            onValueChange={(val) => onFilterChange("hazmat", val === "all" ? "" : val)}
          >
            <SelectTrigger data-testid="filter-hazmat" className="flex-1 sm:w-[150px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]">
              <SelectValue placeholder="HazMat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All HazMat</SelectItem>
              <SelectItem value="Y">HazMat Only</SelectItem>
              <SelectItem value="N">Exclude HazMat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={filters.level_iii || "all"}
            onValueChange={(val) => onFilterChange("level_iii", val === "all" ? "" : val)}
          >
            <SelectTrigger data-testid="filter-level-iii" className="flex-1 sm:w-[150px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]">
              <SelectValue placeholder="Level III" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Violations</SelectItem>
              <SelectItem value="Y">Level III Only</SelectItem>
              <SelectItem value="N">Exclude Level III</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#CBD5E1] bg-white">
            <Switch
              data-testid="filter-critical"
              checked={filters.critical === "Y"}
              onCheckedChange={(checked) => onFilterChange("critical", checked ? "Y" : "")}
              className="scale-90"
            />
            <Label className="text-xs font-medium text-[#334155] cursor-pointer whitespace-nowrap">Critical</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
