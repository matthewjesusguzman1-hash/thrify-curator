import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import {
  Plus,
  Trash2,
  Upload,
  Send,
  Eye,
  FileText,
  Users,
  CheckCircle,
  Clock,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Mail,
  ClipboardList,
  Image as ImageIcon,
  Play,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Pencil,
  Calendar,
  Link,
  Video,
  Inbox,
  MessageSquare,
  ExternalLink,
  Edit,
  AlertTriangle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function ApplicantTestsSection({ getAuthHeader }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(null);
  const [showSubmissionDetail, setShowSubmissionDetail] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showInterviewInbox, setShowInterviewInbox] = useState(false);
  const [defaultFields, setDefaultFields] = useState([]);

  useEffect(() => {
    fetchTests();
    fetchDefaultFields();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/list`, getAuthHeader());
      setTests(response.data.tests || []);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultFields = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/default-fields`, getAuthHeader());
      setDefaultFields(response.data.fields || []);
    } catch (error) {
      console.error("Failed to fetch default fields:", error);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm("Are you sure you want to delete this test? All invites and submissions will be removed.")) return;
    
    try {
      await axios.delete(`${API}/api/applicant-tests/${testId}`, getAuthHeader());
      toast.success("Test deleted");
      fetchTests();
    } catch (error) {
      toast.error("Failed to delete test");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-[#8B5CF6] flex-shrink-0" />
            <span className="truncate">Applicant Skills Tests</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Create listing tests to evaluate job applicants
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowInterviewInbox(true)}
            variant="outline"
            className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/10 text-sm"
            data-testid="interview-inbox-btn"
          >
            <Inbox className="w-4 h-4 mr-2" />
            Interview Inbox
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white w-full sm:w-auto text-sm"
            data-testid="create-test-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>
      </div>

      {/* Tests List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto" />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 bg-white/10 rounded-xl border border-white/20">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-200">No tests created yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a test to start evaluating applicants</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onDelete={() => handleDeleteTest(test.id)}
              onInvite={() => setShowInviteModal(test)}
              onViewSubmissions={() => setShowSubmissionsModal(test)}
              onPreview={() => setShowPreviewModal(test)}
              onEdit={() => setShowEditModal(test)}
              getAuthHeader={getAuthHeader}
            />
          ))}
        </div>
      )}

      {/* Create Test Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTestModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchTests();
            }}
            defaultFields={defaultFields}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            test={showInviteModal}
            onClose={() => setShowInviteModal(null)}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>

      {/* Submissions Modal */}
      <AnimatePresence>
        {showSubmissionsModal && (
          <SubmissionsModal
            test={showSubmissionsModal}
            onClose={() => setShowSubmissionsModal(null)}
            onViewDetail={(submission) => {
              setShowSubmissionDetail(submission);
              setShowSubmissionsModal(null);
            }}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {showSubmissionDetail && (
          <SubmissionDetailModal
            submission={showSubmissionDetail}
            onClose={() => setShowSubmissionDetail(null)}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <TestPreviewModal
            test={showPreviewModal}
            onClose={() => setShowPreviewModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <EditTestModal
            test={showEditModal}
            onClose={() => setShowEditModal(null)}
            onUpdated={() => {
              setShowEditModal(null);
              fetchTests();
            }}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>

      {/* Interview Inbox Modal */}
      <AnimatePresence>
        {showInterviewInbox && (
          <InterviewInboxModal
            onClose={() => setShowInterviewInbox(false)}
            getAuthHeader={getAuthHeader}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Test Card Component
function TestCard({ test, onDelete, onInvite, onViewSubmissions, onPreview, onEdit, getAuthHeader }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Card content - stacks on mobile, side-by-side on larger screens */}
      <div className="flex flex-col gap-3">
        {/* Test info section */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#333] flex items-center gap-2 text-sm sm:text-base">
            <FileText className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
            <span className="truncate">{test.name}</span>
          </h3>
          {test.description && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{test.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              {test.items?.length || test.photos?.length || 0} {test.items?.length ? 'items' : 'photos'}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {test.invites_sent || 0} invites
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {test.submissions_count || 0} submissions
            </span>
          </div>
        </div>
        
        {/* Action buttons - always visible, full width on mobile */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex-1 sm:flex-none text-green-600 border-green-300 text-xs sm:text-sm h-9"
            data-testid="test-card-preview-btn"
          >
            <Play className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1 sm:flex-none text-orange-600 border-orange-300 text-xs sm:text-sm h-9"
            data-testid="test-card-edit-btn"
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewSubmissions}
            className="flex-1 sm:flex-none text-[#8B5CF6] border-[#8B5CF6]/30 text-xs sm:text-sm h-9"
            data-testid="test-card-view-btn"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onInvite}
            className="flex-1 sm:flex-none text-[#00D4FF] border-[#00D4FF]/30 text-xs sm:text-sm h-9"
            data-testid="test-card-invite-btn"
          >
            <Send className="w-4 h-4 mr-1" />
            Invite
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-500 border-red-300 hover:bg-red-50 h-9 px-3"
            data-testid="test-card-delete-btn"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Create Test Modal
function CreateTestModal({ onClose, onCreated, defaultFields, getAuthHeader }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState(defaultFields.map(f => ({ ...f, enabled: true })));
  const [photos, setPhotos] = useState([]);
  const [items, setItems] = useState([{ id: 1, photoIndices: [] }]); // Items with assigned photos
  const [creating, setCreating] = useState(false);
  const [activeItemId, setActiveItemId] = useState(1); // Which item is selected for assigning photos

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removePhoto = (index) => {
    // Remove photo and update items that reference it
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setItems(prev => prev.map(item => ({
      ...item,
      photoIndices: item.photoIndices
        .filter(idx => idx !== index)
        .map(idx => idx > index ? idx - 1 : idx) // Adjust indices
    })));
  };

  const togglePhotoInItem = (photoIndex) => {
    setItems(prev => prev.map(item => {
      if (item.id !== activeItemId) return item;
      
      const hasPhoto = item.photoIndices.includes(photoIndex);
      return {
        ...item,
        photoIndices: hasPhoto
          ? item.photoIndices.filter(idx => idx !== photoIndex)
          : [...item.photoIndices, photoIndex]
      };
    }));
  };

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id)) + 1;
    setItems(prev => [...prev, { id: newId, photoIndices: [] }]);
    setActiveItemId(newId);
  };

  const removeItem = (itemId) => {
    if (items.length <= 1) {
      toast.error("You need at least one item");
      return;
    }
    setItems(prev => prev.filter(i => i.id !== itemId));
    if (activeItemId === itemId) {
      setActiveItemId(items.find(i => i.id !== itemId)?.id || 1);
    }
  };

  const toggleField = (fieldId) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const toggleFieldRequired = (fieldId) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, required: !f.required } : f
    ));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a test name");
      return;
    }
    if (photos.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }
    
    // Check all items have at least one photo
    const itemsWithPhotos = items.filter(i => i.photoIndices.length > 0);
    if (itemsWithPhotos.length === 0) {
      toast.error("Please assign photos to at least one item");
      return;
    }

    const enabledFields = fields.filter(f => f.enabled);
    if (enabledFields.length === 0) {
      toast.error("Please enable at least one field");
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("fields", JSON.stringify(enabledFields));
      
      // Send items config - which photo indices belong to which item
      const itemsConfig = itemsWithPhotos.map(item => ({
        photo_indices: item.photoIndices
      }));
      formData.append("items_config", JSON.stringify(itemsConfig));
      
      photos.forEach(photo => {
        formData.append("photos", photo);
      });

      await axios.post(`${API}/api/applicant-tests/create`, formData, {
        headers: {
          ...getAuthHeader().headers,
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Test created successfully");
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create test");
    } finally {
      setCreating(false);
    }
  };

  const activeItem = items.find(i => i.id === activeItemId);

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-[#333]">Create Skills Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Test Name */}
          <div>
            <Label className="text-sm sm:text-base font-medium block mb-2">Test Name *</Label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Listing Skills Assessment"
              className="w-full h-11 sm:h-12 px-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm sm:text-base font-medium block mb-2">Description (optional)</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the test..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Photos Upload */}
          <div>
            <Label className="flex items-center justify-between text-sm sm:text-base font-medium">
              <span>Upload All Photos *</span>
              <span className="text-xs sm:text-sm text-gray-500 font-normal">{photos.length} uploaded</span>
            </Label>
            
            <label className="mt-3 block border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-colors">
              <input
                type="file"
                onChange={handlePhotoSelect}
                accept="image/*"
                multiple
                className="sr-only"
              />
              <div className="text-center">
                <Upload className="w-10 h-10 text-[#8B5CF6] mx-auto mb-3" />
                <p className="text-sm sm:text-base font-semibold text-[#333] mb-1">Tap to upload photos</p>
                <p className="text-xs sm:text-sm text-gray-500">Then assign them to items below</p>
              </div>
            </label>
            
            {photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[10px] px-1.5 rounded">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Configuration */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm sm:text-base font-medium">
                  Assign Photos to Items
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Each item represents a product. Select which photos belong to each item.
              </p>
              
              {/* Item Tabs */}
              <div className="flex flex-wrap gap-2 mb-3">
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemId(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      activeItemId === item.id
                        ? "bg-[#8B5CF6] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Item {idx + 1}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      activeItemId === item.id ? "bg-white/20" : "bg-gray-200"
                    }`}>
                      {item.photoIndices.length}
                    </span>
                    {items.length > 1 && (
                      <X
                        className="w-3 h-3 ml-1 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Photo Selection for Active Item */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-600 mb-2">
                  Tap photos to assign them to <strong>Item {items.findIndex(i => i.id === activeItemId) + 1}</strong>:
                </p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => {
                    const isSelected = activeItem?.photoIndices.includes(index);
                    const usedByOther = items.some(i => i.id !== activeItemId && i.photoIndices.includes(index));
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => togglePhotoInItem(index)}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6]/30"
                            : usedByOther
                            ? "border-orange-300 opacity-50"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#8B5CF6]/30 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {usedByOther && !isSelected && (
                          <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[8px] text-center">
                            Used
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Fields Configuration */}
          <div>
            <Label className="text-sm sm:text-base font-medium">Listing Fields</Label>
            <p className="text-xs text-gray-500 mb-3">Tap to enable/disable. These are the fields applicants will fill out for each item.</p>
            <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {fields.map(field => (
                <div
                  key={field.id}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    field.enabled 
                      ? "bg-[#8B5CF6]/10 border-2 border-[#8B5CF6]/30" 
                      : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                  }`}
                  onClick={() => toggleField(field.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      field.enabled ? "bg-[#8B5CF6] text-white" : "bg-gray-200"
                    }`}>
                      {field.enabled && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <span className={`text-sm font-medium ${field.enabled ? "text-[#333]" : "text-gray-400"}`}>
                      {field.name}
                    </span>
                  </div>
                  {field.enabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFieldRequired(field.id);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        field.required 
                          ? "bg-[#8B5CF6] text-white" 
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {field.required ? "Required" : "Optional"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white"
          >
            {creating ? "Creating..." : "Create Test"}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Invite Modal
function InviteModal({ test, onClose, getAuthHeader }) {
  const [mode, setMode] = useState("single"); // "single" or "bulk"
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [deletingInviteId, setDeletingInviteId] = useState(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/${test.id}/invites`, getAuthHeader());
      setInvites(response.data.invites || []);
    } catch (error) {
      console.error("Failed to fetch invites:", error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    if (!window.confirm("Delete this invite? The applicant will no longer be able to access the test.")) return;
    
    setDeletingInviteId(inviteId);
    try {
      await axios.delete(
        `${API}/api/applicant-tests/${test.id}/invite/${inviteId}`,
        getAuthHeader()
      );
      toast.success("Invite deleted");
      fetchInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete invite");
    } finally {
      setDeletingInviteId(null);
    }
  };

  const handleSendInvite = async () => {
    if (!applicantName.trim() || !applicantEmail.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("applicant_name", applicantName.trim());
      formData.append("applicant_email", applicantEmail.trim());

      const response = await axios.post(
        `${API}/api/applicant-tests/${test.id}/invite`,
        formData,
        {
          headers: {
            ...getAuthHeader().headers,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      if (response.data.email_error) {
        toast.warning(`Invite created but email failed. Share this link: ${response.data.test_url}`);
      } else {
        toast.success("Invite sent successfully");
      }

      setApplicantName("");
      setApplicantEmail("");
      fetchInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const parseBulkInput = () => {
    // Parse bulk input - supports formats:
    // name, email
    // name <email>
    // email (name extracted from email)
    const lines = bulkInput.split('\n').filter(line => line.trim());
    const applicants = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Try "name, email" format
      if (trimmed.includes(',')) {
        const [name, email] = trimmed.split(',').map(s => s.trim());
        if (email && email.includes('@')) {
          applicants.push({ name: name || email.split('@')[0], email });
          continue;
        }
      }
      
      // Try "name <email>" format
      const angleMatch = trimmed.match(/^(.+?)\s*<(.+@.+)>$/);
      if (angleMatch) {
        applicants.push({ name: angleMatch[1].trim(), email: angleMatch[2].trim() });
        continue;
      }
      
      // Just email - extract name from email
      if (trimmed.includes('@')) {
        const name = trimmed.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        applicants.push({ name, email: trimmed });
      }
    }
    
    return applicants;
  };

  const handleBulkSend = async () => {
    const applicants = parseBulkInput();
    
    if (applicants.length === 0) {
      toast.error("No valid applicants found. Use format: name, email (one per line)");
      return;
    }

    setSending(true);
    setSendingProgress({ current: 0, total: applicants.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < applicants.length; i++) {
      const { name, email } = applicants[i];
      setSendingProgress({ current: i + 1, total: applicants.length });
      
      try {
        const formData = new FormData();
        formData.append("applicant_name", name);
        formData.append("applicant_email", email);

        await axios.post(
          `${API}/api/applicant-tests/${test.id}/invite`,
          formData,
          {
            headers: {
              ...getAuthHeader().headers,
              "Content-Type": "multipart/form-data"
            }
          }
        );
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to send to ${email}:`, error);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setSending(false);
    setSendingProgress({ current: 0, total: 0 });
    
    if (failCount === 0) {
      toast.success(`Successfully sent ${successCount} invites!`);
    } else {
      toast.warning(`Sent ${successCount} invites, ${failCount} failed`);
    }
    
    setBulkInput("");
    fetchInvites();
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#333]">Send Invites</h2>
            <p className="text-sm text-gray-500">{test.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setMode("single")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === "single" 
                  ? "bg-white text-[#333] shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Single Invite
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === "bulk" 
                  ? "bg-white text-[#333] shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Bulk Invite
            </button>
          </div>

          {mode === "single" ? (
            /* Single Invite Form */
            <div className="space-y-4">
              <div>
                <Label className="block mb-2 text-sm">Applicant Name *</Label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-11 px-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                />
              </div>
              <div>
                <Label className="block mb-2 text-sm">Applicant Email *</Label>
                <input
                  type="email"
                  value={applicantEmail}
                  onChange={e => setApplicantEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full h-11 px-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                />
              </div>
              <Button
                onClick={handleSendInvite}
                disabled={sending}
                className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white h-11"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          ) : (
            /* Bulk Invite Form */
            <div className="space-y-4">
              <div>
                <Label className="block mb-2 text-sm">Applicant List</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Enter one applicant per line. Formats accepted:
                  <br />• Name, email@example.com
                  <br />• email@example.com (name will be extracted)
                </p>
                <textarea
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  placeholder={`John Doe, john@example.com\nJane Smith, jane@example.com\nsarah@example.com`}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent resize-none font-mono"
                  rows={6}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {parseBulkInput().length} applicants detected
                </p>
              </div>
              <Button
                onClick={handleBulkSend}
                disabled={sending || parseBulkInput().length === 0}
                className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white h-11"
              >
                <Users className="w-4 h-4 mr-2" />
                {sending 
                  ? `Sending ${sendingProgress.current}/${sendingProgress.total}...` 
                  : `Send ${parseBulkInput().length} Invites`
                }
              </Button>
            </div>
          )}

          {/* Previous Invites */}
          <div>
            <h3 className="font-medium text-[#333] mb-3 text-sm">Sent Invites ({invites.length})</h3>
            {loadingInvites ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8B5CF6] mx-auto" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No invites sent yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {invites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#333] truncate">{invite.applicant_name}</p>
                      <p className="text-xs text-gray-500 truncate">{invite.applicant_email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        invite.status === "completed" 
                          ? "bg-green-100 text-green-700"
                          : invite.status === "started"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {invite.status}
                      </span>
                      <button
                        onClick={() => handleDeleteInvite(invite.id)}
                        disabled={deletingInviteId === invite.id}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        data-testid={`delete-invite-${invite.id}`}
                      >
                        {deletingInviteId === invite.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Submissions Modal
function SubmissionsModal({ test, onClose, onViewDetail, getAuthHeader }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/${test.id}/submissions`, getAuthHeader());
      setSubmissions(response.data.submissions || []);
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailSelection = (email, e) => {
    e.stopPropagation();
    setSelectedEmails(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const selectAllEmails = () => {
    if (selectedEmails.length === submissions.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(submissions.map(s => s.applicant_email));
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#333]">Submissions</h2>
            <p className="text-sm text-gray-500">{test.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <>
              {/* Select All & Schedule Button */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmails.length === submissions.length && submissions.length > 0}
                    onChange={selectAllEmails}
                    className="w-4 h-4 rounded border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                  <span className="text-sm text-gray-600">
                    Select All ({submissions.length})
                  </span>
                </label>
                
                {selectedEmails.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] text-white"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Schedule Interviews ({selectedEmails.length})
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {submissions.map(sub => (
                  <div
                    key={sub.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(sub.applicant_email)}
                      onChange={(e) => toggleEmailSelection(sub.applicant_email, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                    />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onViewDetail(sub)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#333]">{sub.applicant_name}</p>
                          <p className="text-sm text-gray-500">{sub.applicant_email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                          {sub.admin_notes && (
                            <span className="text-xs text-[#8B5CF6]">Has notes</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <ScheduleInterviewModal
          test={test}
          selectedEmails={selectedEmails}
          submissions={submissions}
          onClose={() => setShowScheduleModal(false)}
          getAuthHeader={getAuthHeader}
        />
      )}
    </motion.div>,
    document.body
  );
}

// Schedule Interview Modal
function ScheduleInterviewModal({ test, selectedEmails, submissions, onClose, getAuthHeader }) {
  const [sending, setSending] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [timezone, setTimezone] = useState("Central Time (CT)");
  const [subject, setSubject] = useState(`Interview Scheduling - ${test.name}`);
  
  // Get saved dates or use defaults
  const getSavedDates = () => {
    const saved = localStorage.getItem('thrifty_scheduling_dates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Initialize dates - use saved or default to next 7 days
  const [dateStart, setDateStart] = useState(() => {
    const saved = getSavedDates();
    if (saved?.start) return saved.start;
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  
  const [dateEnd, setDateEnd] = useState(() => {
    const saved = getSavedDates();
    if (saved?.end) return saved.end;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
  });

  // Save dates when they change
  const saveDates = (start, end) => {
    localStorage.setItem('thrifty_scheduling_dates', JSON.stringify({ start, end }));
  };

  const handleDateStartChange = (value) => {
    setDateStart(value);
    saveDates(value, dateEnd);
  };

  const handleDateEndChange = (value) => {
    setDateEnd(value);
    saveDates(dateStart, value);
  };
  
  // Built-in default message
  const BUILT_IN_DEFAULT = `Thank you for completing our skills assessment! We were impressed with your work and would like to schedule a video interview with you.

Please click the link in this email to select your available times from the date range below.

IMPORTANT - Time Zone:
Select your times in Philippine Time (PHT). The system will automatically convert to our time (Central Time).

We look forward to speaking with you!`;

  // Get the saved custom default or fall back to built-in
  const getDefaultMessage = () => {
    const saved = localStorage.getItem('thrifty_scheduling_default_message');
    return saved || BUILT_IN_DEFAULT;
  };

  const [message, setMessage] = useState(getDefaultMessage());

  // Save current message as the new default
  const saveAsDefault = () => {
    localStorage.setItem('thrifty_scheduling_default_message', message);
    toast.success("Message saved as your default!");
  };

  // Reset to built-in default
  const resetToBuiltIn = () => {
    setMessage(BUILT_IN_DEFAULT);
    localStorage.removeItem('thrifty_scheduling_default_message');
    toast.success("Reset to original default");
  };

  // Format date for display without timezone issues
  const formatDateForEmail = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleSend = async () => {
    if (!dateStart || !dateEnd) {
      toast.error("Please select a date range");
      return;
    }

    setSending(true);
    try {
      const response = await axios.post(
        `${API}/api/applicant-tests/${test.id}/send-interview-followup`,
        {
          applicant_emails: selectedEmails,
          subject,
          message,
          meeting_link: meetingLink,
          date_range_start: formatDateForEmail(dateStart),
          date_range_end: formatDateForEmail(dateEnd),
          timezone
        },
        getAuthHeader()
      );

      toast.success(response.data.message);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const selectedApplicants = submissions.filter(s => selectedEmails.includes(s.applicant_email));

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 10001 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#8B5CF6]/10 to-[#00D4FF]/10">
          <div>
            <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
              <Video className="w-5 h-5 text-[#8B5CF6]" />
              Schedule Interviews
            </h2>
            <p className="text-sm text-gray-500">Send follow-up emails to {selectedEmails.length} applicant(s)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recipients Preview */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Recipients</Label>
            <div className="flex flex-wrap gap-2">
              {selectedApplicants.map(app => (
                <span 
                  key={app.applicant_email}
                  className="px-3 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-full text-sm"
                >
                  {app.applicant_name}
                </span>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Available From
              </Label>
              <Input
                type="date"
                value={dateStart}
                onChange={e => handleDateStartChange(e.target.value)}
                className="border-gray-300"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Available Until
              </Label>
              <Input
                type="date"
                value={dateEnd}
                onChange={e => handleDateEndChange(e.target.value)}
                className="border-gray-300"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              <Clock className="w-4 h-4 inline mr-1" />
              Your Timezone
            </Label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent bg-white"
            >
              <option value="Central Time (CT)">Central Time (CT) - Chicago</option>
              <option value="Pacific Time (PT)">Pacific Time (PT) - Los Angeles</option>
              <option value="Mountain Time (MT)">Mountain Time (MT) - Denver</option>
              <option value="Eastern Time (ET)">Eastern Time (ET) - New York</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Applicants in Philippines are 14 hours ahead of CT.
            </p>
          </div>

          {/* Meeting Link */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              <Link className="w-4 h-4 inline mr-1" />
              Meeting Link (Zoom, Google Meet, etc.) - Optional
            </Label>
            <Input
              type="url"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="border-gray-300"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can add this later once the interview is confirmed
            </p>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Subject
            </Label>
            <Input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="border-gray-300"
            />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">
                Message
              </Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveAsDefault}
                  className="text-xs text-green-600 hover:underline font-medium"
                >
                  Save as My Default
                </button>
                <button
                  type="button"
                  onClick={() => setMessage(getDefaultMessage())}
                  className="text-xs text-[#8B5CF6] hover:underline"
                >
                  Load My Default
                </button>
                <button
                  type="button"
                  onClick={resetToBuiltIn}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Reset to Original
                </button>
              </div>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent resize-none text-sm"
              placeholder="Enter your message..."
            />
            <p className="text-xs text-gray-500 mt-1">
              The email will include the date range and a link for applicants to select their available times.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !dateStart || !dateEnd}
            className="bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] text-white"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedEmails.length} Applicant(s)
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Submission Detail Modal
function SubmissionDetailModal({ submission, onClose, getAuthHeader }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState(submission.admin_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/submission/${submission.id}`, getAuthHeader());
      setDetail(response.data);
      setNotes(response.data.submission.admin_notes || "");
    } catch (error) {
      console.error("Failed to fetch submission detail:", error);
      toast.error("Failed to load submission");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const formData = new FormData();
      formData.append("notes", notes);
      
      await axios.patch(
        `${API}/api/applicant-tests/submission/${submission.id}/notes`,
        formData,
        {
          headers: {
            ...getAuthHeader().headers,
            "Content-Type": "multipart/form-data"
          }
        }
      );
      toast.success("Notes saved");
    } catch (error) {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#333]">{submission.applicant_name}&apos;s Submission</h2>
            <p className="text-sm text-gray-500">{submission.applicant_email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Responses by Item - handle both old (photos) and new (items) structure */}
              {(() => {
                // Determine items to display
                let displayItems = [];
                const responses = detail.submission.responses || {};
                
                // Check if we have the new items structure with actual photos in items
                if (detail.test.items && detail.test.items.length > 0 && detail.test.items[0].photos?.length > 0) {
                  displayItems = detail.test.items.map(item => ({
                    id: item.id,
                    photos: item.photos || [],
                    // Try item.id first, then first photo id as fallback
                    response: responses[item.id] || (item.photos?.[0] ? responses[item.photos[0].id] : {}) || {}
                  }));
                } else {
                  // Fall back to old structure - each photo is an item
                  displayItems = (detail.test.photos || []).map(photo => ({
                    id: photo.id,
                    photos: [photo],
                    response: responses[photo.id] || {}
                  }));
                }
                
                return displayItems.map((item, itemIndex) => {
                  const itemResponse = item.response;
                  const itemPhotos = item.photos || [];
                  
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 p-3 font-medium text-[#333]">
                        Item {itemIndex + 1}
                      </div>
                      <div className="p-4 grid md:grid-cols-2 gap-4">
                        {/* Photos */}
                        <div>
                          {itemPhotos.length > 0 ? (
                            <div className="space-y-2">
                              <img
                                src={`${API}/api/applicant-tests/public/photo/${detail.test.id}/${itemPhotos[0].filename}`}
                                alt={`Item ${itemIndex + 1}`}
                                className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                              />
                              {itemPhotos.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto">
                                  {itemPhotos.slice(1).map((photo, pIdx) => (
                                    <img
                                      key={photo.id}
                                      src={`${API}/api/applicant-tests/public/photo/${detail.test.id}/${photo.filename}`}
                                      alt={`Item ${itemIndex + 1} photo ${pIdx + 2}`}
                                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              No photos
                            </div>
                          )}
                        </div>
                        {/* Responses */}
                        <div className="space-y-2">
                          {detail.test.fields.map(field => (
                            <div key={field.id}>
                              <p className="text-xs text-gray-500">{field.name}</p>
                              <p className="text-sm text-[#333] whitespace-pre-wrap">
                                {itemResponse[field.id] || <span className="text-gray-400 italic">Not provided</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Admin Notes */}
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="mb-2 block">Admin Notes</Label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add your notes about this applicant..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none text-base focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                  rows={4}
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="mt-3 bg-[#8B5CF6] text-white h-12"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}


// Example listing for preview
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
  tags: "lululemon, polo shirt, softstreme, activewear, quiet luxury",
  category: "Clothing, Shoes & Accessories > Women > Women's Clothing > Activewear > Activewear Tops",
  us_size: "Small"
};

// Test Preview Modal - Shows exactly what applicants will see
function TestPreviewModal({ test, onClose }) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showExample, setShowExample] = useState(false);
  
  // Get items - support both old and new structure
  const items = (test.items && test.items.length > 0 && test.items[0].photos?.length > 0)
    ? test.items
    : (test.photos || []).map(photo => ({ id: photo.id, photos: [photo] }));
  
  const currentItem = items[currentItemIndex];
  const currentPhotos = currentItem?.photos || [];
  const currentPhoto = currentPhotos[selectedPhotoIndex];
  const progress = ((currentItemIndex + 1) / items.length) * 100;

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex flex-col"
      style={{ zIndex: 9999 }}
    >
      {/* Header - with safe area padding for iOS */}
      <header 
        className="bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/10 flex-shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">PREVIEW MODE</span>
                <h1 className="text-base font-bold text-white truncate">{test.name}</h1>
              </div>
              <p className="text-xs text-white/60">This is how applicants will see the test</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExample(!showExample)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                {showExample ? "Hide" : "Example"}
              </Button>
              <button 
                onClick={onClose} 
                className="text-white/80 hover:text-white p-2 -mr-2"
                data-testid="preview-close-btn"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/60 mt-1 text-center">
            Item {currentItemIndex + 1} of {items.length}
          </p>
        </div>
      </header>

      {/* Example Panel */}
      <AnimatePresence>
        {showExample && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200 overflow-hidden flex-shrink-0"
          >
            <div className="max-w-6xl mx-auto px-4 py-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-xs">
                  <h3 className="font-semibold text-yellow-800 mb-1">Example Listing</h3>
                  <p><span className="font-medium">Title:</span> {EXAMPLE_LISTING.title}</p>
                  <p className="mt-1"><span className="font-medium">Description:</span> {EXAMPLE_LISTING.description.substring(0, 100)}...</p>
                </div>
                <button onClick={() => setShowExample(false)} className="text-yellow-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Photo Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <h2 className="font-semibold text-[#333] flex items-center gap-2 text-sm">
                  <ImageIcon className="w-4 h-4 text-[#8B5CF6]" />
                  Product Photos ({currentPhotos.length} reference images)
                </h2>
              </div>
              <div className="p-3">
                {currentPhoto ? (
                  <img
                    src={`${API}/api/applicant-tests/public/photo/${test.id}/${currentPhoto.filename}`}
                    alt={`Product photo ${selectedPhotoIndex + 1}`}
                    className="w-full h-auto max-h-[280px] object-contain bg-gray-50 rounded-xl"
                  />
                ) : (
                  <div className="w-full h-[280px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    No photos
                  </div>
                )}
                {currentPhotos.length > 1 && (
                  <>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        onClick={() => setSelectedPhotoIndex(prev => Math.max(0, prev - 1))}
                        disabled={selectedPhotoIndex === 0}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-600">Photo {selectedPhotoIndex + 1} of {currentPhotos.length}</span>
                      <button
                        onClick={() => setSelectedPhotoIndex(prev => Math.min(currentPhotos.length - 1, prev + 1))}
                        disabled={selectedPhotoIndex === currentPhotos.length - 1}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto py-2 mt-2">
                      {currentPhotos.map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => setSelectedPhotoIndex(index)}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 ${
                            selectedPhotoIndex === index ? "border-[#8B5CF6]" : "border-gray-200"
                          }`}
                        >
                          <img
                            src={`${API}/api/applicant-tests/public/photo/${test.id}/${photo.filename}`}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form Preview */}
            <div className="bg-white rounded-2xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-100">
                <h2 className="font-semibold text-[#333] text-sm">Create Listing for Item {currentItemIndex + 1}</h2>
                <p className="text-xs text-gray-500">Fields applicants will fill out</p>
              </div>
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[350px]">
                {test.fields?.map(field => (
                  <div key={field.id}>
                    <Label className="flex items-center gap-1 text-xs">
                      {field.name}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === "textarea" ? (
                      <textarea
                        placeholder={field.placeholder}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none text-sm bg-gray-50"
                        rows={3}
                        disabled
                      />
                    ) : field.type === "select" ? (
                      <select
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                        disabled
                      >
                        <option>Select {field.name}...</option>
                      </select>
                    ) : (
                      <Input
                        placeholder={field.placeholder}
                        className="mt-1 text-sm bg-gray-50"
                        disabled
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Navigation */}
              <div className="p-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setCurrentItemIndex(prev => prev - 1); setSelectedPhotoIndex(0); }}
                  disabled={currentItemIndex === 0}
                  className="flex-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                {currentItemIndex === items.length - 1 ? (
                  <Button
                    disabled
                    className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white text-xs"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Submit All
                  </Button>
                ) : (
                  <Button
                    onClick={() => { setCurrentItemIndex(prev => prev + 1); setSelectedPhotoIndex(0); }}
                    className="flex-1 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white text-xs"
                  >
                    Next Item
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </motion.div>,
    document.body
  );
}


// Edit Test Modal - Edit test name, description, and fields
function EditTestModal({ test, onClose, onUpdated, getAuthHeader }) {
  const [name, setName] = useState(test.name || "");
  const [description, setDescription] = useState(test.description || "");
  const [fields, setFields] = useState(test.fields || []);
  const [saving, setSaving] = useState(false);

  const toggleField = (fieldId) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const toggleFieldRequired = (fieldId) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, required: !f.required } : f
    ));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a test name");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("fields", JSON.stringify(fields));

      await axios.put(`${API}/api/applicant-tests/${test.id}`, formData, {
        headers: {
          ...getAuthHeader().headers,
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Test updated successfully");
      onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update test");
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#333]">Edit Test</h2>
            <p className="text-sm text-gray-500">Update test settings</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Test Name */}
          <div>
            <Label className="text-sm font-medium block mb-2">Test Name *</Label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Listing Skills Assessment"
              className="w-full h-11 px-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium block mb-2">Description (optional)</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the test..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Test Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#333] mb-2">Test Content</h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                {test.items?.length || test.photos?.length || 0} {test.items?.length > 0 ? 'items' : 'photos'}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {test.invites_sent || 0} invites sent
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {test.submissions_count || 0} submissions
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: To change photos or items, create a new test.
            </p>
          </div>

          {/* Fields Configuration */}
          <div>
            <Label className="text-sm font-medium block mb-2">Listing Fields</Label>
            <p className="text-xs text-gray-500 mb-3">Toggle fields on/off and set which are required.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {fields.map(field => (
                <div
                  key={field.id}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    field.enabled !== false
                      ? "bg-[#8B5CF6]/10 border-2 border-[#8B5CF6]/30" 
                      : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                  }`}
                  onClick={() => toggleField(field.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      field.enabled !== false ? "bg-[#8B5CF6] text-white" : "bg-gray-200"
                    }`}>
                      {field.enabled !== false && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <span className={`text-sm font-medium ${field.enabled !== false ? "text-[#333]" : "text-gray-400"}`}>
                      {field.name}
                    </span>
                  </div>
                  {field.enabled !== false && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFieldRequired(field.id);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        field.required 
                          ? "bg-[#8B5CF6] text-white" 
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {field.required ? "Required" : "Optional"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}


// Interview Inbox Modal
function InterviewInboxModal({ onClose, getAuthHeader }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSendLinkModal, setShowSendLinkModal] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/interview-inbox`, getAuthHeader());
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch interview requests:", error);
      toast.error("Failed to load interview inbox");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this interview request? This cannot be undone.")) return;
    
    try {
      await axios.delete(`${API}/api/applicant-tests/interview-inbox/${requestId}`, getAuthHeader());
      toast.success("Interview request deleted");
      // Remove from local state
      setRequests(requests.filter(r => r.id !== requestId));
      // Clear selection if deleted item was selected
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (error) {
      toast.error("Failed to delete interview request");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "responded":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Responded</span>;
      case "confirmed":
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Sent</span>;
      case "scheduled":
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Scheduled</span>;
      case "needs_reschedule":
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Needs Reschedule</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>;
    }
  };

  // Get scheduled (draft) interviews for the summary view
  const scheduledInterviews = requests.filter(r => r.status === 'scheduled');
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  const handleSendAllScheduled = async () => {
    if (!window.confirm(`Send meeting confirmations to ${scheduledInterviews.length} applicant(s)?`)) return;
    
    setSendingAll(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const interview of scheduledInterviews) {
      try {
        await axios.post(
          `${API}/api/applicant-tests/interview-inbox/${interview.id}/send-scheduled`,
          {},
          getAuthHeader()
        );
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    setSendingAll(false);
    if (successCount > 0) {
      toast.success(`Sent ${successCount} meeting confirmation(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} confirmation(s)`);
    }
    fetchRequests();
  };

  const handleSendSingleScheduled = async (interviewId) => {
    try {
      await axios.post(
        `${API}/api/applicant-tests/interview-inbox/${interviewId}/send-scheduled`,
        {},
        getAuthHeader()
      );
      toast.success("Meeting confirmation sent!");
      fetchRequests();
    } catch (error) {
      toast.error("Failed to send confirmation");
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#8B5CF6]/10 to-[#00D4FF]/10">
          <div>
            <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
              <Inbox className="w-5 h-5 text-[#8B5CF6]" />
              Interview Inbox
            </h2>
            <p className="text-sm text-gray-500">View and respond to applicant availability</p>
          </div>
          <div className="flex items-center gap-3">
            {scheduledInterviews.length > 0 && (
              <Button
                onClick={() => setShowScheduledModal(true)}
                variant="outline"
                className="border-purple-400 text-purple-600 hover:bg-purple-50"
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Review Scheduled ({scheduledInterviews.length})
              </Button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scheduled Interviews Modal - Separate Popup */}
        {showScheduledModal && scheduledInterviews.length > 0 && ReactDOM.createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
            style={{ zIndex: 10001 }}
            onClick={() => setShowScheduledModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Review Scheduled Interviews
                    </h2>
                    <p className="text-purple-200 text-sm mt-1">
                      Review all times before sending confirmations
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowScheduledModal(false)} 
                    className="text-white/80 hover:text-white p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {scheduledInterviews.map(interview => (
                    <div key={interview.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-[#333] text-lg">{interview.applicant_name}</p>
                          
                          {/* CT Time - Primary */}
                          <div className="mt-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs text-blue-600 font-medium mb-1">Your Time (Central)</p>
                            <p className="text-blue-800 font-bold text-lg">
                              {interview.scheduled_datetime_ct || 'Not available'}
                            </p>
                          </div>
                          
                          {/* PHT Time - Secondary */}
                          <p className="text-sm text-gray-500 mt-2">
                            PHT: {interview.scheduled_datetime}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleSendSingleScheduled(interview.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                          <button
                            onClick={(e) => handleDelete(interview.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {scheduledInterviews.length} interview{scheduledInterviews.length !== 1 ? 's' : ''} ready to send
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowScheduledModal(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleSendAllScheduled}
                    disabled={sendingAll}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {sendingAll ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send All ({scheduledInterviews.length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}

        <div className="flex-1 overflow-hidden flex">
          {/* Request List */}
          <div className={`${selectedRequest ? 'hidden md:block md:w-1/3' : 'w-full'} border-r border-gray-200 overflow-y-auto`}>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No interview requests yet</p>
                <p className="text-sm text-gray-400 mt-1">Send a scheduling email to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {requests.map(req => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedRequest?.id === req.id ? 'bg-[#8B5CF6]/5 border-l-4 border-[#8B5CF6]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#333] truncate">{req.applicant_name}</p>
                        <p className="text-sm text-gray-500 truncate">{req.applicant_email}</p>
                        <p className="text-xs text-gray-400 mt-1">{req.test_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(req.status)}
                          <button
                            onClick={(e) => handleDelete(req.id, e)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {req.applicant_response && (
                          <span className="text-xs text-green-600">
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            Reply
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request Detail */}
          {selectedRequest && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Back button for mobile */}
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="md:hidden mb-4 text-[#8B5CF6] text-sm flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to list
                </button>

                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#333]">{selectedRequest.applicant_name}</h3>
                    <p className="text-sm text-gray-500">{selectedRequest.applicant_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedRequest.status)}
                    <button
                      onClick={(e) => handleDelete(selectedRequest.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete this request"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Interview Details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h4 className="font-medium text-[#333] mb-3">Interview Request Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Test:</span>
                      <span className="text-[#333]">{selectedRequest.test_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date Range:</span>
                      <span className="text-[#333]">{selectedRequest.date_range_start} - {selectedRequest.date_range_end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Timezone:</span>
                      <span className="text-[#333]">{selectedRequest.timezone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sent:</span>
                      <span className="text-[#333]">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Applicant Response */}
                {selectedRequest.applicant_response ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Applicant&apos;s Available Times
                    </h4>
                    
                    {/* Display converted time slots if available */}
                    {selectedRequest.applicant_response.time_slots && selectedRequest.applicant_response.time_slots.length > 0 ? (
                      <div className="space-y-3 mb-3">
                        {selectedRequest.applicant_response.time_slots.map((slot, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-green-100">
                            {/* CT Time - Primary */}
                            <div className="bg-blue-50 rounded-lg p-2 mb-2 border border-blue-100">
                              <p className="text-xs text-blue-600 font-medium">Your Time (Central)</p>
                              <p className="text-blue-800 font-bold">
                                {slot.start_time_ct}
                                {slot.end_time_ct && ` - ${slot.end_time_ct.split(', ').pop()}`}
                              </p>
                            </div>
                            {/* PHT Time - Secondary */}
                            <p className="text-xs text-gray-500">
                              PHT: {slot.date} at {slot.start_time_pht}
                              {slot.end_time_pht && ` - ${slot.end_time_pht}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Fallback to plain text display */
                      <div className="bg-white rounded-lg p-3 mb-3">
                        <p className="text-[#333] whitespace-pre-wrap">{selectedRequest.applicant_response.availability}</p>
                      </div>
                    )}
                    
                    {selectedRequest.applicant_response.notes && (
                      <div className="text-sm text-gray-600 bg-white rounded-lg p-3">
                        <p className="font-medium text-gray-700">Additional Notes:</p>
                        <p>{selectedRequest.applicant_response.notes}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-3">
                      Responded: {new Date(selectedRequest.applicant_response.responded_at).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <p className="text-yellow-800 text-sm">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Waiting for applicant to respond with their availability
                    </p>
                  </div>
                )}

                {/* Confirmed Meeting Info */}
                {selectedRequest.status === "confirmed" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <h4 className="font-medium text-blue-800 mb-2">Meeting Confirmed</h4>
                    <p className="text-blue-700">{selectedRequest.confirmed_datetime}</p>
                    <a 
                      href={selectedRequest.meeting_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm flex items-center gap-1 mt-2 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {selectedRequest.meeting_link}
                    </a>
                  </div>
                )}

                {/* Message History - Show if admin sent a message requesting different times */}
                {selectedRequest.message_sent && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                    <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message Sent
                    </h4>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{selectedRequest.message_sent}</p>
                    </div>
                    {selectedRequest.message_sent_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Sent: {new Date(selectedRequest.message_sent_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {selectedRequest.applicant_response && selectedRequest.status !== "confirmed" && (
                  <Button
                    onClick={() => setShowSendLinkModal(selectedRequest)}
                    className="w-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Send Meeting Link
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Send Meeting Link Modal */}
      {showSendLinkModal && (
        <SendMeetingLinkModal
          request={showSendLinkModal}
          onClose={() => setShowSendLinkModal(null)}
          onSent={() => {
            setShowSendLinkModal(null);
            fetchRequests();
            setSelectedRequest(null);
          }}
          getAuthHeader={getAuthHeader}
        />
      )}
    </motion.div>,
    document.body
  );
}

// Send Meeting Link Modal
function SendMeetingLinkModal({ request, onClose, onSent, getAuthHeader }) {
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [specificTime, setSpecificTime] = useState("");
  const [customDateTime, setCustomDateTime] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [messageOnly, setMessageOnly] = useState(false); // New: send message without meeting link
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [loadingConflicts, setLoadingConflicts] = useState(true);

  // Get saved meeting link from localStorage
  const getSavedMeetingLink = () => localStorage.getItem('thrifty_default_meeting_link') || "";
  const [meetingLink, setMeetingLink] = useState(getSavedMeetingLink());

  // Save meeting link as default
  const saveMeetingLink = () => {
    if (meetingLink.trim()) {
      localStorage.setItem('thrifty_default_meeting_link', meetingLink.trim());
      toast.success("Meeting link saved as default!");
    }
  };

  // Add minutes to a time string (HH:MM format)
  const addMinutesToTime = (time, mins) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + mins;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    const period = newHours >= 12 ? 'PM' : 'AM';
    const hours12 = newHours % 12 || 12;
    return `${hours12}:${String(newMins).padStart(2, '0')} ${period}`;
  };

  // Format time for display (24h to 12h)
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Convert PHT time to Central Time
  const convertPHTtoCT = (date, time) => {
    if (!date || !time) return null;
    // Handle both "HH:MM" and "HHMM" formats
    let normalizedTime = time;
    if (time && !time.includes(':') && time.length === 4) {
      normalizedTime = `${time.slice(0,2)}:${time.slice(2,4)}`;
    }
    const phtString = `${date}T${normalizedTime}:00+08:00`;
    const utcDate = new Date(phtString);
    if (isNaN(utcDate.getTime())) return null;
    return utcDate.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get the full Central Time datetime string for the selected meeting time
  const getConfirmedDateTimeCT = () => {
    if (useCustom || !selectedSlot || !specificTime) return "";
    const startCT = convertPHTtoCT(selectedSlot.date, specificTime);
    // Calculate end time (30 mins later)
    const [hours, mins] = specificTime.split(':').map(Number);
    const endMins = mins + 30;
    const endHours = hours + Math.floor(endMins / 60);
    const endTime = `${String(endHours % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    const endCT = convertPHTtoCT(selectedSlot.date, endTime);
    if (startCT && endCT) {
      // Extract just the time part from endCT for cleaner display
      const endTimePart = endCT.split(', ').pop();
      return `${startCT} - ${endTimePart} CT`;
    }
    return startCT || "";
  };

  // Check if a time range crosses midnight (overnight)
  const isOvernight = (startTime, endTime) => {
    if (!startTime || !endTime) return false;
    const start = startTime.includes(':') ? startTime : `${startTime.slice(0,2)}:${startTime.slice(2,4)}`;
    const end = endTime.includes(':') ? endTime : `${endTime.slice(0,2)}:${endTime.slice(2,4)}`;
    const [startH] = start.split(':').map(Number);
    const [endH] = end.split(':').map(Number);
    return endH < startH; // End hour is less than start hour = crosses midnight
  };

  // Get the next day's date string
  const getNextDay = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  // Convert PHT time to CT, handling overnight slots
  const convertPHTtoCTWithDate = (date, time, isEndOfOvernight = false) => {
    if (!date || !time) return null;
    const actualDate = isEndOfOvernight ? getNextDay(date) : date;
    return convertPHTtoCT(actualDate, time);
  };

  // Generate 30-minute time slots from an availability window (handles overnight)
  const generate30MinSlots = (startTime, endTime, baseDate) => {
    if (!startTime || !endTime || !baseDate) return [];
    const slots = [];
    
    // Parse start and end times (handle both HH:MM and HHMM formats)
    let start = startTime.includes(':') ? startTime : `${startTime.slice(0,2)}:${startTime.slice(2,4)}`;
    let end = endTime.includes(':') ? endTime : `${endTime.slice(0,2)}:${endTime.slice(2,4)}`;
    
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    // Validate parsed values
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return [];
    
    let currentMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Handle overnight: if end < start, add 24 hours to end
    if (endMinutes <= currentMinutes) {
      endMinutes += 24 * 60;
    }
    
    // Limit to prevent too many slots (max 12 hours = 24 slots)
    const maxSlots = 24;
    let slotCount = 0;
    
    // Generate slots until we can't fit another 30-min meeting
    while (currentMinutes + 30 <= endMinutes && slotCount < maxSlots) {
      const slotStartH = Math.floor(currentMinutes / 60) % 24;
      const slotStartM = currentMinutes % 60;
      const slotEndH = Math.floor((currentMinutes + 30) / 60) % 24;
      const slotEndM = (currentMinutes + 30) % 60;
      
      // Determine if this slot is on the next day
      const startsNextDay = currentMinutes >= 24 * 60;
      const endsNextDay = (currentMinutes + 30) >= 24 * 60;
      
      slots.push({
        start: `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`,
        end: `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`,
        startDate: startsNextDay ? getNextDay(baseDate) : baseDate,
        endDate: endsNextDay ? getNextDay(baseDate) : baseDate
      });
      
      currentMinutes += 30; // Move to next 30-min slot
      slotCount++;
    }
    
    return slots;
  };

  // Get the time slots from the applicant's response
  const timeSlots = request.applicant_response?.time_slots || [];

  // Fetch existing confirmed interviews to check for conflicts
  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      const response = await axios.get(`${API}/api/applicant-tests/interview-inbox`, getAuthHeader());
      const confirmedInterviews = (response.data.requests || [])
        .filter(r => r.status === 'confirmed' && r.id !== request.id)
        .map(r => ({
          id: r.id,
          name: r.applicant_name,
          datetime: r.confirmed_datetime,
          date: r.applicant_response?.time_slots?.[0]?.date
        }));
      setConflicts(confirmedInterviews);
    } catch (error) {
      console.error("Failed to fetch conflicts:", error);
    } finally {
      setLoadingConflicts(false);
    }
  };

  // Check if a slot conflicts with existing confirmed interviews
  const checkConflict = (slot) => {
    if (!slot || conflicts.length === 0) return null;
    
    // Simple date-based conflict check
    const slotDate = slot.date;
    const conflicting = conflicts.find(c => {
      // Check if same date
      if (c.date === slotDate) return true;
      // Check if datetime contains the date
      if (c.datetime && c.datetime.includes(slotDate)) return true;
      return false;
    });
    
    return conflicting;
  };

  const getConfirmedDateTime = () => {
    if (useCustom) return customDateTime;
    if (!selectedSlot || !specificTime) return "";
    
    // Format: "Tuesday, January 21, 2026 at 9:00 AM - 9:30 AM PHT"
    const date = new Date(selectedSlot.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const startTime12h = formatTime12h(specificTime);
    const endTime12h = addMinutesToTime(specificTime, 30);
    return `${dateStr} at ${startTime12h} - ${endTime12h} PHT`;
  };

  const handleSchedule = async () => {
    // Validation
    const confirmedDateTime = getConfirmedDateTime();
    const confirmedDateTimeCT = getConfirmedDateTimeCT();
    
    if (!confirmedDateTime.trim()) {
      if (selectedSlot && !specificTime) {
        toast.error("Please enter the specific meeting time within the selected window");
      } else {
        toast.error("Please select or enter the confirmed date and time");
      }
      return;
    }
    if (!meetingLink.trim()) {
      toast.error("Please enter the Google Meet link");
      return;
    }

    setScheduling(true);
    try {
      await axios.post(
        `${API}/api/applicant-tests/interview-inbox/${request.id}/schedule`,
        {
          scheduled_datetime: confirmedDateTime,
          scheduled_datetime_ct: confirmedDateTimeCT,
          meeting_link: meetingLink
        },
        getAuthHeader()
      );
      toast.success("Interview scheduled! Check the 'Review Scheduled' button to review and send.");
      onSent();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to schedule");
    } finally {
      setScheduling(false);
    }
  };

  const handleSend = async () => {
    // Message-only mode validation
    if (messageOnly) {
      if (!additionalMessage.trim()) {
        toast.error("Please enter a message to send");
        return;
      }
    } else {
      // Meeting confirmation mode validation
      const confirmedDateTime = getConfirmedDateTime();
      
      if (!confirmedDateTime.trim()) {
        if (selectedSlot && !specificTime) {
          toast.error("Please enter the specific meeting time within the selected window");
        } else {
          toast.error("Please select or enter the confirmed date and time");
        }
        return;
      }
      if (!meetingLink.trim()) {
        toast.error("Please enter the Google Meet link");
        return;
      }
    }

    setSending(true);
    try {
      if (messageOnly) {
        // Send message-only (request different times)
        await axios.post(
          `${API}/api/applicant-tests/interview-inbox/${request.id}/send-message`,
          {
            message: additionalMessage
          },
          getAuthHeader()
        );
        toast.success("Message sent to applicant!");
      } else {
        // Send meeting confirmation
        await axios.post(
          `${API}/api/applicant-tests/interview-inbox/${request.id}/send-meeting-link`,
          {
            confirmed_datetime: getConfirmedDateTime(),
            confirmed_datetime_ct: getConfirmedDateTimeCT(),
            meeting_link: meetingLink,
            additional_message: additionalMessage
          },
          getAuthHeader()
        );
        toast.success("Meeting confirmation sent!");
      }
      onSent();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 10001 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#10B981]/10 to-[#059669]/10">
          <h2 className="text-lg font-bold text-[#333] flex items-center gap-2">
            <Video className="w-5 h-5 text-[#10B981]" />
            {messageOnly ? 'Send Message' : 'Send Meeting Confirmation'}
          </h2>
          <p className="text-sm text-gray-500">to {request.applicant_name}</p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Mode Toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <button
              type="button"
              onClick={() => setMessageOnly(false)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                !messageOnly 
                  ? 'bg-[#10B981] text-white' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Confirm Meeting
            </button>
            <button
              type="button"
              onClick={() => setMessageOnly(true)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                messageOnly 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Request Different Times
            </button>
          </div>

          {messageOnly ? (
            /* Message Only Mode */
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Use this if the applicant&apos;s times don&apos;t work. Your message will be sent without a meeting link.
                </p>
              </div>

              {/* Show their availability for reference */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700 mb-1">Their Submitted Availability:</p>
                <p className="text-gray-600 whitespace-pre-wrap text-xs">{request.applicant_response?.availability}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your Message *
                </Label>
                <textarea
                  value={additionalMessage}
                  onChange={e => setAdditionalMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                  placeholder="Hi! Unfortunately, the times you provided don't work with our schedule due to the timezone difference. Could you please provide some alternative times? We're looking for times that fall within [dates] in Central Time..."
                />
              </div>
            </div>
          ) : (
            /* Meeting Confirmation Mode */
            <>
              {/* Applicant's Availability Blocks */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Applicant&apos;s Available Windows
                </Label>
            
            {timeSlots.length > 0 ? (
              <div className="space-y-2 mb-4">
                {timeSlots.map((slot, idx) => {
                  const conflict = checkConflict(slot);
                  const isSelected = selectedSlot === slot;
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setUseCustom(false);
                      }}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-[#10B981] bg-[#10B981]/10' 
                          : conflict 
                            ? 'border-orange-300 bg-orange-50' 
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-[#333] text-sm">
                            {new Date(slot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                          {/* CT Time - Primary */}
                          <div className="bg-blue-50 rounded px-2 py-1 mt-1 inline-block">
                            <p className="text-sm text-blue-800 font-semibold">
                              CT: {convertPHTtoCT(slot.date, slot.start_time_pht)?.split(', ').slice(-1)[0]} - {convertPHTtoCTWithDate(slot.date, slot.end_time_pht, isOvernight(slot.start_time_pht, slot.end_time_pht))?.split(', ').pop()}
                            </p>
                          </div>
                          {/* PHT Time - Secondary */}
                          <p className="text-xs text-gray-500 mt-1">
                            PHT: {slot.start_time_pht} - {slot.end_time_pht}
                            {isOvernight(slot.start_time_pht, slot.end_time_pht) && <span className="text-orange-500 ml-1">(overnight)</span>}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-[#10B981]" />
                        )}
                      </div>
                      {conflict && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle className="w-3 h-3" />
                          Conflict: {conflict.name} already scheduled on this date
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
                <p className="font-medium text-gray-700 mb-1">Applicant&apos;s Availability:</p>
                <p className="text-gray-600 whitespace-pre-wrap">{request.applicant_response?.availability}</p>
              </div>
            )}
          </div>

          {/* Specific Meeting Time */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Confirm 30-Minute Meeting Time *
            </Label>
            {selectedSlot && !useCustom ? (
              <div className="space-y-2">
                <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg p-3">
                  <p className="text-sm text-[#10B981] font-medium">
                    Selected: {new Date(selectedSlot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {isOvernight(selectedSlot.start_time_pht, selectedSlot.end_time_pht) && <span className="text-orange-500 ml-1">(overnight into next day)</span>}
                  </p>
                  {/* CT Time - Primary */}
                  <p className="text-sm text-blue-700 font-semibold mt-1">
                    CT: {convertPHTtoCT(selectedSlot.date, selectedSlot.start_time_pht)?.split(', ').slice(-1)[0]} - {convertPHTtoCTWithDate(selectedSlot.date, selectedSlot.end_time_pht, isOvernight(selectedSlot.start_time_pht, selectedSlot.end_time_pht))?.split(', ').pop()}
                  </p>
                  {/* PHT Time - Secondary */}
                  <p className="text-xs text-gray-500 mt-1">
                    PHT: {selectedSlot.start_time_pht} - {selectedSlot.end_time_pht}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Select a 30-minute time slot:</label>
                  {(() => {
                    const slots = generate30MinSlots(selectedSlot.start_time_pht, selectedSlot.end_time_pht, selectedSlot.date);
                    if (slots.length === 0) {
                      return (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                          <p className="text-sm text-orange-700">
                            Unable to generate time slots. Please use custom time entry below.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {slots.map((slot, idx) => {
                            const isSelected = specificTime === slot.start;
                            const slotCT = convertPHTtoCT(slot.startDate, slot.start);
                            const slotEndCT = convertPHTtoCT(slot.endDate, slot.end)?.split(', ').pop();
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSpecificTime(slot.start)}
                                className={`p-2 rounded-lg border-2 text-left transition-all ${
                                  isSelected 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                              >
                                {/* CT Time - Primary */}
                                <p className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-blue-600'}`}>
                                  {slotCT?.split(', ').slice(-1)[0]} - {slotEndCT}
                                </p>
                                {/* PHT Time - Secondary */}
                                <p className={`text-xs ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
                                  PHT: {formatTime12h(slot.start)} - {formatTime12h(slot.end)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                        {slots.length >= 24 && (
                          <p className="text-xs text-orange-600 mt-2">Showing first 24 slots. Use custom time for later times.</p>
                        )}
                      </>
                    );
                  })()}
                  {specificTime && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">Selected Meeting Time:</p>
                      {/* CT Time - Primary */}
                      <p className="text-sm text-blue-800 font-bold">
                        CT: {getConfirmedDateTimeCT()}
                      </p>
                      {/* PHT Time - Secondary */}
                      <p className="text-xs text-gray-500">
                        PHT: {formatTime12h(specificTime)} - {addMinutesToTime(specificTime, 30)}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Or enter completely custom time
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={customDateTime}
                  onChange={e => {
                    setCustomDateTime(e.target.value);
                    setUseCustom(true);
                  }}
                  placeholder="e.g., Tuesday, January 21, 2026 at 9:00 AM PHT"
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500">Enter the full date and time in Philippine Time (PHT)</p>
                {selectedSlot && (
                  <button
                    type="button"
                    onClick={() => setUseCustom(false)}
                    className="text-xs text-[#8B5CF6] hover:underline"
                  >
                    ← Back to selected window
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Conflict Warning Summary */}
          {!loadingConflicts && conflicts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {conflicts.length} other interview{conflicts.length > 1 ? 's' : ''} already confirmed
              </p>
              <div className="mt-1 text-xs text-orange-600">
                {conflicts.slice(0, 3).map((c, i) => (
                  <span key={i}>{c.name}{i < Math.min(conflicts.length, 3) - 1 ? ', ' : ''}</span>
                ))}
                {conflicts.length > 3 && <span> +{conflicts.length - 3} more</span>}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">
                Google Meet Link *
              </Label>
              {meetingLink.trim() && meetingLink !== getSavedMeetingLink() && (
                <button
                  type="button"
                  onClick={saveMeetingLink}
                  className="text-xs text-green-600 hover:underline font-medium"
                >
                  Save as Default
                </button>
              )}
              {meetingLink === getSavedMeetingLink() && meetingLink.trim() && (
                <span className="text-xs text-gray-400">✓ Using saved link</span>
              )}
            </div>
            <Input
              type="url"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="border-gray-300"
            />
            {!meetingLink.trim() && getSavedMeetingLink() && (
              <button
                type="button"
                onClick={() => setMeetingLink(getSavedMeetingLink())}
                className="text-xs text-[#8B5CF6] hover:underline mt-1"
              >
                Use saved link: {getSavedMeetingLink().substring(0, 35)}...
              </button>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Additional Message (Optional)
            </Label>
            <textarea
              value={additionalMessage}
              onChange={e => setAdditionalMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent resize-none text-sm"
              placeholder="Any additional instructions or notes..."
            />
          </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={sending || scheduling}>
            Cancel
          </Button>
          {!messageOnly && (
            <Button
              onClick={handleSchedule}
              disabled={scheduling || sending || ((!selectedSlot || !specificTime) && !customDateTime) || !meetingLink}
              variant="outline"
              className="border-purple-400 text-purple-600 hover:bg-purple-50"
            >
              {scheduling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule (Review Later)
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={sending || scheduling || (messageOnly ? !additionalMessage.trim() : (((!selectedSlot || !specificTime) && !customDateTime) || !meetingLink))}
            className={messageOnly ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" : "bg-gradient-to-r from-[#10B981] to-[#059669] text-white"}
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Sending...
              </>
            ) : messageOnly ? (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Now
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
