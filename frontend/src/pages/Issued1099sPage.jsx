import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Pencil, 
  Upload, 
  Camera,
  FileText,
  Scan,
  X,
  ChevronDown,
  Users,
  Download,
  Mail,
  Share2,
  CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Format currency helper
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

// Entry Card Component with Actions
const Entry1099Card = ({ entry, getAuthHeader, onEdit, onDelete, onRefresh }) => {
  const [showActions, setShowActions] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [showUploadFiled, setShowUploadFiled] = useState(false);
  
  // Confirmation dialogs
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showPortalConfirm, setShowPortalConfirm] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch email for confirmation
  const handleEmailClick = async () => {
    setProcessing('checking');
    try {
      // Look up the user's email
      const response = await fetch(`${API_URL}/api/admin/employees-with-w9`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      
      if (response.ok) {
        const data = await response.json();
        const employee = data.employees?.find(e => 
          e.name.toLowerCase() === entry.contractor_name.toLowerCase()
        );
        
        if (employee) {
          setEmailRecipient({ name: employee.name, email: employee.email });
        } else {
          // Try to find by partial match
          const partialMatch = data.employees?.find(e => 
            e.name.toLowerCase().includes(entry.contractor_name.toLowerCase()) ||
            entry.contractor_name.toLowerCase().includes(e.name.toLowerCase())
          );
          if (partialMatch) {
            setEmailRecipient({ name: partialMatch.name, email: partialMatch.email });
          } else {
            setEmailRecipient({ name: entry.contractor_name, email: null });
          }
        }
        setShowEmailConfirm(true);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error looking up email');
    }
    setProcessing(null);
  };

  // Fetch employees for portal selection
  const handlePortalClick = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/employees-with-w9`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
        
        // Pre-select if name matches
        const match = data.employees?.find(e => 
          e.name.toLowerCase() === entry.contractor_name.toLowerCase()
        );
        setSelectedEmployee(match?.user_id || null);
      }
      setShowPortalConfirm(true);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoadingEmployees(false);
  };

  const handleGeneratePDF = async () => {
    setProcessing('pdf');
    try {
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${entry.id}/generate-pdf`, {
        headers: getAuthHeader()
      });
      
      if (response.ok) {
        const blob = await response.blob();
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `1099_NEC_${entry.contractor_name.replace(/\s+/g, '_')}_${entry.year}.pdf`, { type: 'application/pdf' });
          try {
            await navigator.share({ files: [file], title: '1099-NEC Form' });
          } catch (e) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `1099_NEC_${entry.contractor_name.replace(/\s+/g, '_')}_${entry.year}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `1099_NEC_${entry.contractor_name.replace(/\s+/g, '_')}_${entry.year}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error generating PDF');
    }
    setProcessing(null);
  };

  const confirmSaveToPortal = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }
    
    setProcessing('portal');
    setShowPortalConfirm(false);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${entry.id}/save-to-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ user_id: selectedEmployee })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`1099 saved to employee portal`);
        onRefresh();
      } else {
        alert('Failed to save to portal');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving to portal');
    }
    setProcessing(null);
  };

  const confirmEmail = async () => {
    if (!emailRecipient?.email) {
      alert('No email address found for this contractor');
      return;
    }
    
    setProcessing('email');
    setShowEmailConfirm(false);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${entry.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`1099 emailed to ${data.email}`);
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error sending email');
    }
    setProcessing(null);
  };

  const handleUploadFiled = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setProcessing('upload');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const authHeader = getAuthHeader();
      delete authHeader['Content-Type'];
      
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${entry.id}/upload-filed`, {
        method: 'POST',
        headers: authHeader,
        body: formData
      });
      
      if (response.ok) {
        alert('Filed 1099 uploaded successfully');
        setShowUploadFiled(false);
        onRefresh();
      } else {
        alert('Failed to upload filed document');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading filed document');
    }
    setProcessing(null);
  };

  const handleViewFiled = async () => {
    try {
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${entry.id}/filed-document`, {
        headers: getAuthHeader()
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert('Failed to view filed document');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header with basic info */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{entry.contractor_name}</p>
            {entry.filed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                <CheckCircle className="w-3 h-3" /> Filed
              </span>
            )}
            {entry.emailed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                <Mail className="w-3 h-3" /> Emailed
              </span>
            )}
          </div>
          {entry.contractor_tin && (
            <p className="text-sm text-gray-500">TIN: {entry.contractor_tin}</p>
          )}
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(entry.amount_paid)}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowActions(!showActions)}
          className="w-full text-left text-sm text-blue-600 font-medium flex items-center justify-between"
        >
          Actions
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </button>
        
        {showActions && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={handleGeneratePDF}
              disabled={!!processing}
              variant="outline"
              className="text-sm py-2 h-auto flex items-center justify-center gap-1"
            >
              {processing === 'pdf' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate PDF
                </>
              )}
            </Button>
            
            <Button
              onClick={handlePortalClick}
              disabled={!!processing || loadingEmployees}
              variant="outline"
              className="text-sm py-2 h-auto flex items-center justify-center gap-1"
            >
              {processing === 'portal' || loadingEmployees ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  {entry.saved_to_portal ? 'Saved' : 'Save to Portal'}
                </>
              )}
            </Button>
            
            <Button
              onClick={handleEmailClick}
              disabled={!!processing}
              variant="outline"
              className="text-sm py-2 h-auto flex items-center justify-center gap-1"
            >
              {processing === 'email' || processing === 'checking' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Email
                </>
              )}
            </Button>
            
            {entry.filed ? (
              <Button
                onClick={handleViewFiled}
                variant="outline"
                className="text-sm py-2 h-auto flex items-center justify-center gap-1 bg-green-50 border-green-200 text-green-700"
              >
                <FileText className="w-4 h-4" />
                View Filed
              </Button>
            ) : (
              <div className="relative">
                <Button
                  onClick={() => setShowUploadFiled(true)}
                  disabled={!!processing}
                  variant="outline"
                  className="w-full text-sm py-2 h-auto flex items-center justify-center gap-1"
                >
                  {processing === 'upload' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Filed
                    </>
                  )}
                </Button>
                {showUploadFiled && (
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleUploadFiled}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            )}
            
            {/* Additional actions for filed documents */}
            {entry.filed && (
              <>
                <Button
                  onClick={handleEmailClick}
                  disabled={!!processing}
                  variant="outline"
                  className="text-sm py-2 h-auto flex items-center justify-center gap-1"
                >
                  <Mail className="w-4 h-4" />
                  Email Filed
                </Button>
                <Button
                  onClick={handlePortalClick}
                  disabled={!!processing}
                  variant="outline"
                  className="text-sm py-2 h-auto flex items-center justify-center gap-1"
                >
                  <Share2 className="w-4 h-4" />
                  Send to Portal
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Email Confirmation Modal */}
      {showEmailConfirm && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => setShowEmailConfirm(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-4">Confirm Email</h3>
            
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-500">Contractor</p>
                <p className="font-medium">{entry.contractor_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email will be sent to</p>
                {emailRecipient?.email ? (
                  <p className="font-medium text-blue-600">{emailRecipient.email}</p>
                ) : (
                  <p className="text-red-500">No email found for this contractor</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">{formatCurrency(entry.amount_paid)}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowEmailConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={confirmEmail}
                disabled={!emailRecipient?.email}
              >
                Send Email
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Portal Selection Modal */}
      {showPortalConfirm && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => setShowPortalConfirm(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-4">Save to Employee Portal</h3>
            
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-gray-500">1099-NEC for</p>
                <p className="font-medium">{entry.contractor_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">{formatCurrency(entry.amount_paid)}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee Account
              </label>
              <select
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.user_id} value={emp.user_id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
              {employees.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No employees with W-9s found</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowPortalConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={confirmSaveToPortal}
                disabled={!selectedEmployee}
              >
                Save to Portal
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const Issued1099sPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = parseInt(searchParams.get('year')) || new Date().getFullYear() - 1;
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [totalPaid, setTotalPaid] = useState(0);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${year}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
        setTotalPaid(data.total_paid || 0);
      }
    } catch (error) {
      console.error('Error fetching 1099s:', error);
    }
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this 1099 entry?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/financials/issued-1099s/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (response.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(`/admin/tax-prep?year=${year}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tax Prep
          </button>
          <h1 className="text-xl font-bold text-gray-900">1099s Issued - Tax Year {year}</h1>
          <p className="text-sm text-gray-500">Track 1099-NECs issued to contractors</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Paid to Contractors</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">1099s Issued</p>
              <p className="text-2xl font-bold text-blue-600">{entries.length}</p>
            </div>
          </div>
        </div>

        {/* Add Button */}
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full mb-6 py-4 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add 1099 Entry
        </Button>

        {/* Entries List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No 1099s issued yet for {year}</p>
            <p className="text-sm text-gray-400 mt-1">Add contractors you've paid $600+ during the year</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <Entry1099Card 
                key={entry.id} 
                entry={entry} 
                getAuthHeader={getAuthHeader}
                onEdit={() => setEditingEntry(entry)}
                onDelete={() => handleDelete(entry.id)}
                onRefresh={fetchEntries}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingEntry) && (
        <Add1099Modal
          entry={editingEntry}
          year={year}
          getAuthHeader={getAuthHeader}
          onClose={() => {
            setShowAddModal(false);
            setEditingEntry(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingEntry(null);
            fetchEntries();
          }}
        />
      )}
    </div>
  );
};

// Add/Edit 1099 Modal with W-9 Extraction
const Add1099Modal = ({ entry, year, getAuthHeader, onClose, onSave }) => {
  const [contractorName, setContractorName] = useState(entry?.contractor_name || '');
  const [contractorTin, setContractorTin] = useState(entry?.contractor_tin || '');
  const [contractorAddress, setContractorAddress] = useState(entry?.contractor_address || '');
  const [amountPaid, setAmountPaid] = useState(entry?.amount_paid?.toString() || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [saving, setSaving] = useState(false);
  
  // W-9 Extraction
  const [w9Image, setW9Image] = useState(null);
  const [w9Preview, setW9Preview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  
  // Employees with W-9s
  const [employeesWithW9, setEmployeesWithW9] = useState([]);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees with W-9s on mount
  useEffect(() => {
    const fetchEmployeesWithW9 = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch(`${API_URL}/api/admin/employees-with-w9`, {
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
        });
        if (response.ok) {
          const data = await response.json();
          setEmployeesWithW9(data.employees || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
      setLoadingEmployees(false);
    };
    fetchEmployeesWithW9();
  }, []);

  const handleSelectEmployee = async (employee) => {
    setShowEmployeeList(false);
    setContractorName(employee.name);
    
    // If they have an image W-9, extract data from it
    if (employee.has_w9_image) {
      setExtracting(true);
      try {
        const response = await fetch(`${API_URL}/api/admin/employees/${employee.user_id}/w9/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setExtractedData(result.data);
            if (result.data.name) setContractorName(result.data.name);
            if (result.data.address) setContractorAddress(result.data.address);
            if (result.data.tin) setContractorTin(result.data.tin);
          }
        }
      } catch (error) {
        console.error('Error extracting W-9:', error);
      }
      setExtracting(false);
    }
  };

  const handleW9Upload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setW9Image(file);
      const reader = new FileReader();
      reader.onloadend = () => setW9Preview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleExtractW9 = async () => {
    if (!w9Image) return;
    
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', w9Image);
      
      // Don't include Content-Type header for FormData - browser sets it automatically with boundary
      const authHeader = getAuthHeader();
      delete authHeader['Content-Type'];
      
      const response = await fetch(`${API_URL}/api/financials/w9/extract`, {
        method: 'POST',
        headers: authHeader,
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setExtractedData(result.data);
          // Auto-fill form fields from W-9 or 1099-NEC data
          if (result.data.name) setContractorName(result.data.name);
          if (result.data.address) setContractorAddress(result.data.address);
          if (result.data.tin) setContractorTin(result.data.tin);
          if (result.data.amount_paid) setAmountPaid(result.data.amount_paid.toString());
        } else {
          alert('Could not extract data from document. Please enter manually.');
        }
      } else {
        const errorText = await response.text();
        console.error('Document extraction failed:', errorText);
        alert('Failed to extract data. Please try again or enter manually.');
      }
    } catch (error) {
      console.error('Error extracting document:', error);
      alert('Error extracting data. Please try again.');
    }
    setExtracting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const url = entry 
        ? `${API_URL}/api/financials/issued-1099s/${entry.id}`
        : `${API_URL}/api/financials/issued-1099s`;
      
      const response = await fetch(url, {
        method: entry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          contractor_name: contractorName,
          contractor_tin: contractorTin,
          contractor_address: contractorAddress,
          amount_paid: parseFloat(amountPaid),
          notes
        })
      });
      
      if (response.ok) {
        onSave();
      } else {
        alert('Failed to save 1099 entry');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving 1099 entry');
    }
    setSaving(false);
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{entry ? 'Edit' : 'Add'} 1099-NEC Entry</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Select from Employees with W-9s */}
        {!entry && employeesWithW9.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-900 mb-2">Quick Fill from Employee W-9</p>
            <button
              type="button"
              onClick={() => setShowEmployeeList(!showEmployeeList)}
              className="w-full px-3 py-3 bg-white border border-green-300 rounded-lg text-left flex items-center justify-between"
            >
              <span className="text-sm text-green-700">
                {loadingEmployees ? 'Loading...' : `Select from ${employeesWithW9.length} employee(s) with W-9 on file`}
              </span>
              <ChevronDown className={`w-5 h-5 text-green-500 transition-transform ${showEmployeeList ? 'rotate-180' : ''}`} />
            </button>
            
            {showEmployeeList && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-green-200 rounded-lg bg-white">
                {employeesWithW9.map(emp => (
                  <button
                    key={emp.user_id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full px-3 py-2 text-left hover:bg-green-50 border-b border-green-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </button>
                ))}
              </div>
            )}
            
            {extracting && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                Extracting W-9 data...
              </div>
            )}
          </div>
        )}

        {/* Document Upload & Extract */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-2">Extract from Document</p>
          <p className="text-xs text-blue-700 mb-3">Upload a W-9 or 1099-NEC to auto-fill contractor info</p>
          
          {w9Preview ? (
            <div className="relative mb-3">
              <img src={w9Preview} alt="W-9" className="max-h-32 mx-auto rounded border" />
              <button
                type="button"
                onClick={() => { setW9Image(null); setW9Preview(null); setExtractedData(null); }}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mb-3">
              <label className="flex-1 flex flex-col items-center cursor-pointer py-3 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100">
                <Camera className="w-5 h-5 text-blue-500 mb-1" />
                <span className="text-xs text-blue-600">Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleW9Upload}
                  className="hidden"
                />
              </label>
              <label className="flex-1 flex flex-col items-center cursor-pointer py-3 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100">
                <Upload className="w-5 h-5 text-blue-500 mb-1" />
                <span className="text-xs text-blue-600">Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleW9Upload}
                  className="hidden"
                />
              </label>
            </div>
          )}
          
          {w9Preview && !extractedData && (
            <Button
              type="button"
              onClick={handleExtractW9}
              disabled={extracting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {extracting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Extracting...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  Extract Data
                </>
              )}
            </Button>
          )}
          
          {extractedData && (
            <div className="text-xs text-green-700 bg-green-100 rounded p-2">
              Data extracted! Fields have been auto-filled. Please verify and edit if needed.
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contractor Name *</label>
            <input
              type="text"
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
              placeholder="Full name or business name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SSN or EIN</label>
            <input
              type="text"
              value={contractorTin}
              onChange={(e) => setContractorTin(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
              placeholder="XXX-XX-XXXX or XX-XXXXXXX"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={contractorAddress}
              onChange={(e) => setContractorAddress(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base resize-none"
              rows={2}
              placeholder="Street, City, State ZIP"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountPaid}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmountPaid(val);
                  }
                }}
                className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-lg text-base"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
              placeholder="e.g., Photography services"
            />
          </div>
          
          <div className="flex gap-3 pt-2 pb-4">
            <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : (entry ? 'Update' : 'Save')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default Issued1099sPage;
