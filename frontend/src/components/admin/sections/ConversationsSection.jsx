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
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const messagesEndRef = useRef(null);

  const getToken = () => localStorage.getItem("token");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation?.messages]);

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

  // Fetch conversations on component mount and when expanded
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.log("ConversationsSection: No token on mount");
      return;
    }
    
    console.log("ConversationsSection: Component mounted, fetching data...");
    
    // Fetch immediately on mount
    fetchConversations();
    
    // Poll for updates
    const pollInterval = setInterval(() => {
      if (showSection) {
        fetchConversations();
      }
    }, 30000);
    
    return () => clearInterval(pollInterval);
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

  const formatMessageTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
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
                    filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border ${
                          selectedConversation?.id === conv.id
                            ? 'bg-blue-50 border-blue-300'
                            : conv.unread_count > 0
                              ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        data-testid={`conversation-item-${conv.id}`}
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
                          <div className="text-xs text-[#888] flex-shrink-0">
                            {formatMessageTime(conv.last_message_at)}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            conv.participant_type === 'employee'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {conv.participant_type === 'employee' ? 'Employee' : 'Consignor'}
                          </span>
                          <span className="text-xs text-[#888] truncate">{conv.participant_email}</span>
                        </div>
                      </div>
                    ))
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
                            onClick={() => setSelectedConversation(null)}
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
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selectedConversation.participant_type === 'employee'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedConversation.participant_type === 'employee' ? 'Employee' : 'Consignor'}
                        </span>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                        {selectedConversation.messages.length === 0 ? (
                          <div className="text-center py-8 text-[#888]">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-[#ccc]" />
                            <p>No messages in this conversation</p>
                          </div>
                        ) : (
                          <>
                            {selectedConversation.messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                    msg.sender_type === 'admin'
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-sm'
                                      : 'bg-white border border-gray-200 text-[#333] rounded-tl-sm'
                                  }`}
                                >
                                  {msg.sender_type !== 'admin' && (
                                    <p className="text-xs text-[#888] mb-1 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {msg.sender_name}
                                    </p>
                                  )}
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  <p className={`text-xs mt-1 ${
                                    msg.sender_type === 'admin' ? 'text-white/70' : 'text-[#888]'
                                  }`}>
                                    {formatMessageTime(msg.sent_at)}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>

                      {/* Reply Input */}
                      <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-200">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1"
                            disabled={sending}
                            data-testid="admin-message-input"
                          />
                          <Button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90"
                            data-testid="admin-send-message-btn"
                          >
                            {sending ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <Send className="w-5 h-5" />
                            )}
                          </Button>
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
    </div>
  );
}
