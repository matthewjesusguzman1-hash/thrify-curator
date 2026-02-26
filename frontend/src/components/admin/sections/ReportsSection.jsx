import { useState, useEffect, useCallback } from "react";
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
  Car,
  Briefcase,
  FileSignature,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  BarChart3,
  RefreshCw
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
import { formatHoursToHMS, roundHoursToMinute } from "@/lib/utils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ReportsSection({ employees, payPeriodStart, getAuthHeader, payrollSettings, lastDataUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reportType, setReportType] = useState("shifts"); // shifts, mileage, w9
  const [filterType, setFilterType] = useState("period");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [viewingW9, setViewingW9] = useState(null); // For W-9 preview modal
  const [refreshing, setRefreshing] = useState(false);

  // Default to Administrator for mileage reports
  const handleReportTypeChange = (type) => {
    setReportType(type);
    setPreviewData(null);
    // Default mileage reports to Administrator
    if (type === "mileage") {
      setSelectedEmployee("administrator");
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const reportTypes = [
    { id: "shifts", label: "Payroll/Shift Report", icon: Clock, description: "Clock in/out times, hours worked, and pay" },
    { id: "mileage", label: "Mileage Report", icon: Car, description: "Trip details and deductions" },
    { id: "w9", label: "W-9 Report", icon: FileSignature, description: "Employee W-9 submission status" }
  ];

  // Filter employees to show - replace admin users with single "Administrator" option
  const getFilteredEmployees = () => {
    if (!employees) return [];
    
    const nonAdminEmployees = employees.filter(e => e.role !== 'admin');
    const hasAdmins = employees.some(e => e.role === 'admin');
    
    // Add a single "Administrator" option if there are any admins
    if (hasAdmins) {
      return [
        { id: 'administrator', name: 'Administrator', role: 'admin' },
        ...nonAdminEmployees
      ];
    }
    return nonAdminEmployees;
  };

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

  // Get actual employee IDs to filter - "administrator" means all admin users
  const getEmployeeIdsForFilter = () => {
    if (selectedEmployee === "all") return null;
    if (selectedEmployee === "administrator") {
      // Return all admin IDs
      return employees?.filter(e => e.role === 'admin').map(e => e.id) || [];
    }
    return [selectedEmployee];
  };

  // Refresh current report data
  const refreshCurrentReport = useCallback(async () => {
    if (!previewData || !isExpanded) return;
    
    setRefreshing(true);
    try {
      let response;
      const { start, end } = getDateRange();
      const employeeIds = getEmployeeIdsForFilter();
      
      if (previewData.type === "shifts") {
        const params = new URLSearchParams({ start_date: start, end_date: end });
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        } else if (employeeIds && employeeIds.length > 1) {
          params.append("employee_ids", employeeIds.join(","));
        }
        response = await axios.get(`${API}/admin/reports/shifts?${params.toString()}`, getAuthHeader());
      } else if (previewData.type === "mileage") {
        const params = new URLSearchParams({ start_date: start, end_date: end });
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        }
        response = await axios.get(`${API}/admin/mileage/report?${params.toString()}`, getAuthHeader());
      } else if (previewData.type === "w9") {
        const params = new URLSearchParams();
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        }
        response = await axios.get(`${API}/admin/reports/w9?${params.toString()}`, getAuthHeader());
      }
      
      if (response) {
        setPreviewData({ type: previewData.type, data: response.data });
      }
    } catch (error) {
      console.error("Failed to refresh report:", error);
    } finally {
      setRefreshing(false);
    }
  }, [previewData, isExpanded, getAuthHeader, filterType, selectedMonth, selectedYear, customStartDate, customEndDate, selectedEmployee, employees]);

  // Auto-refresh when data updates
  useEffect(() => {
    if (lastDataUpdate && previewData && isExpanded) {
      refreshCurrentReport();
    }
  }, [lastDataUpdate]);

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
      const employeeIds = getEmployeeIdsForFilter();
      
      if (reportType === "shifts") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        // For "administrator", we pass all admin IDs
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        } else if (employeeIds && employeeIds.length > 1) {
          // Multiple admin IDs - pass as comma-separated
          params.append("employee_ids", employeeIds.join(","));
        }
        response = await axios.get(`${API}/admin/reports/shifts?${params.toString()}`, getAuthHeader());
      } else if (reportType === "mileage") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        }
        response = await axios.get(`${API}/admin/mileage/report?${params.toString()}`, getAuthHeader());
      } else if (reportType === "w9") {
        const params = new URLSearchParams();
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
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

      const employeeIds = getEmployeeIdsForFilter();

      if (reportType === "shifts") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        } else if (employeeIds && employeeIds.length > 1) {
          params.append("employee_ids", employeeIds.join(","));
        }
        response = await axios.get(`${API}/admin/reports/shifts/${format}?${params.toString()}`, {
          ...getAuthHeader(),
          responseType: 'blob'
        });
      } else if (reportType === "mileage") {
        const params = new URLSearchParams({
          start_date: start,
          end_date: end
        });
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
        }
        response = await axios.get(`${API}/admin/mileage/report/${format}?${params.toString()}`, {
          ...getAuthHeader(),
          responseType: 'blob'
        });
      } else if (reportType === "w9") {
        const params = new URLSearchParams();
        if (employeeIds && employeeIds.length === 1) {
          params.append("employee_id", employeeIds[0]);
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

  // View W-9 for an employee
  const handleViewW9 = async (employeeId) => {
    try {
      // Get the latest W-9 document for this employee
      const response = await axios.get(`${API}/admin/employees/${employeeId}/w9/latest`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setViewingW9({ url, employeeId });
    } catch (error) {
      toast.error("Failed to load W-9 document");
      console.error(error);
    }
  };

  // Download W-9 for an employee
  const handleDownloadW9 = async (employeeId, employeeName) => {
    try {
      const response = await axios.get(`${API}/admin/employees/${employeeId}/w9/latest`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `w9_${employeeName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("W-9 downloaded");
    } catch (error) {
      toast.error("Failed to download W-9");
      console.error(error);
    }
  };

  // Close W-9 viewer
  const handleCloseW9Viewer = () => {
    if (viewingW9?.url) {
      window.URL.revokeObjectURL(viewingW9.url);
    }
    setViewingW9(null);
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
    } else if (previewData.type === "mileage") {
      return renderMileagePreview(previewData.data);
    } else if (previewData.type === "w9") {
      return renderW9Preview(previewData.data);
    }
    return null;
  };

  const renderShiftPreview = (data) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#F43F5E] to-[#E11D48] text-white p-4">
        <h3 className="font-semibold text-lg mb-2">Payroll/Shift Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.total_entries}</p>
            <p className="text-sm opacity-80">Total Shifts</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">
              {formatHoursToHMS(data.summary?.reduce((sum, s) => sum + s.total_hours, 0))}
            </p>
            <p className="text-sm opacity-80">Total Hours</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.summary?.length || 0}</p>
            <p className="text-sm opacity-80">Employees</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(data.summary?.reduce((sum, s) => sum + (roundHoursToMinute(s.total_hours) * s.hourly_rate), 0))}
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
                  <th className="text-center p-2">Rate</th>
                  <th className="text-right p-2">Est. Pay</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((s, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2 font-medium">{s.employee_name}</td>
                    <td className="p-2 text-center">{formatHoursToHMS(s.total_hours)}</td>
                    <td className="p-2 text-center">{s.total_shifts}</td>
                    <td className="p-2 text-center text-[#666]">{formatCurrency(s.hourly_rate)}/hr</td>
                    <td className="p-2 text-right font-medium text-green-600">{formatCurrency(roundHoursToMinute(s.total_hours) * s.hourly_rate)}</td>
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
                  <th className="text-center p-2">Rate</th>
                  <th className="text-right p-2">Est. Pay</th>
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
                      {formatHoursToHMS(entry.total_hours)}
                      {entry.adjusted_by_admin && <span className="text-[#D97706] ml-1">*</span>}
                    </td>
                    <td className="p-2 text-center text-[#666]">
                      {formatCurrency(entry.hourly_rate || 15)}/hr
                    </td>
                    <td className="p-2 text-right font-medium text-green-600">
                      {formatCurrency((entry.total_hours || 0) * (entry.hourly_rate || 15))}
                    </td>
                    <td className="p-2 text-[#666] text-xs max-w-[120px] truncate" title={entry.admin_note}>
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

  const renderMileagePreview = (data) => {
    // IRS standard mileage rate for 2026 (72.5 cents per mile)
    const MILEAGE_RATE = 0.725;
    
    return (
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
                  <th className="text-left p-2">From → To</th>
                  <th className="text-left p-2">Purpose</th>
                  <th className="text-center p-2">Miles</th>
                  <th className="text-right p-2">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.slice(0, 20).map((entry, idx) => {
                  const miles = entry.total_miles || 0;
                  const deduction = miles * MILEAGE_RATE;
                  return (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2">{entry.user_name}</td>
                    <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="p-2 max-w-[150px] truncate" title={`${entry.start_address} → ${entry.end_address}`}>
                      {entry.start_address || '-'} → {entry.end_address || '-'}
                    </td>
                    <td className="p-2 max-w-[100px] truncate" title={entry.purpose}>{entry.purpose}</td>
                    <td className="p-2 text-center">{miles.toFixed(1)}</td>
                    <td className="p-2 text-right text-green-600">{formatCurrency(deduction)}</td>
                  </tr>
                  );
                })}
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
  };

  const renderW9Preview = (data) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white p-4">
        <h3 className="font-semibold text-lg mb-2">W-9 Submission Report</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{data.summary?.total_employees || 0}</p>
            <p className="text-sm opacity-80">Total Employees</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-300">{data.summary?.approved || 0}</p>
            <p className="text-sm opacity-80">Approved</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-300">{data.summary?.pending || 0}</p>
            <p className="text-sm opacity-80">Pending</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-300">{data.summary?.not_submitted || 0}</p>
            <p className="text-sm opacity-80">Not Submitted</p>
          </div>
        </div>
      </div>

      {data.employees?.length > 0 && (
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <h4 className="font-medium text-[#333] mb-3">Employee W-9 Status</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Start Date</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-left p-2">Last Updated</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2 font-medium">{emp.name}</td>
                    <td className="p-2 text-[#666]">
                      {emp.start_date ? new Date(emp.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      {emp.w9_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Approved
                        </span>
                      ) : emp.w9_status === 'submitted' || emp.w9_status === 'pending' || emp.w9_status === 'pending_review' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <AlertCircle className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertCircle className="w-3 h-3" />
                          Not Submitted
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-[#666]">
                      {emp.last_updated ? new Date(emp.last_updated).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-2 text-center">
                      {emp.document_count > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewW9(emp.id)}
                            className="h-7 px-2 text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                            data-testid={`view-w9-${emp.id}`}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadW9(emp.id, emp.name)}
                            className="h-7 px-2 text-[#F43F5E] hover:bg-[#F43F5E]/10"
                            data-testid={`download-w9-${emp.id}`}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[#999] text-xs">No W-9</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!data.employees || data.employees.length === 0) && (
        <div className="p-8 text-center text-[#888]">
          No employees found
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
          <div className="w-10 h-10 bg-gradient-to-r from-[#F43F5E] to-[#E11D48] rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Reports</h2>
            <p className="text-sm text-[#888]">Generate payroll/shift, mileage, and W-9 reports</p>
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
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#eee]">
              {/* Report Type Selector */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-[#666] mb-3 block">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Report Type
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleReportTypeChange(type.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        reportType === type.id
                          ? 'border-[#F43F5E] bg-[#F43F5E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          reportType === type.id ? 'bg-[#F43F5E] text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <type.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-medium ${reportType === type.id ? 'text-[#F43F5E]' : 'text-[#333]'}`}>
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
                      {getFilteredEmployees().map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter Type - Hidden for W-9 reports */}
                {reportType !== "w9" && (
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
                )}

                {/* Month/Year selectors */}
                {reportType !== "w9" && filterType === "month" && (
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

                {reportType !== "w9" && filterType === "year" && (
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
                {reportType !== "w9" && filterType === "custom" && (
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

              {/* Selected Range Display - not for W-9 reports */}
              {reportType !== "w9" && (
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
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Button
                  onClick={handlePreview}
                  disabled={loading || (reportType !== "w9" && filterType === "custom" && (!customStartDate || !customEndDate))}
                  className="bg-[#F43F5E] hover:bg-[#E11D48] text-white"
                  data-testid="preview-report-btn"
                >
                  {loading ? "Loading..." : "Preview Report"}
                </Button>
                {previewData && (
                  <Button
                    onClick={refreshCurrentReport}
                    disabled={refreshing}
                    variant="outline"
                    className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10"
                    data-testid="refresh-report-btn"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                )}
                <Button
                  onClick={() => handleDownload("csv")}
                  disabled={loading || (reportType !== "w9" && filterType === "custom" && (!customStartDate || !customEndDate))}
                  variant="outline"
                  className="border-[#F43F5E] text-[#F43F5E] hover:bg-[#F43F5E]/10"
                  data-testid="download-csv-btn"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
                <Button
                  onClick={() => handleDownload("pdf")}
                  disabled={loading || (reportType !== "w9" && filterType === "custom" && (!customStartDate || !customEndDate))}
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

      {/* W-9 Viewer Modal */}
      <AnimatePresence>
        {viewingW9 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseW9Viewer}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-[#333]">W-9 Document</h3>
                <button 
                  onClick={handleCloseW9Viewer}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-hidden">
                <iframe
                  src={viewingW9.url}
                  className="w-full h-[70vh] border border-gray-200 rounded-lg"
                  title="W-9 Document"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
