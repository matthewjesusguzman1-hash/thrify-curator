import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ManageInterviewPage() {
  const { cancelToken } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [actionComplete, setActionComplete] = useState(null); // 'cancelled' or 'rescheduled'

  useEffect(() => {
    fetchBooking();
  }, [cancelToken]);

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`${API}/api/interview-scheduler/manage/${cancelToken}`);
      setBooking(response.data.booking);
      setAvailableSlots(response.data.available_slots);
    } catch (err) {
      setError(err.response?.data?.detail || 'Booking not found');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const parts = time.split(' - ');
    return parts.map(t => {
      const [hour, minute] = t.split(':');
      let h = parseInt(hour);
      const suffix = h >= 12 ? 'PM' : 'AM';
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      return `${h}:${minute} ${suffix}`;
    }).join(' - ');
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancelling');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/api/interview-scheduler/cancel/${cancelToken}`, {
        reason: cancelReason
      });
      setActionComplete('cancelled');
      toast.success('Interview cancelled');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedNewSlot) {
      toast.error('Please select a new time');
      return;
    }
    if (!rescheduleReason.trim()) {
      toast.error('Please provide a reason for rescheduling');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/interview-scheduler/reschedule/${cancelToken}`, {
        new_slot_id: selectedNewSlot.id,
        reason: rescheduleReason
      });
      setBooking({
        ...booking,
        interview_date: response.data.new_date,
        interview_time: response.data.new_time
      });
      setActionComplete('rescheduled');
      toast.success('Interview rescheduled!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reschedule');
    } finally {
      setProcessing(false);
    }
  };

  const groupSlotsByDate = () => {
    const grouped = {};
    availableSlots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (actionComplete === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your interview has been cancelled. We've sent you a confirmation.
          </p>
          <p className="text-sm text-gray-500">
            If you'd like to reschedule in the future, just reply to any of our emails.
          </p>
        </div>
      </div>
    );
  }

  if (actionComplete === 'rescheduled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Rescheduled!</h1>
          <p className="text-gray-600 mb-6">
            Your interview has been moved to the new time.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-green-800">{formatDate(booking.interview_date)}</p>
            <p className="text-green-700">{formatTime(booking.interview_time)}</p>
          </div>
          <p className="text-sm text-gray-500">
            A confirmation has been sent to you.
          </p>
        </div>
      </div>
    );
  }

  if (booking?.status !== 'confirmed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Active</h1>
          <p className="text-gray-600">
            This interview booking is no longer active (status: {booking?.status}).
          </p>
        </div>
      </div>
    );
  }

  const groupedSlots = groupSlotsByDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Current Booking Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-xl font-bold">Interview Confirmed</h1>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{formatDate(booking.interview_date)}</p>
                <p className="text-gray-600">{formatTime(booking.interview_time)}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p><strong>Location:</strong> Thrifty Curator Store</p>
              <p className="mt-1"><strong>Contact Preference:</strong> {booking.preferred_contact === 'text' ? 'Text Message' : 'Email'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => setShowRescheduleModal(true)}
            className="py-6 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reschedule
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            className="py-6 flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <XCircle className="w-5 h-5" />
            Cancel
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500">
          Please give us as much notice as possible if you need to change your appointment.
        </p>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Interview?</h2>
            <p className="text-gray-600 mb-4">
              We're sorry to hear you need to cancel. Please let us know why so we can improve.
            </p>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Reason for cancelling</label>
              <Textarea
                placeholder="e.g., Schedule conflict, found another opportunity, personal reasons..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                className="flex-1"
              >
                Keep Appointment
              </Button>
              <Button
                onClick={handleCancel}
                disabled={processing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {processing ? 'Cancelling...' : 'Cancel Interview'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRescheduleModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
              <h2 className="text-lg font-bold">Reschedule Interview</h2>
              <p className="text-sm opacity-90">Choose a new time</p>
            </div>
            
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {availableSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No other times available right now. Please contact us to reschedule.
                </p>
              ) : (
                <>
                  {Object.entries(groupedSlots).map(([date, dateSlots]) => (
                    <div key={date} className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2 text-sm">{formatDate(date)}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {dateSlots.map(slot => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedNewSlot(slot)}
                            className={`p-2 rounded-lg border text-sm transition-all ${
                              selectedNewSlot?.id === slot.id
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-300 text-gray-700'
                            }`}
                          >
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {selectedNewSlot && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-700 block mb-2">Reason for rescheduling</label>
                      <Textarea
                        placeholder="Brief reason..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={processing || !selectedNewSlot}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              >
                {processing ? 'Rescheduling...' : 'Confirm New Time'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
