import { useState, useEffect } from "react";
import { Bookmark, Plus, Check } from "lucide-react";
import { Button } from "../ui/button";
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
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) fetchInspections();
  }, [open]);

  const fetchInspections = async () => {
    try {
      const res = await axios.get(`${API}/inspections`);
      setInspections(res.data.inspections || []);
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
      setCreating(false);
    } catch {
      toast.error("Failed to create inspection");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={`text-[#94A3B8] hover:text-[#D4AF37] transition-colors ${className}`}
          title="Save to inspection"
          data-testid="save-violation-btn"
        >
          <Bookmark className="w-4 h-4" />
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
            {inspections.map((insp) => (
              <button
                key={insp.id}
                onClick={() => addToInspection(insp.id)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F1F5F9] transition-colors flex items-center gap-2"
                data-testid={`save-to-${insp.id}`}
              >
                <span className="text-xs text-[#334155] truncate flex-1">{insp.title}</span>
                <span className="text-[10px] text-[#94A3B8]">{insp.items?.length || 0}</span>
              </button>
            ))}
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
