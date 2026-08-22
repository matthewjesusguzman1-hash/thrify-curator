import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, Send, CheckCircle, AlertCircle, Loader2, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Convert PHT to CT and return formatted string with full date context
function convertPHTtoCT(date, time, options = {}) {
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

// Get just the time portion for CT (for end times on same day)
function convertPHTtoCTTimeOnly(date, time) {
  if (!date || !time) return null;
  
  const year = date.split('-')[0];
  const month = date.split('-')[1];
  const day = date.split('-')[2];
  const phtString = `${year}-${month}-${day}T${time}:00+08:00`;
  
  const utcDate = new Date(phtString);
  
  return utcDate.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Check if two PHT times convert to the same CT date
function sameCtDate(date, time1, time2) {
  if (!date || !time1 || !time2) return true;
  
  const year = date.split('-')[0];
  const month = date.split('-')[1];
  const day = date.split('-')[2];
  
  const pht1 = new Date(`${year}-${month}-${day}T${time1}:00+08:00`);
  const pht2 = new Date(`${year}-${month}-${day}T${time2}:00+08:00`);
  
  const ct1 = pht1.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
  const ct2 = pht2.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
  
  return ct1 === ct2;
}

// Format CT display with smart date handling
function formatCTRange(date, startTime, endTime) {
  if (!date || !startTime || !endTime) return null;
  
  const startCT = convertPHTtoCT(date, startTime);
  const endCT = convertPHTtoCT(date, endTime);
  
  if (!startCT || !endCT) return null;
  
  // If same CT date, show "Sat, Aug 24, 7:00 AM - 7:30 AM"
  // If different CT dates, show both full dates
  if (sameCtDate(date, startTime, endTime)) {
    return `${startCT} - ${convertPHTtoCTTimeOnly(date, endTime)}`;
  } else {
    return `${startCT} to ${endCT}`;
  }
}

// Get the CT date for a given PHT date and time
function getCTDate(phtDate, phtTime) {
  if (!phtDate || !phtTime) return null;
  
  const year = phtDate.split('-')[0];
  const month = phtDate.split('-')[1];
  const day = phtDate.split('-')[2];
  const phtString = `${year}-${month}-${day}T${phtTime}:00+08:00`;
  
  const utcDate = new Date(phtString);
  
  // Get the date in CT timezone
  const ctDateStr = utcDate.toLocaleDateString('en-US', { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parse MM/DD/YYYY to YYYY-MM-DD
  const [m, d, y] = ctDateStr.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
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
  const [ctDateRange, setCTDateRange] = useState({ start: null, end: null });

  useEffect(() => {
    fetchInterviewData();
  }, [token]);

  const fetchInterviewData = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/public/interview-response/${token}`);
      setInterviewData(response.data);
      
      // Parse the admin's date range
      const startDate = parseDateToISO(response.data.date_range_start);
      const endDate = parseDateToISO(response.data.date_range_end);
      
      // Store the CT date range for validation
      setCTDateRange({ start: startDate, end: endDate });
      
      // Generate PHT dates that could potentially fall within the CT date range
      // Since PHT is ahead of CT, we need to include extra days
      // PHT dates that map to CT dates within the range
      const extendedStart = new Date(startDate);
      extendedStart.setDate(extendedStart.getDate()); // Same day in PHT could be prev day in CT
      
      const extendedEnd = new Date(endDate);
      extendedEnd.setDate(extendedEnd.getDate() + 1); // Need next day in PHT to cover end of CT range
      
      const dates = [];
      const current = new Date(extendedStart);
      while (current <= extendedEnd) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      
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

  // Check if a time block falls within the CT date range
  const isWithinCTRange = (block) => {
    if (!block.date || !block.startTime || !ctDateRange.start || !ctDateRange.end) return true;
    
    const ctDateForStart = getCTDate(block.date, block.startTime);
    const ctDateForEnd = block.endTime ? getCTDate(block.date, block.endTime) : ctDateForStart;
    
    if (!ctDateForStart) return true;
    
    // Check if CT date falls within the admin's range
    const isStartInRange = ctDateForStart >= ctDateRange.start && ctDateForStart <= ctDateRange.end;
    const isEndInRange = ctDateForEnd >= ctDateRange.start && ctDateForEnd <= ctDateRange.end;
    
    return isStartInRange || isEndInRange;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validBlocks = availabilityBlocks.filter(block => block.date && block.startTime && block.endTime);
    if (validBlocks.length === 0) {
      toast.error("Please select at least one availability block");
      return;
    }

    // Check if any blocks are outside CT range
    const outOfRangeBlocks = validBlocks.filter(block => !isWithinCTRange(block));
    if (outOfRangeBlocks.length > 0) {
      toast.error("Some of your selected times fall outside the requested date range when converted to Central Time. Please adjust.");
      return;
    }

    // Format the availability text
    const formattedBlocks = validBlocks.map(block => {
      const dateObj = new Date(block.date + 'T12:00:00');
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const ctRange = formatCTRange(block.date, block.startTime, block.endTime);
      
      return `${dateStr}: ${formatTime12h(block.startTime)} - ${formatTime12h(block.endTime)} PHT\n→ Central Time: ${ctRange}`;
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
          end_time_ct: convertPHTtoCT(block.date, block.endTime),
          ct_range: formatCTRange(block.date, block.startTime, block.endTime)
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
            <div className="bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 rounded-xl p-4 mb-3">
              <p className="text-white font-medium text-sm">
                <Clock className="w-4 h-4 inline mr-2" />
                Select your available time blocks in Philippine Time (PHT)
              </p>
              <p className="text-white/60 text-xs mt-1">
                We&apos;ll pick a 30-minute slot within your available window and send you a confirmation.
              </p>
            </div>
            
            {/* Important CT Range Notice */}
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4">
              <p className="text-amber-200 font-medium text-sm flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Please choose times that fall within <strong>{interviewData?.date_range_start} - {interviewData?.date_range_end}</strong> in Central Time (CT). 
                  The system will check this for you.
                </span>
              </p>
            </div>
          </div>

          {/* Availability Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <label className="block text-white font-medium mb-4">
              When are you available? *
            </label>
            
            <div className="space-y-4 mb-6">
              {availabilityBlocks.map((block, index) => {
                const withinRange = isWithinCTRange(block);
                
                return (
                  <div key={index} className={`bg-white/5 rounded-xl p-4 border ${!withinRange && block.startTime && block.endTime ? 'border-red-500/50' : 'border-white/10'}`}>
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
                        
                        {/* Live CT Conversion - Show what time it is for the interviewer */}
                        {block.startTime && block.endTime && (
                          <div className={`rounded-xl p-4 ${withinRange ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                            <p className="text-white/60 text-xs mb-2">This is what time it will be for your interviewer (Central Time):</p>
                            <p className={`text-lg font-bold ${withinRange ? 'text-green-300' : 'text-red-300'}`}>
                              {formatCTRange(block.date, block.startTime, block.endTime)}
                            </p>
                            {!sameCtDate(block.date, block.startTime, block.endTime) && (
                              <p className="text-amber-300 text-xs mt-2 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Note: Your time crosses midnight in Central Time
                              </p>
                            )}
                            {!withinRange && (
                              <p className="text-red-300 text-sm mt-2 font-medium">
                                ⚠️ This falls outside the requested date range ({interviewData?.date_range_start} - {interviewData?.date_range_end})
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
