import { useState, useMemo } from "react";
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
  FileText,
  X,
  Calendar,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHoursToHMS } from "@/lib/utils";

export default function HoursByEmployeeSection({
  timeEntries,
  employees,
  formatDateTime,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  payPeriodStart
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterType, setFilterType] = useState("period"); // period, month, year
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  
  // Sorting state for main table
  const [sortConfig, setSortConfig] = useState({ key: 'total_hours', direction: 'desc' });

  // Group entries by employee and calculate totals
  const employeeStats = useMemo(() => {
    const stats = {};
    
    timeEntries.forEach(entry => {
      if (!stats[entry.user_id]) {
        stats[entry.user_id] = {
          user_id: entry.user_id,
          user_name: entry.user_name,
          total_hours: 0,
          shift_count: 0,
          entries: []
        };
      }
      stats[entry.user_id].total_hours += entry.total_hours || 0;
      stats[entry.user_id].shift_count += 1;
      stats[entry.user_id].entries.push(entry);
    });
    
    return Object.values(stats).map(s => ({
      ...s,
      total_hours: Math.round(s.total_hours * 100) / 100
    }));
  }, [timeEntries]);

  // Get first Monday of a given year
  const getFirstMondayOfYear = (year) => {
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToAdd = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    return new Date(year, 0, 1 + daysToAdd);
  };

  // Get biweekly period dates - always based on first Monday of the year
  const getBiweeklyPeriod = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Use first Monday of current year as the anchor
    const firstMonday = getFirstMondayOfYear(today.getFullYear());
    
    const daysSinceStart = Math.floor((today - firstMonday) / (1000 * 60 * 60 * 24));
    const periodNumber = Math.floor(daysSinceStart / 14);
    const periodStart = new Date(firstMonday);
    periodStart.setDate(periodStart.getDate() + (periodNumber * 14));
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
    return { start: periodStart, end: periodEnd };
  };

  // Filter entries for selected employee
  const filteredEntries = useMemo(() => {
    if (!selectedEmployee) return [];
    
    const employeeEntries = timeEntries.filter(e => e.user_id === selectedEmployee.user_id);
    
    return employeeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in);
      
      if (filterType === "period") {
        const { start, end } = getBiweeklyPeriod();
        return entryDate >= start && entryDate <= end;
      } else if (filterType === "month") {
        return entryDate.getMonth() === selectedMonth && 
               entryDate.getFullYear() === selectedYear;
      } else if (filterType === "year") {
        return entryDate.getFullYear() === selectedYear;
      }
      return true;
    }).sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in));
  }, [selectedEmployee, timeEntries, filterType, selectedMonth, selectedYear]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const total = filteredEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    return {
      hours: Math.round(total * 100) / 100,
      shifts: filteredEntries.length
    };
  }, [filteredEntries]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
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

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const getFilterLabel = () => {
    if (filterType === "period") {
      const { start, end } = getBiweeklyPeriod();
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (filterType === "month") {
      return `${months[selectedMonth]} ${selectedYear}`;
    } else {
      return `${selectedYear}`;
    }
  };

  return (
    <>
      <div className="dashboard-card" data-testid="hours-by-employee-section">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="hours-by-employee-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-playfair text-xl font-semibold text-[#333]">Hours by Employee</h2>
              <p className="text-sm text-[#888]">{employeeStats.length} employees</p>
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
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[#eee]">
                {employeeStats.length === 0 ? (
                  <p className="text-center text-[#888] py-8">No time entries yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table" data-testid="employees-hours-table">
                      <thead>
                        <tr>
                          <SortableHeader sortKey="user_name">Employee</SortableHeader>
                          <SortableHeader sortKey="total_hours">Total Hours</SortableHeader>
                          <SortableHeader sortKey="shift_count">Shifts</SortableHeader>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedData(employeeStats).map((emp) => (
                          <tr 
                            key={emp.user_id} 
                            className="hover:bg-[#F9F6F7] transition-colors"
                            data-testid={`employee-row-${emp.user_id}`}
                          >
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-medium">{emp.user_name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#8B5CF6]/10 rounded-full text-sm font-semibold text-[#6D28D9]">
                                <Clock className="w-3 h-3" />
                                {formatHoursToHMS(emp.total_hours)}
                              </span>
                            </td>
                            <td>
                              <span className="text-[#666]">{emp.shift_count} shifts</span>
                            </td>
                            <td>
                              <div className="flex items-center justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEmployee(emp)}
                                  className="text-[#8B5CF6] hover:text-[#6D28D9] hover:bg-[#8B5CF6]/10"
                                >
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

      {/* Employee Shifts Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setSelectedEmployee(null); setExpandedNoteId(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              data-testid="employee-shifts-modal"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-playfair text-xl font-bold">{selectedEmployee.user_name}</h2>
                      <p className="text-sm opacity-80">{getFilterLabel()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedEmployee(null); setExpandedNoteId(null); }}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{filteredTotals.hours}</p>
                    <p className="text-sm opacity-80">Hours</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{filteredTotals.shifts}</p>
                    <p className="text-sm opacity-80">Shifts</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#888]" />
                    <span className="text-sm font-medium text-[#666]">Filter by:</span>
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="period">Pay Period</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>

                  {filterType === "month" && (
                    <>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-[130px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-[100px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {filterType === "year" && (
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-[100px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Shifts List */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-[#888]">No shifts found for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="p-4 rounded-xl border min-h-[120px] bg-white border-gray-200"
                        data-testid={`shift-entry-${entry.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-[#8B5CF6]/10 text-[#6D28D9]">
                                <Clock className="w-3 h-3" />
                                {entry.total_hours || 0} hrs
                                {entry.adjusted_by_admin && (
                                  <span className="text-[#D97706] ml-0.5" title="Hours adjusted by admin">*</span>
                                )}
                              </span>
                              {!entry.clock_out && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-[#666] space-y-1">
                              <p><span className="font-medium">In:</span> {formatDateTime(entry.clock_in)}</p>
                              <p><span className="font-medium">Out:</span> {entry.clock_out ? formatDateTime(entry.clock_out) : '-'}</p>
                            </div>

                            {/* Admin Note - Collapsed by default, shows preview */}
                            {entry.admin_note && (
                              <div 
                                className="mt-3 p-2 bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg cursor-pointer hover:bg-[#FEF3C7]/80 transition-all"
                                onClick={() => setExpandedNoteId(expandedNoteId === entry.id ? null : entry.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-[#D97706] flex-shrink-0" />
                                  <span className="text-xs font-medium text-[#92400E]">Admin Note</span>
                                  <ChevronDown className={`w-4 h-4 text-[#D97706] ml-auto transition-transform ${
                                    expandedNoteId === entry.id ? 'rotate-180' : ''
                                  }`} />
                                </div>
                                {expandedNoteId === entry.id && (
                                  <p className="text-sm text-[#78350F] mt-2 pl-6">
                                    {entry.admin_note}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); onEditEntry(entry); }}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              data-testid={`edit-shift-${entry.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              data-testid={`delete-shift-${entry.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedEmployee(null); setExpandedNoteId(null); }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
