import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Plus, Trash2, Send, User, Phone, Mail, 
  ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronUp, UserX, Eye, Loader2, Inbox, MapPin,
  MessageSquare, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InterviewSchedulerSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'calendar', 'slots', 'applicants'
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Availability inbox state (new flow)
  const [availabilityRequests, setAvailabilityRequests] = useState([]);
  const [selectedAvailRequest, setSelectedAvailRequest] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  
  // Rejection modal state
  const [showRejectionPreview, setShowRejectionPreview] = useState(false);
  const [rejectionPreview, setRejectionPreview] = useState(null);
  const [loadingRejectionPreview, setLoadingRejectionPreview] = useState(false);
  const [sendingRejection, setSendingRejection] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // New slot form
  const [newSlots, setNewSlots] = useState([
    { date: '', start_time: '', end_time: '' }
  ]);
  const [creatingSlots, setCreatingSlots] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slotsRes, bookingsRes, appsRes, availRes] = await Promise.all([
        axios.get(`${API}/api/interview-scheduler/admin/slots`, getAuthHeader()),
        axios.get(`${API}/api/interview-scheduler/admin/bookings`, getAuthHeader()),
        axios.get(`${API}/api/admin/forms/job-applications`, getAuthHeader()),
        axios.get(`${API}/api/interview-scheduler/admin/availability-inbox`, getAuthHeader()).catch(() => ({ data: { requests: [] } }))
      ]);
      setSlots(slotsRes.data);
      setBookings(bookingsRes.data);
      setApplications(appsRes.data.filter(app => !app.interview_scheduled && !app.availability_request_sent));
      setAvailabilityRequests(availRes.data.requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    // Add empty days for padding
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatDateKey = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date) => {
    const dateKey = formatDateKey(date);
    const daySlots = slots.filter(s => s.date === dateKey);
    const dayBookings = bookings.filter(b => b.interview_date === dateKey && b.status === 'confirmed');
    return { slots: daySlots, bookings: dayBookings };
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Slot management
  const addSlotRow = () => {
    setNewSlots([...newSlots, { date: '', start_time: '', end_time: '' }]);
  };

  const removeSlotRow = (index) => {
    setNewSlots(newSlots.filter((_, i) => i !== index));
  };

  const updateSlotRow = (index, field, value) => {
    const updated = [...newSlots];
    updated[index][field] = value;
    setNewSlots(updated);
  };

  const createSlots = async () => {
    const validSlots = newSlots.filter(s => s.date && s.start_time && s.end_time);
    if (validSlots.length === 0) {
      toast.error('Please fill in at least one complete time slot');
      return;
    }

    setCreatingSlots(true);
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/slots`,
        { slots: validSlots },
        getAuthHeader()
      );
      toast.success(`Created ${validSlots.length} time slot(s)`);
      setNewSlots([{ date: '', start_time: '', end_time: '' }]);
      fetchData();
    } catch (error) {
      toast.error('Failed to create slots');
    } finally {
      setCreatingSlots(false);
    }
  };

  const deleteSlot = async (slotId) => {
    if (!window.confirm('Delete this time slot?')) return;
    
    try {
      await axios.delete(
        `${API}/api/interview-scheduler/admin/slots/${slotId}`,
        getAuthHeader()
      );
      toast.success('Slot deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete slot');
    }
  };

  // Send availability request (new flow - like video interview)
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
      toast.error(error.response?.data?.detail || 'Failed to send availability request');
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
      toast.success('Interview scheduled as draft');
      setShowScheduleModal(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule');
    }
  };

  // Unschedule (return to responded)
  const unscheduleAvailability = async (requestId, applicantName) => {
    if (!window.confirm(`Remove scheduled time for ${applicantName}?\n\nThis will NOT delete their availability.`)) return;
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
  const sendAvailabilityConfirmation = async (requestId) => {
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
  const sendAvailabilityMessage = async (requestId) => {
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

  // Delete availability request
  const deleteAvailabilityRequest = async (requestId) => {
    if (!window.confirm('Delete this availability request? This cannot be undone.')) return;
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

  const sendInvite = async (applicationId, applicantName) => {
    try {
      const response = await axios.post(
        `${API}/api/interview-scheduler/admin/send-invite/${applicationId}`,
        {},
        getAuthHeader()
      );
      toast.success(`Scheduling invite sent to ${applicantName}!`);
      fetchData();
    } catch (error) {
      toast.error('Failed to send invite');
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this interview? The applicant will be notified.')) return;
    
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/bookings/${bookingId}/cancel`,
        {},
        getAuthHeader()
      );
      toast.success('Interview cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  // Load post-interview rejection preview
  const handleLoadRejectionPreview = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setLoadingRejectionPreview(true);
    try {
      const response = await axios.get(
        `${API}/api/interview-scheduler/admin/booking/${bookingId}/rejection-preview`,
        getAuthHeader()
      );
      setRejectionPreview(response.data);
      setShowRejectionPreview(true);
    } catch (error) {
      console.error("Error loading rejection preview:", error);
      toast.error(error.response?.data?.detail || "Failed to load rejection preview");
    } finally {
      setLoadingRejectionPreview(false);
    }
  };

  // Send post-interview rejection email
  const handleSendRejection = async () => {
    setSendingRejection(true);
    try {
      await axios.post(
        `${API}/api/interview-scheduler/admin/booking/${selectedBookingId}/send-rejection`,
        {},
        getAuthHeader()
      );
      toast.success(`Rejection email sent to ${rejectionPreview.applicant_name}`);
      setShowRejectionPreview(false);
      setRejectionPreview(null);
      setSelectedBookingId(null);
      fetchData();
    } catch (error) {
      console.error("Error sending rejection:", error);
      toast.error(error.response?.data?.detail || "Failed to send rejection email");
    } finally {
      setSendingRejection(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hour, minute] = time.split(':');
    let h = parseInt(hour);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${minute} ${suffix}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading && isExpanded) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-gray-900">Interview Scheduler</h2>
              <p className="text-sm text-gray-500">Manage interview slots</p>
            </div>
          </div>
          <ChevronUp className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex items-center justify-center py-12 border-t">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const availableSlots = slots.filter(s => !s.is_booked);
  const bookedSlots = slots.filter(s => s.is_booked);
  const scheduledCount = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="interview-scheduler-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-gray-900">Interview Scheduler</h2>
            <p className="text-sm text-gray-500">
              {availableSlots.length} available slots
              {scheduledCount > 0 && <span className="text-green-600 ml-2">• {scheduledCount} scheduled</span>}
              {applications.length > 0 && <span className="text-blue-600 ml-2">• {applications.length} pending</span>}
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
            <div className="p-4 pt-0 space-y-6 border-t">
    {/* Stats Bar */}
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-3 sm:p-4 text-white">
        <div className="text-xl sm:text-2xl font-bold">{availableSlots.length}</div>
        <div className="text-purple-100 text-xs sm:text-sm">Available Slots</div>
      </div>
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 sm:p-4 text-white">
        <div className="text-xl sm:text-2xl font-bold">{scheduledCount}</div>
        <div className="text-green-100 text-xs sm:text-sm">Scheduled</div>
      </div>
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-3 sm:p-4 text-white">
        <div className="text-xl sm:text-2xl font-bold">{applications.length}</div>
        <div className="text-blue-100 text-xs sm:text-sm">Pending Invite</div>
      </div>
    </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { id: 'inbox', label: 'Availability Inbox', icon: Inbox, badge: availabilityRequests.filter(r => r.status === 'responded').length },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'slots', label: 'Manage Slots', icon: Clock },
          { id: 'applicants', label: 'Send Invites', icon: Send }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm relative ${
              activeTab === tab.id
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Availability Inbox Tab (New) */}
      {activeTab === 'inbox' && (
        <AvailabilityInboxTab
          requests={availabilityRequests}
          onSchedule={(req) => setShowScheduleModal(req)}
          onUnschedule={unscheduleAvailability}
          onSendConfirmation={sendAvailabilityConfirmation}
          onSendMessage={sendAvailabilityMessage}
          onDelete={deleteAvailabilityRequest}
          getAuthHeader={getAuthHeader}
        />
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-lg">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 text-center text-xs sm:text-sm">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="p-1 sm:p-2 font-medium text-gray-500 bg-gray-50 border-b">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span>
              </div>
            ))}
            {days.map((day, index) => {
              const events = day ? getEventsForDate(day) : { slots: [], bookings: [] };
              const isToday = day && formatDateKey(day) === formatDateKey(new Date());
              const hasAvailable = events.slots.some(s => !s.is_booked);
              const hasBooked = events.bookings.length > 0;

              return (
                <div
                  key={index}
                  className={`min-h-[50px] sm:min-h-[80px] p-0.5 sm:p-1 border-b border-r text-left ${
                    !day ? 'bg-gray-50' : ''
                  } ${isToday ? 'bg-purple-50' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-purple-600' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1 hidden sm:block">
                        {hasAvailable && (
                          <div className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded truncate">
                            {events.slots.filter(s => !s.is_booked).length} available
                          </div>
                        )}
                        {events.bookings.slice(0, 2).map((booking, i) => (
                          <div key={i} className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded truncate">
                            {formatTime(booking.interview_time.split(' - ')[0])} - {booking.applicant_name.split(' ')[0]}
                          </div>
                        ))}
                        {events.bookings.length > 2 && (
                          <div className="text-xs text-gray-500">+{events.bookings.length - 2} more</div>
                        )}
                      </div>
                      {/* Mobile dots indicator */}
                      <div className="sm:hidden flex gap-0.5 mt-0.5">
                        {hasAvailable && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                        {hasBooked && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upcoming Interviews List */}
          <div className="p-4 border-t bg-gray-50">
            <h4 className="font-medium text-gray-700 mb-3">Upcoming Interviews</h4>
            {bookings.filter(b => b.status === 'confirmed').length === 0 ? (
              <p className="text-gray-500 text-sm">No interviews scheduled</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {bookings
                  .filter(b => b.status === 'confirmed')
                  .sort((a, b) => {
                    // Sort by date first, then by time
                    const dateCompare = a.interview_date.localeCompare(b.interview_date);
                    if (dateCompare !== 0) return dateCompare;
                    // Extract start time for comparison
                    const timeA = a.interview_time?.split(' - ')[0] || '00:00';
                    const timeB = b.interview_time?.split(' - ')[0] || '00:00';
                    return timeA.localeCompare(timeB);
                  })
                  .map(booking => (
                    <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{booking.applicant_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(booking.interview_date)} at {formatTime(booking.interview_time.split(' - ')[0])}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        {!booking.rejection_sent ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadRejectionPreview(booking.id)}
                            disabled={loadingRejectionPreview && selectedBookingId === booking.id}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs"
                          >
                            {loadingRejectionPreview && selectedBookingId === booking.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserX className="w-3 h-3 mr-1" />
                            )}
                            Not Moving Forward
                          </Button>
                        ) : (
                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            Rejection Sent
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage Slots Tab */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          {/* Create New Slots */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Add Available Time Slots
            </h4>
            
            <div className="space-y-3">
              {newSlots.map((slot, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <Input
                    type="date"
                    value={slot.date}
                    onChange={(e) => updateSlotRow(index, 'date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full sm:flex-1"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlotRow(index, 'start_time', e.target.value)}
                      className="flex-1 sm:w-28 min-w-0"
                      placeholder="Start"
                    />
                    <span className="text-gray-400 flex-shrink-0">to</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlotRow(index, 'end_time', e.target.value)}
                      className="flex-1 sm:w-28 min-w-0"
                      placeholder="End"
                    />
                    {newSlots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlotRow(index)}
                        className="text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={addSlotRow} className="flex-1">
                <Plus className="w-4 h-4 mr-1" /> Add Row
              </Button>
              <Button 
                onClick={createSlots} 
                disabled={creatingSlots}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {creatingSlots ? 'Creating...' : 'Create Slots'}
              </Button>
            </div>
          </div>

          {/* Existing Slots */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-4">Current Time Slots</h4>
            
            {slots.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No time slots created yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {slots
                  .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))
                  .map(slot => (
                    <div 
                      key={slot.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        slot.is_booked ? 'bg-green-50 border-green-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          slot.is_booked ? 'bg-green-100' : 'bg-purple-100'
                        }`}>
                          {slot.is_booked ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{formatDate(slot.date)}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {slot.is_booked ? (
                          <span className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                            Booked: {slot.booked_by?.split(' ')[0]}
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSlot(slot.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Invites Tab */}
      {activeTab === 'applicants' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-4">Applicants Awaiting Interview Request</h4>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              <strong>New Flow:</strong> Send an availability request - applicants submit their preferred times, 
              then you pick a 30-minute slot and confirm.
            </p>
          </div>

          {applications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No applicants waiting for interview invites</p>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-gray-50 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{app.full_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" /> 
                        <span className="truncate">{app.email}</span>
                      </p>
                      {app.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 flex-shrink-0" /> {app.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => sendAvailabilityRequest(app.id, app.full_name)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white w-full sm:w-auto flex-shrink-0"
                    data-testid={`send-availability-request-${app.id}`}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Request Availability
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Post-Interview Rejection Preview Modal */}
      <AnimatePresence>
        {showRejectionPreview && rejectionPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowRejectionPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Preview Rejection Email</h3>
                </div>
                <button
                  onClick={() => setShowRejectionPreview(false)}
                  className="text-white/80 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              {/* Email Preview */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">To:</p>
                  <p className="font-medium text-gray-900">{rejectionPreview.applicant_email}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Interview was:</p>
                  <p className="font-medium text-gray-900">
                    {rejectionPreview.interview_date} at {rejectionPreview.interview_time}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Subject:</p>
                  <p className="font-medium text-gray-900">{rejectionPreview.subject}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Message Preview:</p>
                  <div className="bg-gray-50 rounded-xl p-4 max-h-[250px] overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {rejectionPreview.preview_text}
                    </pre>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> The email will include buttons for the applicant to choose whether to keep their application on file for future opportunities.
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionPreview(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendRejection}
                  disabled={sendingRejection}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {sendingRejection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Rejection Email
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleFromAvailabilityModal
          request={showScheduleModal}
          onClose={() => setShowScheduleModal(null)}
          onSchedule={scheduleFromAvailability}
        />
      )}
    </div>
  );
}


// Availability Inbox Tab Component
function AvailabilityInboxTab({ requests, onSchedule, onUnschedule, onSendConfirmation, onSendMessage, onDelete }) {
  // Helper to parse datetime string for sorting (handles various formats)
  const parseDateTimeForSort = (dateTimeStr) => {
    if (!dateTimeStr) return new Date(9999, 11, 31); // Put items without dates at the end
    
    // Try to extract date components from various formats
    // Format examples: "Sat, Aug 23 at 10:30 AM CT", "Saturday, Aug 23 at 10:30 AM - 11:00 AM PHT"
    const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 
                       'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
    
    // Try to match: "Mon, Aug 23" or "Monday, Aug 23" pattern
    const dateMatch = dateTimeStr.match(/([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d+)/);
    const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    
    if (dateMatch && timeMatch) {
      const month = monthMap[dateMatch[2]] ?? 0;
      const day = parseInt(dateMatch[3], 10);
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const isPM = timeMatch[3].toUpperCase() === 'PM';
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      // Assume current year
      const year = new Date().getFullYear();
      return new Date(year, month, day, hours, minutes);
    }
    
    // Fallback: try parsing directly
    const parsed = new Date(dateTimeStr);
    return isNaN(parsed.getTime()) ? new Date(9999, 11, 31) : parsed;
  };

  // Group by status and sort chronologically (earliest first)
  const responded = requests.filter(r => r.status === 'responded');
  const scheduled = requests
    .filter(r => r.status === 'scheduled')
    .sort((a, b) => {
      const dateA = parseDateTimeForSort(a.scheduled_datetime_ct || a.scheduled_datetime);
      const dateB = parseDateTimeForSort(b.scheduled_datetime_ct || b.scheduled_datetime);
      return dateA - dateB;
    });
  const confirmed = requests
    .filter(r => r.status === 'confirmed')
    .sort((a, b) => {
      const dateA = parseDateTimeForSort(a.confirmed_datetime_ct || a.confirmed_datetime);
      const dateB = parseDateTimeForSort(b.confirmed_datetime_ct || b.confirmed_datetime);
      return dateA - dateB;
    });
  const pending = requests.filter(r => r.status === 'pending');
  const needsReschedule = requests.filter(r => r.status === 'needs_reschedule');

  const getStatusBadge = (status) => {
    switch (status) {
      case "responded":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Responded</span>;
      case "confirmed":
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Confirmed</span>;
      case "scheduled":
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Scheduled (Draft)</span>;
      case "needs_reschedule":
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Needs Reschedule</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>;
    }
  };

  const formatAvailability = (avail) => {
    if (!avail || avail.length === 0) return 'No availability submitted';
    return avail.map((a, i) => {
      const date = new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const startTime = formatTime12h(a.start_time);
      const endTime = formatTime12h(a.end_time);
      return `${date}: ${startTime} - ${endTime}`;
    }).join(' | ');
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No availability requests yet</p>
        <p className="text-gray-400 text-sm mt-1">Send availability requests from the Send Invites tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scheduled Drafts Section */}
      {scheduled.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-purple-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Scheduled (Ready to Send) - {scheduled.length}
            </h4>
            {scheduled.length > 1 && (
              <Button
                size="sm"
                onClick={() => scheduled.forEach(r => onSendConfirmation(r.id))}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Send All ({scheduled.length})
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {scheduled.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-purple-700">{req.scheduled_datetime_ct || req.scheduled_datetime}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
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

      {/* Responded - Ready to Schedule */}
      {responded.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Ready to Schedule - {responded.length}
          </h4>
          <div className="space-y-3">
            {responded.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

      {/* Confirmed Interviews */}
      {confirmed.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Confirmed Interviews - {confirmed.length}
          </h4>
          <div className="space-y-3">
            {confirmed.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-blue-700">{req.confirmed_datetime_ct || req.confirmed_datetime}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {req.scheduled_location || 'Thrifty Curator Store'}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending / Needs Reschedule */}
      {(pending.length > 0 || needsReschedule.length > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-700 mb-4">Waiting for Response</h4>
          <div className="space-y-3">
            {[...pending, ...needsReschedule].map(req => (
              <div key={req.id} className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.applicant_name}</p>
                    <p className="text-sm text-gray-500">{req.applicant_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(req.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(req.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// Schedule from Availability Modal
function ScheduleFromAvailabilityModal({ request, onClose, onSchedule }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [specificTime, setSpecificTime] = useState('');
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
      if (slots.length >= 24) break; // Limit
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
    if (!selectedSlot && !specificTime) {
      toast.error('Please select a time slot');
      return;
    }

    setScheduling(true);
    
    const slot = selectedSlot;
    const selectedDate = slot?.date || request.availability[0]?.date;
    const selectedTime = slot?.start || specificTime;
    const endTime = slot?.end || '';
    
    // Format PHT datetime
    const phtDatetime = `${formatDateDisplay(selectedDate)} at ${formatTime12h(selectedTime)}${endTime ? ` - ${formatTime12h(endTime)}` : ''} PHT`;
    
    // Format CT datetime
    const ctStart = convertPHTtoCT(selectedDate, selectedTime);
    let ctDatetime = ctStart;
    if (endTime) {
      const ctEnd = convertPHTtoCT(selectedDate, endTime);
      if (ctEnd) {
        const endTimePart = ctEnd.split(', ').pop()?.replace(' CT', '') || '';
        ctDatetime = `${ctStart.replace(' CT', '')} - ${endTimePart} CT`;
      }
    }

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
                      onClick={() => {
                        setSelectedSlot(slot);
                        setSpecificTime('');
                      }}
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
                <strong>Central:</strong> {convertPHTtoCT(selectedSlot.date, selectedSlot.start)} - {convertPHTtoCT(selectedSlot.date, selectedSlot.end)?.split(',').pop()?.trim()}
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
                Schedule (Review Later)
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
