import { motion } from "framer-motion";
import {
  User,
  X,
  DollarSign,
  Package,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Percent,
  FileText,
  Lock,
  Unlock
} from "lucide-react";

export default function ConsignorPortalViewModal({
  isOpen,
  onClose,
  consignor,
  portalData,
  loading
}) {
  if (!isOpen || !consignor) return null;

  const agreement = portalData?.agreement;
  const summary = portalData?.summary;
  const payments = portalData?.payments || [];
  const itemAdditions = portalData?.item_additions || [];

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
        className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-4xl shadow-xl my-4 sm:my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="consignor-portal-modal"
      >
        {/* Portal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 sticky top-0 bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-playfair text-lg sm:text-2xl font-bold text-white truncate">
                  {consignor.full_name}
                </h2>
                <p className="text-emerald-400 text-xs sm:text-sm">Consignor Portal View</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-10 h-10 bg-[#FF1493] hover:bg-[#E91E8C] rounded-full flex items-center justify-center text-white transition-all shadow-lg flex-shrink-0"
              data-testid="close-consignor-portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Portal Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/60">Loading consignor data...</p>
            </div>
          ) : portalData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">${summary?.total_paid?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-white/60">Total Paid</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Package className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{summary?.total_items_added || 0}</p>
                  <p className="text-xs text-white/60">Items Added</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{summary?.approved_additions || 0}</p>
                  <p className="text-xs text-white/60">Approved</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  {summary?.has_password ? (
                    <Lock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  ) : (
                    <Unlock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  )}
                  <p className="text-lg font-bold text-white">
                    {summary?.has_password ? 'Secured' : 'No Password'}
                  </p>
                  <p className="text-xs text-white/60">Account Status</p>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="p-5">
                  <h3 className="font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Account Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-[#1A1A2E] font-medium">{agreement?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-[#1A1A2E] font-medium">{agreement?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-[#1A1A2E] font-medium">{agreement?.address || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Payment Method</p>
                        <p className="text-[#1A1A2E] font-medium capitalize">
                          {agreement?.payment_method || 'Not set'}
                          {agreement?.payment_details && ` (${agreement.payment_details})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Percent className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Commission Split</p>
                        <p className="text-[#1A1A2E] font-medium">{agreement?.agreed_percentage || '50/50'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Agreement Signed</p>
                        <p className="text-[#1A1A2E] font-medium">
                          {agreement?.submitted_at ? new Date(agreement.submitted_at).toLocaleDateString('en-US', {
                            month: 'long', day: 'numeric', year: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                <div className="p-5">
                  <h3 className="font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Payment History
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {payments.length} payment{payments.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  {payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {payments.map((payment, idx) => (
                        <div key={payment.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-[#1A1A2E]">
                                ${(payment.amount || 0).toFixed(2)}
                                {payment.commission_split && (
                                  <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                    {payment.commission_split}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.check_date ? new Date(payment.check_date).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric'
                                }) : 'Date not set'}
                              </p>
                            </div>
                          </div>
                          {payment.description && (
                            <span className="text-xs text-gray-400">{payment.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Item Additions / Submissions */}
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="p-5">
                  <h3 className="font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Item Additions
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      {itemAdditions.length} submission{itemAdditions.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  {itemAdditions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No item additions yet</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {itemAdditions.map((addition, idx) => (
                        <div key={addition.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              addition.approval_status === 'approved' ? 'bg-green-100' :
                              addition.approval_status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                            }`}>
                              {addition.approval_status === 'approved' ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : addition.approval_status === 'rejected' ? (
                                <XCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-yellow-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[#1A1A2E]">
                                +{addition.items_to_add} item{addition.items_to_add !== 1 ? 's' : ''}
                                {addition.split_percentage && (
                                  <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                    {addition.split_percentage}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {addition.submitted_at ? new Date(addition.submitted_at).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric'
                                }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            addition.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                            addition.approval_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {addition.approval_status === 'approved' ? 'Approved' :
                             addition.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Description (from original agreement) */}
              {agreement?.items_description && (
                <div className="bg-white rounded-2xl overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                  <div className="p-5">
                    <h3 className="font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Original Items Description
                    </h3>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                      {agreement.items_description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              <p>Failed to load consignor data</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
