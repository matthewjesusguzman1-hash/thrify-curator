import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Archive,
  Calendar,
  FolderOpen
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TaxReturnsArchiveSection = ({ getAuthHeader }) => {
  const currentYear = new Date().getFullYear();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedYear, setExpandedYear] = useState(null);
  const [yearData, setYearData] = useState({});
  const [yearsWithData, setYearsWithData] = useState([]);
  const [loading, setLoading] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Check all years for data on mount
  const checkYearsForData = useCallback(async () => {
    const yearsToCheck = [];
    for (let y = currentYear; y >= currentYear - 10; y--) {
      yearsToCheck.push(y);
    }

    const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
    const yearsFound = [];

    await Promise.all(yearsToCheck.map(async (year) => {
      try {
        const [taxReturnsRes, summaryRes] = await Promise.all([
          fetch(`${API_URL}/api/financials/tax-returns/${year}`, { headers }),
          fetch(`${API_URL}/api/financials/summary/${year}`, { headers })
        ]);

        const taxReturns = taxReturnsRes.ok ? await taxReturnsRes.json() : { documents: [] };
        const summary = summaryRes.ok ? await summaryRes.json() : null;

        // Check if year has any data
        const hasFiledReturn = (taxReturns.documents || []).length > 0;
        const hasIncome = summary && (
          (summary.income?.total > 0) || 
          (summary.net_profit !== 0) ||
          (summary.gross_profit > 0)
        );

        if (hasFiledReturn || hasIncome) {
          yearsFound.push({
            year,
            hasFiledReturn,
            hasIncome,
            taxReturns: taxReturns.documents || [],
            summary
          });
        }
      } catch (err) {
        console.error(`Error checking year ${year}:`, err);
      }
    }));

    // Sort by year descending
    yearsFound.sort((a, b) => b.year - a.year);
    setYearsWithData(yearsFound);
    
    // Pre-populate yearData
    const dataMap = {};
    yearsFound.forEach(item => {
      dataMap[item.year] = {
        taxReturns: item.taxReturns,
        summary: item.summary
      };
    });
    setYearData(dataMap);
    setInitialLoading(false);
  }, [currentYear, getAuthHeader]);

  useEffect(() => {
    checkYearsForData();
  }, [checkYearsForData]);

  const fetchYearData = useCallback(async (year) => {
    setLoading(prev => ({ ...prev, [year]: true }));
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [taxReturnsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/tax-returns/${year}`, { headers }),
        fetch(`${API_URL}/api/financials/summary/${year}`, { headers })
      ]);

      const data = {
        taxReturns: taxReturnsRes.ok ? (await taxReturnsRes.json()).documents || [] : [],
        summary: summaryRes.ok ? await summaryRes.json() : null
      };

      setYearData(prev => ({ ...prev, [year]: data }));
    } catch (err) {
      console.error(`Error fetching ${year} data:`, err);
    }
    setLoading(prev => ({ ...prev, [year]: false }));
  }, [getAuthHeader]);

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
        // Refresh year data and years list
        await fetchYearData(year);
        await checkYearsForData();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to upload file');
      }
    } catch (err) {
      setError('Failed to upload file');
      console.error('Upload error:', err);
    }
    setUploading(false);
  };

  const downloadDocument = async (year, docId) => {
    try {
      const response = await fetch(`${API_URL}/api/financials/tax-returns/${year}/${docId}/download`, {
        headers: { ...getAuthHeader() }
      });

      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `tax_return_${year}.pdf`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  };

  const deleteDocument = async (year, docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`${API_URL}/api/financials/tax-returns/${year}/${docId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });

      if (response.ok) {
        // Refresh year data and years list
        await fetchYearData(year);
        await checkYearsForData();
      } else {
        setError('Failed to delete document');
      }
    } catch (err) {
      setError('Failed to delete document');
      console.error('Delete error:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Don't render if no years have data
  if (!initialLoading && yearsWithData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="tax-returns-archive-section">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        data-testid="tax-returns-archive-toggle"
      >
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-purple-600" />
          <div className="text-left">
            <h2 className="font-semibold text-gray-900" data-testid="tax-returns-archive-title">Tax Returns Archive</h2>
            <p className="text-xs text-gray-500">
              {initialLoading 
                ? 'Loading...' 
                : `${yearsWithData.length} year${yearsWithData.length !== 1 ? 's' : ''} with data`}
            </p>
          </div>
        </div>
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {initialLoading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              Checking tax years...
            </div>
          ) : yearsWithData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No tax years with data yet.</p>
              <p className="text-sm mt-1">Enter income in the Financials section to see tax years here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {yearsWithData.map(yearInfo => {
                const year = yearInfo.year;
                const data = yearData[year];
                const isExpanded = expandedYear === year;
                const isLoading = loading[year];
                const hasFiledReturn = (data?.taxReturns?.length || 0) > 0;

                return (
                  <div key={year} data-testid={`tax-year-${year}`}>
                    {/* Year Header */}
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      data-testid={`tax-year-${year}-toggle`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">Tax Year {year}</span>
                        {hasFiledReturn && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Filed
                          </span>
                        )}
                        {yearInfo.hasIncome && !hasFiledReturn && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Has Income Data
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isLoading && (
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-50">
                        {/* Tax Summary */}
                        {data?.summary && (
                          <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Tax Summary</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Gross Income:</span>
                                <span className="ml-2 font-medium">{formatCurrency(data.summary.income?.total || 0)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Net Profit:</span>
                                <span className={`ml-2 font-medium ${data.summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(data.summary.net_profit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Filed Tax Return */}
                        <div className="p-3 bg-white rounded border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Filed Tax Return</h4>
                          
                          {data?.taxReturns?.length > 0 ? (
                            <div className="space-y-2 mb-3" data-testid={`tax-returns-list-${year}`}>
                              {data.taxReturns.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded" data-testid={`tax-return-doc-${doc.id}`}>
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
                                      data-testid={`download-doc-${doc.id}`}
                                    >
                                      <Download className="w-4 h-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteDocument(year, doc.id)}
                                      className="p-1"
                                      data-testid={`delete-doc-${doc.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mb-3" data-testid={`no-returns-${year}`}>No filed return uploaded yet.</p>
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
                              data-testid={`upload-input-${year}`}
                            />
                            <Button
                              as="span"
                              size="sm"
                              variant="outline"
                              disabled={uploading}
                              className="w-full cursor-pointer"
                              onClick={(e) => e.currentTarget.previousSibling.click()}
                              data-testid={`upload-button-${year}`}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {uploading ? 'Uploading...' : 'Upload Tax Return'}
                            </Button>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TaxReturnsArchiveSection;
