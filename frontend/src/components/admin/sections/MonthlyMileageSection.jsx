import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyMileageSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [yearlyData, setYearlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [reminderStatus, setReminderStatus] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // Previous month (0-indexed, so current month - 1)
    total_miles: "",
    notes: ""
  });

  // Fetch yearly summary
  const fetchYearlySummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/mileage/yearly-summary`, {
        params: { year: selectedYear },
        ...getAuthHeader()
      });
      setYearlyData(response.data);
    } catch (error) {
      console.error("Failed to fetch yearly summary:", error);
    }
  }, [getAuthHeader, selectedYear]);

  // Fetch reminder status
  const fetchReminderStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/mileage/reminder-status`, getAuthHeader());
      setReminderStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch reminder status:", error);
    }
  }, [getAuthHeader]);

  // Load data on mount
  useEffect(() => {
    if (isExpanded) {
      fetchYearlySummary();
      fetchReminderStatus();
    }
  }, [isExpanded, fetchYearlySummary, fetchReminderStatus]);

  // Save entry
  const handleSaveEntry = async () => {
    if (!formData.total_miles || parseFloat(formData.total_miles) < 0) {
      toast.error("Please enter a valid mileage amount");
      return;
    }

    try {
      await axios.post(
        `${API}/admin/mileage/monthly-entry`,
        {
          year: formData.year,
          month: formData.month + 1, // API expects 1-12
          total_miles: parseFloat(formData.total_miles),
          notes: formData.notes || null
        },
        getAuthHeader()
      );
      
      toast.success(`${MONTHS[formData.month]} ${formData.year} mileage saved!`);
      setShowAddModal(false);
      setEditingEntry(null);
      setFormData({
        year: new Date().getFullYear(),
        month: new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1,
        total_miles: "",
        notes: ""
      });
      fetchYearlySummary();
      fetchReminderStatus();
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast.error(error.response?.data?.detail || "Failed to save entry");
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    
    try {
      await axios.delete(`${API}/admin/mileage/monthly-entry/${entryId}`, getAuthHeader());
      toast.success("Entry deleted");
      fetchYearlySummary();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  // Dismiss reminder
  const handleDismissReminder = async () => {
    if (!reminderStatus) return;
    
    try {
      await axios.post(
        `${API}/admin/mileage/dismiss-reminder`,
        {
          year: reminderStatus.year,
          month: reminderStatus.month
        },
        getAuthHeader()
      );
      toast.success(`Reminder dismissed for ${reminderStatus.month_name}`);
      fetchReminderStatus();
    } catch (error) {
      console.error("Failed to dismiss reminder:", error);
      toast.error("Failed to dismiss reminder");
    }
  };

  // Open add modal for a specific month
  const openAddForMonth = (year, month) => {
    setFormData({
      year,
      month: month - 1, // Convert to 0-indexed
      total_miles: "",
      notes: ""
    });
    setEditingEntry(null);
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (entry) => {
    setFormData({
      year: entry.year,
      month: entry.month - 1, // Convert to 0-indexed
      total_miles: entry.total_miles.toString(),
      notes: entry.notes || ""
    });
    setEditingEntry(entry);
    setShowAddModal(true);
  };

  // Check if reminder should be shown
  const showReminder = reminderStatus && !reminderStatus.is_entered && !reminderStatus.is_dismissed;

  return (
    <>
      {/* Main Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div
          className="p-4 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333]">Mileage Log</h3>
              <p className="text-sm text-[#888]">Monthly business mileage for tax deductions</p>
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

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 space-y-4">
                {/* Year-to-Date Summary Card */}
                {yearlyData && (
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white" data-testid="mileage-ytd-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{selectedYear} Mileage Summary</h3>
                        <p className="text-sm opacity-80">Year-to-Date for Tax Purposes</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{yearlyData.months_entered || 0}</p>
                        <p className="text-sm opacity-80">Months Logged</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{yearlyData.total_miles.toLocaleString()}</p>
                        <p className="text-sm opacity-80">Total Miles</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">${yearlyData.total_tax_deduction.toLocaleString()}</p>
                        <p className="text-sm opacity-80">Est. Tax Deduction</p>
                      </div>
                    </div>
                    <p className="text-xs opacity-70 mt-3 text-center">
                      Using IRS rate: ${yearlyData.irs_rate}/mile
                    </p>
                  </div>
                )}

                {/* Year Selector and Add Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">Year:</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      setFormData({
                        year: selectedYear,
                        month: new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1,
                        total_miles: "",
                        notes: ""
                      });
                      setEditingEntry(null);
                      setShowAddModal(true);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </div>

                {/* Monthly Entries Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {MONTHS.map((monthName, index) => {
                    const monthNum = index + 1;
                    const entry = yearlyData?.monthly_entries.find(e => e.month === monthNum);
                    const isFuture = selectedYear === new Date().getFullYear() && monthNum > new Date().getMonth() + 1;
                    const isMissing = yearlyData?.months_missing.includes(monthNum);
                    
                    return (
                      <div
                        key={monthName}
                        className={`rounded-xl p-3 border-2 transition-all ${
                          entry 
                            ? "bg-emerald-50 border-emerald-200" 
                            : isFuture
                              ? "bg-gray-50 border-gray-200 opacity-50"
                              : isMissing
                                ? "bg-amber-50 border-amber-200 border-dashed"
                                : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500">{monthName}</span>
                          {entry && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(entry)}
                                className="p-1 hover:bg-emerald-100 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                        {entry ? (
                          <>
                            <p className="text-lg font-bold text-emerald-700">
                              {entry.total_miles.toLocaleString()} mi
                            </p>
                            <p className="text-xs text-emerald-600">
                              ${entry.tax_deduction.toFixed(2)} deduction
                            </p>
                          </>
                        ) : isFuture ? (
                          <p className="text-sm text-gray-400">Future</p>
                        ) : (
                          <button
                            onClick={() => openAddForMonth(selectedYear, monthNum)}
                            className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Info Note */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    Tax deductions are calculated using the IRS standard mileage rate. 
                    Keep records of your business purpose for each month.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {editingEntry ? "Edit" : "Add"} Monthly Mileage
                      </h3>
                      <p className="text-white/80 text-sm">
                        {MONTHS[formData.month]} {formData.year}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Month/Year Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Month</Label>
                    <Select
                      value={formData.month.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, month: parseInt(value) }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, idx) => (
                          <SelectItem key={month} value={idx.toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Year</Label>
                    <Select
                      value={formData.year.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Miles Input */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Total Miles</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      placeholder="Enter total miles"
                      value={formData.total_miles}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_miles: e.target.value }))}
                      className="pr-12"
                      min="0"
                      step="0.1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      miles
                    </span>
                  </div>
                  {formData.total_miles && parseFloat(formData.total_miles) > 0 && yearlyData && (
                    <p className="text-sm text-emerald-600 mt-1">
                      ≈ ${(parseFloat(formData.total_miles) * yearlyData.irs_rate).toFixed(2)} tax deduction
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Notes (optional)</Label>
                  <Input
                    placeholder="e.g., Thrift store runs, deliveries..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEntry}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Entry
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
