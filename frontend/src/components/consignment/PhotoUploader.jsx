import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PhotoUploader({
  photos,
  setPhotos,
  maxPhotos = 10,
  className = ""
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const uploadedUrls = [];
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per file.`);
        continue;
      }
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${API}/forms/upload-photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data.url) {
          uploadedUrls.push(response.data.url);
        }
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    if (uploadedUrls.length > 0) {
      setPhotos(prev => [...prev, ...uploadedUrls].slice(0, maxPhotos));
      toast.success(`${uploadedUrls.length} photo(s) uploaded`);
    }
    
    setUploading(false);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {/* Upload area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#ddd] rounded-xl p-4 text-center cursor-pointer hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePhotoUpload(Array.from(e.target.files))}
          data-testid="photo-upload-input"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-[#888]" />
        <p className="text-sm text-[#666]">
          {uploading ? "Uploading..." : "Click to upload photos"}
        </p>
        <p className="text-xs text-[#888] mt-1">
          Max 5MB per file • {photos.length}/{maxPhotos} photos
        </p>
      </div>
      
      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-[#ddd]"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
