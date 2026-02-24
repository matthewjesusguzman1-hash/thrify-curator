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
  RefreshCw,
  Search,
  X,
  Bell,
  BellOff,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MessagesSection() {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  const getToken = () => localStorage.getItem("token");

  // Check and request notification permissions
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error("Browser notifications are not supported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success("Push notifications enabled!");
        // Send a test notification
        new Notification("Thrifty Curator", {
          body: "You'll now receive notifications for new messages!",
          icon: "/logo192.png"
        });
      } else {
        toast.error("Notification permission denied");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to enable notifications");
    }
  };

  const showNotification = (title, body) => {
    if (notificationsEnabled && document.visibilityState !== 'visible') {
      new Notification(title, {
        body,
        icon: "/logo192.png",
        tag: "new-message"
      });
    }
  };

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
        const newCount = res.data.unread_count;
        
        // Show notification if new messages arrived
        if (newCount > previousUnreadCount && previousUnreadCount !== 0) {
          const newMessages = newCount - previousUnreadCount;
          showNotification(
            "New Message",
            `You have ${newMessages} new message${newMessages > 1 ? 's' : ''}`
          );
        }
        
        setPreviousUnreadCount(newCount);
        setUnreadCount(newCount);
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    const pollInterval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(pollInterval);
  }, [previousUnreadCount, notificationsEnabled]);

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
    
    if (message.status === "unread") {
      handleMarkAsRead(message.id);
    }
  };

  const toggleMessageExpanded = (messageId) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
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

  // Filter messages based on search and date
  const filteredMessages = messages.filter(message => {
    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesText = (
        message.sender_name.toLowerCase().includes(query) ||
        message.sender_email.toLowerCase().includes(query) ||
        message.message.toLowerCase().includes(query)
      );
      if (!matchesText) return false;
    }
    
    // Date filter - compare dates only (ignore time)
    if (dateFrom || dateTo) {
      const messageDate = new Date(message.submitted_at);
      // Get just the date part (YYYY-MM-DD) for comparison
      const messageDateStr = messageDate.toISOString().split('T')[0];
      
      if (dateFrom) {
        // Message date must be >= from date
        if (messageDateStr < dateFrom) return false;
      }
      
      if (dateTo) {
        // Message date must be <= to date
        if (messageDateStr > dateTo) return false;
      }
    }
    
    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo;

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
          {/* Notification Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (notificationsEnabled) {
                setNotificationsEnabled(false);
                toast.info("Push notifications disabled");
              } else {
                requestNotificationPermission();
              }
            }}
            className={`${notificationsEnabled ? 'text-[#FF1493]' : 'text-[#888]'} hover:text-[#666]`}
            title={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            data-testid="notifications-toggle-btn"
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </Button>
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
              {/* Search and Filter Bar */}
              {messages.length > 0 && (
                <div className="mb-4 space-y-3">
                  {/* Text Search */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                      <Input
                        type="text"
                        placeholder="Search by name, email, or message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 h-10 border-[#ddd] focus:border-[#FF1493] focus:ring-[#FF1493]/20"
                        data-testid="messages-search-input"
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDateFilters(!showDateFilters)}
                      className={`h-10 px-3 ${showDateFilters || dateFrom || dateTo ? 'border-[#FF1493] text-[#FF1493]' : 'text-[#888]'}`}
                      data-testid="toggle-date-filter-btn"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Date
                      {(dateFrom || dateTo) && (
                        <span className="ml-1 w-2 h-2 bg-[#FF1493] rounded-full" />
                      )}
                    </Button>
                  </div>

                  {/* Date Filters */}
                  <AnimatePresence>
                    {showDateFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-[#666] font-medium whitespace-nowrap">From:</label>
                            <Input
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              className="h-9 w-40 border-[#ddd] focus:border-[#FF1493] focus:ring-[#FF1493]/20"
                              data-testid="date-from-input"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-[#666] font-medium whitespace-nowrap">To:</label>
                            <Input
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              className="h-9 w-40 border-[#ddd] focus:border-[#FF1493] focus:ring-[#FF1493]/20"
                              data-testid="date-to-input"
                            />
                          </div>
                          {(dateFrom || dateTo) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDateFrom(""); setDateTo(""); }}
                              className="h-9 text-[#888] hover:text-[#666]"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Clear dates
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Filter Results Count */}
                  {hasActiveFilters && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#888]">
                        Showing {filteredMessages.length} of {messages.length} messages
                        {dateFrom && dateTo && ` (${dateFrom} to ${dateTo})`}
                        {dateFrom && !dateTo && ` (from ${dateFrom})`}
                        {!dateFrom && dateTo && ` (until ${dateTo})`}
                      </p>
                      <button
                        onClick={clearFilters}
                        className="text-xs text-[#FF1493] hover:text-[#E91E8C] font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}

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
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-[#ccc] mx-auto mb-2" />
                  <p className="text-[#888]">No messages match your search</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => {
                    const isExpanded = expandedMessages.has(message.id);
                    return (
                      <div 
                        key={message.id}
                        className={`rounded-xl border transition-all ${
                          message.status === 'unread' 
                            ? 'bg-[#FFF5F8] border-[#FF1493]/30' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        data-testid={`message-item-${message.id}`}
                      >
                        {/* Collapsed Header - Always visible */}
                        <div 
                          className="p-3 cursor-pointer flex items-center justify-between gap-3"
                          onClick={() => toggleMessageExpanded(message.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                              message.status === 'unread' 
                                ? 'bg-[#FF1493] text-white' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {message.sender_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-[#333] truncate">{message.sender_name}</p>
                                {message.status === 'unread' && (
                                  <span className="px-1.5 py-0.5 bg-[#FF1493] text-white text-xs rounded-full font-medium flex-shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#888] truncate">{message.sender_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-[#888] hidden sm:block">
                              {formatDate(message.submitted_at)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#888]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#888]" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 border-t border-[#eee]/50">
                                {/* Timestamp on mobile */}
                                <p className="text-xs text-[#888] mt-2 sm:hidden flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(message.submitted_at)}
                                </p>
                                
                                {/* Message Content */}
                                <div className="bg-white rounded-lg p-3 mt-2 border border-gray-100">
                                  <p className="text-[#333] text-sm whitespace-pre-wrap">{message.message}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReply(message);
                                      }}
                                      size="sm"
                                      className="bg-gradient-to-r from-[#FF1493] to-[#E91E8C] text-white hover:opacity-90"
                                      data-testid={`reply-message-${message.id}`}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      Reply via Email
                                    </Button>
                                    {message.status === 'unread' && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkAsRead(message.id);
                                        }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(message.id);
                                    }}
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
