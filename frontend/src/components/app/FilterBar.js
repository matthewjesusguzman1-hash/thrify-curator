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
      <div className="flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-[#6B7280]">
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
          className="w-[180px] h-9 text-xs bg-white"
        >
          <SelectValue placeholder="Violation Class" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {filterOptions.violation_classes?.map((vc) => (
            <SelectItem key={vc} value={vc}>
              {vc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* OOS Filter */}
      <Select
        value={filters.oos || "all"}
        onValueChange={(val) =>
          onFilterChange("oos", val === "all" ? "" : val)
        }
      >
        <SelectTrigger
          data-testid="filter-oos"
          className="w-[160px] h-9 text-xs bg-white"
        >
          <SelectValue placeholder="OOS Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All OOS</SelectItem>
          <SelectItem value="Y">Out of Service (Y)</SelectItem>
          <SelectItem value="N">Not OOS (N)</SelectItem>
        </SelectContent>
      </Select>

      {/* HazMat Toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white">
        <Switch
          data-testid="filter-hazmat"
          checked={filters.hazmat === "Y"}
          onCheckedChange={(checked) =>
            onFilterChange("hazmat", checked ? "Y" : "")
          }
          className="scale-90"
        />
        <Label className="text-xs font-medium text-[#0A0A0A] cursor-pointer whitespace-nowrap">
          HazMat Only
        </Label>
      </div>

      {/* Level III Toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white">
        <Switch
          data-testid="filter-level-iii"
          checked={filters.level_iii === "Y"}
          onCheckedChange={(checked) =>
            onFilterChange("level_iii", checked ? "Y" : "")
          }
          className="scale-90"
        />
        <Label className="text-xs font-medium text-[#0A0A0A] cursor-pointer whitespace-nowrap">
          Level III
        </Label>
      </div>

      {/* Critical Toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white">
        <Switch
          data-testid="filter-critical"
          checked={filters.critical === "Y"}
          onCheckedChange={(checked) =>
            onFilterChange("critical", checked ? "Y" : "")
          }
          className="scale-90"
        />
        <Label className="text-xs font-medium text-[#0A0A0A] cursor-pointer whitespace-nowrap">
          Critical
        </Label>
      </div>
    </div>
  );
}
