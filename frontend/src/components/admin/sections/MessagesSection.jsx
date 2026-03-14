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
  Check,
  Clock,
  RefreshCw,
  Search,
  X,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Date range presets
const DATE_PRESETS = [
  { label: "Today", getValue: () => {
    const today = new Date();
    return { from: today, to: today };
  }},
  { label: "Last 7 days", getValue: () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { from: weekAgo, to: today };
  }},
  { label: "Last 30 days", getValue: () => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return { from: monthAgo, to: today };
  }},
  { label: "This month", getValue: () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: firstDay, to: today };
  }},
];

export default function MessagesSection() {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [pendingDateRange, setPendingDateRange] = useState({ from: undefined, to: undefined });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

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

    // Fetch messages on initial mount
    fetchMessages();
    
    fetchUnreadCount();
    const pollInterval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchMessages]);

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
    if (!window.confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
      return;
    }
    
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

  // Toggle message selection
  const toggleMessageSelection = (messageId) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Select all filtered messages
  const selectAllMessages = () => {
    const filteredIds = filteredMessages.map(m => m.id);
    setSelectedMessages(new Set(filteredIds));
  };

  // Deselect all
  const deselectAllMessages = () => {
    setSelectedMessages(new Set());
  };

  // Bulk mark as read
  const handleBulkMarkAsRead = async () => {
    if (selectedMessages.size === 0) return;
    const token = getToken();
    try {
      const promises = Array.from(selectedMessages).map(id =>
        axios.put(
          `${API}/messages/admin/${id}/status`,
          { status: "read" },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(promises);
      
      const selectedUnreadCount = messages.filter(
        m => selectedMessages.has(m.id) && m.status === "unread"
      ).length;
      
      setMessages(prev => 
        prev.map(m => selectedMessages.has(m.id) ? { ...m, status: "read" } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - selectedUnreadCount));
      setSelectedMessages(new Set());
      setSelectMode(false);
      toast.success(`${selectedMessages.size} message(s) marked as read`);
    } catch (error) {
      console.error("Error marking messages as read:", error);
      toast.error("Failed to mark messages as read");
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMessages.size} message(s)?`)) return;
    
    const token = getToken();
    try {
      const promises = Array.from(selectedMessages).map(id =>
        axios.delete(`${API}/messages/admin/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      await Promise.all(promises);
      
      const selectedUnreadCount = messages.filter(
        m => selectedMessages.has(m.id) && m.status === "unread"
      ).length;
      
      setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
      setUnreadCount(prev => Math.max(0, prev - selectedUnreadCount));
      setSelectedMessages(new Set());
      setSelectMode(false);
      toast.success(`${selectedMessages.size} message(s) deleted`);
    } catch (error) {
      console.error("Error deleting messages:", error);
      toast.error("Failed to delete messages");
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
    
    // Show reminder to select correct From account
    toast.info(
      "Remember to send from thriftycurator1@gmail.com", 
      { 
        description: "Tap the 'From' field in your email app to change the sender.",
        duration: 5000 
      }
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

  const formatDateRange = (range) => {
    if (!range?.from) return "";
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (!range.to || range.from.toDateString() === range.to.toDateString()) {
      return range.from.toLocaleDateString('en-US', options);
    }
    return `${range.from.toLocaleDateString('en-US', options)} - ${range.to.toLocaleDateString('en-US', options)}`;
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
    
    // Date filter
    if (dateRange?.from) {
      const messageDate = new Date(message.submitted_at);
      messageDate.setHours(0, 0, 0, 0);
      
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      // If only one date selected (no 'to' date), filter for just that day
      if (!dateRange.to) {
        const fromDateEnd = new Date(dateRange.from);
        fromDateEnd.setHours(23, 59, 59, 999);
        if (messageDate < fromDate || messageDate > fromDateEnd) return false;
      } else {
        // Range filter
        if (messageDate < fromDate) return false;
        
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (messageDate > toDate) return false;
      }
    }
    
    return true;
  });

  const applyDatePreset = (preset) => {
    const range = preset.getValue();
    setPendingDateRange(range);
    setSelectedPreset(preset.label);
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setPendingDateRange({ from: undefined, to: undefined });
    setSelectedPreset("");
  };

  const applyDateFilter = () => {
    setDateRange(pendingDateRange);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setPendingDateRange(dateRange);
    setShowDatePicker(true);
  };

  const cancelDatePicker = () => {
    setPendingDateRange(dateRange);
    setShowDatePicker(false);
  };

  const hasDateFilter = dateRange?.from;

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
              {/* Search and Date Filter Bar */}
              {messages.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Text Search */}
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
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Date Range Picker Button */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (showDatePicker) {
                            cancelDatePicker();
                          } else {
                            openDatePicker();
                          }
                        }}
                        className={`h-10 px-3 w-full sm:w-auto justify-center ${hasDateFilter ? 'bg-[#FF1493]/10 border-[#FF1493] text-[#FF1493]' : 'text-[#888]'}`}
                        data-testid="date-range-btn"
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {hasDateFilter ? formatDateRange(dateRange) : "Select dates"}
                        {hasDateFilter && (
                          <span 
                            className="ml-2 p-0.5 hover:bg-[#FF1493]/20 rounded cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              clearDateFilter();
                            }}
                            role="button"
                            aria-label="Clear date filter"
                          >
                            <X className="w-5 h-5" />
                          </span>
                        )}
                      </Button>

                      {/* Date Picker Dropdown */}
                      <AnimatePresence>
                        {showDatePicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 top-1/4 sm:top-12 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-h-[70vh] sm:max-h-none overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Calendar - Main Focus */}
                            <div className="mb-4">
                              <p className="text-xs text-[#888] mb-3 text-center">Click a date to start, then click another to set the range</p>
                              <Calendar
                                mode="range"
                                selected={pendingDateRange}
                                onSelect={(range) => {
                                  const newRange = range || { from: undefined, to: undefined };
                                  setPendingDateRange(newRange);
                                  setSelectedPreset("");
                                  
                                  // Auto-apply filter and close calendar when range is complete (both dates selected)
                                  if (newRange.from && newRange.to) {
                                    setDateRange(newRange);
                                    setShowDatePicker(false);
                                  }
                                }}
                                numberOfMonths={1}
                                className="rounded-lg border border-gray-200"
                                classNames={{
                                  day_selected: "bg-[#FF1493] text-white hover:bg-[#E91E8C] hover:text-white focus:bg-[#E91E8C] focus:text-white",
                                  day_range_middle: "bg-[#FF1493]/20 text-[#FF1493]",
                                  day_range_start: "bg-[#FF1493] text-white rounded-l-md",
                                  day_range_end: "bg-[#FF1493] text-white rounded-r-md",
                                }}
                              />
                            </div>

                            {/* Quick Select Presets */}
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-medium text-[#888] uppercase tracking-wider mb-2">Quick Select</p>
                              <div className="flex flex-wrap gap-2">
                                {DATE_PRESETS.map((preset) => (
                                  <button
                                    key={preset.label}
                                    onClick={() => {
                                      const range = preset.getValue();
                                      setDateRange(range);
                                      setPendingDateRange(range);
                                      setSelectedPreset(preset.label);
                                      setShowDatePicker(false);
                                    }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                      selectedPreset === preset.label
                                        ? 'bg-[#FF1493] text-white border-[#FF1493]'
                                        : 'bg-gray-50 text-[#666] border-gray-200 hover:border-[#FF1493] hover:text-[#FF1493]'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Clear Button */}
                            <div className="flex justify-center mt-4 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => {
                                  setDateRange({ from: undefined, to: undefined });
                                  setPendingDateRange({ from: undefined, to: undefined });
                                  setSelectedPreset("");
                                  setShowDatePicker(false);
                                }}
                                className="text-sm text-[#888] hover:text-[#FF1493]"
                              >
                                Clear Filter
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Filter Results Count */}
                  {(searchQuery || hasDateFilter) && (
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs text-[#888]">
                        Showing {filteredMessages.length} of {messages.length} messages
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          clearDateFilter();
                        }}
                        className="text-xs text-[#FF1493] hover:text-[#E91E8C] font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Actions Bar */}
              {messages.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectMode) {
                        setSelectMode(false);
                        setSelectedMessages(new Set());
                      } else {
                        setSelectMode(true);
                      }
                    }}
                    className={`text-sm ${selectMode ? 'bg-[#FF1493]/10 border-[#FF1493] text-[#FF1493]' : 'text-[#888]'}`}
                  >
                    {selectMode ? 'Cancel Selection' : 'Select Messages'}
                  </Button>
                  
                  {selectMode && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedMessages.size === filteredMessages.length) {
                            deselectAllMessages();
                          } else {
                            selectAllMessages();
                          }
                        }}
                        className="text-sm text-[#888]"
                      >
                        {selectedMessages.size === filteredMessages.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      
                      {selectedMessages.size > 0 && (
                        <>
                          <span className="text-sm text-[#888]">
                            {selectedMessages.size} selected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkMarkAsRead}
                            className="text-sm text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark as Read
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkDelete}
                            className="text-sm text-red-500 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </>
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
                  <p className="text-[#888]">No messages match your filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => {
                    const isExpanded = expandedMessages.has(message.id);
                    const isSelected = selectedMessages.has(message.id);
                    return (
                      <div 
                        key={message.id}
                        className={`rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-[#FF1493]/10 border-[#FF1493]'
                            : message.status === 'unread' 
                              ? 'bg-[#FFF5F8] border-[#FF1493]/30' 
                              : 'bg-gray-50 border-gray-200'
                        }`}
                        data-testid={`message-item-${message.id}`}
                      >
                        {/* Collapsed Header */}
                        <div 
                          className="p-3 cursor-pointer flex items-center justify-between gap-3"
                          onClick={() => {
                            if (selectMode) {
                              toggleMessageSelection(message.id);
                            } else {
                              toggleMessageExpanded(message.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Checkbox for selection mode */}
                            {selectMode && (
                              <div 
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSelected 
                                    ? 'bg-[#FF1493] border-[#FF1493]' 
                                    : 'border-gray-300 hover:border-[#FF1493]'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMessageSelection(message.id);
                                }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            )}
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
                            {!selectMode && (
                              isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#888]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#888]" />
                              )
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
