import { useState, useEffect, useCallback } from "react";
import { Bookmark, Plus, ChevronRight, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function SaveToInspection({ violation, className = "" }) {
  const [inspections, setInspections] = useState([]);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedInspId, setSavedInspId] = useState(null);
  const [savedItemId, setSavedItemId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const checkSavedStatus = useCallback((inspList) => {
    for (const insp of inspList) {
      const item = insp.items?.find((i) => i.violation_id === violation.id);
      if (item) {
        setSaved(true);
        setSavedInspId(insp.id);
        setSavedItemId(item.item_id);
        return;
      }
    }
    setSaved(false);
    setSavedInspId(null);
    setSavedItemId(null);
  }, [violation.id]);

  useEffect(() => {
    if (open) {
      fetchInspections();
      setShowAll(false);
    }
  }, [open]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get(`${API}/inspections`);
        checkSavedStatus(res.data.inspections || []);
      } catch { /* ignore */ }
    };
    check();
  }, [checkSavedStatus]);

  const fetchInspections = async () => {
    try {
      const res = await axios.get(`${API}/inspections`);
      const list = res.data.inspections || [];
      setInspections(list);
      checkSavedStatus(list);
    } catch { /* ignore */ }
  };

  const addToInspection = async (inspectionId) => {
    try {
      await axios.post(`${API}/inspections/${inspectionId}/violations`, {
        violation_id: violation.id,
        regulatory_reference: violation.regulatory_reference,
        violation_text: violation.violation_text,
        violation_class: violation.violation_class,
        violation_code: violation.violation_code,
        cfr_part: violation.cfr_part,
        oos_value: violation.oos_value,
      });
      setSaved(true);
      setSavedInspId(inspectionId);
      toast.success("Saved to inspection");
      setOpen(false);
      fetchInspections();
    } catch {
      toast.error("Failed to save");
    }
  };

  const removeFromInspection = async () => {
    if (!savedInspId || !savedItemId) return;
    try {
      await axios.delete(`${API}/inspections/${savedInspId}/violations/${savedItemId}`);
      setSaved(false);
      setSavedInspId(null);
      setSavedItemId(null);
      toast.success("Removed from inspection");
      setOpen(false);
    } catch {
      toast.error("Failed to remove");
    }
  };

  const createAndAdd = async () => {
    try {
      const res = await axios.post(`${API}/inspections`, {});
      await addToInspection(res.data.id);
    } catch {
      toast.error("Failed to create inspection");
    }
  };

  // Most recent inspection (first in list, sorted by created_at desc)
  const mostRecent = inspections.length > 0 ? inspections[0] : null;
  const mostRecentAlreadyIn = mostRecent?.items?.some((i) => i.violation_id === violation.id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={`p-1.5 rounded-md transition-colors ${saved ? "text-[#D4AF37] bg-[#D4AF37]/10" : "text-[#94A3B8] hover:text-[#D4AF37] hover:bg-[#D4AF37]/5"} ${className}`}
          title={saved ? "Saved to inspection" : "Save to inspection"}
          data-testid="save-violation-btn"
        >
          {saved ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] p-3"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {/* If already saved, show remove option */}
        {saved && (
          <div className="mb-3 pb-3 border-b">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#D4AF37] mb-2">Saved</p>
            <button
              onClick={removeFromInspection}
              className="w-full text-left px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-2 text-xs text-[#DC2626]"
              data-testid="remove-from-inspection-btn"
            >
              <X className="w-3.5 h-3.5" />
              Remove from inspection
            </button>
          </div>
        )}

        <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-2">
          {saved ? "Move to another" : "Save to inspection"}
        </p>

        {/* Show most recent inspection by default */}
        {mostRecent && !showAll && (
          <div className="space-y-1.5">
            <button
              onClick={() => !mostRecentAlreadyIn && addToInspection(mostRecent.id)}
              disabled={mostRecentAlreadyIn}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${mostRecentAlreadyIn ? "bg-[#D4AF37]/10 cursor-default" : "bg-[#F8FAFC] hover:bg-[#F1F5F9]"}`}
              data-testid={`save-to-recent`}
            >
              {mostRecentAlreadyIn ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#D4AF37" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-[#CBD5E1] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#334155] truncate">{mostRecent.title}</p>
                <p className="text-[10px] text-[#94A3B8]">{mostRecent.items?.length || 0} violations</p>
              </div>
            </button>

            {inspections.length > 1 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full text-left px-3 py-1.5 rounded-md hover:bg-[#F8FAFC] transition-colors flex items-center gap-2 text-[11px] text-[#64748B]"
                data-testid="show-all-inspections-btn"
              >
                <ChevronRight className="w-3 h-3" />
                Choose other inspection
              </button>
            )}
          </div>
        )}

        {/* Show all inspections */}
        {showAll && (
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {inspections.map((insp) => {
              const alreadyIn = insp.items?.some((i) => i.violation_id === violation.id);
              return (
                <button
                  key={insp.id}
                  onClick={() => !alreadyIn && addToInspection(insp.id)}
                  disabled={alreadyIn}
                  className={`w-full text-left px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${alreadyIn ? "bg-[#D4AF37]/10 cursor-default" : "hover:bg-[#F1F5F9]"}`}
                  data-testid={`save-to-${insp.id}`}
                >
                  {alreadyIn ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#D4AF37" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  ) : (
                    <Bookmark className="w-3 h-3 text-[#CBD5E1] flex-shrink-0" />
                  )}
                  <span className="text-xs text-[#334155] truncate flex-1">{insp.title}</span>
                  <span className="text-[10px] text-[#94A3B8]">{insp.items?.length || 0}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* No inspections */}
        {inspections.length === 0 && (
          <p className="text-xs text-[#94A3B8] py-2">No inspections yet</p>
        )}

        <div className="border-t mt-2 pt-2">
          <button
            onClick={createAndAdd}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[#002855]/5 transition-colors flex items-center gap-2 text-xs text-[#002855] font-semibold"
            data-testid="create-and-save-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            New Inspection
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
