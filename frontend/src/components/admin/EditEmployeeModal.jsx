import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserCog, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditEmployeeModal({ isOpen, onClose, employee, defaultRate, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    hourly_rate: "",
    admin_code: ""
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        role: employee.role || "employee",
        hourly_rate: employee.hourly_rate !== null && employee.hourly_rate !== undefined 
          ? employee.hourly_rate.toString() 
          : "",
        admin_code: employee.admin_code || ""
      });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updateData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      hourly_rate: formData.hourly_rate === "" ? null : parseFloat(formData.hourly_rate)
    };
    // Include admin_code if role is admin
    if (formData.role === "admin") {
      updateData.admin_code = formData.admin_code;
    }
    await onSave(employee.id, updateData);
  };

  if (!isOpen || !employee) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          data-testid="edit-employee-modal"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins text-xl font-semibold text-[#1A1A2E]">Edit Employee</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="close-edit-employee-modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Full Name *</Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-2 border-gray-200 focus:border-[#8B5CF6]"
                  data-testid="edit-employee-name"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Email Address *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="border-2 border-gray-200 focus:border-[#8B5CF6]"
                  data-testid="edit-employee-email"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value, admin_code: value === "employee" ? "" : formData.admin_code })}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-[#8B5CF6]" data-testid="edit-employee-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Code field - only shown when role is admin */}
              {formData.role === "admin" && (
                <div>
                  <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#8B5CF6]" />
                    Admin Access Code *
                  </Label>
                  <Input
                    type="text"
                    value={formData.admin_code}
                    onChange={(e) => {
                      // Only allow digits, max 4 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData({ ...formData, admin_code: value });
                    }}
                    placeholder="4-digit code (e.g., 1234)"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    className="border-2 border-gray-200 focus:border-[#8B5CF6] font-mono text-lg tracking-widest"
                    data-testid="edit-employee-admin-code"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This code will be used for admin login. Must be exactly 4 digits.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Hourly Rate
                  <span className="text-gray-400 font-normal ml-2">
                    (Default: ${defaultRate?.toFixed(2) || '15.00'})
                  </span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    placeholder={`${defaultRate?.toFixed(2) || '15.00'} (default)`}
                    className="border-2 border-gray-200 focus:border-[#8B5CF6] pl-7"
                    data-testid="edit-employee-rate"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default rate
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || (formData.role === "admin" && formData.admin_code.length !== 4)}
                className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-semibold py-3"
                data-testid="submit-edit-employee"
              >
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <UserCog className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
