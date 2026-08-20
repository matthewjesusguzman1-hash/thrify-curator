import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, Send, CheckCircle, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Convert PHT to CT (PHT is UTC+8, CT is UTC-6 standard / UTC-5 DST)
function convertPHTtoCT(date, time) {
  if (!date || !time) return null;
  
  const year = date.split('-')[0];
  const month = date.split('-')[1];
  const day = date.split('-')[2];
  const phtString = `${year}-${month}-${day}T${time}:00+08:00`;
  
  const utcDate = new Date(phtString);
  
  const ctOptions = {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  return utcDate.toLocaleString('en-US', ctOptions);
}

// Parse date string to YYYY-MM-DD
function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

// Generate array of dates between start and end
function getDateRange(startStr, endStr) {
  const start = parseDateToISO(startStr);
  const end = parseDateToISO(endStr);
  
  if (!start || !end) return [];
  
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// Format time for display (24h to 12h)
function formatTime12h(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function InterviewResponsePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [availabilityBlocks, setAvailabilityBlocks] = useState([{ date: '', startTime: '', endTime: '' }]);
  const [notes, setNotes] = useState("");
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    fetchInterviewData();
  }, [token]);

  const fetchInterviewData = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/public/interview-response/${token}`);
      setInterviewData(response.data);
      
      const dates = getDateRange(response.data.date_range_start, response.data.date_range_end);
      setAvailableDates(dates);
      
      if (response.data.already_responded) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Interview request not found or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const addBlock = () => {
    if (availabilityBlocks.length < 5) {
      setAvailabilityBlocks([...availabilityBlocks, { date: '', startTime: '', endTime: '' }]);
    }
  };

  const removeBlock = (index) => {
    if (availabilityBlocks.length > 1) {
      setAvailabilityBlocks(availabilityBlocks.filter((_, i) => i !== index));
    }
  };

  const updateBlock = (index, field, value) => {
    const updated = [...availabilityBlocks];
    updated[index][field] = value;
    setAvailabilityBlocks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validBlocks = availabilityBlocks.filter(block => block.date && block.startTime && block.endTime);
    if (validBlocks.length === 0) {
      toast.error("Please select at least one availability block");
      return;
    }

    // Format the availability text
    const formattedBlocks = validBlocks.map(block => {
      const dateObj = new Date(block.date + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const ctStart = convertPHTtoCT(block.date, block.startTime);
      const ctEnd = convertPHTtoCT(block.date, block.endTime);
      
      return `${dateStr}: ${formatTime12h(block.startTime)} - ${formatTime12h(block.endTime)} PHT\n→ Central Time: ${ctStart?.split(', ')[1] || ''} - ${ctEnd?.split(', ')[1] || ''}`;
    }).join('\n\n');

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/applicant-tests/public/interview-response/${token}`, {
        availability_text: formattedBlocks,
        additional_notes: notes,
        time_slots: validBlocks.map(block => ({
          date: block.date,
          start_time_pht: block.startTime,
          end_time_pht: block.endTime,
          start_time_ct: convertPHTtoCT(block.date, block.startTime),
          end_time_ct: convertPHTtoCT(block.date, block.endTime)
        }))
      });
      
      setSubmitted(true);
      toast.success("Availability submitted successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-[#8B5CF6]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
          <p className="text-white/70 mb-6">
            Your availability has been submitted. We&apos;ll review your response and send you a confirmation email with the meeting details soon.
          </p>
          <p className="text-white/50 text-sm">
            You can close this page now.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Interview Scheduling</h1>
          <p className="text-white/60">Thrifty Curator</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden"
        >
          {/* Greeting */}
          <div className="p-6 border-b border-white/10">
            <p className="text-white text-lg">
              Hi <span className="font-semibold">{interviewData?.applicant_name}</span>,
            </p>
            <p className="text-white/70 mt-2">
              Please select when you&apos;re available for a 30-minute interview.
            </p>
          </div>

          {/* Timezone Info */}
          <div className="p-6 bg-white/5">
            <div className="bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 rounded-xl p-4">
              <p className="text-white font-medium text-sm">
                <Clock className="w-4 h-4 inline mr-2" />
                Select your available time blocks in Philippine Time (PHT)
              </p>
              <p className="text-white/60 text-xs mt-1">
                We&apos;ll pick a 30-minute slot within your available window and send you a confirmation.
              </p>
            </div>
          </div>

          {/* Availability Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <label className="block text-white font-medium mb-4">
              When are you available? *
            </label>
            
            <div className="space-y-4 mb-6">
              {availabilityBlocks.map((block, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/70 text-sm font-medium">
                      {availabilityBlocks.length > 1 ? `Option ${index + 1}` : 'Your Availability'}
                    </span>
                    {availabilityBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlock(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Date Selector */}
                  <div className="mb-4">
                    <label className="block text-white/50 text-xs mb-2">Select Date</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableDates.map((date) => (
                        <button
                          key={date}
                          type="button"
                          onClick={() => updateBlock(index, 'date', date)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            block.date === date 
                              ? 'bg-[#8B5CF6] text-white' 
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {formatDateForDisplay(date)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time Range - Only show after date is selected */}
                  {block.date && (
                    <div className="space-y-3">
                      <p className="text-white/60 text-xs">
                        Select your available window (we&apos;ll schedule a 30-min meeting within this time)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/50 text-xs mb-1">From (PHT)</label>
                          <input
                            type="time"
                            value={block.startTime}
                            onChange={(e) => updateBlock(index, 'startTime', e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] [color-scheme:dark]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-xs mb-1">To (PHT)</label>
                          <input
                            type="time"
                            value={block.endTime}
                            onChange={(e) => updateBlock(index, 'endTime', e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] [color-scheme:dark]"
                            required
                          />
                        </div>
                      </div>
                      
                      {/* Live CT Conversion */}
                      {block.startTime && block.endTime && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                          <p className="text-green-300 text-sm font-medium">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Your Time (CT): {convertPHTtoCT(block.date, block.startTime)?.split(', ')[1]} - {convertPHTtoCT(block.date, block.endTime)?.split(', ')[1]}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add Another Option */}
            {availabilityBlocks.length < 5 && (
              <button
                type="button"
                onClick={addBlock}
                className="w-full py-3 border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:text-white hover:border-white/50 transition-colors flex items-center justify-center gap-2 mb-6"
              >
                <Plus className="w-5 h-5" />
                Add Another Day/Time Option
              </button>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent resize-none"
                placeholder="Any additional information..."
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-6 bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] text-white font-semibold text-lg rounded-xl hover:opacity-90 transition-opacity"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Availability
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Questions? Reply to the original email.
        </p>
      </div>
    </div>
  );
}
