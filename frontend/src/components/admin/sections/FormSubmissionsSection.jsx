import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Package,
  FileSignature,
  Search,
  Filter,
  X,
  Eye,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  Download,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  User,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Gift
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FormSubmissionsSection({
  formSubmissions,
  formsSummary,
  loadingForms,
  fetchFormSubmissions,
  onViewSubmission,
  onDeleteSubmission,
  onDownloadSubmission,
  formatSubmissionDate,
  getStatusBadge,
  paymentMethodChanges,
  fetchPaymentMethodChanges,
  itemAdditions,
  fetchItemAdditions,
  getAuthHeader
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState("job_applications");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    jobApplications: { key: "submitted_at", direction: "desc" },
    consignmentInquiries: { key: "submitted_at", direction: "desc" },
    consignmentAgreements: { key: "submitted_at", direction: "desc" },
    updates: { key: "submitted_at", direction: "desc" }
  });
  
  // Modal states
  const [viewingUpdate, setViewingUpdate] = useState(null);
  const [messageModal, setMessageModal] = useState({ open: false, update: null });
  const [messageContent, setMessageContent] = useState("");
  const [deletingUpdate, setDeletingUpdate] = useState(null);
  
  // Approval form state for item additions
  const [approvalForm, setApprovalForm] = useState({
    approval_status: "approved",
    items_accepted: 0,
    rejected_items_action: "return",
    admin_notes: ""
  });
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Auto-refresh when section is expanded
  useEffect(() => {
    if (isExpanded) {
      fetchFormSubmissions();
      if (fetchPaymentMethodChanges) {
        fetchPaymentMethodChanges();
      }
      if (fetchItemAdditions) {
        fetchItemAdditions();
      }
    }
  }, [isExpanded, fetchFormSubmissions, fetchPaymentMethodChanges, fetchItemAdditions]);

  const handleSort = (table, key) => {
    setSortConfig(prev => ({
      ...prev,
      [table]: {
        key,
        direction: prev[table]?.key === key && prev[table]?.direction === "asc" ? "desc" : "asc"
      }
    }));
  };

  const getSortedData = (data, table) => {
    const { key, direction } = sortConfig[table];
    if (!key || !data) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      if (key === "submitted_at") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Combine all updates into a single list
  const getAllUpdates = () => {
    const updates = [];
    
    // Add item additions/updates
    if (itemAdditions) {
      itemAdditions.forEach(item => {
        updates.push({
          ...item,
          type: 'update',
          source: 'item_addition'
        });
      });
    }
    
    // Add payment method changes
    if (paymentMethodChanges) {
      paymentMethodChanges.forEach(change => {
        updates.push({
          id: change.id || `payment-${change.changed_at}`,
          full_name: change.full_name || change.user_name || 'Unknown',
          email: change.email || change.user_email,
          type: 'payment_change',
          source: 'payment_change',
          submitted_at: change.changed_at,
          old_payment_method: change.old_payment_method,
          new_payment_method: change.new_payment_method,
          old_payment_details: change.old_payment_details,
          new_payment_details: change.new_payment_details
        });
      });
    }
    
    // Sort by date descending
    return updates.sort((a, b) => new Date(b.submitted_at || b.changed_at || 0) - new Date(a.submitted_at || a.changed_at || 0));
  };

  // Filter updates based on search
  const getFilteredUpdates = () => {
    const allUpdates = getAllUpdates();
    if (!formSearchQuery.trim()) return allUpdates;
    
    const query = formSearchQuery.toLowerCase();
    return allUpdates.filter(update => {
      const name = (update.full_name || '').toLowerCase();
      const email = (update.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  };

  // Handle delete update
  const handleDeleteUpdate = async (update) => {
    if (!window.confirm(`Are you sure you want to delete this update from ${update.full_name}?`)) {
      return;
    }
    
    setDeletingUpdate(update.id);
    try {
      await axios.delete(`${API}/admin/forms/item-additions/${update.id}`, getAuthHeader());
      toast.success("Update deleted successfully");
      if (fetchItemAdditions) fetchItemAdditions();
    } catch (error) {
      toast.error("Failed to delete update");
    } finally {
      setDeletingUpdate(null);
    }
  };

  // Handle download update as PDF
  const handleDownloadUpdate = async (update) => {
    if (update.source === 'payment_change') {
      // For payment changes, generate a simple text download (no backend endpoint for these)
      let content = `PAYMENT METHOD CHANGE RECORD\n`;
      content += `============================\n\n`;
      content += `Name: ${update.full_name}\n`;
      content += `Email: ${update.email}\n`;
      content += `Date: ${formatSubmissionDate(update.submitted_at || update.changed_at)}\n\n`;
      content += `Previous Method: ${update.old_payment_method || 'Not set'}\n`;
      content += `New Method: ${update.new_payment_method}\n`;
      if (update.old_payment_details) content += `Previous Details: ${update.old_payment_details}\n`;
      if (update.new_payment_details) content += `New Details: ${update.new_payment_details}\n`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_change_${update.full_name.replace(/\s+/g, '_')}_${new Date(update.submitted_at || update.changed_at).toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Payment change downloaded");
    } else {
      // For item additions/updates, download PDF from backend
      if (!update.id) {
        toast.error("Cannot download: Missing update ID");
        console.error("Update missing ID:", update);
        return;
      }
      
      try {
        const response = await axios.get(
          `${API}/admin/forms/item-additions/${update.id}/pdf`,
          { ...getAuthHeader(), responseType: 'blob' }
        );
        
        // Check if response is actually a PDF (not an error)
        if (response.data.type === 'application/json') {
          const text = await response.data.text();
          const error = JSON.parse(text);
          throw new Error(error.detail || 'Failed to generate PDF');
        }
        
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${update.full_name.replace(/\s+/g, '_')}_Update.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Update PDF downloaded");
      } catch (error) {
        console.error("PDF download error:", error);
        if (error.response?.status === 404) {
          toast.error("Update record not found");
        } else if (error.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
        } else {
          toast.error(error.message || "Failed to download PDF");
        }
      }
    }
  };

  // Generate email template for contacting client
  const getEmailTemplate = (update) => {
    const updateType = update.source === 'payment_change' 
      ? 'payment method change' 
      : update.items_to_add > 0 
        ? 'item addition' 
        : 'information update';
    
    return `Dear ${update.full_name},

Thank you for submitting your ${updateType} request to Thrifty Curator.

We have received your update and wanted to confirm the following:
${update.source === 'payment_change' 
  ? `- Payment method changed to: ${update.new_payment_method}`
  : update.items_to_add > 0 
    ? `- Items to add: ${update.items_to_add}\n${update.items_description ? `- Description: ${update.items_description}` : ''}`
    : '- Contact information has been updated'}

If you have any questions or need further assistance, please don't hesitate to reach out.

Best regards,
Thrifty Curator Team`;
  };

  // Handle send message - opens email client with pre-filled template
  const handleSendMessage = () => {
    if (!messageModal.update) return;
    
    const subject = encodeURIComponent(`Re: Your Consignment Update - Thrifty Curator`);
    const body = encodeURIComponent(messageContent);
    window.location.href = `mailto:${messageModal.update.current_email || messageModal.update.email}?subject=${subject}&body=${body}`;
    
    toast.success(`Opening email client for ${messageModal.update.current_email || messageModal.update.email}`);
    setMessageModal({ open: false, update: null });
    setMessageContent("");
  };

  // Handle approval for item additions
  const handleItemAdditionApproval = async () => {
    if (!viewingUpdate) return;
    
    setSubmittingApproval(true);
    try {
      await axios.put(
        `${API}/admin/forms/item-additions/${viewingUpdate.id}/approve`,
        approvalForm,
        getAuthHeader()
      );
      
      toast.success(
        approvalForm.approval_status === 'approved' 
          ? `Approved! ${approvalForm.items_accepted} items accepted for consignment`
          : `Submission marked as rejected`
      );
      
      setViewingUpdate(null);
      fetchFormSubmissions();
      if (fetchItemAdditions) fetchItemAdditions();
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Failed to process approval. Please try again.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Reset approval form when opening a new update
  const handleViewUpdate = (update) => {
    // Route item additions through the main FormSubmissionModal
    if (update.items_to_add > 0 || update.source === 'item_addition') {
      onViewSubmission({ ...update, formType: "item_additions" });
    } else {
      // For payment changes and other updates, use the inline modal
      setApprovalForm({
        approval_status: update.approval_status || "approved",
        items_accepted: update.items_accepted || update.items_to_add || 0,
        rejected_items_action: update.rejected_items_action || "return",
        admin_notes: update.admin_notes || ""
      });
      setViewingUpdate(update);
    }
  };

  const getFilteredFormSubmissions = (submissions) => {
    if (!submissions) return [];
    let filtered = submissions;
    
    if (formSearchQuery.trim()) {
      const query = formSearchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const name = (item.full_name || item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }
    
    return filtered;
  };

  const SortableHeader = ({ table, sortKey, children, className = "" }) => {
    const isActive = sortConfig[table]?.key === sortKey;
    const direction = sortConfig[table]?.direction;
    return (
      <th 
        className={`cursor-pointer hover:bg-[#F9F6F7] transition-colors select-none ${className}`}
        onClick={() => handleSort(table, sortKey)}
      >
        <div className="flex items-center gap-1">
          {children}
          <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}>
            {isActive && direction === 'asc' ? '↑' : '↓'}
          </span>
        </div>
      </th>
    );
  };

  const totalSubmissions = (formsSummary?.job_applications?.total || 0) + 
    (formsSummary?.consignment_inquiries?.total || 0) + 
    (formsSummary?.consignment_agreements?.total || 0);
  
  const totalNew = (formsSummary?.job_applications?.new || 0) + 
    (formsSummary?.consignment_inquiries?.new || 0) + 
    (formsSummary?.consignment_agreements?.new || 0);

  return (
    <div className="dashboard-card">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="form-submissions-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Form Submissions</h2>
            <p className="text-sm text-[#888]">
              {totalSubmissions} total submissions
              {totalNew > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({totalNew} new)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fetchFormSubmissions();
            }}
            disabled={loadingForms}
            className="text-[#888] hover:text-[#333] hover:border-[#333]"
            data-testid="refresh-forms-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingForms ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#888]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#888]" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-[#eee]">
              {/* Form Type Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveFormTab("job_applications")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFormTab === "job_applications"
                      ? "bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white shadow-md"
                      : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                  }`}
                  data-testid="tab-job-applications"
                >
                  <Briefcase className="w-4 h-4" />
                  Job Applications
                  {formsSummary?.job_applications?.new > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {formsSummary.job_applications.new}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFormTab("consignment_inquiries")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFormTab === "consignment_inquiries"
                      ? "bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white shadow-md"
                      : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                  }`}
                  data-testid="tab-consignment-inquiries"
                >
                  <Package className="w-4 h-4" />
                  Consignment Inquiries
                  {formsSummary?.consignment_inquiries?.new > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {formsSummary.consignment_inquiries.new}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFormTab("consignment_agreements")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFormTab === "consignment_agreements"
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md"
                      : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                  }`}
                  data-testid="tab-consignment-agreements"
                >
                  <FileSignature className="w-4 h-4" />
                  Agreements
                  {formsSummary?.consignment_agreements?.new > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {formsSummary.consignment_agreements.new}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFormTab("updates")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFormTab === "updates"
                      ? "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-md"
                      : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                  }`}
                  data-testid="tab-updates"
                >
                  <Edit3 className="w-4 h-4" />
                  Updates
                  {(itemAdditions?.length > 0 || paymentMethodChanges?.length > 0) && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {(itemAdditions?.length || 0) + (paymentMethodChanges?.length || 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Search and Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-[#F9F6F7] rounded-xl">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={formSearchQuery}
                    onChange={(e) => setFormSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-white"
                    data-testid="form-search-input"
                  />
                </div>
                {formSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormSearchQuery("");
                    }}
                    className="text-[#888] hover:text-[#333]"
                  >
                    <X className="w-5 h-5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Job Applications Tab */}
              {activeFormTab === "job_applications" && (
                <div data-testid="job-applications-list">
                  {loadingForms ? (
                    <p className="text-center text-[#888] py-8">Loading...</p>
                  ) : !formSubmissions?.jobApplications?.length ? (
                    <p className="text-center text-[#888] py-8">No job applications yet</p>
                  ) : getFilteredFormSubmissions(formSubmissions.jobApplications).length === 0 ? (
                    <p className="text-center text-[#888] py-8">No matching results found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-xs text-[#888] mb-2">
                        Showing {getFilteredFormSubmissions(formSubmissions.jobApplications).length} of {formSubmissions.jobApplications.length} applications
                      </p>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <SortableHeader table="jobApplications" sortKey="full_name">Name</SortableHeader>
                            <SortableHeader table="jobApplications" sortKey="email">Email</SortableHeader>
                            <SortableHeader table="jobApplications" sortKey="phone">Phone</SortableHeader>
                            <SortableHeader table="jobApplications" sortKey="submitted_at">Submitted</SortableHeader>
                            <SortableHeader table="jobApplications" sortKey="status">Status</SortableHeader>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData(getFilteredFormSubmissions(formSubmissions.jobApplications), 'jobApplications').map((app) => (
                            <tr key={app.id} data-testid={`job-app-row-${app.id}`}>
                              <td className="font-medium">{app.full_name}</td>
                              <td>{app.email}</td>
                              <td>{app.phone}</td>
                              <td className="text-sm text-[#888]">{formatSubmissionDate(app.submitted_at)}</td>
                              <td>{getStatusBadge(app.status)}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewSubmission({ ...app, formType: "job_applications" })}
                                    className="text-[#8B5CF6] hover:text-[#6D28D9]"
                                    data-testid={`view-job-app-${app.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteSubmission("job_applications", app.id)}
                                    className="text-red-500 hover:text-red-700"
                                    data-testid={`delete-job-app-${app.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Consignment Inquiries Tab */}
              {activeFormTab === "consignment_inquiries" && (
                <div data-testid="consignment-inquiries-list">
                  {loadingForms ? (
                    <p className="text-center text-[#888] py-8">Loading...</p>
                  ) : !formSubmissions?.consignmentInquiries?.length ? (
                    <p className="text-center text-[#888] py-8">No consignment inquiries yet</p>
                  ) : getFilteredFormSubmissions(formSubmissions.consignmentInquiries).length === 0 ? (
                    <p className="text-center text-[#888] py-8">No matching results found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-xs text-[#888] mb-2">
                        Showing {getFilteredFormSubmissions(formSubmissions.consignmentInquiries).length} of {formSubmissions.consignmentInquiries.length} inquiries
                      </p>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <SortableHeader table="consignmentInquiries" sortKey="full_name">Name</SortableHeader>
                            <SortableHeader table="consignmentInquiries" sortKey="email">Email</SortableHeader>
                            <th>Item Types</th>
                            <SortableHeader table="consignmentInquiries" sortKey="submitted_at">Submitted</SortableHeader>
                            <SortableHeader table="consignmentInquiries" sortKey="status">Status</SortableHeader>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData(getFilteredFormSubmissions(formSubmissions.consignmentInquiries), 'consignmentInquiries').map((inquiry) => (
                            <tr key={inquiry.id} data-testid={`inquiry-row-${inquiry.id}`}>
                              <td className="font-medium">{inquiry.full_name}</td>
                              <td>{inquiry.email}</td>
                              <td className="text-sm">
                                {inquiry.item_types?.slice(0, 2).join(", ")}
                                {inquiry.item_types?.length > 2 && "..."}
                              </td>
                              <td className="text-sm text-[#888]">{formatSubmissionDate(inquiry.submitted_at)}</td>
                              <td>{getStatusBadge(inquiry.status)}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewSubmission({ ...inquiry, formType: "consignment_inquiries" })}
                                    className="text-[#00D4FF] hover:text-[#00A8CC]"
                                    data-testid={`view-inquiry-${inquiry.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteSubmission("consignment_inquiries", inquiry.id)}
                                    className="text-red-500 hover:text-red-700"
                                    data-testid={`delete-inquiry-${inquiry.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Consignment Agreements Tab */}
              {activeFormTab === "consignment_agreements" && (
                <div data-testid="consignment-agreements-list">
                  {loadingForms ? (
                    <p className="text-center text-[#888] py-8">Loading...</p>
                  ) : !formSubmissions?.consignmentAgreements?.length ? (
                    <p className="text-center text-[#888] py-8">No consignment agreements yet</p>
                  ) : getFilteredFormSubmissions(formSubmissions.consignmentAgreements).length === 0 ? (
                    <p className="text-center text-[#888] py-8">No matching results found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-xs text-[#888] mb-2">
                        Showing {getFilteredFormSubmissions(formSubmissions.consignmentAgreements).length} of {formSubmissions.consignmentAgreements.length} agreements
                      </p>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <SortableHeader table="consignmentAgreements" sortKey="full_name">Name</SortableHeader>
                            <SortableHeader table="consignmentAgreements" sortKey="email">Email</SortableHeader>
                            <SortableHeader table="consignmentAgreements" sortKey="agreed_percentage">Percentage</SortableHeader>
                            <SortableHeader table="consignmentAgreements" sortKey="submitted_at">Signed</SortableHeader>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData(getFilteredFormSubmissions(formSubmissions.consignmentAgreements), 'consignmentAgreements').map((agreement) => (
                            <tr key={agreement.id} data-testid={`agreement-row-${agreement.id}`}>
                              <td className="font-medium">{agreement.full_name}</td>
                              <td>{agreement.email}</td>
                              <td>{agreement.agreed_percentage}</td>
                              <td className="text-sm text-[#888]">{formatSubmissionDate(agreement.submitted_at)}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewSubmission({ ...agreement, formType: "consignment_agreements" })}
                                    className="text-[#8B5CF6] hover:text-[#6D28D9] hover:bg-[#8B5CF6]/10"
                                    title="View & Review"
                                    data-testid={`view-agreement-${agreement.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Unified Updates Tab */}
              {activeFormTab === "updates" && (
                <div data-testid="updates-list">
                  {loadingForms ? (
                    <p className="text-center text-[#888] py-8">Loading...</p>
                  ) : getFilteredUpdates().length === 0 ? (
                    <p className="text-center text-[#888] py-8">
                      {formSearchQuery ? "No matching updates found" : "No client updates yet"}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-sm text-[#666] mb-3">
                        Showing {getFilteredUpdates().length} of {getAllUpdates().length} update{getAllUpdates().length !== 1 ? 's' : ''}
                      </p>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <SortableHeader table="updates" sortKey="full_name">Client</SortableHeader>
                            <th>Type</th>
                            <th>Changes</th>
                            <SortableHeader table="updates" sortKey="submitted_at">Date</SortableHeader>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData(getFilteredUpdates(), 'updates').map((update) => (
                            <tr key={update.id} data-testid={`update-row-${update.id}`}>
                              <td>
                                <div className="font-medium">{update.current_full_name || update.full_name}</div>
                                <div className="text-xs text-[#888]">{update.current_email || update.email}</div>
                              </td>
                              <td>
                                {update.source === 'payment_change' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                    <CreditCard className="w-3 h-3" />
                                    Payment Change
                                  </span>
                                ) : update.items_to_add > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                    <Package className="w-3 h-3" />
                                    +{update.items_to_add} Items
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    <User className="w-3 h-3" />
                                    Info Update
                                  </span>
                                )}
                              </td>
                              <td className="text-sm">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {update.source === 'payment_change' ? (
                                    <span className="text-[#666]">
                                      {update.old_payment_method || 'None'} → {update.new_payment_method}
                                    </span>
                                  ) : (
                                    <>
                                      {update.update_email && update.update_email !== "None" && (
                                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Email</span>
                                      )}
                                      {update.update_phone && update.update_phone !== "None" && (
                                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">Phone</span>
                                      )}
                                      {update.update_address && update.update_address !== "None" && (
                                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-xs">Address</span>
                                      )}
                                      {update.update_payment_method && update.update_payment_method !== "None" && (
                                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-xs">Payment</span>
                                      )}
                                      {update.update_profit_split && update.update_profit_split !== "None" && (
                                        <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-xs">Split</span>
                                      )}
                                      {update.photos && update.photos.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded text-xs">{update.photos.length} photos</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="text-sm text-[#888]">
                                {formatSubmissionDate(update.submitted_at || update.changed_at)}
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewUpdate(update)}
                                    className="text-[#8B5CF6] hover:text-[#6D28D9] hover:bg-[#8B5CF6]/10"
                                    title="View & Review"
                                    data-testid={`view-update-${update.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Update Details Modal */}
      <AnimatePresence>
        {viewingUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingUpdate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="view-update-modal"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#10B981] to-[#059669] p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Update Details</h3>
                  <button
                    onClick={() => setViewingUpdate(null)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex items-center justify-end gap-2 px-6 py-3 bg-[#F9F6F7] border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadUpdate(viewingUpdate)}
                  className="text-[#10B981] border-[#10B981] hover:bg-[#10B981]/10"
                >
                  <Download className="w-4 h-4 mr-1" /> Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMessageModal({ open: true, update: viewingUpdate });
                    setMessageContent(getEmailTemplate(viewingUpdate));
                    setViewingUpdate(null);
                  }}
                  className="text-[#00D4FF] border-[#00D4FF] hover:bg-[#00D4FF]/10"
                >
                  <Mail className="w-4 h-4 mr-1" /> Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleDeleteUpdate(viewingUpdate);
                    setViewingUpdate(null);
                  }}
                  disabled={deletingUpdate === viewingUpdate?.id}
                  className="text-red-500 border-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Client Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#333] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Client Information
                  </h4>
                  <div className="bg-[#F9F6F7] rounded-xl p-3 space-y-1">
                    <p className="font-medium text-[#333]">{viewingUpdate.current_full_name || viewingUpdate.full_name}</p>
                    <p className="text-sm text-[#666] flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {viewingUpdate.current_email || viewingUpdate.email}
                      {viewingUpdate.current_email && viewingUpdate.current_email !== viewingUpdate.email && (
                        <span className="text-xs text-blue-500 ml-1">(updated)</span>
                      )}
                    </p>
                    <p className="text-sm text-[#888] flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatSubmissionDate(viewingUpdate.submitted_at || viewingUpdate.changed_at)}
                    </p>
                  </div>
                </div>

                {/* Update Type & Details */}
                {viewingUpdate.source === 'payment_change' ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-[#333] flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment Method Change
                    </h4>
                    <div className="bg-[#F9F6F7] rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 line-through">{viewingUpdate.old_payment_method || 'None'}</span>
                        <span className="text-[#888]">→</span>
                        <span className="text-green-600 font-medium">{viewingUpdate.new_payment_method}</span>
                      </div>
                      {viewingUpdate.new_payment_details && (
                        <p className="text-sm text-[#666]">Details: {viewingUpdate.new_payment_details}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Items Added */}
                    {viewingUpdate.items_to_add > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333] flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Items Added
                        </h4>
                        <div className="bg-emerald-50 rounded-xl p-3">
                          <p className="text-emerald-700 font-bold text-lg">+{viewingUpdate.items_to_add} items</p>
                          {viewingUpdate.items_description && (
                            <p className="text-sm text-[#666] mt-1">{viewingUpdate.items_description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Info Updates */}
                    {((viewingUpdate.update_email && viewingUpdate.update_email !== "None") || 
                      (viewingUpdate.update_phone && viewingUpdate.update_phone !== "None") || 
                      (viewingUpdate.update_address && viewingUpdate.update_address !== "None")) && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333] flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Contact Info Updates
                        </h4>
                        <div className="bg-[#F9F6F7] rounded-xl p-3 space-y-1">
                          {viewingUpdate.update_email && viewingUpdate.update_email !== "None" && (
                            <p className="text-sm flex items-center gap-2">
                              <Mail className="w-3 h-3 text-blue-500" />
                              <span className="text-[#666]">New Email:</span>
                              <span className="font-medium">{viewingUpdate.update_email}</span>
                            </p>
                          )}
                          {viewingUpdate.update_phone && viewingUpdate.update_phone !== "None" && (
                            <p className="text-sm flex items-center gap-2">
                              <Phone className="w-3 h-3 text-purple-500" />
                              <span className="text-[#666]">New Phone:</span>
                              <span className="font-medium">{viewingUpdate.update_phone}</span>
                            </p>
                          )}
                          {viewingUpdate.update_address && viewingUpdate.update_address !== "None" && (
                            <p className="text-sm flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-orange-500" />
                              <span className="text-[#666]">New Address:</span>
                              <span className="font-medium">{viewingUpdate.update_address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Method Update */}
                    {viewingUpdate.update_payment_method && viewingUpdate.update_payment_method !== "None" && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333] flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Payment Method Update
                        </h4>
                        <div className="bg-amber-50 rounded-xl p-3">
                          <p className="text-amber-700 font-medium">{viewingUpdate.update_payment_method}</p>
                          {viewingUpdate.update_payment_details && (
                            <p className="text-sm text-[#666] mt-1">{viewingUpdate.update_payment_details}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Profit Split Update */}
                    {viewingUpdate.update_profit_split && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333]">Profit Split Update</h4>
                        <div className="bg-green-50 rounded-xl p-3">
                          <p className="text-green-700 font-medium">{viewingUpdate.update_profit_split}</p>
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    {viewingUpdate.additional_info && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333]">Additional Information</h4>
                        <div className="bg-[#F9F6F7] rounded-xl p-3">
                          <p className="text-sm text-[#666] whitespace-pre-wrap">{viewingUpdate.additional_info}</p>
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {viewingUpdate.photos && viewingUpdate.photos.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333]">Uploaded Photos ({viewingUpdate.photos.length})</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {viewingUpdate.photos.map((photo, index) => (
                            <a 
                              key={index} 
                              href={photo.startsWith('http') ? photo : `${process.env.REACT_APP_BACKEND_URL}${photo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden border border-[#eee] hover:border-[#8B5CF6] transition-colors"
                            >
                              <img 
                                src={photo.startsWith('http') ? photo : `${process.env.REACT_APP_BACKEND_URL}${photo}`}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-24 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signature */}
                    {viewingUpdate.signature && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#333]">Signature</h4>
                        <div className="bg-[#F9F6F7] rounded-xl p-3">
                          <p className="font-serif italic text-lg text-[#333]">{viewingUpdate.signature}</p>
                          {viewingUpdate.signature_date && (
                            <p className="text-xs text-[#888] mt-1">Signed on: {viewingUpdate.signature_date}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Consignment Review Section - Only for item additions */}
                    {viewingUpdate.items_to_add > 0 && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-[#8B5CF6]/10 to-[#6D28D9]/10 rounded-xl border border-[#8B5CF6]/20">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-[#333] flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-[#8B5CF6]" />
                            Consignment Review
                          </h3>
                          {viewingUpdate.approval_status && viewingUpdate.approval_status !== 'pending' && viewingUpdate.approval_status !== 'info_update' ? (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
                              viewingUpdate.approval_status === 'approved' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {viewingUpdate.approval_status === 'approved' ? (
                                <><CheckCircle className="w-4 h-4" /> Approved</>
                              ) : (
                                <><XCircle className="w-4 h-4" /> Rejected</>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
                              <Clock className="w-4 h-4" /> Pending Review
                            </span>
                          )}
                        </div>

                        {viewingUpdate.approval_status && viewingUpdate.approval_status !== 'pending' && viewingUpdate.approval_status !== 'info_update' ? (
                          /* Show review details if already reviewed */
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white rounded-lg">
                                <p className="text-xs text-[#888]">Items Accepted</p>
                                <p className="font-bold text-green-600 text-lg">{viewingUpdate.items_accepted || 0}</p>
                              </div>
                              <div className="p-3 bg-white rounded-lg">
                                <p className="text-xs text-[#888]">Non-Consigned Items</p>
                                <p className="font-medium text-[#333] flex items-center gap-1">
                                  {viewingUpdate.rejected_items_action === 'donate' ? (
                                    <><Gift className="w-4 h-4 text-purple-500" /> Will be Donated</>
                                  ) : (
                                    <><RotateCcw className="w-4 h-4 text-blue-500" /> Will be Returned</>
                                  )}
                                </p>
                              </div>
                            </div>
                            {viewingUpdate.admin_notes && (
                              <div className="p-3 bg-white rounded-lg">
                                <p className="text-xs text-[#888]">Admin Notes</p>
                                <p className="text-[#333] text-sm">{viewingUpdate.admin_notes}</p>
                              </div>
                            )}
                            {viewingUpdate.reviewed_at && (
                              <p className="text-xs text-[#888] text-right">
                                Reviewed: {formatSubmissionDate(viewingUpdate.reviewed_at)}
                                {viewingUpdate.reviewed_by && ` by ${viewingUpdate.reviewed_by}`}
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
                                    <SelectValue>
                                      {approvalForm.approval_status === 'approved' ? (
                                        <span className="flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-600" /> Approve
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-2">
                                          <XCircle className="w-4 h-4 text-red-600" /> Reject
                                        </span>
                                      )}
                                    </SelectValue>
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
                                  max={viewingUpdate.items_to_add}
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
                                  <SelectValue>
                                    {approvalForm.rejected_items_action === 'donate' ? (
                                      <span className="flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-purple-600" /> Donate
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4 text-blue-600" /> Return to Owner
                                      </span>
                                    )}
                                  </SelectValue>
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
                              onClick={handleItemAdditionApproval}
                              disabled={submittingApproval}
                              className={`w-full ${approvalForm.approval_status === 'approved' 
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                              }`}
                              data-testid="submit-approval-btn"
                            >
                              {submittingApproval ? "Processing..." : (
                                approvalForm.approval_status === 'approved' 
                                  ? `Approve (${approvalForm.items_accepted} of ${viewingUpdate.items_to_add} items)`
                                  : 'Reject Submission'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Client Modal */}
      <AnimatePresence>
        {messageModal.open && messageModal.update && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setMessageModal({ open: false, update: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="message-modal"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Message Client</h3>
                    <p className="text-sm text-white/80">{messageModal.update.current_email || messageModal.update.email}</p>
                  </div>
                  <button
                    onClick={() => setMessageModal({ open: false, update: null })}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                  <p>This will open your default email client with the message below pre-filled. You can edit it before sending.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-content" className="text-[#333]">Email Message</Label>
                  <Textarea
                    id="message-content"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={10}
                    className="resize-none text-sm"
                    placeholder="Enter your message..."
                    data-testid="message-textarea"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-[#F9F6F7] p-4 rounded-b-2xl border-t border-[#eee] flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessageModal({ open: false, update: null })}
                  className="text-[#666]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] hover:from-[#00A8CC] hover:to-[#008BA8] text-white"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Open Email Client
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
