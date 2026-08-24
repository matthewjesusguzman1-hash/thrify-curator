import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  ChevronDown, 
  ChevronUp, 
  Send,
  User,
  Users,
  RefreshCw,
  Search,
  X,
  Briefcase,
  Package,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { triggerVibration } from "@/components/WebPushSettings";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Polling interval for real-time updates (3 seconds for instant messaging feel)
const POLLING_INTERVAL = 3000;

// Local storage key for read receipts preference
const READ_RECEIPTS_KEY = "admin_read_receipts_enabled";

// Swipeable Conversation Item Component with visible delete button for iOS
function SwipeableConversationItem({ conv, isSelected, onSelect, onDelete, formatMessageTime }) {
  const [showDelete, setShowDelete] = useState(false);
  
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(conv);
    setShowDelete(false);
  };
  
  const handleCardClick = () => {
    if (showDelete) {
      setShowDelete(false);
    } else {
      onSelect(conv);
    }
  };
  
  // Long press to reveal delete
  const handleLongPress = (e) => {
    e.preventDefault();
    setShowDelete(true);
  };

  return (
    <div className="relative overflow-hidden rounded-xl" data-testid={`conversation-item-${conv.id}`}>
      {/* Delete button that slides in */}
      <AnimatePresence>
        {showDelete && (
          <motion.div 
            initial={{ x: -80 }}
            animate={{ x: 0 }}
            exit={{ x: -80 }}
            className="absolute inset-y-0 left-0 w-20 bg-red-500 flex items-center justify-center rounded-l-xl z-10"
          >
            <button
              onClick={handleDeleteClick}
              className="flex flex-col items-center text-white p-2"
              data-testid={`delete-thread-btn-${conv.id}`}
            >
              <Trash2 className="w-6 h-6" />
              <span className="text-xs mt-1">Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Conversation card */}
      <motion.div
        onClick={handleCardClick}
        onContextMenu={handleLongPress}
        animate={{ x: showDelete ? 80 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`relative p-3 cursor-pointer transition-colors border ${
          isSelected
            ? 'bg-blue-50 border-blue-300'
            : conv.unread_count > 0
              ? 'bg-blue-50/50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
        } rounded-xl`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
            conv.participant_type === 'employee' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-amber-500 to-orange-600'
          }`}>
            {conv.participant_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#333] truncate">{conv.participant_name}</p>
              {conv.unread_count > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium flex-shrink-0">
                  {conv.unread_count}
                </span>
              )}
            </div>
            <p className="text-xs text-[#888] truncate">{conv.last_message}</p>
          </div>
          {/* Delete icon button - always visible */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv);
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            title="Delete thread"
            data-testid={`delete-icon-${conv.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              conv.participant_type === 'employee'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {conv.participant_type === 'employee' ? 'Employee' : 'Consignor'}
            </span>
            <span className="text-xs text-[#888] truncate">{conv.participant_email}</span>
          </div>
          <span className="text-xs text-[#888] flex-shrink-0">
            {formatMessageTime(conv.last_message_at)}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConversationsSection() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, employee, consignor
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { conv: conversation } or null
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(() => {
    const stored = localStorage.getItem(READ_RECEIPTS_KEY);
    return stored === null ? true : stored === "true";
  });
  const pollingRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const previousUnreadRef = useRef(0);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const getToken = () => localStorage.getItem("token");

  // Toggle read receipts
  const toggleReadReceipts = () => {
    const newValue = !readReceiptsEnabled;
    setReadReceiptsEnabled(newValue);
    localStorage.setItem(READ_RECEIPTS_KEY, String(newValue));
    toast.success(newValue ? "Read receipts enabled" : "Read receipts disabled");
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

  // Smart auto-scroll - only scroll if user is already at the bottom
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
  
  const handleMessagesScroll = () => {
    isAtBottomRef.current = checkIfAtBottom();
  };
  
  // Scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [selectedConversation?.messages?.length]);
  
  // Scroll to bottom when selecting a new conversation
  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          isAtBottomRef.current = true;
        }
      }, 100);
    }
  }, [selectedConversation?.id]);

  const fetchConversations = useCallback(async () => {
    const token = getToken();
    if (!token) {
      console.log("ConversationsSection: No token available");
      return;
    }
    setLoading(true);
    console.log("ConversationsSection: Fetching conversations...");
    try {
      const [convRes, countRes] = await Promise.all([
        axios.get(`${API}/conversations/admin/list`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/conversations/admin/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      console.log("ConversationsSection: Got", convRes.data.length, "conversations");
      setConversations(convRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      console.error("Response:", error.response?.data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch conversations on component mount and start continuous polling
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.log("ConversationsSection: No token on mount");
      return;
    }
    
    console.log("ConversationsSection: Component mounted, starting continuous polling...");
    
    // Fetch immediately on mount
    fetchConversations();
    
    // Start continuous polling for real-time messaging feel
    pollingRef.current = setInterval(async () => {
      const currentToken = getToken();
      if (!currentToken) return;
      
      try {
        // Fetch conversation list
        const [convRes, countRes] = await Promise.all([
          axios.get(`${API}/conversations/admin/list`, {
            headers: { Authorization: `Bearer ${currentToken}` }
          }),
          axios.get(`${API}/conversations/admin/unread-count`, {
            headers: { Authorization: `Bearer ${currentToken}` }
          })
        ]);
        
        setConversations(convRes.data);
        
        // Check if there are new unread messages (silent notification - no toast)
        const newUnreadCount = countRes.data.unread_count;
        if (newUnreadCount > previousUnreadRef.current && previousUnreadRef.current >= 0) {
          // Vibrate device if enabled
          triggerVibration([200, 100, 200]);
        }
        previousUnreadRef.current = newUnreadCount;
        setUnreadCount(newUnreadCount);
        
        // Also refresh the selected conversation if one is open
        if (selectedConversationRef.current) {
          const convRes = await axios.get(
            `${API}/conversations/admin/conversation/${selectedConversationRef.current}`,
            { headers: { Authorization: `Bearer ${currentToken}` } }
          );
          setSelectedConversation(convRes.data);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, POLLING_INTERVAL);
    
    return () => {
      // Clean up polling on unmount
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []); // Run only once on mount

  // Also fetch when section is expanded
  useEffect(() => {
    if (showSection) {
      console.log("ConversationsSection: Section expanded, refreshing...");
      fetchConversations();
    }
  }, [showSection]);

  const handleSelectConversation = async (conv) => {
    const token = getToken();
    try {
      const res = await axios.get(`${API}/conversations/admin/conversation/${conv.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(res.data);
      selectedConversationRef.current = conv.id; // Track for polling
      
      // Scroll to bottom when opening a conversation
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          isAtBottomRef.current = true;
        }
      }, 100);
      
      // Update local unread count
      const convUnread = conversations.find(c => c.id === conv.id)?.unread_count || 0;
      if (convUnread > 0) {
        setUnreadCount(prev => Math.max(0, prev - convUnread));
        setConversations(prev => 
          prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
        );
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedConversation) return;

    const token = getToken();
    setSending(true);
    try {
      await axios.post(
        `${API}/conversations/admin/reply`,
        { 
          conversation_id: selectedConversation.id,
          content: newMessage.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNewMessage("");
      
      // Refresh the conversation
      const res = await axios.get(`${API}/conversations/admin/conversation/${selectedConversation.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(res.data);
      
      // Update conversation list
      fetchConversations();
      
      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (conversationId, participantName) => {
    // This is called after confirmation
    const token = getToken();
    try {
      await axios.delete(`${API}/conversations/admin/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Conversation with ${participantName} deleted`);
      
      // Clear selection if this was the selected conversation
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        selectedConversationRef.current = null;
      }
      
      // Refresh conversation list
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  // Show delete confirmation dialog
  const showDeleteConfirmation = (conv) => {
    setDeleteConfirmation(conv);
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (deleteConfirmation) {
      await handleDeleteConversation(deleteConfirmation.id, deleteConfirmation.participant_name);
      setDeleteConfirmation(null);
    }
  };

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  // Delete a single message (admin can only delete their own messages)
  const handleDeleteMessage = async (messageId) => {
    if (!selectedConversation) return;
    
    const token = getToken();
    try {
      await axios.delete(
        `${API}/conversations/admin/message/${selectedConversation.id}/${messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Message deleted");
      
      // Refresh the conversation to get updated messages
      const res = await axios.get(`${API}/conversations/admin/conversation/${selectedConversation.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedConversation(res.data);
    } catch (error) {
      console.error("Error deleting message:", error);
      const errorMsg = error.response?.data?.detail || "Failed to delete message";
      toast.error(errorMsg);
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

  const filteredConversations = conversations.filter(conv => {
    // Type filter
    if (filterType !== "all" && conv.participant_type !== filterType) return false;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        conv.participant_name.toLowerCase().includes(query) ||
        conv.participant_email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="dashboard-card" data-testid="conversations-section">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowSection(!showSection)}
        data-testid="conversations-section-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center relative">
            <Users className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Conversations</h2>
            <p className="text-sm text-[#888]">
              {unreadCount > 0 ? (
                <span className="text-blue-500 font-medium">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</span>
              ) : (
                <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#eee]">
              {/* Filter and Search Bar */}
              <div className="mb-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Type Filter */}
                  <div className="flex gap-1">
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("all")}
                      className={filterType === "all" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterType === "employee" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("employee")}
                      className={filterType === "employee" ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      <Briefcase className="w-4 h-4 mr-1" />
                      Employees
                    </Button>
                    <Button
                      variant={filterType === "consignor" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("consignor")}
                      className={filterType === "consignor" ? "bg-amber-500 hover:bg-amber-600" : ""}
                    >
                      <Package className="w-4 h-4 mr-1" />
                      Consignors
                    </Button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <Input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 h-9 border-[#ddd] focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#666]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Two-panel layout on desktop */}
              <div className="flex flex-col lg:flex-row gap-4 min-h-[400px]">
                {/* Conversation List */}
                <div className={`${selectedConversation ? 'hidden lg:block' : ''} lg:w-1/3 space-y-2 overflow-y-auto max-h-[400px]`}>
                  {loading && conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-[#888] mt-2">Loading...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-[#ccc] mx-auto mb-2" />
                      <p className="text-[#888]">
                        {conversations.length === 0 
                          ? "No conversations yet"
                          : "No conversations match your filters"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {filteredConversations.map((conv) => (
                        <SwipeableConversationItem
                          key={conv.id}
                          conv={conv}
                          isSelected={selectedConversation?.id === conv.id}
                          onSelect={handleSelectConversation}
                          onDelete={showDeleteConfirmation}
                          formatMessageTime={formatMessageTime}
                        />
                      ))}
                    </>
                  )}
                </div>

                {/* Conversation Detail */}
                <div className={`${!selectedConversation ? 'hidden lg:flex' : ''} lg:w-2/3 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden`}>
                  {selectedConversation ? (
                    <>
                      {/* Header */}
                      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedConversation(null);
                              selectedConversationRef.current = null;
                            }}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <ChevronDown className="w-5 h-5 rotate-90" />
                          </button>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                            selectedConversation.participant_type === 'employee' 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                              : 'bg-gradient-to-r from-amber-500 to-orange-600'
                          }`}>
                            {selectedConversation.participant_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#333]">{selectedConversation.participant_name}</p>
                            <p className="text-xs text-[#888]">{selectedConversation.participant_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            selectedConversation.participant_type === 'employee'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {selectedConversation.participant_type === 'employee' ? 'Employee' : 'Consignor'}
                          </span>
                          {/* Read Receipts Toggle */}
                          <button
                            onClick={toggleReadReceipts}
                            className={`p-2 rounded-lg transition-colors ${
                              readReceiptsEnabled 
                                ? 'text-blue-500 hover:bg-blue-50' 
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={readReceiptsEnabled ? "Read receipts on - click to disable" : "Read receipts off - click to enable"}
                            data-testid="read-receipts-toggle"
                          >
                            {readReceiptsEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => showDeleteConfirmation(selectedConversation)}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete conversation"
                            data-testid="delete-conversation-btn"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Messages */}
                      <div 
                        ref={messagesContainerRef}
                        onScroll={handleMessagesScroll}
                        className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]"
                      >
                        {selectedConversation.messages.length === 0 ? (
                          <div className="text-center py-8 text-[#888]">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-[#ccc]" />
                            <p>No messages in this conversation</p>
                          </div>
                        ) : (
                          <>
                            {selectedConversation.messages.map((msg, index) => {
                              const prevMsg = selectedConversation.messages[index - 1];
                              const showDateSeparator = !prevMsg || getDateKey(msg.sent_at) !== getDateKey(prevMsg.sent_at);
                              
                              return (
                                <div key={msg.id}>
                                  {showDateSeparator && (
                                    <div className="flex items-center gap-3 my-4">
                                      <div className="flex-1 h-px bg-gray-200"></div>
                                      <span className="text-xs font-medium text-[#888] bg-gray-50 px-3 py-1 rounded-full">
                                        {formatDateSeparator(msg.sent_at)}
                                      </span>
                                      <div className="flex-1 h-px bg-gray-200"></div>
                                    </div>
                                  )}
                                  <div className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="group relative">
                                      <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                          msg.sender_type === 'admin'
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-sm'
                                            : 'bg-white border border-gray-200 text-[#333] rounded-tl-sm'
                                        }`}
                                      >
                                        {msg.sender_type === 'admin' && msg.sender_name && (
                                          <p className="text-xs text-white/70 mb-1 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {msg.sender_name}
                                          </p>
                                        )}
                                        {msg.sender_type !== 'admin' && (
                                          <p className="text-xs text-[#888] mb-1 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {msg.sender_name}
                                          </p>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <div className={`flex items-center gap-1 mt-1 ${
                                          msg.sender_type === 'admin' ? 'text-white/70' : 'text-[#888]'
                                        }`}>
                                          <span className="text-xs">{formatMessageTime(msg.sent_at)}</span>
                                          {/* Read receipt indicator for admin messages */}
                                          {msg.sender_type === 'admin' && readReceiptsEnabled && (
                                            <span className="flex items-center ml-1" title={msg.read_at ? `Seen ${formatReadTime(msg.read_at)}` : "Delivered"}>
                                              {msg.read ? (
                                                <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                                              ) : (
                                                <Check className="w-3.5 h-3.5" />
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Delete button for admin's own messages */}
                                      {msg.sender_type === 'admin' && (
                                        <button
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded-full transition-all"
                                          title="Delete message"
                                          data-testid={`delete-message-${msg.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>

                      {/* Reply Input - larger textarea */}
                      <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-200">
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            rows={6}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[150px]"
                            disabled={sending}
                            data-testid="admin-message-input"
                          />
                          <div className="flex justify-end items-center">
                            <Button
                              type="submit"
                              disabled={!newMessage.trim() || sending}
                              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90"
                              data-testid="admin-send-message-btn"
                            >
                              {sending ? (
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              Send
                            </Button>
                          </div>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[#888]">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[#ccc]" />
                        <p className="font-medium">Select a conversation</p>
                        <p className="text-sm">Choose from the list to view messages</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              data-testid="delete-confirmation-dialog"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[#333]">Delete Conversation?</h3>
                  <p className="text-sm text-[#888]">This action can be undone by admin</p>
                </div>
              </div>
              
              <p className="text-[#666] mb-6">
                Are you sure you want to delete the entire conversation with{' '}
                <span className="font-semibold">{deleteConfirmation.participant_name}</span>?
                The conversation will be hidden from both parties.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={cancelDelete}
                  data-testid="cancel-delete-btn"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={confirmDelete}
                  data-testid="confirm-delete-btn"
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
