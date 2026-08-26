import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mail, Users, CheckCircle, Clock, X, ChevronDown, 
  FileText, UserPlus, Loader2, ExternalLink, Trash2, User,
  Globe, Briefcase, MailCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Field options that can be toggled
const FIELD_OPTIONS = [
  { id: "phone", label: "Phone Number", default: false, onboardingDefault: false },
  { id: "address", label: "Current Address", default: true, onboardingDefault: true },
  { id: "resume_text", label: "Experience / Resume", default: true, onboardingDefault: false },
  { id: "work_history", label: "Work History", default: false, onboardingDefault: false },
  { id: "why_join", label: "Why Join Us", default: true, onboardingDefault: false },
  { id: "availability", label: "Availability", default: true, onboardingDefault: false },
  { id: "tasks_able_to_perform", label: "Tasks They Can Perform", default: true, onboardingDefault: false },
  { id: "background_check_consent", label: "Background Check Consent", default: true, onboardingDefault: true },
  { id: "has_reliable_transportation", label: "Reliable Transportation", default: true, onboardingDefault: false },
];

export default function SendApplicationLinkSection({ getAuthHeader, refreshKey }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('invites'); // 'invites' or 'onboarding'
  const [showSendModal, setShowSendModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showSetupLoginModal, setShowSetupLoginModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [invites, setInvites] = useState([]);
  const [onboardingApplications, setOnboardingApplications] = useState([]);
  const [emailPool, setEmailPool] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded]);

  // Refresh when parent triggers refresh
  useEffect(() => {
    if (refreshKey && isExpanded) {
      fetchData();
    }
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invitesRes, poolRes, applicationsRes] = await Promise.all([
        axios.get(`${API}/api/admin/application-invites`, getAuthHeader()),
        axios.get(`${API}/api/admin/email-pool`, getAuthHeader()),
        axios.get(`${API}/api/admin/forms/job-applications`, getAuthHeader())
      ]);
      setInvites(invitesRes.data.invites || []);
      setEmailPool(poolRes.data.emails || []);
      
      // Filter for onboarding applications - check if they have onboarding template
      // Also exclude dismissed applications
      const allApps = applicationsRes.data || [];
      const onboardingApps = allApps.filter(app => 
        !app.dismissed && (
          app.invite_template === 'onboarding' || 
          (app.invited && invitesRes.data.invites?.some(
            inv => inv.email === app.email && inv.template === 'onboarding'
          ))
        )
      );
      setOnboardingApplications(onboardingApps);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (inviteId) => {
    if (!window.confirm('Delete this invite record?')) return;
    try {
      await axios.delete(`${API}/api/admin/application-invites/${inviteId}`, getAuthHeader());
      toast.success('Invite deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleDismissApplication = async (application) => {
    const reason = window.prompt(
      'Why are you dismissing this application?\n(e.g., "Email already registered", "Test application", "Duplicate")',
      'Email already registered'
    );
    if (reason === null) return; // User cancelled
    
    try {
      await axios.patch(`${API}/api/forms/submissions/${application.id}`, {
        dismissed: true,
        dismissed_reason: reason || 'Dismissed by admin'
      }, getAuthHeader());
      toast.success('Application removed from onboarding list');
      fetchData();
    } catch (error) {
      toast.error('Failed to dismiss application');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</span>;
      case "opened":
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><ExternalLink className="w-3 h-3" />Opened</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" />Sent</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const onboardingInvites = invites.filter(inv => inv.template === 'onboarding');

  // Get the invite status for an email (for showing email opened indicator)
  const getInviteForEmail = (email) => {
    return invites.find(inv => inv.email.toLowerCase() === email.toLowerCase());
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="send-application-link-section">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Onboarding & Applications</h3>
            <p className="text-sm text-gray-500">
              {invites.length} invite{invites.length !== 1 ? 's' : ''} sent • {onboardingApplications.length} onboarding
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button
                  onClick={() => setActiveTab('invites')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'invites' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Send className="w-4 h-4 inline mr-2" />
                  Send Invites
                </button>
                <button
                  onClick={() => setActiveTab('onboarding')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'onboarding' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Globe className="w-4 h-4 inline mr-2" />
                  Onboarding ({onboardingApplications.length})
                </button>
              </div>

              {/* Send Invites Tab */}
              {activeTab === 'invites' && (
                <>
                  {/* Send New Invite Button */}
                  <Button
                    onClick={() => setShowSendModal(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                    data-testid="open-send-invite-modal"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Application Invite
                  </Button>

                  {/* Sent Invites List */}
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : invites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>No invites sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700 text-sm">Sent Invites</h4>
                      {invites.map(invite => (
                        <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{invite.email}</p>
                            <p className="text-xs text-gray-500">
                              Sent {formatDate(invite.sent_at)} • 
                              <span className={invite.template === 'onboarding' ? 'text-purple-600 font-medium' : ''}>
                                {invite.template === 'onboarding' ? ' Onboarding' : ' Generic'}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {getStatusBadge(invite.status)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(invite.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Onboarding Tab */}
              {activeTab === 'onboarding' && (
                <div className="space-y-4">
                  {/* Info Banner */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm text-purple-700">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Onboarding applications are for remote workers. After setting up their employee account, send them a follow-up email with login instructions.
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : onboardingApplications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>No onboarding applications yet</p>
                      <p className="text-xs mt-1">Send an onboarding invite to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {onboardingApplications.map(app => {
                        const invite = getInviteForEmail(app.email);
                        return (
                        <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-purple-500" />
                                <p className="font-semibold text-gray-900">{app.full_name}</p>
                                {app.is_remote_worker && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    Remote
                                  </span>
                                )}
                                {app.employee_created && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    Login Created
                                  </span>
                                )}
                                {/* Email opened indicator */}
                                {invite && (
                                  <span 
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                      invite.status === 'opened' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : invite.status === 'completed'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                    title={invite.status === 'opened' ? 'Email was opened' : invite.status === 'completed' ? 'Application completed' : 'Email sent'}
                                  >
                                    {invite.status === 'opened' ? (
                                      <><ExternalLink className="w-3 h-3" />Opened</>
                                    ) : invite.status === 'completed' ? (
                                      <><CheckCircle className="w-3 h-3" />Done</>
                                    ) : (
                                      <><Clock className="w-3 h-3" />Sent</>
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{app.email}</p>
                              {app.is_remote_worker && (app.payment_first_name || app.payment_email) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Payment: {app.payment_first_name} {app.payment_last_name} ({app.payment_country || 'Remitly'})
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                Applied: {formatDate(app.submitted_at || app.created_at)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {!app.employee_created ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setShowSetupLoginModal(true);
                                    }}
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                  >
                                    <UserPlus className="w-4 h-4 mr-1" />
                                    Set Up Login
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (!window.confirm('Delete this application?')) return;
                                      try {
                                        await axios.delete(`${API}/api/admin/forms/job-applications/${app.id}`, getAuthHeader());
                                        toast.success('Application deleted');
                                        fetchData();
                                      } catch (error) {
                                        toast.error('Failed to delete');
                                      }
                                    }}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedApplication(app);
                                      setShowFollowupModal(true);
                                    }}
                                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                  >
                                    <MailCheck className="w-4 h-4 mr-1" />
                                    Send Onboarding Email
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (!window.confirm('Delete this application? (The employee account will remain)')) return;
                                      try {
                                        await axios.delete(`${API}/api/admin/forms/job-applications/${app.id}`, getAuthHeader());
                                        toast.success('Application deleted');
                                        fetchData();
                                      } catch (error) {
                                        toast.error('Failed to delete');
                                      }
                                    }}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}

                  {/* Send to someone not in list */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedApplication(null);
                        setShowFollowupModal(true);
                      }}
                      className="w-full text-gray-600 border-gray-300"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Onboarding Email to Someone Else
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Invite Modal */}
      {showSendModal && (
        <SendInviteModal
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            fetchData();
          }}
          emailPool={emailPool}
          getAuthHeader={getAuthHeader}
        />
      )}

      {/* Send Onboarding Follow-up Modal */}
      {showFollowupModal && (
        <SendFollowupModal
          application={selectedApplication}
          onClose={() => {
            setShowFollowupModal(false);
            setSelectedApplication(null);
          }}
          onSent={() => {
            setShowFollowupModal(false);
            setSelectedApplication(null);
            toast.success('Onboarding email sent!');
          }}
          getAuthHeader={getAuthHeader}
        />
      )}

      {/* Set Up Login Modal */}
      {showSetupLoginModal && selectedApplication && (
        <SetupLoginModal
          application={selectedApplication}
          onClose={() => {
            setShowSetupLoginModal(false);
            setSelectedApplication(null);
          }}
          onCreated={() => {
            setShowSetupLoginModal(false);
            // Show follow-up modal after creating login
            setShowFollowupModal(true);
            fetchData();
            toast.success('Employee login created! Now send them the onboarding email.');
          }}
          getAuthHeader={getAuthHeader}
        />
      )}
    </div>
  );
}


function SendInviteModal({ onClose, onSent, emailPool, getAuthHeader }) {
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState('generic');
  const [customMessage, setCustomMessage] = useState('');
  const [requiredFields, setRequiredFields] = useState(
    FIELD_OPTIONS.filter(f => f.default).map(f => f.id)
  );
  const [sending, setSending] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  // Update required fields when template changes
  const handleTemplateChange = (newTemplate) => {
    setTemplate(newTemplate);
    if (newTemplate === 'onboarding') {
      // For onboarding (remote workers), only address and background consent
      setRequiredFields(FIELD_OPTIONS.filter(f => f.onboardingDefault).map(f => f.id));
    } else {
      // For generic applications, use standard defaults
      setRequiredFields(FIELD_OPTIONS.filter(f => f.default).map(f => f.id));
    }
  };

  const handleFieldToggle = (fieldId, checked) => {
    if (checked) {
      setRequiredFields([...requiredFields, fieldId]);
    } else {
      setRequiredFields(requiredFields.filter(f => f !== fieldId));
    }
  };

  const handleSend = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API}/api/admin/application-invites/send`, {
        email,
        template,
        required_fields: requiredFields,
        custom_message: customMessage || null
      }, getAuthHeader());
      
      toast.success(`Invite sent to ${email}`);
      onSent();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const filteredPool = emailPool.filter(e => 
    e.email.toLowerCase().includes(email.toLowerCase()) ||
    e.name.toLowerCase().includes(email.toLowerCase())
  );

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
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Send Application Invite</h2>
            <p className="text-sm text-gray-500">Invite someone to apply for a position</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Email Input with Dropdown */}
          <div className="relative">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setShowEmailDropdown(true)}
              placeholder="Enter email address"
              className="border-2 focus:border-emerald-500"
              data-testid="invite-email-input"
            />
            
            {/* Email Pool Dropdown */}
            {showEmailDropdown && filteredPool.length > 0 && email && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredPool.slice(0, 5).map((person, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEmail(person.email);
                      setShowEmailDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{person.name}</p>
                      <p className="text-xs text-gray-500">{person.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Application Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTemplateChange('generic')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  template === 'generic' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Briefcase className={`w-5 h-5 mb-2 ${template === 'generic' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className="font-medium text-gray-900">Generic</p>
                <p className="text-xs text-gray-500 mt-1">Standard job application</p>
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('onboarding')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  template === 'onboarding' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe className={`w-5 h-5 mb-2 ${template === 'onboarding' ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="font-medium text-gray-900">Onboarding</p>
                <p className="text-xs text-gray-500 mt-1">For remote workers</p>
              </button>
            </div>
          </div>

          {/* Required Fields */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Required Fields</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
              {FIELD_OPTIONS.map(field => (
                <div key={field.id} className="flex items-center gap-2">
                  <Checkbox
                    id={field.id}
                    checked={requiredFields.includes(field.id)}
                    onCheckedChange={(checked) => handleFieldToggle(field.id, checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={field.id} className="text-xs text-gray-600 cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Custom Message (Optional)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal note to the invite email..."
              className="border-2 focus:border-emerald-500 min-h-[80px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !email}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            data-testid="send-invite-button"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Invite
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}


function SendFollowupModal({ application, onClose, onSent, getAuthHeader }) {
  const [email, setEmail] = useState(application?.email || '');
  const [name, setName] = useState(application?.full_name || '');
  const [includeAnydesk, setIncludeAnydesk] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email || !name) {
      toast.error('Please enter both name and email');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API}/api/admin/send-onboarding-followup`, {
        email,
        employee_name: name,
        include_rustdesk: includeAnydesk
      }, getAuthHeader());
      
      onSent();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
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
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Send Onboarding Email</h2>
            <p className="text-sm text-gray-500">Login instructions & next steps</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Employee Name *</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="border-2 focus:border-purple-500"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@email.com"
              className="border-2 focus:border-purple-500"
            />
          </div>

          {/* RustDesk Option */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Checkbox
              id="include-rustdesk"
              checked={includeAnydesk}
              onCheckedChange={setIncludeAnydesk}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="include-rustdesk" className="font-medium text-amber-800 cursor-pointer">
                Include RustDesk Instructions
              </Label>
              <p className="text-xs text-amber-700 mt-1">
                Adds remote access code (705 791 873) to the email
              </p>
            </div>
          </div>

          {/* Email Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">EMAIL WILL INCLUDE:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Login instructions for Employee Portal</li>
              <li>✓ Reminder to sign Contractor Agreement</li>
              <li>✓ Instructions for W-8BEN tax form</li>
              <li>✓ Payment method setup reminder</li>
              {includeAnydesk && <li>✓ RustDesk remote access code</li>}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !email || !name}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MailCheck className="w-4 h-4 mr-2" />}
            Send Onboarding Email
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}



function SetupLoginModal({ application, onClose, onCreated, getAuthHeader }) {
  const [name, setName] = useState(application?.full_name || '');
  const [email, setEmail] = useState(application?.email || '');
  const [creating, setCreating] = useState(false);
  
  // Pay rate - defaults based on remote worker status from application data
  // Only use is_remote_worker field, not invite_template (onboarding isn't always remote)
  const isRemote = application?.is_remote_worker === true;
  const [hourlyRate, setHourlyRate] = useState(isRemote ? '3.00' : '20.00');

  const handleCreate = async () => {
    if (!name || !email) {
      toast.error('Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      // Create the employee account with pay rate and remote worker flag
      await axios.post(`${API}/api/admin/create-employee`, {
        name,
        email,
        role: 'employee',
        hourly_rate: parseFloat(hourlyRate),
        is_remote_worker: isRemote
      }, getAuthHeader());
      
      // Mark the application as having an employee created
      if (application?.id) {
        await axios.patch(`${API}/api/forms/submissions/${application.id}`, {
          employee_created: true,
          employee_created_at: new Date().toISOString()
        }, getAuthHeader());
      }
      
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create employee account');
    } finally {
      setCreating(false);
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
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Set Up Employee Login</h2>
            <p className="text-sm text-gray-500">Create portal access for {application?.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Employee name"
              className="border-2 focus:border-green-500"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@email.com"
              className="border-2 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Employee will log in using this email</p>
          </div>

          {/* Pay Rate */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">
              Starting Pay Rate (USD/hour)
              {isRemote && <span className="ml-2 text-xs text-purple-600 font-normal">(Remote Worker)</span>}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="border-2 focus:border-green-500 w-24"
              />
              <span className="text-gray-500">/ hour</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isRemote 
                ? "Default: $3/hr starting, eligible for $5/hr after 2 weeks with approval"
                : "Default: $20/hr for in-person workers"
              }
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              After creating the login, you'll be prompted to send the onboarding email with:
            </p>
            <ul className="text-xs text-green-600 mt-2 ml-5 space-y-1 list-disc">
              <li>Login instructions for the Employee Portal (email-based login)</li>
              {isRemote && <li>RustDesk remote access code (705 791 873)</li>}
              <li>Reminders to complete required forms (Contractor Agreement, {isRemote ? 'W-8BEN' : 'W-9'})</li>
              <li>Option to set up a password for added security</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !name || !email}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Create Login & Continue
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
