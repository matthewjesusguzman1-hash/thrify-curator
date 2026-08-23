import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, CheckCircle, XCircle, Clock, ChevronDown, 
  Loader2, Eye, X, FileSignature, FileText, User, AlertTriangle,
  Trash2, Download, Mail, Wallet, CreditCard
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
  const [w8benViewUrl, setW8benViewUrl] = useState(null);

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

  const handleDeleteAgreement = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this contractor agreement? The employee will need to re-sign.")) {
      return;
    }
    setProcessing(true);
    try {
      await axios.delete(`${API}/api/contractor-agreement/admin/employee/${employeeId}`, getAuthHeader());
      toast.success("Contractor agreement deleted");
      setReviewingDoc(null);
      fetchPendingDocuments();
    } catch (error) {
      toast.error("Failed to delete agreement");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteW8ben = async (employeeId, docId) => {
    if (!window.confirm("Are you sure you want to delete this W-8BEN? The employee will need to re-submit.")) {
      return;
    }
    setProcessing(true);
    try {
      await axios.delete(`${API}/api/admin/employees/${employeeId}/w8ben/${docId}`, getAuthHeader());
      toast.success("W-8BEN deleted");
      setReviewingDoc(null);
      fetchPendingDocuments();
    } catch (error) {
      toast.error("Failed to delete W-8BEN");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadW8ben = async (employeeId, docId, filename) => {
    try {
      const response = await axios.get(
        `${API}/api/admin/employees/${employeeId}/w8ben/${docId}/download`,
        { ...getAuthHeader(), responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'w8ben.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download W-8BEN");
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAgreement(agreement.employee_id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setReviewingDoc({ type: 'agreement', data: agreement })}
                                className="bg-pink-500 hover:bg-pink-600 text-white"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </div>
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteW8ben(w8ben.employee_id, w8ben.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setReviewingDoc({ type: 'w8ben', data: w8ben })}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </div>
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
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
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
                  {/* Action buttons for print/download */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        const agreementDate = new Date(reviewingDoc.data.signed_at);
                        const formattedDate = agreementDate.toLocaleDateString('en-US', { 
                          year: 'numeric', month: 'long', day: 'numeric' 
                        });
                        const formattedTime = agreementDate.toLocaleTimeString('en-US', {
                          hour: 'numeric', minute: '2-digit'
                        });
                        
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Independent Contractor Agreement - ${reviewingDoc.data.employee_name}</title>
                              <style>
                                @page { margin: 0.6in; size: letter; }
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                  font-family: 'Segoe UI', Arial, sans-serif; 
                                  font-size: 10pt;
                                  line-height: 1.5;
                                  color: #1a1a1a;
                                  padding: 30px 40px;
                                }
                                .header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
                                .brand { }
                                .company-name { font-size: 20pt; font-weight: bold; color: #1a1a4e; letter-spacing: 1px; }
                                .company-subtitle { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 2px; }
                                .doc-ref { text-align: right; font-size: 8pt; color: #666; }
                                .main-title { font-size: 14pt; font-weight: bold; text-align: center; margin: 20px 0; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px 0; }
                                .notice-box { background: #f5f5f5; border: 1px solid #ddd; padding: 12px 15px; margin: 15px 0; }
                                .notice-title { font-weight: bold; font-size: 9pt; text-transform: uppercase; margin-bottom: 5px; }
                                .notice-text { font-size: 9pt; line-height: 1.4; }
                                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin: 15px 0; padding: 12px; background: #fafafa; border: 1px solid #e0e0e0; }
                                .info-item { display: flex; font-size: 9pt; }
                                .info-label { font-weight: 600; color: #555; min-width: 110px; }
                                .info-value { border-bottom: 1px solid #bbb; flex: 1; padding-bottom: 1px; }
                                .section { margin: 15px 0; }
                                .section-num { font-weight: bold; }
                                .section-title { font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 8px; }
                                .agreement-text { white-space: pre-wrap; font-size: 9pt; line-height: 1.6; text-align: justify; }
                                .signature-section { margin-top: 25px; page-break-inside: avoid; }
                                .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
                                .sig-block { padding: 12px; border: 1px solid #ccc; }
                                .sig-block-title { font-weight: bold; font-size: 9pt; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 5px; border-bottom: 2px solid #1a1a4e; }
                                .sig-line { margin: 10px 0; }
                                .sig-value { min-height: 25px; border-bottom: 1px solid #333; margin-bottom: 2px; font-size: 10pt; }
                                .sig-value.cursive { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 20pt; color: #1a1a8a; }
                                .sig-label { font-size: 7pt; color: #666; text-transform: uppercase; }
                                .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #888; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="brand">
                                  <div class="company-name">THRIFTY CURATOR</div>
                                  <div class="company-subtitle">Resale Management & Operations</div>
                                </div>
                                <div class="doc-ref">
                                  Document Ref: ICA-${reviewingDoc.data.employee_id?.substring(0, 8).toUpperCase() || 'XXXX'}<br>
                                  Standard Onboarding Agreement
                                </div>
                              </div>
                              
                              <div class="main-title">Independent Contractor Agreement</div>
                              
                              <div class="notice-box">
                                <div class="notice-title">Notice to Contractor</div>
                                <div class="notice-text">This Independent Contractor Agreement ("Agreement") establishes the terms and conditions of the working relationship between Thrifty Curator ("Company") and the undersigned contractor ("Contractor"). By signing or digitally acknowledging this document, Contractor agrees to all terms outlined herein.</div>
                              </div>
                              
                              <div class="info-grid">
                                <div class="info-item"><span class="info-label">Effective Date:</span><span class="info-value">${formattedDate}</span></div>
                                <div class="info-item"><span class="info-label">Company Name:</span><span class="info-value">Thrifty Curator</span></div>
                                <div class="info-item"><span class="info-label">Contractor Name:</span><span class="info-value">${reviewingDoc.data.employee_name}</span></div>
                                <div class="info-item"><span class="info-label">Role / Specialty:</span><span class="info-value">Virtual Assistant - E-Commerce</span></div>
                                <div class="info-item"><span class="info-label">Contact Email:</span><span class="info-value">${reviewingDoc.data.contact_email || reviewingDoc.data.employee_email}</span></div>
                                ${reviewingDoc.data.payment_holder_name ? `<div class="info-item"><span class="info-label">Account Holder:</span><span class="info-value">${reviewingDoc.data.payment_holder_name}</span></div>` : ''}
                                ${reviewingDoc.data.payment_holder_email ? `<div class="info-item"><span class="info-label">Holder Email:</span><span class="info-value">${reviewingDoc.data.payment_holder_email}</span></div>` : ''}
                                ${reviewingDoc.data.payment_wallet_provider ? `<div class="info-item"><span class="info-label">Wallet Provider:</span><span class="info-value">${reviewingDoc.data.payment_wallet_provider}</span></div>` : ''}
                                ${reviewingDoc.data.payment_wallet_number ? `<div class="info-item"><span class="info-label">Wallet Number:</span><span class="info-value">${reviewingDoc.data.payment_wallet_number}</span></div>` : ''}
                                ${reviewingDoc.data.payment_address ? `<div class="info-item"><span class="info-label">Address:</span><span class="info-value">${reviewingDoc.data.payment_address}</span></div>` : ''}
                                ${reviewingDoc.data.payment_country ? `<div class="info-item"><span class="info-label">Country:</span><span class="info-value">${reviewingDoc.data.payment_country}</span></div>` : ''}
                                ${reviewingDoc.data.payment_wise_tag ? `<div class="info-item"><span class="info-label">Wise Tag:</span><span class="info-value">@${reviewingDoc.data.payment_wise_tag}</span></div>` : ''}
                              </div>
                              
                              <div class="section">
                                <div class="section-title">Terms and Conditions</div>
                                <div class="agreement-text">${reviewingDoc.data.agreement_text || 'Agreement text not available'}</div>
                              </div>
                              
                              <div class="signature-section">
                                <div class="signature-grid">
                                  <div class="sig-block">
                                    <div class="sig-block-title">Company</div>
                                    <div class="sig-line"><div class="sig-value">Thrifty Curator</div><div class="sig-label">Authorized Signature / Business Owner</div></div>
                                    <div class="sig-line"><div class="sig-value">${formattedDate}</div><div class="sig-label">Date</div></div>
                                  </div>
                                  <div class="sig-block">
                                    <div class="sig-block-title">Contractor</div>
                                    <div class="sig-line"><div class="sig-value cursive">${reviewingDoc.data.signature_text}</div><div class="sig-label">Contractor Signature (Digital Acknowledgement)</div></div>
                                    <div class="sig-line"><div class="sig-value">${reviewingDoc.data.signed_name}</div><div class="sig-label">Printed Name</div></div>
                                    <div class="sig-line"><div class="sig-value">${formattedDate}</div><div class="sig-label">Date</div></div>
                                  </div>
                                </div>
                              </div>
                              
                              <div class="footer">Thrifty Curator Independent Contractor Agreement</div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 250);
                      }}
                      className="text-gray-600"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Print / Save as PDF
                    </Button>
                  </div>

                  {/* Employee Info & Signature Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Employee</p>
                      <p className="font-medium">{reviewingDoc.data.employee_name}</p>
                      <p className="text-xs text-gray-500">{reviewingDoc.data.employee_email}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Signed Name</p>
                      <p className="font-medium">{reviewingDoc.data.signed_name}</p>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                      <p className="text-sm text-gray-500 mb-1">Digital Signature</p>
                      <p className="text-2xl font-script italic text-pink-600">{reviewingDoc.data.signature_text}</p>
                    </div>
                  </div>
                  
                  {/* Payment Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 text-sm">Payment Information</h4>
                    
                    {reviewingDoc.data.contact_email && (
                      <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Contact Email</p>
                          <p className="font-medium">{reviewingDoc.data.contact_email}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Info Grid */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {reviewingDoc.data.payment_holder_name && (
                          <div>
                            <p className="text-gray-500">Account Holder Name</p>
                            <p className="font-medium">{reviewingDoc.data.payment_holder_name}</p>
                          </div>
                        )}
                        {reviewingDoc.data.payment_holder_email && (
                          <div>
                            <p className="text-gray-500">Account Holder Email</p>
                            <p className="font-medium">{reviewingDoc.data.payment_holder_email}</p>
                          </div>
                        )}
                        {reviewingDoc.data.payment_wallet_provider && (
                          <div>
                            <p className="text-gray-500">Wallet Provider</p>
                            <p className="font-medium">{reviewingDoc.data.payment_wallet_provider}</p>
                          </div>
                        )}
                        {reviewingDoc.data.payment_wallet_number && (
                          <div>
                            <p className="text-gray-500">Wallet Number</p>
                            <p className="font-medium">{reviewingDoc.data.payment_wallet_number}</p>
                          </div>
                        )}
                        {reviewingDoc.data.payment_address && (
                          <div className="md:col-span-2">
                            <p className="text-gray-500">Address</p>
                            <p className="font-medium">{reviewingDoc.data.payment_address}</p>
                          </div>
                        )}
                        {reviewingDoc.data.payment_country && (
                          <div>
                            <p className="text-gray-500">Country</p>
                            <p className="font-medium">{reviewingDoc.data.payment_country}</p>
                          </div>
                        )}
                        {reviewingDoc.data.payment_wise_tag && (
                          <div>
                            <p className="text-gray-500">Wise Tag</p>
                            <p className="font-medium text-green-700">@{reviewingDoc.data.payment_wise_tag}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* No payment info provided */}
                      {!reviewingDoc.data.payment_holder_name && !reviewingDoc.data.payment_wallet_provider && !reviewingDoc.data.payment_wise_tag && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="w-4 h-4" />
                          <p className="text-sm">No payment information provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Full Agreement Text - Styled like employee view */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileSignature className="w-4 h-4" />
                        Independent Contractor Agreement
                      </h3>
                    </div>
                    <div className="p-4 max-h-80 overflow-y-auto bg-white">
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {reviewingDoc.data.agreement_text || 'Agreement text not available'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Signed Confirmation */}
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 flex items-center justify-between border border-pink-200">
                    <div>
                      <p className="text-sm text-gray-600">Digitally Signed</p>
                      <p className="font-semibold text-pink-700">
                        {new Date(reviewingDoc.data.signed_at).toLocaleString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-pink-500" />
                  </div>
                </>
              )}

              {reviewingDoc.type === 'w8ben' && (
                <>
                  {/* Employee Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Employee</p>
                    <p className="font-medium">{reviewingDoc.data.employee_name || 'Employee'}</p>
                    <p className="text-sm text-gray-500">{reviewingDoc.data.employee_email || reviewingDoc.data.employee_id}</p>
                  </div>
                  
                  {/* Document Info */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Document</p>
                    <p className="font-medium">{reviewingDoc.data.filename || 'W-8BEN Form'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {new Date(reviewingDoc.data.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* View/Download buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await axios.get(
                            `${API}/api/admin/employees/${reviewingDoc.data.employee_id}/w8ben/${reviewingDoc.data.id}/view`,
                            { ...getAuthHeader(), responseType: 'blob' }
                          );
                          const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                          const url = window.URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        } catch (error) {
                          toast.error("Failed to open W-8BEN document");
                        }
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Document
                    </Button>
                    <Button
                      onClick={() => handleDownloadW8ben(
                        reviewingDoc.data.employee_id, 
                        reviewingDoc.data.id,
                        reviewingDoc.data.filename
                      )}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Click "View Document" to open the W-8BEN in a new tab for review.
                  </p>
                </>
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
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (reviewingDoc.type === 'agreement') {
                    handleDeleteAgreement(reviewingDoc.data.employee_id);
                  } else {
                    handleDeleteW8ben(reviewingDoc.data.employee_id, reviewingDoc.data.id);
                  }
                }}
                disabled={processing}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-3">
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
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
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
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
