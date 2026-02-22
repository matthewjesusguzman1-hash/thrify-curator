import { useState } from "react";
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
    tasks_able_to_perform: []
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      <div className="form-container" data-testid="job-application-success">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="form-card text-center py-12"
        >
          <div className="w-20 h-20 bg-[#8BA88E]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#8BA88E]" />
          </div>
          <h2 className="font-playfair text-2xl font-bold text-[#333] mb-2">
            Application Received!
          </h2>
          <p className="text-[#666] mb-6">
            Thank you for your interest in joining our team. We'll review your application and get back to you soon.
          </p>
          <Link to="/">
            <Button className="btn-primary" data-testid="back-to-home-btn">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="form-container" data-testid="job-application-page">
      <Link to="/" className="back-btn" data-testid="back-link">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="form-header"
      >
        <div className="w-16 h-16 bg-[#F8C8DC]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-[#D48C9E]" />
        </div>
        <h1 className="form-title">Job Application</h1>
        <p className="form-subtitle">Join our team</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="form-card"
        data-testid="job-application-form"
      >
        <div className="form-group">
          <Label className="form-label">Full Name *</Label>
          <Input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
            className="form-input"
            data-testid="input-full-name"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Email Address *</Label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
            className="form-input"
            data-testid="input-email"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Phone Number *</Label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="(555) 123-4567"
            className="form-input"
            data-testid="input-phone"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Current Address *</Label>
          <Textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="Street Address, City, State, ZIP Code"
            className="form-input min-h-[80px]"
            data-testid="input-address"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Tell us about your experience *</Label>
          <Textarea
            name="resume_text"
            value={formData.resume_text}
            onChange={handleChange}
            required
            placeholder="Share your relevant work experience, skills, and any experience with reselling platforms..."
            className="form-input min-h-[120px]"
            data-testid="input-resume"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Why do you want to join our team? *</Label>
          <Textarea
            name="why_join"
            value={formData.why_join}
            onChange={handleChange}
            required
            placeholder="Tell us what excites you about this opportunity..."
            className="form-input min-h-[100px]"
            data-testid="input-why-join"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Availability *</Label>
          <Input
            type="text"
            name="availability"
            value={formData.availability}
            onChange={handleChange}
            required
            placeholder="e.g., specify days of the week and time available"
            className="form-input"
            data-testid="input-availability"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Which tasks are you able to perform? *</Label>
          <p className="text-sm text-[#888] mb-3">Select all that apply</p>
          <div className="space-y-3">
            {TASK_OPTIONS.map((task) => (
              <div key={task.id} className="flex items-center gap-3">
                <Checkbox
                  id={task.id}
                  checked={formData.tasks_able_to_perform.includes(task.id)}
                  onCheckedChange={(checked) => handleTaskChange(task.id, checked)}
                  data-testid={`task-${task.id}`}
                />
                <Label htmlFor={task.id} className="text-sm text-[#4a4a4a] cursor-pointer font-normal">
                  {task.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
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
      </motion.form>
    </div>
  );
}
