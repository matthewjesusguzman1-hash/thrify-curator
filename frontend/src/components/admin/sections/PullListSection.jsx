import { useState, useEffect, useCallback, useRef } from "react";
import { Package, Check, CheckCheck, Printer, RotateCcw, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PullListSection({ getAuthHeader }) {
  const [items, setItems] = useState([]);
  const [rowCounts, setRowCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showPulled, setShowPulled] = useState(false);
  const [dateRange, setDateRange] = useState("all");
  const [collapsedRows, setCollapsedRows] = useState(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const printRef = useRef(null);

  const getDateParams = useCallback(() => {
    const now = new Date();
    const params = new URLSearchParams();
    if (dateRange === "today") {
      params.set("since", now.toISOString().split("T")[0]);
      params.set("until", now.toISOString().split("T")[0]);
    } else if (dateRange === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.set("since", weekAgo.toISOString().split("T")[0]);
    } else if (dateRange === "period") {
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      params.set("since", twoWeeksAgo.toISOString().split("T")[0]);
    }
    if (showPulled) params.set("show_pulled", "true");
    return params.toString();
  }, [dateRange, showPulled]);

  const fetchPullList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = getDateParams();
      const { data } = await axios.get(`${API}/inventory/pull-list?${qs}`, {
        headers: getAuthHeader(),
      });
      setItems(data.items || []);
      setRowCounts(data.rows || {});
      setSelected(new Set());
    } catch (err) {
      toast.error("Failed to load pull list");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, getDateParams]);

  useEffect(() => {
    fetchPullList();
  }, [fetchPullList]);

  const handleMarkPulled = async (ids) => {
    try {
      await axios.post(`${API}/inventory/pull-list/mark-pulled`, { item_ids: ids }, {
        headers: getAuthHeader(),
      });
      toast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} marked as pulled`);
      fetchPullList();
    } catch {
      toast.error("Failed to mark items");
    }
  };

  const handleReset = async (ids) => {
    try {
      await axios.post(`${API}/inventory/pull-list/reset`, { item_ids: ids }, {
        headers: getAuthHeader(),
      });
      toast.success("Items unmarked");
      fetchPullList();
    } catch {
      toast.error("Failed to reset");
    }
  };

  const handleMarkAllPulled = async () => {
    try {
      const qs = getDateParams();
      await axios.post(`${API}/inventory/pull-list/mark-all-pulled?${qs}`, {}, {
        headers: getAuthHeader(),
      });
      toast.success("All items marked as pulled");
      fetchPullList();
    } catch {
      toast.error("Failed to mark all");
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.filter(i => !i.pulled).length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.filter(i => !i.pulled).map(i => i.id)));
    }
  };

  const toggleRow = (letter) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  // Group items by row letter
  const groupedItems = {};
  items.forEach((item) => {
    const sku = item.sku || "?";
    let rowLetter = "";
    for (const ch of sku) {
      if (/[a-zA-Z]/.test(ch)) rowLetter += ch.toUpperCase();
      else break;
    }
    if (!rowLetter) rowLetter = "?";
    if (!groupedItems[rowLetter]) groupedItems[rowLetter] = [];
    groupedItems[rowLetter].push(item);
  });

  const sortedRowKeys = Object.keys(groupedItems).sort();
  const unpulledCount = items.filter(i => !i.pulled).length;

  return (
    <div className="dashboard-card" data-testid="pull-list-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#FFB800]" />
          <h3 className="text-base font-semibold text-white">Pull List</h3>
          {unpulledCount > 0 && (
            <Badge variant="secondary" className="bg-[#FFB800]/20 text-[#FFB800] text-xs" data-testid="pull-list-count">
              {unpulledCount} to pull
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#aaa] hover:text-white h-7 px-2"
            onClick={handlePrint}
            data-testid="pull-list-print-btn"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="pull-list-filters">
        <div className="flex bg-[#1a1a2e] rounded-lg p-0.5 gap-0.5">
          {[
            { value: "all", label: "All Sold" },
            { value: "today", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "period", label: "2 Weeks" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                dateRange === opt.value
                  ? "bg-[#FFB800] text-black font-medium"
                  : "text-[#888] hover:text-white"
              }`}
              data-testid={`pull-list-filter-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-[#888] cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showPulled}
            onChange={(e) => setShowPulled(e.target.checked)}
            className="accent-[#FFB800] w-3.5 h-3.5"
            data-testid="pull-list-show-pulled"
          />
          Show pulled
        </label>
      </div>

      {/* Bulk Actions */}
      {unpulledCount > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#888] hover:text-white h-7"
            onClick={selectAll}
            data-testid="pull-list-select-all"
          >
            {selected.size === unpulledCount ? "Deselect All" : "Select All"}
          </Button>
          {selected.size > 0 && (
            <Button
              size="sm"
              className="bg-[#10B981] hover:bg-[#059669] text-white text-xs h-7"
              onClick={() => handleMarkPulled([...selected])}
              data-testid="pull-list-mark-selected"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Mark {selected.size} Pulled
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#FFB800] hover:text-[#FFB800]/80 h-7 ml-auto"
            onClick={handleMarkAllPulled}
            data-testid="pull-list-mark-all"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Mark All Pulled
          </Button>
        </div>
      )}

      {/* Items grouped by row */}
      <div ref={printRef} className="space-y-2" data-testid="pull-list-items">
        {loading ? (
          <div className="text-center py-8 text-[#666]">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-[#666]" data-testid="pull-list-empty">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No items to pull</p>
            <p className="text-xs mt-1">Sold items from your Vendoo import will appear here</p>
          </div>
        ) : (
          sortedRowKeys.map((rowLetter) => {
            const rowItems = groupedItems[rowLetter];
            const isCollapsed = collapsedRows.has(rowLetter);
            const rowPulled = rowItems.filter(i => i.pulled).length;
            const rowUnpulled = rowItems.length - rowPulled;

            return (
              <div key={rowLetter} className="border border-[#2a2a3e] rounded-lg overflow-hidden" data-testid={`pull-list-row-${rowLetter}`}>
                {/* Row header */}
                <button
                  onClick={() => toggleRow(rowLetter)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#1a1a2e] hover:bg-[#1e1e35] transition-colors"
                  data-testid={`pull-list-row-toggle-${rowLetter}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#FFB800] w-8">{rowLetter}</span>
                    <span className="text-xs text-[#888]">
                      Row {rowLetter} &middot; {rowItems.length} item{rowItems.length !== 1 ? "s" : ""}
                    </span>
                    {rowUnpulled > 0 && (
                      <Badge className="bg-[#FF6B6B]/20 text-[#FF6B6B] text-[10px] h-5">
                        {rowUnpulled} pending
                      </Badge>
                    )}
                    {rowUnpulled === 0 && rowItems.length > 0 && (
                      <Badge className="bg-[#10B981]/20 text-[#10B981] text-[10px] h-5">
                        All pulled
                      </Badge>
                    )}
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-[#666]" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-[#666]" />
                  )}
                </button>

                {/* Row items */}
                {!isCollapsed && (
                  <div className="divide-y divide-[#2a2a3e]/50">
                    {rowItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                          item.pulled
                            ? "bg-[#10B981]/5 opacity-60"
                            : selected.has(item.id)
                            ? "bg-[#FFB800]/10"
                            : "hover:bg-[#1a1a2e]/50"
                        }`}
                        data-testid={`pull-list-item-${item.id}`}
                      >
                        {/* Checkbox / pulled indicator */}
                        {item.pulled ? (
                          <button
                            onClick={() => handleReset([item.id])}
                            className="flex-shrink-0 w-6 h-6 rounded bg-[#10B981]/20 flex items-center justify-center hover:bg-[#10B981]/40 transition-colors"
                            title="Undo pull"
                            data-testid={`pull-list-undo-${item.id}`}
                          >
                            <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded border transition-colors flex items-center justify-center ${
                              selected.has(item.id)
                                ? "border-[#FFB800] bg-[#FFB800]/20"
                                : "border-[#444] hover:border-[#666]"
                            }`}
                            data-testid={`pull-list-check-${item.id}`}
                          >
                            {selected.has(item.id) && (
                              <Check className="w-3.5 h-3.5 text-[#FFB800]" />
                            )}
                          </button>
                        )}

                        {/* SKU */}
                        <span className="text-sm font-mono font-bold text-[#FFB800] w-16 flex-shrink-0" data-testid={`pull-list-sku-${item.id}`}>
                          {item.sku || "—"}
                        </span>

                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${item.pulled ? "line-through text-[#666]" : "text-white"}`}>
                            {item.title || "Untitled"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.platform && (
                              <span className="text-[10px] text-[#888]">{item.platform}</span>
                            )}
                            {item.sold_date && (
                              <span className="text-[10px] text-[#666]">
                                Sold {new Date(item.sold_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            {item.price_sold != null && (
                              <span className="text-[10px] text-[#10B981]">${item.price_sold.toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        {/* Quick pull button */}
                        {!item.pulled && !selected.has(item.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#10B981] hover:bg-[#10B981]/20 h-7 px-2 flex-shrink-0"
                            onClick={() => handleMarkPulled([item.id])}
                            data-testid={`pull-list-pull-${item.id}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [data-testid="pull-list-section"],
          [data-testid="pull-list-section"] * {
            visibility: visible !important;
          }
          [data-testid="pull-list-section"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 16px;
          }
          [data-testid="pull-list-section"] button:not([data-testid^="pull-list-row-toggle"]) {
            display: none !important;
          }
          [data-testid="pull-list-filters"],
          [data-testid="pull-list-print-btn"] {
            display: none !important;
          }
          [data-testid="pull-list-section"] .dashboard-card {
            border: none !important;
            box-shadow: none !important;
          }
          [data-testid^="pull-list-row-"] {
            border: 1px solid #ccc !important;
            break-inside: avoid;
          }
          [data-testid^="pull-list-row-"] button {
            background: #f5f5f5 !important;
            color: black !important;
          }
          .text-\\[\\#FFB800\\] { color: #333 !important; }
          .text-white, .text-\\[\\#888\\], .text-\\[\\#666\\], .text-\\[\\#10B981\\] { color: #333 !important; }
          .bg-\\[\\#1a1a2e\\] { background: #f5f5f5 !important; }
          .line-through { text-decoration: line-through; color: #999 !important; }
        }
      `}</style>
    </div>
  );
}
