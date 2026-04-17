import { useState, useEffect, useCallback } from "react";
import { MessageSquarePlus, Pencil, Trash2, X, Send } from "lucide-react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export function NotesPanel({ open, onClose }) {
  const { badge } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newText, setNewText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {}
  }, []);

  useEffect(() => { if (open) fetchNotes(); }, [open, fetchNotes]);

  const addNote = async () => {
    const text = newText.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge, text }),
      });
      if (res.ok) {
        setNewText("");
        fetchNotes();
      } else toast.error("Failed to add note");
    } catch { toast.error("Connection error"); }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editText.trim() || !editId) return;
    try {
      const res = await fetch(`${API}/api/notes/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge, text: editText.trim() }),
      });
      if (res.ok) {
        setEditId(null);
        setEditText("");
        fetchNotes();
      } else toast.error("Failed to update");
    } catch { toast.error("Connection error"); }
  };

  const deleteNote = async (id) => {
    try {
      const res = await fetch(`${API}/api/notes/${id}?badge=${badge}`, { method: "DELETE" });
      if (res.ok) fetchNotes();
      else toast.error("Failed to delete");
    } catch { toast.error("Connection error"); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-[#E2E8F0] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="notes-panel"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white">Test Notes</h3>
            <span className="text-[10px] text-white/40">{notes.length} notes</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1" data-testid="close-notes">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add note */}
        <div className="px-4 pt-3 pb-2 border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              placeholder="Add a test note or feedback..."
              rows={2}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:ring-1 focus:ring-[#002855] outline-none resize-none"
              data-testid="new-note-input"
            />
            <button
              onClick={addNote}
              disabled={!newText.trim() || loading}
              className="self-end px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] disabled:opacity-40 hover:bg-[#c9a432] transition-colors"
              data-testid="add-note-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[9px] text-[#94A3B8] mt-1">Posting as Badge #{badge}</p>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notes.length === 0 ? (
            <p className="text-xs text-[#94A3B8] text-center py-8">No notes yet. Be the first to add feedback.</p>
          ) : (
            notes.map((note) => {
              const isMine = note.badge === badge;
              const isEditing = editId === note.id;
              return (
                <div
                  key={note.id}
                  className={`rounded-lg p-3 ${isMine ? "bg-[#002855]/5 border border-[#002855]/10" : "bg-[#F8FAFC] border border-[#E2E8F0]"}`}
                  data-testid={`note-${note.id}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isMine ? "bg-[#D4AF37]/20 text-[#002855]" : "bg-[#E2E8F0] text-[#64748B]"}`}>
                        #{note.badge}
                      </span>
                      {isMine && <span className="text-[9px] text-[#D4AF37]">you</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[#94A3B8]">
                        {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMine && !isEditing && (
                        <>
                          <button
                            onClick={() => { setEditId(note.id); setEditText(note.text); }}
                            className="p-0.5 text-[#94A3B8] hover:text-[#002855] transition-colors"
                            data-testid={`edit-note-${note.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="p-0.5 text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                            data-testid={`delete-note-${note.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } }}
                        rows={2}
                        autoFocus
                        className="w-full px-2.5 py-2 text-xs rounded-md border border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none resize-none"
                        data-testid={`edit-note-input-${note.id}`}
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => setEditId(null)} className="text-[10px] px-2 py-1 rounded bg-[#F1F5F9] text-[#64748B]">Cancel</button>
                        <button onClick={saveEdit} className="text-[10px] px-2 py-1 rounded bg-[#D4AF37] text-[#002855] font-bold" data-testid={`save-edit-${note.id}`}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#334155] whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
