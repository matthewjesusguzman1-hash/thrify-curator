import { useState, useEffect, useCallback } from "react";
import { Send, Users, Trash2, X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OrderAssignmentSection({ getAuthHeader, employees: employeesProp }) {
  const [assignments, setAssignments] = useState([]);
  const [labels, setLabels] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [notes, setNotes] = useState("");
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [sinceDate, setSinceDate] = useState(getLocalDate);
  const [untilDate, setUntilDate] = useState(getLocalDate);

  // Use prop if available, otherwise fetch our own
  const employees = (employeesProp && employeesProp.length > 0) ? employeesProp : employeesList;

  const fetchAssignments = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/orders/assignments`, getAuthHeader());
      setAssignments(data.assignments || []);
    } catch (err) { /* ignore */ }
  }, [getAuthHeader]);

  const fetchLabels = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/orders/labels`, getAuthHeader());
      setLabels(data.labels || []);
    } catch (err) { /* ignore */ }
  }, [getAuthHeader]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/employees`, getAuthHeader());
      setEmployeesList(data || []);
    } catch (err) { /* ignore */ }
  }, [getAuthHeader]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAssignments(), fetchLabels(), fetchEmployees()]).finally(() => setLoading(false));
  }, [fetchAssignments, fetchLabels, fetchEmployees]);

  const handleAssign = async () => {
    if (!selectedEmployee) { toast.error("Select an employee"); return; }
    setAssigning(true);
    try {
      const { data } = await axios.post(
        `${API}/orders/assign`,
        {
          employee_id: selectedEmployee,
          since: sinceDate,
          until: untilDate,
          label_ids: selectedLabels.length > 0 ? selectedLabels : labels.map((l) => l.id),
          notes,
        },
        getAuthHeader()
      );
      toast.success(`Orders assigned to ${data.employee_name}`, {
        description: `${data.item_count} items, ${data.label_count} labels, ${data.match_count} auto-matched`,
      });
      setShowForm(false);
      setSelectedEmployee("");
      setSelectedLabels([]);
      setNotes("");
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const handleCancel = async (id, empName) => {
    const ok = window.confirm(`Cancel orders for ${empName}?`);
    if (!ok) return;
    try {
      await axios.delete(`${API}/orders/assignments/${id}`, getAuthHeader());
      toast.success("Assignment cancelled");
      fetchAssignments();
    } catch (err) {
      toast.error("Failed to cancel");
    }
  };

  const toggleLabel = (id) => {
    setSelectedLabels((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
  };

  const active = assignments.filter((a) => a.status === "active");
  const completed = assignments.filter((a) => a.status === "completed").slice(0, 10);

  return (
    <div className="dashboard-card" data-testid="order-assignments-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-playfair text-xl font-semibold text-[#333]">Order Assignments</h2>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowForm(!showForm); if (!showForm) fetchLabels(); }}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs"
          data-testid="assign-orders-btn"
        >
          <Send className="w-3.5 h-3.5 mr-1" />
          Assign Orders
        </Button>
      </div>

      {/* Assign Form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-xl bg-[#fafafa] border border-[#eee] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#333]">New Assignment</h4>
            <button onClick={() => setShowForm(false)} className="text-[#ccc] hover:text-[#888]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-xs text-[#888] mb-1 block font-medium">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-white border border-[#ddd] rounded-lg px-3 py-2 text-sm text-[#333] focus:outline-none focus:border-[#8B5CF6]"
              data-testid="assign-employee-select"
            >
              <option value="">Select employee...</option>
              {(employees || []).map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#888] mb-1 block font-medium">From</label>
              <input
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-full bg-white border border-[#ddd] rounded-lg px-3 py-2 text-sm text-[#333] focus:outline-none focus:border-[#8B5CF6]"
                data-testid="assign-since-date"
              />
            </div>
            <div>
              <label className="text-xs text-[#888] mb-1 block font-medium">To</label>
              <input
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
                className="w-full bg-white border border-[#ddd] rounded-lg px-3 py-2 text-sm text-[#333] focus:outline-none focus:border-[#8B5CF6]"
                data-testid="assign-until-date"
              />
            </div>
          </div>

          {labels.length > 0 && (
            <div>
              <label className="text-xs text-[#888] mb-1 block font-medium">
                Labels ({selectedLabels.length === 0 ? "all included" : `${selectedLabels.length} selected`})
              </label>
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {labels.map((label) => (
                  <label key={label.id} className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-[#f5f5f5] cursor-pointer border border-[#eee]">
                    <input
                      type="checkbox"
                      checked={selectedLabels.length === 0 || selectedLabels.includes(label.id)}
                      onChange={() => toggleLabel(label.id)}
                      className="rounded border-[#ccc]"
                    />
                    <span className="text-xs text-[#555] truncate">{label.filename}</span>
                    {label.platform_guess && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#888] capitalize ml-auto">
                        {label.platform_guess}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-[#888] mb-1 block font-medium">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Priority items first..."
              className="w-full bg-white border border-[#ddd] rounded-lg px-3 py-2 text-sm text-[#333] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <Button
            onClick={handleAssign}
            disabled={assigning || !selectedEmployee}
            className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            data-testid="confirm-assign-btn"
          >
            {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {assigning ? "Assigning..." : "Assign to Employee"}
          </Button>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-[#aaa] uppercase tracking-wider">Active</h4>
          {active.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/20" data-testid={`assignment-${a.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-sm text-[#333] font-medium">{a.employee_name}</p>
                  <p className="text-xs text-[#999]">
                    {a.item_count} items, {a.label_count} labels
                    {a.since && ` — ${a.since}`}
                    {a.until && a.until !== a.since && ` to ${a.until}`}
                  </p>
                </div>
              </div>
              <button onClick={() => handleCancel(a.id, a.employee_name)} className="text-[#ccc] hover:text-red-500 transition-colors" data-testid={`cancel-assignment-${a.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[#aaa] uppercase tracking-wider">Completed</h4>
          {completed.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#f8f8f8] border border-[#eee] opacity-60">
              <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#555]">{a.employee_name}</p>
                <p className="text-[10px] text-[#aaa]">
                  Completed {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && active.length === 0 && completed.length === 0 && !showForm && (
        <p className="text-sm text-[#aaa] text-center py-2">No assignments yet</p>
      )}
    </div>
  );
}
