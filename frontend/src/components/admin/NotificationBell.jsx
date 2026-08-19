import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, CheckCheck, LogIn, LogOut, Briefcase, FileSignature, 
  MessageSquare, Calendar, XCircle, RefreshCw, Package, ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Get icon and colors based on notification type
const getNotificationStyle = (type) => {
  switch (type) {
    case "clock_in":
      return { icon: LogIn, bg: "bg-green-100", color: "text-green-600" };
    case "clock_out":
      return { icon: LogOut, bg: "bg-orange-100", color: "text-orange-600" };
    case "job_application":
      return { icon: Briefcase, bg: "bg-blue-100", color: "text-blue-600" };
    case "consignment_agreement":
      return { icon: FileSignature, bg: "bg-purple-100", color: "text-purple-600" };
    case "consignment_inquiry":
      return { icon: Package, bg: "bg-indigo-100", color: "text-indigo-600" };
    case "new_message":
      return { icon: MessageSquare, bg: "bg-cyan-100", color: "text-cyan-600" };
    case "interview_booked":
      return { icon: Calendar, bg: "bg-emerald-100", color: "text-emerald-600" };
    case "interview_cancelled":
      return { icon: XCircle, bg: "bg-red-100", color: "text-red-600" };
    case "interview_rescheduled":
      return { icon: RefreshCw, bg: "bg-amber-100", color: "text-amber-600" };
    case "applicant_test_submission":
      return { icon: ClipboardCheck, bg: "bg-teal-100", color: "text-teal-600" };
    case "interview_response":
      return { icon: Calendar, bg: "bg-emerald-100", color: "text-emerald-600" };
    default:
      return { icon: Bell, bg: "bg-gray-100", color: "text-gray-600" };
  }
};

export default function NotificationBell({ 
  notifications, 
  unreadCount, 
  onMarkAllRead, 
  loading 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#FF1493] to-[#FF6B6B] rounded-full text-xs text-white flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl overflow-hidden z-50"
            data-testid="notification-dropdown"
          >
            <div className="h-1 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6]" />
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A2E]">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onMarkAllRead();
                    setIsOpen(false);
                  }}
                  disabled={loading}
                  className="text-[#00D4FF] hover:text-[#00A8CC] text-xs"
                  data-testid="mark-all-read"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notif) => {
                  const style = getNotificationStyle(notif.type || notif.notification_type);
                  const Icon = style.icon;
                  
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        !notif.read ? "bg-[#00D4FF]/5" : ""
                      }`}
                      data-testid={`notification-${notif.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg} ${style.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1A1A2E]">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-[#00D4FF] rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
