import { motion } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import EmployeeDashboard from "@/pages/EmployeeDashboard";

export default function EmployeePortalViewModal({
  isOpen,
  onClose,
  employee,
  portalData,
  clockStatus
}) {
  if (!isOpen || !employee) return null;

  // Prepare initial data from the admin-fetched portal data
  const initialData = portalData ? {
    entries: portalData.entries || [],
    summary: portalData.summary || {},
    w9Status: portalData.w9Status || null,
    w8benStatus: portalData.w8benStatus || null,
    my1099s: portalData.my1099s || { documents: [], count: 0 },
    clockStatus: clockStatus || { is_clocked_in: false }
  } : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#0a0a0f] z-50 overflow-hidden"
    >
      {/* Full-page Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center gap-2"
            data-testid="back-to-admin"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Admin</span>
          </button>
          <div className="h-6 w-px bg-white/20" />
          <span className="text-white font-medium">
            {employee.name}'s Portal
          </span>
          <span className="bg-[#00D4FF]/20 text-[#00D4FF] px-2 py-0.5 rounded-full text-xs">
            Admin View
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          data-testid="close-portal-view"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Full Employee Dashboard */}
      <div className="h-[calc(100vh-60px)] overflow-y-auto">
        <EmployeeDashboard 
          adminViewEmployee={employee} 
          isAdminView={true}
          initialData={initialData}
        />
      </div>
    </motion.div>
  );
}
