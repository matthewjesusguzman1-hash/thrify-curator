import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import { toast } from "sonner";
import axios from "axios";
import {
  User, X, Shield, Briefcase, Calendar, FileText, Eye, Download,
  Upload, Trash2, CheckCheck, Lock, EyeOff, Key
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EditEmployeeModal({
  isOpen,
  onClose,
  employees,
  editingEmployee,
  setEditingEmployee,
  editEmployeeData,
  setEditEmployeeData,
  isOwner,
  payrollSettings,
  formSubmissions,
  getAuthHeader,
  calculateBiweeklyPeriod,
  fetchData,
  handleDownloadBlankW9
}) {
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [editEmployeeW9s, setEditEmployeeW9s] = useState([]);
  const [loadingEditW9s, setLoadingEditW9s] = useState(false);
  const [showEditW9Modal, setShowEditW9Modal] = useState(false);
  const [editW9Viewer, setEditW9Viewer] = useState(null);
  
  // Password management state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Load W-9s when editing employee changes
  useEffect(() => {
    if (editingEmployee?.id) {
      loadW9Documents();
      checkPasswordStatus();
    }
  }, [editingEmployee?.id]);

  const checkPasswordStatus = async () => {
    if (!editingEmployee?.email) return;
    try {
      const res = await axios.get(`${API}/auth/employee/has-password/${encodeURIComponent(editingEmployee.email)}`);
      setHasPassword(res.data.has_password || false);
    } catch (error) {
      console.error("Error checking password status:", error);
      setHasPassword(false);
    }
  };

  const loadW9Documents = async () => {
    if (!editingEmployee?.id) return;
    setLoadingEditW9s(true);
    try {
      const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/status`, getAuthHeader());
      setEditEmployeeW9s(response.data.w9_documents || []);
    } catch (error) {
      console.error("Failed to load W-9s:", error);
    } finally {
      setLoadingEditW9s(false);
    }
  };

  const handleOpenEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEditEmployeeData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      role: employee.role || "employee",
      admin_code: employee.admin_code || "",
      hourly_rate: employee.hourly_rate ? employee.hourly_rate.toString() : "",
      start_date: employee.start_date || ""
    });
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    // Validate admin code for admin role
    if (editEmployeeData.role === 'admin' && isOwner) {
      if (!editEmployeeData.admin_code || editEmployeeData.admin_code.length !== 4) {
        toast.error("Admin code must be 4 digits");
        return;
      }
    }

    setSavingEmployee(true);
    try {
      const payload = {
        name: editEmployeeData.name,
        email: editEmployeeData.email,
        phone: editEmployeeData.phone || null,
        hourly_rate: editEmployeeData.hourly_rate ? parseFloat(editEmployeeData.hourly_rate) : null,
        start_date: editEmployeeData.start_date || null
      };

      // Only include role changes if the user is an owner
      if (isOwner) {
        payload.role = editEmployeeData.role;
        if (editEmployeeData.role === 'admin') {
          payload.admin_code = editEmployeeData.admin_code;
        }
      }

      await axios.put(`${API}/admin/employees/${editingEmployee.id}`, payload, getAuthHeader());

      toast.success("Employee updated successfully");
      onClose();
      setEditingEmployee(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update employee");
    } finally {
      setSavingEmployee(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Edit Employee Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-8 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          data-testid="edit-employee-modal"
        >
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 -mt-2 pt-2 -mx-2 px-2 z-10">
            <h2 className="font-playfair text-xl font-bold text-[#333]">Edit Employee</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Employee Selection (when not editing a specific employee) */}
          {!editingEmployee ? (
            <div className="form-group">
              <Label className="form-label">Select Employee to Edit</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  const emp = employees.find(e => e.id === value);
                  if (emp) handleOpenEditEmployee(emp);
                }}
              >
                <SelectTrigger className="form-input" data-testid="edit-employee-select">
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email}) {emp.role === 'admin' ? '⭐ Admin' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <form onSubmit={handleUpdateEmployee}>
              <div className="mb-4 p-3 bg-[#F9F6F7] rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#D48C9E]" />
                </div>
                <div>
                  <p className="font-medium text-[#333]">{editingEmployee.name}</p>
                  <p className="text-xs text-[#888]">Editing employee details</p>
                </div>
              </div>

              {/* Import from Job Application */}
              {formSubmissions?.jobApplications && formSubmissions.jobApplications.length > 0 && (
                <div className="form-group mb-4">
                  <Label className="form-label flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#C5A065]" />
                    Import from Job Application
                  </Label>
                  <Select 
                    onValueChange={(value) => {
                      if (value && value !== "none") {
                        const app = formSubmissions.jobApplications.find(a => a.id === value);
                        if (app) {
                          setEditEmployeeData({
                            ...editEmployeeData,
                            name: app.full_name,
                            email: app.email,
                            phone: app.phone || ""
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Select a job applicant..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- No import --</SelectItem>
                      {formSubmissions.jobApplications.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.full_name} ({app.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#888] mt-1">Replace employee info with data from a job application</p>
                </div>
              )}

              <div className="form-group">
                <Label className="form-label">Full Name *</Label>
                <Input
                  type="text"
                  value={editEmployeeData.name}
                  onChange={(e) => setEditEmployeeData({ ...editEmployeeData, name: e.target.value })}
                  required
                  placeholder="Employee name"
                  className="form-input"
                  data-testid="edit-employee-name"
                />
              </div>

              <div className="form-group">
                <Label className="form-label">Email *</Label>
                <Input
                  type="email"
                  value={editEmployeeData.email}
                  onChange={(e) => setEditEmployeeData({ ...editEmployeeData, email: e.target.value })}
                  required
                  placeholder="employee@email.com"
                  className="form-input"
                  data-testid="edit-employee-email"
                />
              </div>

              <div className="form-group">
                <Label className="form-label">Phone Number</Label>
                <Input
                  type="tel"
                  value={editEmployeeData.phone}
                  onChange={(e) => setEditEmployeeData({ ...editEmployeeData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="form-input"
                  data-testid="edit-employee-phone"
                />
              </div>

              {/* Role Selection - Only shown for business owners */}
              {isOwner && (
                <div className="form-group">
                  <Label className="form-label">Role *</Label>
                  <Select
                    value={editEmployeeData.role}
                    onValueChange={(value) => setEditEmployeeData({ ...editEmployeeData, role: value, admin_code: value === 'employee' ? '' : editEmployeeData.admin_code })}
                  >
                    <SelectTrigger className="form-input" data-testid="edit-employee-role">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#888] mt-1">Changing to Admin gives full dashboard access</p>
                </div>
              )}

              {/* Admin Code - only shown when role is admin AND user is owner */}
              {isOwner && editEmployeeData.role === 'admin' && (
                <div className="form-group">
                  <Label className="form-label flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#8B5CF6]" />
                    Admin Access Code *
                  </Label>
                  <Input
                    type="text"
                    value={editEmployeeData.admin_code || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditEmployeeData({ ...editEmployeeData, admin_code: value });
                    }}
                    placeholder="4-digit code (e.g., 1234)"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    className="form-input font-mono text-lg tracking-widest"
                    data-testid="edit-employee-admin-code"
                  />
                  <p className="text-xs text-[#888] mt-1">This 4-digit code will be used for admin login</p>
                </div>
              )}

              <div className="form-group">
                <Label className="form-label">Hourly Rate</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[#666] text-sm font-medium">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editEmployeeData.hourly_rate}
                    onChange={(e) => setEditEmployeeData({ ...editEmployeeData, hourly_rate: e.target.value })}
                    placeholder={payrollSettings?.default_hourly_rate?.toFixed(2) || "15.00"}
                    className="form-input flex-1"
                    data-testid="edit-employee-rate"
                  />
                </div>
                <p className="text-xs text-[#888] mt-1">
                  Default rate: ${payrollSettings?.default_hourly_rate?.toFixed(2) || "15.00"}/hr (used if empty)
                </p>
              </div>

              {/* Employee Start Date */}
              <div className="form-group">
                <Label className="form-label">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 form-input"
                      data-testid="employee-start-date-trigger"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-[#00D4FF]" />
                      {editEmployeeData.start_date ? (
                        <span>{new Date(editEmployeeData.start_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      ) : (
                        <span className="text-[#888]">Select start date...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b bg-gradient-to-r from-[#00D4FF]/10 to-[#00A8CC]/10">
                      <p className="text-xs text-[#666] mb-1">Current Pay Period</p>
                      <p className="text-sm font-semibold text-[#00A8CC]">
                        {(() => {
                          const period = calculateBiweeklyPeriod();
                          if (period) {
                            return `${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                          }
                          return '';
                        })()}
                      </p>
                    </div>
                    <DayPicker
                      mode="single"
                      selected={editEmployeeData.start_date ? new Date(editEmployeeData.start_date + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const dateStr = date.toISOString().split('T')[0];
                          setEditEmployeeData({
                            ...editEmployeeData,
                            start_date: dateStr
                          });
                        }
                      }}
                      className="rounded-md border-0"
                      modifiersStyles={{
                        selected: {
                          backgroundColor: '#00D4FF',
                          color: 'white',
                          fontWeight: 'bold',
                          borderRadius: '8px'
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-[#888] mt-1">When this employee started working</p>
              </div>

              {/* W-9 Documents Section - Button to open modal */}
              <div className="form-group">
                <div className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-xl overflow-hidden border border-white/10">
                  <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="text-white font-medium">W-9 Tax Documents</span>
                          <p className="text-xs text-white/50">
                            {editEmployeeW9s.length > 0 
                              ? `${editEmployeeW9s.length} document(s) on file` 
                              : 'No documents uploaded'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowEditW9Modal(true)}
                        className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white"
                        data-testid="open-edit-w9-modal-btn"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Manage W-9s
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Management Section - Only for employees (not admins) */}
              {editEmployeeData.role !== 'admin' && (
                <div className="form-group">
                  <div className="bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-purple-900/30 rounded-xl overflow-hidden border border-purple-500/20">
                    <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Key className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="text-[#333] font-medium">Login Password</span>
                            <p className="text-xs text-[#888]">
                              {hasPassword ? 'Password is set' : 'No password set'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          hasPassword 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {hasPassword ? 'Active' : 'Not Set'}
                        </span>
                      </div>
                      
                      {/* Password Input */}
                      <div className="space-y-3">
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={hasPassword ? "Enter new password to reset" : "Set a password"}
                            className="form-input pr-10"
                            data-testid="edit-employee-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            disabled={!newPassword || newPassword.length < 4 || settingPassword}
                            onClick={async () => {
                              if (newPassword.length < 4) {
                                toast.error("Password must be at least 4 characters");
                                return;
                              }
                              setSettingPassword(true);
                              try {
                                await axios.post(
                                  `${API}/admin/employees/${editingEmployee.id}/set-password?new_password=${encodeURIComponent(newPassword)}`,
                                  {},
                                  getAuthHeader()
                                );
                                toast.success(`Password ${hasPassword ? 'reset' : 'set'} for ${editingEmployee.name}`);
                                setNewPassword("");
                                setHasPassword(true);
                              } catch (error) {
                                toast.error(error.response?.data?.detail || "Failed to set password");
                              } finally {
                                setSettingPassword(false);
                              }
                            }}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            data-testid="set-employee-password-btn"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            {settingPassword ? "Setting..." : (hasPassword ? "Reset Password" : "Set Password")}
                          </Button>
                          
                          {hasPassword && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                if (!window.confirm(`Remove password for ${editingEmployee.name}? They will need to set a new one.`)) return;
                                try {
                                  await axios.delete(
                                    `${API}/admin/employees/${editingEmployee.id}/password`,
                                    getAuthHeader()
                                  );
                                  toast.success(`Password removed for ${editingEmployee.name}`);
                                  setHasPassword(false);
                                  setNewPassword("");
                                } catch (error) {
                                  toast.error(error.response?.data?.detail || "Failed to remove password");
                                }
                              }}
                              className="text-red-500 border-red-300 hover:bg-red-50"
                              data-testid="remove-employee-password-btn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-xs text-[#888]">
                          {hasPassword 
                            ? "Employee must enter this password when logging in. Leave blank to keep current password."
                            : "Setting a password will require the employee to enter it when logging in."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Code info banner - Only shown for admin role */}
              {editEmployeeData.role === 'admin' && (
                <div className="form-group">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Admins use access codes</p>
                        <p className="text-xs text-amber-600 mt-1">
                          Admin users log in using their 4-digit access code instead of a password for enhanced security.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    setEditingEmployee(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEmployee}
                  className="btn-primary flex-1"
                  data-testid="save-employee-btn"
                >
                  {savingEmployee ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>

      {/* W-9 Viewer Modal */}
      <AnimatePresence>
        {editW9Viewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={() => {
              if (editW9Viewer.url) window.URL.revokeObjectURL(editW9Viewer.url);
              setEditW9Viewer(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
                <div>
                  <h3 className="font-semibold text-white">W-9 Document</h3>
                  <p className="text-sm text-gray-300">{editW9Viewer.filename}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (editW9Viewer.url) window.URL.revokeObjectURL(editW9Viewer.url);
                    setEditW9Viewer(null);
                  }}
                  className="text-white hover:bg-white/20 text-xl font-bold w-8 h-8 p-0"
                >
                  ✕
                </Button>
              </div>

              {/* Document Viewer */}
              <div className="flex-1 overflow-auto p-4 bg-gray-100">
                {editW9Viewer.contentType?.includes('pdf') ? (
                  <iframe
                    src={editW9Viewer.url}
                    className="w-full h-full min-h-[500px] rounded-lg border border-gray-200"
                    title="W-9 Document"
                  />
                ) : editW9Viewer.contentType?.includes('image') ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={editW9Viewer.url}
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
              <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-white">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (editW9Viewer.url) window.URL.revokeObjectURL(editW9Viewer.url);
                    setEditW9Viewer(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (!window.confirm("Are you sure you want to download this W-9?")) return;
                    try {
                      const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/${editW9Viewer.docId}`, {
                        ...getAuthHeader(),
                        responseType: 'blob'
                      });
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', editW9Viewer.filename || 'w9.pdf');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                      toast.success("W-9 downloaded!");
                    } catch (error) {
                      toast.error("Failed to download W-9");
                    }
                  }}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* W-9 Management Modal */}
      <AnimatePresence>
        {showEditW9Modal && editingEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[55] p-4"
            onClick={() => setShowEditW9Modal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
              data-testid="edit-w9-modal"
            >
              {/* Header */}
              <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493]" />
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">W-9 Documents</h3>
                    <p className="text-sm text-white/60">{editingEmployee.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditW9Modal(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Download blank form */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Blank W-9 Form</p>
                    <p className="text-xs text-white/50">IRS Form W-9</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadBlankW9}
                    className="text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent text-xs px-3"
                  >
                    Get Form
                  </Button>
                </div>

                {/* W-9 Documents List */}
                {loadingEditW9s ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00D4FF] mx-auto"></div>
                    <p className="text-xs text-white/50 mt-2">Loading...</p>
                  </div>
                ) : editEmployeeW9s.length > 0 ? (
                  <div className="space-y-3">
                    {editEmployeeW9s.filter(doc => doc && doc.id).map((doc, index) => (
                      <div 
                        key={doc.id} 
                        className={`p-4 rounded-xl border ${
                          doc.status === 'approved' 
                            ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30' 
                            : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className={`w-4 h-4 ${doc.status === 'approved' ? 'text-[#00D4FF]' : 'text-[#8B5CF6]'}`} />
                          <span className="font-medium text-white text-sm truncate flex-1">{doc.filename || `W-9 #${index + 1}`}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            doc.status === 'approved' ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                          }`}>
                            {doc.status === 'approved' ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        {doc.uploaded_at && new Date(doc.uploaded_at).toString() !== 'Invalid Date' && (
                          <p className="text-xs text-white/50 mb-2">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                        )}
                        {doc.notes && (
                          <p className="text-xs text-white/40 italic mb-3">"{doc.notes}"</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}`, {
                                  ...getAuthHeader(),
                                  responseType: 'blob'
                                });
                                const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                                const url = window.URL.createObjectURL(blob);
                                setEditW9Viewer({ url, filename: doc.filename || 'w9.pdf', contentType: response.headers['content-type'] || 'application/pdf', docId: doc.id });
                              } catch (error) {
                                toast.error("Failed to view W-9");
                              }
                            }}
                            className="flex-1 text-white/80 border-white/20 hover:bg-white/10 bg-transparent text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await axios.get(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}`, {
                                  ...getAuthHeader(),
                                  responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = doc.filename || `w9_${editingEmployee.name}.pdf`;
                                link.click();
                                window.URL.revokeObjectURL(url);
                                toast.success("Downloaded!");
                              } catch (error) {
                                toast.error("Failed to download");
                              }
                            }}
                            className="flex-1 text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                          {doc.status !== 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await axios.post(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}/approve`, {}, getAuthHeader());
                                  toast.success("Approved!");
                                  loadW9Documents();
                                  fetchData();
                                } catch (error) {
                                  toast.error("Failed to approve");
                                }
                              }}
                              className="flex-1 text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 bg-transparent text-xs"
                            >
                              <CheckCheck className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!window.confirm("Delete this W-9?")) return;
                              try {
                                await axios.delete(`${API}/admin/employees/${editingEmployee.id}/w9/${doc.id}`, getAuthHeader());
                                toast.success("Deleted");
                                setEditEmployeeW9s(prev => prev.filter(d => d.id !== doc.id));
                                fetchData();
                              } catch (error) {
                                toast.error("Failed to delete");
                              }
                            }}
                            className="text-[#FF1493] border-[#FF1493]/30 hover:bg-[#FF1493]/10 bg-transparent text-xs px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-white/20" />
                    <p className="text-sm text-white/60">No W-9 documents</p>
                  </div>
                )}

                {/* Upload W-9 */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#8B5CF6] to-[#FF1493] rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Upload W-9</p>
                    <p className="text-xs text-white/50">Add new document</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="edit-w9-modal-upload"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        await axios.post(`${API}/admin/employees/${editingEmployee.id}/w9`, formData, {
                          headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, 'Content-Type': 'multipart/form-data' }
                        });
                        toast.success("Uploaded!");
                        loadW9Documents();
                        fetchData();
                      } catch (error) {
                        toast.error("Failed to upload");
                      }
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-w9-modal-upload').click()}
                    className="text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 bg-transparent text-xs px-3"
                  >
                    Upload
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowEditW9Modal(false)}
                  className="text-white border-white/20 hover:bg-white/10 bg-transparent"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
