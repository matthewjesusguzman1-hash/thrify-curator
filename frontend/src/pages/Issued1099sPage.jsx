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
  ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
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
              <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{entry.contractor_name}</p>
                    {entry.contractor_address && (
                      <p className="text-sm text-gray-500 truncate">{entry.contractor_address}</p>
                    )}
                    <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(entry.amount_paid)}</p>
                    {entry.notes && (
                      <p className="text-sm text-gray-400 mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
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
      
      const response = await fetch(`${API_URL}/api/financials/w9/extract`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setExtractedData(result.data);
          // Auto-fill form fields
          if (result.data.name) setContractorName(result.data.name);
          if (result.data.address) setContractorAddress(result.data.address);
          if (result.data.tin) setContractorTin(result.data.tin);
        } else {
          alert('Could not extract W-9 data. Please enter manually.');
        }
      } else {
        alert('Failed to extract W-9 data');
      }
    } catch (error) {
      console.error('Error extracting W-9:', error);
      alert('Error extracting W-9 data');
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

        {/* W-9 Upload & Extract */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-2">Extract from W-9</p>
          <p className="text-xs text-blue-700 mb-3">Upload a W-9 image to auto-fill contractor info</p>
          
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
                  Extract Data from W-9
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
