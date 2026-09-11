import { useState, useEffect, useCallback } from "react";
import { Package, Check, Printer, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PullListSection({ getAuthHeader }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [sinceDate, setSinceDate] = useState(todayStr);
  const [untilDate, setUntilDate] = useState(todayStr);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const applyPreset = (key) => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    let from = to;
    if (key === "3days") {
      const d = new Date(now); d.setDate(d.getDate() - 3);
      from = d.toISOString().split("T")[0];
    } else if (key === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
    }
    setSinceDate(from);
    setUntilDate(to);
  };

  const activePreset = (() => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    if (sinceDate === to && untilDate === to) return "today";
    const d3 = new Date(now); d3.setDate(d3.getDate() - 3);
    if (sinceDate === d3.toISOString().split("T")[0] && untilDate === to) return "3days";
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    if (sinceDate === d7.toISOString().split("T")[0] && untilDate === to) return "week";
    return null;
  })();

  const getDateParams = useCallback(() => {
    const params = new URLSearchParams();
    if (sinceDate) params.set("since", sinceDate);
    if (untilDate) params.set("until", untilDate);
    params.set("show_pulled", "true");
    return params.toString();
  }, [sinceDate, untilDate]);

  const fetchPullList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = getDateParams();
      const { data } = await axios.get(`${API}/inventory/pull-list?${qs}`, {
        headers: getAuthHeader(),
      });
      setItems(data.items || []);
      // Auto-expand all rows when list is small
      const rows = new Set();
      (data.items || []).forEach(i => {
        const sku = i.sku || "?";
        let r = "";
        for (const ch of sku) { if (/[a-zA-Z]/.test(ch)) r += ch.toUpperCase(); else break; }
        rows.add(r || "?");
      });
      setExpandedRows(rows);
    } catch {
      toast.error("Failed to load pull list");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, getDateParams]);

  useEffect(() => { fetchPullList(); }, [fetchPullList]);

  const markPulled = async (ids) => {
    try {
      await axios.post(`${API}/inventory/pull-list/mark-pulled`, { item_ids: ids }, { headers: getAuthHeader() });
      toast.success(`${ids.length} pulled`);
      setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, pulled: true } : i));
    } catch { toast.error("Failed"); }
  };

  const undoPull = async (ids) => {
    try {
      await axios.post(`${API}/inventory/pull-list/reset`, { item_ids: ids }, { headers: getAuthHeader() });
      toast.success("Undone");
      setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, pulled: false } : i));
    } catch { toast.error("Failed"); }
  };

  const markAllPulled = async () => {
    const unpulled = items.filter(i => !i.pulled);
    if (!unpulled.length) return;
    const ids = unpulled.map(i => i.id);
    try {
      await axios.post(`${API}/inventory/pull-list/mark-pulled`, { item_ids: ids }, { headers: getAuthHeader() });
      toast.success(`${ids.length} pulled`);
      setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, pulled: true } : i));
    } catch { toast.error("Failed"); }
  };

  const toggleRow = (letter) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter); else next.add(letter);
      return next;
    });
  };

  const handlePrint = () => {
    const rows = [];
    for (const row of rowKeys) {
      const rowItems = grouped[row];
      if (rowKeys.length > 1) {
        rows.push(`<tr class="row-hdr"><td colspan="3">ROW ${row}</td></tr>`);
      }
      for (const item of rowItems) {
        const cls = item.pulled ? ' class="pulled"' : '';
        rows.push(`<tr${cls}><td class="sku">${item.sku || "—"}</td><td>${item.title || "Untitled"}</td><td class="plat">${item.platform || ""}</td></tr>`);
      }
    }
    const dateLabel = sinceDate === untilDate ? sinceDate : `${sinceDate} — ${untilDate}`;
    const html = `<!DOCTYPE html><html><head><title>Pull List</title><style>
      body{font-family:-apple-system,system-ui,sans-serif;margin:0;padding:24px 32px;color:#000}
      h1{font-size:28px;font-weight:800;margin:0 0 4px;letter-spacing:-0.5px}
      .sub{font-size:14px;color:#555;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:14px}
      th{text-align:left;border-bottom:2px solid #000;padding:6px 0;font-size:12px;text-transform:uppercase;color:#666}
      td{padding:7px 10px 7px 0;border-bottom:1px solid #e0e0e0;vertical-align:top}
      .sku{font-weight:800;font-family:'SF Mono',Menlo,monospace;font-size:15px;white-space:nowrap;width:70px}
      .plat{color:#888;font-size:12px;text-align:right;white-space:nowrap}
      .row-hdr td{font-weight:800;font-size:14px;padding:16px 0 6px;border-bottom:2px solid #000;letter-spacing:0.5px;text-transform:uppercase}
      .pulled td{text-decoration:line-through;color:#aaa}
      @page{margin:0.5in}
    </style></head><body>
      <h1>Pull List</h1>
      <div class="sub">${dateLabel} &middot; ${totalCount} item${totalCount !== 1 ? "s" : ""} &middot; ${unpulledCount} to pull</div>
      <table><thead><tr><th>SKU</th><th>Item</th><th style="text-align:right">Platform</th></tr></thead><tbody>${rows.join("")}</tbody></table>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); };
  };
  const grouped = {};
  items.forEach(item => {
    const sku = item.sku || "?";
    let row = "";
    for (const ch of sku) { if (/[a-zA-Z]/.test(ch)) row += ch.toUpperCase(); else break; }
    if (!row) row = "?";
    (grouped[row] = grouped[row] || []).push(item);
  });
  const rowKeys = Object.keys(grouped).sort();
  const unpulledCount = items.filter(i => !i.pulled).length;
  const totalCount = items.length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f0f1a] p-4 sm:p-5" data-testid="pull-list-section">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <Package className="w-4 h-4 text-white/70" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90 leading-tight">Pull List</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {loading ? "Loading..." : unpulledCount > 0 ? `${unpulledCount} item${unpulledCount !== 1 ? "s" : ""} to pull` : totalCount > 0 ? "All pulled" : "No sold items"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          className="text-xs text-white/40 hover:text-white/70 h-7 px-2"
          onClick={handlePrint}
          data-testid="pull-list-print-btn"
        >
          <Printer className="w-3.5 h-3.5 mr-1" /> Print
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2.5 mb-4" data-testid="pull-list-filters">
        {/* Quick presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg bg-white/[0.04] p-1 gap-0.5">
            {[
              { value: "today", label: "Today" },
              { value: "3days", label: "3 Days" },
              { value: "week", label: "Week" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => applyPreset(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activePreset === opt.value
                    ? "bg-white/[0.12] text-white"
                    : "text-white/35 hover:text-white/60"
                }`}
                data-testid={`pull-list-filter-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Custom date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={sinceDate}
            onChange={e => setSinceDate(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/20 [color-scheme:dark]"
            data-testid="pull-list-date-from"
          />
          <span className="text-xs text-white/25">to</span>
          <input
            type="date"
            value={untilDate}
            onChange={e => setUntilDate(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/20 [color-scheme:dark]"
            data-testid="pull-list-date-to"
          />
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-1" data-testid="pull-list-items">
        {!loading && items.length === 0 ? (
          <div className="text-center py-10" data-testid="pull-list-empty">
            <p className="text-sm text-white/30">No items to pull</p>
            <p className="text-xs text-white/20 mt-1">Upload your Vendoo CSV in Sales Data above</p>
          </div>
        ) : (
          <>
            {rowKeys.map(row => {
              const rowItems = grouped[row];
              const open = expandedRows.has(row);
              const rowUnpulled = rowItems.filter(i => !i.pulled).length;

              return (
                <div key={row} data-testid={`pull-list-row-${row}`}>
                  {/* Row header — only show if multiple rows */}
                  {rowKeys.length > 1 && (
                    <button
                      onClick={() => toggleRow(row)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
                      data-testid={`pull-list-row-toggle-${row}`}
                    >
                      {open
                        ? <ChevronDown className="w-3.5 h-3.5 text-white/25" />
                        : <ChevronRight className="w-3.5 h-3.5 text-white/25" />
                      }
                      <span className="text-xs font-bold text-white/60 tracking-wide">ROW {row}</span>
                      <span className="text-[11px] text-white/25">{rowUnpulled > 0 ? `${rowUnpulled} left` : "done"}</span>
                    </button>
                  )}

                  {/* Items */}
                  {(open || rowKeys.length === 1) && (
                    <div className="space-y-0.5 ml-0">
                      {rowItems.map(item => (
                        <div
                          key={item.id}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            item.pulled ? "opacity-40" : "hover:bg-white/[0.03]"
                          }`}
                          data-testid={`pull-list-item-${item.id}`}
                        >
                          {/* Pull / undo button */}
                          <button
                            onClick={() => item.pulled ? undoPull([item.id]) : markPulled([item.id])}
                            className={`flex-shrink-0 w-7 h-7 rounded-md border flex items-center justify-center transition-all ${
                              item.pulled
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]"
                            }`}
                            data-testid={item.pulled ? `pull-list-undo-${item.id}` : `pull-list-pull-${item.id}`}
                          >
                            {item.pulled && <Check className="w-4 h-4 text-emerald-400" />}
                          </button>

                          {/* SKU */}
                          <span className="text-sm font-mono font-semibold text-white/80 w-14 flex-shrink-0 tabular-nums" data-testid={`pull-list-sku-${item.id}`}>
                            {item.sku || "—"}
                          </span>

                          {/* Title only */}
                          <span className={`text-sm flex-1 min-w-0 truncate ${
                            item.pulled ? "line-through text-white/30" : "text-white/70"
                          }`}>
                            {item.title || "Untitled"}
                          </span>

                          {/* Platform pill */}
                          {item.platform && (
                            <span className="text-[11px] text-white/25 flex-shrink-0 hidden sm:inline">
                              {item.platform}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mark all pulled bar */}
            {unpulledCount > 0 && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.06]">
                <span className="text-xs text-white/30">{unpulledCount} remaining</span>
                <Button
                  variant="ghost" size="sm"
                  className="text-xs text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-400/10 h-7"
                  onClick={markAllPulled}
                  data-testid="pull-list-mark-all"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Mark All Pulled
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
