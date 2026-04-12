import { useState, useEffect, useCallback } from "react";
import { Bookmark, Plus } from "lucide-react";
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

  const checkIfSaved = useCallback((inspList) => {
    return inspList.some((insp) =>
      insp.items?.some((item) => item.violation_id === violation.id)
    );
  }, [violation.id]);

  useEffect(() => {
    if (open) fetchInspections();
  }, [open]);

  // Check saved status on mount
  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get(`${API}/inspections`);
        const list = res.data.inspections || [];
        setSaved(checkIfSaved(list));
      } catch {
        // ignore
      }
    };
    check();
  }, [checkIfSaved]);

  const fetchInspections = async () => {
    try {
      const res = await axios.get(`${API}/inspections`);
      const list = res.data.inspections || [];
      setInspections(list);
      setSaved(checkIfSaved(list));
    } catch {
      // ignore
    }
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
      toast.success("Violation saved to inspection");
      setOpen(false);
    } catch {
      toast.error("Failed to save");
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={`transition-colors ${saved ? "text-[#D4AF37]" : "text-[#94A3B8] hover:text-[#D4AF37]"} ${className}`}
          title={saved ? "Saved to inspection" : "Save to inspection"}
          data-testid="save-violation-btn"
        >
          {saved ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-2"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] px-2 pb-2">
          Save to inspection
        </p>
        {inspections.length > 0 ? (
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {inspections.map((insp) => {
              const alreadyIn = insp.items?.some((item) => item.violation_id === violation.id);
              return (
                <button
                  key={insp.id}
                  onClick={() => !alreadyIn && addToInspection(insp.id)}
                  disabled={alreadyIn}
                  className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center gap-2 ${alreadyIn ? "opacity-60 cursor-default" : "hover:bg-[#F1F5F9]"}`}
                  data-testid={`save-to-${insp.id}`}
                >
                  {alreadyIn ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#D4AF37" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                    </svg>
                  ) : (
                    <Bookmark className="w-3 h-3 text-[#CBD5E1] flex-shrink-0" />
                  )}
                  <span className="text-xs text-[#334155] truncate flex-1">{insp.title}</span>
                  <span className="text-[10px] text-[#94A3B8]">{insp.items?.length || 0}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#94A3B8] px-2 py-2">No inspections yet</p>
        )}
        <div className="border-t mt-1 pt-1">
          <button
            onClick={createAndAdd}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F1F5F9] transition-colors flex items-center gap-2 text-xs text-[#002855] font-medium"
            data-testid="create-and-save-btn"
          >
            <Plus className="w-3 h-3" />
            New Inspection
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
