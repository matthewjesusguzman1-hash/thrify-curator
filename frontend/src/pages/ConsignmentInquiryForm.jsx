import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ConsignmentInquiryForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    item_description: "",
    estimated_value: "",
    item_condition: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/forms/consignment-inquiry`, formData);
      setSubmitted(true);
      toast.success("Inquiry submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit inquiry");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-container" data-testid="consignment-inquiry-success">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="form-card text-center py-12"
        >
          <div className="w-20 h-20 bg-[#8BA88E]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#8BA88E]" />
          </div>
          <h2 className="font-playfair text-2xl font-bold text-[#333] mb-2">
            Inquiry Received!
          </h2>
          <p className="text-[#666] mb-6">
            Thank you for your interest in consigning with us. We'll review your items and contact you within 2-3 business days.
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
    <div className="form-container" data-testid="consignment-inquiry-page">
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
          <FileText className="w-8 h-8 text-[#D48C9E]" />
        </div>
        <h1 className="form-title">Consignment Inquiry</h1>
        <p className="form-subtitle">Tell us about your items</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="form-card"
        data-testid="consignment-inquiry-form"
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
          <Label className="form-label">Item Description *</Label>
          <Textarea
            name="item_description"
            value={formData.item_description}
            onChange={handleChange}
            required
            placeholder="Describe the items you'd like to consign (brand, type, quantity, etc.)"
            className="form-input min-h-[120px]"
            data-testid="input-item-description"
          />
        </div>

        <div className="form-group">
          <Label className="form-label">Estimated Value *</Label>
          <Select
            value={formData.estimated_value}
            onValueChange={(value) => handleSelectChange("estimated_value", value)}
            required
          >
            <SelectTrigger className="form-input" data-testid="select-estimated-value">
              <SelectValue placeholder="Select estimated value range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="under-50">Under $50</SelectItem>
              <SelectItem value="50-100">$50 - $100</SelectItem>
              <SelectItem value="100-250">$100 - $250</SelectItem>
              <SelectItem value="250-500">$250 - $500</SelectItem>
              <SelectItem value="500-1000">$500 - $1,000</SelectItem>
              <SelectItem value="over-1000">Over $1,000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="form-group">
          <Label className="form-label">Item Condition *</Label>
          <Select
            value={formData.item_condition}
            onValueChange={(value) => handleSelectChange("item_condition", value)}
            required
          >
            <SelectTrigger className="form-input" data-testid="select-item-condition">
              <SelectValue placeholder="Select item condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new-with-tags">New with Tags</SelectItem>
              <SelectItem value="new-without-tags">New without Tags</SelectItem>
              <SelectItem value="like-new">Like New</SelectItem>
              <SelectItem value="gently-used">Gently Used</SelectItem>
              <SelectItem value="good">Good Condition</SelectItem>
              <SelectItem value="fair">Fair Condition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
          data-testid="submit-inquiry-btn"
        >
          {loading ? (
            "Submitting..."
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Inquiry
            </>
          )}
        </Button>
      </motion.form>
    </div>
  );
}
