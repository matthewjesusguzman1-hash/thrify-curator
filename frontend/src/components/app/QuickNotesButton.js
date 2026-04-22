import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { NotebookPen, X, Trash2, Plus, FolderPlus, ChevronRight, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const KEY = (badge) => `inspnav_quick_notes_${badge || "anon"}`;

function loadNotes(badge) {
  try {
    const raw = localStorage.getItem(KEY(badge));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveNotes(badge, notes) {
  try { localStorage.setItem(KEY(badge), JSON.stringify(notes)); } catch {}
}

/**
 * QuickNotesButton — a compact navy card that sits next to AI Search on the
 * dashboard. Tap opens a full-screen-friendly sheet where the user can jot
 * thoughts, see all pending notes, delete them, or attach them to an
 * existing/new inspection (appended to inspection.notes on the server).
 */
export function QuickNotesButton() {
  const { badge } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(() => loadNotes(badge));
  const [text, setText] = useState("");
  const [inspPickerFor, setInspPickerFor] = useState(null); // note to attach
  const [inspections, setInspections] = useState([]);
  const [loadingInsp, setLoadingInsp] = useState(false);
  const [creatingTitle, setCreatingTitle] = useState("");
  const [newInspInline, setNewInspInline] = useState(false);
  const taRef = useRef(null);

  useEffect(() => { setNotes(loadNotes(badge)); }, [badge]);
  useEffect(() => { saveNotes(badge, notes); }, [badge, notes]);

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (open) setTimeout(() => taRef.current?.focus(), 60);
  }, [open]);

  const addNote = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note = {
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: trimmed,
      created_at: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setText("");
    taRef.current?.focus();
  }, [text]);

  const removeNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));
  const clearAll = () => {
    if (notes.length === 0) return;
    if (window.confirm(`Delete all ${notes.length} quick notes?`)) setNotes([]);
  };

  const openPicker = async (note) => {
    setInspPickerFor(note);
    setLoadingInsp(true);
    try {
      const res = await axios.get(`${API}/inspections?badge=${badge}`);
      setInspections(res.data.inspections || []);
    } catch { toast.error("Failed to load inspections"); }
    setLoadingInsp(false);
  };

  const attachToInspection = async (inspectionId) => {
    if (!inspPickerFor) return;
    try {
      // Fetch current notes, append, PUT back
      const { data: insp } = await axios.get(`${API}/inspections/${inspectionId}`);
      const existing = (insp.notes || "").trim();
      const stamp = new Date(inspPickerFor.created_at).toLocaleString();
      const appended = `${existing ? existing + "\n\n" : ""}[Quick note · ${stamp}]\n${inspPickerFor.text}`;
      await axios.put(`${API}/inspections/${inspectionId}`, { notes: appended });
      removeNote(inspPickerFor.id);
      setInspPickerFor(null);
      toast.success("Added to inspection");
    } catch { toast.error("Failed to attach note"); }
  };

  const attachToNewInspection = async () => {
    if (!inspPickerFor) return;
    const title = (creatingTitle || `Quick notes · ${new Date().toLocaleDateString()}`).trim();
    try {
      const { data: created } = await axios.post(`${API}/inspections`, { title, badge });
      const stamp = new Date(inspPickerFor.created_at).toLocaleString();
      const notes = `[Quick note · ${stamp}]\n${inspPickerFor.text}`;
      await axios.put(`${API}/inspections/${created.id}`, { notes });
      removeNote(inspPickerFor.id);
      setInspPickerFor(null);
      setNewInspInline(false);
      setCreatingTitle("");
      toast.success(`Added to new inspection "${title}"`);
    } catch { toast.error("Failed to create inspection"); }
  };

  const handleKey = (e) => {
    // Cmd/Ctrl + Enter saves the note instantly.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      addNote();
    }
  };

  return (
    <>
      {/* Inline button — designed to sit next to the AI Search toggle */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 px-3 h-10 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] transition-colors flex-shrink-0"
        data-testid="quick-notes-btn"
        aria-label="Quick notes"
      >
        <NotebookPen className="w-4 h-4 text-[#D4AF37]" />
        <span className="text-xs font-semibold text-[#334155] whitespace-nowrap">Quick Notes</span>
        {notes.length > 0 && (
          <span
            className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4AF37] text-[#002855] text-[10px] font-black flex items-center justify-center"
            data-testid="quick-notes-count"
          >
            {notes.length}
          </span>
        )}
      </button>

      {/* Note capture + list dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[560px] w-[95vw] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="quick-notes-dialog">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
            <div className="flex items-center gap-2 text-white">
              <NotebookPen className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-sm font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                Quick Notes
                {notes.length > 0 && <span className="ml-2 text-[#8FAEC5] font-normal">· {notes.length}</span>}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-[#F8FAFC]">
            {/* Compose */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 mb-3">
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Jot a thought — carrier name, DOT#, something you noticed, follow-up items… Add to an inspection later."
                className="w-full h-32 resize-none text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none bg-transparent leading-relaxed"
                data-testid="quick-notes-input"
              />
              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                <p className="text-[10px] text-[#94A3B8]">
                  {text.length} chars · <span className="hidden sm:inline">⌘/Ctrl + Enter saves</span>
                </p>
                <Button
                  onClick={addNote}
                  disabled={!text.trim()}
                  size="sm"
                  className="bg-[#002855] text-white hover:bg-[#001a3a] h-8 text-xs disabled:opacity-40"
                  data-testid="save-quick-note-btn"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Save note
                </Button>
              </div>
            </div>

            {/* List */}
            {notes.length === 0 ? (
              <div className="text-center py-8 text-[11px] text-[#94A3B8] italic">
                No quick notes yet. Start typing above.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Saved notes</p>
                  <button onClick={clearAll} className="text-[10px] text-[#94A3B8] hover:text-[#DC2626]" data-testid="clear-quick-notes-btn">Clear all</button>
                </div>
                <div className="space-y-1.5">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-white rounded-md border border-[#E2E8F0] p-2.5" data-testid={`quick-note-${n.id}`}>
                      <p className="text-[13px] text-[#0F172A] whitespace-pre-wrap break-words">{n.text}</p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#F1F5F9]">
                        <span className="text-[10px] text-[#94A3B8]">
                          {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openPicker(n)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#D4AF37] text-[#002855] text-[10px] font-bold hover:bg-[#c9a432]"
                            data-testid={`attach-note-${n.id}`}
                          >
                            <FolderPlus className="w-3 h-3" /> Add to inspection
                          </button>
                          <button
                            onClick={() => removeNote(n.id)}
                            className="p-1 rounded-md text-[#CBD5E1] hover:text-[#DC2626] hover:bg-[#FEE2E2]"
                            title="Delete note"
                            data-testid={`delete-note-${n.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection picker sub-dialog */}
      <Dialog open={!!inspPickerFor} onOpenChange={(o) => { if (!o) { setInspPickerFor(null); setNewInspInline(false); setCreatingTitle(""); } }}>
        <DialogContent className="max-w-[480px] w-[95vw] max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="quick-notes-picker">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Add note to…</h2>
            <Button variant="ghost" size="sm" onClick={() => setInspPickerFor(null)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-[#F8FAFC]">
            {/* New inspection */}
            {newInspInline ? (
              <div className="bg-white rounded-lg border border-[#D4AF37] p-3 mb-2">
                <input
                  value={creatingTitle}
                  onChange={(e) => setCreatingTitle(e.target.value)}
                  placeholder="New inspection title"
                  autoFocus
                  className="w-full text-sm px-2 py-1.5 border border-[#E2E8F0] rounded-md outline-none focus:border-[#002855]"
                  data-testid="quick-notes-new-title"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={attachToNewInspection} className="flex-1 bg-[#002855] text-white h-8 text-xs" data-testid="quick-notes-create-insp">
                    <Check className="w-3.5 h-3.5 mr-1" /> Create & attach
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNewInspInline(false); setCreatingTitle(""); }} className="h-8 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNewInspInline(true)}
                className="w-full bg-[#FFFBEB] border border-[#D4AF37] rounded-lg px-3 py-2.5 mb-2 flex items-center gap-2 hover:bg-[#FEF3C7] transition-colors"
                data-testid="quick-notes-new-insp-btn"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm font-bold text-[#002855]">New inspection with this note</span>
              </button>
            )}

            {/* Existing list */}
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] px-1 mb-1.5">Existing inspections</p>
            {loadingInsp ? (
              <p className="text-center text-[11px] text-[#94A3B8] py-6">Loading…</p>
            ) : inspections.length === 0 ? (
              <p className="text-center text-[11px] text-[#94A3B8] italic py-6">No inspections yet — create one above.</p>
            ) : (
              <div className="space-y-1">
                {inspections.map((insp) => (
                  <button
                    key={insp.id}
                    onClick={() => attachToInspection(insp.id)}
                    className="w-full flex items-center gap-2 bg-white rounded-md border border-[#E2E8F0] p-2.5 text-left hover:border-[#002855]/40 hover:bg-[#F8FAFC] transition-colors"
                    data-testid={`quick-notes-attach-${insp.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#002855] truncate">{insp.title}</p>
                      <p className="text-[10px] text-[#64748B]">{insp.items?.length || 0} violations · {insp.created_at?.slice(0, 10)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1] flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
