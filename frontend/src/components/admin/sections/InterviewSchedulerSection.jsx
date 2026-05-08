import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Clock, Plus, Trash2, Send, User, Phone, Mail, 
  ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InterviewSchedulerSection({ getAuthHeader }) {
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'slots', 'applicants'
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      const [slotsRes, bookingsRes, appsRes] = await Promise.all([
        axios.get(`${API}/api/interview-scheduler/admin/slots`, getAuthHeader()),
        axios.get(`${API}/api/interview-scheduler/admin/bookings`, getAuthHeader()),
        axios.get(`${API}/api/admin/forms/job-applications`, getAuthHeader())
      ]);
      setSlots(slotsRes.data);
      setBookings(bookingsRes.data);
      setApplications(appsRes.data.filter(app => !app.interview_scheduled));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const availableSlots = slots.filter(s => !s.is_booked);
  const bookedSlots = slots.filter(s => s.is_booked);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{availableSlots.length}</div>
          <div className="text-purple-100 text-sm">Available Slots</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{bookings.filter(b => b.status === 'confirmed').length}</div>
          <div className="text-green-100 text-sm">Scheduled</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{applications.length}</div>
          <div className="text-blue-100 text-sm">Pending Invite</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'slots', label: 'Manage Slots', icon: Clock },
          { id: 'applicants', label: 'Send Invites', icon: Send }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

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
          <div className="grid grid-cols-7 text-center text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 font-medium text-gray-500 bg-gray-50 border-b">
                {day}
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
                  className={`min-h-[80px] p-1 border-b border-r text-left ${
                    !day ? 'bg-gray-50' : ''
                  } ${isToday ? 'bg-purple-50' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-purple-600' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
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
                  .sort((a, b) => a.interview_date.localeCompare(b.interview_date))
                  .map(booking => (
                    <div key={booking.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{booking.applicant_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(booking.interview_date)} at {formatTime(booking.interview_time.split(' - ')[0])}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          booking.preferred_contact === 'text' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {booking.preferred_contact === 'text' ? (
                            <><MessageSquare className="w-3 h-3 inline mr-1" />Text</>
                          ) : (
                            <><Mail className="w-3 h-3 inline mr-1" />Email</>
                          )}
                        </span>
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
                <div key={index} className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={slot.date}
                    onChange={(e) => updateSlotRow(index, 'date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlotRow(index, 'start_time', e.target.value)}
                    className="w-32"
                    placeholder="Start"
                  />
                  <span className="text-gray-400">to</span>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlotRow(index, 'end_time', e.target.value)}
                    className="w-32"
                    placeholder="End"
                  />
                  {newSlots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSlotRow(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
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
          <h4 className="font-medium text-gray-900 mb-4">Applicants Awaiting Invite</h4>
          
          {availableSlots.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> No available time slots. Create some slots first before sending invites.
              </p>
            </div>
          )}

          {applications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No applicants waiting for interview invites</p>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{app.full_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {app.email}
                        </span>
                        {app.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {app.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          app.preferred_contact === 'text'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          Prefers: {app.preferred_contact === 'text' ? 'Text' : 'Email'}
                        </span>
                        {app.scheduler_invite_sent && (
                          <span className="text-xs text-green-600">✓ Invite sent</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => sendInvite(app.id, app.full_name)}
                    disabled={availableSlots.length === 0}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {app.scheduler_invite_sent ? 'Resend Invite' : 'Send Invite'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
