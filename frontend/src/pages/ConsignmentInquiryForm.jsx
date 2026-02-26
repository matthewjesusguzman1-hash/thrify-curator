import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Send, CheckCircle, Upload, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOGO_URL = process.env.REACT_APP_LOGO_URL;

const ITEM_TYPES = [
  { id: "dress", label: "Dress" },
  { id: "top", label: "Top" },
  { id: "jeans", label: "Jeans" },
  { id: "outerwear", label: "Outerwear" },
  { id: "shoes", label: "Shoes" },
  { id: "accessories", label: "Accessories" },
  { id: "other", label: "Other" },
];

const CLOTHING_BRANDS = "Spanx, Lululemon, Athleta, Beyond Yoga, Miss Me, Torrid, Tory Burch, Gymshark, Honeylove, Rock Revival, Eileen Fisher, Flax, Free People, Diane Von Furstenberg, Patagonia, The North Face, Harley Davidson, St. John, Everlane, Rag & Bone, Alice + Olivia, Nike, Coach, Michael Kors, Barefoot Dreams, Madewell, Lilly Pulitzer, Kate Spade, Anthropologie, Johnny Was, Farm Rio, Maeve, CVG, No Bull, Coach, ZYIA, Feed me fight me, Figs, Vuori, Alphalete, Buff Bunny, SheFit, Vineyard Vines, Kuhl, Carhartt, Skims, Boden, Levi, Mother Jeans, Agolde, 7 for all mankind, Men's Rock Revival, AYR jeans, Frank & Eileen, Veronica Beard, Birddogs, kerrits.";

const SHOE_BRANDS = "Red Wings, Dr Marten, Rothy's, Nike, Frye, Ugg, Cole Haan, Merrell, Keen, Chaco, Hey Dudes, Sorel, Hoka, On Running, Dansko, No Bull, Teva, Birkenstock, Ariat, Crocs, Betsy Johnson, Ecco, Brooks, New Balance, Vans.";

export default function ConsignmentInquiryForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    item_types: [],
    other_item_type: "",
    brand: "",
    item_description: "",
    item_condition: "",
    smoke_free: null,
    pet_free: null,
    image_urls: [],
    additional_info: ""
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleItemTypeChange = (typeId, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        item_types: [...formData.item_types, typeId]
      });
    } else {
      setFormData({
        ...formData,
        item_types: formData.item_types.filter(t => t !== typeId),
        other_item_type: typeId === "other" ? "" : formData.other_item_type
      });
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate environment section
    if (formData.smoke_free === null) {
      toast.error("Please select whether your home is smoke free or not");
      return;
    }
    if (formData.pet_free === null) {
      toast.error("Please select whether your home is pet free or not");
      return;
    }
    
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
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="consignment-inquiry-success">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-poppins text-2xl font-bold text-[#1A1A2E] mb-2">
              Inquiry Received!
            </h2>
            <p className="text-[#666] mb-4">
              Thank you for your interest in consigning with us. We'll review your items and contact you soon.
            </p>
            <div className="mb-6 bg-gradient-to-r from-[#FF1493]/20 to-[#8B5CF6]/20 border-2 border-[#FF1493] rounded-xl p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 bg-[#FF1493] rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <p className="text-[#1A1A2E] font-semibold text-base">
                  We will contact you via email at the address you provided
                </p>
              </div>
            </div>
            <Link to="/">
              <Button className="bg-gradient-to-r from-[#FF1493] to-[#8B5CF6] hover:from-[#E91E8C] hover:to-[#6D28D9] text-white font-semibold px-8 py-3 rounded-lg shadow-lg" data-testid="back-to-home-btn">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] py-8 px-4" data-testid="consignment-inquiry-page">
      <div className="max-w-2xl mx-auto">
        {/* Back Link and Logo Row */}
        <div className="relative mt-8 mb-6">
          {/* Back Link - Aligned with logo */}
          <Link to="/" className="absolute left-0 top-0 inline-flex items-center gap-2 text-white/70 hover:text-[#FF1493] transition-colors" data-testid="back-link-top">
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
          <h1 className="font-poppins text-3xl font-bold text-white mb-2">Consignment Inquiry</h1>
          <p className="text-white/60">Tell us about your items</p>
        </motion.div>

        {/* Brands Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden mb-6"
          data-testid="brands-section"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6]" />
          <div className="p-6">
            <h2 className="font-poppins text-xl font-bold text-[#1A1A2E] mb-2">
              Brands Heavily Considered for Consignment Sale
            </h2>
            <p className="text-gray-600 mb-4">
              Review the brands below and see if you have any items we are looking for!
            </p>
            
            <div className="mb-4">
              <h3 className="font-semibold text-[#FF1493] mb-2">Clothing Brands:</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{CLOTHING_BRANDS}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#8B5CF6] mb-2">Shoe Brands:</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{SHOE_BRANDS}</p>
            </div>
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#FF1493] to-[#8B5CF6]" />
          <form onSubmit={handleSubmit} className="p-6 space-y-5" data-testid="consignment-inquiry-form">
            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Full Name *</Label>
              <Input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg"
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
                className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg"
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
                className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg"
                data-testid="input-phone"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Type of Clothing *</Label>
              <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {ITEM_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`type-${type.id}`}
                      checked={formData.item_types.includes(type.id)}
                      onCheckedChange={(checked) => handleItemTypeChange(type.id, checked)}
                      className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:bg-[#FF1493] data-[state=checked]:border-[#FF1493]"
                      data-testid={`item-type-${type.id}`}
                    />
                    <Label htmlFor={`type-${type.id}`} className="text-sm text-[#1A1A2E] cursor-pointer font-normal">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.item_types.includes("other") && (
                <div className="mt-3">
                  <Input
                    type="text"
                    name="other_item_type"
                    value={formData.other_item_type}
                    onChange={handleChange}
                    placeholder="Please specify other item type"
                    className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg"
                    data-testid="input-other-item-type"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Brand *</Label>
              <Input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                placeholder="Enter the brand name (e.g., Lululemon, Nike, Coach)"
                className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg"
                data-testid="input-brand"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Item Description *</Label>
              <Textarea
                name="item_description"
                value={formData.item_description}
                onChange={handleChange}
                required
                placeholder="Describe the items you'd like to consign (brand, type, quantity, etc.)"
                className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg min-h-[120px]"
                data-testid="input-item-description"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Item Condition *</Label>
              <Select
                value={formData.item_condition}
                onValueChange={(value) => handleSelectChange("item_condition", value)}
                required
              >
                <SelectTrigger className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg" data-testid="select-item-condition">
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

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Environment *</Label>
              <p className="text-sm text-gray-500 mb-3">Please indicate the environment where items are stored</p>
              <div className="space-y-3 mt-2">
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="smoke_free"
                      checked={formData.smoke_free === true}
                      onChange={() => setFormData({ ...formData, smoke_free: true })}
                      className="w-6 h-6 accent-[#FF1493]"
                      data-testid="smoke-free-yes"
                    />
                    <span className="text-sm text-[#1A1A2E]">Smoke Free</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="smoke_free"
                      checked={formData.smoke_free === false}
                      onChange={() => setFormData({ ...formData, smoke_free: false })}
                      className="w-6 h-6 accent-[#FF1493]"
                      data-testid="smoke-free-no"
                    />
                    <span className="text-sm text-[#1A1A2E]">Not Smoke Free</span>
                  </label>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="pet_free"
                      checked={formData.pet_free === true}
                      onChange={() => setFormData({ ...formData, pet_free: true })}
                      className="w-6 h-6 accent-[#FF1493]"
                      data-testid="pet-free-yes"
                    />
                    <span className="text-sm text-[#1A1A2E]">Pet Free</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="pet_free"
                      checked={formData.pet_free === false}
                      onChange={() => setFormData({ ...formData, pet_free: false })}
                      className="w-6 h-6 accent-[#FF1493]"
                      data-testid="pet-free-no"
                    />
                    <span className="text-sm text-[#1A1A2E]">Pet Friendly</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Upload Pictures (Optional)</Label>
              <p className="text-sm text-gray-500 mb-3">Add photos of your items to help us evaluate them</p>
              <div className="border-2 border-dashed border-[#FF1493]/30 rounded-xl p-6 text-center hover:border-[#FF1493] transition-colors bg-[#FF1493]/5">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  data-testid="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-[#FF1493] mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload images</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
                </label>
              </div>
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`remove-image-${index}`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">Additional Information (Optional)</Label>
              <Textarea
                name="additional_info"
                value={formData.additional_info}
                onChange={handleChange}
                placeholder="Any additional details you'd like to share about your items (sizing, special features, why you're consigning, etc.)"
                className="border-2 border-gray-200 focus:border-[#FF1493] rounded-lg min-h-[100px]"
                data-testid="input-additional-info"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF1493] to-[#8B5CF6] hover:from-[#E91E8C] hover:to-[#6D28D9] text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
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
