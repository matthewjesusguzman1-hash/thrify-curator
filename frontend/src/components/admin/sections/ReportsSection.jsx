import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Filter,
  FileSpreadsheet,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ReportsSection({ employees, payPeriodStart, getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState("period");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Get biweekly period dates
  const getBiweeklyPeriod = () => {
    const startDate = payPeriodStart ? new Date(payPeriodStart) : new Date('2026-01-06');
    const today = new Date();
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const periodNumber = Math.floor(daysSinceStart / 14);
    const periodStart = new Date(startDate);
    periodStart.setDate(periodStart.getDate() + (periodNumber * 14));
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
    return { start: periodStart, end: periodEnd };
  };

  // Calculate date range based on filter type
  const getDateRange = () => {
    if (filterType === "period") {
      const { start, end } = getBiweeklyPeriod();
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    } else if (filterType === "month") {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    } else if (filterType === "year") {
      return {
        start: `${selectedYear}-01-01`,
        end: `${selectedYear}-12-31`
      };
    } else {
      return {
        start: customStartDate,
        end: customEndDate
      };
    }
  };

  const getFilterLabel = () => {
    if (filterType === "period") {
      const { start, end } = getBiweeklyPeriod();
      return `Pay Period: ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (filterType === "month") {
      return `${months[selectedMonth]} ${selectedYear}`;
    } else if (filterType === "year") {
      return `Year ${selectedYear}`;
    } else {
      if (customStartDate && customEndDate) {
        return `${customStartDate} to ${customEndDate}`;
      }
      return "Custom Date Range";
    }
  };

  const handlePreview = async () => {
    const { start, end } = getDateRange();
    if (!start || !end) {
      toast.error("Please select a valid date range");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: start,
        end_date: end
      });
      if (selectedEmployee !== "all") {
        params.append("employee_id", selectedEmployee);
      }

      const response = await axios.get(
        `${API}/admin/reports/shifts?${params.toString()}`,
        getAuthHeader()
      );
      setPreviewData(response.data);
    } catch (error) {
      toast.error("Failed to load report preview");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    const { start, end } = getDateRange();
    if (!start || !end) {
      toast.error("Please select a valid date range");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: start,
        end_date: end
      });
      if (selectedEmployee !== "all") {
        params.append("employee_id", selectedEmployee);
      }

      const response = await axios.get(
        `${API}/admin/reports/shifts/${format}?${params.toString()}`,
        {
          ...getAuthHeader(),
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shift_report_${start}_to_${end}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Report downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="dashboard-card" data-testid="reports-section">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="reports-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Reports</h2>
            <p className="text-sm text-[#888]">Generate and download shift reports</p>
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
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Employee Filter */}
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">
                    <Users className="w-4 h-4 inline mr-1" />
                    Employee
                  </Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger data-testid="report-employee-select">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees?.filter(e => e.role !== 'admin').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter Type */}
                <div>
                  <Label className="text-sm font-medium text-[#666] mb-2 block">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Filter By
                  </Label>
                  <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPreviewData(null); }}>
                    <SelectTrigger data-testid="report-filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="period">Pay Period</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Month/Year selectors */}
                {filterType === "month" && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-[#666] mb-2 block">Month</Label>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#666] mb-2 block">Year</Label>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {filterType === "year" && (
                  <div>
                    <Label className="text-sm font-medium text-[#666] mb-2 block">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom date range */}
                {filterType === "custom" && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-[#666] mb-2 block">Start Date</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        data-testid="report-start-date"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#666] mb-2 block">End Date</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        data-testid="report-end-date"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Selected Range Display */}
              <div className="bg-[#F9F6F7] rounded-xl p-3 mb-4">
                <p className="text-sm text-[#666]">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  <span className="font-medium">{getFilterLabel()}</span>
                  {selectedEmployee !== "all" && (
                    <span className="ml-2">
                      • {employees?.find(e => e.id === selectedEmployee)?.name || "Selected Employee"}
                    </span>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Button
                  onClick={handlePreview}
                  disabled={loading || (filterType === "custom" && (!customStartDate || !customEndDate))}
                  className="bg-[#10B981] hover:bg-[#059669] text-white"
                  data-testid="preview-report-btn"
                >
                  {loading ? "Loading..." : "Preview Report"}
                </Button>
                <Button
                  onClick={() => handleDownload("csv")}
                  disabled={loading || (filterType === "custom" && (!customStartDate || !customEndDate))}
                  variant="outline"
                  className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                  data-testid="download-csv-btn"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
                <Button
                  onClick={() => handleDownload("pdf")}
                  disabled={loading || (filterType === "custom" && (!customStartDate || !customEndDate))}
                  variant="outline"
                  className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
                  data-testid="download-pdf-btn"
                >
                  <File className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Preview Data */}
              {previewData && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white p-4">
                    <h3 className="font-semibold text-lg mb-2">Report Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{previewData.total_entries}</p>
                        <p className="text-sm opacity-80">Total Shifts</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">
                          {previewData.summary?.reduce((sum, s) => sum + s.total_hours, 0).toFixed(1)}
                        </p>
                        <p className="text-sm opacity-80">Total Hours</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{previewData.summary?.length || 0}</p>
                        <p className="text-sm opacity-80">Employees</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">
                          ${previewData.summary?.reduce((sum, s) => sum + (s.total_hours * s.hourly_rate), 0).toFixed(2)}
                        </p>
                        <p className="text-sm opacity-80">Est. Total Pay</p>
                      </div>
                    </div>
                  </div>

                  {/* Employee Summary Table */}
                  {previewData.summary?.length > 0 && (
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-medium text-[#333] mb-3">By Employee</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left p-2">Employee</th>
                              <th className="text-center p-2">Hours</th>
                              <th className="text-center p-2">Shifts</th>
                              <th className="text-right p-2">Est. Pay</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.summary.map((s, idx) => (
                              <tr key={idx} className="border-t border-gray-100">
                                <td className="p-2 font-medium">{s.employee_name}</td>
                                <td className="p-2 text-center">{s.total_hours.toFixed(2)}</td>
                                <td className="p-2 text-center">{s.total_shifts}</td>
                                <td className="p-2 text-right">${(s.total_hours * s.hourly_rate).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Detailed Entries */}
                  <div className="p-4 max-h-[400px] overflow-y-auto">
                    <h4 className="font-medium text-[#333] mb-3">Shift Details ({previewData.entries?.length || 0} entries)</h4>
                    {previewData.entries?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left p-2">Employee</th>
                              <th className="text-left p-2">Clock In</th>
                              <th className="text-left p-2">Clock Out</th>
                              <th className="text-center p-2">Hours</th>
                              <th className="text-left p-2">Admin Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.entries.map((entry, idx) => (
                              <tr key={idx} className={`border-t border-gray-100 ${entry.adjusted_by_admin ? 'bg-yellow-50' : ''}`}>
                                <td className="p-2">{entry.employee_name}</td>
                                <td className="p-2">{formatDateTime(entry.clock_in)}</td>
                                <td className="p-2">{entry.clock_out ? formatDateTime(entry.clock_out) : <span className="text-green-600">Active</span>}</td>
                                <td className="p-2 text-center">
                                  {entry.total_hours?.toFixed(2) || "0.00"}
                                  {entry.adjusted_by_admin && <span className="text-[#D97706] ml-1">*</span>}
                                </td>
                                <td className="p-2 text-[#666] text-xs max-w-[200px] truncate" title={entry.admin_note}>
                                  {entry.admin_note || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-[#888] py-4">No shifts found for this period</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
