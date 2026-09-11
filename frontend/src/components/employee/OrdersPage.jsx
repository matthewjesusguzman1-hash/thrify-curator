import { useState, useEffect, useCallback } from "react";
import {
  Package, Check, CheckCircle, ChevronLeft, FileText,
  Image as ImageIcon, Loader2, AlertTriangle, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OrdersPage({ user, getAuthHeader, onBack }) {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

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
        await axios.post(
          `${API}/orders/my-assignment/reset-pulled`,
          [item.id],
          getAuthHeader()
        );
      } else {
        await axios.post(
          `${API}/orders/my-assignment/mark-pulled`,
          [item.id],
          getAuthHeader()
        );
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
      const ok = window.confirm(
        `${unpulled.length} item${unpulled.length > 1 ? "s" : ""} not pulled yet. Complete anyway?`
      );
      if (!ok) return;
    }
    setCompleting(true);
    try {
      await axios.post(
        `${API}/orders/complete/${assignment.id}`,
        {},
        getAuthHeader()
      );
      toast.success("Orders completed!");
      onBack();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to complete");
    } finally {
      setCompleting(false);
    }
  };

  // Build match map: item_id -> label info
  const matchMap = {};
  const matchedLabelIds = new Set();
  if (assignment?.matches) {
    for (const m of assignment.matches) {
      matchMap[m.item_id] = m;
      matchedLabelIds.add(m.label_id);
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
        <button onClick={onBack} className="mt-4 text-sm text-[#00D4FF] hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24" data-testid="orders-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors"
            data-testid="orders-back-btn"
          >
            <ChevronLeft className="w-4 h-4" />
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showLabels
                ? "bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/20"
                : "bg-white/[0.05] text-white/50 border border-white/[0.08]"
            }`}
            data-testid="toggle-labels-btn"
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Labels ({assignment.labels?.length || 0})
          </button>
        </div>
      </div>

      {/* Admin Notes */}
      {assignment.notes && (
        <div className="p-3 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/15">
          <p className="text-xs text-[#8B5CF6]/80">{assignment.notes}</p>
        </div>
      )}

      {/* Labels Panel */}
      {showLabels && (
        <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <h3 className="text-sm font-medium text-white/70 mb-2">
            Shipping Labels
            {assignment.matches?.length > 0 && (
              <span className="ml-2 text-xs text-[#10B981]">
                {assignment.matches.length} auto-matched
              </span>
            )}
          </h3>
          {(assignment.labels || []).length === 0 ? (
            <p className="text-xs text-white/30">No labels attached</p>
          ) : (
            (assignment.labels || []).map((label) => {
              const match = assignment.matches?.find((m) => m.label_id === label.id);
              const matchedItem = match ? items.find((i) => i.id === match.item_id) : null;

              return (
                <div
                  key={label.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  data-testid={`order-label-${label.id}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    {label.content_type?.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 text-[#FF6B35]/60" />
                    ) : (
                      <FileText className="w-4 h-4 text-[#FF6B35]/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{label.filename}</p>
                    {match && matchedItem ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Link2 className="w-3 h-3 text-[#10B981]" />
                        <span className="text-[10px] text-[#10B981]">
                          Matched: {matchedItem.sku} — {matchedItem.title?.slice(0, 40)}
                        </span>
                        <span className="text-[10px] text-white/30 ml-1">({match.confidence}%)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                        <span className="text-[10px] text-[#F59E0B]">No match found</span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`${API}/orders/labels/${label.id}/file?token=${localStorage.getItem("token")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#00D4FF] hover:underline flex-shrink-0"
                  >
                    View
                  </a>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pull List */}
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No items to pull</p>
        ) : (
          items.map((item) => {
            const match = matchMap[item.id];
            return (
              <button
                key={item.id}
                onClick={() => handleTogglePull(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  item.pulled
                    ? "bg-[#10B981]/5 border border-[#10B981]/15"
                    : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]"
                }`}
                data-testid={`pull-item-${item.id}`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.pulled
                      ? "bg-[#10B981] text-white"
                      : "border-2 border-white/15"
                  }`}
                >
                  {item.pulled && <Check className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-base font-bold tracking-wide ${
                        item.pulled ? "text-[#10B981]/70" : "text-[#FFB800]"
                      }`}
                    >
                      {item.sku || "—"}
                    </span>
                    {match && (
                      <Link2 className="w-3 h-3 text-[#10B981] flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm truncate ${item.pulled ? "text-white/30 line-through" : "text-white/70"}`}>
                    {item.title || "Untitled"}
                  </p>
                  {item.platform && (
                    <span className="text-[10px] text-white/30 capitalize">{item.platform}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Unmatched Labels Warning */}
      {unmatchedLabels.length > 0 && !showLabels && (
        <div className="p-3 rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/15">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <p className="text-xs text-[#F59E0B]">
              {unmatchedLabels.length} label{unmatchedLabels.length > 1 ? "s" : ""} not matched to any item
            </p>
          </div>
          <button
            onClick={() => setShowLabels(true)}
            className="text-xs text-[#00D4FF] hover:underline mt-1"
          >
            View labels
          </button>
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
          {completing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-5 h-5 mr-2" />
          )}
          {completing ? "Completing..." : "Complete Orders"}
        </Button>
      </div>
    </div>
  );
}
