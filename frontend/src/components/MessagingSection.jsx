import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Loader2, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Messaging component for employees and consignors to chat with admin
 * @param {string} userType - "employee" or "consignor"
 * @param {string} userId - User ID (email for consignors, id for employees)
 * @param {string} userName - Display name of the user
 * @param {string} userEmail - Email of the user
 * @param {function} getAuthHeader - Function to get auth header (for employees)
 */
export default function MessagingSection({ 
  userType, 
  userId, 
  userName, 
  userEmail,
  getAuthHeader = () => ({})
}) {
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (expanded) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [conversation?.messages, expanded]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      let response;
      
      if (userType === "employee") {
        response = await axios.get(
          `${API}/conversations/employee/my-conversation`,
          getAuthHeader()
        );
      } else {
        response = await axios.get(
          `${API}/conversations/consignor/my-conversation?email=${encodeURIComponent(userEmail)}`
        );
      }
      
      setConversation(response.data);
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      // Don't show error toast for initial load - conversation might not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && expanded) {
      fetchConversation();
    }
  }, [userId, userType, expanded]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      if (userType === "employee") {
        await axios.post(
          `${API}/conversations/employee/send`,
          { content: newMessage.trim(), sender_name: userName },
          getAuthHeader()
        );
      } else {
        await axios.post(
          `${API}/conversations/consignor/send?email=${encodeURIComponent(userEmail)}`,
          { content: newMessage.trim(), sender_name: userName }
        );
      }
      
      setNewMessage("");
      await fetchConversation();
      toast.success("Message sent!");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDateSeparator = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
      return "Today";
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    }
  };

  const getDateKey = (isoString) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const messages = conversation?.messages || [];
  const unreadCount = messages.filter(m => m.sender_type === "admin" && !m.read).length;

  return (
    <div className="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        data-testid="messaging-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">Messages</h3>
            <p className="text-white/50 text-sm">
              {messages.length === 0 
                ? "Chat with admin" 
                : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-white/50 transition-transform ${expanded ? "rotate-180" : ""}`} 
          />
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            {/* Messages area */}
            <div className="h-64 overflow-y-auto p-4 space-y-3" data-testid="messages-container">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-white/20 mb-2" />
                  <p className="text-white/50 text-sm">No messages yet</p>
                  <p className="text-white/30 text-xs">Send a message to start a conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const prevMsg = messages[index - 1];
                    const showDateSeparator = !prevMsg || getDateKey(msg.sent_at) !== getDateKey(prevMsg.sent_at);
                    
                    return (
                      <div key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-white/20"></div>
                            <span className="text-xs font-medium text-white/60 bg-white/10 px-3 py-1 rounded-full">
                              {formatDateSeparator(msg.sent_at)}
                            </span>
                            <div className="flex-1 h-px bg-white/20"></div>
                          </div>
                        )}
                        <div className={`flex ${msg.sender_type === "admin" ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                              msg.sender_type === "admin"
                                ? "bg-white/10 text-white rounded-tl-sm"
                                : "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-sm"
                            }`}
                          >
                            {msg.sender_type === "admin" && (
                              <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Admin
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_type === "admin" ? "text-white/40" : "text-white/70"
                            }`}>
                              {formatMessageTime(msg.sent_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
                  disabled={sending}
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white rounded-xl px-4"
                  data-testid="send-message-btn"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
