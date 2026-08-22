import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import {
  UserMinus,
  AlertTriangle,
  Calendar,
  FileText,
  Clock,
  X,
  ChevronRight,
  User,
  Mail,
  Phone,
  DollarSign,
  Trash2,
  RefreshCw,
  History
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function EmployeeTerminationsSection({ employees, getAuthHeader, onEmployeeTerminated }) {
  const [terminations, setTerminations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTerminateModal, setShowTerminateModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);

  // Filter only active employees (not already terminated)
  const activeEmployees = employees.filter(e => e.status !== "terminated");

  useEffect(() => {
    fetchTerminations();
  }, []);

  const fetchTerminations = async () => {
    try {
      const response = await axios.get(`${API}/api/employee-terminations/history`, getAuthHeader());
      setTerminations(response.data || []);
    } catch (error) {
      console.error("Failed to fetch terminations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRehire = async (terminationId) => {
    if (!window.confirm("Remove this termination record and allow the employee to be rehired?")) return;
    
    try {
      await axios.delete(`${API}/api/employee-terminations/${terminationId}`, getAuthHeader());
      toast.success("Termination record removed. Employee can be rehired.");
      fetchTerminations();
      if (onEmployeeTerminated) onEmployeeTerminated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove termination");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#333] flex items-center gap-2">
            <UserMinus className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            Employee Terminations
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage employee terminations with proper documentation
          </p>
        </div>
      </div>

      {/* Active Employees for Termination */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-[#333] mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          Active Employees ({activeEmployees.length})
        </h3>
        
        {activeEmployees.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No active employees</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activeEmployees.map(employee => (
              <div 
                key={employee.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#333] truncate">{employee.name}</p>
                  <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTerminateModal(employee)}
                  className="text-red-500 border-red-300 hover:bg-red-50"
                  data-testid={`terminate-btn-${employee.id}`}
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  Terminate
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Termination History */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-[#333] mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          Termination History ({terminations.length})
        </h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto" />
          </div>
        ) : terminations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserMinus className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No termination records</p>
          </div>
        ) : (
          <div className="space-y-3">
            {terminations.map(term => (
              <div 
                key={term.id}
                className="p-4 bg-red-50/50 rounded-xl border border-red-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[#333]">{term.employee_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        term.reason === "Resignation" ? "bg-blue-100 text-blue-700" :
                        term.reason === "Performance" ? "bg-orange-100 text-orange-700" :
                        term.reason === "Misconduct" ? "bg-red-100 text-red-700" :
                        term.reason === "Layoff" ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {term.reason}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{term.employee_email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Terminated: {new Date(term.terminated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailModal(term)}
                      className="text-gray-500"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRehire(term.id)}
                      className="text-green-600 hover:bg-green-50"
                      title="Remove termination (rehire)"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminate Employee Modal */}
      <AnimatePresence>
        {showTerminateModal && (
          <TerminateEmployeeModal
            employee={showTerminateModal}
            onClose={() => setShowTerminateModal(null)}
            onTerminated={() => {
              setShowTerminateModal(null);
              fetchTerminations();
              if (onEmployeeTerminated) onEmployeeTerminated();
            }}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>

      {/* Termination Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <TerminationDetailModal
            termination={showDetailModal}
            onClose={() => setShowDetailModal(null)}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Terminate Employee Modal
function TerminateEmployeeModal({ employee, onClose, onTerminated, getAuthHeader }) {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [finalPayDate, setFinalPayDate] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmName, setConfirmName] = useState("");

  const reasons = [
    "Resignation",
    "Performance",
    "Misconduct",
    "Layoff",
    "Other"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error("Please select a termination reason");
      return;
    }
    
    if (confirmName.trim().toLowerCase() !== employee.name.trim().toLowerCase()) {
      toast.error("Please type the employee's name to confirm");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/employee-terminations/terminate`,
        {
          employee_id: employee.id,
          reason,
          reason_details: reasonDetails,
          final_pay_date: finalPayDate || null,
          notes
        },
        getAuthHeader()
      );

      toast.success(`${employee.name} has been terminated`);
      onTerminated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to terminate employee");
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Terminate Employee
              </h2>
              <p className="text-sm text-red-600 mt-1">{employee.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-[#333]">{employee.name}</p>
                <p className="text-sm text-gray-500">{employee.email}</p>
                {employee.phone && <p className="text-xs text-gray-400">{employee.phone}</p>}
              </div>
            </div>
          </div>

          {/* Termination Reason */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Termination Reason *</Label>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    reason === r 
                      ? "bg-red-500 text-white border-red-500" 
                      : "bg-white text-gray-700 border-gray-300 hover:border-red-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Details */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Details (optional)</Label>
            <textarea
              value={reasonDetails}
              onChange={e => setReasonDetails(e.target.value)}
              placeholder="Provide additional context..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none text-sm"
              rows={3}
            />
          </div>

          {/* Final Pay Date */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Final Pay Date (optional)
            </Label>
            <Input
              type="date"
              value={finalPayDate}
              onChange={e => setFinalPayDate(e.target.value)}
              className="border-gray-300"
            />
          </div>

          {/* Admin Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              <FileText className="w-4 h-4 inline mr-1" />
              Admin Notes (optional)
            </Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes for record keeping..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none text-sm"
              rows={2}
            />
          </div>

          {/* Confirmation */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              This action will mark the employee as terminated. Type <strong>{employee.name}</strong> to confirm.
            </p>
            <Input
              type="text"
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              placeholder="Type employee name to confirm"
              className="border-red-300"
            />
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || confirmName.trim().toLowerCase() !== employee.name.trim().toLowerCase()}
            className={`text-white ${
              confirmName.trim().toLowerCase() === employee.name.trim().toLowerCase()
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-red-300 cursor-not-allowed'
            }`}
          >
            {submitting ? "Processing..." : "Terminate Employee"}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Termination Detail Modal
function TerminationDetailModal({ termination, onClose, getAuthHeader }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      const response = await axios.get(
        `${API}/api/employee-terminations/${termination.id}`,
        getAuthHeader()
      );
      setDetail(response.data);
    } catch (error) {
      console.error("Failed to fetch termination detail:", error);
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#333]">Termination Record</h2>
            <p className="text-sm text-gray-500">{termination.employee_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{detail.termination.employee_email}</span>
                </div>
                {detail.termination.employee_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{detail.termination.employee_phone}</span>
                  </div>
                )}
                {detail.termination.employee_hourly_rate && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>${detail.termination.employee_hourly_rate}/hr</span>
                  </div>
                )}
              </div>

              {/* Termination Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm font-medium text-[#333]">{detail.termination.reason}</p>
                </div>
                
                {detail.termination.reason_details && (
                  <div>
                    <p className="text-xs text-gray-500">Details</p>
                    <p className="text-sm text-[#333]">{detail.termination.reason_details}</p>
                  </div>
                )}
                
                {detail.termination.final_pay_date && (
                  <div>
                    <p className="text-xs text-gray-500">Final Pay Date</p>
                    <p className="text-sm text-[#333]">{detail.termination.final_pay_date}</p>
                  </div>
                )}
                
                {detail.termination.notes && (
                  <div>
                    <p className="text-xs text-gray-500">Admin Notes</p>
                    <p className="text-sm text-[#333]">{detail.termination.notes}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-gray-500">Terminated By</p>
                  <p className="text-sm text-[#333]">
                    {detail.termination.terminated_by_name || detail.termination.terminated_by}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(detail.termination.terminated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Recent Time Entries */}
              {detail.recent_time_entries && detail.recent_time_entries.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-[#333] mb-2">Recent Time Entries</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detail.recent_time_entries.map((entry, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-500 py-1 border-b border-gray-100">
                        <span>{entry.date}</span>
                        <span>{entry.hours?.toFixed(2) || 0} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500">Failed to load details</p>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
