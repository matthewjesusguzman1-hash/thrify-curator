import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardCheck, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ConsignmentAgreementForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    items_description: "",
    agreed_percentage: "",
    signature: "",
    agreed_to_terms: false
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (checked) => {
    setFormData({ ...formData, agreed_to_terms: checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreed_to_terms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/forms/consignment-agreement`, formData);
      setSubmitted(true);
      toast.success("Agreement submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit agreement");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-container" data-testid="consignment-agreement-success">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="form-card text-center py-12"
        >
          <div className="w-20 h-20 bg-[#8BA88E]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#8BA88E]" />
          </div>
          <h2 className="font-playfair text-2xl font-bold text-[#333] mb-2">
            Agreement Signed!
          </h2>
          <p className="text-[#666] mb-6">
            Thank you for signing the consignment agreement. We'll send you a confirmation email with next steps.
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
    <div className="form-container" data-testid="consignment-agreement-page">
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
          <ClipboardCheck className="w-8 h-8 text-[#D48C9E]" />
        </div>
        <h1 className="form-title">Consignment Agreement</h1>
        <p className="form-subtitle">Sign your consignment agreement</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="form-card"
        data-testid="consignment-agreement-form"
      >
        <div className="form-group">
          <Label className="form-label">Full Legal Name *</Label>
          <Input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            placeholder="Enter your full legal name"
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
          <Label className="form-label">Full Address *</Label>
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
          <Label className="form-label">Items to Consign *</Label>
          <Textarea
            name="items_description"
            value={formData.items_description}
            onChange={handleChange}
            required
            placeholder="List all items you're consigning with descriptions"
            className="form-input min-h-[120px]"
            data-testid="input-items-description"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Agreed Commission Split *</Label>
          <Select
            value={formData.agreed_percentage}
            onValueChange={(value) => handleSelectChange("agreed_percentage", value)}
            required
          >
            <SelectTrigger className="form-input" data-testid="select-percentage">
              <SelectValue placeholder="Select commission split" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60-40">60% You / 40% Thrifty Curator</SelectItem>
              <SelectItem value="50-50">50% You / 50% Thrifty Curator</SelectItem>
              <SelectItem value="70-30">70% You / 30% Thrifty Curator (Premium)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Terms and Conditions */}
        <div className="form-group">
          <div className="bg-[#F9F6F7] rounded-xl p-4 mb-4 text-sm text-[#666]">
            <h4 className="font-semibold text-[#333] mb-2">Terms & Conditions</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Items will be listed for a minimum of 60 days</li>
              <li>Thrifty Curator reserves the right to set final pricing</li>
              <li>Payment will be issued within 14 days of item sale</li>
              <li>Unsold items can be picked up or donated after 90 days</li>
              <li>Items must be in the described condition upon receipt</li>
            </ul>
          </div>
        </div>

        <div className="form-group">
          <Label className="form-label">Electronic Signature *</Label>
          <Input
            type="text"
            name="signature"
            value={formData.signature}
            onChange={handleChange}
            required
            placeholder="Type your full name as signature"
            className="form-input italic"
            data-testid="input-signature"
          />
        </div>

        <div className="form-group">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={formData.agreed_to_terms}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
              data-testid="checkbox-terms"
            />
            <Label htmlFor="terms" className="text-sm text-[#666] cursor-pointer">
              I have read and agree to the terms and conditions above. I understand that by typing my name above, I am providing an electronic signature.
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !formData.agreed_to_terms}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
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
      </motion.form>
    </div>
  );
}
