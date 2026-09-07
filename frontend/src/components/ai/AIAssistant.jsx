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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AIAssistant({ token, userName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/ai/conversations`, { headers });
      setConversations(data);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) loadConversations();
  }, [isOpen, loadConversations]);

  // Load a conversation's messages
  const openConversation = useCallback(
    async (convId) => {
      setActiveConvId(convId);
      setShowHistory(false);
      setIsLoading(true);
      try {
        const { data } = await axios.get(`${API}/api/ai/conversations/${convId}`, { headers });
        setMessages(data.messages || []);
      } catch {
        toast.error("Failed to load conversation");
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // Start new conversation
  const startNewChat = useCallback(async () => {
    try {
      const { data } = await axios.post(
        `${API}/api/ai/conversations`,
        { title: null },
        { headers }
      );
      setActiveConvId(data.id);
      setMessages([]);
      setShowHistory(false);
      loadConversations();
    } catch {
      toast.error("Failed to start new chat");
    }
  }, [token, loadConversations]);

  // Delete conversation
  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/api/ai/conversations/${convId}`, { headers });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      loadConversations();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Upload image
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove pending image
  const removePendingImage = (imgId) => {
    setPendingImages((prev) => {
      const img = prev.find((i) => i.id === imgId);
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== imgId);
    });
  };

  // Send message with streaming
  const sendMessage = async () => {
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;
    if (isStreaming) return;

    // Auto-create conversation if none active
    let convId = activeConvId;
    if (!convId) {
      try {
        const { data } = await axios.post(
          `${API}/api/ai/conversations`,
          { title: null },
          { headers }
        );
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

    // Add placeholder for assistant
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", timestamp: new Date().toISOString() },
    ]);

    try {
      const response = await fetch(`${API}/api/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || "Describe this image and suggest a listing.", image_ids: imageIds }),
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
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      loadConversations();
    } catch (err) {
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

  const quickActions = [
    { label: "eBay Listing", prompt: "Help me create an eBay listing for this item." },
    { label: "Poshmark", prompt: "Write a Poshmark listing description for this item." },
    { label: "Mercari", prompt: "Create a Mercari listing for this item." },
    { label: "Depop", prompt: "Write a trendy Depop listing for this item." },
    { label: "FB Marketplace", prompt: "Create a Facebook Marketplace listing for this item." },
  ];

  const handleQuickAction = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // ---- Render ----

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === "user";
    return (
      <div
        key={idx}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
        data-testid={`chat-message-${idx}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-emerald-600 text-white rounded-br-md"
              : "bg-white/10 text-white/90 rounded-bl-md"
          }`}
        >
          {/* Show image previews for user messages */}
          {isUser && msg._previews?.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {msg._previews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="attached"
                  className="w-16 h-16 object-cover rounded-lg border border-white/20"
                />
              ))}
            </div>
          )}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
          ) : (
            <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-emerald-300">
              {msg.text ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                <span className="inline-flex items-center gap-1 text-white/50">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                </span>
              )}
            </div>
          )}
          <p className="text-[10px] mt-1 opacity-40">
            {msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating trigger button */}
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

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] sm:h-[600px] z-50 flex flex-col bg-[#0F1A2E] sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            data-testid="ai-assistant-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0D1525] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                {(activeConvId || showHistory) && (
                  <button
                    onClick={() => {
                      if (showHistory) {
                        setShowHistory(false);
                      } else {
                        setActiveConvId(null);
                        setMessages([]);
                        setShowHistory(true);
                      }
                    }}
                    className="text-white/60 hover:text-white p-1"
                    data-testid="ai-back-btn"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold text-sm">
                  {showHistory ? "Chat History" : "Listing Assistant"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                  title="Chat history"
                  data-testid="ai-history-btn"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={startNewChat}
                  className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                  title="New chat"
                  data-testid="ai-new-chat-btn"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                  data-testid="ai-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {showHistory ? (
                /* Conversation list */
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <p className="text-white/40 text-sm text-center mt-8">No conversations yet</p>
                  ) : (
                    conversations.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => openConversation(c.id)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                        data-testid={`conv-item-${c.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{c.title}</p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {new Date(c.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(c.id, e)}
                          className="text-white/20 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`conv-delete-${c.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : messages.length === 0 && !activeConvId ? (
                /* Welcome / quick actions */
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-semibold text-base mb-1">Listing Assistant</h3>
                  <p className="text-white/50 text-sm mb-6 max-w-[280px]">
                    Upload a product photo or describe an item. I'll help you write listings for any marketplace.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickActions.map((qa) => (
                      <button
                        key={qa.label}
                        onClick={() => handleQuickAction(qa.prompt)}
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500/30 transition-colors"
                        data-testid={`quick-action-${qa.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
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
                    <img
                      src={img.preview}
                      alt={img.name}
                      className="w-12 h-12 object-cover rounded-lg border border-white/10"
                    />
                    <button
                      onClick={() => removePendingImage(img.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            {!showHistory && (
              <div className="px-3 py-3 border-t border-white/10 bg-[#0D1525] shrink-0">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    data-testid="ai-image-input"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white/40 hover:text-emerald-400 p-2 shrink-0 transition-colors"
                    title="Attach image"
                    data-testid="ai-attach-btn"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your item or ask a question..."
                    rows={1}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-emerald-500/40 max-h-24 overflow-y-auto"
                    data-testid="ai-message-input"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isStreaming || (!input.trim() && pendingImages.length === 0)}
                    className="p-2.5 rounded-xl bg-emerald-600 text-white disabled:opacity-30 hover:bg-emerald-500 active:scale-95 transition-all shrink-0"
                    data-testid="ai-send-btn"
                  >
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
