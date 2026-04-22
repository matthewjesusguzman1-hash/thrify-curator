import { ShieldAlert, ShieldCheck, X } from "lucide-react";

/**
 * LiteFilterBar — the simplified filter row shown when Inspection Navigator
 * Lite mode is on. Two mutually-exclusive toggles — OOS only and Non-OOS only.
 * With neither toggled, both OOS and non-OOS violations are shown (default).
 *
 * Full FilterBar is still used outside lite mode.
 */
export function LiteFilterBar({ filters, onFilterChange }) {
  const oosActive = filters.oos === "Y";
  const nonOosActive = filters.oos === "N";

  return (
    <div data-testid="lite-filter-bar" className="bg-white rounded-lg border border-[#E2E8F0] p-2 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold tracking-wider uppercase text-[#64748B] px-2">
        Level III · Lite Filters
      </span>

      <button
        onClick={() => onFilterChange("oos", oosActive ? "" : "Y")}
        className={`flex items-center gap-2 px-3 h-10 rounded-lg font-bold text-sm transition-all flex-1 sm:flex-none ${
          oosActive
            ? "bg-[#DC2626] text-white border-2 border-[#991B1B] shadow-sm"
            : "bg-white text-[#DC2626] border-2 border-[#DC2626]/40 hover:border-[#DC2626]"
        }`}
        data-testid="lite-oos-toggle"
        aria-pressed={oosActive}
      >
        <ShieldAlert className="w-4 h-4" />
        <span>OOS</span>
      </button>

      <button
        onClick={() => onFilterChange("oos", nonOosActive ? "" : "N")}
        className={`flex items-center gap-2 px-3 h-10 rounded-lg font-bold text-sm transition-all flex-1 sm:flex-none ${
          nonOosActive
            ? "bg-[#047857] text-white border-2 border-[#065F46] shadow-sm"
            : "bg-white text-[#047857] border-2 border-[#047857]/40 hover:border-[#047857]"
        }`}
        data-testid="lite-non-oos-toggle"
        aria-pressed={nonOosActive}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Non-OOS</span>
      </button>

      {/* Subtle hint when neither toggle is on */}
      {!oosActive && !nonOosActive && (
        <span className="text-[10px] text-[#94A3B8] italic px-1 hidden sm:inline">
          Showing both OOS and non-OOS
        </span>
      )}

      {/* Clear all shortcut if any active filter besides level_iii exists */}
      {Object.entries(filters).some(([k, v]) => v !== "" && k !== "level_iii") && (
        <button
          onClick={() => {
            onFilterChange("oos", "");
            onFilterChange("hazmat", "");
            onFilterChange("critical", "");
            onFilterChange("violation_class", "");
            onFilterChange("violation_category", "");
            onFilterChange("reg_base", "");
          }}
          className="flex items-center gap-1 text-[11px] text-[#64748B] hover:text-[#002855] px-2"
          data-testid="lite-clear-filters"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
