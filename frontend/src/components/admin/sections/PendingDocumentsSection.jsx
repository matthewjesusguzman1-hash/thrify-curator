import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, CheckCircle, XCircle, Clock, ChevronDown, 
  Loader2, Eye, X, FileSignature, FileText, User, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PendingDocumentsSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAgreements, setPendingAgreements] = useState([]);
  const [pendingW8bens, setPendingW8bens] = useState([]);
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      fetchPendingDocuments();
    }
  }, [isExpanded]);

  const fetchPendingDocuments = async () => {
    setLoading(true);
    try {
      const [agreementsRes, w8bensRes] = await Promise.all([
        axios.get(`${API}/api/contractor-agreement/admin/pending`, getAuthHeader()),
        axios.get(`${API}/api/admin/w8ben/pending`, getAuthHeader()).catch(() => ({ data: { pending: [] } }))
      ]);
      setPendingAgreements(agreementsRes.data.pending || []);
      setPendingW8bens(w8bensRes.data.pending || []);
    } catch (error) {
      console.error('Error fetching pending documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAgreement = async (employeeId) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/api/contractor-agreement/admin/employee/${employeeId}/approve`, {}, getAuthHeader());
      toast.success("Contractor Agreement approved!");
      setReviewingDoc(null);
      fetchPendingDocuments();
    } catch (error) {
      toast.error("Failed to approve agreement");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectAgreement = async (employeeId) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/api/contractor-agreement/admin/employee/${employeeId}/reject`, { 
        feedback: rejectReason || "Please review and sign again" 
      }, getAuthHeader());
      toast.success("Agreement returned for corrections");
      setReviewingDoc(null);
      setRejectReason("");
      fetchPendingDocuments();
    } catch (error) {
      toast.error("Failed to reject agreement");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveW8ben = async (employeeId, docId) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/api/admin/employees/${employeeId}/w8ben/${docId}/approve`, {}, getAuthHeader());
      toast.success("W-8BEN approved!");
      setReviewingDoc(null);
      fetchPendingDocuments();
    } catch (error) {
      toast.error("Failed to approve W-8BEN");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectW8ben = async (employeeId, docId) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/api/admin/employees/${employeeId}/w8ben/${docId}/reject`, { 
        feedback: rejectReason || "Please review and re-submit" 
      }, getAuthHeader());
      toast.success("W-8BEN returned for corrections");
      setReviewingDoc(null);
      setRejectReason("");
      fetchPendingDocuments();
    } catch (error) {
      toast.error("Failed to reject W-8BEN");
    } finally {
      setProcessing(false);
    }
  };

  const totalPending = pendingAgreements.length + pendingW8bens.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="pending-documents-section">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${totalPending > 0 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'} rounded-lg flex items-center justify-center`}>
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Pending Document Reviews</h3>
            <p className="text-sm text-gray-500">
              {totalPending > 0 
                ? `${totalPending} document${totalPending !== 1 ? 's' : ''} awaiting approval`
                : 'All documents reviewed'}
            </p>
          </div>
          {totalPending > 0 && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold animate-pulse">
              {totalPending} pending
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : totalPending === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium">All documents have been reviewed!</p>
                  <p className="text-sm mt-1">No pending approvals at this time.</p>
                </div>
              ) : (
                <>
                  {/* Pending Contractor Agreements */}
                  {pendingAgreements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-2">
                        <FileSignature className="w-4 h-4 text-pink-500" />
                        Contractor Agreements ({pendingAgreements.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingAgreements.map(agreement => (
                          <div 
                            key={agreement.employee_id} 
                            className="flex items-center justify-between p-3 bg-pink-50 border border-pink-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-pink-500" />
                              <div>
                                <p className="font-medium text-gray-900">{agreement.employee_name}</p>
                                <p className="text-xs text-gray-500">{agreement.employee_email}</p>
                                <p className="text-xs text-gray-400">
                                  Signed: {new Date(agreement.signed_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setReviewingDoc({ type: 'agreement', data: agreement })}
                              className="bg-pink-500 hover:bg-pink-600 text-white"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending W-8BEN Forms */}
                  {pendingW8bens.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        W-8BEN Forms ({pendingW8bens.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingW8bens.map(w8ben => (
                          <div 
                            key={w8ben.id} 
                            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium text-gray-900">{w8ben.employee_name || 'Employee'}</p>
                                <p className="text-xs text-gray-500">{w8ben.employee_email || w8ben.employee_id}</p>
                                <p className="text-xs text-gray-400">
                                  Submitted: {new Date(w8ben.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setReviewingDoc({ type: 'w8ben', data: w8ben })}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      {reviewingDoc && ReactDOM.createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setReviewingDoc(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b border-gray-200 ${
              reviewingDoc.type === 'agreement' 
                ? 'bg-gradient-to-r from-pink-50 to-rose-50' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50'
            } flex justify-between items-center`}>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Review {reviewingDoc.type === 'agreement' ? 'Contractor Agreement' : 'W-8BEN Form'}
                </h2>
                <p className="text-sm text-gray-500">
                  {reviewingDoc.data.employee_name || reviewingDoc.data.employee_email}
                </p>
              </div>
              <button onClick={() => setReviewingDoc(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {reviewingDoc.type === 'agreement' && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Signed Name</p>
                    <p className="font-medium">{reviewingDoc.data.signed_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Signature</p>
                    <p className="text-lg font-script italic text-pink-600">{reviewingDoc.data.signature_text}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Signed At</p>
                    <p className="font-medium">
                      {new Date(reviewingDoc.data.signed_at).toLocaleString()}
                    </p>
                  </div>
                </>
              )}

              {reviewingDoc.type === 'w8ben' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Submitted</p>
                  <p className="font-medium">
                    {new Date(reviewingDoc.data.uploaded_at).toLocaleString()}
                  </p>
                  {reviewingDoc.data.filename && (
                    <p className="text-xs text-gray-400 mt-1">File: {reviewingDoc.data.filename}</p>
                  )}
                </div>
              )}

              {/* Rejection Reason */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Feedback (for rejection)
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Optional: Explain why this document needs corrections..."
                  className="border-2 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (reviewingDoc.type === 'agreement') {
                    handleRejectAgreement(reviewingDoc.data.employee_id);
                  } else {
                    handleRejectW8ben(reviewingDoc.data.employee_id, reviewingDoc.data.id);
                  }
                }}
                disabled={processing}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                Needs Correction
              </Button>
              <Button
                onClick={() => {
                  if (reviewingDoc.type === 'agreement') {
                    handleApproveAgreement(reviewingDoc.data.employee_id);
                  } else {
                    handleApproveW8ben(reviewingDoc.data.employee_id, reviewingDoc.data.id);
                  }
                }}
                disabled={processing}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
