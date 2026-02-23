import { X, Clock, PlayCircle, StopCircle, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function EmployeePortalModal({
  employee,
  portalData,
  loading,
  onClose
}) {
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatPeriod = (start, end) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-8 relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="employee-portal-modal"
      >
        {/* Close X button in top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#999] hover:text-[#666] bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
          data-testid="close-portal-x-btn"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-full flex items-center justify-center text-white text-xl font-bold">
            {employee?.name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="font-playfair text-xl font-bold text-[#333]">{employee?.name}</h2>
            <p className="text-sm text-[#00D4FF]">Employee Portal View</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto"></div>
            <p className="text-[#888] mt-2">Loading portal data...</p>
          </div>
        ) : portalData ? (
          <div className="space-y-6">
            {/* Clock Status */}
            <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                portalData.clocked_in 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {portalData.clocked_in ? (
                  <>
                    <StopCircle className="w-4 h-4" />
                    Clocked In
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Not Clocked In
                  </>
                )}
              </div>
              
              <div className="mt-4">
                <Button
                  className={`w-full max-w-xs ${
                    portalData.clocked_in 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
                  disabled
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {portalData.clocked_in ? 'Clock Out' : 'Clock In'}
                </Button>
              </div>
            </div>

            {/* Pay Period Summary */}
            <div className="bg-white border border-[#eee] rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-[#333]">Current Pay Period</span>
                <span className="text-xs text-[#888]">
                  {formatPeriod(portalData.summary?.period_start, portalData.summary?.period_end)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#F8C8DC]/20 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-[#D48C9E]" />
                  </div>
                  <p className="text-xl font-bold text-[#333]">{portalData.summary?.period_hours?.toFixed(1) || 0}</p>
                  <p className="text-xs text-[#888]">Hours</p>
                </div>
                <div className="bg-[#C5A065]/10 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-[#C5A065]" />
                  </div>
                  <p className="text-xl font-bold text-[#333]">{portalData.summary?.period_shifts || 0}</p>
                  <p className="text-xs text-[#888]">Shifts</p>
                </div>
                <div className="bg-green-100 rounded-lg p-3">
                  <div className="flex items-center justify-center mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-[#333]">${portalData.summary?.estimated_pay?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-[#888]">Est. Pay</p>
                </div>
              </div>
              <p className="text-center text-xs text-[#888] mt-3">
                Rate: ${portalData.summary?.hourly_rate?.toFixed(2) || '15.00'}/hr • Calculation: {portalData.summary?.period_hours?.toFixed(1) || 0} hrs × ${portalData.summary?.hourly_rate?.toFixed(2) || '15.00'}
              </p>
            </div>

            {/* Recent Shifts */}
            <div>
              <h3 className="text-sm font-semibold text-[#333] mb-3">Recent Shifts</h3>
              {portalData.entries && portalData.entries.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {portalData.entries.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#F9F6F7] rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[#888]" />
                        <span>{formatDate(entry.clock_in)}</span>
                      </div>
                      <div className="text-[#888]">
                        {formatTime(entry.clock_in)} → {formatTime(entry.clock_out)}
                      </div>
                      <div className="font-medium text-[#C5A065]">
                        {entry.total_hours?.toFixed(1) || '-'} hrs
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#888] py-4">No shifts recorded yet</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-[#888]">
            Failed to load portal data
          </div>
        )}

        {/* Footer with Close Button */}
        <Button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-[#ec4899] to-[#d946ef] hover:from-[#db2777] hover:to-[#c026d3] text-white font-semibold py-3"
          data-testid="close-portal-btn"
        >
          <X className="w-4 h-4 mr-2" />
          Close Employee Portal
        </Button>
      </motion.div>
    </motion.div>
  );
}
