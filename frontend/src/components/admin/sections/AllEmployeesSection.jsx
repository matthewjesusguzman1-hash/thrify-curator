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
  Download,
  Trash2,
  Clock3,
  MessageSquare
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

  // View W-9
  const handleViewW9 = async (employeeId, employeeName) => {
    if (!employeeId) {
      toast.error("Invalid employee ID");
      return;
    }
    
    try {
      // Get W-9 status/documents for the employee
      const response = await axios.get(`${API}/admin/employees/${employeeId}/w9/status`, getAuthHeader());
      const w9_documents = (response.data.w9_documents || []).filter(doc => doc && doc.id);
      
      if (!w9_documents || w9_documents.length === 0) {
        toast.error("No W-9 documents found");
        return;
      }
      
      // Get the most recent document
      const latestDoc = w9_documents[0];
      
      // Download and open in new tab
      const docResponse = await axios.get(
        `${API}/admin/employees/${employeeId}/w9/${latestDoc.id}`,
        { ...getAuthHeader(), responseType: 'blob' }
      );
      
      const blob = new Blob([docResponse.data], { type: latestDoc.content_type });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
    } catch (error) {
      toast.error("Failed to view W-9");
    }
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
                                    <X className="w-3 h-3" />
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
                              <div className="flex items-center gap-1">
                                {emp.has_w9 ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleViewW9(emp.id, emp.name); }}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                                    data-testid={`view-w9-${emp.id}`}
                                    title="View W-9"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <>
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                      id={`w9-upload-${emp.id}`}
                                      onChange={(e) => handleW9Upload(emp.id, e.target.files[0])}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        document.getElementById(`w9-upload-${emp.id}`).click();
                                      }}
                                      className="text-[#888] hover:text-[#666] hover:bg-[#F9F6F7] h-8 px-2"
                                      disabled={uploadingW9 === emp.id}
                                      data-testid={`upload-w9-${emp.id}`}
                                      title="Upload W-9"
                                    >
                                      {uploadingW9 === emp.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C5A065]"></div>
                                      ) : (
                                        <Upload className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
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
    </div>
  );
}
