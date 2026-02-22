import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Send, CheckCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOGO_URL = "https://customer-assets.emergentagent.com/job_reseller-dashboard-11/artifacts/vcuzqi4g_IMG_0042.jpg";

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
    item_description: "",
    item_condition: "",
    smoke_free: true,
    pet_free: true,
    image_urls: []
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        <h1 className="form-title">Consignment Inquiry</h1>
        <p className="form-subtitle">Tell us about your items</p>
      </motion.div>

      {/* Brands Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="form-card mb-6"
        data-testid="brands-section"
      >
        <h2 className="font-playfair text-xl font-bold text-[#333] mb-2">
          Brands Heavily Considered for Consignment Sale
        </h2>
        <p className="text-[#666] mb-4">
          Review the brands below and see if you have any items we are looking for!
        </p>
        
        <div className="mb-4">
          <h3 className="font-semibold text-[#5D4037] mb-2">Clothing Brands:</h3>
          <p className="text-sm text-[#666] leading-relaxed">{CLOTHING_BRANDS}</p>
        </div>
        
        <div>
          <h3 className="font-semibold text-[#5D4037] mb-2">Shoe Brands:</h3>
          <p className="text-sm text-[#666] leading-relaxed">{SHOE_BRANDS}</p>
        </div>
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
          <Label className="form-label">Type of Clothing *</Label>
          <p className="text-sm text-[#888] mb-3">Select all that apply</p>
          <div className="grid grid-cols-2 gap-3">
            {ITEM_TYPES.map((type) => (
              <div key={type.id} className="flex items-center gap-3">
                <Checkbox
                  id={`type-${type.id}`}
                  checked={formData.item_types.includes(type.id)}
                  onCheckedChange={(checked) => handleItemTypeChange(type.id, checked)}
                  data-testid={`item-type-${type.id}`}
                />
                <Label htmlFor={`type-${type.id}`} className="text-sm text-[#4a4a4a] cursor-pointer font-normal">
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
                className="form-input"
                data-testid="input-other-item-type"
              />
            </div>
          )}
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

        <div className="form-group">
          <Label className="form-label">Home Environment</Label>
          <div className="space-y-3 mt-2">
            <div>
              <p className="text-sm text-[#666] mb-2">Smoke Environment:</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="smoke_free"
                    checked={formData.smoke_free === true}
                    onChange={() => setFormData({ ...formData, smoke_free: true })}
                    className="w-4 h-4 text-[#F8C8DC]"
                    data-testid="smoke-free-yes"
                  />
                  <span className="text-sm text-[#4a4a4a]">Smoke Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="smoke_free"
                    checked={formData.smoke_free === false}
                    onChange={() => setFormData({ ...formData, smoke_free: false })}
                    className="w-4 h-4 text-[#F8C8DC]"
                    data-testid="smoke-free-no"
                  />
                  <span className="text-sm text-[#4a4a4a]">Not Smoke Free</span>
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#666] mb-2">Pet Environment:</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pet_free"
                    checked={formData.pet_free === true}
                    onChange={() => setFormData({ ...formData, pet_free: true })}
                    className="w-4 h-4 text-[#F8C8DC]"
                    data-testid="pet-free-yes"
                  />
                  <span className="text-sm text-[#4a4a4a]">Pet Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pet_free"
                    checked={formData.pet_free === false}
                    onChange={() => setFormData({ ...formData, pet_free: false })}
                    className="w-4 h-4 text-[#F8C8DC]"
                    data-testid="pet-free-no"
                  />
                  <span className="text-sm text-[#4a4a4a]">Pet Friendly</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <Label className="form-label">Upload Pictures (Optional)</Label>
          <p className="text-sm text-[#888] mb-3">Add photos of your items to help us evaluate them</p>
          <div className="border-2 border-dashed border-[#F8C8DC]/50 rounded-xl p-6 text-center hover:border-[#F8C8DC] transition-colors">
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
              <Upload className="w-8 h-8 text-[#D48C9E] mx-auto mb-2" />
              <p className="text-sm text-[#666]">Click to upload images</p>
              <p className="text-xs text-[#999] mt-1">PNG, JPG up to 10MB each</p>
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
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
