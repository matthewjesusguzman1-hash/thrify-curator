import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, User, Paperclip, X, Image as ImageIcon, FileText } from "lucide-react";
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
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // For image lightbox
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(null);
  const fileInputRef = useRef(null);

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
        
        // Check if there's a new admin message - just vibrate, no toast
        if (adminMessages.length > previousMessageCountRef.current && !muted) {
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

  // Handle file upload
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingAttachment(true);
    
    for (const file of files) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        continue;
      }
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await axios.post(
          `${API}/conversations/upload-attachment`,
          formData,
          {
            ...getAuthHeader(),
            headers: {
              ...getAuthHeader().headers,
              "Content-Type": "multipart/form-data"
            }
          }
        );
        
        setAttachments(prev => [...prev, response.data]);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setUploadingAttachment(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;
    
    setSending(true);
    try {
      const messageData = { 
        content: newMessage || (attachments.length > 0 ? "📎 Attachment" : ""),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      if (userType === "employee") {
        await axios.post(
          `${API}/conversations/employee/send`,
          messageData,
          getAuthHeader()
        );
      } else {
        await axios.post(
          `${API}/conversations/consignor/send`,
          { 
            email: userEmail,
            name: userName,
            ...messageData
          }
        );
      }
      setNewMessage("");
      setAttachments([]);
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
        {/* Constrain messages to comfortable width on desktop */}
        <div className="max-w-4xl mx-auto space-y-3">
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
                        ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
                        : 'bg-white/10 text-white rounded-tl-sm'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-sm'
                  }`}
                >
                  {msg.sender_type === "admin" && (
                    <p className={`text-xs mb-1 flex items-center gap-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                      <User className="w-3 h-3" />
                      {msg.sender_name || "Admin"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  
                  {/* Display attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((att, idx) => (
                        att.file_type === 'image' ? (
                          <button
                            key={att.id || idx}
                            onClick={() => setLightboxImage(att.url)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                              msg.sender_type === 'admin'
                                ? isLight ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/10 hover:bg-white/20'
                                : 'bg-white/20 hover:bg-white/30'
                            }`}
                          >
                            <img 
                              src={att.url} 
                              alt={att.filename}
                              className="w-20 h-20 object-cover rounded"
                            />
                          </button>
                        ) : (
                          <a
                            key={att.id || idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              msg.sender_type === 'admin'
                                ? isLight ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/10 hover:bg-white/20'
                                : 'bg-white/20 hover:bg-white/30'
                            }`}
                          >
                            <FileText className="w-5 h-5 flex-shrink-0" />
                            <span className="text-xs truncate">{att.filename}</span>
                          </a>
                        )
                      ))}
                    </div>
                  )}
                  
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
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att) => (
                <div 
                  key={att.id} 
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg ${
                    isLight ? 'bg-gray-100' : 'bg-white/10'
                  }`}
                >
                  {att.file_type === 'image' ? (
                    <ImageIcon className={`w-4 h-4 ${isLight ? 'text-blue-500' : 'text-blue-400'}`} />
                  ) : (
                    <FileText className={`w-4 h-4 ${isLight ? 'text-purple-500' : 'text-purple-400'}`} />
                  )}
                  <span className={`text-sm truncate max-w-[150px] ${isLight ? 'text-gray-700' : 'text-white'}`}>
                    {att.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className={`ml-1 p-0.5 rounded-full hover:bg-red-100 ${isLight ? 'text-gray-400 hover:text-red-500' : 'text-white/50 hover:text-red-400'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
              multiple
              className="hidden"
            />
            
            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment}
              className={`p-3 rounded-xl transition-colors ${
                isLight 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              title="Attach file"
            >
              {uploadingAttachment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className={`flex-1 rounded-xl px-4 py-3 focus:outline-none resize-none ${
                isLight 
                  ? 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-[#00D4FF]/50'
                  : 'bg-white/10 border border-white/10 text-white placeholder-white/40 focus:border-[#00D4FF]/50'
              }`}
              disabled={sending}
              data-testid="fullscreen-message-input"
            />
            
            <Button
              type="submit"
              disabled={(!newMessage.trim() && attachments.length === 0) || sending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white rounded-xl px-6 h-12"
              data-testid="fullscreen-send-btn"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxImage(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-[10000] p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
              style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* Image */}
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImage}
              alt="Attachment"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
