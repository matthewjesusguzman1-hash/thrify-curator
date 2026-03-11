import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CreditCard,
  Plus
} from "lucide-react";

export default function FormSubmissionsSection({
  formSubmissions,
  formsSummary,
  loadingForms,
  fetchFormSubmissions,
  onViewSubmission,
  onDeleteSubmission,
  formatSubmissionDate,
  getStatusBadge,
  paymentMethodChanges,
  fetchPaymentMethodChanges,
  itemAdditions,
  fetchItemAdditions
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState("job_applications");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [formStatusFilter, setFormStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    jobApplications: { key: "submitted_at", direction: "desc" },
    consignmentInquiries: { key: "submitted_at", direction: "desc" },
    consignmentAgreements: { key: "submitted_at", direction: "desc" },
    paymentChanges: { key: "changed_at", direction: "desc" },
    itemAdditions: { key: "submitted_at", direction: "desc" }
  });

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
    
    if (formStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === formStatusFilter);
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
                  onClick={() => setActiveFormTab("payment_changes")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFormTab === "payment_changes"
                      ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-md"
                      : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                  }`}
                  data-testid="tab-payment-changes"
                >
                  <CreditCard className="w-4 h-4" />
                  Payment Changes
                  {paymentMethodChanges?.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {paymentMethodChanges.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFormTab("item_additions")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeFormTab === "item_additions"
                      ? "bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-md"
                      : "bg-[#F9F6F7] text-[#666] hover:bg-[#F0EAEB]"
                  }`}
                  data-testid="tab-item-additions"
                >
                  <Plus className="w-4 h-4" />
                  Item Additions
                  {itemAdditions?.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {itemAdditions.length}
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
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#888]" />
                  <Select value={formStatusFilter} onValueChange={setFormStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formSearchQuery || formStatusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormSearchQuery("");
                      setFormStatusFilter("all");
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
                            <SortableHeader table="consignmentAgreements" sortKey="status">Status</SortableHeader>
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
                              <td>{getStatusBadge(agreement.status)}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewSubmission({ ...agreement, formType: "consignment_agreements" })}
                                    className="text-[#8B5CF6] hover:text-[#6D28D9]"
                                    data-testid={`view-agreement-${agreement.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteSubmission("consignment_agreements", agreement.id)}
                                    className="text-red-500 hover:text-red-700"
                                    data-testid={`delete-agreement-${agreement.id}`}
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

              {/* Payment Method Changes Tab */}
              {activeFormTab === "payment_changes" && (
                <div data-testid="payment-changes-list">
                  {loadingForms ? (
                    <p className="text-center text-[#888] py-8">Loading...</p>
                  ) : !paymentMethodChanges?.length ? (
                    <p className="text-center text-[#888] py-8">No payment method changes yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-sm text-[#666] mb-3">
                        Showing {paymentMethodChanges.length} payment method change{paymentMethodChanges.length !== 1 ? 's' : ''}
                      </p>
                      <table className="forms-table w-full">
                        <thead>
                          <tr>
                            <SortableHeader table="paymentChanges" sortKey="full_name">Name</SortableHeader>
                            <SortableHeader table="paymentChanges" sortKey="email">Email</SortableHeader>
                            <th>Previous Method</th>
                            <th>New Method</th>
                            <SortableHeader table="paymentChanges" sortKey="changed_at">Changed</SortableHeader>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData(paymentMethodChanges, 'paymentChanges').map((change) => (
                            <tr key={change.id} data-testid={`payment-change-row-${change.id}`}>
                              <td className="font-medium">{change.full_name}</td>
                              <td>{change.email}</td>
                              <td>
                                <div className="flex flex-col">
                                  <span className="text-red-500 line-through text-sm">
                                    {change.old_payment_method || 'Not set'}
                                  </span>
                                  {change.old_payment_details && (
                                    <span className="text-xs text-[#888] line-through">{change.old_payment_details}</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="flex flex-col">
                                  <span className="text-green-600 font-medium">
                                    {change.new_payment_method}
                                  </span>
                                  {change.new_payment_details && (
                                    <span className="text-xs text-[#888]">{change.new_payment_details}</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-sm text-[#888]">{formatSubmissionDate(change.changed_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Item Additions Tab */}
              {activeFormTab === "item_additions" && (
                <div data-testid="item-additions-list">
                  {loadingForms ? (
                    <p className="text-center text-[#888] py-8">Loading...</p>
                  ) : !itemAdditions?.length ? (
                    <p className="text-center text-[#888] py-8">No item additions yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-sm text-[#666] mb-3">
                        Showing {itemAdditions.length} item addition{itemAdditions.length !== 1 ? 's' : ''}
                      </p>
                      <table className="forms-table w-full">
                        <thead>
                          <tr>
                            <SortableHeader table="itemAdditions" sortKey="full_name">Name</SortableHeader>
                            <SortableHeader table="itemAdditions" sortKey="email">Email</SortableHeader>
                            <SortableHeader table="itemAdditions" sortKey="items_to_add">Items Added</SortableHeader>
                            <th>Description</th>
                            <SortableHeader table="itemAdditions" sortKey="submitted_at">Date</SortableHeader>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedData(itemAdditions, 'itemAdditions').map((addition) => (
                            <tr key={addition.id} data-testid={`item-addition-row-${addition.id}`}>
                              <td className="font-medium">{addition.full_name}</td>
                              <td>{addition.email}</td>
                              <td>
                                <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full font-bold">
                                  +{addition.items_to_add}
                                </span>
                              </td>
                              <td className="text-sm text-[#666] max-w-[200px] truncate">
                                {addition.items_description || '-'}
                              </td>
                              <td className="text-sm text-[#888]">{formatSubmissionDate(addition.submitted_at)}</td>
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
    </div>
  );
}
