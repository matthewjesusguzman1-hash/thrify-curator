import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  User,
  Download,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShiftReportModal({
  isOpen,
  onClose,
  getAuthHeader,
  employees,
  formatDateTime,
  formatDate
}) {
  const [reportFilters, setReportFilters] = useState({
    period_type: "pay_period",
    period_index: 0,
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    custom_start: "",
    custom_end: "",
    employee_id: "all"
  });
  
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Generate report
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams({
        period_type: reportFilters.period_type,
        ...(reportFilters.period_type === "pay_period" && { period_index: reportFilters.period_index }),
        ...(reportFilters.period_type === "month" && { 
          month: reportFilters.month,
          year: reportFilters.year
        }),
        ...(reportFilters.period_type === "year" && { year: reportFilters.year }),
        ...(reportFilters.period_type === "custom" && {
          custom_start: reportFilters.custom_start,
          custom_end: reportFilters.custom_end
        }),
        ...(reportFilters.employee_id !== "all" && { employee_id: reportFilters.employee_id })
      });

      const response = await axios.get(`${API}/admin/reports/shifts?${params}`, getAuthHeader());
      setReportData(response.data);
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!reportData) return;
    
    try {
      const params = new URLSearchParams({
        period_type: reportFilters.period_type,
        ...(reportFilters.period_type === "pay_period" && { period_index: reportFilters.period_index }),
        ...(reportFilters.period_type === "month" && { 
          month: reportFilters.month,
          year: reportFilters.year
        }),
        ...(reportFilters.period_type === "year" && { year: reportFilters.year }),
        ...(reportFilters.period_type === "custom" && {
          custom_start: reportFilters.custom_start,
          custom_end: reportFilters.custom_end
        }),
        ...(reportFilters.employee_id !== "all" && { employee_id: reportFilters.employee_id })
      });

      const response = await axios.get(`${API}/admin/reports/shifts/pdf?${params}`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Report downloaded");
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  const handleClose = () => {
    setReportData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
        data-testid="report-modal"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-playfair text-xl font-bold text-[#333]">Shift Report</h2>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Report Filters */}
        <div className="space-y-4 mb-6">
          {/* Period Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="form-label">Period Type</Label>
              <Select
                value={reportFilters.period_type}
                onValueChange={(value) => setReportFilters({ ...reportFilters, period_type: value })}
              >
                <SelectTrigger className="form-input" data-testid="report-period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pay_period">Pay Period</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pay Period Selector */}
            {reportFilters.period_type === "pay_period" && (
              <div>
                <Label className="form-label">Period</Label>
                <Select
                  value={reportFilters.period_index.toString()}
                  onValueChange={(value) => setReportFilters({ ...reportFilters, period_index: parseInt(value) })}
                >
                  <SelectTrigger className="form-input" data-testid="report-pay-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Current Pay Period</SelectItem>
                    <SelectItem value="1">Previous Pay Period</SelectItem>
                    <SelectItem value="2">2 Periods Ago</SelectItem>
                    <SelectItem value="3">3 Periods Ago</SelectItem>
                    <SelectItem value="4">4 Periods Ago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Month Selector */}
            {reportFilters.period_type === "month" && (
              <>
                <div>
                  <Label className="form-label">Month</Label>
                  <Select
                    value={reportFilters.month.toString()}
                    onValueChange={(value) => setReportFilters({ ...reportFilters, month: parseInt(value) })}
                  >
                    <SelectTrigger className="form-input" data-testid="report-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"].map((m, i) => (
                        <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Year</Label>
                  <Select
                    value={reportFilters.year.toString()}
                    onValueChange={(value) => setReportFilters({ ...reportFilters, year: parseInt(value) })}
                  >
                    <SelectTrigger className="form-input" data-testid="report-month-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Year Selector */}
            {reportFilters.period_type === "year" && (
              <div>
                <Label className="form-label">Year</Label>
                <Select
                  value={reportFilters.year.toString()}
                  onValueChange={(value) => setReportFilters({ ...reportFilters, year: parseInt(value) })}
                >
                  <SelectTrigger className="form-input" data-testid="report-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Date Range */}
            {reportFilters.period_type === "custom" && (
              <>
                <div>
                  <Label className="form-label">Start Date</Label>
                  <Input
                    type="date"
                    value={reportFilters.custom_start}
                    onChange={(e) => setReportFilters({ ...reportFilters, custom_start: e.target.value })}
                    className="form-input"
                    data-testid="report-custom-start"
                  />
                </div>
                <div>
                  <Label className="form-label">End Date</Label>
                  <Input
                    type="date"
                    value={reportFilters.custom_end}
                    onChange={(e) => setReportFilters({ ...reportFilters, custom_end: e.target.value })}
                    className="form-input"
                    data-testid="report-custom-end"
                  />
                </div>
              </>
            )}
          </div>

          {/* Employee Filter */}
          <div>
            <Label className="form-label">Employee</Label>
            <Select
              value={reportFilters.employee_id}
              onValueChange={(value) => setReportFilters({ ...reportFilters, employee_id: value })}
            >
              <SelectTrigger className="form-input" data-testid="report-employee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.filter(e => e.role !== 'admin').map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateReport}
          className="w-full btn-primary mb-6"
          disabled={reportLoading}
          data-testid="generate-report-btn"
        >
          <FileText className="w-4 h-4 mr-2" />
          {reportLoading ? "Generating..." : "Generate Report"}
        </Button>

        {/* Report Results */}
        {reportData && (
          <div className="space-y-6">
            {/* Download PDF Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-[#8BA88E] text-[#8BA88E]"
                data-testid="download-shift-report-btn"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
            
            {/* Summary */}
            <div className="bg-[#F9F6F7] rounded-xl p-4">
              <h3 className="font-semibold text-[#333] mb-3">Report Summary</h3>
              <p className="text-sm text-[#666] mb-2">
                Period: {formatDate(reportData.period.start)} - {formatDate(reportData.period.end)}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#333]">{reportData.summary.total_hours}</p>
                  <p className="text-xs text-[#888]">Total Hours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#333]">{reportData.summary.total_shifts}</p>
                  <p className="text-xs text-[#888]">Total Shifts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#333]">{reportData.summary.employee_count}</p>
                  <p className="text-xs text-[#888]">Employees</p>
                </div>
              </div>
            </div>

            {/* By Employee Breakdown */}
            {reportData.by_employee.length > 0 ? (
              <div>
                <h3 className="font-semibold text-[#333] mb-3">By Employee</h3>
                <div className="space-y-4">
                  {reportData.by_employee.map((emp) => (
                    <div key={emp.user_id} className="border border-[#F8C8DC]/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-[#D48C9E]" />
                          </div>
                          <span className="font-medium text-[#333]">{emp.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#333]">{emp.total_hours.toFixed(2)} hrs</p>
                          <p className="text-xs text-[#888]">{emp.shift_count} shifts</p>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {emp.shifts.map((shift, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-[#F9F6F7] rounded-lg px-3 py-2">
                            <span className="text-[#666]">
                              {formatDateTime(shift.clock_in)} → {shift.clock_out ? formatDateTime(shift.clock_out) : 'In Progress'}
                            </span>
                            <span className="font-medium text-[#333]">{(shift.hours || 0).toFixed(2)} hrs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-[#888] py-4">No shifts found for this period</p>
            )}
          </div>
        )}
        
        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-[#eee]">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
