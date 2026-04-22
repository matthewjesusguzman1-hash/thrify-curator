import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, Loader2, X } from "lucide-react";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { QuickNotesButton } from "./QuickNotesButton";

export function SearchBar({
  keyword,
  onKeywordChange,
  onSearch,
  aiMode,
  onAiModeChange,
  isSearching,
}) {
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const debounceRef = useRef(null);

  // Auto-search on typing for regular mode (debounced)
  const prevLocalRef = useRef(localKeyword);
  useEffect(() => {
    if (aiMode) return;
    if (prevLocalRef.current === localKeyword) return;
    prevLocalRef.current = localKeyword;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onKeywordChange(localKeyword);
      onSearch(localKeyword);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localKeyword, aiMode]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onKeywordChange(localKeyword);
        onSearch(localKeyword);
      }
    },
    [localKeyword, onKeywordChange, onSearch]
  );

  const handleSearchClick = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onKeywordChange(localKeyword);
    onSearch(localKeyword);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalKeyword("");
    onKeywordChange("");
    onSearch("");
  };

  // Sync with external keyword changes (e.g. tree clicks) only if user isn't actively typing
  useEffect(() => {
    if (keyword !== prevLocalRef.current) {
      setLocalKeyword(keyword);
      prevLocalRef.current = keyword;
    }
  }, [keyword]);

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search input (full width on mobile) */}
      <div
        className="search-glow flex items-center border border-[#94A3B8] rounded-lg bg-white shadow-sm overflow-hidden transition-all focus-within:border-[#002855] focus-within:shadow-md"
        data-testid="search-container"
      >
        <div className="pl-3 text-[#64748B]">
          {isSearching ? (
            <Loader2 className="w-4 h-4 loading-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <Input
          data-testid="search-input"
          type="text"
          placeholder={
            aiMode
              ? "Describe what you're looking for (e.g., 'tire problems', 'driver fatigue')..."
              : "Search violations by keyword, regulation, or code..."
          }
          value={localKeyword}
          onChange={(e) => setLocalKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="border-0 focus-visible:ring-0 text-sm h-10 bg-transparent text-[#0F172A]"
        />
        {localKeyword && (
          <button
            data-testid="search-clear-btn"
            onClick={handleClear}
            className="px-2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          data-testid="search-btn"
          onClick={handleSearchClick}
          disabled={isSearching}
          className="px-4 h-10 bg-[#002855] text-white text-sm font-medium hover:bg-[#001a3a] transition-colors disabled:opacity-50"
        >
          {aiMode ? "AI Search" : "Search"}
        </button>
      </div>

      {/* Row 2: AI toggle (stretches) + Quick Notes button, side-by-side so
          there's no awkward negative space on either side on mobile. */}
      <div className="flex items-stretch gap-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white flex-1"
          data-testid="ai-toggle-container"
        >
          <Sparkles
            className={`w-4 h-4 transition-colors ${
              aiMode ? "text-[#D4AF37]" : "text-[#94A3B8]"
            }`}
          />
          <Switch
            data-testid="ai-toggle"
            checked={aiMode}
            onCheckedChange={onAiModeChange}
            className={aiMode ? "ai-toggle-active" : ""}
          />
          <Label
            className="text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{ color: aiMode ? "#B8960E" : "#64748B" }}
          >
            AI Search
          </Label>
        </div>

        <QuickNotesButton />
      </div>
    </div>
  );
}
