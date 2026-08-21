import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mail, Users, CheckCircle, Clock, X, ChevronDown, 
  FileText, UserPlus, Loader2, ExternalLink, Trash2
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
  { id: "phone", label: "Phone Number", default: false },
  { id: "address", label: "Current Address", default: true },
  { id: "resume_text", label: "Experience / Resume", default: true },
  { id: "work_history", label: "Work History", default: false },
  { id: "why_join", label: "Why Join Us", default: true },
  { id: "availability", label: "Availability", default: true },
  { id: "tasks_able_to_perform", label: "Tasks They Can Perform", default: true },
  { id: "background_check_consent", label: "Background Check Consent", default: true },
  { id: "has_reliable_transportation", label: "Reliable Transportation", default: true },
];

export default function SendApplicationLinkSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [invites, setInvites] = useState([]);
  const [emailPool, setEmailPool] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invitesRes, poolRes] = await Promise.all([
        axios.get(`${API}/api/admin/application-invites`, getAuthHeader()),
        axios.get(`${API}/api/admin/email-pool`, getAuthHeader())
      ]);
      setInvites(invitesRes.data.invites || []);
      setEmailPool(poolRes.data.emails || []);
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
            <h3 className="font-semibold text-gray-900">Send Application Link</h3>
            <p className="text-sm text-gray-500">{invites.length} invite{invites.length !== 1 ? 's' : ''} sent</p>
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
                          Sent {formatDate(invite.sent_at)} • {invite.template === 'onboarding' ? 'Onboarding' : 'Generic'}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Modal */}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Email Input with Dropdown */}
          <div className="relative">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowEmailDropdown(true);
              }}
              onFocus={() => setShowEmailDropdown(true)}
              placeholder="Enter email or select from pool"
              className="w-full"
              data-testid="invite-email-input"
            />
            
            {/* Email Dropdown */}
            {showEmailDropdown && filteredPool.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredPool.slice(0, 10).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEmail(item.email);
                      setShowEmailDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name || item.email}</p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{item.source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Email Template</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTemplate('generic')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  template === 'generic' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-gray-900">Please Apply</span>
                </div>
                <p className="text-xs text-gray-500">Generic invitation to apply</p>
              </button>
              
              <button
                onClick={() => setTemplate('onboarding')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  template === 'onboarding' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="font-medium text-gray-900">Onboarding</span>
                </div>
                <p className="text-xs text-gray-500">Follow-up / onboarding process</p>
              </button>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Custom Message (Optional)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal note to the email..."
              className="min-h-[80px]"
            />
          </div>

          {/* Required Fields */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Required Fields</Label>
            <p className="text-xs text-gray-500 mb-3">Select which fields the applicant must fill out</p>
            <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg">
              {FIELD_OPTIONS.map(field => (
                <div key={field.id} className="flex items-center gap-3">
                  <Checkbox
                    id={field.id}
                    checked={requiredFields.includes(field.id)}
                    onCheckedChange={(checked) => handleFieldToggle(field.id, checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor={field.id} className="text-sm text-gray-700 cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">* Name and Email are always required</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={!email || sending}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            data-testid="send-invite-btn"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
