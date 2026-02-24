import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOGO_URL = process.env.REACT_APP_LOGO_URL;

const TASK_OPTIONS = [
  { id: "photography", label: "Inventory photography" },
  { id: "listing", label: "Draft creation / Listing write-up" },
  { id: "shipping", label: "Shipping and packing" },
  { id: "cleaning", label: "Items cleaning / prep" },
];

export default function JobApplicationForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    resume_text: "",
    why_join: "",
    availability: "",
    tasks_able_to_perform: [],
    background_check_consent: false,
    has_reliable_transportation: false,
    additional_info: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTaskChange = (taskId, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        tasks_able_to_perform: [...formData.tasks_able_to_perform, taskId]
      });
    } else {
      setFormData({
        ...formData,
        tasks_able_to_perform: formData.tasks_able_to_perform.filter(t => t !== taskId)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/forms/job-application`, formData);
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="job-application-success">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-poppins text-2xl font-bold text-[#1A1A2E] mb-2">
              Application Received!
            </h2>
            <p className="text-[#666] mb-6">
              Thank you for your interest in joining our team. We'll review your application and get back to you soon.
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#6D28D9] text-white font-semibold px-8 py-3 rounded-lg shadow-lg" data-testid="back-to-home-btn">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="job-application-page">
      <div className="max-w-2xl mx-auto">
        {/* Back Link and Logo Row */}
        <div className="relative mt-8 mb-6">
          {/* Back Link - Aligned with logo */}
          <Link to="/" className="absolute left-0 top-0 inline-flex items-center gap-2 text-white/70 hover:text-[#00D4FF] transition-colors" data-testid="back-link-top">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>

          {/* Logo - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 mx-auto rounded-xl overflow-hidden shadow-2xl ring-4 ring-white/20"
          >
            <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-poppins text-3xl font-bold text-white mb-2">Job Application</h1>
          <p className="text-white/60">Join our team</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
          <form onSubmit={handleSubmit} className="p-6 space-y-5" data-testid="job-application-form">
            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Full Name *</Label>
              <Input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg"
                data-testid="input-full-name"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Email Address *</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg"
                data-testid="input-email"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Phone Number *</Label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="(555) 123-4567"
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg"
                data-testid="input-phone"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Current Address *</Label>
              <Textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Street Address, City, State, ZIP Code"
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[80px]"
                data-testid="input-address"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Tell us about your experience *</Label>
              <Textarea
                name="resume_text"
                value={formData.resume_text}
                onChange={handleChange}
                required
                placeholder="Share your relevant work experience, skills, and any experience with reselling platforms..."
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[120px]"
                data-testid="input-resume"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Why do you want to join our team? *</Label>
              <Textarea
                name="why_join"
                value={formData.why_join}
                onChange={handleChange}
                required
                placeholder="Tell us what excites you about this opportunity..."
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[100px]"
                data-testid="input-why-join"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Availability *</Label>
              <Input
                type="text"
                name="availability"
                value={formData.availability}
                onChange={handleChange}
                required
                placeholder="e.g., specify days of the week and time available"
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg"
                data-testid="input-availability"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Which tasks are you able to perform? *</Label>
              <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
              <div className="space-y-3">
                {TASK_OPTIONS.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <Checkbox
                      id={task.id}
                      checked={formData.tasks_able_to_perform.includes(task.id)}
                      onCheckedChange={(checked) => handleTaskChange(task.id, checked)}
                      className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                      data-testid={`task-${task.id}`}
                    />
                    <Label htmlFor={task.id} className="text-sm text-[#1A1A2E] cursor-pointer font-normal">
                      {task.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Are you willing/able to submit to a background check? *</Label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="background_check"
                    value="yes"
                    checked={formData.background_check_consent === true}
                    onChange={() => setFormData({ ...formData, background_check_consent: true })}
                    className="w-6 h-6 accent-[#00D4FF]"
                    data-testid="background-check-yes"
                  />
                  <span className="text-sm text-[#1A1A2E]">Yes</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="background_check"
                    value="no"
                    checked={formData.background_check_consent === false}
                    onChange={() => setFormData({ ...formData, background_check_consent: false })}
                    className="w-6 h-6 accent-[#00D4FF]"
                    data-testid="background-check-no"
                  />
                  <span className="text-sm text-[#1A1A2E]">No</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Do you have reliable transportation? *</Label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="transportation"
                    value="yes"
                    checked={formData.has_reliable_transportation === true}
                    onChange={() => setFormData({ ...formData, has_reliable_transportation: true })}
                    className="w-6 h-6 accent-[#00D4FF]"
                    data-testid="transportation-yes"
                  />
                  <span className="text-sm text-[#1A1A2E]">Yes</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="transportation"
                    value="no"
                    checked={formData.has_reliable_transportation === false}
                    onChange={() => setFormData({ ...formData, has_reliable_transportation: false })}
                    className="w-6 h-6 accent-[#00D4FF]"
                    data-testid="transportation-no"
                  />
                  <span className="text-sm text-[#1A1A2E]">No</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Is there any additional information you wish to include?</Label>
              <Textarea
                name="additional_info"
                value={formData.additional_info}
                onChange={handleChange}
                placeholder="Any other information you'd like to share..."
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[100px]"
                data-testid="input-additional-info"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#6D28D9] text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              data-testid="submit-job-application-btn"
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Back to Home - Easy access at bottom */}
        <Link 
          to="/" 
          className="mt-6 w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
          data-testid="back-link"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
