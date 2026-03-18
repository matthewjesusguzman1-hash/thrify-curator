import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  X,
  DollarSign,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Lock
} from "lucide-react";

export default function ConsignorPortalViewModal({
  isOpen,
  onClose,
  consignor,
  portalData,
  loading
}) {
  // Match the same collapsible states as the consignor portal
  const [showAccountDetails, setShowAccountDetails] = useState(true);
  const [showSubmissionsExpanded, setShowSubmissionsExpanded] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentFilterType, setPaymentFilterType] = useState("all");
  const [paymentFilterMonth, setPaymentFilterMonth] = useState(new Date().getMonth());
  const [paymentFilterYear, setPaymentFilterYear] = useState(new Date().getFullYear());

  if (!isOpen || !consignor) return null;

  const agreement = portalData?.agreement;
  const summary = portalData?.summary;
  const payments = portalData?.payments || [];
  const itemAdditions = portalData?.item_additions || [];
  
  // Build submissions list similar to consignor portal
  const submissions = [];
  if (agreement) {
    submissions.push({
      id: agreement.id,
      type: 'consignment_agreement',
      type_label: 'Original Agreement',
      submitted_at: agreement.submitted_at,
      items_description: agreement.items_description
    });
  }
  itemAdditions.forEach(addition => {
    submissions.push({
      id: addition.id,
      type: 'item_addition',
      type_label: addition.items_to_add > 0 ? 'Item Addition' : 'Info Update',
      submitted_at: addition.submitted_at,
      items_to_add: addition.items_to_add,
      items_accepted: addition.items_accepted,
      approval_status: addition.approval_status,
      split_percentage: addition.split_percentage
    });
  });
  
  // Sort by date descending
  submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

  // Filter payments like the consignor portal
  const getFilteredPayments = () => {
    if (paymentFilterType === "all") return payments;
    
    return payments.filter(payment => {
      if (!payment.check_date) return false;
      const paymentDate = new Date(payment.check_date);
      
      if (paymentFilterType === "month") {
        return paymentDate.getMonth() === paymentFilterMonth && 
               paymentDate.getFullYear() === paymentFilterYear;
      }
      if (paymentFilterType === "year") {
        return paymentDate.getFullYear() === paymentFilterYear;
      }
      return true;
    });
  };

  const filteredPayments = getFilteredPayments();
  const filteredTotal = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4 sm:my-8 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="consignor-portal-modal"
      >
        {/* Header - matching consignor portal style */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">Welcome back, {consignor.full_name}!</p>
              <p className="text-sm opacity-90">
                {agreement?.email} • {agreement?.agreed_percentage || "50/50"} split
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              data-testid="close-consignor-portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Admin indicator */}
          <div className="mt-2 text-xs bg-white/20 rounded-full px-3 py-1 inline-block">
            Admin View - Consignor Portal Preview
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading consignor data...</p>
            </div>
          ) : portalData ? (
            <>
              {/* Payment Summary - Compact (like consignor portal) */}
              {payments.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Total Earned</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">${summary?.total_paid?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              )}

              {/* MY ACCOUNT SECTION - Exact match */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAccountDetails(!showAccountDetails)}
                  className={`w-full flex items-center justify-between p-3 transition-colors ${
                    showAccountDetails ? 'bg-blue-500/10' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      showAccountDetails ? 'bg-blue-500' : 'bg-gray-200'
                    }`}>
                      <User className={`w-4 h-4 ${showAccountDetails ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <span className={`font-medium ${showAccountDetails ? 'text-blue-700' : 'text-[#1A1A2E]'}`}>
                      My Account
                    </span>
                  </div>
                  {showAccountDetails ? <ChevronUp className="w-5 h-5 text-blue-500" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                
                <AnimatePresence>
                  {showAccountDetails && agreement && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 border-t border-gray-100 bg-blue-50/30 space-y-4">
                        {/* Personal Information */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            Personal Information
                          </h4>
                          <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                            <div className="flex justify-between items-center p-3">
                              <span className="text-sm text-gray-500">Full Name</span>
                              <span className="text-sm font-medium text-[#1A1A2E]">{agreement.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center p-3">
                              <span className="text-sm text-gray-500">Email</span>
                              <span className="text-sm font-medium text-[#1A1A2E]">{agreement.email}</span>
                            </div>
                            <div className="flex justify-between items-center p-3">
                              <span className="text-sm text-gray-500">Phone</span>
                              <span className="text-sm font-medium text-[#1A1A2E]">{agreement.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex justify-between items-start p-3">
                              <span className="text-sm text-gray-500">Address</span>
                              <span className="text-sm font-medium text-[#1A1A2E] text-right max-w-[60%]">{agreement.address || 'Not provided'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Consignment Details */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            Consignment Details
                          </h4>
                          <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                            <div className="flex justify-between items-center p-3">
                              <span className="text-sm text-gray-500">Split Percentage</span>
                              <span className="text-sm font-semibold text-emerald-600">{agreement.agreed_percentage || '50/50'}</span>
                            </div>
                            <div className="flex justify-between items-center p-3">
                              <span className="text-sm text-gray-500">Payment Method</span>
                              <span className="text-sm font-medium text-[#1A1A2E] capitalize">{agreement.payment_method || 'Not set'}</span>
                            </div>
                            {agreement.payment_details && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-sm text-gray-500">Payment Details</span>
                                <span className="text-sm font-medium text-[#1A1A2E]">{agreement.payment_details}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center p-3">
                              <span className="text-sm text-gray-500">Agreement Date</span>
                              <span className="text-sm font-medium text-[#1A1A2E]">
                                {agreement.submitted_at ? new Date(agreement.submitted_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Account Summary */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-amber-500" />
                            Account Summary
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                              <div className="text-2xl font-bold text-[#00D4FF]">
                                {submissions.length}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Total Submissions</div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                              <div className="text-2xl font-bold text-emerald-600">
                                ${summary?.total_paid?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Total Paid</div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                              <div className="text-2xl font-bold text-amber-600">
                                {summary?.payment_count || 0}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Payments Received</div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {summary?.pending_additions || 0}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Pending Items</div>
                            </div>
                          </div>
                        </div>

                        {/* Security Status */}
                        <div className="bg-white rounded-lg border border-gray-100 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">Password Protection</span>
                            </div>
                            {summary?.has_password ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                Enabled
                              </span>
                            ) : (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                Not Set
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MY SUBMISSIONS SECTION */}
              {submissions.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSubmissionsExpanded(!showSubmissionsExpanded)}
                    className={`w-full flex items-center justify-between p-3 transition-colors ${
                      showSubmissionsExpanded ? 'bg-[#00D4FF]/5' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        showSubmissionsExpanded ? 'bg-[#00D4FF]' : 'bg-gray-200'
                      }`}>
                        <FileText className={`w-4 h-4 ${showSubmissionsExpanded ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span className={`font-medium ${showSubmissionsExpanded ? 'text-[#00D4FF]' : 'text-[#1A1A2E]'}`}>
                        My Submissions ({submissions.length})
                      </span>
                    </div>
                    {showSubmissionsExpanded ? <ChevronUp className="w-5 h-5 text-[#00D4FF]" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  
                  <AnimatePresence>
                    {showSubmissionsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 border-t border-gray-100 space-y-2 max-h-64 overflow-y-auto bg-gray-50/50">
                          {submissions.map((submission, index) => (
                            <div 
                              key={submission.id || index}
                              className="w-full flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {/* Type Icon */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  submission.type === 'consignment_agreement' 
                                    ? 'bg-purple-100'
                                    : submission.items_to_add > 0
                                      ? 'bg-emerald-100'
                                      : 'bg-blue-100'
                                }`}>
                                  {submission.type === 'consignment_agreement' ? (
                                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                                  ) : submission.items_to_add > 0 ? (
                                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                  )}
                                </div>
                                
                                {/* Info */}
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[#1A1A2E] truncate">
                                      {submission.type_label}
                                    </span>
                                    <span className="text-xs text-[#888] flex-shrink-0">
                                      {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : ''}
                                    </span>
                                  </div>
                                  {submission.items_to_add > 0 && (
                                    <p className="text-xs text-emerald-600">+{submission.items_to_add} items</p>
                                  )}
                                  {submission.items_accepted !== undefined && submission.items_accepted !== null && submission.approval_status === 'approved' && (
                                    <p className="text-xs text-green-600">{submission.items_accepted} accepted</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {submission.type === 'consignment_agreement' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3" />
                                    Active
                                  </span>
                                ) : submission.items_to_add > 0 ? (
                                  submission.approval_status === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      <CheckCircle className="w-3 h-3" />
                                      Approved
                                    </span>
                                  ) : submission.approval_status === 'rejected' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                      <XCircle className="w-3 h-3" />
                                      Rejected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                      <Clock className="w-3 h-3" />
                                      Pending
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    <CheckCircle className="w-3 h-3" />
                                    Updated
                                  </span>
                                )}
                                <Eye className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* PAYMENT HISTORY SECTION */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                  className={`w-full flex items-center justify-between p-3 transition-colors ${
                    showPaymentHistory ? 'bg-amber-500/10' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      showPaymentHistory ? 'bg-amber-500' : 'bg-gray-200'
                    }`}>
                      <DollarSign className={`w-4 h-4 ${showPaymentHistory ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="text-left">
                      <span className={`font-medium ${showPaymentHistory ? 'text-amber-700' : 'text-[#1A1A2E]'}`}>
                        Payment History
                      </span>
                      {payments.length > 0 && (
                        <span className="ml-2 text-sm text-green-600 font-semibold">
                          ${summary?.total_paid?.toFixed(2)} total
                        </span>
                      )}
                    </div>
                  </div>
                  {showPaymentHistory ? <ChevronUp className="w-5 h-5 text-amber-500" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                
                <AnimatePresence>
                  {showPaymentHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 border-t border-gray-100 bg-amber-50/30">
                        {/* Filter Controls */}
                        <div className="mb-4 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {["all", "month", "year"].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setPaymentFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  paymentFilterType === type
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                                }`}
                              >
                                {type === "all" ? "All Time" : type === "month" ? "Month" : "Year"}
                              </button>
                            ))}
                          </div>
                          
                          {/* Month/Year Selectors */}
                          {paymentFilterType === "month" && (
                            <div className="flex gap-2">
                              <select
                                value={paymentFilterMonth}
                                onChange={(e) => setPaymentFilterMonth(parseInt(e.target.value))}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              >
                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                  <option key={i} value={i}>{m}</option>
                                ))}
                              </select>
                              <select
                                value={paymentFilterYear}
                                onChange={(e) => setPaymentFilterYear(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              >
                                {[2024, 2025, 2026, 2027].map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          {paymentFilterType === "year" && (
                            <select
                              value={paymentFilterYear}
                              onChange={(e) => setPaymentFilterYear(parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        
                        {/* Filtered Summary */}
                        {paymentFilterType !== "all" && (
                          <div className="mb-4 p-3 bg-amber-100/50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                {paymentFilterType === "month" && `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][paymentFilterMonth]} ${paymentFilterYear}`}
                                {paymentFilterType === "year" && paymentFilterYear}
                              </span>
                              <span className="text-lg font-bold text-green-600">${filteredTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}</div>
                          </div>
                        )}
                        
                        {/* Payment List */}
                        {filteredPayments.length === 0 ? (
                          <div className="text-center py-6 text-gray-500">
                            <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No payments found{paymentFilterType !== "all" ? " for this period" : ""}</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filteredPayments.map((payment, index) => (
                              <div 
                                key={payment.id || index}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[#1A1A2E]">
                                      ${(payment.amount || 0).toFixed(2)}
                                      {payment.commission_split && (
                                        <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                          {payment.commission_split}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {payment.check_date ? new Date(payment.check_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      }) : 'Date not set'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {payment.description && (
                                    <span className="text-xs text-gray-500">{payment.description}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Failed to load consignor data</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
