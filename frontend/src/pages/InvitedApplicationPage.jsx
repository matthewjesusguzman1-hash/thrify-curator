import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Send, CheckCircle, AlertCircle, Plus, Trash2, Phone, User } from "lucide-react";
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

export default function InvitedApplicationPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [requiredFields, setRequiredFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    preferred_contact_method: "", // Call, Text, WhatsApp Call, WhatsApp Text, Email, App Messages
    address: "",
    resume_text: "",
    why_join: "",
    availability: "",
    tasks_able_to_perform: [],
    background_check_consent: null,
    has_reliable_transportation: null,
    additional_info: "",
    preferred_contact: "email",
    work_history: [
      {
        employer: "",
        employer_address: "",
        employer_phone: "",
        dates_from: "",
        dates_to: "",
        title: "",
        responsibilities: "",
        reason_for_leaving: "",
        may_contact: null
      }
    ],
    // Remote worker fields
    is_remote_worker: false,
    // Payment info - same fields as contractor agreement
    payment_holder_name: "",
    payment_holder_email: "",
    payment_wallet_provider: "",
    payment_wallet_number: "",
    payment_address: "",
    payment_country: "",
    payment_wise_tag: ""
  });
  const [inviteTemplate, setInviteTemplate] = useState("generic");

  useEffect(() => {
    fetchInviteDetails();
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      const response = await axios.get(`${API}/forms/application-invite/${token}`);
      if (response.data.already_completed) {
        setAlreadyCompleted(true);
        setFormData(prev => ({ ...prev, email: response.data.email }));
      } else {
        setFormData(prev => ({ ...prev, email: response.data.email }));
        setRequiredFields(response.data.required_fields || []);
        setInviteTemplate(response.data.template || "generic");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired invite link");
    } finally {
      setLoading(false);
    }
  };

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

  const handleWorkHistoryChange = (index, field, value) => {
    const updatedHistory = [...formData.work_history];
    updatedHistory[index] = { ...updatedHistory[index], [field]: value };
    setFormData({ ...formData, work_history: updatedHistory });
  };

  const addWorkHistoryEntry = () => {
    setFormData({
      ...formData,
      work_history: [
        ...formData.work_history,
        {
          employer: "",
          employer_address: "",
          employer_phone: "",
          dates_from: "",
          dates_to: "",
          title: "",
          responsibilities: "",
          reason_for_leaving: "",
          may_contact: null
        }
      ]
    });
  };

  const removeWorkHistoryEntry = (index) => {
    const updatedHistory = formData.work_history.filter((_, i) => i !== index);
    setFormData({ ...formData, work_history: updatedHistory });
  };

  const isFieldRequired = (fieldName) => {
    // Always required: full_name, email
    if (fieldName === "full_name" || fieldName === "email") return true;
    return requiredFields.includes(fieldName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(`${API}/forms/application-invite/${token}`, formData);
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D4FF]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Already Submitted</h1>
          <p className="text-gray-600 mb-6">
            You have already submitted your application. We will be in touch soon!
          </p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4">
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
              Thank you for completing your application. We will review it and get back to you soon.
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#6D28D9] text-white font-semibold px-8 py-3 rounded-lg shadow-lg">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 mx-auto rounded-xl overflow-hidden shadow-2xl ring-4 ring-white/20 mb-6"
        >
          <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-poppins text-3xl font-bold text-white mb-2">Complete Your Application</h1>
          <p className="text-white/60">You have been invited to apply</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Full Name - Always Required */}
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
              />
            </div>

            {/* Email - Always Required (pre-filled) */}
            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Email Address *</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-gray-50"
                readOnly
              />
            </div>

            {/* Phone - Optional with Preferred Contact Method */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Phone Number {isFieldRequired("phone") ? "*" : "(Optional)"}
                </Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required={isFieldRequired("phone")}
                  placeholder="(555) 123-4567"
                  className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-white"
                />
              </div>

              {/* Preferred Contact Method */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-[#8B5CF6]" />
                  <Label className="text-sm font-medium text-[#1A1A2E]">Preferred Contact Method</Label>
                </div>
                <select
                  name="preferred_contact_method"
                  value={formData.preferred_contact_method}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-white text-[#1A1A2E]"
                >
                  <option value="">Select how you prefer to be contacted...</option>
                  <option value="call">Phone Call</option>
                  <option value="text">Text Message (SMS)</option>
                  <option value="whatsapp_call">WhatsApp Call</option>
                  <option value="whatsapp_text">WhatsApp Text</option>
                  <option value="email">Email</option>
                  <option value="app_messages">Messages through the App</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Let us know the best way to reach you</p>
              </div>
            </div>

            {/* Address */}
            {(isFieldRequired("address") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Current Address {isFieldRequired("address") ? "*" : ""}
                </Label>
                <Textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required={isFieldRequired("address")}
                  placeholder="Street Address, City, State, ZIP Code"
                  className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[80px]"
                />
              </div>
            )}

            {/* Experience */}
            {(isFieldRequired("resume_text") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Tell us about your experience {isFieldRequired("resume_text") ? "*" : ""}
                </Label>
                <Textarea
                  name="resume_text"
                  value={formData.resume_text}
                  onChange={handleChange}
                  required={isFieldRequired("resume_text")}
                  placeholder="Share your relevant work experience, skills, and any experience with reselling platforms..."
                  className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[120px]"
                />
              </div>
            )}

            {/* Work History */}
            {(isFieldRequired("work_history") || requiredFields.length === 0) && (
              <div className="border-t-2 border-gray-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-[#8B5CF6]" />
                  <Label className="text-base font-bold text-[#1A1A2E]">Work History</Label>
                </div>
                
                {formData.work_history.map((job, index) => (
                  <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-sm font-semibold text-[#8B5CF6]">
                        {index === 0 ? "Most Recent Employer" : `Previous Employer ${index}`}
                      </p>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeWorkHistoryEntry(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <Input
                        type="text"
                        value={job.employer}
                        onChange={(e) => handleWorkHistoryChange(index, 'employer', e.target.value)}
                        placeholder="Company name"
                        className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-white"
                      />
                      <Input
                        type="text"
                        value={job.title}
                        onChange={(e) => handleWorkHistoryChange(index, 'title', e.target.value)}
                        placeholder="Your job title"
                        className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-white"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="text"
                          value={job.dates_from}
                          onChange={(e) => handleWorkHistoryChange(index, 'dates_from', e.target.value)}
                          placeholder="From (MM/YYYY)"
                          className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-white"
                        />
                        <Input
                          type="text"
                          value={job.dates_to}
                          onChange={(e) => handleWorkHistoryChange(index, 'dates_to', e.target.value)}
                          placeholder="To (MM/YYYY)"
                          className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addWorkHistoryEntry}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-[#8B5CF6]/50 rounded-lg text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Another Employer
                </button>
              </div>
            )}

            {/* Why Join */}
            {(isFieldRequired("why_join") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Why do you want to join our team? {isFieldRequired("why_join") ? "*" : ""}
                </Label>
                <Textarea
                  name="why_join"
                  value={formData.why_join}
                  onChange={handleChange}
                  required={isFieldRequired("why_join")}
                  placeholder="Tell us what excites you about this opportunity..."
                  className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[100px]"
                />
              </div>
            )}

            {/* Availability */}
            {(isFieldRequired("availability") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Availability {isFieldRequired("availability") ? "*" : ""}
                </Label>
                <Input
                  type="text"
                  name="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  required={isFieldRequired("availability")}
                  placeholder="e.g., Mon-Fri 9am-5pm, weekends available"
                  className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg"
                />
              </div>
            )}

            {/* Tasks */}
            {(isFieldRequired("tasks_able_to_perform") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Which tasks are you able to perform?
                </Label>
                <div className="space-y-3">
                  {TASK_OPTIONS.map((task) => (
                    <div key={task.id} className="flex items-center gap-3">
                      <Checkbox
                        id={task.id}
                        checked={formData.tasks_able_to_perform.includes(task.id)}
                        onCheckedChange={(checked) => handleTaskChange(task.id, checked)}
                        className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                      />
                      <Label htmlFor={task.id} className="text-sm text-[#1A1A2E] cursor-pointer font-normal">
                        {task.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Background Check */}
            {(isFieldRequired("background_check_consent") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Are you willing to submit to a background check?
                </Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="background_check"
                      checked={formData.background_check_consent === true}
                      onChange={() => setFormData({ ...formData, background_check_consent: true })}
                      className="w-6 h-6 accent-[#00D4FF]"
                    />
                    <span className="text-sm text-[#1A1A2E]">Yes</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="background_check"
                      checked={formData.background_check_consent === false}
                      onChange={() => setFormData({ ...formData, background_check_consent: false })}
                      className="w-6 h-6 accent-[#00D4FF]"
                    />
                    <span className="text-sm text-[#1A1A2E]">No</span>
                  </label>
                </div>
              </div>
            )}

            {/* Transportation */}
            {(isFieldRequired("has_reliable_transportation") || requiredFields.length === 0) && (
              <div>
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  Do you have reliable transportation?
                </Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="transportation"
                      checked={formData.has_reliable_transportation === true}
                      onChange={() => setFormData({ ...formData, has_reliable_transportation: true })}
                      className="w-6 h-6 accent-[#00D4FF]"
                    />
                    <span className="text-sm text-[#1A1A2E]">Yes</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="transportation"
                      checked={formData.has_reliable_transportation === false}
                      onChange={() => setFormData({ ...formData, has_reliable_transportation: false })}
                      className="w-6 h-6 accent-[#00D4FF]"
                    />
                    <span className="text-sm text-[#1A1A2E]">No</span>
                  </label>
                </div>
              </div>
            )}

            {/* Remote Worker Section - Only shown for onboarding applications */}
            {inviteTemplate === "onboarding" && (
              <div className="border-2 border-[#8B5CF6]/30 rounded-xl p-4 bg-[#8B5CF6]/5">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    id="is_remote_worker"
                    checked={formData.is_remote_worker}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      is_remote_worker: checked,
                      // Clear payment fields when unchecking
                      ...(checked ? {} : { 
                        payment_holder_name: "", 
                        payment_holder_email: "", 
                        payment_wallet_provider: "", 
                        payment_wallet_number: "", 
                        payment_address: "", 
                        payment_country: "", 
                        payment_wise_tag: "" 
                      })
                    })}
                    className="w-6 h-6 border-2 border-[#8B5CF6] data-[state=checked]:bg-[#8B5CF6] data-[state=checked]:border-[#8B5CF6]"
                  />
                  <Label htmlFor="is_remote_worker" className="text-sm font-semibold text-[#1A1A2E] cursor-pointer">
                    I am a remote worker (working outside the US)
                  </Label>
                </div>

                {formData.is_remote_worker && (
                  <div className="space-y-4 mt-4 pl-4 border-l-2 border-[#8B5CF6]/30">
                    <Label className="text-sm font-semibold text-[#1A1A2E] block">
                      Payment Information (via Wise)
                    </Label>
                    <p className="text-xs text-gray-500 -mt-2">
                      Fill in the payment details that apply to you. This will be used for the Contractor Agreement.
                    </p>
                    
                    {/* Payment Fields Grid */}
                    <div className="space-y-3 bg-white/50 p-4 rounded-lg">
                      {/* Account Holder Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-[#1A1A2E] mb-1 block">Account Holder Name</Label>
                          <Input
                            type="text"
                            name="payment_holder_name"
                            value={formData.payment_holder_name}
                            onChange={handleChange}
                            placeholder="Full name on account"
                            className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-[#1A1A2E] mb-1 block">Account Holder Email</Label>
                          <Input
                            type="email"
                            name="payment_holder_email"
                            value={formData.payment_holder_email}
                            onChange={handleChange}
                            placeholder="Email linked to account"
                            className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                          />
                        </div>
                      </div>
                      
                      {/* Wallet Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-[#1A1A2E] mb-1 block">Wallet Provider</Label>
                          <Input
                            type="text"
                            name="payment_wallet_provider"
                            value={formData.payment_wallet_provider}
                            onChange={handleChange}
                            placeholder="e.g., Wise, GCash, Maya, PayPal"
                            className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-[#1A1A2E] mb-1 block">Wallet Number / Account</Label>
                          <Input
                            type="text"
                            name="payment_wallet_number"
                            value={formData.payment_wallet_number}
                            onChange={handleChange}
                            placeholder="Your wallet number or account"
                            className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                          />
                        </div>
                      </div>
                      
                      {/* Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-[#1A1A2E] mb-1 block">Address</Label>
                          <Input
                            type="text"
                            name="payment_address"
                            value={formData.payment_address}
                            onChange={handleChange}
                            placeholder="Street address, city, state/province"
                            className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-[#1A1A2E] mb-1 block">Country</Label>
                          <Input
                            type="text"
                            name="payment_country"
                            value={formData.payment_country}
                            onChange={handleChange}
                            placeholder="Country of residence"
                            className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                          />
                        </div>
                      </div>
                      
                      {/* Wise Tag */}
                      <div>
                        <Label className="text-sm text-[#1A1A2E] mb-1 block">Wise Tag (if using Wise)</Label>
                        <Input
                          type="text"
                          name="payment_wise_tag"
                          value={formData.payment_wise_tag}
                          onChange={handleChange}
                          placeholder="@yourtag"
                          className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Found in Wise app under Account → Wise tag</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                Additional Information (Optional)
              </Label>
              <Textarea
                name="additional_info"
                value={formData.additional_info}
                onChange={handleChange}
                placeholder="Any other information you would like to share..."
                className="border-2 border-gray-200 focus:border-[#00D4FF] rounded-lg min-h-[100px]"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:from-[#00A8CC] hover:to-[#6D28D9] text-white font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
              data-testid="submit-invited-application-btn"
            >
              {submitting ? (
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

        <Link 
          to="/" 
          className="mt-6 w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
