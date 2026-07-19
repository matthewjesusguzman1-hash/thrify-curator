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
  FolderOpen,
  Trash2,
  Edit3,
  RotateCcw,
  Save,
  X,
  Plus,
  ChevronDown,
  ChevronUp
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
  const [editingPrompt, setEditingPrompt] = useState(null); // module_id being edited
  const [promptText, setPromptText] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState({});
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({
    title: "",
    description: "",
    category: "General",
    points: [""],
    video_prompt: ""
  });
  const [editingModule, setEditingModule] = useState(null); // Full module edit
  const [deletingModule, setDeletingModule] = useState({});
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

  // Delete video (admin only)
  const deleteVideo = async (moduleId) => {
    if (!window.confirm("Are you sure you want to delete this video? You'll need to regenerate it.")) {
      return;
    }
    
    try {
      setDeletingVideo(prev => ({ ...prev, [moduleId]: true }));
      await axios.delete(`${API}/training/video/${moduleId}`, getAuthHeader());
      toast.success("Video deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to delete video:", error);
      toast.error(error.response?.data?.detail || "Failed to delete video");
    } finally {
      setDeletingVideo(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  // Start editing prompt
  const startEditingPrompt = (module) => {
    setEditingPrompt(module.id);
    setPromptText(module.video_prompt);
  };

  // Save edited prompt
  const savePrompt = async (moduleId) => {
    try {
      setSavingPrompt(true);
      await axios.put(`${API}/training/prompt/${moduleId}`, {
        module_id: moduleId,
        prompt: promptText
      }, getAuthHeader());
      toast.success("Prompt updated! Regenerate video to see changes.");
      setEditingPrompt(null);
      fetchData();
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast.error(error.response?.data?.detail || "Failed to save prompt");
    } finally {
      setSavingPrompt(false);
    }
  };

  // Reset prompt to default
  const resetPrompt = async (moduleId) => {
    if (!window.confirm("Reset this prompt to the default? Your custom prompt will be lost.")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/training/prompt/${moduleId}`, getAuthHeader());
      toast.success("Prompt reset to default");
      setEditingPrompt(null);
      fetchData();
    } catch (error) {
      console.error("Failed to reset prompt:", error);
      toast.error("Failed to reset prompt");
    }
  };

  // Create new module
  const createModule = async () => {
    if (!newModule.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    try {
      await axios.post(`${API}/training/module`, {
        title: newModule.title,
        description: newModule.description,
        category: newModule.category,
        points: newModule.points.filter(p => p.trim()),
        video_prompt: newModule.video_prompt
      }, getAuthHeader());
      
      toast.success("Module created!");
      setShowAddModule(false);
      setNewModule({ title: "", description: "", category: "General", points: [""], video_prompt: "" });
      fetchData();
    } catch (error) {
      console.error("Failed to create module:", error);
      toast.error(error.response?.data?.detail || "Failed to create module");
    }
  };

  // Delete module
  const deleteModule = async (moduleId, moduleTitle) => {
    if (!window.confirm(`Delete "${moduleTitle}"? This will also delete its video and cannot be undone.`)) {
      return;
    }
    
    try {
      setDeletingModule(prev => ({ ...prev, [moduleId]: true }));
      await axios.delete(`${API}/training/module/${moduleId}`, getAuthHeader());
      toast.success("Module deleted");
      fetchData();
    } catch (error) {
      console.error("Failed to delete module:", error);
      toast.error(error.response?.data?.detail || "Failed to delete module");
    } finally {
      setDeletingModule(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  // Update module
  const updateModule = async (moduleId) => {
    if (!editingModule) return;
    
    try {
      await axios.put(`${API}/training/module/${moduleId}`, {
        title: editingModule.title,
        description: editingModule.description,
        category: editingModule.category,
        points: editingModule.points?.filter(p => p.trim()) || [],
        video_prompt: editingModule.video_prompt
      }, getAuthHeader());
      
      toast.success("Module updated!");
      setEditingModule(null);
      fetchData();
    } catch (error) {
      console.error("Failed to update module:", error);
      toast.error(error.response?.data?.detail || "Failed to update module");
    }
  };

  // Add point to list
  const addPoint = (isNew = false) => {
    if (isNew) {
      setNewModule(prev => ({ ...prev, points: [...prev.points, ""] }));
    } else if (editingModule) {
      setEditingModule(prev => ({ ...prev, points: [...(prev.points || []), ""] }));
    }
  };

  // Update point in list
  const updatePoint = (index, value, isNew = false) => {
    if (isNew) {
      setNewModule(prev => ({
        ...prev,
        points: prev.points.map((p, i) => i === index ? value : p)
      }));
    } else if (editingModule) {
      setEditingModule(prev => ({
        ...prev,
        points: prev.points.map((p, i) => i === index ? value : p)
      }));
    }
  };

  // Remove point from list
  const removePoint = (index, isNew = false) => {
    if (isNew) {
      setNewModule(prev => ({
        ...prev,
        points: prev.points.filter((_, i) => i !== index)
      }));
    } else if (editingModule) {
      setEditingModule(prev => ({
        ...prev,
        points: prev.points.filter((_, i) => i !== index)
      }));
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
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={generateAllVideos}
              variant="secondary"
              size="sm"
            >
              <Video className="w-4 h-4 mr-2" />
              Generate All Videos
            </Button>
            <Button 
              onClick={() => setShowAddModule(true)}
              variant="secondary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </div>
        )}
      </div>

      {/* Add Module Modal */}
      {isAdmin && showAddModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Add Training Module</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModule(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newModule.title}
                  onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., Welcome Video"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Brief description of the module"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newModule.category}
                  onChange={(e) => setNewModule(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., Onboarding, Photo Training"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Points</label>
                {newModule.points.map((point, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => updatePoint(i, e.target.value, true)}
                      className="flex-1 p-2 border rounded-lg"
                      placeholder={`Point ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePoint(i, true)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addPoint(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Point
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video Prompt</label>
                <textarea
                  value={newModule.video_prompt}
                  onChange={(e) => setNewModule(prev => ({ ...prev, video_prompt: e.target.value }))}
                  className="w-full p-2 border rounded-lg h-32 resize-none"
                  placeholder="Describe the video you want AI to generate..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModule(false)}>Cancel</Button>
              <Button onClick={createModule}>Create Module</Button>
            </div>
          </motion.div>
        </div>
      )}

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
                    
                    {/* Admin: Edit/Delete Module */}
                    {isAdmin && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule({ ...module });
                          }}
                          title="Edit Module"
                        >
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteModule(module.id, module.title);
                          }}
                          disabled={deletingModule[module.id]}
                          title="Delete Module"
                        >
                          {deletingModule[module.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    )}
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
                          {/* Admin: Delete Video Button */}
                          {isAdmin && (
                            <div className="flex justify-end mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => deleteVideo(module.id)}
                                disabled={deletingVideo[module.id]}
                              >
                                {deletingVideo[module.id] ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-1" />
                                )}
                                Delete Video
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-8 text-center mb-4">
                          <Video className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">
                            {isGenerating ? "Video is being generated..." : "Video not yet available"}
                          </p>
                        </div>
                      )}
                      
                      {/* Admin: Edit Prompt Section */}
                      {isAdmin && (
                        <div className="mb-4 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                              <Edit3 className="w-4 h-4" />
                              Video Prompt
                            </h4>
                            {editingPrompt !== module.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditingPrompt(module)}
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                {module.has_custom_prompt && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resetPrompt(module.id)}
                                    className="text-amber-600"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingPrompt(null)}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => savePrompt(module.id)}
                                  disabled={savingPrompt}
                                >
                                  {savingPrompt ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3 mr-1" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {editingPrompt === module.id ? (
                            <textarea
                              value={promptText}
                              onChange={(e) => setPromptText(e.target.value)}
                              className="w-full h-32 p-3 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter video prompt..."
                            />
                          ) : (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {module.video_prompt}
                              {module.has_custom_prompt && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </p>
                          )}
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

      {/* Edit Module Modal */}
      {isAdmin && editingModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Edit Module: {editingModule.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingModule(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingModule.title}
                  onChange={(e) => setEditingModule(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingModule.description}
                  onChange={(e) => setEditingModule(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={editingModule.category || "General"}
                  onChange={(e) => setEditingModule(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Points</label>
                {(editingModule.points || []).map((point, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => updatePoint(i, e.target.value, false)}
                      className="flex-1 p-2 border rounded-lg"
                      placeholder={`Point ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePoint(i, false)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addPoint(false)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Point
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video Prompt</label>
                <textarea
                  value={editingModule.video_prompt || ""}
                  onChange={(e) => setEditingModule(prev => ({ ...prev, video_prompt: e.target.value }))}
                  className="w-full p-2 border rounded-lg h-32 resize-none"
                  placeholder="Describe the video you want AI to generate..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button>
              <Button onClick={() => updateModule(editingModule.id)}>Save Changes</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
