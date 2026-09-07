import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Plus,
  ChevronLeft,
  Sparkles,
  Bookmark,
  Edit3,
  Check,
  Upload,
  Copy,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AIAssistant({ token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Saved prompts state
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPromptLabel, setNewPromptLabel] = useState("");
  const [newPromptText, setNewPromptText] = useState("");
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const dragCounter = useRef(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/ai/conversations`, { headers });
      setConversations(data);
    } catch { /* silent */ }
  }, [token]);  

  // Load saved prompts
  const loadPrompts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/ai/prompts`, { headers });
      setSavedPrompts(data);
    } catch { /* silent */ }
  }, [token]);  

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadPrompts();
    }
  }, [isOpen, loadConversations, loadPrompts]);

  const openConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    setShowHistory(false);
    setShowPrompts(false);
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/ai/conversations/${convId}`, { headers });
      setMessages(data.messages || []);
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [token]);  

  const startNewChat = useCallback(async () => {
    try {
      const { data } = await axios.post(`${API}/api/ai/conversations`, { title: null }, { headers });
      setActiveConvId(data.id);
      setMessages([]);
      setShowHistory(false);
      setShowPrompts(false);
      loadConversations();
    } catch {
      toast.error("Failed to start new chat");
    }
  }, [token, loadConversations]);  

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/api/ai/conversations/${convId}`, { headers });
      if (activeConvId === convId) { setActiveConvId(null); setMessages([]); }
      loadConversations();
    } catch { toast.error("Failed to delete"); }
  };

  // --- Image handling (file picker + drag-and-drop) ---
  const processFiles = async (files) => {
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name}: Only JPEG, PNG, WEBP allowed`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: Must be under 5MB`);
        continue;
      }
      const formData = new FormData();
      formData.append("file", file);
      try {
        const { data } = await axios.post(`${API}/api/ai/upload-image`, formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
        setPendingImages((prev) => [
          ...prev,
          { id: data.id, name: file.name, preview: URL.createObjectURL(file) },
        ]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag-and-drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) await processFiles(files);
  };

  const removePendingImage = (imgId) => {
    setPendingImages((prev) => {
      const img = prev.find((i) => i.id === imgId);
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== imgId);
    });
  };

  // --- Send message ---
  const sendMessage = async () => {
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;
    if (isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      try {
        const { data } = await axios.post(`${API}/api/ai/conversations`, { title: null }, { headers });
        convId = data.id;
        setActiveConvId(convId);
      } catch {
        toast.error("Failed to start conversation");
        return;
      }
    }

    const imageIds = pendingImages.map((i) => i.id);
    const userMsg = {
      role: "user",
      text: text || "(image attached)",
      image_ids: imageIds,
      _previews: pendingImages.map((i) => i.preview),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", text: "", timestamp: new Date().toISOString() }]);

    try {
      const response = await fetch(`${API}/api/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || "Describe this image and suggest a Vendoo listing.", image_ids: imageIds }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === "delta") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, text: last.text + payload.content };
                }
                return updated;
              });
            }
          } catch { /* partial chunk */ }
        }
      }
      loadConversations();
    } catch {
      toast.error("Failed to get response");
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.text) {
          updated[updated.length - 1] = { ...last, text: "Sorry, something went wrong. Please try again." };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // --- Saved prompts CRUD ---
  const saveNewPrompt = async () => {
    if (!newPromptLabel.trim() || !newPromptText.trim()) {
      toast.error("Both name and prompt text are required");
      return;
    }
    try {
      await axios.post(`${API}/api/ai/prompts`, {
        label: newPromptLabel.trim(),
        text: newPromptText.trim(),
      }, { headers });
      setNewPromptLabel("");
      setNewPromptText("");
      setIsAddingPrompt(false);
      loadPrompts();
      toast.success("Prompt saved!");
    } catch {
      toast.error("Failed to save prompt");
    }
  };

  const updatePrompt = async (promptId) => {
    try {
      await axios.put(`${API}/api/ai/prompts/${promptId}`, {
        label: editLabel.trim() || undefined,
        text: editText.trim() || undefined,
      }, { headers });
      setEditingPromptId(null);
      loadPrompts();
    } catch {
      toast.error("Failed to update");
    }
  };

  const deletePrompt = async (promptId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/api/ai/prompts/${promptId}`, { headers });
      loadPrompts();
    } catch {
      toast.error("Failed to delete prompt");
    }
  };

  const applyPrompt = (promptText) => {
    setInput(promptText);
    setShowPrompts(false);
    inputRef.current?.focus();
  };

  // Copy assistant message text
  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIdx(null), 2000);
    }).catch(() => toast.error("Failed to copy"));
  };

  // --- Render helpers ---
  const renderMessage = (msg, idx) => {
    const isUser = msg.role === "user";
    return (
      <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 group/msg`} data-testid={`chat-message-${idx}`}>
        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-emerald-600 text-white rounded-br-md" : "bg-white/10 text-white/90 rounded-bl-md"}`}>
          {isUser && msg._previews?.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {msg._previews.map((src, i) => (
                <img key={i} src={src} alt="attached" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
              ))}
            </div>
          )}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
          ) : (
            <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-emerald-300">
              {msg.text ? <ReactMarkdown>{msg.text}</ReactMarkdown> : (
                <span className="inline-flex items-center gap-1 text-white/50"><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] opacity-40">
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </p>
            {!isUser && msg.text && (
              <button
                onClick={() => copyMessage(msg.text, idx)}
                className="sm:opacity-0 sm:group-hover/msg:opacity-100 transition-opacity p-1 -mr-1 rounded hover:bg-white/10"
                title="Copy to clipboard"
                data-testid={`copy-message-${idx}`}
              >
                {copiedIdx === idx
                  ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  : <Copy className="w-3.5 h-3.5 text-white/40" />
                }
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Active view (not history, not prompts manager)
  const isActiveChat = !showHistory && !showPrompts;

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 flex items-center justify-center hover:bg-emerald-500 active:scale-95 transition-all"
            data-testid="ai-assistant-fab"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-outside backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/30"
              data-testid="ai-backdrop"
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-2 right-2 left-2 sm:left-auto sm:bottom-4 sm:right-4 sm:w-[440px] z-50 flex flex-col bg-[#0F1A2E] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
              style={{ maxHeight: "min(85vh, 640px)" }}
              data-testid="ai-assistant-panel"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0D1525] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                {(activeConvId || showHistory || showPrompts) && (
                  <button
                    onClick={() => {
                      if (showHistory || showPrompts) { setShowHistory(false); setShowPrompts(false); }
                      else { setActiveConvId(null); setMessages([]); }
                    }}
                    className="text-white/60 hover:text-white p-1"
                    data-testid="ai-back-btn"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold text-sm">
                  {showHistory ? "Chat History" : showPrompts ? "Saved Prompts" : "Listing Assistant"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setShowPrompts((v) => !v); setShowHistory(false); }}
                  className={`p-1.5 rounded-lg transition-colors ${showPrompts ? "text-emerald-400 bg-emerald-400/10" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                  title="Saved prompts"
                  data-testid="ai-prompts-btn"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setShowHistory((v) => !v); setShowPrompts(false); }}
                  className={`p-1.5 rounded-lg transition-colors ${showHistory ? "text-emerald-400 bg-emerald-400/10" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                  title="Chat history"
                  data-testid="ai-history-btn"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={startNewChat} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5" title="New chat" data-testid="ai-new-chat-btn">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5" data-testid="ai-close-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-4 relative">
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-10 bg-emerald-600/20 border-2 border-dashed border-emerald-400 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
                  <Upload className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-emerald-300 font-medium text-sm">Drop images here</p>
                  <p className="text-emerald-300/60 text-xs mt-1">JPEG, PNG, WEBP up to 5MB</p>
                </div>
              )}

              {showPrompts ? (
                /* ---- Saved Prompts Manager ---- */
                <div className="space-y-3">
                  {/* Add new prompt */}
                  {isAddingPrompt ? (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <input
                        value={newPromptLabel}
                        onChange={(e) => setNewPromptLabel(e.target.value)}
                        placeholder="Prompt name (e.g. 'Vintage Denim')"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40"
                        data-testid="new-prompt-label-input"
                      />
                      <textarea
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        placeholder="Prompt text that will be sent to the assistant..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-emerald-500/40"
                        data-testid="new-prompt-text-input"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setIsAddingPrompt(false); setNewPromptLabel(""); setNewPromptText(""); }} className="px-3 py-1.5 rounded-lg text-white/50 text-xs hover:bg-white/5">Cancel</button>
                        <button onClick={saveNewPrompt} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-500" data-testid="save-new-prompt-btn">Save</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingPrompt(true)}
                      className="w-full p-3 rounded-xl border border-dashed border-white/20 text-white/50 text-sm hover:border-emerald-500/40 hover:text-emerald-300 transition-colors flex items-center justify-center gap-2"
                      data-testid="add-prompt-btn"
                    >
                      <Plus className="w-4 h-4" /> Create New Prompt
                    </button>
                  )}

                  {savedPrompts.length === 0 && !isAddingPrompt && (
                    <p className="text-white/30 text-sm text-center mt-6">No saved prompts yet. Create one to use it with a single tap.</p>
                  )}

                  {savedPrompts.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors group" data-testid={`prompt-item-${p.id}`}>
                      {editingPromptId === p.id ? (
                        <div className="space-y-2">
                          <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/40" data-testid="edit-prompt-label-input" />
                          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm resize-none focus:outline-none focus:border-emerald-500/40" data-testid="edit-prompt-text-input" />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingPromptId(null)} className="px-2 py-1 text-white/40 text-xs hover:bg-white/5 rounded">Cancel</button>
                            <button onClick={() => updatePrompt(p.id)} className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-500" data-testid="confirm-edit-prompt-btn"><Check className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={() => applyPrompt(p.text)} className="text-left flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">{p.label}</p>
                              <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{p.text}</p>
                            </button>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingPromptId(p.id); setEditLabel(p.label); setEditText(p.text); }} className="p-1 text-white/30 hover:text-white" data-testid={`edit-prompt-${p.id}`}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => deletePrompt(p.id, e)} className="p-1 text-white/30 hover:text-red-400" data-testid={`delete-prompt-${p.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : showHistory ? (
                /* ---- Conversation list ---- */
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <p className="text-white/40 text-sm text-center mt-8">No conversations yet</p>
                  ) : conversations.map((c) => (
                    <div key={c.id} onClick={() => openConversation(c.id)} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group" data-testid={`conv-item-${c.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{c.title}</p>
                        <p className="text-white/40 text-xs mt-0.5">{new Date(c.updated_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={(e) => deleteConversation(c.id, e)} className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`conv-delete-${c.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : messages.length === 0 && !activeConvId ? (
                /* ---- Welcome ---- */
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-semibold text-base mb-1">Listing Assistant</h3>
                  <p className="text-white/50 text-sm mb-5 max-w-[300px]">
                    Drop a screenshot or describe an item. I'll write a Vendoo listing for you.
                  </p>

                  {/* Saved prompts shortcuts */}
                  {savedPrompts.length > 0 && (
                    <div className="w-full max-w-[320px] mb-4">
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Your prompts</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {savedPrompts.slice(0, 6).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => applyPrompt(p.text)}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500/30 transition-colors truncate max-w-[140px]"
                            data-testid={`welcome-prompt-${p.id}`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drop zone hint */}
                  <div className="w-full max-w-[300px] p-4 rounded-xl border border-dashed border-white/15 text-white/30 text-xs flex flex-col items-center gap-1.5">
                    <Upload className="w-5 h-5 text-white/20" />
                    Drag & drop screenshots here
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Pending images strip */}
            {pendingImages.length > 0 && (
              <div className="px-3 py-2 border-t border-white/5 flex gap-2 overflow-x-auto shrink-0">
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative shrink-0">
                    <img src={img.preview} alt={img.name} className="w-14 h-14 object-cover rounded-lg border border-white/10" />
                    <button onClick={() => removePendingImage(img.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area — large box */}
            {isActiveChat && (
              <div className="px-3 py-3 border-t border-white/10 bg-[#0D1525] shrink-0">
                {/* Saved prompt pills above input */}
                {savedPrompts.length > 0 && messages.length === 0 && !activeConvId ? null : savedPrompts.length > 0 ? (
                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                    {savedPrompts.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPrompt(p.text)}
                        className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-[11px] hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500/30 transition-colors whitespace-nowrap shrink-0"
                        data-testid={`input-prompt-${p.id}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your item, paste details, or drop a screenshot..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-emerald-500/40 overflow-y-auto"
                    data-testid="ai-message-input"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/jpeg,image/png,image/webp" multiple className="hidden" data-testid="ai-image-input" />
                      <button onClick={() => fileInputRef.current?.click()} className="text-white/40 hover:text-emerald-400 p-2 transition-colors rounded-lg hover:bg-white/5" title="Attach image" data-testid="ai-attach-btn">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <span className="text-white/20 text-[10px] hidden sm:inline">or drag & drop</span>
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={isStreaming || (!input.trim() && pendingImages.length === 0)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-30 hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2"
                      data-testid="ai-send-btn"
                    >
                      {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
