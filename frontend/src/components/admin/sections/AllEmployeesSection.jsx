import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  User,
  Shield,
  Phone,
  DollarSign,
  Edit3,
  Eye,
  Upload,
  Monitor,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  X,
  ArrowUpDown,
  ArrowUp,
  Trash2,
  Clock3,
  MessageSquare,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AllEmployeesSection({
  employees,
  employeeClockStatuses,
  payrollSettings,
  getAuthHeader,
  formatDateTime,
  onViewEmployeePortal,
  onRefreshEmployees,
  onDownloadBlankW9
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingRateId, setEditingRateId] = useState(null);
  const [editingRateValue, setEditingRateValue] = useState("");
  const [uploadingW9, setUploadingW9] = useState(null);
  
  // W-9 Management Modal State
  const [showW9Modal, setShowW9Modal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeW9Docs, setEmployeeW9Docs] = useState([]);
  const [loadingW9s, setLoadingW9s] = useState(false);
  const [previewingW9, setPreviewingW9] = useState(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sort function
  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle null/undefined
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle dates
      if (sortConfig.key === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle strings
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortableHeader = ({ sortKey, children }) => (
    <th 
      className="cursor-pointer hover:bg-[#F9F6F7] select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortConfig.key === sortKey ? (
          <ArrowUp className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-[#aaa]" />
        )}
      </div>
    </th>
  );

  // Update employee rate
  const handleUpdateEmployeeRate = async (employeeId) => {
    if (!editingRateValue) {
      setEditingRateId(null);
      return;
    }
    
    const rate = parseFloat(editingRateValue);
    if (isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }
    
    try {
      await axios.put(`${API}/admin/employees/${employeeId}/rate`, {
        hourly_rate: rate
      }, getAuthHeader());
      
      toast.success("Hourly rate updated");
      setEditingRateId(null);
      setEditingRateValue("");
      onRefreshEmployees();
    } catch (error) {
      toast.error("Failed to update rate");
    }
  };

  // W-9 upload
  const handleW9Upload = async (employeeId, file) => {
    if (!file) return;
    
    setUploadingW9(employeeId);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      await axios.post(`${API}/admin/employees/${employeeId}/w9`, formData, {
        ...getAuthHeader(),
        headers: {
          ...getAuthHeader().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("W-9 uploaded successfully");
      onRefreshEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload W-9");
    } finally {
      setUploadingW9(null);
    }
  };

  // Open W-9 Management Modal
  const handleOpenW9Modal = async (employee) => {
    if (!employee || !employee.id) {
      toast.error("Invalid employee");
      return;
    }
    
    setSelectedEmployee(employee);
    setShowW9Modal(true);
    setLoadingW9s(true);
    setEmployeeW9Docs([]);
    
    try {
      const response = await axios.get(`${API}/admin/employees/${employee.id}/w9/status`, getAuthHeader());
      const docs = (response.data.w9_documents || []).filter(doc => doc && doc.id);
      setEmployeeW9Docs(docs);
    } catch (error) {
      toast.error("Failed to load W-9 documents");
    } finally {
      setLoadingW9s(false);
    }
  };

  // Preview W-9 in modal
  const handlePreviewW9 = async (doc) => {
    if (!selectedEmployee || !doc || !doc.id) return;
    
    try {
      const response = await axios.get(
        `${API}/admin/employees/${selectedEmployee.id}/w9/${doc.id}`,
        { ...getAuthHeader(), responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: doc.content_type || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewingW9({
        url,
        filename: doc.filename || 'w9.pdf',
        contentType: doc.content_type || 'application/pdf',
        docId: doc.id
      });
    } catch (error) {
      toast.error("Failed to preview W-9");
    }
  };

  // Approve W-9
  const handleApproveW9 = async (doc) => {
    if (!selectedEmployee || !doc || !doc.id) return;
    
    try {
      await axios.post(
        `${API}/admin/employees/${selectedEmployee.id}/w9/${doc.id}/approve`,
        {},
        getAuthHeader()
      );
      toast.success("W-9 approved!");
      // Refresh the list
      handleOpenW9Modal(selectedEmployee);
      onRefreshEmployees();
    } catch (error) {
      toast.error("Failed to approve W-9");
    }
  };

  // Delete W-9
  const handleDeleteW9 = async (doc) => {
    if (!selectedEmployee || !doc || !doc.id) return;
    if (!window.confirm("Are you sure you want to delete this W-9? The employee will no longer be able to see it.")) return;
    
    try {
      await axios.delete(
        `${API}/admin/employees/${selectedEmployee.id}/w9/${doc.id}`,
        getAuthHeader()
      );
      toast.success("W-9 deleted!");
      // Refresh the list
      handleOpenW9Modal(selectedEmployee);
      onRefreshEmployees();
    } catch (error) {
      toast.error("Failed to delete W-9");
    }
  };

  // Close W-9 modal
  const handleCloseW9Modal = () => {
    if (previewingW9?.url) {
      window.URL.revokeObjectURL(previewingW9.url);
    }
    setShowW9Modal(false);
    setSelectedEmployee(null);
    setEmployeeW9Docs([]);
    setPreviewingW9(null);
  };

  return (
    <div className="dashboard-card" data-testid="all-employees-section">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="employees-section-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#C5A065] to-[#9A7B4F] rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">All Employees</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-[#888]">{employees.length} total</p>
              {Object.values(employeeClockStatuses).filter(Boolean).length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  {Object.values(employeeClockStatuses).filter(Boolean).length} clocked in
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadBlankW9();
            }}
            className="text-[#C5A065] border-[#C5A065] hover:bg-[#C5A065]/10"
            data-testid="all-employees-w9-form-btn"
          >
            <FileText className="w-4 h-4 mr-1" />
            Get W-9 Form
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#eee]">
              {employees.length === 0 ? (
                <p className="text-center text-[#888] py-8">No employees registered</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table" data-testid="employees-table">
                    <thead>
                      <tr>
                        <SortableHeader sortKey="name">Name</SortableHeader>
                        <SortableHeader sortKey="email">Email</SortableHeader>
                        <SortableHeader sortKey="phone">Phone</SortableHeader>
                        <SortableHeader sortKey="role">Role</SortableHeader>
                        <SortableHeader sortKey="hourly_rate">Hourly Rate</SortableHeader>
                        <SortableHeader sortKey="created_at">Joined</SortableHeader>
                        <th>W-9</th>
                        <th>Portal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedData(employees).map((emp) => (
                        <tr key={emp.id} data-testid={`all-employee-row-${emp.id}`}>
                          <td>
                            <div 
                              className="flex items-center gap-2 px-2 py-1 -mx-2"
                              data-testid={`employee-name-${emp.id}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                emp.role === 'admin' ? 'bg-[#C5A065]/20' : 'bg-[#F8C8DC]/30'
                              }`}>
                                {emp.role === 'admin' ? (
                                  <Shield className="w-4 h-4 text-[#C5A065]" />
                                ) : (
                                  <User className="w-4 h-4 text-[#D48C9E]" />
                                )}
                              </div>
                              <span className="text-[#333] font-medium">{emp.name}</span>
                              {employeeClockStatuses[emp.id] && (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"
                                  title="Currently Clocked In"
                                >
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                  Clocked In
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{emp.email}</td>
                          <td>
                            {emp.phone ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-[#888]" />
                                <span>{emp.phone}</span>
                              </div>
                            ) : (
                              <span className="text-[#aaa] text-sm">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              emp.role === 'admin' 
                                ? 'bg-[#C5A065]/20 text-[#9A7B4F]' 
                                : 'bg-[#F8C8DC]/30 text-[#5D4037]'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {emp.role !== 'admin' ? (
                              editingRateId === emp.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[#888]">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingRateValue}
                                    onChange={(e) => setEditingRateValue(e.target.value)}
                                    className="w-20 h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdateEmployeeRate(emp.id);
                                      if (e.key === 'Escape') { setEditingRateId(null); setEditingRateValue(""); }
                                    }}
                                    data-testid={`rate-input-${emp.id}`}
                                  />
                                  <button
                                    onClick={() => handleUpdateEmployeeRate(emp.id)}
                                    className="text-green-500 hover:text-green-600 p-1"
                                    title="Save"
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setEditingRateId(null); setEditingRateValue(""); }}
                                    className="text-red-400 hover:text-red-500 p-1"
                                    title="Cancel"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:bg-[#F9F6F7] rounded px-2 py-1 -mx-2"
                                  onClick={() => {
                                    setEditingRateId(emp.id);
                                    setEditingRateValue(emp.hourly_rate?.toString() || "");
                                  }}
                                  data-testid={`rate-display-${emp.id}`}
                                  title="Click to edit"
                                >
                                  <DollarSign className="w-3 h-3 text-[#C5A065]" />
                                  <span className={emp.hourly_rate ? 'font-medium text-[#333]' : 'text-[#888]'}>
                                    {emp.hourly_rate 
                                      ? `${emp.hourly_rate.toFixed(2)}/hr` 
                                      : `${payrollSettings?.default_hourly_rate?.toFixed(2) || '15.00'}/hr`}
                                  </span>
                                  {!emp.hourly_rate && <span className="text-[#aaa] text-xs ml-1">(default)</span>}
                                  <Edit3 className="w-3 h-3 text-[#aaa] ml-1" />
                                </div>
                              )
                            ) : (
                              <span className="text-[#888]">-</span>
                            )}
                          </td>
                          <td>{formatDateTime(emp.created_at)}</td>
                          <td>
                            {emp.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleOpenW9Modal(emp); }}
                                className={`h-8 px-2 ${
                                  emp.has_w9 
                                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' 
                                    : 'text-[#888] hover:text-[#666] hover:bg-[#F9F6F7]'
                                }`}
                                data-testid={`view-w9-${emp.id}`}
                                title={emp.has_w9 ? "View W-9 Documents" : "No W-9 Submitted"}
                              >
                                <FileText className="w-4 h-4" />
                                {emp.has_w9 && <span className="ml-1 text-xs">View</span>}
                              </Button>
                            )}
                          </td>
                          <td>
                            {emp.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onViewEmployeePortal(emp); }}
                                className="text-[#00D4FF] hover:text-[#00A8CC] hover:bg-[#00D4FF]/10"
                                data-testid={`view-portal-${emp.id}`}
                              >
                                <Monitor className="w-4 h-4 mr-1" />
                                View Portal
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* W-9 Management Modal - Dark Theme */}
      <AnimatePresence>
        {showW9Modal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseW9Modal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
              data-testid="w9-management-modal"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493] rounded-full mb-4" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">W-9 Documents</h2>
                      <p className="text-sm text-white/60">{selectedEmployee.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseW9Modal}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {loadingW9s ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto mb-3"></div>
                    <p className="text-white/60">Loading documents...</p>
                  </div>
                ) : employeeW9Docs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">No W-9 submissions yet</p>
                    <p className="text-sm text-white/40">Employee has not submitted any W-9 forms</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeW9Docs.map((doc, index) => (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border ${
                          doc.status === 'approved'
                            ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30'
                            : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                        }`}
                        data-testid={`w9-doc-${doc.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className={`w-4 h-4 ${
                                doc.status === 'approved' ? 'text-[#00D4FF]' : 'text-[#8B5CF6]'
                              }`} />
                              <span className="font-medium text-white truncate">
                                {doc.filename || `W-9 #${index + 1}`}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                doc.status === 'approved'
                                  ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                                  : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                              }`}>
                                {doc.status === 'approved' ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/50">
                              {doc.uploaded_at && new Date(doc.uploaded_at).toString() !== 'Invalid Date' && (
                                <span className="flex items-center gap-1">
                                  <Clock3 className="w-3 h-3" />
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {doc.notes && (
                              <div className="mt-2 p-2 bg-white/5 rounded-lg">
                                <p className="text-xs text-white/60 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="italic">"{doc.notes}"</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewW9(doc)}
                            className="flex-1 min-w-[80px] text-white/80 border-white/20 hover:bg-white/10 bg-transparent"
                            data-testid={`preview-w9-${doc.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          {doc.status !== 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveW9(doc)}
                              className="flex-1 min-w-[80px] text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 bg-transparent"
                              data-testid={`approve-w9-${doc.id}`}
                            >
                              <CheckCheck className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadW9(doc)}
                            className="px-3 text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent"
                            data-testid={`download-w9-${doc.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadBlankW9}
                  className="text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Get W-9 Form
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCloseW9Modal}
                  className="text-white/80 border-white/20 hover:bg-white/10 bg-transparent"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* W-9 Preview Modal */}
      <AnimatePresence>
        {previewingW9 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={() => {
              if (previewingW9.url) window.URL.revokeObjectURL(previewingW9.url);
              setPreviewingW9(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
                <div>
                  <h3 className="font-semibold text-white">W-9 Preview</h3>
                  <p className="text-sm text-gray-300">{previewingW9.filename}</p>
                </div>
                <button
                  onClick={() => {
                    if (previewingW9.url) window.URL.revokeObjectURL(previewingW9.url);
                    setPreviewingW9(null);
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Document Viewer */}
              <div className="flex-1 overflow-auto p-4 bg-gray-100">
                {previewingW9.contentType?.includes('pdf') ? (
                  <iframe
                    src={previewingW9.url}
                    className="w-full h-full min-h-[500px] rounded-lg border border-gray-200"
                    title="W-9 Document"
                  />
                ) : previewingW9.contentType?.includes('image') ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={previewingW9.url}
                      alt="W-9 Document"
                      className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Preview not available</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end bg-white">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (previewingW9.url) window.URL.revokeObjectURL(previewingW9.url);
                    setPreviewingW9(null);
                  }}
                >
                  Close Preview
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
