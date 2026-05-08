import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserX, ChevronDown, ChevronUp, Mail, Calendar, Clock,
  CheckCircle, XCircle, HelpCircle, FileText, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function RejectionHistorySection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejections, setRejections] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    keep_on_file_yes: 0,
    keep_on_file_no: 0,
    pending_response: 0
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/api/admin/rejection-history`,
        getAuthHeader()
      );
      setRejections(response.data.rejections);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching rejection history:', error);
      toast.error('Failed to load rejection history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && rejections.length === 0) {
      fetchHistory();
    }
  }, [isExpanded]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getResponseBadge = (response) => {
    if (response === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" /> Keep on File
        </span>
      );
    } else if (response === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          <XCircle className="w-3 h-3" /> Declined
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          <HelpCircle className="w-3 h-3" /> Pending
        </span>
      );
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="rejection-history-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <UserX className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-gray-900">Rejection History</h2>
            <p className="text-sm text-gray-500">
              {stats.total} total
              {stats.keep_on_file_yes > 0 && <span className="text-green-600 ml-2">• {stats.keep_on_file_yes} keeping on file</span>}
              {stats.pending_response > 0 && <span className="text-yellow-600 ml-2">• {stats.pending_response} pending</span>}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t">
              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 mb-4 mt-4">
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500">Total Sent</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{stats.keep_on_file_yes}</div>
                  <div className="text-xs text-green-600">Keep on File</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-500">{stats.keep_on_file_no}</div>
                  <div className="text-xs text-gray-500">Declined</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-600">{stats.pending_response}</div>
                  <div className="text-xs text-yellow-600">Pending</div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHistory}
                  disabled={loading}
                  className="text-gray-600"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Rejection List */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : rejections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserX className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No rejection emails sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {rejections.map((rejection) => (
                    <div 
                      key={rejection.id} 
                      className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            rejection.rejection_type === 'post_interview' 
                              ? 'bg-purple-100' 
                              : 'bg-orange-100'
                          }`}>
                            {rejection.rejection_type === 'post_interview' ? (
                              <Calendar className="w-5 h-5 text-purple-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{rejection.applicant_name}</p>
                            <p className="text-sm text-gray-500 truncate">{rejection.applicant_email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                rejection.rejection_type === 'post_interview'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {rejection.rejection_type_label}
                              </span>
                              {rejection.interview_date && (
                                <span className="text-xs text-gray-500">
                                  Interview: {rejection.interview_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getResponseBadge(rejection.keep_on_file_response)}
                          <span className="text-xs text-gray-400">
                            Sent {formatDate(rejection.sent_at)}
                          </span>
                        </div>
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
