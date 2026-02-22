import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_reseller-dashboard-11/artifacts/kxrcqk4y_IMG_0042.jpg";

export default function ConsignmentAgreementForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    items_description: "",
    agreed_percentage: "50-50",
    signature: "",
    agreed_to_terms: false
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-32 h-32 mx-auto mb-6 rounded-xl overflow-hidden shadow-lg"
      >
        <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="form-header"
      >
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
          <Label className="form-label">Number of Items to Consign *</Label>
          <Input
            type="number"
            name="items_description"
            value={formData.items_description}
            onChange={handleChange}
            required
            min="1"
            placeholder="Enter number of items"
            className="form-input"
            data-testid="input-items-description"
          />
        </div>

        {/* Terms and Conditions */}
        <div className="form-group">
          <div className="bg-[#F9F6F7] rounded-xl p-4 mb-4 text-sm text-[#666]">
            <h4 className="font-semibold text-[#333] mb-3">Terms & Conditions</h4>
            <ul className="space-y-3">
              <li>• The profit from the sale of your consigned item will be split evenly, with 50% going to you and 50% to the consignee.</li>
              <li>• There is no guarantee that your item will be sold.</li>
              <li>• The consignee has full discretion over how the item is advertised and the price at which it is listed.</li>
              <li>• The consignee has the right to refuse any item for sale at any time and will return the item to the consignor.</li>
              <li>• When items are submitted for sale, the consigned item's ownership is relinquished and will be considered the property of the consignee for the purposes of sale until sold or released back to the consignor.</li>
              <li>• The consignor accepts the condition of the item upon return and waives any claim of damage that occurred in the possession of the consignee. All items are inspected prior to listing and its condition/defects are listed at the time the item is posted for sale.</li>
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
