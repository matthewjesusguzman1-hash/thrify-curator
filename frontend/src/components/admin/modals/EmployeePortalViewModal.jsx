import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  XCircle,
  Eye,
  Download,
  ChevronDown
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
  
  // Collapsible state for tax form sections
  const [w9Expanded, setW9Expanded] = useState(false);
  const [w8benExpanded, setW8benExpanded] = useState(false);
  const [nec1099Expanded, setNec1099Expanded] = useState(false);

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
                    <h3 className="font-playfair text-lg font-semibold text-[#333]">
                      {portalData.summary?.is_previous_period ? 'Previous Pay Period' : 'Current Pay Period'}
                    </h3>
                    <span className="text-sm text-[#888]">
                      {(() => {
                        // Use the period dates from the API response if available
                        if (portalData.summary?.period_start && portalData.summary?.period_end) {
                          const start = new Date(portalData.summary.period_start);
                          const end = new Date(portalData.summary.period_end);
                          return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                        }
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
                      <p className="text-2xl font-bold text-[#333]">${(portalData.summary?.estimated_pay || 0).toFixed(2)}</p>
                      <p className="text-xs text-[#888]">Est. Pay</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#eee] text-center text-sm text-[#888]">
                    Rate: <span className="font-medium text-[#333]">${portalData.summary?.hourly_rate?.toFixed(2) || '20.00'}/hr</span>
                    <span className="mx-2">•</span>
                    {formatHoursToHMS(portalData.summary?.period_hours)} × ${portalData.summary?.hourly_rate?.toFixed(2) || '20.00'} = ${(portalData.summary?.estimated_pay || 0).toFixed(2)}
                  </div>
                  {/* YTD Paid */}
                  {portalData.summary?.ytd_paid > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#eee] flex items-center justify-between">
                      <span className="text-sm text-[#888]">Year-to-Date Paid:</span>
                      <span className="font-semibold text-[#333]">
                        ${portalData.summary.ytd_paid.toFixed(2)}
                        <span className="text-xs text-[#888] font-normal ml-1">
                          ({portalData.summary.ytd_payment_count} payment{portalData.summary.ytd_payment_count !== 1 ? 's' : ''})
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Shifts */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
                <div className="p-6">
                  <h3 className="font-playfair text-lg font-semibold text-[#333] mb-4">
                    {(() => {
                      // Use the period dates from the API response
                      if (portalData.summary?.period_start && portalData.summary?.period_end) {
                        const start = new Date(portalData.summary.period_start);
                        const end = new Date(portalData.summary.period_end);
                        const prefix = portalData.summary?.is_previous_period ? 'Previous' : 'Current';
                        return `${prefix} Pay Period Shifts (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
                      }
                      
                      // Fallback to calculating period locally
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
                    
                    // Use the period from API response
                    let periodStart, periodEnd;
                    if (portalData.summary?.period_start && portalData.summary?.period_end) {
                      periodStart = new Date(portalData.summary.period_start);
                      periodEnd = new Date(portalData.summary.period_end);
                    } else {
                      const period = calculateBiweeklyPeriod();
                      if (period) {
                        periodStart = period.start;
                        periodEnd = period.end;
                      }
                    }
                    
                    let shiftsToShow = [];
                    
                    if (periodStart && periodEnd) {
                      // Filter entries for the period from API
                      shiftsToShow = entries.filter(entry => {
                        const clockIn = new Date(entry.clock_in);
                        return clockIn >= periodStart && clockIn <= periodEnd;
                      });
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

              {/* W-9 Tax Form Section - Collapsible */}
              <Collapsible open={w9Expanded} onOpenChange={setW9Expanded}>
                <div className="bg-white rounded-2xl overflow-hidden" data-testid="portal-w9-section">
                  <div className="h-1 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      data-testid="portal-w9-collapse-trigger"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#00D4FF]" />
                        <h3 className="font-playfair text-lg font-semibold text-[#333]">W-9 Tax Form</h3>
                        {portalData.w9Status?.total_documents > 0 && (
                          <span className="bg-[#8B5CF6]/20 text-[#8B5CF6] px-2 py-0.5 rounded-full text-xs font-medium">
                            {portalData.w9Status.total_documents}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${w9Expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-6 pb-6">
                      {/* W-9 Documents List */}
                      {portalData.w9Status?.w9_documents && portalData.w9Status.w9_documents.filter(doc => doc && doc.id).length > 0 ? (
                        <div className="space-y-3">
                          {portalData.w9Status.w9_documents.filter(doc => doc && doc.id).map((doc, index) => {
                            const statusStyles = {
                              approved: {
                                bg: 'bg-green-50 border-green-200',
                                icon: 'bg-green-100',
                                iconColor: 'text-green-600',
                                badge: 'bg-green-100 text-green-700',
                                text: 'Approved'
                              },
                              needs_correction: {
                                bg: 'bg-red-50 border-red-200',
                                icon: 'bg-red-100',
                                iconColor: 'text-red-600',
                                badge: 'bg-red-100 text-red-700',
                                text: 'Denied'
                              },
                              default: {
                                bg: 'bg-yellow-50 border-yellow-200',
                                icon: 'bg-yellow-100',
                                iconColor: 'text-yellow-600',
                                badge: 'bg-yellow-100 text-yellow-700',
                                text: 'Pending'
                              }
                            };
                            const statusStyle = statusStyles[doc.status] || statusStyles.default;
                            
                            return (
                              <div
                                key={doc.id}
                                className={`p-4 rounded-xl border ${statusStyle.bg}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusStyle.icon}`}>
                                      {doc.status === 'approved' ? (
                                        <CheckCircle className={`w-5 h-5 ${statusStyle.iconColor}`} />
                                      ) : doc.status === 'needs_correction' ? (
                                        <XCircle className={`w-5 h-5 ${statusStyle.iconColor}`} />
                                      ) : (
                                        <Clock className={`w-5 h-5 ${statusStyle.iconColor}`} />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-[#333]">
                                          {doc.filename || `W-9 #${index + 1}`}
                                        </p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.badge}`}>
                                          {statusStyle.text}
                                        </span>
                                      </div>
                                      {doc.uploaded_at && (
                                        <p className="text-xs text-[#888]">
                                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenW9Modal(employee.id, employee.name)}
                                    className="text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10"
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </div>
                                
                                {doc.status === 'needs_correction' && doc.rejection_reason && (
                                  <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                                    <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      Action Required
                                    </p>
                                    <p className="text-sm text-red-800">{doc.rejection_reason}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* W-8BEN Tax Form Section - Collapsible */}
              <Collapsible open={w8benExpanded} onOpenChange={setW8benExpanded}>
                <div className="bg-white rounded-2xl overflow-hidden" data-testid="portal-w8ben-section">
                  <div className="h-1 bg-gradient-to-r from-[#FF6B6B] via-[#FFE66D] to-[#4ECDC4]" />
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      data-testid="portal-w8ben-collapse-trigger"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#FFE66D]" />
                        <h3 className="font-playfair text-lg font-semibold text-[#333]">W-8BEN Tax Form</h3>
                        {portalData.w8benStatus?.total_documents > 0 && (
                          <span className="bg-[#FFE66D]/30 text-[#B8860B] px-2 py-0.5 rounded-full text-xs font-medium">
                            {portalData.w8benStatus.total_documents}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${w8benExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-6 pb-6">
                      <p className="text-sm text-gray-500 mb-4">
                        For foreign individuals to certify their foreign status for U.S. tax purposes.
                      </p>

                      {portalData.w8benStatus?.w8ben_documents && portalData.w8benStatus.w8ben_documents.length > 0 ? (
                        <div className="space-y-3">
                          {portalData.w8benStatus.w8ben_documents.map((doc) => (
                            <div key={doc.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-[#FFE66D]" />
                                  <span className="text-sm text-[#333]">{doc.filename}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  doc.status === 'approved' 
                                    ? 'bg-green-100 text-green-700'
                                    : doc.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {doc.status?.charAt(0).toUpperCase() + doc.status?.slice(1) || 'Submitted'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Submitted: {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-200">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm text-gray-500">No W-8BEN submitted</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* 1099-NEC Forms Section - Collapsible */}
              {portalData?.my1099s?.count > 0 && (
                <Collapsible open={nec1099Expanded} onOpenChange={setNec1099Expanded}>
                  <div className="bg-white rounded-2xl overflow-hidden" data-testid="portal-1099-section">
                    <div className="h-1 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
                    <CollapsibleTrigger asChild>
                      <button 
                        className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                        data-testid="portal-1099-collapse-trigger"
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-[#00D4FF]" />
                          <h3 className="font-playfair text-lg font-semibold text-[#333]">1099-NEC Forms</h3>
                          <span className="bg-[#00D4FF]/20 text-[#00D4FF] px-2 py-0.5 rounded-full text-xs font-medium">
                            {portalData.my1099s.count}
                          </span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${nec1099Expanded ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-6 pb-6 space-y-3">
                        {portalData.my1099s.documents.map((doc) => (
                          <div 
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#00D4FF]/10 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-[#00D4FF]" />
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
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
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
