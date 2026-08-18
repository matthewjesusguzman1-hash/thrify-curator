import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Image as ImageIcon,
  Send,
  AlertCircle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function ApplicantTestPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [token]);

  const fetchTest = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/public/test/${token}`);
      setTest(response.data.test);
      setApplicant(response.data.applicant);
      
      // Initialize responses structure
      const initialResponses = {};
      response.data.test.photos.forEach(photo => {
        initialResponses[photo.id] = {};
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

  const handleFieldChange = (photoId, fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [photoId]: {
        ...prev[photoId],
        [fieldId]: value
      }
    }));
  };

  const validateCurrentPhoto = () => {
    if (!test) return true;
    
    const currentPhoto = test.photos[currentPhotoIndex];
    const photoResponses = responses[currentPhoto.id] || {};
    
    const requiredFields = test.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!photoResponses[field.id]?.trim()) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentPhoto()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (currentPhotoIndex < test.photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentPhoto()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate all photos
    for (let i = 0; i < test.photos.length; i++) {
      const photo = test.photos[i];
      const photoResponses = responses[photo.id] || {};
      
      const requiredFields = test.fields.filter(f => f.required);
      for (const field of requiredFields) {
        if (!photoResponses[field.id]?.trim()) {
          toast.error(`Please complete all required fields for Item ${i + 1}`);
          setCurrentPhotoIndex(i);
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

  const currentPhoto = test?.photos[currentPhotoIndex];
  const currentResponses = responses[currentPhoto?.id] || {};
  const isLastPhoto = currentPhotoIndex === test?.photos.length - 1;
  const progress = ((currentPhotoIndex + 1) / test?.photos.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1A1A2E] to-[#0F3460]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">{test?.name}</h1>
              <p className="text-sm text-white/60">Welcome, {applicant?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">
                Item {currentPhotoIndex + 1} of {test?.photos.length}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Photo Section */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#333] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#8B5CF6]" />
                Product Photo
              </h2>
            </div>
            <div className="p-4">
              <img
                src={`${API}/api/applicant-tests/public/photo/${test?.id}/${currentPhoto?.filename}`}
                alt={`Product ${currentPhotoIndex + 1}`}
                className="w-full h-auto max-h-[400px] object-contain bg-gray-50 rounded-xl"
              />
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#333]">Listing Details</h2>
              <p className="text-xs text-gray-500 mt-1">
                Fill out the information as if you were creating a real listing
              </p>
            </div>
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {test?.fields.map(field => (
                <div key={field.id}>
                  <Label className="flex items-center gap-1">
                    {field.name}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {field.type === "textarea" ? (
                    <textarea
                      value={currentResponses[field.id] || ""}
                      onChange={e => handleFieldChange(currentPhoto.id, field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                      rows={3}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={currentResponses[field.id] || ""}
                      onChange={e => handleFieldChange(currentPhoto.id, field.id, e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                    >
                      <option value="">Select {field.name}...</option>
                      {field.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={currentResponses[field.id] || ""}
                      onChange={e => handleFieldChange(currentPhoto.id, field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPhotoIndex === 0}
            className="bg-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {isLastPhoto ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white px-8"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Assessment
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white"
            >
              Next Item
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </main>

      {/* Photo Navigation Dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
        {test?.photos.map((photo, index) => {
          const photoResponses = responses[photo.id] || {};
          const requiredFields = test.fields.filter(f => f.required);
          const isComplete = requiredFields.every(f => photoResponses[f.id]?.trim());
          
          return (
            <button
              key={photo.id}
              onClick={() => setCurrentPhotoIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentPhotoIndex
                  ? "bg-[#00D4FF] scale-125"
                  : isComplete
                  ? "bg-green-500"
                  : "bg-white/30 hover:bg-white/50"
              }`}
              title={`Item ${index + 1}${isComplete ? " (Complete)" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
