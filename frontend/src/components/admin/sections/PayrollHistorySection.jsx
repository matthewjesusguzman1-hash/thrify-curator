import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronRight,
  User,
  TrendingUp,
  Wallet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function PayrollHistorySection({ 
  employees: passedEmployees = [], 
  getAuthHeader,
  formatHoursToHMS,
  roundHoursToMinute,
  isCollapsible = false,
  compactMode = false
}) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState({});
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  const [showPreviousPeriods, setShowPreviousPeriods] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isCollapsible); // Start collapsed if collapsible
  const [allEmployees, setAllEmployees] = useState([]);

  // Fetch ALL employees for payroll (including those with time entries)
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const response = await axios.get(
          `${API}/api/admin/payroll/all-employees-for-payment`,
          getAuthHeader()
        );
        setAllEmployees(response.data || []);
      } catch (error) {
        console.error("Failed to fetch employees for payroll:", error);
        // Fallback to passed employees
        setAllEmployees(passedEmployees);
      }
    };
    fetchAllEmployees();
  }, []);

  // Fetch payroll history when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchPayrollHistory(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const fetchPayrollHistory = async (employeeId) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/api/admin/payroll/employee/${employeeId}/history`,
        getAuthHeader()
      );
      setHistoryData(response.data);
      setExpandedPeriods({});
      setShowPreviousPeriods(false);
    } catch (error) {
      console.error("Failed to fetch payroll history:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePeriod = (index) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Use fetched allEmployees or fallback to passed employees
  const selectableEmployees = allEmployees.length > 0 ? allEmployees : passedEmployees;

  // Separate current period from previous periods
  const currentPeriod = historyData?.periods?.[0];
  const previousPeriods = historyData?.periods?.slice(1) || [];

  // Render period details (reusable for both current and previous)
  const renderPeriodDetails = (period, isCurrent = false) => (
    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Hours Worked</p>
        <p className="text-lg font-semibold text-gray-900 mt-1">{period.hours_display}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Hourly Rate</p>
        <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(period.hourly_rate)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{isCurrent ? "To Be Paid" : "Amount Owed"}</p>
        <p className="text-lg font-semibold text-violet-600 mt-1">{formatCurrency(period.amount_owed)}</p>
      </div>
      {!isCurrent && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Amount Paid</p>
          <p className="text-lg font-semibold text-emerald-600 mt-1">{formatCurrency(period.amount_paid)}</p>
        </div>
      )}
    </div>
  );

  // Render balance status (only for previous periods)
  const renderBalanceStatus = (period, isCurrent = false) => {
    // Don't show balance for current period - tally isn't done yet
    if (isCurrent) {
      if (period.amount_owed > 0) {
        return (
          <div className="mt-3 p-3 rounded-lg flex items-center gap-3 bg-blue-50 text-blue-800">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Pay period in progress - final amount due at period end
            </span>
          </div>
        );
      }
      return (
        <div className="mt-3 p-3 rounded-lg flex items-center gap-3 bg-gray-50 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="font-medium">No hours worked yet this period</span>
        </div>
      );
    }
    
    // For previous periods, show actual balance
    return (
      <div className={`mt-3 p-3 rounded-lg flex items-center gap-3 ${
        period.balance > 0 
          ? 'bg-amber-50 text-amber-800' 
          : period.balance < 0 
            ? 'bg-blue-50 text-blue-800'
            : 'bg-green-50 text-green-800'
      }`}>
        {period.balance > 0 ? (
          <>
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              Balance Due: {formatCurrency(period.balance)}
            </span>
          </>
        ) : period.balance < 0 ? (
          <>
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              Overpaid by: {formatCurrency(Math.abs(period.balance))}
            </span>
          </>
        ) : period.amount_owed > 0 ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Fully Paid</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">No hours worked this period</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={compactMode ? "space-y-2" : "space-y-4"}>
      {/* Collapsible Header (if isCollapsible) */}
      {isCollapsible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between ${compactMode ? 'p-2' : 'p-3'} bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg hover:from-violet-100 hover:to-purple-100 transition-colors`}
        >
          <div className="flex items-center gap-2">
            <div className={`${compactMode ? 'w-7 h-7' : 'w-10 h-10'} bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center`}>
              <History className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            </div>
            <div className="text-left">
              <h3 className={`font-semibold text-gray-900 ${compactMode ? 'text-sm' : ''}`}>Employee Breakdown</h3>
              {!compactMode && <p className="text-xs text-gray-500">View detailed breakdown by employee</p>}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Content (collapsible or always visible) */}
      <AnimatePresence>
        {(isExpanded || !isCollapsible) && (
          <motion.div
            initial={isCollapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={isCollapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className={isCollapsible ? "overflow-hidden" : ""}
          >
            <div className={compactMode ? "space-y-2" : "space-y-4"}>
              {/* Employee Selector */}
              <div className={`bg-white rounded-lg ${compactMode ? 'p-2' : 'p-4'} shadow-sm border border-gray-100`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!compactMode && (
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className={`font-medium text-gray-900 truncate ${compactMode ? 'text-sm' : ''}`}>
                {selectedEmployee ? selectedEmployee.name : "Select employee..."}
              </p>
              {selectedEmployee && !compactMode && (
                <p className="text-xs text-gray-500 truncate">${selectedEmployee.hourly_rate || 15}/hr</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmployeeSelector(!showEmployeeSelector)}
            className={`gap-1 flex-shrink-0 ${compactMode ? 'h-7 text-xs px-2' : ''}`}
          >
            {showEmployeeSelector ? "Cancel" : (selectedEmployee ? "Change" : "Select")}
            <ChevronDown className={`w-3 h-3 transition-transform ${showEmployeeSelector ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Employee Dropdown */}
        <AnimatePresence>
          {showEmployeeSelector && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`${compactMode ? 'mt-2 pt-2' : 'mt-4 pt-4'} border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-1`}>
                {selectableEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setShowEmployeeSelector(false);
                    }}
                    className={`p-2 rounded-lg text-left transition-all ${
                      selectedEmployee?.id === emp.id
                        ? 'bg-violet-100 border border-violet-500'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm truncate">{emp.name}</p>
                    <p className="text-[10px] text-violet-600">${emp.hourly_rate || 15}/hr</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl p-8 text-center">
          <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading payroll history...</p>
        </div>
      )}

      {/* Payroll History Content */}
      {!loading && historyData && (
        <div className={compactMode ? "space-y-2" : "space-y-4"}>
          {/* Compact Summary Row for Employee */}
          {compactMode ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <div className="flex items-center gap-1 px-2 py-1 bg-violet-100 rounded-md">
                <Calendar className="w-3 h-3 text-violet-600" />
                <span className="font-semibold text-violet-700">{formatCurrency(historyData.current_period?.amount_owed || 0)}</span>
                <span className="text-violet-600 text-xs">period</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-md">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span className="font-semibold text-emerald-700">{formatCurrency(historyData.month_summary?.amount_owed || 0)}</span>
                <span className="text-emerald-600 text-xs">month</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-md">
                <Wallet className="w-3 h-3 text-amber-600" />
                <span className="font-semibold text-amber-700">{formatCurrency(historyData.year_summary?.amount_owed || 0)}</span>
                <span className="text-amber-600 text-xs">year</span>
              </div>
            </div>
          ) : (
            /* Full Summary Cards */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Current Period Card */}
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-80">Current Period</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(historyData.current_period?.amount_owed || 0)}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  {historyData.current_period?.hours_display || "0h 0m"} worked
                </p>
              </div>

              {/* This Month Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-80">{historyData.month_summary?.label || "This Month"}</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(historyData.month_summary?.amount_owed || 0)}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  {historyData.month_summary?.hours_display || "0h 0m"} worked
                </p>
              </div>

              {/* This Year Card */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-80">{historyData.year_summary?.label || "This Year"}</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(historyData.year_summary?.amount_owed || 0)}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  {historyData.year_summary?.hours_display || "0h 0m"} worked
                </p>
              </div>
            </div>
          )}

          {/* Current Pay Period - Compact in compact mode */}
          {currentPeriod && (
            <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden`}>
              <div className={`${compactMode ? 'p-2' : 'p-4'} border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${compactMode ? 'w-7 h-7' : 'w-10 h-10'} bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center`}>
                      <Clock className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-gray-900 ${compactMode ? 'text-sm' : ''}`}>Current Period</h3>
                      <p className={`text-gray-600 ${compactMode ? 'text-xs' : 'text-sm'}`}>{currentPeriod.period_label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`${compactMode ? 'text-lg' : 'text-2xl'} font-bold text-violet-600`}>{formatCurrency(currentPeriod.amount_owed)}</p>
                    <p className={`${compactMode ? 'text-xs' : 'text-sm'} text-gray-500`}>{currentPeriod.hours_display} · {currentPeriod.shifts} shift{currentPeriod.shifts !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              {!compactMode && (
                <div className="p-4">
                  {renderPeriodDetails(currentPeriod, true)}
                  {renderBalanceStatus(currentPeriod, true)}
                </div>
              )}
            </div>
          )}

          {/* Previous Pay Periods - Collapsible */}
          {previousPeriods.length > 0 && (
            <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden`}>
              {/* Collapsible Header */}
              <button
                onClick={() => setShowPreviousPeriods(!showPreviousPeriods)}
                className={`w-full ${compactMode ? 'p-2' : 'p-4'} flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors`}
              >
                <div className="flex items-center gap-2">
                  <div className={`${compactMode ? 'w-6 h-6' : 'w-10 h-10'} bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center`}>
                    <History className={`${compactMode ? 'w-3 h-3' : 'w-5 h-5'} text-white`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold text-gray-900 ${compactMode ? 'text-sm' : ''}`}>Previous Periods</h3>
                    {!compactMode && <p className="text-sm text-gray-500">{previousPeriods.length} period{previousPeriods.length !== 1 ? 's' : ''}</p>}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPreviousPeriods ? 'rotate-180' : ''}`} />
              </button>

              {/* Collapsible Content */}
              <AnimatePresence>
                {showPreviousPeriods && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-gray-100">
                      {previousPeriods.map((period, index) => (
                        <div key={index} className="transition-colors hover:bg-gray-50">
                          {/* Period Header (clickable) */}
                          <button
                            onClick={() => togglePeriod(index)}
                            className="w-full p-4 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                period.balance > 0 ? 'bg-amber-500' : period.amount_owed > 0 ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
                              <div>
                                <p className="font-medium text-gray-900">{period.period_label}</p>
                                <p className="text-sm text-gray-500">
                                  {period.hours_display} · {period.shifts} shift{period.shifts !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(period.amount_owed)}</p>
                                {period.amount_owed > 0 && (
                                  <p className={`text-xs ${period.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {period.balance > 0 ? `${formatCurrency(period.balance)} owed` : 'Paid'}
                                  </p>
                                )}
                              </div>
                              {expandedPeriods[index] ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Period Details (expandable) */}
                          <AnimatePresence>
                            {expandedPeriods[index] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4">
                                  {renderPeriodDetails(period)}
                                  {renderBalanceStatus(period)}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
