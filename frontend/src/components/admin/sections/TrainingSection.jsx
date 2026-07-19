/**
 * Employee Training Section
 * Displays training videos and tracks completion progress
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  CheckCircle,
  Circle,
  BookOpen,
  Video,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  GraduationCap,
  Camera,
  Package,
  Tag,
  FileText,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Icons for each module
const MODULE_ICONS = {
  "prep-item": Package,
  "photos": Camera,
  "measurements": FileText,
  "photos-description": FileText,
  "sku-cost": Tag,
  "bag-store": FolderOpen
};

export default function TrainingSection({ getAuthHeader, isAdmin = false }) {
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({ completed_modules: [], completion_percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);
  const [generatingVideos, setGeneratingVideos] = useState({});
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch training modules and progress
  const fetchData = async () => {
    try {
      const [modulesRes, progressRes] = await Promise.all([
        axios.get(`${API}/training/modules`, getAuthHeader()),
        axios.get(`${API}/training/my-progress`, getAuthHeader())
      ]);
      setModules(modulesRes.data.modules);
      setProgress(progressRes.data);
    } catch (error) {
      console.error("Failed to fetch training data:", error);
      toast.error("Failed to load training modules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Poll for video generation status if admin
    if (isAdmin) {
      const interval = setInterval(fetchData, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, []);

  // Mark module as complete
  const markComplete = async (moduleId) => {
    try {
      await axios.post(`${API}/training/mark-complete`, {
        module_id: moduleId,
        completed: true
      }, getAuthHeader());
      
      setProgress(prev => ({
        ...prev,
        completed_modules: [...prev.completed_modules, moduleId],
        completion_percentage: Math.round(((prev.completed_modules.length + 1) / modules.length) * 100)
      }));
      
      toast.success("Module completed!");
    } catch (error) {
      console.error("Failed to mark complete:", error);
      toast.error("Failed to save progress");
    }
  };

  // Generate video (admin only)
  const generateVideo = async (moduleId) => {
    try {
      setGeneratingVideos(prev => ({ ...prev, [moduleId]: true }));
      
      await axios.post(`${API}/training/generate-video`, {
        module_id: moduleId
      }, getAuthHeader());
      
      toast.success("Video generation started! This may take a few minutes.");
    } catch (error) {
      console.error("Failed to start video generation:", error);
      toast.error(error.response?.data?.detail || "Failed to start video generation");
      setGeneratingVideos(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  // Generate all videos (admin only)
  const generateAllVideos = async () => {
    try {
      const res = await axios.post(`${API}/training/generate-all`, {}, getAuthHeader());
      toast.success(`Started generating ${res.data.started.length} videos`);
      fetchData();
    } catch (error) {
      console.error("Failed to generate videos:", error);
      toast.error("Failed to start video generation");
    }
  };

  // Handle video end
  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (selectedModule && !progress.completed_modules.includes(selectedModule.id)) {
      // Auto-mark as complete when video finishes
      markComplete(selectedModule.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">Employee Training</h2>
            <p className="text-purple-100 text-sm">Resale Photo & Processing Guide</p>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Your Progress</span>
            <span>{progress.completion_percentage}% Complete</span>
          </div>
          <Progress value={progress.completion_percentage} className="h-2 bg-purple-400" />
          <p className="text-xs text-purple-200 mt-2">
            {progress.completed_modules.length} of {modules.length} modules completed
          </p>
        </div>
        
        {/* Admin: Generate All Button */}
        {isAdmin && (
          <Button 
            onClick={generateAllVideos}
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            <Video className="w-4 h-4 mr-2" />
            Generate All Videos
          </Button>
        )}
      </div>

      {/* Module List */}
      <div className="space-y-3">
        {modules.map((module, index) => {
          const Icon = MODULE_ICONS[module.id] || BookOpen;
          const isCompleted = progress.completed_modules.includes(module.id);
          const isGenerating = module.generation_status === "generating" || generatingVideos[module.id];
          
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl border-2 transition-all ${
                isCompleted ? "border-green-200 bg-green-50/50" : "border-gray-100 hover:border-purple-200"
              }`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setSelectedModule(selectedModule?.id === module.id ? null : module)}
              >
                <div className="flex items-center gap-4">
                  {/* Completion Status */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? "bg-green-500" : "bg-gray-100"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-gray-500 font-bold">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Module Info */}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${isCompleted ? "text-green-700" : "text-gray-800"}`}>
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500">{module.description}</p>
                  </div>
                  
                  {/* Video Status */}
                  <div className="flex items-center gap-2">
                    {isGenerating ? (
                      <span className="flex items-center gap-1 text-amber-600 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </span>
                    ) : module.video_exists ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <Video className="w-4 h-4" />
                        Ready
                      </span>
                    ) : isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateVideo(module.id);
                        }}
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Generate
                      </Button>
                    ) : (
                      <span className="text-gray-400 text-sm">Coming soon</span>
                    )}
                    
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedModule?.id === module.id ? "rotate-90" : ""
                    }`} />
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              <AnimatePresence>
                {selectedModule?.id === module.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                      {/* Video Player */}
                      {module.video_exists ? (
                        <div className="mb-4">
                          <video
                            ref={videoRef}
                            src={`${API}/training/video/${module.id}`}
                            className="w-full rounded-lg bg-black"
                            controls
                            onEnded={handleVideoEnd}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-8 text-center mb-4">
                          <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">
                            {isGenerating ? "Video is being generated..." : "Video not yet available"}
                          </p>
                        </div>
                      )}
                      
                      {/* Key Points */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Key Points
                        </h4>
                        <ul className="space-y-1">
                          {module.points.map((point, i) => (
                            <li key={i} className="text-sm text-purple-700 flex items-start gap-2">
                              <Circle className="w-2 h-2 mt-1.5 flex-shrink-0 fill-purple-400" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Mark Complete Button */}
                      {!isCompleted && (
                        <Button
                          onClick={() => markComplete(module.id)}
                          className="w-full mt-4 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Complete
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      
      {/* Completion Message */}
      {progress.completion_percentage === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white text-center"
        >
          <GraduationCap className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">Training Complete!</h3>
          <p className="text-green-100">
            You&apos;ve completed all training modules. You&apos;re ready to start processing items!
          </p>
        </motion.div>
      )}
    </div>
  );
}
