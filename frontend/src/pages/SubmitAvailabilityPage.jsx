import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, CheckCircle, AlertCircle, Plus, Trash2, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SubmitAvailabilityPage() {
  const { token } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicantName, setApplicantName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState(null);
  const [alreadyScheduled, setAlreadyScheduled] = useState(false);
  
  // Availability windows
  const [availability, setAvailability] = useState([
    { date: '', start_time: '', end_time: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [token]);

  const fetchDetails = async () => {
    try {
      const response = await axios.get(`${API}/api/interview-scheduler/availability/${token}`);
      setApplicantName(response.data.applicant_name);
      
      if (response.data.already_confirmed) {
        setAlreadyConfirmed(true);
        setConfirmationDetails(response.data);
      } else if (response.data.already_scheduled) {
        setAlreadyScheduled(true);
      } else if (response.data.existing_availability?.length > 0) {
        setAvailability(response.data.existing_availability);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  const addAvailabilityRow = () => {
    setAvailability([...availability, { date: '', start_time: '', end_time: '' }]);
  };

  const removeAvailabilityRow = (index) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const updateAvailability = (index, field, value) => {
    const updated = [...availability];
    updated[index][field] = value;
    setAvailability(updated);
  };

  // Convert time to CT for display
  const convertToCT = (date, time) => {
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

  // Get just the time portion for CT (for end times on same day)
  const convertToCTTimeOnly = (date, time) => {
    if (!date || !time) return null;
    const phtString = `${date}T${time}:00+08:00`;
    const utcDate = new Date(phtString);
    if (isNaN(utcDate.getTime())) return null;
    return utcDate.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Check if two PHT times convert to the same CT date
  const sameCtDate = (date, time1, time2) => {
    if (!date || !time1 || !time2) return true;
    const pht1 = new Date(`${date}T${time1}:00+08:00`);
    const pht2 = new Date(`${date}T${time2}:00+08:00`);
    const ct1 = pht1.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    const ct2 = pht2.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    return ct1 === ct2;
  };

  // Format CT range with smart date handling
  const formatCTRange = (date, startTime, endTime) => {
    if (!date || !startTime || !endTime) return null;
    const startCT = convertToCT(date, startTime);
    const endCT = convertToCT(date, endTime);
    if (!startCT || !endCT) return null;
    
    if (sameCtDate(date, startTime, endTime)) {
      return `${startCT.replace(' CT', '')} - ${convertToCTTimeOnly(date, endTime)} CT`;
    } else {
      return `${startCT} to ${endCT}`;
    }
  };

  const handleSubmit = async () => {
    const validWindows = availability.filter(a => a.date && a.start_time && a.end_time);
    
    if (validWindows.length === 0) {
      toast.error('Please add at least one availability window');
      return;
    }

    // Validate times
    for (const window of validWindows) {
      if (window.start_time >= window.end_time) {
        // Allow overnight (e.g., 11 PM to 1 AM)
        // Only error if same time
        if (window.start_time === window.end_time) {
          toast.error('Start and end time cannot be the same');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/interview-scheduler/availability/${token}`, {
        availability: validWindows
      });
      setSubmitted(true);
      toast.success('Availability submitted!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit availability');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
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

  if (alreadyConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Your interview has already been scheduled:
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="font-semibold text-green-800">{confirmationDetails?.confirmed_datetime}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{confirmationDetails?.confirmed_location || 'Thrifty Curator Store'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyScheduled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Being Scheduled</h1>
          <p className="text-gray-600">
            Your interview is being scheduled. You will receive a confirmation email with the details soon.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Availability Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for submitting your availability. We will review it and send you a 
            confirmation email once your interview is scheduled.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-purple-800 text-sm">
              <strong>Interview Location:</strong> Thrifty Curator Store
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Your Availability</h1>
          <p className="text-gray-600 mt-2">
            Hi {applicantName?.split(' ')[0]}! Let us know when you are available for an in-person interview.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-2">How this works:</h3>
          <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
            <li>Add one or more time windows when you are available</li>
            <li>Enter times in Philippine Time (PHT)</li>
            <li>We will pick a 30-minute slot and confirm via email</li>
          </ol>
        </div>

        {/* Availability Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Your Availability (PHT)
            </h2>
          </div>
          
          <div className="p-4 space-y-4">
            {availability.map((window, index) => (
              <div key={index} className="space-y-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Window {index + 1}</span>
                  {availability.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAvailabilityRow(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={window.date}
                    onChange={(e) => updateAvailability(index, 'date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <Input
                      type="time"
                      value={window.start_time}
                      onChange={(e) => updateAvailability(index, 'start_time', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <span className="text-gray-400 mt-5">to</span>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Until</label>
                    <Input
                      type="time"
                      value={window.end_time}
                      onChange={(e) => updateAvailability(index, 'end_time', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* CT Preview */}
                {window.date && window.start_time && window.end_time && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                    <p className="text-blue-600 text-xs font-medium mb-1">Admin sees (Central Time):</p>
                    <p className="text-blue-800 font-semibold">
                      {formatCTRange(window.date, window.start_time, window.end_time)}
                    </p>
                    {!sameCtDate(window.date, window.start_time, window.end_time) && (
                      <p className="text-amber-600 text-xs mt-1">
                        ⚠️ Note: Your time crosses midnight in Central Time
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addAvailabilityRow}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Time Window
            </Button>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Interview Location</h3>
              <p className="text-gray-600 text-sm">Thrifty Curator Store</p>
              <p className="text-gray-500 text-xs mt-1">Duration: ~30 minutes</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-6 text-lg rounded-xl"
          data-testid="submit-availability-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Availability'}
        </Button>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions? Visit our <a href="https://thrifty-curator.com/contact" className="text-purple-600 hover:underline">contact page</a>.
        </p>
      </div>
    </div>
  );
}
