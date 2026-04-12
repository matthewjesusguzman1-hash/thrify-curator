import { X } from "lucide-react";
import { Badge } from "../ui/badge";

const FILTER_LABELS = {
  violation_class: "Class",
  oos: "OOS",
  hazmat: "HazMat",
  level_iii: "Level III",
  critical: "Critical",
};

export function ActiveFilters({ filters, onClearFilter, onClearAll, expandedTerms }) {
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value && value !== ""
  );

  if (activeFilters.length === 0 && (!expandedTerms || expandedTerms.length === 0)) {
    return null;
  }

  return (
    <div
      data-testid="active-filters"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-[#6B7280] font-medium">Active:</span>

      {activeFilters.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="filter-badge flex items-center gap-1 px-2.5 py-1 text-xs bg-[#002855]/10 text-[#002855] border-[#002855]/20 hover:bg-[#002855]/20"
          data-testid={`active-filter-${key}`}
        >
          <span className="font-semibold">{FILTER_LABELS[key] || key}:</span>
          <span>{value}</span>
          <button
            onClick={() => onClearFilter(key)}
            className="ml-0.5 hover:text-[#DC2626] transition-colors"
            data-testid={`clear-filter-${key}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {expandedTerms && expandedTerms.length > 0 && (
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-[#D4AF37] font-medium">AI terms:</span>
          {expandedTerms.slice(0, 5).map((term, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="text-xs px-2 py-0.5 border-[#D4AF37]/30 text-[#D4AF37] bg-[#D4AF37]/5"
              data-testid={`ai-term-${idx}`}
            >
              {term}
            </Badge>
          ))}
          {expandedTerms.length > 5 && (
            <span className="text-xs text-[#6B7280]">
              +{expandedTerms.length - 5} more
            </span>
          )}
        </div>
      )}

      {activeFilters.length > 0 && (
        <button
          data-testid="clear-all-filters"
          onClick={onClearAll}
          className="text-xs text-[#DC2626] hover:text-[#991B1B] font-medium ml-1 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
