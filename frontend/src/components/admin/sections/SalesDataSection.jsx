import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Upload,
  RefreshCw,
  Trash2,
  FileText,
  Download,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Calendar,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
  Filter,
  Save,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Color palette for charts
const CHART_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

const SalesDataSection = ({ getAuthHeader }) => {
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    salesData: true,
    reports: false
  });
  
  // Data state
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [yoyData, setYoyData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [showStaleInventory, setShowStaleInventory] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [summaryRes, yoyRes, reportsRes] = await Promise.all([
        fetch(`${API_URL}/api/inventory/summary`, { headers }),
        fetch(`${API_URL}/api/inventory/analytics/yoy`, { headers }),
        fetch(`${API_URL}/api/inventory/reports/saved`, { headers })
      ]);
      
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (yoyRes.ok) setYoyData(await yoyRes.json());
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setSavedReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
    setLoading(false);
  }, [getAuthHeader]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Delete this saved report?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/inventory/reports/saved/${reportId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        setSavedReports(prev => prev.filter(r => r.id !== reportId));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* ==================== SALES DATA SECTION ==================== */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('salesData')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Sales Data</h3>
              <p className="text-sm text-white/60">
                {summary?.total_items ? `${summary.total_items.toLocaleString()} items imported` : 'Import your Vendoo CSV'}
              </p>
            </div>
          </div>
          {expandedSections.salesData ? (
            <ChevronDown className="w-5 h-5 text-white/60" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/60" />
          )}
        </button>

        {expandedSections.salesData && (
          <div className="px-4 pb-4 space-y-4">
            {/* Import/Replace Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowImportModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="import-csv-btn"
              >
                <Upload className="w-4 h-4 mr-2" />
                {summary?.total_items > 0 ? 'Replace CSV Data' : 'Import CSV'}
              </Button>
              {summary?.total_items > 0 && (
                <Button
                  variant="outline"
                  onClick={() => fetchData()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>

            {/* Summary Stats */}
            {summary?.total_items > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs uppercase">Total Items</p>
                    <p className="text-xl font-bold text-white">{summary.total_items.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs uppercase">Items Sold</p>
                    <p className="text-xl font-bold text-green-400">{summary.sold_summary?.count?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs uppercase">Gross Revenue</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(summary.sold_summary?.total_revenue)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs uppercase">Total Profit</p>
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.sold_summary?.total_profit)}</p>
                  </div>
                </div>

                {/* Year-over-Year Comparison Chart */}
                {yoyData && yoyData.months && (
                  <div className="bg-white rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <LineChartIcon className="w-5 h-5 text-purple-600" />
                      Sales Comparison: {yoyData.current_year} vs {yoyData.previous_year}
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yoyData.months}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="current" 
                            name={String(yoyData.current_year)}
                            stroke="#8B5CF6" 
                            strokeWidth={3}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="previous" 
                            name={String(yoyData.previous_year)}
                            stroke="#94A3B8" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#94A3B8', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-purple-600 text-sm">{yoyData.current_year} YTD</p>
                        <p className="text-2xl font-bold text-purple-700">{formatCurrency(yoyData.ytd?.current)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-600 text-sm">{yoyData.previous_year} YTD</p>
                        <p className="text-2xl font-bold text-gray-700">{formatCurrency(yoyData.ytd?.previous)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Breakdown */}
                {summary.by_platform && Object.keys(summary.by_platform).length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs uppercase mb-2">By Platform</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(summary.by_platform).map(([platform, count]) => (
                        <span 
                          key={platform}
                          className="px-3 py-1 bg-white/10 rounded-full text-sm text-white"
                        >
                          {platform}: {count.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!loading && (!summary || summary.total_items === 0) && (
              <div className="text-center py-8 text-white/60">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sales data imported yet</p>
                <p className="text-sm mt-1">Import your Vendoo CSV to get started</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== REPORTS SECTION ==================== */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('reports')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Reports</h3>
              <p className="text-sm text-white/60">
                {savedReports.length > 0 ? `${savedReports.length} saved report${savedReports.length > 1 ? 's' : ''}` : 'Create custom reports'}
              </p>
            </div>
          </div>
          {expandedSections.reports ? (
            <ChevronDown className="w-5 h-5 text-white/60" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/60" />
          )}
        </button>

        {expandedSections.reports && (
          <div className="px-4 pb-4 space-y-4">
            {/* Report Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowReportBuilder(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={!summary || summary.total_items === 0}
                data-testid="create-report-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Report
              </Button>
              <Button
                onClick={() => setShowStaleInventory(true)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                disabled={!summary || summary.total_items === 0}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Stale Inventory
              </Button>
            </div>

            {/* Saved Reports */}
            {savedReports.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-white/80 text-sm font-medium">Saved Reports</h4>
                {savedReports.map(report => (
                  <div 
                    key={report.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <button
                      onClick={() => setActiveReport(report)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-white">{report.name}</p>
                      <p className="text-xs text-white/60">
                        {report.report_type} • Created {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setActiveReport(report)}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg"
                        title="Run Report"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-white/50">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved reports yet</p>
                <p className="text-xs mt-1">Create a report to save it for later</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}
      
      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          getAuthHeader={getAuthHeader}
          hasExistingData={summary?.total_items > 0}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchData();
          }}
        />
      )}

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <ReportBuilderModal
          getAuthHeader={getAuthHeader}
          onClose={() => setShowReportBuilder(false)}
          onSave={(report) => {
            setSavedReports(prev => [report, ...prev]);
            setShowReportBuilder(false);
          }}
        />
      )}

      {/* Active Report Modal */}
      {activeReport && (
        <ReportViewerModal
          report={activeReport}
          getAuthHeader={getAuthHeader}
          onClose={() => setActiveReport(null)}
        />
      )}

      {/* Stale Inventory Modal */}
      {showStaleInventory && (
        <StaleInventoryModal
          getAuthHeader={getAuthHeader}
          onClose={() => setShowStaleInventory(false)}
        />
      )}
    </div>
  );
};

// ==================== IMPORT MODAL ====================
const ImportModal = ({ getAuthHeader, hasExistingData, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleClearAndUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Clear existing data first if needed
      if (hasExistingData) {
        setClearing(true);
        await fetch(`${API_URL}/api/inventory/clear-all`, {
          method: 'DELETE',
          headers: { ...getAuthHeader() }
        });
        setClearing(false);
      }

      // Upload new file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'vendoo');

      const response = await fetch(`${API_URL}/api/inventory/import`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.detail || 'Import failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
    }
    setUploading(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {hasExistingData ? 'Replace Sales Data' : 'Import Sales Data'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasExistingData && !result && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-800 text-sm">
              <strong>Warning:</strong> This will delete all existing inventory data and replace it with the new CSV file.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {!result && (
            <>
              <div>
                <label className="block w-full">
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    {file ? (
                      <p className="font-medium text-purple-600">{file.name}</p>
                    ) : (
                      <p className="text-gray-500">Click to select CSV file</p>
                    )}
                  </div>
                </label>
                {file && (
                  <p className="text-sm text-gray-500 mt-2">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleClearAndUpload}
                disabled={!file || uploading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {clearing ? 'Clearing old data...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {hasExistingData ? 'Replace Data' : 'Import Data'}
                  </>
                )}
              </Button>
            </>
          )}

          {result && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Import Successful!</h4>
              <p className="text-gray-600 mb-4">
                {result.details?.rows_processed?.toLocaleString()} items imported
              </p>
              <Button onClick={onSuccess} className="bg-green-600 hover:bg-green-700">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==================== REPORT BUILDER MODAL ====================
const ReportBuilderModal = ({ getAuthHeader, onClose, onSave }) => {
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('ytd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [chartTypes, setChartTypes] = useState(['line']);
  const [metrics, setMetrics] = useState(['gross_sales', 'net_sales', 'profit']);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const reportTypes = [
    { id: 'sales', label: 'Sales Overview' },
    { id: 'brands', label: 'Top Brands' },
    { id: 'platforms', label: 'Platform Breakdown' },
    { id: 'custom', label: 'Custom Metrics' }
  ];

  const availableMetrics = [
    { id: 'gross_sales', label: 'Gross Sales' },
    { id: 'net_sales', label: 'Net Sales' },
    { id: 'cogs', label: 'COGS' },
    { id: 'profit', label: 'Profit' },
    { id: 'items_sold', label: 'Items Sold' },
    { id: 'avg_sale_price', label: 'Avg Sale Price' },
    { id: 'avg_days_to_sale', label: 'Avg Days to Sale' }
  ];

  const generateReport = async () => {
    setLoading(true);
    
    try {
      let url = `${API_URL}/api/inventory/analytics?`;
      
      if (dateRange === 'ytd') {
        url += `year=${new Date().getFullYear()}`;
      } else if (dateRange === 'last_year') {
        url += `year=${new Date().getFullYear() - 1}`;
      } else if (dateRange === 'custom' && customStart && customEnd) {
        url += `start_date=${customStart}&end_date=${customEnd}`;
      }

      const res = await fetch(url, {
        headers: { ...getAuthHeader() }
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
    setLoading(false);
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/inventory/reports/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: reportName,
          report_type: reportType,
          config: {
            date_range: dateRange,
            custom_start: customStart,
            custom_end: customEnd,
            chart_types: chartTypes,
            metrics: metrics
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        onSave({
          id: data.report_id,
          name: reportName,
          report_type: reportType,
          config: { date_range: dateRange, chart_types: chartTypes, metrics },
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const csv = [
      ['Metric', 'Value'],
      ['Gross Sales', reportData.summary.gross_sales],
      ['Net Sales', reportData.summary.net_sales],
      ['COGS', reportData.summary.total_cogs],
      ['Profit', reportData.summary.profit],
      ['Profit Margin %', reportData.summary.profit_margin],
      ['Items Sold', reportData.summary.items_sold],
      ['Avg Sale Price', reportData.summary.avg_sale_price],
      ['Avg Days to Sale', reportData.summary.avg_days_to_sale || 'N/A']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'report'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999] overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-semibold">Create Report</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Configuration */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., Q1 2025 Sales"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {reportTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="ytd">Year to Date ({new Date().getFullYear()})</option>
                <option value="last_year">Last Year ({new Date().getFullYear() - 1})</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><BarChart3 className="w-4 h-4 mr-2" /> Generate Report</>
            )}
          </Button>

          {/* Report Results */}
          {reportData && (
            <div className="space-y-6 pt-4 border-t">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-purple-600 text-sm">Gross Sales</p>
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData.summary.gross_sales)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-600 text-sm">Net Sales</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.summary.net_sales)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-amber-600 text-sm">COGS</p>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(reportData.summary.total_cogs)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-green-600 text-sm">Profit ({reportData.summary.profit_margin}%)</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.summary.profit)}</p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">Items Sold</p>
                  <p className="text-xl font-bold">{reportData.summary.items_sold?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">Unsold Items</p>
                  <p className="text-xl font-bold">{reportData.summary.items_unsold?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">Avg Days to Sale</p>
                  <p className="text-xl font-bold">{reportData.summary.avg_days_to_sale || 'N/A'}</p>
                </div>
              </div>

              {/* Top Brands Chart */}
              {reportData.top_brands?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Top Selling Brands</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.top_brands.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="brand" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Platform Breakdown */}
              {reportData.top_platforms?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Sales by Platform</h4>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={reportData.top_platforms}
                          dataKey="revenue"
                          nameKey="platform"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ platform, percent }) => `${platform} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {reportData.top_platforms.map((entry, index) => (
                            <Cell key={entry.platform} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveReport} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="w-4 h-4 mr-2" /> Save Report
                </Button>
                <Button onClick={exportReport} variant="outline">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==================== REPORT VIEWER MODAL ====================
const ReportViewerModal = ({ report, getAuthHeader, onClose }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let url = `${API_URL}/api/inventory/analytics?`;
        const config = report.config;

        if (config.date_range === 'ytd') {
          url += `year=${new Date().getFullYear()}`;
        } else if (config.date_range === 'last_year') {
          url += `year=${new Date().getFullYear() - 1}`;
        } else if (config.custom_start && config.custom_end) {
          url += `start_date=${config.custom_start}&end_date=${config.custom_end}`;
        }

        const res = await fetch(url, { headers: { ...getAuthHeader() } });
        if (res.ok) {
          setReportData(await res.json());
        }
      } catch (error) {
        console.error('Error loading report:', error);
      }
      setLoading(false);
    };

    fetchReport();
  }, [report, getAuthHeader]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const csv = [
      ['Metric', 'Value'],
      ['Gross Sales', reportData.summary.gross_sales],
      ['Net Sales', reportData.summary.net_sales],
      ['COGS', reportData.summary.total_cogs],
      ['Profit', reportData.summary.profit]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{report.name}</h3>
          <div className="flex items-center gap-2">
            <Button onClick={exportReport} variant="outline" size="sm" disabled={!reportData}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-purple-600 text-sm">Gross Sales</p>
                  <p className="text-xl font-bold text-purple-700">{formatCurrency(reportData.summary.gross_sales)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-600 text-sm">Net Sales</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(reportData.summary.net_sales)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-amber-600 text-sm">COGS</p>
                  <p className="text-xl font-bold text-amber-700">{formatCurrency(reportData.summary.total_cogs)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-green-600 text-sm">Profit</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(reportData.summary.profit)}</p>
                </div>
              </div>

              {/* Charts would go here based on report.config.chart_types */}
              {reportData.top_brands?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Top Brands</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.top_brands.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="brand" />
                        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Failed to load report data</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==================== STALE INVENTORY MODAL ====================
const StaleInventoryModal = ({ getAuthHeader, onClose }) => {
  const [days, setDays] = useState(365);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStaleItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/inventory/stale?days_threshold=${days}&limit=200`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Error fetching stale inventory:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaleItems();
  }, []);

  const exportStale = () => {
    if (!data?.items) return;

    const csv = [
      ['Title', 'SKU', 'Platform', 'Listed Date', 'Days in Inventory', 'Listed Price'],
      ...data.items.map(item => [
        `"${item.title || ''}"`,
        item.sku || '',
        item.platform || '',
        item.listed_date || '',
        item.days_in_inventory || '',
        item.price_listed || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stale_inventory_${days}days_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Stale Inventory Report
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Filter */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items listed more than:
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
                <option value={730}>2 years</option>
              </select>
            </div>
            <Button onClick={fetchStaleItems} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update'}
            </Button>
            <Button onClick={exportStale} variant="outline" disabled={!data?.items?.length}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>

          {/* Results */}
          {data && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800">
                <strong>{data.total_stale_items?.toLocaleString()}</strong> items have been in inventory for more than <strong>{days} days</strong>
              </p>
            </div>
          )}

          {/* Items Table */}
          {data?.items?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm max-w-xs truncate">{item.title || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.listed_date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-amber-600">
                        {item.days_in_inventory?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.price_listed ? `$${item.price_listed.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.items?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No stale inventory found!</p>
              <p className="text-sm">All items have been listed for less than {days} days.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SalesDataSection;
