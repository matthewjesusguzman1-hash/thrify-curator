import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
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
    clock_out: ""
  });
  const [loading, setLoading] = useState(false);

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
        clock_out: formatForInput(entry.clock_out)
      });
    } else if (mode === 'add') {
      setFormData({
        employee_id: "",
        clock_in: "",
        clock_out: ""
      });
    }
  }, [mode, entry, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === 'edit') {
        await axios.put(`${API}/admin/time-entries/${entry.id}`, {
          clock_in: formData.clock_in ? new Date(formData.clock_in).toISOString() : null,
          clock_out: formData.clock_out ? new Date(formData.clock_out).toISOString() : null
        }, getAuthHeader());
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

          <div className="form-group">
            <Label className="form-label">Clock In *</Label>
            <Input
              type="datetime-local"
              value={formData.clock_in}
              onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
              required
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

          <div className="p-3 bg-[#faf7f2] rounded-xl mb-4">
            <p className="text-xs text-[#888]">
              Total hours will be automatically calculated{isEdit ? " based on clock in/out times" : " if clock out is provided"}.
            </p>
          </div>

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
              disabled={loading || (!isEdit && (!formData.employee_id || !formData.clock_in)) || (isEdit && !formData.clock_in)}
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
