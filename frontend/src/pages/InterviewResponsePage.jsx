import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function InterviewResponsePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [availability, setAvailability] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchInterviewData();
  }, [token]);

  const fetchInterviewData = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/public/interview-response/${token}`);
      setInterviewData(response.data);
      if (response.data.already_responded) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Interview request not found or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!availability.trim()) {
      toast.error("Please enter your available times");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/applicant-tests/public/interview-response/${token}`, {
        availability_text: availability,
        additional_notes: notes
      });
      
      setSubmitted(true);
      toast.success("Availability submitted successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
              Please let us know your available times for the interview.
            </p>
          </div>

          {/* Interview Details */}
          <div className="p-6 bg-white/5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-white/50 text-sm">Availability Window</p>
                <p className="text-white font-medium">
                  {interviewData?.date_range_start} - {interviewData?.date_range_end}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <p className="text-white/50 text-sm">Timezone</p>
                <p className="text-white font-medium">{interviewData?.timezone}</p>
              </div>
            </div>
          </div>

          {/* Response Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                Your Available Times *
              </label>
              
              {/* Highlighted PHT Instruction Box */}
              <div className="bg-[#8B5CF6]/20 border-2 border-[#8B5CF6] rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Please enter times in Philippine Time (PHT)</p>
                    <p className="text-white/80 text-sm mt-1">
                      We will convert your times to our timezone (Central Time) automatically.
                    </p>
                  </div>
                </div>
              </div>
              
              <textarea
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent resize-none"
                placeholder="Example:&#10;Monday, Jan 20 - 9:00 AM to 11:00 AM PHT&#10;Tuesday, Jan 21 - 2:00 PM to 5:00 PM PHT&#10;Wednesday, Jan 22 - 10:00 AM to 12:00 PM PHT"
                required
              />
              <p className="text-[#8B5CF6] text-sm mt-2 font-medium">
                Remember: Enter times in Philippine Time (PHT)
              </p>
            </div>

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
