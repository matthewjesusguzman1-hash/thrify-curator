import { useState, useEffect, useCallback } from "react";
import {
  Package, Check, CheckCircle, ChevronLeft, FileText,
  Image as ImageIcon, Loader2, AlertTriangle, Link2,
  Printer, Eye, Tag, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OrdersPage({ user, getAuthHeader, onBack }) {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [expandedLabel, setExpandedLabel] = useState(null);
  const [filterMatched, setFilterMatched] = useState(false);

  const fetchAssignment = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/orders/my-assignment`, getAuthHeader());
      setAssignment(data.assignment);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => { fetchAssignment(); }, [fetchAssignment]);

  const handleTogglePull = async (item) => {
    const isPulled = item.pulled;
    try {
      if (isPulled) {
        await axios.post(`${API}/orders/my-assignment/reset-pulled`, [item.id], getAuthHeader());
      } else {
        await axios.post(`${API}/orders/my-assignment/mark-pulled`, [item.id], getAuthHeader());
      }
      setAssignment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, pulled: !isPulled, pulled_at: isPulled ? null : new Date().toISOString() } : i
          ),
        };
      });
    } catch (err) {
      toast.error("Failed to update item");
    }
  };

  const handleComplete = async () => {
    if (!assignment) return;
    const unpulled = (assignment.items || []).filter((i) => !i.pulled);
    if (unpulled.length > 0) {
      const ok = window.confirm(`${unpulled.length} item${unpulled.length > 1 ? "s" : ""} not pulled yet. Complete anyway?`);
      if (!ok) return;
    }
    setCompleting(true);
    try {
      await axios.post(`${API}/orders/complete/${assignment.id}`, {}, getAuthHeader());
      toast.success("Orders completed!");
      onBack();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to complete");
    } finally {
      setCompleting(false);
    }
  };

  const getLabelUrl = (labelId) =>
    `${API}/orders/labels/${labelId}/file?token=${localStorage.getItem("token")}`;

  const getPreviewUrl = (labelId) =>
    `${API}/orders/labels/${labelId}/preview?token=${localStorage.getItem("token")}`;

  const printLabel = (label) => {
    const url = getLabelUrl(label.id);
    const isImg = label.content_type?.startsWith("image/");
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { toast.error("Pop-up blocked — allow pop-ups to print"); return; }
    win.document.write(`
      <html><head><title>Print Label</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: flex-start; }
        img { max-width: 100%; height: auto; }
        iframe { width: 100%; height: 100vh; border: none; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${isImg
        ? `<img src="${url}" onload="setTimeout(()=>{window.print();},300)" />`
        : `<iframe src="${url}" onload="setTimeout(()=>{window.print();},500)"></iframe>`
      }
      </body></html>
    `);
    win.document.close();
  };

  const printAllLabels = () => {
    const allLabels = assignment?.labels || [];
    if (allLabels.length === 0) { toast.error("No labels to print"); return; }
    const token = localStorage.getItem("token");
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) { toast.error("Pop-up blocked — allow pop-ups to print"); return; }
    const imgs = allLabels.map((l) =>
      `<div class="label-page"><img src="${API}/orders/labels/${l.id}/preview?token=${token}" /></div>`
    ).join("\n");
    win.document.write(`
      <html><head><title>Print All Labels</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        .label-page { page-break-after: always; display: flex; justify-content: center; align-items: flex-start; padding: 0; }
        .label-page:last-child { page-break-after: auto; }
        .label-page img { max-width: 100%; height: auto; }
        @media print { .label-page { padding: 0; } }
      </style></head><body>
      ${imgs}
      <script>
        var total = ${allLabels.length}, loaded = 0;
        document.querySelectorAll('img').forEach(function(img) {
          if (img.complete) { loaded++; } else {
            img.onload = function() { loaded++; if (loaded >= total) setTimeout(function(){ window.print(); }, 300); };
            img.onerror = function() { loaded++; if (loaded >= total) setTimeout(function(){ window.print(); }, 300); };
          }
        });
        if (loaded >= total) setTimeout(function(){ window.print(); }, 500);
      </script>
      </body></html>
    `);
    win.document.close();
  };

  // Build match maps
  const matchByItem = {};   // item_id -> { match, label }
  const matchByLabel = {};  // label_id -> { match, item }
  const matchedLabelIds = new Set();

  if (assignment?.matches && assignment?.labels) {
    const labelMap = {};
    for (const l of assignment.labels) labelMap[l.id] = l;

    for (const m of assignment.matches) {
      const label = labelMap[m.label_id];
      const item = (assignment.items || []).find((i) => i.id === m.item_id);
      if (label) {
        matchByItem[m.item_id] = { match: m, label };
        matchByLabel[m.label_id] = { match: m, item };
        matchedLabelIds.add(m.label_id);
      }
    }
  }

  const unmatchedLabels = (assignment?.labels || []).filter((l) => !matchedLabelIds.has(l.id));
  const items = assignment?.items || [];
  const pulledCount = items.filter((i) => i.pulled).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        <p className="text-sm text-white/40 mt-3">Loading orders...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="w-10 h-10 text-white/20 mb-3" />
        <p className="text-sm text-white/40">No active orders assigned to you</p>
        <button onClick={onBack} className="mt-4 text-sm text-[#00D4FF] hover:underline">Back to Dashboard</button>
      </div>
    );
  }

  const isImage = (ct) => ct && ct.startsWith("image/");

  return (
    <div className="space-y-4 pb-24" data-testid="orders-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/50 hover:text-white/80 transition-colors" data-testid="orders-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white/90">Orders</h2>
            <p className="text-xs text-white/40">
              {pulledCount}/{items.length} pulled
              {assignment.since && ` — ${assignment.since}`}
              {assignment.until && assignment.until !== assignment.since && ` to ${assignment.until}`}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      {assignment.notes && (
        <div className="p-3 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/15">
          <p className="text-xs text-[#8B5CF6]/80">{assignment.notes}</p>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex gap-2">
        <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-white/80">{items.length}</p>
          <p className="text-[10px] text-white/35 uppercase">Items</p>
        </div>
        <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-[#FF6B35]">{assignment.labels?.length || 0}</p>
          <p className="text-[10px] text-white/35 uppercase">Labels</p>
        </div>
        <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-[#10B981]">{Object.keys(matchByItem).length}</p>
          <p className="text-[10px] text-white/35 uppercase">Matched</p>
        </div>
      </div>

      {/* Print All Labels */}
      {(assignment.labels?.length || 0) > 0 && (
        <button
          onClick={printAllLabels}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/15 transition-colors"
          data-testid="print-all-labels-btn"
        >
          <Printer className="w-4 h-4" />
          <span className="text-sm font-medium">Print All Labels ({assignment.labels.length})</span>
        </button>
      )}

      {/* Filter Chips */}
      {Object.keys(matchByItem).length > 0 && (
        <div className="flex gap-2" data-testid="order-filter-bar">
          <button
            onClick={() => setFilterMatched(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !filterMatched
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.05]"
            }`}
            data-testid="filter-all-btn"
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilterMatched(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMatched
                ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.05]"
            }`}
            data-testid="filter-matched-btn"
          >
            <Filter className="w-3 h-3" />
            With Labels ({Object.keys(matchByItem).length})
          </button>
        </div>
      )}

      {/* Pull List with Inline Matched Labels */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No items to pull</p>
        ) : (
          (filterMatched ? items.filter((i) => matchByItem[i.id]) : items).map((item) => {
            const linked = matchByItem[item.id];
            return (
              <div key={item.id} className="rounded-xl overflow-hidden">
                {/* Item Row */}
                <button
                  onClick={() => handleTogglePull(item)}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                    item.pulled
                      ? "bg-[#10B981]/5 border border-[#10B981]/15"
                      : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]"
                  } ${linked ? "rounded-t-xl border-b-0" : "rounded-xl"}`}
                  data-testid={`pull-item-${item.id}`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.pulled ? "bg-[#10B981] text-white" : "border-2 border-white/15"
                  }`}>
                    {item.pulled && <Check className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold tracking-wide ${item.pulled ? "text-[#10B981]/70" : "text-[#FFB800]"}`}>
                        {item.sku || "—"}
                      </span>
                      {linked && <Link2 className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />}
                    </div>
                    <p className={`text-sm truncate ${item.pulled ? "text-white/30 line-through" : "text-white/70"}`}>
                      {item.title || "Untitled"}
                    </p>
                    {item.platform && <span className="text-[10px] text-white/30 capitalize">{item.platform}</span>}
                  </div>
                </button>

                {/* Matched Label — shown directly under the item */}
                {linked && (
                  <div className={`border border-t-0 rounded-b-xl p-2.5 ${
                    item.pulled ? "border-[#10B981]/15 bg-[#10B981]/[0.02]" : "border-white/[0.06] bg-[#FF6B35]/[0.03]"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                        {isImage(linked.label.content_type) ? (
                          <ImageIcon className="w-3.5 h-3.5 text-[#FF6B35]" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 truncate">{linked.label.filename}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Tag className="w-2.5 h-2.5 text-[#10B981]" />
                          <span className="text-[10px] text-[#10B981] font-mono font-bold">
                            {linked.label.sku_tag || linked.match.reason}
                          </span>
                          <span className="text-[10px] text-white/20">({linked.match.confidence}%)</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedLabel(expandedLabel === linked.label.id ? null : linked.label.id); }}
                        className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                        data-testid={`preview-matched-${linked.label.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); printLabel(linked.label); }}
                        className="p-1.5 rounded-md text-white/30 hover:text-[#00D4FF] hover:bg-white/[0.05] transition-colors"
                        data-testid={`print-label-${linked.label.id}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Inline Preview */}
                    {expandedLabel === linked.label.id && (
                      <div className="mt-2 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                        <img src={getPreviewUrl(linked.label.id)} alt="Label" className="w-full max-h-[300px] object-contain" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Unmatched Labels Section */}
      {unmatchedLabels.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-sm font-medium text-[#F59E0B]">
              {unmatchedLabels.length} Unmatched Label{unmatchedLabels.length > 1 ? "s" : ""}
            </h3>
          </div>
          {unmatchedLabels.map((label) => (
            <div key={label.id} className="rounded-xl overflow-hidden border border-[#F59E0B]/15 bg-[#F59E0B]/[0.03]" data-testid={`unmatched-label-${label.id}`}>
              <div className="flex items-center gap-2.5 p-3">
                <div className="w-8 h-8 rounded-md bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                  {isImage(label.content_type) ? (
                    <ImageIcon className="w-4 h-4 text-[#F59E0B]" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#F59E0B]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{label.filename}</p>
                  {label.sku_tag && (
                    <span className="text-[10px] text-[#F59E0B] font-mono font-bold">SKU: {label.sku_tag}</span>
                  )}
                </div>
                <button
                  onClick={() => setExpandedLabel(expandedLabel === label.id ? null : label.id)}
                  className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => printLabel(label)}
                  className="p-1.5 rounded-md text-white/30 hover:text-[#00D4FF] hover:bg-white/[0.05] transition-colors"
                  data-testid={`print-unmatched-${label.id}`}
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
              {expandedLabel === label.id && (
                <div className="px-3 pb-3">
                  <div className="rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                    <img src={getPreviewUrl(label.id)} alt="Label" className="w-full max-h-[300px] object-contain" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14] to-transparent">
        <Button
          onClick={handleComplete}
          disabled={completing}
          className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-6 rounded-xl text-base"
          data-testid="complete-orders-btn"
        >
          {completing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          {completing ? "Completing..." : "Complete Orders"}
        </Button>
      </div>
    </div>
  );
}
