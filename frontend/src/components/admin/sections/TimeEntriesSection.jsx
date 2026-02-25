import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  User,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimeEntriesSection({
  timeEntries,
  formatDateTime,
  onAddEntry,
  onEditEntry,
  onDeleteEntry
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
      if (sortConfig.key === 'clock_in' || sortConfig.key === 'clock_out') {
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

  return (
    <div className="dashboard-card" data-testid="time-entries-section">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="time-entries-section-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Recent Time Entries</h2>
            <p className="text-sm text-[#888]">{timeEntries.length} entries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={(e) => { e.stopPropagation(); onAddEntry(); }}
            size="sm"
            className="btn-secondary flex items-center gap-2"
            data-testid="add-time-entry-btn"
          >
            <Clock className="w-4 h-4" />
            Add Entry
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
              {timeEntries.length === 0 ? (
                <p className="text-center text-[#888] py-8">No time entries yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table" data-testid="time-entries-table">
                    <thead>
                      <tr>
                        <SortableHeader sortKey="user_name">Employee</SortableHeader>
                        <SortableHeader sortKey="clock_in">Clock In</SortableHeader>
                        <SortableHeader sortKey="clock_out">Clock Out</SortableHeader>
                        <SortableHeader sortKey="total_hours">Hours</SortableHeader>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedData(timeEntries).slice(0, 20).map((entry) => (
                        <tr key={entry.id} data-testid={`time-entry-row-${entry.id}`}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-[#D48C9E]" />
                              </div>
                              {entry.user_name}
                            </div>
                          </td>
                          <td>{formatDateTime(entry.clock_in)}</td>
                          <td>{entry.clock_out ? formatDateTime(entry.clock_out) : '-'}</td>
                          <td>
                            {entry.total_hours ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F8C8DC]/20 rounded-full text-sm font-medium text-[#5D4037]">
                                <Clock className="w-3 h-3" />
                                {entry.total_hours} hrs
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#8BA88E]/20 rounded-full text-sm font-medium text-[#5A8A5E]">
                                Active
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditEntry(entry)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                data-testid={`edit-entry-${entry.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteEntry(entry.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-entry-${entry.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
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
