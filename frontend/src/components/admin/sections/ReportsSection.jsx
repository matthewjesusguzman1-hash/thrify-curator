import { useState } from "react";
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
  File,
  Clock,
  DollarSign,
  Car,
  Briefcase,
  FileSignature,
  CheckCircle,
  AlertCircle
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

export default function ReportsSection({ employees, payPeriodStart, getAuthHeader, payrollSettings }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reportType, setReportType] = useState("shifts"); // shifts, payroll, mileage
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

  const reportTypes = [
    { id: "shifts", label: "Shift Report", icon: Clock, description: "Clock in/out times and hours worked" },
    { id: "payroll", label: "Payroll Report", icon: DollarSign, description: "Hours, rates, and estimated pay" },
    { id: "mileage", label: "Mileage Report", icon: Car, description: "Trip details and deductions" },
    { id: "w9", label: "W-9 Report", icon: FileSignature, description: "Employee W-9 submission status" }
  ];

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
    // W-9 report doesn't need date range
    if (reportType !== "w9") {
      const { start, end } = getDateRange();
      if (!start || !end) {
        toast.error("Please select a valid date range");
        return;
      }
    }

    setLoading(true);
    try {
      let response;
      const { start, end } = getDateRange();
      
      if (reportType === "shifts") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (selectedEmployee !== "all") {
          params.append("employee_id", selectedEmployee);
        }
        response = await axios.get(`${API}/admin/reports/shifts?${params.toString()}`, getAuthHeader());
      } else if (reportType === "payroll") {
        // Use POST for payroll report
        const payload = {
          period_type: "custom",
          custom_start: start,
          custom_end: end,
          hourly_rate: payrollSettings?.default_hourly_rate || 15.00
        };
        if (selectedEmployee !== "all") {
          payload.employee_id = selectedEmployee;
        }
        response = await axios.post(`${API}/payroll/report`, payload, getAuthHeader());
      } else if (reportType === "mileage") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (selectedEmployee !== "all") {
          params.append("employee_id", selectedEmployee);
        }
        response = await axios.get(`${API}/admin/mileage/report?${params.toString()}`, getAuthHeader());
      } else if (reportType === "w9") {
        const params = new URLSearchParams();
        if (selectedEmployee !== "all") {
          params.append("employee_id", selectedEmployee);
        }
        response = await axios.get(`${API}/admin/reports/w9?${params.toString()}`, getAuthHeader());
      }

      setPreviewData({ type: reportType, data: response.data });
    } catch (error) {
      toast.error("Failed to load report preview");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    // W-9 report doesn't need date range
    const { start, end } = getDateRange();
    if (reportType !== "w9" && (!start || !end)) {
      toast.error("Please select a valid date range");
      return;
    }

    setLoading(true);
    try {
      let response;
      let filename = reportType === "w9" 
        ? `w9_report_${new Date().toISOString().split('T')[0]}.${format}`
        : `${reportType}_report_${start}_to_${end}.${format}`;

      if (reportType === "shifts") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (selectedEmployee !== "all") {
          params.append("employee_id", selectedEmployee);
        }
        response = await axios.get(`${API}/admin/reports/shifts/${format}?${params.toString()}`, {
          ...getAuthHeader(),
          responseType: 'blob'
        });
      } else if (reportType === "payroll") {
        // Use POST for payroll PDF
        const payload = {
          period_type: "custom",
          custom_start: start,
          custom_end: end,
          hourly_rate: payrollSettings?.default_hourly_rate || 15.00
        };
        if (selectedEmployee !== "all") {
          payload.employee_id = selectedEmployee;
        }
        response = await axios.post(`${API}/payroll/report/${format}`, payload, {
          ...getAuthHeader(),
          responseType: 'blob'
        });
      } else if (reportType === "mileage") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (selectedEmployee !== "all") {
          params.append("employee_id", selectedEmployee);
        }
        response = await axios.get(`${API}/admin/mileage/report/${format}?${params.toString()}`, {
          ...getAuthHeader(),
          responseType: 'blob'
        });
      } else if (reportType === "w9") {
        const params = new URLSearchParams();
        if (selectedEmployee !== "all") {
          params.append("employee_id", selectedEmployee);
        }
        response = await axios.get(`${API}/admin/reports/w9/${format}?${params.toString()}`, {
          ...getAuthHeader(),
          responseType: 'blob'
        });
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  // Render preview based on report type
  const renderPreview = () => {
    if (!previewData) return null;

    if (previewData.type === "shifts") {
      return renderShiftPreview(previewData.data);
    } else if (previewData.type === "payroll") {
      return renderPayrollPreview(previewData.data);
    } else if (previewData.type === "mileage") {
      return renderMileagePreview(previewData.data);
    } else if (previewData.type === "w9") {
      return renderW9Preview(previewData.data);
    }
    return null;
  };

  const renderShiftPreview = (data) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white p-4">
        <h3 className="font-semibold text-lg mb-2">Shift Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.total_entries}</p>
            <p className="text-sm opacity-80">Total Shifts</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">
              {data.summary?.reduce((sum, s) => sum + s.total_hours, 0).toFixed(1)}
            </p>
            <p className="text-sm opacity-80">Total Hours</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.summary?.length || 0}</p>
            <p className="text-sm opacity-80">Employees</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(data.summary?.reduce((sum, s) => sum + (s.total_hours * s.hourly_rate), 0))}
            </p>
            <p className="text-sm opacity-80">Est. Total Pay</p>
          </div>
        </div>
      </div>

      {data.summary?.length > 0 && (
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
                {data.summary.map((s, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2 font-medium">{s.employee_name}</td>
                    <td className="p-2 text-center">{s.total_hours.toFixed(2)}</td>
                    <td className="p-2 text-center">{s.total_shifts}</td>
                    <td className="p-2 text-right">{formatCurrency(s.total_hours * s.hourly_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-4 max-h-[300px] overflow-y-auto">
        <h4 className="font-medium text-[#333] mb-3">Shift Details ({data.entries?.length || 0} entries)</h4>
        {data.entries?.length > 0 ? (
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
                {data.entries.slice(0, 20).map((entry, idx) => (
                  <tr key={idx} className={`border-t border-gray-100 ${entry.adjusted_by_admin ? 'bg-yellow-50' : ''}`}>
                    <td className="p-2">{entry.employee_name}</td>
                    <td className="p-2">{formatDateTime(entry.clock_in)}</td>
                    <td className="p-2">{entry.clock_out ? formatDateTime(entry.clock_out) : <span className="text-green-600">Active</span>}</td>
                    <td className="p-2 text-center">
                      {entry.total_hours?.toFixed(2) || "0.00"}
                      {entry.adjusted_by_admin && <span className="text-[#D97706] ml-1">*</span>}
                    </td>
                    <td className="p-2 text-[#666] text-xs max-w-[150px] truncate" title={entry.admin_note}>
                      {entry.admin_note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.entries.length > 20 && (
              <p className="text-sm text-[#888] text-center mt-2">Showing first 20 of {data.entries.length} entries. Download for full report.</p>
            )}
          </div>
        ) : (
          <p className="text-center text-[#888] py-4">No shifts found for this period</p>
        )}
      </div>
    </div>
  );

  const renderPayrollPreview = (data) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white p-4">
        <h3 className="font-semibold text-lg mb-2">Payroll Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.total_employees || 0}</p>
            <p className="text-sm opacity-80">Employees</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{(data.total_hours || 0).toFixed(1)}</p>
            <p className="text-sm opacity-80">Total Hours</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{formatCurrency(data.total_gross_pay)}</p>
            <p className="text-sm opacity-80">Gross Pay</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{formatCurrency(data.total_mileage_deduction)}</p>
            <p className="text-sm opacity-80">Mileage Deduction</p>
          </div>
        </div>
      </div>

      {data.employees?.length > 0 && (
        <div className="p-4 max-h-[350px] overflow-y-auto">
          <h4 className="font-medium text-[#333] mb-3">Employee Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">Employee</th>
                  <th className="text-center p-2">Hours</th>
                  <th className="text-center p-2">Rate</th>
                  <th className="text-right p-2">Gross Pay</th>
                  <th className="text-right p-2">Mileage</th>
                  <th className="text-right p-2">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2 font-medium">{emp.name}</td>
                    <td className="p-2 text-center">{(emp.total_hours || 0).toFixed(2)}</td>
                    <td className="p-2 text-center">{formatCurrency(emp.hourly_rate)}/hr</td>
                    <td className="p-2 text-right">{formatCurrency(emp.gross_pay)}</td>
                    <td className="p-2 text-right text-green-600">+{formatCurrency(emp.mileage_deduction)}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(emp.net_pay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderMileagePreview = (data) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white p-4">
        <h3 className="font-semibold text-lg mb-2">Mileage Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.total_trips || 0}</p>
            <p className="text-sm opacity-80">Total Trips</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{(data.total_miles || 0).toFixed(1)}</p>
            <p className="text-sm opacity-80">Total Miles</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{formatCurrency(data.total_deduction)}</p>
            <p className="text-sm opacity-80">Total Deduction</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.employees?.length || 0}</p>
            <p className="text-sm opacity-80">Employees</p>
          </div>
        </div>
      </div>

      {data.entries?.length > 0 && (
        <div className="p-4 max-h-[350px] overflow-y-auto">
          <h4 className="font-medium text-[#333] mb-3">Trip Details ({data.entries.length} trips)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Purpose</th>
                  <th className="text-center p-2">Miles</th>
                  <th className="text-right p-2">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.slice(0, 20).map((entry, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2">{entry.user_name}</td>
                    <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="p-2 max-w-[150px] truncate" title={entry.purpose}>{entry.purpose}</td>
                    <td className="p-2 text-center">{entry.miles?.toFixed(1)}</td>
                    <td className="p-2 text-right text-green-600">{formatCurrency(entry.deduction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.entries.length > 20 && (
              <p className="text-sm text-[#888] text-center mt-2">Showing first 20 of {data.entries.length} entries. Download for full report.</p>
            )}
          </div>
        </div>
      )}

      {(!data.entries || data.entries.length === 0) && (
        <div className="p-8 text-center text-[#888]">
          No mileage entries found for this period
        </div>
      )}
    </div>
  );

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
            <p className="text-sm text-[#888]">Generate shift, payroll, and mileage reports</p>
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
              {/* Report Type Selector */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-[#666] mb-3 block">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Report Type
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => { setReportType(type.id); setPreviewData(null); }}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        reportType === type.id
                          ? 'border-[#10B981] bg-[#10B981]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          reportType === type.id ? 'bg-[#10B981] text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <type.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-medium ${reportType === type.id ? 'text-[#10B981]' : 'text-[#333]'}`}>
                            {type.label}
                          </p>
                          <p className="text-xs text-[#888]">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

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
              {renderPreview()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
