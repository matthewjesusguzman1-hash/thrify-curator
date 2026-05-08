import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, CheckCircle, AlertCircle, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ScheduleInterviewPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [slots, setSlots] = useState([]);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [contactPreference, setContactPreference] = useState('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [manageUrl, setManageUrl] = useState('');

  useEffect(() => {
    fetchSlots();
  }, [token]);

  const fetchSlots = async () => {
    try {
      const response = await axios.get(`${API}/api/interview-scheduler/available-slots/${token}`);
      setApplicantName(response.data.applicant_name);
      setApplicantEmail(response.data.applicant_email);
      
      if (response.data.already_booked) {
        setAlreadyBooked(true);
        setExistingBooking(response.data.booking);
      } else {
        setSlots(response.data.slots);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired booking link');
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
    const [hour, minute] = time.split(':');
    let h = parseInt(hour);
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${minute} ${suffix}`;
  };

  const groupSlotsByDate = () => {
    const grouped = {};
    slots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  };

  const handleBook = async () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }
    
    if (contactPreference === 'text' && !phoneNumber) {
      toast.error('Please enter your phone number for text notifications');
      return;
    }

    setBooking(true);
    try {
      const response = await axios.post(`${API}/api/interview-scheduler/book/${token}`, {
        slot_id: selectedSlot.id,
        preferred_contact: contactPreference,
        phone_number: phoneNumber || null
      });
      
      setManageUrl(response.data.manage_url);
      setBookingComplete(true);
      toast.success('Interview scheduled!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
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

  if (alreadyBooked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Scheduled!</h1>
          <p className="text-gray-600 mb-6">
            You already have an interview booked for:
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-green-800">{formatDate(existingBooking.date)}</p>
            <p className="text-green-700">{existingBooking.time}</p>
          </div>
          <p className="text-sm text-gray-500">
            Check your email for details and a link to manage your appointment.
          </p>
        </div>
      </div>
    );
  }

  if (bookingComplete) {
    const slot = selectedSlot;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h1>
          <p className="text-gray-600 mb-6">
            Your interview has been confirmed.
          </p>
          
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl p-6 mb-6">
            <Calendar className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-lg">{formatDate(slot.date)}</p>
            <p className="text-purple-100">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-600">
              <strong>Location:</strong> Thrifty Curator Store
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Notifications via:</strong> {contactPreference === 'text' ? 'Text Message' : 'Email'}
            </p>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            A confirmation has been sent to your {contactPreference === 'text' ? 'phone' : 'email'}.
            If anything changes, we'll reach out via your preferred method.
          </p>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = manageUrl}
          >
            Manage Appointment
          </Button>
        </div>
      </div>
    );
  }

  const groupedSlots = groupSlotsByDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Your Interview</h1>
          <p className="text-gray-600 mt-2">
            Hi {applicantName?.split(' ')[0]}! Pick a time that works for you.
          </p>
        </div>

        {/* Time Slots */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Available Times
            </h2>
          </div>
          
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {slots.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No available times right now. Please check back later.
              </p>
            ) : (
              Object.entries(groupedSlots).map(([date, dateSlots]) => (
                <div key={date} className="mb-6 last:mb-0">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    {formatDate(date)}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {dateSlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedSlot?.id === slot.id
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300 text-gray-700'
                        }`}
                      >
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Preference */}
        {selectedSlot && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">How should we contact you?</h2>
            <p className="text-sm text-gray-600 mb-4">
              We'll use this to send confirmations and notify you if anything changes.
            </p>
            
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setContactPreference('email')}
                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                  contactPreference === 'email'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              >
                <Mail className="w-5 h-5" />
                Email
              </button>
              <button
                onClick={() => setContactPreference('text')}
                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                  contactPreference === 'text'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              >
                <Phone className="w-5 h-5" />
                Text
              </button>
            </div>
            
            {contactPreference === 'text' && (
              <div>
                <label className="text-sm text-gray-600 block mb-2">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Book Button */}
        {selectedSlot && (
          <Button
            onClick={handleBook}
            disabled={booking}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-6 text-lg rounded-xl"
          >
            {booking ? 'Booking...' : 'Confirm Interview'}
          </Button>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions? Reply to your invite email or call us at the store.
        </p>
      </div>
    </div>
  );
}
