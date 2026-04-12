import { Filter } from "lucide-react";
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
  return (
    <div
      data-testid="filter-bar"
      className="flex flex-wrap items-center gap-3"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-[#64748B]">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      {/* Violation Class */}
      <Select
        value={filters.violation_class || "all"}
        onValueChange={(val) =>
          onFilterChange("violation_class", val === "all" ? "" : val)
        }
      >
        <SelectTrigger
          data-testid="filter-violation-class"
          className="w-[180px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]"
        >
          <SelectValue placeholder="Violation Class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {filterOptions.violation_classes?.map((vc) => (
            <SelectItem key={vc} value={vc}>{vc}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* OOS */}
      <Select
        value={filters.oos || "all"}
        onValueChange={(val) =>
          onFilterChange("oos", val === "all" ? "" : val)
        }
      >
        <SelectTrigger
          data-testid="filter-oos"
          className="w-[160px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]"
        >
          <SelectValue placeholder="OOS Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All OOS</SelectItem>
          <SelectItem value="Y">Out of Service (Y)</SelectItem>
          <SelectItem value="N">Not OOS (N)</SelectItem>
        </SelectContent>
      </Select>

      {/* HazMat - All / Only / Exclude */}
      <Select
        value={filters.hazmat || "all"}
        onValueChange={(val) =>
          onFilterChange("hazmat", val === "all" ? "" : val)
        }
      >
        <SelectTrigger
          data-testid="filter-hazmat"
          className="w-[160px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]"
        >
          <SelectValue placeholder="HazMat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All HazMat</SelectItem>
          <SelectItem value="Y">HazMat Only</SelectItem>
          <SelectItem value="N">Exclude HazMat</SelectItem>
        </SelectContent>
      </Select>

      {/* Level III - All / Only / Exclude */}
      <Select
        value={filters.level_iii || "all"}
        onValueChange={(val) =>
          onFilterChange("level_iii", val === "all" ? "" : val)
        }
      >
        <SelectTrigger
          data-testid="filter-level-iii"
          className="w-[160px] h-9 text-xs bg-white border-[#CBD5E1] text-[#0F172A]"
        >
          <SelectValue placeholder="Level III" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Level III</SelectItem>
          <SelectItem value="Y">Level III Only</SelectItem>
          <SelectItem value="N">Exclude Level III</SelectItem>
        </SelectContent>
      </Select>

      {/* Critical */}
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
  );
}
