import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Send, User, Phone, Mail, 
  CheckCircle, XCircle, ChevronDown, Loader2, Inbox, MapPin,
  MessageSquare, Users, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InterviewSchedulerSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('applicants'); // 'applicants', 'inbox', 'scheduled'
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Availability inbox state
  const [availabilityRequests, setAvailabilityRequests] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  
  // Legacy slot-based bookings (existing scheduled interviews)
  const [legacyBookings, setLegacyBookings] = useState([]);

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, availRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/api/admin/forms/job-applications`, getAuthHeader()),
        axios.get(`${API}/api/interview-scheduler/admin/availability-inbox`, getAuthHeader()).catch(() => ({ data: { requests: [] } })),
        // Also fetch legacy slot-based bookings
        axios.get(`${API}/api/interview-scheduler/admin/bookings`, getAuthHeader()).catch(() => ({ data: [] }))
      ]);
      setApplications(appsRes.data.filter(app => !app.interview_scheduled && !app.availability_request_sent));
      setAvailabilityRequests(availRes.data.requests || []);
      setLegacyBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Send availability request to applicant
  const sendAvailabilityRequest = async (applicationId, applicantName) => {
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/send-availability-request/${applicationId}`,
        {},
        getAuthHeader()
      );
      toast.success(`Availability request sent to ${applicantName}!`);
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
      toast.success('Confirmation sent!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send confirmation');
    }
  };

  // Send message for new times
  const sendMessage = async (requestId) => {
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/availability-inbox/${requestId}/send-message`,
        {},
        getAuthHeader()
      );
      toast.success('Message sent requesting new times');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    }
  };

  // Delete request
  const deleteRequest = async (requestId) => {
    if (!window.confirm('Delete this request? This cannot be undone.')) return;
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
  const respondedCount = availabilityRequests.filter(r => r.status === 'responded').length;
  const scheduledCount = availabilityRequests.filter(r => r.status === 'scheduled').length;
  const confirmedCount = availabilityRequests.filter(r => r.status === 'confirmed').length;
  const legacyBookingsCount = legacyBookings.length;

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
              {applications.length} pending • {respondedCount} responded • {scheduledCount + confirmedCount + legacyBookingsCount} scheduled
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
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2">
                    {[
                      { id: 'applicants', label: 'Request Availability', icon: Users, count: applications.length },
                      { id: 'inbox', label: 'Review Responses', icon: Inbox, count: respondedCount },
                      { id: 'scheduled', label: 'Scheduled', icon: Calendar, count: scheduledCount + confirmedCount }
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
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                            activeTab === tab.id ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'applicants' && (
                    <ApplicantsTab
                      applications={applications}
                      onSendRequest={sendAvailabilityRequest}
                    />
                  )}

                  {activeTab === 'inbox' && (
                    <InboxTab
                      requests={availabilityRequests.filter(r => r.status === 'responded' || r.status === 'pending' || r.status === 'needs_reschedule')}
                      onSchedule={(req) => setShowScheduleModal(req)}
                      onSendMessage={sendMessage}
                      onDelete={deleteRequest}
                    />
                  )}

                  {activeTab === 'scheduled' && (
                    <ScheduledTab
                      requests={availabilityRequests.filter(r => r.status === 'scheduled' || r.status === 'confirmed')}
                      legacyBookings={legacyBookings}
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


// Tab: Request Availability from Applicants
function ApplicantsTab({ applications, onSendRequest }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No pending applicants</p>
        <p className="text-gray-400 text-sm">All applicants have been sent availability requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">
        Select applicants to request their availability for an in-person interview.
      </p>
      {applications.map(app => (
        <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{app.full_name}</p>
              <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                <Mail className="w-3 h-3" /> {app.email}
              </p>
            </div>
          </div>
          <Button
            onClick={() => onSendRequest(app.id, app.full_name)}
            className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
            size="sm"
            data-testid={`request-availability-${app.id}`}
          >
            <Send className="w-4 h-4 mr-1" />
            Request
          </Button>
        </div>
      ))}
    </div>
  );
}


// Tab: Review Responses (Inbox)
function InboxTab({ requests, onSchedule, onSendMessage, onDelete }) {
  const responded = requests.filter(r => r.status === 'responded');
  const pending = requests.filter(r => r.status === 'pending' || r.status === 'needs_reschedule');

  const formatAvailability = (avail) => {
    if (!avail || avail.length === 0) return 'No availability submitted';
    return avail.map((a) => {
      const date = new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const formatTime = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
      };
      return `${date}: ${formatTime(a.start_time)} - ${formatTime(a.end_time)}`;
    }).join(' | ');
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No responses yet</p>
        <p className="text-gray-400 text-sm">Responses will appear here after applicants submit their availability</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ready to Schedule */}
      {responded.length > 0 && (
        <div>
          <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Ready to Schedule ({responded.length})
          </h4>
          <div className="space-y-2">
            {responded.map(req => (
              <div key={req.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-gray-500">{req.applicant_email}</p>
                    <p className="text-sm text-green-700 mt-1">{formatAvailability(req.availability)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSendMessage(req.id)}
                      className="text-orange-600 border-orange-300"
                      title="Request new times"
                    >
                      <MessageSquare className="w-4 h-4" />
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

      {/* Waiting for Response */}
      {pending.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-600 mb-2">Waiting for Response ({pending.length})</h4>
          <div className="space-y-2">
            {pending.map(req => (
              <div key={req.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{req.applicant_name}</p>
                  <p className="text-sm text-gray-500">{req.applicant_email}</p>
                  {req.status === 'needs_reschedule' && (
                    <span className="text-xs text-orange-600">Requested new times</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(req.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// Tab: Scheduled Interviews
function ScheduledTab({ requests, legacyBookings = [], onUnschedule, onSendConfirmation }) {
  // Sort by date (earliest first)
  const parseDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return new Date(9999, 11, 31);
    const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const match = dateTimeStr.match(/(\w{3})\s+(\d{1,2}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      const [, month, day, hour, min, ampm] = match;
      let h = parseInt(hour);
      if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      return new Date(2026, months[month] ?? 0, parseInt(day), h, parseInt(min));
    }
    return new Date(9999, 11, 31);
  };

  // Parse legacy booking date
  const parseLegacyDate = (booking) => {
    if (booking.interview_date) {
      const d = new Date(booking.interview_date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(9999, 11, 31);
  };

  const scheduled = requests
    .filter(r => r.status === 'scheduled')
    .sort((a, b) => parseDateTime(a.scheduled_datetime_ct || a.scheduled_datetime) - parseDateTime(b.scheduled_datetime_ct || b.scheduled_datetime));
  
  const confirmed = requests
    .filter(r => r.status === 'confirmed')
    .sort((a, b) => parseDateTime(a.confirmed_datetime_ct || a.confirmed_datetime) - parseDateTime(b.confirmed_datetime_ct || b.confirmed_datetime));

  // Sort legacy bookings by interview date
  const sortedLegacyBookings = [...legacyBookings].sort((a, b) => parseLegacyDate(a) - parseLegacyDate(b));

  // Format legacy booking date for display
  const formatLegacyDate = (booking) => {
    if (booking.interview_date) {
      const d = new Date(booking.interview_date);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    }
    return booking.interview_date || 'Date TBD';
  };

  const formatLegacyTime = (booking) => {
    if (booking.interview_time) {
      return booking.interview_time;
    }
    if (booking.slot_start && booking.slot_end) {
      return `${booking.slot_start} - ${booking.slot_end}`;
    }
    return '';
  };

  const hasAnyData = requests.length > 0 || legacyBookings.length > 0;

  if (!hasAnyData) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No scheduled interviews</p>
        <p className="text-gray-400 text-sm">Schedule interviews from the Review Responses tab</p>
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

      {/* Legacy Slot-Based Bookings (Existing Scheduled Interviews) */}
      {sortedLegacyBookings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Slot-Based Interviews ({sortedLegacyBookings.length})
          </h4>
          <div className="space-y-2">
            {sortedLegacyBookings.map((booking, idx) => (
              <div key={booking.id || idx} className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{booking.applicant_name}</p>
                    <p className="text-sm text-blue-700">
                      {formatLegacyDate(booking)} {formatLegacyTime(booking)}
                    </p>
                    {booking.email && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {booking.email}
                      </p>
                    )}
                    {booking.phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {booking.phone}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-700' 
                      : booking.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {booking.status || 'Scheduled'}
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


// Schedule Modal - Pick a time from availability
function ScheduleModal({ request, onClose, onSchedule }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [location, setLocation] = useState('Thrifty Curator Store');
  const [scheduling, setScheduling] = useState(false);

  // Generate 30-minute slots from availability windows
  const generate30MinSlots = (window) => {
    const slots = [];
    const [startH, startM] = window.start_time.split(':').map(Number);
    const [endH, endM] = window.end_time.split(':').map(Number);
    
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
      
      slots.push({
        start: `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`,
        end: `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`,
        date: window.date
      });
      
      currentMinutes += 30;
      if (slots.length >= 24) break;
    }
    return slots;
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const convertPHTtoCT = (date, time) => {
    if (!date || !time) return null;
    const phtString = `${date}T${time}:00+08:00`;
    const utcDate = new Date(phtString);
    if (isNaN(utcDate.getTime())) return null;
    return utcDate.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' CT';
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const handleSchedule = async () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    setScheduling(true);
    
    const phtDatetime = `${formatDateDisplay(selectedSlot.date)} at ${formatTime12h(selectedSlot.start)} - ${formatTime12h(selectedSlot.end)} PHT`;
    const ctStart = convertPHTtoCT(selectedSlot.date, selectedSlot.start);
    const ctEnd = convertPHTtoCT(selectedSlot.date, selectedSlot.end);
    const ctDatetime = ctStart ? `${ctStart.replace(' CT', '')} - ${ctEnd?.split(',').pop()?.trim() || ''}` : phtDatetime;

    await onSchedule(request.id, phtDatetime, ctDatetime, location);
    setScheduling(false);
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-xl font-bold text-gray-900">Schedule Interview</h2>
          <p className="text-sm text-gray-500">{request.applicant_name}</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Availability Windows */}
          {request.availability?.map((window, windowIdx) => (
            <div key={windowIdx} className="space-y-3">
              <h4 className="font-medium text-gray-700">
                {formatDateDisplay(window.date)}
                <span className="text-gray-400 text-sm ml-2">
                  ({formatTime12h(window.start_time)} - {formatTime12h(window.end_time)} PHT)
                </span>
              </h4>
              
              <div className="grid grid-cols-3 gap-2">
                {generate30MinSlots(window).map((slot, slotIdx) => {
                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.date === slot.date;
                  const ctTime = convertPHTtoCT(slot.date, slot.start);
                  
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2 rounded-lg text-sm border transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-200'
                          : 'border-gray-200 hover:border-purple-300 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{formatTime12h(slot.start)}</div>
                      <div className="text-xs text-gray-500">{ctTime?.split(',')[1]?.trim()}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Selected Time Preview */}
          {selectedSlot && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h4 className="font-medium text-purple-900 mb-2">Selected Time</h4>
              <p className="text-sm text-gray-700">
                <strong>PHT:</strong> {formatDateDisplay(selectedSlot.date)} at {formatTime12h(selectedSlot.start)} - {formatTime12h(selectedSlot.end)}
              </p>
              <p className="text-sm text-purple-700">
                <strong>Central:</strong> {convertPHTtoCT(selectedSlot.date, selectedSlot.start)}
              </p>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Thrifty Curator Store"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedSlot || scheduling}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {scheduling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Interview
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
