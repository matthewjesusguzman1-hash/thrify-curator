import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddEmployeeModal({ isOpen, onClose, onAdd, loading }) {
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "",
    role: "employee",
    admin_code: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      name: formData.name,
      email: formData.email,
      role: formData.role
    };
    // Include admin_code if role is admin
    if (formData.role === "admin") {
      submitData.admin_code = formData.admin_code;
    }
    await onAdd(submitData);
    setFormData({ name: "", email: "", role: "employee", admin_code: "" });
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", role: "employee", admin_code: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          data-testid="add-employee-modal"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins text-xl font-semibold text-[#1A1A2E]">Add New Employee</h3>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="close-add-employee-modal"
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
                  placeholder="Employee name"
                  className="border-2 border-gray-200 focus:border-[#00D4FF]"
                  data-testid="input-employee-name"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Email Address *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="employee@email.com"
                  className="border-2 border-gray-200 focus:border-[#00D4FF]"
                  data-testid="input-employee-email"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value, admin_code: value === "employee" ? "" : formData.admin_code })}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-[#00D4FF]" data-testid="input-employee-role">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Admin role gives full dashboard access</p>
              </div>

              {/* Admin Code - only shown when role is admin */}
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
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData({ ...formData, admin_code: value });
                    }}
                    placeholder="4-digit code (e.g., 1234)"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    className="border-2 border-gray-200 focus:border-[#8B5CF6] font-mono text-lg tracking-widest"
                    data-testid="input-employee-admin-code"
                  />
                  <p className="text-xs text-gray-500 mt-1">This 4-digit code will be used for admin login</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (formData.role === "admin" && formData.admin_code.length !== 4)}
                className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white font-semibold py-3"
                data-testid="submit-add-employee"
              >
                {loading ? (
                  "Adding..."
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add {formData.role === "admin" ? "Admin" : "Employee"}
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
