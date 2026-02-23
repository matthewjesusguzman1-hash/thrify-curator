import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddEmployeeModal({ isOpen, onClose, onAdd, loading }) {
  const [formData, setFormData] = useState({ name: "", email: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAdd(formData);
    setFormData({ name: "", email: "" });
  };

  if (!isOpen) return null;

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
          data-testid="add-employee-modal"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins text-xl font-semibold text-[#1A1A2E]">Add New Employee</h3>
              <button
                onClick={onClose}
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#7C3AED] text-white font-semibold py-3"
                data-testid="submit-add-employee"
              >
                {loading ? (
                  "Adding..."
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Employee
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
