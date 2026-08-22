import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Send, User, Phone, Mail, 
  CheckCircle, XCircle, ChevronDown, Loader2, Inbox, MapPin,
  MessageSquare, Users, Trash2, Eye, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InterviewSchedulerSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('applications'); // 'applications', 'inbox', 'scheduled'
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Availability inbox state
  const [availabilityRequests, setAvailabilityRequests] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(null);
  const [selectedApplications, setSelectedApplications] = useState([]);

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, availRes] = await Promise.all([
        axios.get(`${API}/api/admin/forms/job-applications`, getAuthHeader()),
        axios.get(`${API}/api/interview-scheduler/admin/availability-inbox`, getAuthHeader()).catch(() => ({ data: { requests: [] } }))
      ]);
      // Filter applications - exclude those who already have availability requests or scheduled interviews
      const availRequestEmails = (availRes.data.requests || []).map(r => r.applicant_email?.toLowerCase());
      setApplications(appsRes.data.filter(app => 
        !availRequestEmails.includes(app.email?.toLowerCase()) &&
        app.status !== 'rejected'
      ));
      setAvailabilityRequests(availRes.data.requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Send availability request to applicant
  const sendAvailabilityRequest = async (applicationIds, dateStart, dateEnd) => {
    try {
      const selectedApps = applications.filter(app => applicationIds.includes(app.id));
      
      for (const app of selectedApps) {
        await axios.post(
          `${API}/api/interview-scheduler/admin/send-availability-request/${app.id}`,
          {
            date_range_start: dateStart,
            date_range_end: dateEnd
          },
          getAuthHeader()
        );
      }
      
      toast.success(`Availability request sent to ${selectedApps.length} applicant(s)!`);
      setShowRequestModal(null);
      setSelectedApplications([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send request');
    }
  };

  // Schedule from availability (save as draft)
  const scheduleFromAvailability = async (requestId, selectedDatetime, selectedDatetimeCT, location) => {
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/availability-inbox/${requestId}/schedule`,
        {
          selected_datetime: selectedDatetime,
          selected_datetime_ct: selectedDatetimeCT,
          location: location || "Thrifty Curator Store"
        },
        getAuthHeader()
      );
      toast.success('Interview scheduled!');
      setShowScheduleModal(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule');
    }
  };

  // Unschedule (return to responded)
  const unscheduleAvailability = async (requestId, applicantName) => {
    if (!window.confirm(`Remove scheduled time for ${applicantName}?\n\nThis will NOT delete their availability - you can reschedule.`)) return;
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/availability-inbox/${requestId}/unschedule`,
        {},
        getAuthHeader()
      );
      toast.success('Scheduled time removed');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unschedule');
    }
  };

  // Send confirmation email
  const sendConfirmation = async (requestId) => {
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/availability-inbox/${requestId}/send-confirmation`,
        {},
        getAuthHeader()
      );
      toast.success('Confirmation email sent!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send confirmation');
    }
  };

  // Send message to applicant
  const sendMessage = async (requestId, message) => {
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/availability-inbox/${requestId}/send-message`,
        { message },
        getAuthHeader()
      );
      toast.success('Message sent!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    }
  };

  // Delete request
  const deleteRequest = async (requestId, applicantName) => {
    if (!window.confirm(`Delete availability request for ${applicantName}?\n\nThis action cannot be undone.`)) return;
    try {
      await axios.delete(
        `${API}/api/interview-scheduler/admin/availability-inbox/${requestId}`,
        getAuthHeader()
      );
      toast.success('Request deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  // Count helpers
  const pendingCount = availabilityRequests.filter(r => r.status === 'pending').length;
  const respondedCount = availabilityRequests.filter(r => r.status === 'responded').length;
  const scheduledCount = availabilityRequests.filter(r => r.status === 'scheduled').length;
  const confirmedCount = availabilityRequests.filter(r => r.status === 'confirmed').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="interview-scheduler-section">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        data-testid="interview-scheduler-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">In-Person Interviews</h3>
            <p className="text-sm text-gray-500">
              {applications.length} to review • {respondedCount} responded • {scheduledCount + confirmedCount} scheduled
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                    {[
                      { id: 'applications', label: 'Review Applications', icon: FileText, badge: applications.length },
                      { id: 'inbox', label: 'Availability Inbox', icon: Inbox, badge: respondedCount },
                      { id: 'scheduled', label: 'Scheduled', icon: Calendar, badge: scheduledCount + confirmedCount }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm relative ${
                          activeTab === tab.id
                            ? 'bg-purple-100 text-purple-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        data-testid={`tab-${tab.id}`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        {tab.badge > 0 && (
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                            activeTab === tab.id ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'applications' && (
                    <ApplicationsTab
                      applications={applications}
                      selectedApplications={selectedApplications}
                      setSelectedApplications={setSelectedApplications}
                      onRequestAvailability={() => setShowRequestModal(true)}
                    />
                  )}

                  {activeTab === 'inbox' && (
                    <InboxTab
                      requests={availabilityRequests.filter(r => r.status === 'responded' || r.status === 'pending')}
                      onSchedule={(req) => setShowScheduleModal(req)}
                      onSendMessage={sendMessage}
                      onDelete={deleteRequest}
                    />
                  )}

                  {activeTab === 'scheduled' && (
                    <ScheduledTab
                      requests={availabilityRequests.filter(r => r.status === 'scheduled' || r.status === 'confirmed')}
                      onUnschedule={unscheduleAvailability}
                      onSendConfirmation={sendConfirmation}
                    />
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Availability Modal */}
      {showRequestModal && (
        <RequestAvailabilityModal
          applications={applications.filter(app => selectedApplications.includes(app.id))}
          onClose={() => setShowRequestModal(null)}
          onSend={sendAvailabilityRequest}
          selectedIds={selectedApplications}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          request={showScheduleModal}
          onClose={() => setShowScheduleModal(null)}
          onSchedule={scheduleFromAvailability}
        />
      )}
    </div>
  );
}


// Tab: Review Applications
function ApplicationsTab({ applications, selectedApplications, setSelectedApplications, onRequestAvailability }) {
  const toggleSelection = (appId) => {
    setSelectedApplications(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const toggleAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(applications.map(a => a.id));
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No applications to review</p>
        <p className="text-gray-400 text-sm">All applicants have been processed or sent availability requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Select All and Action Button */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedApplications.length === applications.length && applications.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-600">
            {selectedApplications.length > 0 
              ? `${selectedApplications.length} selected`
              : 'Select All'}
          </span>
        </label>
        
        {selectedApplications.length > 0 && (
          <Button
            onClick={onRequestAvailability}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Request Availability ({selectedApplications.length})
          </Button>
        )}
      </div>

      {/* Applications List */}
      <div className="space-y-2">
        {applications.map(app => (
          <div
            key={app.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedApplications.includes(app.id)
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => toggleSelection(app.id)}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedApplications.includes(app.id)}
                onChange={() => {}}
                className="w-4 h-4 mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{app.name}</h4>
                  <span className="text-xs text-gray-400">
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
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
                {app.position && (
                  <p className="text-xs text-gray-400 mt-1">Applied for: {app.position}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// Tab: Availability Inbox
function InboxTab({ requests, onSchedule, onSendMessage, onDelete }) {
  const [messageModal, setMessageModal] = useState(null);
  
  const pending = requests.filter(r => r.status === 'pending');
  const responded = requests.filter(r => r.status === 'responded');

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No availability requests</p>
        <p className="text-gray-400 text-sm">Send requests from the Review Applications tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Responses */}
      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Awaiting Response ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-gray-500">{req.applicant_email}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Requested: {req.date_range_start} - {req.date_range_end}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(req.id, req.applicant_name)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responded - Ready to Schedule */}
      {responded.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Ready to Schedule ({responded.length})
          </h4>
          <div className="space-y-2">
            {responded.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{req.applicant_name}</p>
                      <p className="text-sm text-gray-500">{req.applicant_email}</p>
                    </div>
                  </div>
                  
                  {/* Availability */}
                  <div className="bg-gray-50 rounded p-2 text-sm">
                    <p className="text-gray-500 text-xs mb-1">Their availability:</p>
                    <p className="text-gray-700 whitespace-pre-line">{req.applicant_response?.availability || 'No details'}</p>
                    {req.applicant_response?.notes && (
                      <p className="text-gray-500 text-xs mt-1 italic">Note: {req.applicant_response.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMessageModal(req)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onSchedule(req)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModal && (
        <MessageModal
          request={messageModal}
          onClose={() => setMessageModal(null)}
          onSend={(msg) => {
            onSendMessage(messageModal.id, msg);
            setMessageModal(null);
          }}
        />
      )}
    </div>
  );
}


// Tab: Scheduled Interviews
function ScheduledTab({ requests, onUnschedule, onSendConfirmation }) {
  const scheduled = requests.filter(r => r.status === 'scheduled');
  const confirmed = requests.filter(r => r.status === 'confirmed');

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No scheduled interviews</p>
        <p className="text-gray-400 text-sm">Schedule interviews from the Availability Inbox</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scheduled (Ready to Confirm) */}
      {scheduled.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-purple-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ready to Send Confirmation ({scheduled.length})
            </h4>
            {scheduled.length > 1 && (
              <Button
                size="sm"
                onClick={() => scheduled.forEach(r => onSendConfirmation(r.id))}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Send All
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {scheduled.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-purple-700">{req.scheduled_datetime_ct || req.scheduled_datetime}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {req.scheduled_location || 'Thrifty Curator Store'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUnschedule(req.id, req.applicant_name)}
                      className="text-red-600 border-red-300"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onSendConfirmation(req.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed */}
      {confirmed.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Confirmed Interviews ({confirmed.length})
          </h4>
          <div className="space-y-2">
            {confirmed.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-green-700">{req.confirmed_datetime_ct || req.confirmed_datetime}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {req.scheduled_location || 'Thrifty Curator Store'}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Confirmed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// Request Availability Modal
function RequestAvailabilityModal({ applications, onClose, onSend, selectedIds }) {
  const [dateStart, setDateStart] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await onSend(selectedIds, dateStart, dateEnd);
    setSending(false);
  };

  const formatDateForDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Request Availability</h3>
          <p className="text-sm text-gray-500">
            Send availability request to {applications.length} applicant(s)
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Selected Applicants */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Selected Applicants</Label>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {applications.map(app => (
                <div key={app.id} className="flex items-center gap-2 text-sm text-gray-700 py-1">
                  <User className="w-4 h-4 text-gray-400" />
                  {app.name} ({app.email})
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">From</Label>
              <Input
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                className="border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">{formatDateForDisplay(dateStart)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1 block">To</Label>
              <Input
                type="date"
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                className="border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">{formatDateForDisplay(dateEnd)}</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            Applicants will receive an email asking them to submit their available times within this date range for an in-person interview.
          </p>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !dateStart || !dateEnd}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Request
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}


// Schedule Modal - Pick a time from availability
function ScheduleModal({ request, onClose, onSchedule }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [location, setLocation] = useState('Thrifty Curator Store');
  const [scheduling, setScheduling] = useState(false);

  // Generate 30-minute slots from availability windows
  const generate30MinSlots = (window) => {
    const slots = [];
    const [startH, startM] = window.start_time_pht.split(':').map(Number);
    const [endH, endM] = window.end_time_pht.split(':').map(Number);
    
    let currentMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Handle overnight
    if (endMinutes <= currentMinutes) {
      endMinutes += 24 * 60;
    }
    
    while (currentMinutes + 30 <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60) % 24;
      const slotStartM = currentMinutes % 60;
      const slotEndH = Math.floor((currentMinutes + 30) / 60) % 24;
      const slotEndM = (currentMinutes + 30) % 60;
      
      const formatTime = (h, m) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
      };
      
      // Convert to CT
      const phtDate = new Date(`${window.date}T${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}:00+08:00`);
      const ctOptions = { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
      const ctStart = phtDate.toLocaleString('en-US', ctOptions);
      
      const phtEndDate = new Date(`${window.date}T${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}:00+08:00`);
      const ctEnd = phtEndDate.toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true });
      
      slots.push({
        date: window.date,
        startTime: `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`,
        endTime: `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`,
        displayPHT: `${formatTime(slotStartH, slotStartM)} - ${formatTime(slotEndH, slotEndM)} PHT`,
        displayCT: `${ctStart} - ${ctEnd} CT`
      });
      
      currentMinutes += 30;
    }
    
    return slots;
  };

  const timeSlots = request.applicant_response?.time_slots || [];
  const allSlots = timeSlots.flatMap(generate30MinSlots);

  const handleSchedule = async () => {
    if (!selectedSlot) return;
    setScheduling(true);
    
    const dateObj = new Date(selectedSlot.date + 'T12:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    await onSchedule(
      request.id,
      `${dateStr} at ${selectedSlot.displayPHT.replace(' PHT', '')}`,
      selectedSlot.displayCT.replace(' CT', ''),
      location
    );
    setScheduling(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Schedule Interview</h3>
          <p className="text-sm text-gray-500">
            Choose a time for {request.applicant_name}'s in-person interview
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Available Time Slots */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Select a 30-minute slot
            </Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allSlots.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No time slots available</p>
              ) : (
                allSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSlot === slot
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{slot.displayCT}</div>
                    <div className="text-sm text-gray-500">{slot.displayPHT}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Location</Label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Interview location"
              className="border-gray-300"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSchedule}
            disabled={scheduling || !selectedSlot}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {scheduling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Schedule Interview
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}


// Message Modal
function MessageModal({ request, onClose, onSend }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await onSend(message);
    setSending(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Send Message</h3>
          <p className="text-sm text-gray-500">
            Send a message to {request.applicant_name}
          </p>
        </div>

        <div className="p-4">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
