import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  FileText, 
  Download, 
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Archive,
  Calendar,
  FolderOpen
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TaxReturnsArchiveSection = ({ getAuthHeader }) => {
  const currentYear = new Date().getFullYear();
  const [expandedYear, setExpandedYear] = useState(null);
  const [yearData, setYearData] = useState({});
  const [loading, setLoading] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Years to show (current year and past 5 years)
  const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

  const fetchYearData = useCallback(async (year) => {
    if (yearData[year]) return; // Already loaded
    
    setLoading(prev => ({ ...prev, [year]: true }));
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [taxReturnsRes, manual1099Res, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/tax-returns/${year}`, { headers }),
        fetch(`${API_URL}/api/financials/1099/manual/${year}`, { headers }),
        fetch(`${API_URL}/api/financials/summary/${year}`, { headers })
      ]);

      const data = {
        taxReturns: taxReturnsRes.ok ? (await taxReturnsRes.json()).documents || [] : [],
        manual1099: manual1099Res.ok ? (await manual1099Res.json()).recipients || [] : [],
        summary: summaryRes.ok ? await summaryRes.json() : null
      };

      setYearData(prev => ({ ...prev, [year]: data }));
    } catch (err) {
      console.error(`Error fetching ${year} data:`, err);
    }
    setLoading(prev => ({ ...prev, [year]: false }));
  }, [getAuthHeader, yearData]);

  const toggleYear = (year) => {
    if (expandedYear === year) {
      setExpandedYear(null);
    } else {
      setExpandedYear(year);
      fetchYearData(year);
    }
  };

  const handleFileUpload = async (year, file) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Filed Tax Return ${year}`);

      const response = await fetch(`${API_URL}/api/financials/tax-returns/${year}/upload`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData
      });

      if (response.ok) {
        // Refresh year data
        setYearData(prev => ({ ...prev, [year]: null }));
        fetchYearData(year);
      } else {
        const data = await response.json();
        setError(data.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload file');
    }
    setUploading(false);
  };

  const deleteDocument = async (year, docId) => {
    if (!window.confirm('Delete this tax return document?')) return;

    try {
      await fetch(`${API_URL}/api/financials/tax-returns/${year}/${docId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      // Refresh year data
      setYearData(prev => ({ ...prev, [year]: null }));
      fetchYearData(year);
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const downloadDocument = (year, docId) => {
    window.open(`${API_URL}/api/financials/tax-returns/${year}/${docId}/download`, '_blank');
  };

  const download1099 = (year, recipientId) => {
    window.open(`${API_URL}/api/financials/1099/manual/${year}/${recipientId}/download`, '_blank');
  };

  const downloadTaxSummary = (year, format) => {
    window.open(`${API_URL}/api/financials/tax-summary/${year}/download?format=${format}`, '_blank');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Tax Returns Archive</h2>
            <p className="text-xs text-gray-500">Filed returns and generated documents by year</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Year List */}
      <div className="divide-y divide-gray-100">
        {years.map(year => {
          const data = yearData[year];
          const isExpanded = expandedYear === year;
          const isLoading = loading[year];
          const hasFiledReturn = data?.taxReturns?.length > 0;
          const has1099s = data?.manual1099?.length > 0;

          return (
            <div key={year}>
              {/* Year Header */}
              <button
                onClick={() => toggleYear(year)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">Tax Year {year}</span>
                  {hasFiledReturn && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Filed
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Tax Summary */}
                      {data?.summary && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Tax Summary
                          </h3>
                          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                            <div>
                              <span className="text-gray-500">Gross Income:</span>
                              <span className="ml-2 font-medium">{formatCurrency(data.summary.income?.total)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Net Profit:</span>
                              <span className="ml-2 font-medium text-green-600">{formatCurrency(data.summary.net_profit)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadTaxSummary(year, 'pdf')}
                              className="flex-1 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadTaxSummary(year, 'csv')}
                              className="flex-1 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              CSV
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 1099-NECs */}
                      {has1099s && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            1099-NEC Forms ({data.manual1099.length})
                          </h3>
                          <div className="space-y-2">
                            {data.manual1099.map(recipient => (
                              <div key={recipient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                <div>
                                  <span className="font-medium">{recipient.name}</span>
                                  <span className="ml-2 text-gray-500">{formatCurrency(recipient.amount_paid)}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => download1099(year, recipient.id)}
                                  className="p-1"
                                >
                                  <Download className="w-4 h-4 text-blue-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filed Tax Returns */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-purple-600" />
                          Filed Tax Return
                        </h3>

                        {data?.taxReturns?.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {data.taxReturns.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(doc.size)} • {formatDate(doc.uploaded_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => downloadDocument(year, doc.id)}
                                    className="p-1"
                                  >
                                    <Download className="w-4 h-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteDocument(year, doc.id)}
                                    className="p-1"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mb-3">No filed return uploaded yet.</p>
                        )}

                        {/* Upload Button */}
                        <label className="block">
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(year, file);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                          <Button
                            as="span"
                            size="sm"
                            variant="outline"
                            disabled={uploading}
                            className="w-full cursor-pointer"
                            onClick={(e) => e.currentTarget.previousSibling.click()}
                          >
                            {uploading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Filed Return
                              </>
                            )}
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaxReturnsArchiveSection;
