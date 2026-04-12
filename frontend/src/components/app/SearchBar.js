import { useState, useCallback } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function SearchBar({
  keyword,
  onKeywordChange,
  onSearch,
  aiMode,
  onAiModeChange,
  isSearching,
}) {
  const [localKeyword, setLocalKeyword] = useState(keyword);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        onKeywordChange(localKeyword);
        onSearch(localKeyword);
      }
    },
    [localKeyword, onKeywordChange, onSearch]
  );

  const handleSearchClick = () => {
    onKeywordChange(localKeyword);
    onSearch(localKeyword);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div
        className="search-glow flex-1 flex items-center border rounded-lg bg-white overflow-hidden transition-all"
        data-testid="search-container"
      >
        <div className="pl-3 text-[#6B7280]">
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
          className="border-0 focus-visible:ring-0 text-sm h-10"
        />
        <button
          data-testid="search-btn"
          onClick={handleSearchClick}
          disabled={isSearching}
          className="px-4 h-10 bg-[#002855] text-white text-sm font-medium hover:bg-[#001a3a] transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white"
        data-testid="ai-toggle-container"
      >
        <Sparkles
          className={`w-4 h-4 transition-colors ${
            aiMode ? "text-[#D4AF37]" : "text-[#6B7280]"
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
          style={{ color: aiMode ? "#D4AF37" : "#6B7280" }}
        >
          AI Search
        </Label>
      </div>
    </div>
  );
}
