import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  User,
  X,
  Clock,
  Calendar,
  DollarSign,
  PlayCircle,
  StopCircle,
  FileText,
  CheckCircle,
  Eye,
  Download
} from "lucide-react";

export default function EmployeePortalViewModal({
  isOpen,
  onClose,
  employee,
  portalData,
  clockStatus,
  loading,
  onClockInOut,
  clockingEmployee,
  onOpenW9Modal,
  onDownloadBlankW9,
  formatHoursToHMS,
  roundHoursToMinute,
  formatDateTime,
  calculateBiweeklyPeriod,
  formatPortalTime,
  portalElapsedTime
}) {
  const [showClockConfirm, setShowClockConfirm] = useState(null);

  if (!isOpen || !employee) return null;

  const handleClockConfirm = async (action) => {
    await onClockInOut(action);
    setShowClockConfirm(null);
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
        className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-3xl shadow-xl my-4 sm:my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="employee-portal-modal"
      >
        {/* Portal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 sticky top-0 bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-playfair text-lg sm:text-2xl font-bold text-white truncate">{employee.name}</h2>
                <p className="text-[#00D4FF] text-xs sm:text-sm">Employee Portal View</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-10 h-10 bg-[#FF1493] hover:bg-[#E91E8C] rounded-full flex items-center justify-center text-white transition-all shadow-lg flex-shrink-0"
              data-testid="close-portal-x"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Portal Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#00D4FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/60">Loading employee data...</p>
            </div>
          ) : portalData ? (
            <div className="space-y-6">
              {/* Clock Status Card */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${clockStatus?.is_clocked_in ? 'from-green-500 to-emerald-500' : 'from-[#00D4FF] to-[#8B5CF6]'}`} />
                <div className="p-6 text-center">
                  {clockStatus?.is_clocked_in ? (
                    <>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Currently Working
                      </div>
                      {/* Live Timer Display */}
                      <div className="my-4">
                        <p className="text-4xl font-bold font-mono text-[#333]" data-testid="portal-timer">
                          {formatPortalTime(portalElapsedTime)}
                        </p>
                        {clockStatus.clock_in_time && (
                          <p className="text-sm text-gray-500 mt-2">
                            Since {new Date(clockStatus.clock_in_time).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 mb-4">
                      <StopCircle className="w-4 h-4" />
                      Not Clocked In
                    </div>
                  )}
                  
                  {/* Clock In/Out Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowClockConfirm(clockStatus?.is_clocked_in ? 'out' : 'in')}
                      disabled={clockingEmployee}
                      className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                        clockStatus?.is_clocked_in
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                          : 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white'
                      }`}
                      data-testid="admin-clock-btn"
                    >
                      {clockingEmployee ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : clockStatus?.is_clocked_in ? (
                        <>
                          <StopCircle className="w-5 h-5" />
                          Clock Out
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-5 h-5" />
                          Clock In
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Clock Confirmation Dialog */}
              {showClockConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={() => setShowClockConfirm(null)}>
                  <div 
                    className="bg-white rounded-2xl p-6 mx-4 max-w-md shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        showClockConfirm === 'out' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {showClockConfirm === 'out' ? (
                          <StopCircle className="w-6 h-6 text-red-600" />
                        ) : (
                          <PlayCircle className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          Clock {showClockConfirm === 'in' ? 'In' : 'Out'} Confirmation
                        </h3>
                        <p className="text-gray-500 text-sm">This action will be recorded</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-6">
                      Are you sure you want to clock <strong>{showClockConfirm}</strong> <strong>{employee?.name}</strong>?
                    </p>
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowClockConfirm(null)}
                        disabled={clockingEmployee}
                      >
                        Cancel
                      </Button>
                      <Button
                        className={`flex-1 ${showClockConfirm === 'out' 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        onClick={() => handleClockConfirm(showClockConfirm)}
                        disabled={clockingEmployee}
                      >
                        {clockingEmployee ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          `Yes, Clock ${showClockConfirm === 'in' ? 'In' : 'Out'}`
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pay Period Summary */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#FF1493] to-[#E91E8C]" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-playfair text-lg font-semibold text-[#333]">Current Pay Period</h3>
                    <span className="text-sm text-[#888]">
                      {(() => {
                        const period = calculateBiweeklyPeriod();
                        if (period) {
                          return `${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                        }
                        return '-';
                      })()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#F0F9FF] rounded-xl p-4 text-center">
                      <Clock className="w-6 h-6 text-[#00D4FF] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-[#333]">{formatHoursToHMS(portalData.summary?.period_hours)}</p>
                      <p className="text-xs text-[#888]">Hours</p>
                    </div>
                    <div className="bg-[#FFF0F5] rounded-xl p-4 text-center">
                      <Calendar className="w-6 h-6 text-[#FF1493] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-[#333]">{portalData.summary?.period_shifts || 0}</p>
                      <p className="text-xs text-[#888]">Shifts</p>
                    </div>
                    <div className="bg-[#F5F0FF] rounded-xl p-4 text-center">
                      <DollarSign className="w-6 h-6 text-[#8B5CF6] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-[#333]">${(roundHoursToMinute(portalData.summary?.period_hours || 0) * (portalData.summary?.hourly_rate || 15)).toFixed(2)}</p>
                      <p className="text-xs text-[#888]">Est. Pay</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#eee] text-center text-sm text-[#888]">
                    Rate: <span className="font-medium text-[#333]">${portalData.summary?.hourly_rate?.toFixed(2) || '15.00'}/hr</span>
                    <span className="mx-2">•</span>
                    {formatHoursToHMS(portalData.summary?.period_hours)} × ${portalData.summary?.hourly_rate?.toFixed(2) || '15.00'} = ${(roundHoursToMinute(portalData.summary?.period_hours || 0) * (portalData.summary?.hourly_rate || 15)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Recent Shifts */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
                <div className="p-6">
                  <h3 className="font-playfair text-lg font-semibold text-[#333] mb-4">
                    {(() => {
                      const entries = portalData.entries || [];
                      const period = calculateBiweeklyPeriod();
                      if (!period) return "Recent Shifts";
                      
                      const currentPeriodEntries = entries.filter(entry => {
                        const clockIn = new Date(entry.clock_in);
                        return clockIn >= period.start && clockIn <= period.end;
                      });
                      
                      if (currentPeriodEntries.length > 0) {
                        return `Current Pay Period Shifts (${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
                      }
                      
                      // Show previous period label
                      const prevStart = new Date(period.start);
                      prevStart.setDate(prevStart.getDate() - 14);
                      const prevEnd = new Date(period.end);
                      prevEnd.setDate(prevEnd.getDate() - 14);
                      return `Previous Pay Period Shifts (${prevStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${prevEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
                    })()}
                  </h3>
                  {(() => {
                    const entries = portalData.entries || [];
                    const period = calculateBiweeklyPeriod();
                    let shiftsToShow = [];
                    
                    if (period) {
                      // Get current period entries
                      const currentPeriodEntries = entries.filter(entry => {
                        const clockIn = new Date(entry.clock_in);
                        return clockIn >= period.start && clockIn <= period.end;
                      });
                      
                      if (currentPeriodEntries.length > 0) {
                        shiftsToShow = currentPeriodEntries;
                      } else {
                        // Get previous period entries
                        const prevStart = new Date(period.start);
                        prevStart.setDate(prevStart.getDate() - 14);
                        const prevEnd = new Date(period.end);
                        prevEnd.setDate(prevEnd.getDate() - 14);
                        
                        shiftsToShow = entries.filter(entry => {
                          const clockIn = new Date(entry.clock_in);
                          return clockIn >= prevStart && clockIn <= prevEnd;
                        });
                      }
                    } else {
                      shiftsToShow = entries.slice(0, 5);
                    }
                    
                    // Sort by clock_in descending
                    shiftsToShow.sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in));
                    
                    return shiftsToShow.length > 0 ? (
                      <div className="space-y-3">
                        {shiftsToShow.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-[#F9F6F7] rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#8B5CF6]/20 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-[#8B5CF6]" />
                              </div>
                              <div>
                                <p className="font-medium text-[#333]">{formatDateTime(entry.clock_in)}</p>
                                <p className="text-sm text-[#888]">
                                  {entry.clock_out ? `→ ${formatDateTime(entry.clock_out)}` : 'Still active'}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              entry.clock_out 
                                ? 'bg-[#8B5CF6]/20 text-[#6D28D9]' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {entry.clock_out ? formatHoursToHMS(entry.total_hours) : 'Active'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[#888] py-4">No shifts recorded for this pay period</p>
                    );
                  })()}
                </div>
              </div>

              {/* W-9 Tax Form Section */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#f97316] to-[#ea580c]" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#f97316]" />
                      <h3 className="font-playfair text-lg font-semibold text-[#333]">W-9 Tax Form</h3>
                    </div>
                    {portalData.w9Status?.has_w9 && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        portalData.w9Status.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : portalData.w9Status.status === 'pending_review'
                          ? 'bg-yellow-100 text-yellow-700'
                          : portalData.w9Status.status === 'needs_correction'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {portalData.w9Status.status === 'approved' 
                          ? 'Approved' 
                          : portalData.w9Status.status === 'pending_review'
                          ? 'Pending'
                          : portalData.w9Status.status === 'needs_correction'
                          ? 'Needs Fix'
                          : 'Submitted'}
                      </span>
                    )}
                  </div>
                  
                  {/* W-9 Status and View Button */}
                  {portalData.w9Status?.has_w9 ? (
                    <div className="flex items-center justify-between p-4 bg-[#F9F6F7] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          portalData.w9Status.status === 'approved' 
                            ? 'bg-green-100' 
                            : portalData.w9Status.status === 'pending_review'
                            ? 'bg-yellow-100'
                            : 'bg-orange-100'
                        }`}>
                          {portalData.w9Status.status === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : portalData.w9Status.status === 'pending_review' ? (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#333]">
                            {portalData.w9Status.filename || 'W-9 Document'}
                          </p>
                          <p className="text-xs text-[#888]">
                            Uploaded {new Date(portalData.w9Status.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => onOpenW9Modal(employee.id, employee.name)}
                        className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">No W-9 Submitted</p>
                          <p className="text-xs text-[#888]">Employee has not submitted a W-9 form yet</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Blank W-9 Download */}
                  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Download className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#333]">IRS W-9 Form</p>
                        <p className="text-xs text-[#888]">Download blank form</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadBlankW9();
                      }}
                      className="text-[#C5A065] border-[#C5A065] hover:bg-[#C5A065]/10"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Get Form
                    </Button>
                  </div>
                  
                  {/* 1099s Received Section */}
                  {portalData?.my1099s?.count > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-[#333] flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          1099-NEC Forms Received
                        </h4>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {portalData.my1099s.count} form(s)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {portalData.my1099s.documents.map((doc) => (
                          <div 
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#333]">
                                  1099-NEC - Tax Year {doc.year}
                                </p>
                                <p className="text-xs text-[#888]">
                                  Amount: ${(doc.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  {doc.status === 'filed' && ' • Filed'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const API = process.env.REACT_APP_BACKEND_URL || '';
                                window.open(`${API}/api/financials/my-1099s/${doc.id}/download?user_id=${doc.user_id}`, '_blank');
                              }}
                              className={doc.filed_document_id 
                                ? "text-green-600 border-green-300 hover:bg-green-50"
                                : "text-purple-600 border-purple-300 hover:bg-purple-50"
                              }
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {doc.filed_document_id ? 'View' : 'Draft'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-white/60 py-12">No data available</p>
          )}
        </div>

        {/* Portal Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#FF1493] to-[#E91E8C] hover:from-[#E91E8C] hover:to-[#C91E7C] text-white font-semibold py-3 shadow-lg shadow-[#FF1493]/30 flex items-center justify-center gap-2"
            data-testid="close-portal-btn"
          >
            <X className="w-5 h-5" />
            Close Employee Portal
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
