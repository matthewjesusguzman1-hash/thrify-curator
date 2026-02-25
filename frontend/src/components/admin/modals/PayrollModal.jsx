import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  User,
  CalendarDays,
  DollarSign,
  Settings
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

export default function PayrollModal({
  isOpen,
  onClose,
  getAuthHeader,
  employees,
  payrollSettings,
  onOpenSettings
}) {
  const [payrollFilters, setPayrollFilters] = useState({
    period_type: "biweekly",
    period_index: 0,
    custom_start: "",
    custom_end: "",
    hourly_rate: payrollSettings?.default_hourly_rate?.toString() || "15.00",
    employee_id: ""
  });
  
  const [payrollReport, setPayrollReport] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Helper for period label
  const getPeriodLabel = (type, index) => {
    const now = new Date();
    if (type === "biweekly") {
      if (index === 0) return "Current Pay Period";
      if (index === -1) return "Previous Pay Period";
      return `${Math.abs(index)} Periods Ago`;
    } else if (type === "monthly") {
      const month = new Date(now.getFullYear(), now.getMonth() + index, 1);
      return month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (type === "yearly") {
      return (now.getFullYear() + index).toString();
    }
    return "";
  };

  // Generate payroll report
  const handleGenerateReport = async () => {
    setPayrollLoading(true);
    try {
      const params = new URLSearchParams({
        period_type: payrollFilters.period_type,
        period_index: payrollFilters.period_index,
        hourly_rate: payrollFilters.hourly_rate || "15.00"
      });

      if (payrollFilters.period_type === "custom") {
        params.set("custom_start", payrollFilters.custom_start);
        params.set("custom_end", payrollFilters.custom_end);
      }

      if (payrollFilters.employee_id) {
        params.set("employee_id", payrollFilters.employee_id);
      }

      const response = await axios.get(`${API}/admin/payroll/report?${params}`, getAuthHeader());
      setPayrollReport(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate report");
    } finally {
      setPayrollLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!payrollReport) return;
    
    try {
      const params = new URLSearchParams({
        period_type: payrollFilters.period_type,
        period_index: payrollFilters.period_index,
        hourly_rate: payrollFilters.hourly_rate || "15.00"
      });

      if (payrollFilters.period_type === "custom") {
        params.set("custom_start", payrollFilters.custom_start);
        params.set("custom_end", payrollFilters.custom_end);
      }

      if (payrollFilters.employee_id) {
        params.set("employee_id", payrollFilters.employee_id);
      }

      const response = await axios.get(`${API}/admin/payroll/pdf?${params}`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${payrollReport.period.start_formatted}_${payrollReport.period.end_formatted}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Payroll report downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
        data-testid="payroll-modal"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C5A065]/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#C5A065]" />
            </div>
            <div>
              <h2 className="font-playfair text-xl font-bold text-[#333]">Payroll Reports</h2>
              <p className="text-sm text-[#888]">Generate payroll-ready reports</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="text-[#666]"
              data-testid="payroll-settings-btn"
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="form-group">
            <Label className="form-label">Period Type</Label>
            <Select
              value={payrollFilters.period_type}
              onValueChange={(value) => setPayrollFilters({ ...payrollFilters, period_type: value })}
            >
              <SelectTrigger className="form-input" data-testid="payroll-period-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {payrollFilters.period_type !== "custom" ? (
            <div className="form-group">
              <Label className="form-label">Period</Label>
              <Select
                value={payrollFilters.period_index.toString()}
                onValueChange={(value) => setPayrollFilters({ ...payrollFilters, period_index: parseInt(value) })}
              >
                <SelectTrigger className="form-input" data-testid="payroll-period-index">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{getPeriodLabel(payrollFilters.period_type, 0)}</SelectItem>
                  <SelectItem value="-1">{getPeriodLabel(payrollFilters.period_type, -1)}</SelectItem>
                  <SelectItem value="-2">{getPeriodLabel(payrollFilters.period_type, -2)}</SelectItem>
                  <SelectItem value="-3">{getPeriodLabel(payrollFilters.period_type, -3)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <Label className="form-label">Start Date</Label>
                <Input
                  type="date"
                  value={payrollFilters.custom_start}
                  onChange={(e) => setPayrollFilters({ ...payrollFilters, custom_start: e.target.value })}
                  className="form-input"
                  data-testid="payroll-custom-start"
                />
              </div>
              <div className="form-group">
                <Label className="form-label">End Date</Label>
                <Input
                  type="date"
                  value={payrollFilters.custom_end}
                  onChange={(e) => setPayrollFilters({ ...payrollFilters, custom_end: e.target.value })}
                  className="form-input"
                  data-testid="payroll-custom-end"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <Label className="form-label">Default Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={payrollFilters.hourly_rate}
              onChange={(e) => setPayrollFilters({ ...payrollFilters, hourly_rate: e.target.value })}
              className="form-input"
              placeholder="15.00"
              data-testid="payroll-hourly-rate"
            />
            <p className="text-xs text-[#888] mt-1">Used for employees without individual rates</p>
          </div>

          <div className="form-group">
            <Label className="form-label">Employee (Optional)</Label>
            <Select
              value={payrollFilters.employee_id || "all"}
              onValueChange={(value) => setPayrollFilters({ ...payrollFilters, employee_id: value === "all" ? "" : value })}
            >
              <SelectTrigger className="form-input" data-testid="payroll-employee-filter">
                <SelectValue placeholder="All Employees" />
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

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            onClick={handleGenerateReport}
            disabled={payrollLoading || (payrollFilters.period_type === "custom" && (!payrollFilters.custom_start || !payrollFilters.custom_end))}
            className="btn-primary flex items-center gap-2"
            data-testid="generate-payroll-btn"
          >
            <CalendarDays className="w-4 h-4" />
            {payrollLoading ? "Generating..." : "Generate Report"}
          </Button>
          <p className="text-xs text-[#888] self-center ml-2">
            For downloads, use the Reports section
          </p>
        </div>

        {/* Payroll Report Results */}
        {payrollReport && (
          <div className="space-y-6" data-testid="payroll-report-results">
            {/* Period Header */}
            <div className="bg-gradient-to-r from-[#C5A065]/10 to-[#F8C8DC]/10 rounded-xl p-4">
              <h3 className="font-semibold text-[#333]">
                {payrollReport.period.start_formatted} - {payrollReport.period.end_formatted}
              </h3>
              <p className="text-sm text-[#666]">
                Default Rate: ${payrollReport.settings.default_hourly_rate?.toFixed(2) || '15.00'}/hr
                {payrollReport.settings.uses_individual_rates && (
                  <span className="ml-2 text-[#C5A065]">(individual rates applied)</span>
                )}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#333]">{payrollReport.summary.total_employees}</p>
                <p className="text-sm text-[#888]">Employees</p>
              </div>
              <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#333]">{payrollReport.summary.total_hours.toFixed(2)}</p>
                <p className="text-sm text-[#888]">Total Hours</p>
              </div>
              <div className="bg-[#F9F6F7] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#333]">{payrollReport.summary.total_shifts}</p>
                <p className="text-sm text-[#888]">Total Shifts</p>
              </div>
              <div className="bg-[#C5A065]/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#C5A065]">${payrollReport.summary.total_wages.toFixed(2)}</p>
                <p className="text-sm text-[#888]">Total Wages</p>
              </div>
            </div>

            {/* Employee Breakdown */}
            {payrollReport.employees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Hours</th>
                      <th>Shifts</th>
                      <th>Rate</th>
                      <th>Gross Wages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollReport.employees.map((emp) => (
                      <tr key={emp.user_id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#F8C8DC]/30 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-[#D48C9E]" />
                            </div>
                            <div>
                              <span>{emp.name}</span>
                              {emp.has_custom_rate && (
                                <span className="ml-1 text-xs text-[#C5A065]">★</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{emp.total_hours.toFixed(2)} hrs</td>
                        <td>{emp.total_shifts}</td>
                        <td className={emp.has_custom_rate ? 'text-[#C5A065] font-medium' : ''}>
                          ${emp.hourly_rate.toFixed(2)}
                        </td>
                        <td className="font-semibold text-[#C5A065]">${emp.gross_wages.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[#888] py-8">No data found for this period</p>
            )}
          </div>
        )}
        
        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-[#eee]">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
