import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  Key, 
  Lock, 
  Unlock,
  User, 
  Users, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PasswordManagementSection({ token }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingConsignors, setLoadingConsignors] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch employee passwords
  const fetchEmployeePasswords = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const res = await axios.get(`${API}/admin/employees/passwords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employee passwords:", error);
      toast.error("Failed to load employee password status");
    } finally {
      setLoadingEmployees(false);
    }
  }, [token]);

  // Fetch consignor passwords
  const fetchConsignorPasswords = useCallback(async () => {
    try {
      setLoadingConsignors(true);
      const res = await axios.get(`${API}/forms/admin/consignment-passwords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map the response to match the expected format
      const mapped = res.data.map(c => ({
        email: c.email,
        name: c.full_name,
        has_password: c.has_password,
        password_set_at: c.password_set_at
      }));
      setConsignors(mapped);
    } catch (error) {
      console.error("Error fetching consignor passwords:", error);
      toast.error("Failed to load consignor password status");
    } finally {
      setLoadingConsignors(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEmployeePasswords();
    fetchConsignorPasswords();
  }, [fetchEmployeePasswords, fetchConsignorPasswords]);

  // Set employee password
  const handleSetEmployeePassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    try {
      setSettingPassword(true);
      await axios.post(
        `${API}/admin/employees/${selectedUser.id}/set-password?new_password=${encodeURIComponent(newPassword)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Password set for ${selectedUser.name}`);
      setSelectedUser(null);
      setNewPassword("");
      setShowPassword(false);
      fetchEmployeePasswords();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  };

  // Set consignor password
  const handleSetConsignorPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    try {
      setSettingPassword(true);
      await axios.post(
        `${API}/forms/admin/consignment-password/reset`,
        { email: selectedUser.email, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      toast.success(`Password set for ${selectedUser.name || selectedUser.email}`);
      setSelectedUser(null);
      setNewPassword("");
      setShowPassword(false);
      fetchConsignorPasswords();
    } catch (error) {
      console.error("Error setting consignor password:", error);
      toast.error(error.response?.data?.detail || "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  };

  // Remove employee password
  const handleRemoveEmployeePassword = async (employee) => {
    if (!window.confirm(`Remove password for ${employee.name}? They will need to set a new password.`)) return;

    try {
      await axios.delete(`${API}/admin/employees/${employee.id}/password`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Password removed for ${employee.name}`);
      fetchEmployeePasswords();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove password");
    }
  };

  // Remove consignor password
  const handleRemoveConsignorPassword = async (consignor) => {
    if (!window.confirm(`Remove password for ${consignor.name || consignor.email}? They will need to set a new password.`)) return;

    try {
      await axios.delete(`${API}/forms/admin/consignment-password/${encodeURIComponent(consignor.email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Password removed for ${consignor.name || consignor.email}`);
      fetchConsignorPasswords();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove password");
    }
  };

  // Lock/Unlock account
  const handleToggleLock = async (userType, email, name, isCurrentlyLocked) => {
    const action = isCurrentlyLocked ? "unlock" : "lock";
    if (!window.confirm(`Are you sure you want to ${action} the account for ${name || email}?`)) return;

    try {
      await axios.post(`${API}/auth/admin/lock-account`, {
        user_type: userType,
        email: email,
        lock: !isCurrentlyLocked
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Account ${action}ed successfully`);
      // Refresh the appropriate list
      if (userType === 'employee') {
        fetchEmployeePasswords();
      } else {
        fetchConsignorPasswords();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} account`);
    }
  };

  // Filter users based on search - exclude business owners who use access codes
  const filteredEmployees = employees.filter(e => 
    !e.uses_admin_code && (
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredConsignors = consignors.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-card" data-testid="password-management-section">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="password-management-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Password Management</h2>
            <p className="text-sm text-[#888]">Manage passwords for employees and consignment clients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#888]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#888]" />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-6 space-y-6">
              {/* Tabs */}
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "employees" ? "default" : "ghost"}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setActiveTab("employees"); }}
                  className={activeTab === "employees" 
                    ? "bg-[#00D4FF] text-black" 
                    : "text-[#666] hover:text-[#333] hover:bg-gray-100"
                  }
                  data-testid="tab-employees"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Employees
                </Button>
                <Button
                  variant={activeTab === "consignors" ? "default" : "ghost"}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setActiveTab("consignors"); }}
                  className={activeTab === "consignors" 
                    ? "bg-[#FF1493] text-white" 
                    : "text-[#666] hover:text-[#333] hover:bg-gray-100"
                  }
                  data-testid="tab-consignors"
                >
                  <User className="w-4 h-4 mr-1" />
                  Consignors
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="pl-10"
                  data-testid="password-search"
                />
              </div>

              {/* Employee Tab */}
              <AnimatePresence mode="wait">
                {activeTab === "employees" && (
                  <motion.div
                    key="employees"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Employee List */}
                    {loadingEmployees ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="w-6 h-6 text-[#00D4FF] animate-spin" />
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="text-center py-8 text-[#888]">
                        No employees found
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full" data-testid="employees-password-table">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Status</th>
                              <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Name</th>
                              <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Email</th>
                      <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Password</th>
                      <th className="text-right py-3 px-4 text-[#666] font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr 
                        key={employee.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        data-testid={`employee-password-row-${employee.id}`}
                      >
                        <td className="py-3 px-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            employee.is_locked ? 'bg-red-100' : employee.has_password ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            {employee.is_locked 
                              ? <ShieldAlert className="w-4 h-4 text-red-600" />
                              : employee.has_password 
                              ? <CheckCircle className="w-4 h-4 text-green-600" />
                              : <XCircle className="w-4 h-4 text-yellow-500" />
                            }
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[#333] font-medium">{employee.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[#666] text-sm">{employee.email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              employee.has_password 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {employee.has_password ? "Password Set" : "No Password"}
                            </span>
                            {employee.is_locked && (
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser({ ...employee, type: 'employee' });
                                setNewPassword("");
                              }}
                              className="text-[#00D4FF] hover:text-[#00A8CC] hover:bg-[#00D4FF]/10"
                              data-testid={`set-password-btn-${employee.id}`}
                            >
                              <Lock className="w-4 h-4 mr-1" />
                              {employee.has_password ? "Reset" : "Set"}
                            </Button>
                            
                            {employee.has_password && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEmployeePassword(employee)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                data-testid={`remove-password-btn-${employee.id}`}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleLock('employee', employee.email, employee.name, employee.is_locked)}
                              className={employee.is_locked 
                                ? "text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200" 
                                : "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200"
                              }
                              data-testid={`lock-employee-btn-${employee.id}`}
                              title={employee.is_locked ? "Click to unlock account" : "Click to lock account"}
                            >
                              {employee.is_locked 
                                ? <><Lock className="w-4 h-4 mr-1" /> Locked</>
                                : <><Unlock className="w-4 h-4 mr-1" /> Unlocked</>
                              }
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Consignor Tab */}
        {activeTab === "consignors" && (
          <motion.div
            key="consignors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {loadingConsignors ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 text-[#FF1493] animate-spin" />
              </div>
            ) : filteredConsignors.length === 0 ? (
              <div className="text-center py-8 text-[#888]">
                No consignors found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="consignors-password-table">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Status</th>
                      <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Name</th>
                      <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Email</th>
                      <th className="text-left py-3 px-4 text-[#666] font-medium text-sm">Password</th>
                      <th className="text-right py-3 px-4 text-[#666] font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsignors.map((consignor, idx) => (
                      <tr 
                        key={consignor.email || idx}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        data-testid={`consignor-password-row-${idx}`}
                      >
                        <td className="py-3 px-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            consignor.is_locked ? 'bg-red-100' : consignor.has_password ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            {consignor.is_locked 
                              ? <ShieldAlert className="w-4 h-4 text-red-600" />
                              : consignor.has_password 
                              ? <CheckCircle className="w-4 h-4 text-green-600" />
                              : <XCircle className="w-4 h-4 text-yellow-500" />
                            }
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[#333] font-medium">{consignor.name || "Unknown"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[#666] text-sm">{consignor.email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              consignor.has_password 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {consignor.has_password ? "Password Set" : "No Password"}
                            </span>
                            {consignor.is_locked && (
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser({ ...consignor, type: 'consignor' });
                                setNewPassword("");
                              }}
                              className="text-[#FF1493] hover:text-[#E91E8C] hover:bg-[#FF1493]/10"
                              data-testid={`set-consignor-password-btn-${idx}`}
                            >
                              <Lock className="w-4 h-4 mr-1" />
                              {consignor.has_password ? "Reset" : "Set"}
                            </Button>
                            
                            {consignor.has_password && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveConsignorPassword(consignor)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                data-testid={`remove-consignor-password-btn-${idx}`}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleLock('consignor', consignor.email, consignor.name, consignor.is_locked)}
                              className={consignor.is_locked 
                                ? "text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200" 
                                : "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200"
                              }
                              data-testid={`lock-consignor-btn-${idx}`}
                              title={consignor.is_locked ? "Click to unlock account" : "Click to lock account"}
                            >
                              {consignor.is_locked 
                                ? <><Lock className="w-4 h-4 mr-1" /> Locked</>
                                : <><Unlock className="w-4 h-4 mr-1" /> Unlocked</>
                              }
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Change Process Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-[#333] flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-[#00D4FF]" />
                  How Password Changes Work
                </h4>
                <ul className="text-xs text-[#666] space-y-1 list-disc list-inside">
                  <li><strong>For Employees:</strong> Once a password is set, the employee must enter it on login. You can reset it here if they forget.</li>
                  <li><strong>For Consignors:</strong> Passwords protect their consignment portal access. They can change their own password from the portal after logging in.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Setting Modal - Using Portal for proper rendering */}
      {selectedUser && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          {/* Backdrop */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)'
            }}
            onClick={() => {
              setSelectedUser(null);
              setNewPassword("");
              setShowPassword(false);
            }}
          />
          {/* Modal Content */}
          <div
            style={{
              position: 'relative',
              backgroundColor: '#1A1A2E',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
            data-testid="set-password-modal"
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
              {selectedUser.has_password ? "Reset" : "Set"} Password
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              for {selectedUser.name || selectedUser.email}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 16px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    data-testid="new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  Minimum 4 characters
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setNewPassword("");
                    setShowPassword(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => selectedUser.type === 'employee' ? handleSetEmployeePassword() : handleSetConsignorPassword()}
                  disabled={newPassword.length < 4 || settingPassword}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: selectedUser.type === 'employee' ? '#00D4FF' : '#FF1493',
                    border: 'none',
                    borderRadius: '8px',
                    color: selectedUser.type === 'employee' ? 'black' : 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: newPassword.length < 4 || settingPassword ? 'not-allowed' : 'pointer',
                    opacity: newPassword.length < 4 || settingPassword ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  data-testid="confirm-password-btn"
                >
                  {settingPassword ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Lock size={16} />
                  )}
                  Set Password
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
