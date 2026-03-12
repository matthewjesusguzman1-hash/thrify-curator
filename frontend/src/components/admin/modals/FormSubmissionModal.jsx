import { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, Trash2, Download, Mail, Phone, MapPin,
  Briefcase, Package, FileSignature, Send,
  CheckCircle, XCircle, Clock, RotateCcw, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function FormSubmissionModal({
  submission,
  onClose,
  onDelete,
  onDownload,
  onUpdateStatus,
  updatingStatus,
  formatSubmissionDate,
  refreshData
}) {
  // Approval form state
  const [approvalForm, setApprovalForm] = useState({
    approval_status: submission?.approval_status || "approved",
    items_accepted: submission?.items_accepted || 0,
    rejected_items_action: submission?.rejected_items_action || "return",
    admin_notes: submission?.admin_notes || ""
  });
  const [submittingApproval, setSubmittingApproval] = useState(false);

  if (!submission) return null;

  // Get auth header for API calls
  const getAuthHeader = () => {
    const token = localStorage.getItem("adminToken");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Handle approval submission
  const handleApproval = async () => {
    setSubmittingApproval(true);
    try {
      const endpoint = submission.formType === 'consignment_agreements'
        ? `${API}/api/admin/forms/consignment-agreements/${submission.id}/approve`
        : `${API}/api/admin/forms/item-additions/${submission.id}/approve`;
      
      await axios.put(endpoint, approvalForm, getAuthHeader());
      
      toast.success(
        approvalForm.approval_status === 'approved' 
          ? `Approved! ${approvalForm.items_accepted} items accepted for consignment`
          : `Submission marked as rejected`
      );
      
      // Refresh the data
      if (refreshData) refreshData();
      onClose();
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Failed to process approval. Please try again.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Get approval status badge
  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">
            <XCircle className="w-4 h-4" /> Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-4 h-4" /> Pending Review
          </span>
        );
    }
  };

  const getGradientClass = () => {
    switch (submission.formType) {
      case "job_applications":
        return "bg-gradient-to-r from-[#FF1493] to-[#E91E8C]";
      case "consignment_inquiries":
        return "bg-gradient-to-r from-[#00D4FF] to-[#00A8CC]";
      default:
        return "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]";
    }
  };

  const getIcon = () => {
    switch (submission.formType) {
      case "job_applications":
        return <Briefcase className="w-6 h-6" />;
      case "consignment_inquiries":
        return <Package className="w-6 h-6" />;
      default:
        return <FileSignature className="w-6 h-6" />;
    }
  };

  const getFormTypeLabel = () => {
    switch (submission.formType) {
      case "job_applications":
        return "Job Application";
      case "consignment_inquiries":
        return "Consignment Inquiry";
      default:
        return "Consignment Agreement";
    }
  };

  // Generate pre-populated email based on form type
  const getEmailContent = () => {
    const firstName = submission.full_name?.split(' ')[0] || 'there';
    
    switch (submission.formType) {
      case "job_applications":
        return {
          subject: `Re: Your Job Application - Thrifty Curator`,
          body: `Hi ${firstName},

Thank you for your interest in joining the Thrifty Curator team! We have received your application and are excited to learn more about you.

We are currently reviewing applications and will be in touch soon regarding next steps.

In the meantime, if you have any questions, please don't hesitate to reach out.

Best regards,
Thrifty Curator Team`
        };
      case "consignment_inquiries":
        return {
          subject: `Re: Your Consignment Inquiry - Thrifty Curator`,
          body: `Hi ${firstName},

Thank you for reaching out about consigning with Thrifty Curator! We're excited to hear about the items you'd like to consign.

Based on your inquiry, we'd love to schedule a time to review your items. Here's what happens next:

1. We'll arrange a time for you to bring in your items for evaluation
2. Our team will assess each piece for quality and market value
3. We'll provide you with a consignment agreement outlining terms

Please let us know your availability for an appointment, and we'll get you scheduled.

Looking forward to working with you!

Best regards,
Thrifty Curator Team`
        };
      default: // consignment_agreements
        return {
          subject: `Re: Your Consignment Agreement - Thrifty Curator`,
          body: `Hi ${firstName},

Thank you for signing the consignment agreement with Thrifty Curator! We're thrilled to partner with you.

Your agreement has been received and processed. Here's what to expect:

1. Your items will be photographed and listed in our store
2. You'll receive updates when items sell
3. Payments will be processed according to the agreed schedule

If you have any questions about your agreement or would like to add more items, please don't hesitate to reach out.

Thank you for choosing Thrifty Curator!

Best regards,
Thrifty Curator Team`
        };
    }
  };

  const handleSendEmail = () => {
    const { subject, body } = getEmailContent();
    const mailtoLink = `mailto:${submission.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
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
        className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="submission-details-modal"
      >
        {/* Modal Header */}
        <div className={`p-6 ${getGradientClass()} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <div>
                <h2 className="font-playfair text-xl font-bold">{submission.full_name}</h2>
                <p className="text-sm opacity-80">{getFormTypeLabel()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-[#FF1493] rounded-full flex items-center justify-center text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-[#F9F6F7] border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload && onDownload(submission)}
            className="text-[#10B981] border-[#10B981] hover:bg-[#10B981]/10"
          >
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            className="text-[#00D4FF] border-[#00D4FF] hover:bg-[#00D4FF]/10"
          >
            <Send className="w-4 h-4 mr-1" /> Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onDelete(submission.formType, submission.id);
              onClose();
            }}
            className="text-red-500 border-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Status Update */}
          <div className="mb-6 p-4 bg-[#F9F6F7] rounded-xl">
            <Label className="text-sm font-medium text-[#666] mb-2 block">Update Status</Label>
            <div className="flex flex-wrap gap-2">
              {["new", "reviewed", "contacted", "archived"].map((status) => (
                <button
                  key={status}
                  onClick={() => onUpdateStatus(submission.formType, submission.id, status)}
                  disabled={updatingStatus}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    submission.status === status || (!submission.status && status === "new")
                      ? "bg-[#333] text-white"
                      : "bg-white text-[#666] hover:bg-[#eee] border border-[#ddd]"
                  }`}
                  data-testid={`status-btn-${status}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-[#F9F6F7] rounded-xl">
              <Mail className="w-5 h-5 text-[#888]" />
              <div>
                <p className="text-xs text-[#888]">Email</p>
                <a href={`mailto:${submission.email}`} className="text-[#333] hover:text-[#8B5CF6]">
                  {submission.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F9F6F7] rounded-xl">
              <Phone className="w-5 h-5 text-[#888]" />
              <div>
                <p className="text-xs text-[#888]">Phone</p>
                <a href={`tel:${submission.phone}`} className="text-[#333] hover:text-[#8B5CF6]">
                  {submission.phone}
                </a>
              </div>
            </div>
          </div>

          {submission.address && (
            <div className="flex items-start gap-3 p-3 bg-[#F9F6F7] rounded-xl mb-6">
              <MapPin className="w-5 h-5 text-[#888] mt-0.5" />
              <div>
                <p className="text-xs text-[#888]">Address</p>
                <p className="text-[#333]">{submission.address}</p>
              </div>
            </div>
          )}

          {/* Job Application Details */}
          {submission.formType === "job_applications" && (
            <div className="space-y-4">
              {submission.resume_text && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Resume / Experience</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{submission.resume_text}</p>
                </div>
              )}
              {submission.why_join && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Why Join Us?</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{submission.why_join}</p>
                </div>
              )}
              {submission.availability && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Availability</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{submission.availability}</p>
                </div>
              )}
              {submission.tasks_able_to_perform?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Tasks Able to Perform</Label>
                  <div className="flex flex-wrap gap-2">
                    {submission.tasks_able_to_perform.map((task) => (
                      <span key={task} className="px-3 py-1 bg-[#F8C8DC]/30 text-[#5D4037] rounded-full text-sm">
                        {task}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#F9F6F7] rounded-xl">
                  <p className="text-xs text-[#888]">Background Check Consent</p>
                  <p className={`font-medium ${submission.background_check_consent ? 'text-green-600' : 'text-red-600'}`}>
                    {submission.background_check_consent ? "Yes" : "No"}
                  </p>
                </div>
                <div className="p-3 bg-[#F9F6F7] rounded-xl">
                  <p className="text-xs text-[#888]">Reliable Transportation</p>
                  <p className={`font-medium ${submission.has_reliable_transportation ? 'text-green-600' : 'text-red-600'}`}>
                    {submission.has_reliable_transportation ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Consignment Inquiry Details */}
          {submission.formType === "consignment_inquiries" && (
            <div className="space-y-4">
              {submission.item_types?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Item Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {submission.item_types.map((type) => (
                      <span key={type} className="px-3 py-1 bg-[#00D4FF]/20 text-[#00A8CC] rounded-full text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {submission.other_item_type && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Other Item Type</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{submission.other_item_type}</p>
                </div>
              )}
              {submission.item_description && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Item Description</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{submission.item_description}</p>
                </div>
              )}
              {submission.item_condition && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Item Condition</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl">{submission.item_condition}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#F9F6F7] rounded-xl">
                  <p className="text-xs text-[#888]">Smoke-Free Environment</p>
                  <p className={`font-medium ${submission.smoke_free ? 'text-green-600' : 'text-orange-600'}`}>
                    {submission.smoke_free ? "Yes" : "No"}
                  </p>
                </div>
                <div className="p-3 bg-[#F9F6F7] rounded-xl">
                  <p className="text-xs text-[#888]">Pet-Free Environment</p>
                  <p className={`font-medium ${submission.pet_free ? 'text-green-600' : 'text-orange-600'}`}>
                    {submission.pet_free ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Consignment Agreement Details */}
          {submission.formType === "consignment_agreements" && (
            <div className="space-y-4">
              {/* Photos Section */}
              {submission.photos && submission.photos.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">
                    Submitted Photos ({submission.photos.length})
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {submission.photos.map((photo, idx) => (
                      <a 
                        key={idx} 
                        href={photo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden border border-[#eee] hover:border-[#8B5CF6] transition-colors"
                      >
                        <img 
                          src={photo} 
                          alt={`Item ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {submission.items_description && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Items Description</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{submission.items_description}</p>
                </div>
              )}
              
              {submission.additional_info && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Additional Information</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl whitespace-pre-wrap">{submission.additional_info}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#C5A065]/10 rounded-xl">
                  <p className="text-xs text-[#888]">Agreed Percentage</p>
                  <p className="font-bold text-[#C5A065] text-lg">{submission.agreed_percentage}</p>
                </div>
                <div className="p-3 bg-[#F9F6F7] rounded-xl">
                  <p className="text-xs text-[#888]">Signature Date</p>
                  <p className="font-medium text-[#333]">{submission.signature_date || "N/A"}</p>
                </div>
              </div>
              
              {submission.payment_method && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#F9F6F7] rounded-xl">
                    <p className="text-xs text-[#888]">Payment Method</p>
                    <p className="font-medium text-[#333]">{submission.payment_method}</p>
                  </div>
                  {submission.payment_details && (
                    <div className="p-3 bg-[#F9F6F7] rounded-xl">
                      <p className="text-xs text-[#888]">Payment Details</p>
                      <p className="font-medium text-[#333]">{submission.payment_details}</p>
                    </div>
                  )}
                </div>
              )}
              
              {submission.signature && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Signature</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl font-signature text-xl italic">{submission.signature}</p>
                </div>
              )}
              <div className="p-3 bg-[#F9F6F7] rounded-xl">
                <p className="text-xs text-[#888]">Agreed to Terms</p>
                <p className={`font-medium ${submission.agreed_to_terms ? 'text-green-600' : 'text-red-600'}`}>
                  {submission.agreed_to_terms ? "Yes" : "No"}
                </p>
              </div>

              {/* Approval Section */}
              <div className="mt-6 p-4 bg-gradient-to-r from-[#8B5CF6]/10 to-[#6D28D9]/10 rounded-xl border border-[#8B5CF6]/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#333] flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#8B5CF6]" />
                    Consignment Review
                  </h3>
                  {getApprovalStatusBadge(submission.approval_status || 'pending')}
                </div>

                {/* Show review details if already reviewed */}
                {submission.approval_status && submission.approval_status !== 'pending' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-[#888]">Items Accepted</p>
                        <p className="font-bold text-green-600 text-lg">{submission.items_accepted || 0}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-[#888]">Non-Consigned Items</p>
                        <p className="font-medium text-[#333] flex items-center gap-1">
                          {submission.rejected_items_action === 'donate' ? (
                            <><Gift className="w-4 h-4 text-purple-500" /> Donated</>
                          ) : (
                            <><RotateCcw className="w-4 h-4 text-blue-500" /> Returned</>
                          )}
                        </p>
                      </div>
                    </div>
                    {submission.admin_notes && (
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-[#888]">Admin Notes</p>
                        <p className="text-[#333] text-sm">{submission.admin_notes}</p>
                      </div>
                    )}
                    {submission.reviewed_at && (
                      <p className="text-xs text-[#888] text-right">
                        Reviewed: {formatSubmissionDate(submission.reviewed_at)}
                        {submission.reviewed_by && ` by ${submission.reviewed_by}`}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Show approval form if pending */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Decision */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Decision</Label>
                        <Select
                          value={approvalForm.approval_status}
                          onValueChange={(value) => setApprovalForm({ ...approvalForm, approval_status: value })}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">
                              <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" /> Approve
                              </span>
                            </SelectItem>
                            <SelectItem value="rejected">
                              <span className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" /> Reject
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Items Accepted */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Items Accepted</Label>
                        <Input
                          type="number"
                          min="0"
                          value={approvalForm.items_accepted}
                          onChange={(e) => setApprovalForm({ ...approvalForm, items_accepted: parseInt(e.target.value) || 0 })}
                          className="bg-white"
                          data-testid="items-accepted-input"
                        />
                      </div>
                    </div>

                    {/* Rejected Items Action */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">What happens to items not consigned?</Label>
                      <Select
                        value={approvalForm.rejected_items_action}
                        onValueChange={(value) => setApprovalForm({ ...approvalForm, rejected_items_action: value })}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select action..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="return">
                            <span className="flex items-center gap-2">
                              <RotateCcw className="w-4 h-4 text-blue-600" /> Return to Owner
                            </span>
                          </SelectItem>
                          <SelectItem value="donate">
                            <span className="flex items-center gap-2">
                              <Gift className="w-4 h-4 text-purple-600" /> Donate
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Admin Notes */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notes (Optional)</Label>
                      <Textarea
                        value={approvalForm.admin_notes}
                        onChange={(e) => setApprovalForm({ ...approvalForm, admin_notes: e.target.value })}
                        placeholder="Any notes about this review..."
                        rows={2}
                        className="bg-white"
                        data-testid="admin-notes-input"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleApproval}
                      disabled={submittingApproval}
                      className={`w-full ${approvalForm.approval_status === 'approved' 
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                      data-testid="submit-approval-btn"
                    >
                      {submittingApproval ? "Processing..." : (
                        approvalForm.approval_status === 'approved' 
                          ? `Approve (${approvalForm.items_accepted} items)`
                          : 'Reject Submission'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submission Meta */}
          <div className="mt-6 pt-4 border-t border-[#eee] flex items-center justify-between text-sm text-[#888]">
            <span>Submitted: {formatSubmissionDate(submission.submitted_at)}</span>
            <span>ID: {submission.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F9F6F7] flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onDelete(submission.formType, submission.id)}
            className="text-red-500 border-red-200 hover:bg-red-50 w-full sm:w-auto"
            data-testid="delete-submission-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <div className="flex flex-wrap justify-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleSendEmail}
              className="text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10"
              data-testid="email-submission-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button
              variant="outline"
              onClick={() => onDownload(submission)}
              className="text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10"
              data-testid="download-submission-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={onClose}
              className="btn-primary"
            >
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
