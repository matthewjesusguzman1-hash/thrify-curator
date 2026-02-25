import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Clock, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TimeEntryModal({
  isOpen,
  onClose,
  mode, // 'add' or 'edit'
  entry, // for edit mode
  employees,
  getAuthHeader,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    employee_id: "",
    clock_in: "",
    clock_out: "",
    total_hours: "",
    admin_note: ""
  });
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState("times"); // 'times' or 'hours'

  // Reset form when modal opens or entry changes
  useEffect(() => {
    if (mode === 'edit' && entry) {
      // Convert ISO string to datetime-local format
      const formatForInput = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toISOString().slice(0, 16);
      };
      
      setFormData({
        employee_id: entry.user_id || "",
        clock_in: formatForInput(entry.clock_in),
        clock_out: formatForInput(entry.clock_out),
        total_hours: entry.total_hours?.toString() || "",
        admin_note: entry.admin_note || ""
      });
      setEditMode("times"); // Default to times mode
    } else if (mode === 'add') {
      setFormData({
        employee_id: "",
        clock_in: "",
        clock_out: "",
        total_hours: "",
        admin_note: ""
      });
      setEditMode("times");
    }
  }, [mode, entry, isOpen]);

  // Calculate hours from times
  const calculateHours = () => {
    if (formData.clock_in && formData.clock_out) {
      const inTime = new Date(formData.clock_in);
      const outTime = new Date(formData.clock_out);
      const hours = (outTime - inTime) / (1000 * 60 * 60);
      return hours > 0 ? hours.toFixed(2) : "0.00";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === 'edit') {
        const updatePayload = {};
        
        if (editMode === 'times') {
          // Update clock in/out times - backend will calculate hours
          updatePayload.clock_in = formData.clock_in ? new Date(formData.clock_in).toISOString() : null;
          updatePayload.clock_out = formData.clock_out ? new Date(formData.clock_out).toISOString() : null;
        } else {
          // Update total hours directly
          updatePayload.total_hours = parseFloat(formData.total_hours);
          // Include admin note when adjusting hours
          updatePayload.admin_note = formData.admin_note || null;
        }
        
        await axios.put(`${API}/admin/time-entries/${entry.id}`, updatePayload, getAuthHeader());
        toast.success("Time entry updated");
      } else {
        await axios.post(`${API}/admin/time-entries`, {
          employee_id: formData.employee_id,
          clock_in: new Date(formData.clock_in).toISOString(),
          clock_out: formData.clock_out ? new Date(formData.clock_out).toISOString() : null
        }, getAuthHeader());
        toast.success("Time entry created");
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${mode} entry`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEdit = mode === 'edit';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid={isEdit ? "edit-entry-modal" : "add-entry-modal"}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-playfair text-xl font-bold text-[#333]">
            {isEdit ? "Edit Time Entry" : "Add Time Entry"}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {isEdit && entry && (
          <div className="mb-4 p-3 bg-[#F9F6F7] rounded-xl">
            <p className="text-sm text-[#666]">Employee</p>
            <p className="font-semibold text-[#333]">{entry.user_name}</p>
          </div>
        )}

        {/* Edit Mode Toggle - Only show in edit mode */}
        {isEdit && (
          <div className="mb-4">
            <Label className="form-label mb-2 block">Adjustment Method</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditMode("times")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                  editMode === "times"
                    ? "border-[#00D4FF] bg-[#00D4FF]/10 text-[#00D4FF]"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Adjust Times</span>
              </button>
              <button
                type="button"
                onClick={() => setEditMode("hours")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${
                  editMode === "hours"
                    ? "border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span className="text-sm font-medium">Adjust Hours</span>
              </button>
            </div>
          </div>
        )}

        {!isEdit && (
          <p className="text-sm text-[#666] mb-4">
            Create a manual time entry for an employee who forgot to clock in or worked off-site.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="form-group">
              <Label className="form-label">Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger className="form-input" data-testid="add-entry-employee-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.role !== 'admin').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show times fields for add mode, or edit mode with "times" selected */}
          {(!isEdit || editMode === "times") && (
            <>
              <div className="form-group">
                <Label className="form-label">Clock In *</Label>
                <Input
                  type="datetime-local"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                  required={!isEdit || editMode === "times"}
                  className="form-input"
                  data-testid={isEdit ? "edit-clock-in" : "add-entry-clock-in"}
                />
              </div>

              <div className="form-group">
                <Label className="form-label">Clock Out</Label>
                <Input
                  type="datetime-local"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                  className="form-input"
                  data-testid={isEdit ? "edit-clock-out" : "add-entry-clock-out"}
                />
                <p className="text-xs text-[#888] mt-1">
                  {isEdit ? "Leave empty if still active" : "Leave empty to create an active shift"}
                </p>
              </div>

              {/* Show calculated hours preview */}
              {calculateHours() && (
                <div className="p-3 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl mb-4">
                  <p className="text-sm text-[#0891B2]">
                    <span className="font-medium">Calculated Hours:</span> {calculateHours()} hrs
                  </p>
                </div>
              )}

              <div className="p-3 bg-[#faf7f2] rounded-xl mb-4">
                <p className="text-xs text-[#888]">
                  Total hours will be automatically calculated{isEdit ? " based on clock in/out times" : " if clock out is provided"}.
                </p>
              </div>
            </>
          )}

          {/* Show hours field for edit mode with "hours" selected */}
          {isEdit && editMode === "hours" && (
            <>
              <div className="form-group">
                <Label className="form-label">Total Hours *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_hours}
                  onChange={(e) => setFormData({ ...formData, total_hours: e.target.value })}
                  placeholder="e.g., 8.5"
                  required
                  className="form-input"
                  data-testid="edit-total-hours"
                />
                <p className="text-xs text-[#888] mt-1">
                  Enter the total hours worked (e.g., 8.5 for 8 hours 30 minutes)
                </p>
              </div>

              {entry?.total_hours && (
                <div className="p-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-xl mb-4">
                  <p className="text-sm text-[#7C3AED]">
                    <span className="font-medium">Current Hours:</span> {entry.total_hours} hrs
                  </p>
                </div>
              )}

              <div className="p-3 bg-[#faf7f2] rounded-xl mb-4">
                <p className="text-xs text-[#888]">
                  This will override the calculated hours. Clock in/out times will remain unchanged.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || 
                (!isEdit && (!formData.employee_id || !formData.clock_in)) || 
                (isEdit && editMode === "times" && !formData.clock_in) ||
                (isEdit && editMode === "hours" && (!formData.total_hours || parseFloat(formData.total_hours) < 0))
              }
              className="btn-primary flex-1"
              data-testid={isEdit ? "save-edit-btn" : "submit-add-entry-btn"}
            >
              {loading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Entry")}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
