import { motion } from "framer-motion";
import { 
  X, Upload, FileText, Briefcase, UserPlus, UserMinus, 
  Eye, Download, CheckCircle, Trash2, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Add Employee Modal
export function AddEmployeeModal({
  show,
  onClose,
  newEmployee,
  setNewEmployee,
  newEmployeeW9File,
  setNewEmployeeW9File,
  selectedJobApp,
  setSelectedJobApp,
  formSubmissions,
  handleAddEmployee,
  handleDownloadBlankW9,
  addingEmployee,
  isOwner = false
}) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl overflow-hidden w-full max-w-md shadow-2xl my-4"
        onClick={(e) => e.stopPropagation()}
        data-testid="add-employee-modal"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#E91E8C]" />
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-playfair text-xl font-bold text-[#333]">Add New Employee</h2>
            <button
              onClick={() => {
                onClose();
                setSelectedJobApp("");
                setNewEmployeeW9File(null);
              }}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Import from Job Application */}
          {formSubmissions?.jobApplications && formSubmissions.jobApplications.length > 0 && (
            <div className="form-group mb-4">
              <Label className="form-label flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#C5A065]" />
                Import from Job Application
              </Label>
              <Select 
                value={selectedJobApp} 
                onValueChange={(value) => {
                  setSelectedJobApp(value);
                  if (value && value !== "none") {
                    const app = formSubmissions.jobApplications.find(a => a.id === value);
                    if (app) {
                      setNewEmployee({
                        ...newEmployee,
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
              <p className="text-xs text-[#888] mt-1">Pre-fill employee info from a submitted job application</p>
            </div>
          )}

          <form onSubmit={handleAddEmployee}>
            <div className="form-group">
              <Label className="form-label">Full Name *</Label>
              <Input
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                required
                placeholder="Employee name"
                className="form-input"
                data-testid="new-employee-name"
              />
            </div>

            <div className="form-group">
              <Label className="form-label">Email *</Label>
              <Input
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                required
                placeholder="employee@email.com"
                className="form-input"
                data-testid="new-employee-email"
              />
              <p className="text-xs text-[#888] mt-1">This email will be used for login</p>
            </div>

            <div className="form-group">
              <Label className="form-label">Phone Number</Label>
              <Input
                type="tel"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="form-input"
                data-testid="new-employee-phone"
              />
            </div>

            {/* Role Selection */}
            <div className="form-group">
              <Label className="form-label">Role *</Label>
              <Select
                value={newEmployee.role || "employee"}
                onValueChange={(value) => setNewEmployee({ 
                  ...newEmployee, 
                  role: value,
                  admin_code: value === "employee" ? "" : newEmployee.admin_code 
                })}
              >
                <SelectTrigger className="form-input" data-testid="new-employee-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[#888] mt-1">Admin role gives full dashboard access</p>
            </div>

            {/* Admin Code - only shown when role is admin */}
            {newEmployee.role === "admin" && (
              <div className="form-group">
                <Label className="form-label flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#8B5CF6]" />
                  Admin Access Code *
                </Label>
                <Input
                  type="text"
                  value={newEmployee.admin_code || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewEmployee({ ...newEmployee, admin_code: value });
                  }}
                  placeholder="4-digit code (e.g., 1234)"
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  className="form-input font-mono text-lg tracking-widest"
                  data-testid="new-employee-admin-code"
                />
                <p className="text-xs text-[#888] mt-1">This 4-digit code will be used for admin login</p>
              </div>
            )}

            {/* W-9 Form Section */}
            <div className="form-group">
              <Label className="form-label">W-9 Tax Form</Label>
              <div className="space-y-2">
                {/* Download blank form */}
                <div className="flex items-center gap-3 p-3 bg-[#F9F6F7] rounded-xl">
                  <div className="w-10 h-10 bg-[#C5A065]/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#C5A065]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#333]">Blank W-9 Form</p>
                    <p className="text-xs text-[#888]">Download for employee to complete</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to download the IRS W-9 form?")) {
                        handleDownloadBlankW9();
                      }
                    }}
                    className="text-[#C5A065] border-[#C5A065] hover:bg-[#C5A065]/10"
                    data-testid="download-w9-form-btn"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Get W-9 Form
                  </Button>
                </div>
                
                {/* Upload completed W-9 */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#333]">Attach Completed W-9</p>
                    {newEmployeeW9File ? (
                      <p className="text-xs text-green-600">{newEmployeeW9File.name}</p>
                    ) : (
                      <p className="text-xs text-[#888]">Upload employee's filled W-9</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      id="new-employee-w9-upload"
                      onChange={(e) => setNewEmployeeW9File(e.target.files[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('new-employee-w9-upload').click()}
                      className="text-green-600 border-green-400 hover:bg-green-50"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {newEmployeeW9File ? 'Change' : 'Upload'}
                    </Button>
                    {newEmployeeW9File && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewEmployeeW9File(null)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  setSelectedJobApp("");
                  setNewEmployeeW9File(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addingEmployee || (newEmployee.role === "admin" && (!newEmployee.admin_code || newEmployee.admin_code.length !== 4))}
                className="btn-primary flex-1"
                data-testid="submit-new-employee-btn"
              >
                {addingEmployee ? "Creating..." : `Create ${newEmployee.role === "admin" ? "Admin" : "Employee"}`}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Remove Employee Modal
export function RemoveEmployeeModal({
  show,
  onClose,
  employees,
  employeeToRemove,
  setEmployeeToRemove,
  handleRemoveEmployee,
  removingEmployee
}) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl overflow-hidden w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="remove-employee-modal"
      >
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <UserMinus className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="font-playfair text-xl font-bold text-[#333]">Remove Employee</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="form-group">
            <Label className="form-label">Select Employee to Remove</Label>
            <Select value={employeeToRemove} onValueChange={setEmployeeToRemove}>
              <SelectTrigger className="form-input">
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {employeeToRemove && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> This action cannot be undone. All employee data including time entries and payroll records will be permanently deleted.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveEmployee}
              disabled={!employeeToRemove || removingEmployee}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-remove-employee-btn"
            >
              {removingEmployee ? "Removing..." : "Remove Employee"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
