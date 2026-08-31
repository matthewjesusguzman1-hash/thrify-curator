import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Loader2, 
  User, 
  Users,
  Search,
  ChevronLeft,
  Briefcase,
  Package,
  Trash2,
  AlertTriangle,
  Check,
  CheckCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { triggerVibration } from "./WebPushSettings";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Polling interval for real-time updates (3 seconds)
const POLLING_INTERVAL = 3000;

/**
 * Full-screen messaging component for admin
 */
export default function AdminFullScreenMessaging({ 
  muted = false,
  onUnreadChange = () => {},
  currentAdminName = "Admin",
  theme = "light"
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const previousUnreadRef = useRef(0);

  const getToken = () => localStorage.getItem("token");

  // Fetch read receipts setting from backend on mount
  useEffect(() => {
    const fetchReadReceiptsSetting = async () => {
      const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
      if (!apiUrl) return;
      const token = getToken();
      if (!token) return;
      
      try {
        const response = await axios.get(`${apiUrl}/conversations/admin/read-receipts-setting`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReadReceiptsEnabled(response.data.read_receipts_enabled);
      } catch (error) {
        console.error("Failed to fetch read receipts setting:", error);
        // Default to true if fetch fails
        setReadReceiptsEnabled(true);
      }
    };
    fetchReadReceiptsSetting();
  }, []);

  // Toggle read receipts - saves to backend
  const toggleReadReceipts = async () => {
    const newValue = !readReceiptsEnabled;
    setReadReceiptsEnabled(newValue);
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
    try {
      await axios.post(`${apiUrl}/conversations/admin/read-receipts-setting?enabled=${newValue}`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
    } catch (error) {
      console.error("Failed to save read receipts setting:", error);
      // Revert on error
      setReadReceiptsEnabled(!newValue);
    }
  };

  // Check if user is scrolled to bottom
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 50;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const scrollToBottomIfNeeded = () => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  };

  const handleScroll = () => {
    isAtBottomRef.current = checkIfAtBottom();
  };

  const fetchConversations = useCallback(async () => {
    const token = getToken();
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
    if (!token || !apiUrl) return;
    
    try {
      const [convRes, countRes] = await Promise.all([
        axios.get(`${apiUrl}/conversations/admin/list`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiUrl}/conversations/admin/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setConversations(convRes.data);
      
      const newUnreadCount = countRes.data.unread_count;
      
      // Notify if new messages and not muted (only vibrate, no toast spam)
      if (newUnreadCount > previousUnreadRef.current && previousUnreadRef.current >= 0 && !muted) {
        triggerVibration([200, 100, 200]);
      }
      previousUnreadRef.current = newUnreadCount;
      onUnreadChange(newUnreadCount);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    }
  }, [muted, onUnreadChange]);

  const fetchSelectedConversation = useCallback(async (convId) => {
    const token = getToken();
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
    if (!token || !convId || !apiUrl) return;
    
    try {
      const res = await axios.get(`${apiUrl}/conversations/admin/conversation/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(res.data);
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  }, []);

  const selectedConversationIdRef = useRef(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id;
  }, [selectedConversation?.id]);

  useEffect(() => {
    fetchConversations();
    
    // Start polling every 2 seconds for instant messenger feel
    pollingRef.current = setInterval(() => {
      fetchConversations();
      // Use ref to get current selected conversation id
      if (selectedConversationIdRef.current) {
        fetchSelectedConversation(selectedConversationIdRef.current);
      }
    }, 2000); // 2 second polling for real-time feel
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchConversations, fetchSelectedConversation, muted]);

  // Check for pending conversation ID from push notification deep link
  useEffect(() => {
    const checkPendingConversation = async () => {
      const pendingId = localStorage.getItem('pendingConversationId');
      if (pendingId && conversations.length > 0) {
        localStorage.removeItem('pendingConversationId');
        // Find and select the conversation
        const conv = conversations.find(c => c.id === pendingId);
        if (conv) {
          handleSelectConversation(conv);
        }
      }
    };
    checkPendingConversation();
  }, [conversations]);

  // Scroll to bottom when messages change (if at bottom)
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [selectedConversation?.messages?.length]);

  // Scroll to bottom when selecting a new conversation
  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        scrollToBottom();
        isAtBottomRef.current = true;
      }, 100);
    }
  }, [selectedConversation?.id]);

  const handleSelectConversation = async (conv) => {
    const token = getToken();
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
    try {
      const res = await axios.get(`${apiUrl}/conversations/admin/conversation/${conv.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(res.data);
      
      // Scroll to bottom after a short delay
      setTimeout(() => {
        scrollToBottom();
        isAtBottomRef.current = true;
      }, 100);
    } catch (error) {
      console.error("Error selecting conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedConversation) return;
    
    setSending(true);
    const token = getToken();
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
    
    try {
      await axios.post(
        `${apiUrl}/conversations/admin/reply`,
        {
          conversation_id: selectedConversation.id,
          content: newMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNewMessage("");
      await fetchSelectedConversation(selectedConversation.id);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("Error sending reply:", error);
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

  const formatLastMessage = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format read receipt time
  const formatReadTime = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Delete conversation (soft delete)
  const handleDeleteConversation = async (conversationId, participantName) => {
    const token = getToken();
    const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
    try {
      await axios.delete(`${apiUrl}/conversations/admin/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Conversation with ${participantName} deleted`);
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const showDeleteConfirmation = (conv) => {
    setDeleteConfirmation(conv);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      await handleDeleteConversation(deleteConfirmation.id, deleteConfirmation.participant_name);
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.participant_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || conv.participant_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const messages = selectedConversation?.messages || [];
  
  // Theme classes
  const isLight = theme === 'light';

  return (
    <div className={`flex h-full ${isLight ? 'bg-white' : 'bg-[#1A1A2E]'}`} style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Conversation List - Left Panel */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 lg:w-[420px] xl:w-[480px] border-r ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
        {/* Search and Filter */}
        <div className={`p-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'} space-y-3`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className={`pl-10 ${!isLight ? 'bg-white/10 border-white/10 text-white placeholder-white/40' : ''}`}
            />
          </div>
          <div className="flex gap-2">
            {["all", "employee", "consignor"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : isLight 
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {type === "all" ? "All" : type === "employee" ? "Employees" : "Consignors"}
              </button>
            ))}
          </div>
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={`w-6 h-6 animate-spin ${isLight ? 'text-blue-500' : 'text-[#00D4FF]'}`} />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-32 ${isLight ? 'text-gray-400' : 'text-white/50'}`}>
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  isLight 
                    ? `border-gray-100 hover:bg-gray-50 ${selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`
                    : `border-white/5 hover:bg-white/5 ${selectedConversation?.id === conv.id ? 'bg-white/10 border-l-4 border-l-[#00D4FF]' : ''}`
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      conv.participant_type === 'employee' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    {conv.participant_type === 'employee' ? (
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Package className="w-6 h-6 text-purple-600" />
                    )}
                  </div>
                  
                  {/* Content */}
440|                  <div className="flex-1 min-w-0" onClick={() => handleSelectConversation(conv)}>
441|                    {/* Name and Badge Row */}
442|                    <div className="flex items-center gap-2 mb-1">
443|                      <p className={`font-semibold text-base ${isLight ? 'text-gray-900' : 'text-white'}`}>{conv.participant_name}</p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        conv.participant_type === 'employee' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {conv.participant_type === 'employee' ? 'Employee' : 'Consignor'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold ml-auto">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    
                    {/* Email */}
                    {conv.participant_email && (
                      <p className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{conv.participant_email}</p>
                    )}
                    
                    {/* Last Message Preview */}
                    {conv.last_message && (
                      <p className={`text-sm line-clamp-2 mt-2 ${isLight ? 'text-gray-600' : 'text-white/70'}`}>{conv.last_message}</p>
                    )}
                    
                    {/* Time */}
                    {conv.last_message_at && (
                      <p className={`text-xs mt-2 ${isLight ? 'text-gray-400' : 'text-white/40'}`}>{formatLastMessage(conv.last_message_at)}</p>
                    )}
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showDeleteConfirmation(conv);
                    }}
                    className={`p-2 hover:text-red-500 rounded-lg transition-colors flex-shrink-0 self-start ${isLight ? 'text-gray-400 hover:bg-red-50' : 'text-white/40 hover:bg-red-500/20'}`}
                    title="Delete thread"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Message View - Right Panel */}
      <div 
        className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-col ${isLight ? 'bg-white' : 'bg-[#1A1A2E]'}`}
        style={{ flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' }}
      >
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className={`p-4 border-b flex items-center gap-3 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <button
                onClick={() => setSelectedConversation(null)}
                className={`md:hidden p-2 rounded-lg ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
              >
                <ChevronLeft className={`w-5 h-5 ${isLight ? '' : 'text-white'}`} />
              </button>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedConversation.participant_type === 'employee' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                {selectedConversation.participant_type === 'employee' ? (
                  <Briefcase className="w-5 h-5 text-blue-600" />
                ) : (
                  <Package className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedConversation.participant_name}</p>
                <p className={`text-xs capitalize ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{selectedConversation.participant_type}</p>
              </div>
              {/* Read receipts toggle - controls if THEY see you read their messages */}
              <button
                onClick={toggleReadReceipts}
                className={`p-2 rounded-lg transition-colors ${
                  readReceiptsEnabled 
                    ? 'text-blue-500 hover:bg-blue-50' 
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={readReceiptsEnabled ? "They CAN see when you read their messages" : "They CANNOT see when you read their messages"}
              >
                {readReceiptsEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              {/* Delete button in header */}
              <button
                onClick={() => showDeleteConfirmation(selectedConversation)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 ${isLight ? 'bg-gray-50' : 'bg-[#1A1A2E]'}`}
              style={{ width: '100%' }}
            >
              {messages.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full ${isLight ? 'text-gray-400' : 'text-white/50'}`}>
                  <User className="w-12 h-12 mb-2 opacity-30" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex w-full ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 overflow-hidden ${
                        msg.sender_type === 'admin'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-sm'
                          : isLight 
                            ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
                            : 'bg-white/10 text-white rounded-tl-sm'
                      }`}
                      style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
                    >
                      {msg.sender_type === 'admin' && msg.sender_name && (
                        <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{msg.sender_name}</span>
                        </p>
                      )}
                      {msg.sender_type !== 'admin' && (
                        <p className={`text-xs mb-1 flex items-center gap-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{msg.sender_name}</span>
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-2 flex-wrap ${
                        msg.sender_type === 'admin' ? 'text-white/70' : isLight ? 'text-gray-400' : 'text-white/40'
                      }`}>
                        <span className="text-xs">{formatMessageTime(msg.sent_at)}</span>
                        {/* Read receipt indicator for admin messages - ALWAYS show to admin */}
                        {msg.sender_type === 'admin' && (
                          <span className="flex items-center ml-2 flex-shrink-0" title={msg.read_at ? `Seen ${formatReadTime(msg.read_at)}` : "Delivered"}>
                            {msg.read ? (
                              <>
                                <CheckCheck className="w-4 h-4 text-blue-300" />
                                <span className="text-xs ml-1 text-blue-300 font-medium">Read</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span className="text-xs ml-1">Sent</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Reply Input */}
            <form onSubmit={handleSendReply} className={`p-4 border-t ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#1A1A2E]'}`}>
              <div className="flex items-end gap-2" style={{ width: '100%' }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className={`rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base ${
                    isLight 
                      ? 'border border-gray-300 bg-white text-gray-900'
                      : 'border border-white/20 bg-white/10 text-white placeholder-white/40'
                  }`}
                  style={{ flex: 1, minWidth: 0, minHeight: '40px', maxHeight: '150px', lineHeight: '1.4' }}
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 rounded-full w-10 h-10 p-0"
                  style={{ flexShrink: 0 }}
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${isLight ? 'text-gray-400' : 'text-white/50'}`}>
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm">Choose from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">Delete Conversation?</h3>
                  <p className="text-sm text-gray-500">This action can be undone by admin</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the conversation with{' '}
                <span className="font-semibold">{deleteConfirmation.participant_name}</span>?
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={cancelDelete}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={confirmDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
