import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, CheckCircle, Mail, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_f87e31a4-f19a-4a3f-9c26-c5ad57e131e1/artifacts/vh1p37dl_IMG_0092.png";

const PAYMENT_METHODS = [
  { id: "check", label: "Check", needsDetails: false },
  { id: "venmo", label: "Venmo", needsDetails: true, placeholder: "@username" },
  { id: "paypal", label: "PayPal", needsDetails: true, placeholder: "email or @username" },
  { id: "zelle", label: "Zelle", needsDetails: true, placeholder: "email or phone number" },
  { id: "cashapp", label: "CashApp", needsDetails: true, placeholder: "$cashtag" },
  { id: "applepay", label: "Apple Pay", needsDetails: true, placeholder: "phone number" }
];

export default function ConsignmentAgreementForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    items_description: "",
    custom_split: "",
    payment_method: "",
    payment_details: "",
    signature: "",
    signature_date: "",
    agreed_to_terms: false
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // State for change payment method flow
  const [showInitialChoice, setShowInitialChoice] = useState(true);
  const [showChangePayment, setShowChangePayment] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingAgreement, setExistingAgreement] = useState(null);
  const [changePaymentEmail, setChangePaymentEmail] = useState("");
  const [changePaymentMethod, setChangePaymentMethod] = useState("");
  const [changePaymentDetails, setChangePaymentDetails] = useState("");
  const [paymentUpdated, setPaymentUpdated] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (checked) => {
    setFormData({ ...formData, agreed_to_terms: checked });
  };

  const handlePaymentMethodChange = (methodId) => {
    setFormData({ ...formData, payment_method: methodId, payment_details: "" });
  };

  const selectedPaymentMethod = PAYMENT_METHODS.find(m => m.id === formData.payment_method);

  // Check for existing agreement
  const handleCheckExistingAgreement = async () => {
    if (!changePaymentEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    setCheckingEmail(true);
    try {
      const response = await axios.get(`${API}/forms/check-existing-agreement?email=${encodeURIComponent(changePaymentEmail)}`);
      if (response.data.has_agreement) {
        setExistingAgreement(response.data.agreement);
        setChangePaymentMethod(response.data.agreement.payment_method || "");
        setChangePaymentDetails(response.data.agreement.payment_details || "");
      } else {
        toast.error("No existing agreement found for this email. Please sign a new agreement.");
        setShowChangePayment(false);
        setShowInitialChoice(false);
      }
    } catch (error) {
      toast.error("Failed to check for existing agreement");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Update payment method
  const handleUpdatePaymentMethod = async () => {
    if (!changePaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    
    const selectedMethod = PAYMENT_METHODS.find(m => m.id === changePaymentMethod);
    if (selectedMethod?.needsDetails && !changePaymentDetails.trim()) {
      toast.error(`Please enter your ${selectedMethod.label} details`);
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/forms/update-payment-method`, {
        email: changePaymentEmail,
        payment_method: changePaymentMethod,
        payment_details: changePaymentDetails
      });
      setPaymentUpdated(true);
      toast.success("Payment method updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update payment method");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreed_to_terms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }
    
    if (!formData.payment_method) {
      toast.error("Please select a payment method");
      return;
    }
    
    const selectedMethod = PAYMENT_METHODS.find(m => m.id === formData.payment_method);
    if (selectedMethod?.needsDetails && !formData.payment_details.trim()) {
      toast.error(`Please enter your ${selectedMethod.label} details`);
      return;
    }

    setLoading(true);

    // Prepare submission data - use custom split if provided, otherwise default to 50/50
    const submissionData = {
      ...formData,
      agreed_percentage: formData.custom_split.trim() || "50/50"
    };
    delete submissionData.custom_split;

    try {
      await axios.post(`${API}/forms/consignment-agreement`, submissionData);
      setSubmitted(true);
      toast.success("Agreement submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit agreement");
    } finally {
      setLoading(false);
    }
  };

  // Payment method updated success screen
  if (paymentUpdated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="payment-updated-success">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-poppins text-2xl font-bold text-[#1A1A2E] mb-2">
              Payment Method Updated!
            </h2>
            <p className="text-[#666] mb-6">
              Your payment method has been successfully updated to <strong>{PAYMENT_METHODS.find(m => m.id === changePaymentMethod)?.label}</strong>.
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-semibold px-8 py-3 rounded-lg shadow-lg" data-testid="back-to-home-btn">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Initial choice screen
  if (showInitialChoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="consignment-choice-page">
        <div className="max-w-2xl mx-auto">
          {/* Back Link and Logo Row */}
          <div className="relative mt-8 mb-6">
            <Link to="/" className="absolute left-0 top-0 inline-flex items-center gap-2 text-white/70 hover:text-[#8B5CF6] transition-colors" data-testid="back-link-top">
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-24 h-24 mx-auto rounded-xl overflow-hidden shadow-2xl ring-4 ring-white/20"
            >
              <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-poppins text-3xl font-bold text-white mb-2">Consignment Agreement</h1>
            <p className="text-white/60">What would you like to do?</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <button
              onClick={() => { setShowInitialChoice(false); setShowChangePayment(false); }}
              className="w-full bg-white rounded-xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 group"
              data-testid="sign-new-agreement-btn"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-poppins text-lg font-bold text-[#1A1A2E]">Sign New Agreement</h3>
                  <p className="text-[#666] text-sm">First time consigning? Sign your agreement here.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setShowInitialChoice(false); setShowChangePayment(true); }}
              className="w-full bg-white rounded-xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 group"
              data-testid="change-payment-btn"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-poppins text-lg font-bold text-[#1A1A2E]">Change Payment Method</h3>
                  <p className="text-[#666] text-sm">Already signed? Update your payment preferences.</p>
                </div>
              </div>
            </button>
          </motion.div>

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

  // Change payment method flow
  if (showChangePayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="change-payment-page">
        <div className="max-w-2xl mx-auto">
          {/* Back Link and Logo Row */}
          <div className="relative mt-8 mb-6">
            <button 
              onClick={() => { setShowInitialChoice(true); setShowChangePayment(false); setExistingAgreement(null); setChangePaymentEmail(""); }}
              className="absolute left-0 top-0 inline-flex items-center gap-2 text-white/70 hover:text-[#8B5CF6] transition-colors"
              data-testid="back-to-choice-btn"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-24 h-24 mx-auto rounded-xl overflow-hidden shadow-2xl ring-4 ring-white/20"
            >
              <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-poppins text-3xl font-bold text-white mb-2">Change Payment Method</h1>
            <p className="text-white/60">Update your payment preferences</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="h-1.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706]" />
            <div className="p-6 space-y-5">
              {!existingAgreement ? (
                // Step 1: Enter email to find existing agreement
                <>
                  <div>
                    <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Email Address</Label>
                    <p className="text-xs text-[#888] mb-2">Enter the email you used when signing your agreement</p>
                    <Input
                      type="email"
                      value={changePaymentEmail}
                      onChange={(e) => setChangePaymentEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="border-2 border-gray-200 focus:border-[#F59E0B] rounded-lg"
                      data-testid="change-payment-email"
                    />
                  </div>
                  <Button
                    onClick={handleCheckExistingAgreement}
                    disabled={checkingEmail}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white font-semibold py-3 rounded-lg"
                    data-testid="find-agreement-btn"
                  >
                    {checkingEmail ? "Checking..." : "Find My Agreement"}
                  </Button>
                </>
              ) : (
                // Step 2: Show current info and allow updating payment method
                <>
                  <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-[#1A1A2E]">
                      <strong>Agreement found for:</strong> {existingAgreement.full_name}
                    </p>
                    {existingAgreement.payment_method && (
                      <p className="text-sm text-[#666] mt-1">
                        Current payment method: <strong>{PAYMENT_METHODS.find(m => m.id === existingAgreement.payment_method)?.label || existingAgreement.payment_method}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-[#1A1A2E] mb-3 block">Select New Payment Method *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => { setChangePaymentMethod(method.id); setChangePaymentDetails(""); }}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            changePaymentMethod === method.id
                              ? "border-[#F59E0B] bg-[#F59E0B]/10 shadow-md"
                              : "border-gray-200 hover:border-[#F59E0B]/50 hover:bg-gray-50"
                          }`}
                          data-testid={`change-payment-${method.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              changePaymentMethod === method.id ? "bg-[#F59E0B]" : "bg-gray-200"
                            }`}>
                              <CreditCard className={`w-5 h-5 ${changePaymentMethod === method.id ? "text-white" : "text-gray-500"}`} />
                            </div>
                            <span className={`font-medium ${changePaymentMethod === method.id ? "text-[#1A1A2E]" : "text-gray-600"}`}>
                              {method.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {changePaymentMethod && PAYMENT_METHODS.find(m => m.id === changePaymentMethod)?.needsDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                        {PAYMENT_METHODS.find(m => m.id === changePaymentMethod)?.label} Details *
                      </Label>
                      <Input
                        type="text"
                        value={changePaymentDetails}
                        onChange={(e) => setChangePaymentDetails(e.target.value)}
                        placeholder={PAYMENT_METHODS.find(m => m.id === changePaymentMethod)?.placeholder}
                        className="border-2 border-gray-200 focus:border-[#F59E0B] rounded-lg"
                        data-testid="change-payment-details"
                      />
                    </motion.div>
                  )}

                  <Button
                    onClick={handleUpdatePaymentMethod}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white font-semibold py-3 rounded-lg"
                    data-testid="update-payment-btn"
                  >
                    {loading ? "Updating..." : "Update Payment Method"}
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          <button 
            onClick={() => { setShowInitialChoice(true); setShowChangePayment(false); setExistingAgreement(null); setChangePaymentEmail(""); }}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
            data-testid="back-link"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="consignment-agreement-success">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-poppins text-2xl font-bold text-[#1A1A2E] mb-2">
              Agreement Signed!
            </h2>
            <p className="text-[#666] mb-4">
              Thank you for signing the consignment agreement. We'll send you a confirmation email with next steps.
            </p>
            <div className="mb-6 bg-gradient-to-r from-[#8B5CF6]/20 to-[#6D28D9]/20 border-2 border-[#8B5CF6] rounded-xl p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <p className="text-[#1A1A2E] font-semibold text-base">
                  We will contact you via email at the address you provided
                </p>
              </div>
            </div>
            <Link to="/">
              <Button className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-semibold px-8 py-3 rounded-lg shadow-lg" data-testid="back-to-home-btn">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="consignment-agreement-page">
      <div className="max-w-2xl mx-auto">
        {/* Back Link and Logo Row */}
        <div className="relative mt-8 mb-6">
          {/* Back Link - Aligned with logo */}
          <Link to="/" className="absolute left-0 top-0 inline-flex items-center gap-2 text-white/70 hover:text-[#8B5CF6] transition-colors" data-testid="back-link-top">
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
          <h1 className="font-poppins text-3xl font-bold text-white mb-2">Consignment Agreement</h1>
          <p className="text-white/60">Sign your consignment agreement</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9]" />
          <form onSubmit={handleSubmit} className="p-6 space-y-5" data-testid="consignment-agreement-form">
            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Full Legal Name *</Label>
              <Input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Enter your full legal name"
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
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
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
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
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                data-testid="input-phone"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Full Address *</Label>
              <Textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Street Address, City, State, ZIP Code"
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg min-h-[80px]"
                data-testid="input-address"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Number of Items to Consign *</Label>
              <Input
                type="number"
                name="items_description"
                value={formData.items_description}
                onChange={handleChange}
                required
                min="1"
                placeholder="Enter number of items"
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                data-testid="input-items-description"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                Custom Profit Split
                <span className="font-normal text-[#888] ml-2">(Default: 50/50)</span>
              </Label>
              <Input
                type="text"
                name="custom_split"
                value={formData.custom_split}
                onChange={handleChange}
                placeholder="Leave blank unless instructed otherwise"
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg placeholder:text-[#999] placeholder:italic"
                data-testid="input-custom-split"
              />
              <p className="text-xs text-[#888] mt-1">
                If a different split was agreed upon, enter it here (e.g., "60/40", "70/30")
              </p>
            </div>

            {/* Payment Method Section */}
            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-3 block">Payment Method *</Label>
              <p className="text-xs text-[#888] mb-3">Select how you would like to receive your payment</p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handlePaymentMethodChange(method.id)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.payment_method === method.id
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-md"
                        : "border-gray-200 hover:border-[#8B5CF6]/50 hover:bg-gray-50"
                    }`}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        formData.payment_method === method.id ? "bg-[#8B5CF6]" : "bg-gray-200"
                      }`}>
                        <CreditCard className={`w-5 h-5 ${formData.payment_method === method.id ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <span className={`font-medium ${formData.payment_method === method.id ? "text-[#1A1A2E]" : "text-gray-600"}`}>
                        {method.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Details - shown when a payment method that needs details is selected */}
            {selectedPaymentMethod?.needsDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                  {selectedPaymentMethod.label} Details *
                </Label>
                <Input
                  type="text"
                  name="payment_details"
                  value={formData.payment_details}
                  onChange={handleChange}
                  placeholder={selectedPaymentMethod.placeholder}
                  className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                  data-testid="input-payment-details"
                />
                <p className="text-xs text-[#888] mt-1">
                  Enter your {selectedPaymentMethod.label} {selectedPaymentMethod.placeholder}
                </p>
              </motion.div>
            )}

            {/* Terms and Conditions */}
            <div>
              <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-[#6D28D9]/10 rounded-xl p-4 mb-4 text-sm text-gray-600 border border-[#8B5CF6]/20">
                <h4 className="font-semibold text-[#1A1A2E] mb-3">Terms & Conditions</h4>
                <ul className="space-y-3">
                  <li>• The profit split will be agreed upon prior to acceptance of any items. Unless otherwise specified on this form, the profit split will be considered 50/50.</li>
                  <li>• There is no guarantee that your item will be sold.</li>
                  <li>• The consignee has full discretion over how the item is advertised and the price at which it is listed.</li>
                  <li>• The consignee has the right to refuse any item for sale at any time and will return the item to the consignor.</li>
                  <li>• When items are submitted for sale, the consigned item's ownership is relinquished and will be considered the property of the consignee for the purposes of sale until sold or released back to the consignor.</li>
                  <li>• The consignor accepts the condition of the item upon return and waives any claim of damage that occurred in the possession of the consignee. All items are inspected prior to listing and its condition/defects are listed at the time the item is posted for sale.</li>
                </ul>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Electronic Signature *</Label>
              <Input
                type="text"
                name="signature"
                value={formData.signature}
                onChange={handleChange}
                required
                placeholder="Type your full name as signature"
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg italic"
                data-testid="input-signature"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Date *</Label>
              <Input
                type="date"
                name="signature_date"
                value={formData.signature_date}
                onChange={handleChange}
                required
                className="border-2 border-gray-200 focus:border-[#8B5CF6] rounded-lg"
                data-testid="input-signature-date"
              />
            </div>

            <div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={formData.agreed_to_terms}
                  onCheckedChange={handleCheckboxChange}
                  className="w-6 h-6 mt-1 border-2 border-gray-300 data-[state=checked]:bg-[#8B5CF6] data-[state=checked]:border-[#8B5CF6]"
                  data-testid="checkbox-terms"
                />
                <Label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I have read and agree to the terms and conditions above. I understand that by typing my name above, I am providing an electronic signature.
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.agreed_to_terms}
              className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-agreement-btn"
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Sign Agreement
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
