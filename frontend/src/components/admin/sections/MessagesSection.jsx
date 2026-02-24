import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MessagesSection() {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const getToken = () => localStorage.getItem("token");

  const fetchMessages = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [messagesRes, countRes] = await Promise.all([
        axios.get(`${API}/messages/admin/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/messages/admin/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setMessages(messagesRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount and poll every 30 seconds
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    const fetchUnreadCount = async () => {
      try {
        const res = await axios.get(`${API}/messages/admin/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCount(res.data.unread_count);
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    const pollInterval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  // Fetch full messages when section is expanded
  useEffect(() => {
    if (showSection) {
      fetchMessages();
    }
  }, [showSection, fetchMessages]);

  const handleMarkAsRead = async (messageId) => {
    const token = getToken();
    try {
      await axios.put(
        `${API}/messages/admin/${messageId}/status`,
        { status: "read" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "read" } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to update message status");
    }
  };

  const handleDelete = async (messageId) => {
    const token = getToken();
    setDeletingId(messageId);
    try {
      await axios.delete(`${API}/messages/admin/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const deletedMessage = messages.find(m => m.id === messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (deletedMessage?.status === "unread") {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReply = (message) => {
    // Create mailto link with prepopulated content
    const subject = encodeURIComponent(`Re: Your Message to Thrifty Curator`);
    const body = encodeURIComponent(
      `Hi ${message.sender_name},\n\n` +
      `Thank you for reaching out to Thrifty Curator! We appreciate you taking the time to contact us.\n\n` +
      `Regarding your message:\n` +
      `"${message.message}"\n\n` +
      `[Your response here]\n\n` +
      `Best regards,\n` +
      `Thrifty Curator Team`
    );
    
    window.location.href = `mailto:${message.sender_email}?subject=${subject}&body=${body}`;
    
    // Mark as read when replying
    if (message.status === "unread") {
      handleMarkAsRead(message.id);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard-card" data-testid="messages-section">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowSection(!showSection)}
        data-testid="messages-section-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#FF1493] to-[#E91E8C] rounded-xl flex items-center justify-center relative">
            <MessageCircle className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Messages</h2>
            <p className="text-sm text-[#888]">
              {unreadCount > 0 ? (
                <span className="text-[#FF1493] font-medium">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</span>
              ) : (
                <span>{messages.length} total message{messages.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fetchMessages();
            }}
            disabled={loading}
            className="text-[#888] hover:text-[#666]"
            data-testid="refresh-messages-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
          {showSection ? (
            <ChevronUp className="w-5 h-5 text-[#888]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#888]" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSection && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#eee]">
              {loading && messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF1493] mx-auto"></div>
                  <p className="text-[#888] mt-2">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#FFF5F8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-[#FF1493]/50" />
                  </div>
                  <p className="text-[#888] font-medium">No messages yet</p>
                  <p className="text-sm text-[#aaa] mt-1">Messages from visitors will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`p-4 rounded-xl border transition-all ${
                        message.status === 'unread' 
                          ? 'bg-[#FFF5F8] border-[#FF1493]/30' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      data-testid={`message-item-${message.id}`}
                    >
                      {/* Message Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                            message.status === 'unread' 
                              ? 'bg-[#FF1493] text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {message.sender_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#333]">{message.sender_name}</p>
                              {message.status === 'unread' && (
                                <span className="px-2 py-0.5 bg-[#FF1493] text-white text-xs rounded-full font-medium">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#888] flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {message.sender_email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#888] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(message.submitted_at)}
                          </p>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="bg-white rounded-lg p-3 mb-3 border border-gray-100">
                        <p className="text-[#333] text-sm whitespace-pre-wrap">{message.message}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleReply(message)}
                            size="sm"
                            className="bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white hover:opacity-90"
                            data-testid={`reply-message-${message.id}`}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Reply via Email
                          </Button>
                          {message.status === 'unread' && (
                            <Button
                              onClick={() => handleMarkAsRead(message.id)}
                              variant="outline"
                              size="sm"
                              className="text-[#888] hover:text-[#666]"
                              data-testid={`mark-read-${message.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                        </div>
                        <Button
                          onClick={() => handleDelete(message.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deletingId === message.id}
                          data-testid={`delete-message-${message.id}`}
                        >
                          {deletingId === message.id ? (
                            <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
