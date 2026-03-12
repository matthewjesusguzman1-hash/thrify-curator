import { motion } from "framer-motion";
import { 
  X, Trash2, Download, Mail, Phone, MapPin,
  Briefcase, Package, FileSignature, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function FormSubmissionModal({
  submission,
  onClose,
  onDelete,
  onDownload,
  formatSubmissionDate,
  refreshData
}) {
  if (!submission) return null;

  // Get auth header for API calls
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const getGradientClass = () => {
    switch (submission.formType) {
      case "job_applications":
        return "bg-gradient-to-r from-[#FF1493] to-[#E91E8C]";
      case "consignment_inquiries":
        return "bg-gradient-to-r from-[#00D4FF] to-[#00A8CC]";
      case "item_additions":
        return "bg-gradient-to-r from-[#10B981] to-[#059669]";
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
      case "item_additions":
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
      case "item_additions":
        return "Add Items Request";
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

            </div>
          )}

          {/* Item Additions Details */}
          {submission.formType === "item_additions" && (
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
                        className="block aspect-square rounded-lg overflow-hidden border border-[#eee] hover:border-[#10B981] transition-colors"
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

              {/* Items Added */}
              {submission.items_to_add > 0 && (
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-[#888] mb-1">Items to Add</p>
                  <p className="text-emerald-700 font-bold text-2xl">+{submission.items_to_add} items</p>
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

              {/* Contact Updates */}
              {(submission.update_email || submission.update_phone || submission.update_address || submission.update_payment_method) && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Requested Updates</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {submission.update_email && (
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-600">New Email</p>
                        <p className="font-medium text-[#333]">{submission.update_email}</p>
                      </div>
                    )}
                    {submission.update_phone && (
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <p className="text-xs text-purple-600">New Phone</p>
                        <p className="font-medium text-[#333]">{submission.update_phone}</p>
                      </div>
                    )}
                    {submission.update_address && (
                      <div className="p-3 bg-orange-50 rounded-xl col-span-2">
                        <p className="text-xs text-orange-600">New Address</p>
                        <p className="font-medium text-[#333]">{submission.update_address}</p>
                      </div>
                    )}
                    {submission.update_payment_method && (
                      <div className="p-3 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-600">New Payment Method</p>
                        <p className="font-medium text-[#333]">{submission.update_payment_method}</p>
                        {submission.update_payment_details && (
                          <p className="text-sm text-[#666]">{submission.update_payment_details}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {submission.signature && (
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">Signature</Label>
                  <p className="text-[#333] bg-[#F9F6F7] p-4 rounded-xl font-signature text-xl italic">{submission.signature}</p>
                  {submission.signature_date && (
                    <p className="text-xs text-[#888] mt-1">Signed on: {submission.signature_date}</p>
                  )}
                </div>
              )}
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
