import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Search,
  Filter,
  Eye,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Clock,
  Globe,
  DollarSign,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AllApplicationsSection({ getAuthHeader, refreshKey }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'onboarding', 'generic', 'direct'
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    if (isExpanded) {
      fetchApplications();
    }
  }, [isExpanded]);

  // Refresh when parent triggers refresh
  useEffect(() => {
    if (refreshKey && isExpanded) {
      fetchApplications();
    }
  }, [refreshKey]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/admin/forms/job-applications`, getAuthHeader());
      setApplications(response.data || []);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm('Delete this application? This cannot be undone.')) return;
    
    try {
      await axios.delete(`${API}/api/admin/forms/job-applications/${appId}`, getAuthHeader());
      toast.success('Application deleted');
      fetchApplications();
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };

  const filteredApplications = applications.filter(app => {
    // Search filter
    const matchesSearch = !searchTerm || 
      app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    let matchesType = true;
    if (filterType === 'onboarding') {
      matchesType = app.invite_template === 'onboarding';
    } else if (filterType === 'generic') {
      matchesType = app.invite_template === 'generic' || (app.invited && app.invite_template !== 'onboarding');
    } else if (filterType === 'direct') {
      matchesType = !app.invited;
    }
    
    return matchesSearch && matchesType;
  });

  const getApplicationTypeLabel = (app) => {
    if (app.invite_template === 'onboarding') return { label: 'Onboarding', color: 'bg-purple-100 text-purple-700' };
    if (app.invited) return { label: 'Invited', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Direct', color: 'bg-gray-100 text-gray-700' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e5e0dc] overflow-hidden" data-testid="all-applications-section">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#faf8f6] transition-colors"
        data-testid="all-applications-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[#1A1A2E]">All Applications</h3>
            <p className="text-sm text-[#888]">
              {applications.length} total applications
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#888]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#888]" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-[#e5e0dc]">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Types</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="generic">Invited</option>
                    <option value="direct">Direct</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchApplications}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Applications List */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading applications...</div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || filterType !== 'all' ? 'No matching applications found' : 'No applications yet'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredApplications.map((app) => {
                    const typeInfo = getApplicationTypeLabel(app);
                    return (
                      <div
                        key={app.id}
                        className="p-4 bg-[#faf8f6] rounded-lg border border-[#e5e0dc] hover:border-purple-300 transition-colors"
                        data-testid={`application-${app.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-[#1A1A2E]">{app.full_name || 'Unknown'}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              {app.employee_created && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <CheckCircle className="w-3 h-3 inline mr-1" />
                                  Hired
                                </span>
                              )}
                              {app.is_remote_worker && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  <Globe className="w-3 h-3 inline mr-1" />
                                  Remote
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {app.email}
                              </span>
                              {app.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {app.phone}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              Submitted: {formatDate(app.submitted_at)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedApplication(app)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteApplication(app.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
}

function ApplicationDetailModal({ application, onClose }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{application.full_name}</h2>
            <p className="text-sm text-gray-500">{application.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{application.email}</span>
                </div>
                {application.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{application.phone}</span>
                  </div>
                )}
                {application.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span>{application.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Application Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Submitted: {formatDate(application.submitted_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Type: {application.invite_template || (application.invited ? 'Invited' : 'Direct')}</span>
                </div>
                {application.is_remote_worker && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-500" />
                    <span className="text-purple-600 font-medium">Remote Worker</span>
                  </div>
                )}
                {application.employee_created && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">Employee Account Created</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Remote Worker Payment Info */}
          {application.is_remote_worker && application.payment_method && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4" />
                Payment Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Payment Method:</span>{' '}
                  <span className="font-medium">
                    {application.payment_method === 'wise_account' ? 'Wise Account' : 'E-Wallet'}
                  </span>
                </div>
                {application.payment_method === 'wise_account' && application.wise_tag && (
                  <div>
                    <span className="text-gray-500">Wise Tag:</span>{' '}
                    <span className="font-medium">{application.wise_tag}</span>
                  </div>
                )}
                {application.payment_method === 'e_wallet' && (
                  <>
                    {application.wallet_provider && (
                      <div>
                        <span className="text-gray-500">Wallet Provider:</span>{' '}
                        <span className="font-medium">{application.wallet_provider}</span>
                      </div>
                    )}
                    {application.wallet_number && (
                      <div>
                        <span className="text-gray-500">Wallet Number:</span>{' '}
                        <span className="font-medium">{application.wallet_number}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Experience */}
          {application.reselling_experience && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Reselling Experience</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {application.reselling_experience}
              </p>
            </div>
          )}

          {/* Why Join */}
          {application.why_join && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Why They Want to Join</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {application.why_join}
              </p>
            </div>
          )}

          {/* Availability */}
          {application.availability && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {application.availability}
              </p>
            </div>
          )}

          {/* Additional Info */}
          {application.additional_info && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Additional Information</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {application.additional_info}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
