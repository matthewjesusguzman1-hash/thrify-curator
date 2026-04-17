import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Header } from "../components/app/Header";
import { Plus, Trash2, ChevronRight, ClipboardList, ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Toaster, toast } from "sonner";
import { useAuth } from "../components/app/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function InspectionsPage() {
  const navigate = useNavigate();
  const { badge } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const fetchInspections = async () => {
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch {
      toast.error("Failed to load inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInspections(); }, []);

  const handleCreate = async () => {
    try {
      const res = await axios.post(`${API}/inspections`, {
        title: newTitle || undefined,
        badge,
      });
      setCreating(false);
      setNewTitle("");
      navigate(`/inspections/${res.data.id}`);
    } catch {
      toast.error("Failed to create inspection");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await axios.delete(`${API}/inspections/${id}`);
    fetchInspections();
    toast.success("Inspection deleted");
  };

  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="inspections-page">
      <Toaster position="top-right" richColors />
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[800px] mx-auto px-3 sm:px-6 py-2 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" data-testid="back-to-search-btn">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm sm:text-base font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Inspections
          </h1>
        </div>
        <div className="gold-accent h-[2px]" />
      </div>

      <main className="max-w-[800px] mx-auto px-3 sm:px-6 py-4 pb-20 space-y-4">
        {/* Create new */}
        {creating ? (
          <div className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Inspection title (optional)"
              className="text-sm h-9"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              data-testid="new-inspection-title"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} className="bg-[#002855] text-white hover:bg-[#001a3a] h-9" data-testid="create-inspection-btn">Create</Button>
              <Button size="sm" variant="outline" onClick={() => setCreating(false)} className="h-9">Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setCreating(true)} className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-10" data-testid="new-inspection-btn">
            <Plus className="w-4 h-4 mr-2" /> New Inspection
          </Button>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <ClipboardList className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#334155]">No inspections yet</p>
            <p className="text-xs text-[#64748B] mt-1">Create one to start documenting violations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inspections.map((insp) => (
              <div
                key={insp.id}
                onClick={() => navigate(`/inspections/${insp.id}`)}
                className="bg-white rounded-lg border p-4 flex items-center gap-3 cursor-pointer hover:border-[#002855]/30 active:bg-[#F8FAFC] transition-colors"
                data-testid={`inspection-card-${insp.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#002855] truncate">{insp.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#64748B]">
                    <span>{insp.items?.length || 0} violations</span>
                    <span>{insp.created_at?.slice(0, 10)}</span>
                    {insp.items?.some(i => i.oos_value === "Y") && (
                      <Badge variant="destructive" className="text-[8px] px-1 py-0 bg-[#DC2626] text-white">HAS OOS</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={(e) => handleDelete(insp.id, e)} className="text-[#CBD5E1] hover:text-[#DC2626] transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
