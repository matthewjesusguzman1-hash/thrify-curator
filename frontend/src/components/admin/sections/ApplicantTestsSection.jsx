import { useState, useEffect, useRef } from "react";
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
  Image as ImageIcon
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

export default function ApplicantTestsSection({ getAuthHeader }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(null);
  const [showSubmissionDetail, setShowSubmissionDetail] = useState(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#8B5CF6]" />
            Applicant Skills Tests
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create listing tests to evaluate job applicants
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Tests List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5CF6] mx-auto" />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tests created yet</p>
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
    </div>
  );
}

// Test Card Component
function TestCard({ test, onDelete, onInvite, onViewSubmissions, getAuthHeader }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-[#333] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8B5CF6]" />
            {test.name}
          </h3>
          {test.description && (
            <p className="text-sm text-gray-500 mt-1">{test.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              {test.photos?.length || 0} photos
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {test.invites_sent || 0} invites
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {test.submissions_count || 0} submissions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewSubmissions}
            className="text-[#8B5CF6] border-[#8B5CF6]/30"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onInvite}
            className="text-[#00D4FF] border-[#00D4FF]/30"
          >
            <Send className="w-4 h-4 mr-1" />
            Invite
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-500 border-red-300 hover:bg-red-50"
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
  const [creating, setCreating] = useState(false);

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#333]">Create Skills Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Test Name */}
          <div>
            <Label className="text-base font-medium">Test Name *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Listing Skills Assessment"
              className="mt-2 h-12 text-base"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-base font-medium">Description (optional)</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the test..."
              className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg resize-none text-base"
              rows={2}
            />
          </div>

          {/* Photos */}
          <div>
            <Label className="flex items-center justify-between text-base font-medium">
              <span>Product Photos *</span>
              <span className="text-sm text-gray-500 font-normal">{photos.length} selected</span>
            </Label>
            
            {/* File input - visible as a label */}
            <label className="mt-3 block border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-colors active:bg-[#8B5CF6]/10">
              <input
                type="file"
                onChange={handlePhotoSelect}
                accept="image/*"
                multiple
                className="sr-only"
              />
              <div className="text-center">
                <Upload className="w-12 h-12 text-[#8B5CF6] mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#333] mb-2">Tap here to select photos</p>
                <p className="text-sm text-gray-500">JPG, PNG up to 10MB each</p>
              </div>
            </label>
            
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fields Configuration */}
          <div>
            <Label>Listing Fields</Label>
            <p className="text-sm text-gray-500 mb-3">Tap to enable/disable fields. Toggle "Required" for mandatory fields.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {fields.map(field => (
                <div
                  key={field.id}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                    field.enabled 
                      ? "bg-[#8B5CF6]/10 border-2 border-[#8B5CF6]/30" 
                      : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                  }`}
                  onClick={() => toggleField(field.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      field.enabled ? "bg-[#8B5CF6] text-white" : "bg-gray-200"
                    }`}>
                      {field.enabled && <CheckCircle className="w-4 h-4" />}
                    </div>
                    <span className={`text-base font-medium ${field.enabled ? "text-[#333]" : "text-gray-400"}`}>
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
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
    </motion.div>
  );
}

// Invite Modal
function InviteModal({ test, onClose, getAuthHeader }) {
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
            <h2 className="text-xl font-bold text-[#333]">Send Invite</h2>
            <p className="text-sm text-gray-500">{test.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Send New Invite */}
          <div className="space-y-4">
            <div>
              <Label>Applicant Name *</Label>
              <Input
                value={applicantName}
                onChange={e => setApplicantName(e.target.value)}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Applicant Email *</Label>
              <Input
                type="email"
                value={applicantEmail}
                onChange={e => setApplicantEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSendInvite}
              disabled={sending}
              className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </div>

          {/* Previous Invites */}
          <div>
            <h3 className="font-medium text-[#333] mb-3">Sent Invites</h3>
            {loadingInvites ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8B5CF6] mx-auto" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No invites sent yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {invites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-[#333]">{invite.applicant_name}</p>
                      <p className="text-xs text-gray-500">{invite.applicant_email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      invite.status === "completed" 
                        ? "bg-green-100 text-green-700"
                        : invite.status === "started"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {invite.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Submissions Modal
function SubmissionsModal({ test, onClose, onViewDetail, getAuthHeader }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
            <div className="space-y-3">
              {submissions.map(sub => (
                <div
                  key={sub.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
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
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
            <h2 className="text-xl font-bold text-[#333]">{submission.applicant_name}'s Submission</h2>
            <p className="text-sm text-gray-500">{submission.applicant_email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
              {/* Responses by Photo */}
              {detail.test.photos.map((photo, photoIndex) => {
                const photoResponse = detail.submission.responses?.[photo.id] || {};
                return (
                  <div key={photo.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 p-3 font-medium text-[#333]">
                      Item {photoIndex + 1}
                    </div>
                    <div className="p-4 grid md:grid-cols-2 gap-4">
                      {/* Photo */}
                      <div>
                        <img
                          src={`${API}/api/applicant-tests/public/photo/${detail.test.id}/${photo.filename}`}
                          alt={`Item ${photoIndex + 1}`}
                          className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                        />
                      </div>
                      {/* Responses */}
                      <div className="space-y-2">
                        {detail.test.fields.map(field => (
                          <div key={field.id}>
                            <p className="text-xs text-gray-500">{field.name}</p>
                            <p className="text-sm text-[#333]">
                              {photoResponse[field.id] || <span className="text-gray-400 italic">Not provided</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Admin Notes */}
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="mb-2 block">Admin Notes</Label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add your notes about this applicant..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={4}
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="mt-3 bg-[#8B5CF6] text-white"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
