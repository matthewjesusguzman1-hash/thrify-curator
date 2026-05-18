import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Email type labels for display
const EMAIL_TYPE_LABELS = {
  employee_welcome: "Employee Welcome",
  consignment_agreement: "Consignment Agreement",
  consignment_inquiry: "Consignment Inquiry",
  item_addition: "Item Addition",
  interview_invite: "Interview Invite",
  interview_schedule_link: "Interview Schedule Link",
  interview_confirmed: "Interview Confirmed",
  interview_cancelled: "Interview Cancelled",
  interview_rescheduled: "Interview Rescheduled",
  job_application_received: "Job Application Received",
  rejection_pre_interview: "Rejection (Pre-Interview)",
  rejection_post_interview: "Rejection (Post-Interview)",
  password_reset_admin: "Password Reset (Admin)",
  password_reset_request: "Password Reset Request",
  general: "General",
};

// Status badge colors
const STATUS_COLORS = {
  sent: "bg-green-100 text-green-700",
  mocked: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_ICONS = {
  sent: CheckCircle,
  mocked: AlertCircle,
  failed: XCircle,
};

export default function EmailLogsSection({ getAuthHeader }) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [emailTypes, setEmailTypes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (filterType) params.append("email_type", filterType);
      if (searchTerm) params.append("recipient", searchTerm);

      const response = await axios.get(
        `${API}/api/admin/email-logs?${params}`,
        getAuthHeader()
      );
      setLogs(response.data.logs);
      setTotalLogs(response.data.total);
    } catch (error) {
      console.error("Failed to fetch email logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `${API}/api/admin/email-logs/stats`,
        getAuthHeader()
      );
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch email stats:", error);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await axios.get(
        `${API}/api/admin/email-logs/types`,
        getAuthHeader()
      );
      setEmailTypes(response.data.types);
    } catch (error) {
      console.error("Failed to fetch email types:", error);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchLogs();
      fetchStats();
      fetchTypes();
    }
  }, [expanded, page, filterType]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
        data-testid="email-logs-toggle"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold text-lg">Email Log</h3>
            <p className="text-white/50 text-sm">
              {stats ? `${stats.total} emails sent` : "View sent emails"}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-white/50" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/10"
          >
            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/10">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.today}</p>
                  <p className="text-xs text-white/50">Today</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-cyan-400">{stats.this_week}</p>
                  <p className="text-xs text-white/50">This Week</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
                  <p className="text-xs text-white/50">All Time</p>
                </div>
              </div>
            )}

            {/* Search & Filter */}
            <div className="p-4 border-b border-white/10">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    data-testid="email-search-input"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`border-white/10 ${showFilters ? 'bg-blue-500/20 text-blue-400' : 'text-white/70'}`}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { fetchLogs(); fetchStats(); }}
                  className="border-white/10 text-white/70"
                  data-testid="email-refresh-btn"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Filter Dropdown */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => { setFilterType(""); setPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          filterType === "" 
                            ? "bg-blue-500 text-white" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        All Types
                      </button>
                      {emailTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => { setFilterType(type); setPage(1); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            filterType === type 
                              ? "bg-blue-500 text-white" 
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {EMAIL_TYPE_LABELS[type] || type}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Email List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-white/30 animate-spin mx-auto mb-2" />
                  <p className="text-white/50 text-sm">Loading emails...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">No emails found</p>
                  <p className="text-white/30 text-sm mt-1">
                    Emails sent through the app will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {logs.map((log) => {
                    const StatusIcon = STATUS_ICONS[log.status] || AlertCircle;
                    return (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-white/5 transition-colors"
                        data-testid={`email-log-${log.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Subject */}
                            <p className="text-white font-medium text-sm truncate">
                              {log.subject}
                            </p>
                            
                            {/* Recipient */}
                            <div className="flex items-center gap-2 mt-1">
                              <User className="w-3 h-3 text-white/40" />
                              <span className="text-white/70 text-xs">
                                {log.recipient_name ? `${log.recipient_name} (${log.recipient_email})` : log.recipient_email}
                              </span>
                            </div>
                            
                            {/* Type & Time */}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-white/60">
                                {EMAIL_TYPE_LABELS[log.email_type] || log.email_type}
                              </span>
                              <span className="flex items-center gap-1 text-white/40 text-[10px]">
                                <Clock className="w-3 h-3" />
                                {formatDate(log.sent_at)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${STATUS_COLORS[log.status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span className="capitalize">{log.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-white/50 text-xs">
                  Page {page} of {totalPages} ({totalLogs} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-white/10 text-white/70 disabled:opacity-30"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="border-white/10 text-white/70 disabled:opacity-30"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
