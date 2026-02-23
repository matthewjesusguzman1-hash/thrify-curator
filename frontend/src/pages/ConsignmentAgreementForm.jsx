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
const LOGO_URL = "https://customer-assets.emergentagent.com/job_c38502d5-e3cd-4d12-bde1-7a8331411fc2/artifacts/calba8ly_IMG_0042.jpg";

export default function ConsignmentAgreementForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    items_description: "",
    agreed_percentage: "50-50",
    signature: "",
    signature_date: "",
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
            <p className="text-[#666] mb-6">
              Thank you for signing the consignment agreement. We'll send you a confirmation email with next steps.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="consignment-agreement-page">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 mx-auto mb-6 rounded-xl overflow-hidden shadow-2xl ring-4 ring-white/20"
        >
          <img src={LOGO_URL} alt="Thrifty Curator Logo" className="w-full h-full object-cover" />
        </motion.div>

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

            {/* Terms and Conditions */}
            <div>
              <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-[#6D28D9]/10 rounded-xl p-4 mb-4 text-sm text-gray-600 border border-[#8B5CF6]/20">
                <h4 className="font-semibold text-[#1A1A2E] mb-3">Terms & Conditions</h4>
                <ul className="space-y-3">
                  <li>• The profit split will be agreed upon prior to acceptance of any items.</li>
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
