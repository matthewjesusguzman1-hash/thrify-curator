import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { triggerVibration } from "./WebPushSettings";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Polling interval for real-time updates (3 seconds)
const POLLING_INTERVAL = 3000;

/**
 * Full-screen messaging component for employees and consignors
 */
export default function FullScreenMessaging({ 
  userType, 
  userId, 
  userName, 
  userEmail,
  getAuthHeader = () => ({}),
  muted = false,
  onUnreadChange = () => {},
  theme = "light" // "light" or "dark"
}) {
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  // Check if user is scrolled to bottom
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 50;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  const scrollToBottomIfNeeded = () => {
    if (isAtBottomRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    isAtBottomRef.current = checkIfAtBottom();
  };

  const fetchConversation = async () => {
    try {
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
      
      // Update unread count
      const messages = response.data?.messages || [];
      const unread = messages.filter(m => m.sender_type === 'admin' && !m.read).length;
      onUnreadChange(unread);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    
    // Initial scroll to bottom
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        isAtBottomRef.current = true;
      }
    }, 100);
    
    // Start polling
    pollingRef.current = setInterval(async () => {
      try {
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
        
        const newMessages = response.data?.messages || [];
        const adminMessages = newMessages.filter(m => m.sender_type === "admin");
        
        // Check if there's a new admin message
        if (adminMessages.length > previousMessageCountRef.current && !muted) {
          const latestAdmin = adminMessages[adminMessages.length - 1];
          toast.info(`New message from ${latestAdmin.sender_name || "Admin"}`, {
            description: latestAdmin.content.substring(0, 50) + (latestAdmin.content.length > 50 ? "..." : "")
          });
          triggerVibration([200, 100, 200]);
        }
        previousMessageCountRef.current = adminMessages.length;
        
        // Update unread count
        const unread = newMessages.filter(m => m.sender_type === 'admin' && !m.read).length;
        onUnreadChange(unread);
        
        setConversation(response.data);
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, POLLING_INTERVAL);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [userId, userType, muted]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [conversation?.messages?.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      if (userType === "employee") {
        await axios.post(
          `${API}/conversations/employee/send`,
          { content: newMessage },
          getAuthHeader()
        );
      } else {
        await axios.post(
          `${API}/conversations/consignor/send`,
          { 
            email: userEmail,
            name: userName,
            content: newMessage 
          }
        );
      }
      setNewMessage("");
      await fetchConversation();
      
      // Scroll to bottom after sending
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const messages = conversation?.messages || [];
  
  // Theme classes
  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col h-full ${isLight ? 'bg-white' : 'bg-[#1A1A2E]'}`}>
      {/* Messages area - takes remaining space */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {/* Constrain messages to max width on desktop for better readability */}
        <div className="max-w-2xl mx-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-[#1A1A2E]' : 'text-[#00D4FF]'}`} />
            </div>
          ) : messages.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full min-h-[200px] ${isLight ? 'text-gray-400' : 'text-white/50'}`}>
              <User className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.sender_type === 'admin'
                      ? isLight 
                        ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                        : 'bg-white/10 text-white rounded-tl-sm'
                      : 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white rounded-tr-sm'
                  }`}
                >
                  {msg.sender_type === "admin" && (
                    <p className={`text-xs mb-1 flex items-center gap-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                      <User className="w-3 h-3" />
                      {msg.sender_name || "Admin"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-2 ${
                    msg.sender_type === 'admin' 
                      ? isLight ? 'text-gray-400' : 'text-white/40'
                      : 'text-white/70'
                  }`}>
                    {formatMessageTime(msg.sent_at)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      
      {/* Message input - fixed at bottom */}
      <form onSubmit={handleSendMessage} className={`p-4 border-t ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#1A1A2E]'}`}>
        {/* Constrain input to same max width as messages */}
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            rows={3}
            className={`w-full rounded-xl px-4 py-3 focus:outline-none resize-none ${
              isLight 
                ? 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-[#00D4FF]/50'
                : 'bg-white/10 border border-white/10 text-white placeholder-white/40 focus:border-[#00D4FF]/50'
            }`}
            disabled={sending}
            data-testid="fullscreen-message-input"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:opacity-90 text-white rounded-xl px-6"
              data-testid="fullscreen-send-btn"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
