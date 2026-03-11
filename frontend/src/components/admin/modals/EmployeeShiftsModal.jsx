import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, X, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { formatHoursToHMS } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EmployeeShiftsModal({
  isOpen,
  employee,
  onClose,
  shifts,
  loadingShifts,
  getAuthHeader,
  onShiftAdded,
  onShiftDeleted,
  formatDateTime
}) {
  const [showAddShift, setShowAddShift] = useState(false);
  const [showEditShift, setShowEditShift] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftFormData, setShiftFormData] = useState({ clock_in: "", clock_out: "" });

  if (!isOpen || !employee) return null;

  const handleAddShift = () => {
    setShiftFormData({ clock_in: "", clock_out: "" });
    setShowAddShift(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    const clockIn = new Date(shift.clock_in);
    const clockOut = shift.clock_out ? new Date(shift.clock_out) : null;
    
    const formatForInput = (date) => {
      if (!date) return "";
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().slice(0, 16);
    };
    
    setShiftFormData({
      clock_in: formatForInput(clockIn),
      clock_out: clockOut ? formatForInput(clockOut) : ""
    });
    setShowEditShift(true);
  };

  const handleSaveNewShift = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/time-entries`, {
        employee_id: employee.user_id,
        clock_in: new Date(shiftFormData.clock_in).toISOString(),
        clock_out: shiftFormData.clock_out ? new Date(shiftFormData.clock_out).toISOString() : null
      }, getAuthHeader());
      toast.success("Shift added successfully");
      setShowAddShift(false);
      if (onShiftAdded) onShiftAdded();
    } catch (error) {
      toast.error("Failed to add shift");
    }
  };

  const handleSaveEditedShift = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    try {
      await axios.put(`${API}/admin/time-entries/${editingShift.id}`, {
        clock_in: new Date(shiftFormData.clock_in).toISOString(),
        clock_out: shiftFormData.clock_out ? new Date(shiftFormData.clock_out).toISOString() : null
      }, getAuthHeader());
      toast.success("Shift updated successfully");
      setShowEditShift(false);
      setEditingShift(null);
      if (onShiftAdded) onShiftAdded();
    } catch (error) {
      toast.error("Failed to update shift");
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    try {
      await axios.delete(`${API}/admin/time-entries/${shiftId}`, getAuthHeader());
      toast.success("Shift deleted");
      if (onShiftDeleted) onShiftDeleted();
    } catch (error) {
      toast.error("Failed to delete shift");
    }
  };

  return (
    <>
      {/* Main Shifts Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          data-testid="employee-shifts-modal"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#eee]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-playfair text-xl font-bold text-[#333]">{employee.name}'s Shifts</h2>
                  <p className="text-sm text-[#888]">{employee.shifts} total shifts • {formatHoursToHMS(employee.hours)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-3 bg-[#F9F6F7] border-b border-[#eee]">
            <Button
              onClick={handleAddShift}
              size="sm"
              className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white"
              data-testid="add-shift-btn"
            >
              <Clock className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>

          {/* Shifts List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingShifts ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full"
                />
              </div>
            ) : shifts.length === 0 ? (
              <p className="text-center text-[#888] py-12">No shifts recorded</p>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-4 bg-[#F9F6F7] rounded-xl" data-testid={`shift-row-${shift.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#333]">{formatDateTime(shift.clock_in)}</p>
                        <p className="text-sm text-[#888]">
                          {shift.clock_out ? `→ ${formatDateTime(shift.clock_out)}` : 'Still active'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        shift.clock_out 
                          ? 'bg-[#00D4FF]/20 text-[#00A8CC]' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {shift.clock_out ? formatHoursToHMS(shift.total_hours) : 'Active'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditShift(shift)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          data-testid={`edit-shift-${shift.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShift(shift.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-shift-${shift.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#eee] flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Add Shift Modal */}
      <AnimatePresence>
        {showAddShift && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowAddShift(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="add-shift-modal"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-playfair text-xl font-bold text-[#333]">Add Shift for {employee.name}</h2>
                <button onClick={() => setShowAddShift(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleSaveNewShift}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#333] mb-1">Clock In *</label>
                    <input
                      type="datetime-local"
                      value={shiftFormData.clock_in}
                      onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_in: e.target.value }))}
                      required
                      className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333] mb-1">Clock Out</label>
                    <input
                      type="datetime-local"
                      value={shiftFormData.clock_out}
                      onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_out: e.target.value }))}
                      className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                    />
                    <p className="text-xs text-[#888] mt-1">Leave empty if still active</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowAddShift(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white">
                    Add Shift
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Shift Modal */}
      <AnimatePresence>
        {showEditShift && editingShift && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowEditShift(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="edit-shift-modal"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-playfair text-xl font-bold text-[#333]">Edit Shift</h2>
                <button onClick={() => setShowEditShift(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleSaveEditedShift}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#333] mb-1">Clock In *</label>
                    <input
                      type="datetime-local"
                      value={shiftFormData.clock_in}
                      onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_in: e.target.value }))}
                      required
                      className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333] mb-1">Clock Out</label>
                    <input
                      type="datetime-local"
                      value={shiftFormData.clock_out}
                      onChange={(e) => setShiftFormData(prev => ({ ...prev, clock_out: e.target.value }))}
                      className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                    />
                    <p className="text-xs text-[#888] mt-1">Leave empty if still active</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowEditShift(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white">
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
