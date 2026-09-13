/**
 * Training Section — Admin view with editable guides + AI cleanup
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, BookOpen, GraduationCap, Users, Plus, X, Trash2,
  ChevronDown, ChevronUp, Package, Tag, FileText, FolderOpen,
  Monitor, ShoppingBag, Loader2, Check, UserPlus, Pencil, Save,
  Sparkles, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICON_MAP = {
  Package, Camera, FileText, Tag, FolderOpen, Monitor, ShoppingBag, BookOpen
};

function StepSection({ section, color, isEditing, onUpdate }) {
  const IconComp = ICON_MAP[section.icon] || FileText;

  if (!isEditing) {
    return (
      <div className="bg-[#fafafa] rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <IconComp className="w-4 h-4" style={{ color }} />
          <h4 className="font-medium text-sm text-[#333]">{section.title}</h4>
        </div>
        <ul className="space-y-1.5 ml-6">
          {section.steps.map((step, j) => (
            <li key={j} className="text-xs text-[#555] flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ccc] mt-1.5 flex-shrink-0" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f3ff] rounded-lg p-3 border border-[#8B5CF6]/20">
      <div className="flex items-center gap-2 mb-2">
        <IconComp className="w-4 h-4" style={{ color }} />
        <input
          value={section.title}
          onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          className="font-medium text-sm text-[#333] bg-white border border-[#ddd] rounded px-2 py-1 flex-1"
          data-testid={`edit-section-title`}
        />
      </div>
      <textarea
        value={section.steps.join("\n")}
        onChange={(e) => onUpdate({ ...section, steps: e.target.value.split("\n") })}
        className="w-full text-xs text-[#555] bg-white border border-[#ddd] rounded px-2 py-1.5 min-h-[80px] resize-y font-mono leading-relaxed"
        placeholder="One step per line..."
        data-testid={`edit-section-steps`}
      />
    </div>
  );
}

function EditableGuide({ guide, color, getAuthHeader, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSections, setEditSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cleaningIdx, setCleaningIdx] = useState(null);
  const [cleaningAll, setCleaningAll] = useState(false);

  const IconComp = guide.guide_type === "photography" ? Camera : BookOpen;

  const startEdit = () => {
    setEditSections(JSON.parse(JSON.stringify(guide.sections)));
    setIsEditing(true);
    if (!expanded) setExpanded(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditSections([]);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      // Filter out empty steps
      const cleaned = editSections.map(s => ({
        ...s,
        steps: s.steps.filter(st => st.trim() !== "")
      }));
      await axios.put(
        `${API}/training-content/${guide.guide_type}`,
        { sections: cleaned },
        getAuthHeader()
      );
      toast.success("Training guide saved");
      setIsEditing(false);
      onSaved();
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const aiCleanupSection = async (idx) => {
    const section = editSections[idx];
    const text = `Section: ${section.title}\n${section.steps.join("\n")}`;
    setCleaningIdx(idx);
    try {
      const res = await axios.post(
        `${API}/training-content/ai-cleanup`,
        { text },
        getAuthHeader()
      );
      const lines = res.data.cleaned_text.split("\n").filter(l => l.trim());
      // First line might be the title if it starts with a number or "Section:"
      let newTitle = section.title;
      let newSteps = lines;
      if (lines[0] && (lines[0].startsWith("Section:") || /^\d+\./.test(lines[0]))) {
        newTitle = lines[0].replace(/^Section:\s*/, "");
        newSteps = lines.slice(1);
      }
      const updated = [...editSections];
      updated[idx] = { ...section, title: newTitle, steps: newSteps };
      setEditSections(updated);
      toast.success("Section cleaned up");
    } catch {
      toast.error("AI cleanup failed");
    } finally {
      setCleaningIdx(null);
    }
  };

  const aiCleanupAll = async () => {
    setCleaningAll(true);
    try {
      for (let i = 0; i < editSections.length; i++) {
        await aiCleanupSection(i);
      }
      toast.success("All sections cleaned up");
    } catch {
      toast.error("AI cleanup failed");
    } finally {
      setCleaningAll(false);
    }
  };

  const addSection = () => {
    setEditSections([...editSections, { title: "New Section", icon: "FileText", steps: [""] }]);
  };

  const removeSection = (idx) => {
    setEditSections(editSections.filter((_, i) => i !== idx));
  };

  const updateSection = (idx, updated) => {
    const copy = [...editSections];
    copy[idx] = updated;
    setEditSections(copy);
  };

  const sections = isEditing ? editSections : guide.sections;

  return (
    <div className="border border-[#e5e5e5] rounded-xl overflow-hidden bg-white" data-testid={`guide-${guide.guide_type}`}>
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-3 p-4 hover:bg-[#fafafa] transition-colors"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <IconComp className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <span className="font-medium text-sm text-[#333] flex-1 text-left">{guide.title}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#aaa]" /> : <ChevronDown className="w-4 h-4 text-[#aaa]" />}
        </button>
        {!isEditing && (
          <button
            onClick={startEdit}
            className="mr-3 p-2 rounded-lg hover:bg-[#f5f3ff] text-[#8B5CF6] transition-colors"
            title="Edit guide"
            data-testid={`edit-guide-${guide.guide_type}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Edit toolbar */}
            {isEditing && (
              <div className="px-4 pb-2 flex items-center gap-2 flex-wrap border-b border-[#eee] mb-2 pt-1">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={saving}
                  className="bg-[#10B981] hover:bg-[#059669] text-white text-xs gap-1"
                  data-testid={`save-guide-${guide.guide_type}`}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  className="text-xs gap-1"
                  data-testid={`cancel-edit-${guide.guide_type}`}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  onClick={aiCleanupAll}
                  disabled={cleaningAll || cleaningIdx !== null}
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs gap-1"
                  data-testid={`ai-cleanup-all-${guide.guide_type}`}
                >
                  {cleaningAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Cleanup All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addSection}
                  className="text-xs gap-1"
                  data-testid={`add-section-${guide.guide_type}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Section
                </Button>
              </div>
            )}

            <div className="px-4 pb-4 space-y-3">
              {sections.map((section, i) => (
                <div key={i} className="relative">
                  <StepSection
                    section={section}
                    color={color}
                    isEditing={isEditing}
                    onUpdate={(updated) => updateSection(i, updated)}
                  />
                  {isEditing && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <button
                        onClick={() => aiCleanupSection(i)}
                        disabled={cleaningIdx === i}
                        className="text-[10px] text-[#8B5CF6] hover:text-[#7C3AED] flex items-center gap-1 px-2 py-1 rounded hover:bg-[#f5f3ff] transition-colors disabled:opacity-50"
                        data-testid={`ai-cleanup-section-${i}`}
                      >
                        {cleaningIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        AI Cleanup
                      </button>
                      <button
                        onClick={() => removeSection(i)}
                        className="text-[10px] text-[#ccc] hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        data-testid={`remove-section-${i}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignmentPanel({ getAuthHeader }) {
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [selectedType, setSelectedType] = useState("photography");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, assignRes] = await Promise.all([
        axios.get(`${API}/training-assignments/employees`, getAuthHeader()),
        axios.get(`${API}/training-assignments/`, getAuthHeader()),
      ]);
      setEmployees(empRes.data.employees || []);
      setAssignments(assignRes.data.assignments || []);
    } catch (err) {
      toast.error("Failed to load training data");
    } finally {
      setLoading(false);
    }
  };

  const assign = async () => {
    if (!selectedEmp) { toast.info("Select an employee"); return; }
    setAssigning(true);
    try {
      await axios.post(`${API}/training-assignments/`, {
        employee_id: selectedEmp,
        training_type: selectedType,
      }, getAuthHeader());
      toast.success("Training assigned!");
      setSelectedEmp("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/training-assignments/${id}`, getAuthHeader());
      toast.success("Assignment removed");
      fetchData();
    } catch {
      toast.error("Failed to remove");
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#aaa]" /></div>;

  return (
    <div className="border border-[#e5e5e5] rounded-xl p-4 bg-white" data-testid="training-assignments-panel">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-[#8B5CF6]" />
        <h3 className="font-medium text-sm text-[#333]">Assign Training</h3>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={selectedEmp}
          onChange={(e) => setSelectedEmp(e.target.value)}
          className="text-xs border border-[#ddd] rounded-lg px-2 py-1.5 bg-white flex-1 min-w-[140px]"
          data-testid="assign-employee-select"
        >
          <option value="">Select employee...</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="text-xs border border-[#ddd] rounded-lg px-2 py-1.5 bg-white"
          data-testid="assign-type-select"
        >
          <option value="photography">Photography</option>
          <option value="listing">Listing</option>
        </select>
        <Button
          size="sm"
          onClick={assign}
          disabled={assigning || !selectedEmp}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs px-3"
          data-testid="assign-btn"
        >
          {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Assign
        </Button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-xs text-[#aaa] text-center py-2">No training assigned yet</p>
      ) : (
        <div className="space-y-1.5">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-[#fafafa] rounded-lg" data-testid={`assignment-${a.id}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#333]">{a.employee_name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  a.training_type === "photography" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {a.training_type === "photography" ? "Photography" : "Listing"}
                </span>
              </div>
              <button onClick={() => remove(a.id)} className="text-[#ccc] hover:text-red-500 transition-colors" data-testid={`remove-assignment-${a.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainingSection({ getAuthHeader, isAdmin }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGuides = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/training-content/`, getAuthHeader());
      setGuides(res.data.guides || []);
    } catch {
      toast.error("Failed to load training guides");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGuides(); }, [fetchGuides]);

  const photoGuide = guides.find(g => g.guide_type === "photography");
  const listingGuide = guides.find(g => g.guide_type === "listing");

  return (
    <div className="space-y-4" data-testid="training-section">
      {isAdmin && <AssignmentPanel getAuthHeader={getAuthHeader} />}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#aaa]" />
        </div>
      ) : (
        <>
          {photoGuide && (
            <EditableGuide
              guide={photoGuide}
              color="#F59E0B"
              getAuthHeader={getAuthHeader}
              onSaved={fetchGuides}
            />
          )}
          {listingGuide && (
            <EditableGuide
              guide={listingGuide}
              color="#3B82F6"
              getAuthHeader={getAuthHeader}
              onSaved={fetchGuides}
            />
          )}
        </>
      )}
    </div>
  );
}
