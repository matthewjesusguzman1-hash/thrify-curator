import { motion } from "framer-motion";
import { X } from "lucide-react";
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
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 overflow-hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0a0a0f] rounded-2xl w-full max-w-md h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              Viewing: {employee.name}'s Portal
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

        {/* Embedded Employee Dashboard */}
        <div className="flex-1 overflow-y-auto">
          <EmployeeDashboard 
            adminViewEmployee={employee} 
            isAdminView={true}
            initialData={initialData}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
