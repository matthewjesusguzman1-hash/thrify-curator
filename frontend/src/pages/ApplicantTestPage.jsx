import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import {
  CheckCircle,
  Image as ImageIcon,
  Send,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Lightbulb
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

// Example listing to show applicants what we expect
const EXAMPLE_LISTING = {
  title: "Lululemon Softstreme Pique Oversized Long-Sleeve Polo Shirt Warm Ash Grey Small",
  description: `Lululemon Softstreme Pique Oversized Long-Sleeve Polo Shirt Warm Ash Grey Small
In great condition from a smoke free home.

Approximate flat lay measurements:
Underarm to Underarm - 23"
Length - 25"

#QuietLuxury #CleanGirl #Minimalist #ElevatedAthleisure #SportyChic`,
  brand: "Lululemon",
  condition: "Like New",
  primary_color: "Grey",
  secondary_color: "",
  tags: "lululemon, polo shirt, softstreme, activewear, quiet luxury, clean girl, minimalist",
  category: "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Activewear Tops",
  us_size: "Small"
};

export default function ApplicantTestPage() {
  const { token } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [responses, setResponses] = useState({}); // { itemId: { fieldId: value } }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Photo gallery state - which photo is currently enlarged for the current item
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Example listing toggle
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [token]);

  const fetchTest = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/public/test/${token}`);
      setTest(response.data.test);
      setApplicant(response.data.applicant);
      
      // Initialize responses for each item
      const items = response.data.test.items || [];
      const initialResponses = {};
      items.forEach(item => {
        initialResponses[item.id] = {};
      });
      setResponses(initialResponses);
    } catch (err) {
      if (err.response?.status === 400) {
        setError("This assessment has already been completed.");
      } else if (err.response?.status === 404) {
        setError("Invalid or expired invitation link.");
      } else {
        setError("Failed to load assessment. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (itemId, fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [fieldId]: value
      }
    }));
  };

  const handleNext = () => {
    const items = test?.items || [];
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
      setSelectedPhotoIndex(0);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
      setSelectedPhotoIndex(0);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    const items = test?.items || [];
    
    // Validate required fields for all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemResponses = responses[item.id] || {};
      
      const requiredFields = test.fields.filter(f => f.required);
      for (const field of requiredFields) {
        if (!itemResponses[field.id]?.trim()) {
          toast.error(`Please fill in all required fields for Item ${i + 1}`);
          setCurrentItemIndex(i);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("responses", JSON.stringify(responses));
      
      await axios.post(`${API}/api/applicant-tests/public/submit/${token}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error("This assessment has already been submitted");
      } else {
        toast.error("Failed to submit. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1A1A2E] to-[#0F3460] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4FF] mx-auto" />
          <p className="text-white/70 mt-4">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1A1A2E] to-[#0F3460] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#333] mb-2">Unable to Load Assessment</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1A1A2E] to-[#0F3460] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#333] mb-2">Assessment Submitted!</h1>
          <p className="text-gray-500 mb-6">
            Thank you for completing the skills assessment, {applicant?.name}. 
            We will review your submission and get back to you soon.
          </p>
          <p className="text-sm text-gray-400">
            You can close this window now.
          </p>
        </motion.div>
      </div>
    );
  }

  const items = test?.items || [];
  const currentItem = items[currentItemIndex];
  const currentPhotos = currentItem?.photos || [];
  const currentPhoto = currentPhotos[selectedPhotoIndex];
  const currentResponses = responses[currentItem?.id] || {};
  const isLastItem = currentItemIndex === items.length - 1;
  const progress = ((currentItemIndex + 1) / items.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1A1A2E] to-[#0F3460]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white truncate">{test?.name}</h1>
              <p className="text-xs sm:text-sm text-white/60">Welcome, {applicant?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-white/80">
                  Item {currentItemIndex + 1} of {items.length}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExample(!showExample)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
              >
                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                <span className="hidden sm:inline">{showExample ? "Hide" : "Example"}</span>
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 sm:mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-white/60 mt-1 sm:hidden text-center">
            Item {currentItemIndex + 1} of {items.length}
          </p>
        </div>
      </header>

      {/* Example Listing Panel */}
      <AnimatePresence>
        {showExample && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200 overflow-hidden"
          >
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-yellow-800 mb-2 text-sm sm:text-base">Example Listing</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <p><span className="font-medium text-yellow-700">Title:</span> {EXAMPLE_LISTING.title}</p>
                      <p className="mt-1"><span className="font-medium text-yellow-700">Brand:</span> {EXAMPLE_LISTING.brand}</p>
                      <p><span className="font-medium text-yellow-700">Condition:</span> {EXAMPLE_LISTING.condition}</p>
                      <p><span className="font-medium text-yellow-700">Color:</span> {EXAMPLE_LISTING.primary_color}</p>
                      <p><span className="font-medium text-yellow-700">Size:</span> {EXAMPLE_LISTING.us_size}</p>
                    </div>
                    <div>
                      <p><span className="font-medium text-yellow-700">Description:</span></p>
                      <p className="text-gray-600 text-[11px] sm:text-xs mt-1 line-clamp-3">{EXAMPLE_LISTING.description}</p>
                      <p className="mt-1"><span className="font-medium text-yellow-700">Tags:</span></p>
                      <p className="text-gray-600 text-[11px] sm:text-xs">{EXAMPLE_LISTING.tags}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowExample(false)} className="text-yellow-600 hover:text-yellow-800 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Photo Gallery Section */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#333] flex items-center gap-2 text-sm sm:text-base">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5CF6]" />
                Product Photos ({currentPhotos.length} reference images)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Review all photos to create an accurate listing
              </p>
            </div>
            
            {/* Main Photo Display */}
            <div className="p-3 sm:p-4">
              {currentPhoto ? (
                <img
                  src={`${API}/api/applicant-tests/public/photo/${test?.id}/${currentPhoto.filename}`}
                  alt={`Product photo ${selectedPhotoIndex + 1}`}
                  className="w-full h-auto max-h-[280px] sm:max-h-[350px] object-contain bg-gray-50 rounded-xl"
                />
              ) : (
                <div className="w-full h-[280px] sm:h-[350px] bg-gray-100 rounded-xl flex items-center justify-center">
                  <p className="text-gray-400">No photos available</p>
                </div>
              )}
              
              {/* Photo Navigation */}
              {currentPhotos.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => setSelectedPhotoIndex(prev => Math.max(0, prev - 1))}
                    disabled={selectedPhotoIndex === 0}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600 px-2">
                    Photo {selectedPhotoIndex + 1} of {currentPhotos.length}
                  </span>
                  <button
                    onClick={() => setSelectedPhotoIndex(prev => Math.min(currentPhotos.length - 1, prev + 1))}
                    disabled={selectedPhotoIndex === currentPhotos.length - 1}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Thumbnail Strip */}
            {currentPhotos.length > 1 && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex gap-2 overflow-x-auto py-1">
                  {currentPhotos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotoIndex === index 
                          ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6]/30" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={`${API}/api/applicant-tests/public/photo/${test?.id}/${photo.filename}`}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-2xl overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#333] text-sm sm:text-base">Create Listing for Item {currentItemIndex + 1}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Fill out the details based on the photos shown
              </p>
            </div>
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto max-h-[400px] sm:max-h-[500px]">
              {test?.fields.map(field => (
                <div key={field.id}>
                  <Label className="flex items-center gap-1 text-xs sm:text-sm">
                    {field.name}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {field.type === "textarea" ? (
                    <textarea
                      value={currentResponses[field.id] || ""}
                      onChange={e => handleFieldChange(currentItem.id, field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent text-sm"
                      rows={3}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={currentResponses[field.id] || ""}
                      onChange={e => handleFieldChange(currentItem.id, field.id, e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent text-sm"
                    >
                      <option value="">Select {field.name}...</option>
                      {field.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={currentResponses[field.id] || ""}
                      onChange={e => handleFieldChange(currentItem.id, field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* Navigation */}
            <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentItemIndex === 0}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              {isLastItem ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white text-xs sm:text-sm"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Submit All
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white text-xs sm:text-sm"
                >
                  Next Item
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
