import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HoursByEmployeeSection({
  employeeHours,
  onViewShifts
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sort function
  const getSortedData = (data) => {
    if (!sortConfig.key || !data) return data || [];
    
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle null/undefined
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
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

  return (
    <div className="dashboard-card" data-testid="hours-by-employee-section">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="hours-section-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#8BA88E] to-[#6B8E6B] rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-playfair text-xl font-semibold text-[#333]">Hours by Employee</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#888]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#888]" />
        )}
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
              {!employeeHours || employeeHours.length === 0 ? (
                <p className="text-center text-[#888] py-8">No employee data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table" data-testid="employee-hours-table">
                    <thead>
                      <tr>
                        <SortableHeader sortKey="name">Employee</SortableHeader>
                        <SortableHeader sortKey="hours">Total Hours</SortableHeader>
                        <SortableHeader sortKey="shifts">Shifts</SortableHeader>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedData(employeeHours).map((emp) => (
                        <tr key={emp.user_id} data-testid={`employee-row-${emp.user_id}`}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-[#D48C9E]" />
                              </div>
                              {emp.name}
                            </div>
                          </td>
                          <td className="font-medium">{emp.hours.toFixed(2)} hrs</td>
                          <td>{emp.shifts}</td>
                          <td>
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewShifts(emp)}
                                className="h-8 px-3 text-[#00D4FF] hover:text-[#00A8CC] hover:bg-[#00D4FF]/10 flex items-center gap-1"
                                data-testid={`view-shifts-${emp.user_id}`}
                              >
                                <Eye className="w-4 h-4" />
                                View Shifts
                              </Button>
                            </div>
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
