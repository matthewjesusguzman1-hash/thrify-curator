import { X, Clock, Edit3, Trash2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function EmployeeShiftsModal({
  employee,
  shifts,
  loading,
  onClose,
  onAddShift,
  onEditShift,
  onDeleteShift
}) {
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const totalHours = shifts?.reduce((sum, shift) => sum + (shift.total_hours || 0), 0) || 0;

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
        className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="employee-shifts-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-playfair text-xl font-bold text-[#333]">
                {employee?.name}'s Shifts
              </h2>
              <p className="text-sm text-[#888]">
                {shifts?.length || 0} total shifts • {totalHours.toFixed(2)} hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#999] hover:text-[#666]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Shift Button */}
        <Button
          onClick={onAddShift}
          size="sm"
          className="mb-4 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white hover:opacity-90"
          data-testid="add-shift-btn"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Shift
        </Button>

        {/* Shifts List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto"></div>
              <p className="text-[#888] mt-2">Loading shifts...</p>
            </div>
          ) : shifts && shifts.length > 0 ? (
            <div className="space-y-2">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between bg-[#F9F6F7] rounded-lg px-4 py-3"
                  data-testid={`shift-row-${shift.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#00D4FF]/20 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#00D4FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#333]">
                        {formatDateTime(shift.clock_in)}
                      </p>
                      <p className="text-xs text-[#888]">
                        → {formatDateTime(shift.clock_out)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="bg-[#C5A065]/20 text-[#9A7B4F] px-3 py-1 rounded-full text-sm font-medium">
                      {shift.total_hours?.toFixed(2) || '-'} hrs
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditShift(shift)}
                        className="text-[#C5A065] hover:text-[#9A7B4F] p-1"
                        title="Edit shift"
                        data-testid={`edit-shift-${shift.id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteShift(shift.id)}
                        className="text-red-400 hover:text-red-500 p-1"
                        title="Delete shift"
                        data-testid={`delete-shift-${shift.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#888]">
              No shifts recorded for this employee
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-[#eee]">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
