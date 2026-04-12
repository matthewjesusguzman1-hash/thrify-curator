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
      <div className="flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-[#7B8FA3]">
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
          className="w-[180px] h-9 text-xs bg-[#001f45] border-[#0a3d6b] text-[#F9FAFB]"
        >
          <SelectValue placeholder="Violation Class" />
        </SelectTrigger>
        <SelectContent className="bg-[#001f45] border-[#0a3d6b]">
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
          className="w-[160px] h-9 text-xs bg-[#001f45] border-[#0a3d6b] text-[#F9FAFB]"
        >
          <SelectValue placeholder="OOS Status" />
        </SelectTrigger>
        <SelectContent className="bg-[#001f45] border-[#0a3d6b]">
          <SelectItem value="all">All OOS</SelectItem>
          <SelectItem value="Y">Out of Service (Y)</SelectItem>
          <SelectItem value="N">Not OOS (N)</SelectItem>
        </SelectContent>
      </Select>

      {/* HazMat Toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#0a3d6b] bg-[#001f45]">
        <Switch
          data-testid="filter-hazmat"
          checked={filters.hazmat === "Y"}
          onCheckedChange={(checked) =>
            onFilterChange("hazmat", checked ? "Y" : "")
          }
          className="scale-90"
        />
        <Label className="text-xs font-medium text-[#C8D6E0] cursor-pointer whitespace-nowrap">
          HazMat Only
        </Label>
      </div>

      {/* Level III Toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#0a3d6b] bg-[#001f45]">
        <Switch
          data-testid="filter-level-iii"
          checked={filters.level_iii === "Y"}
          onCheckedChange={(checked) =>
            onFilterChange("level_iii", checked ? "Y" : "")
          }
          className="scale-90"
        />
        <Label className="text-xs font-medium text-[#C8D6E0] cursor-pointer whitespace-nowrap">
          Level III
        </Label>
      </div>

      {/* Critical Toggle */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#0a3d6b] bg-[#001f45]">
        <Switch
          data-testid="filter-critical"
          checked={filters.critical === "Y"}
          onCheckedChange={(checked) =>
            onFilterChange("critical", checked ? "Y" : "")
          }
          className="scale-90"
        />
        <Label className="text-xs font-medium text-[#C8D6E0] cursor-pointer whitespace-nowrap">
          Critical
        </Label>
      </div>
    </div>
  );
}
