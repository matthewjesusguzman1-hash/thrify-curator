import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  Package, 
  Upload, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  X,
  Check,
  AlertCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const InventorySection = ({ getAuthHeader }) => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 0 });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  
  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/inventory/summary`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        setSummary(await res.json());
      }
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
    }
  }, [getAuthHeader]);
  
  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sort_by: 'imported_at',
        sort_order: 'desc'
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (platformFilter) params.append('platform', platformFilter);
      
      const res = await fetch(`${API_URL}/api/inventory/items?${params}`, {
        headers: { ...getAuthHeader() }
      });
      
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
    setLoading(false);
  }, [getAuthHeader, searchQuery, statusFilter, platformFilter]);
  
  useEffect(() => {
    fetchSummary();
    fetchItems();
  }, [fetchSummary, fetchItems]);
  
  const handleSearch = () => {
    fetchItems(1);
  };
  
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-purple-400" />
          Inventory
        </h2>
        <Button
          onClick={() => setShowImportModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          data-testid="import-inventory-btn"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-white/60 text-sm">Total Items</p>
            <p className="text-2xl font-bold text-white">{summary.total_items.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-white/60 text-sm">Sold Items</p>
            <p className="text-2xl font-bold text-green-400">{summary.sold_summary?.count?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-white/60 text-sm">Total Revenue</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.sold_summary?.total_revenue)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-white/60 text-sm">Total Profit</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.sold_summary?.total_profit)}</p>
          </div>
        </div>
      )}
      
      {/* Platform Breakdown */}
      {summary && Object.keys(summary.by_platform || {}).length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">By Platform</h3>
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
      
      {/* Search & Filters */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, SKU, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              data-testid="inventory-search"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            data-testid="status-filter"
          >
            <option value="">All Status</option>
            <option value="sold">Sold</option>
            <option value="listed">Listed</option>
            <option value="unlisted">Unlisted</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); }}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            data-testid="platform-filter"
          >
            <option value="">All Platforms</option>
            <option value="ebay">eBay</option>
            <option value="poshmark">Poshmark</option>
            <option value="mercari">Mercari</option>
            <option value="depop">Depop</option>
            <option value="facebook">Facebook</option>
          </select>
          <Button
            onClick={() => handleSearch()}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="search-btn"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Items Table */}
      <div className="bg-white rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No inventory items found</p>
            <p className="text-gray-400 text-sm mt-1">Import your Vendoo CSV to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                      data-testid={`inventory-row-${item.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate font-medium text-gray-900">{item.title || '-'}</div>
                        {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.platform || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status?.toLowerCase().includes('sold') 
                            ? 'bg-green-100 text-green-800'
                            : item.status?.toLowerCase().includes('listed')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(item.sold_date)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(item.price_sold)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.cogs)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(item.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchItems(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchItems(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          getAuthHeader={getAuthHeader}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchSummary();
            fetchItems(1);
          }}
        />
      )}
      
      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

// Import Modal Component
const ImportModal = ({ getAuthHeader, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Import Inventory CSV</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800 text-sm">
            <strong>New Importer!</strong> This will import ALL rows from your CSV without filtering. 
            Each item is stored individually so you can analyze and filter the data later.
          </p>
        </div>
        
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <label className="block w-full p-4 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg cursor-pointer transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="inventory-file-input"
              />
              <Upload className="w-5 h-5 mx-auto mb-1" />
              {file ? file.name : 'Choose CSV File'}
            </label>
            {file && (
              <p className="text-sm text-gray-500 mt-2">
                Size: {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">{result.message}</p>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>• Rows processed: {result.details?.rows_processed?.toLocaleString()}</li>
                    <li>• Rows skipped: {result.details?.rows_skipped?.toLocaleString()}</li>
                    <li>• File size: {result.details?.file_size_kb} KB</li>
                  </ul>
                  {result.columns_detected && (
                    <details className="mt-3">
                      <summary className="text-sm text-green-600 cursor-pointer">
                        View detected columns ({result.columns_detected.total_columns})
                      </summary>
                      <div className="mt-2 text-xs text-green-700 bg-green-100 p-2 rounded max-h-32 overflow-y-auto">
                        {result.columns_detected.columns?.join(', ')}
                      </div>
                    </details>
                  )}
                </div>
              </div>
              <Button
                onClick={onSuccess}
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          )}
          
          {/* Submit */}
          {!result && (
            <Button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              data-testid="import-submit-btn"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import All Data
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Item Detail Modal
const ItemDetailModal = ({ item, onClose }) => {
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Item Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Main Info */}
          <div>
            <h4 className="font-medium text-gray-900 text-lg">{item.title || 'Untitled'}</h4>
            {item.sku && <p className="text-gray-500">SKU: {item.sku}</p>}
          </div>
          
          {/* Status & Platform */}
          <div className="flex gap-4">
            {item.status && (
              <span className={`px-3 py-1 text-sm rounded-full ${
                item.status.toLowerCase().includes('sold') 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {item.status}
              </span>
            )}
            {item.platform && (
              <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                {item.platform}
              </span>
            )}
          </div>
          
          {/* Financial Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 uppercase">Price Sold</p>
              <p className="font-semibold text-gray-900">
                {item.price_sold ? `$${item.price_sold.toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">COGS</p>
              <p className="font-semibold text-gray-900">
                {item.cogs ? `$${item.cogs.toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Fees</p>
              <p className="font-semibold text-gray-900">
                {item.fees ? `$${item.fees.toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Profit</p>
              <p className="font-semibold text-green-600">
                {item.profit ? `$${item.profit.toFixed(2)}` : '-'}
              </p>
            </div>
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            {item.sold_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Sold Date</p>
                <p className="text-gray-900">{item.sold_date}</p>
              </div>
            )}
            {item.listed_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Listed Date</p>
                <p className="text-gray-900">{item.listed_date}</p>
              </div>
            )}
            {item.created_date && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Created Date</p>
                <p className="text-gray-900">{item.created_date}</p>
              </div>
            )}
          </div>
          
          {/* Additional Details */}
          {(item.category || item.brand || item.size || item.color) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {item.category && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Category</p>
                  <p className="text-gray-900">{item.category}</p>
                </div>
              )}
              {item.brand && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Brand</p>
                  <p className="text-gray-900">{item.brand}</p>
                </div>
              )}
              {item.size && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Size</p>
                  <p className="text-gray-900">{item.size}</p>
                </div>
              )}
              {item.color && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Color</p>
                  <p className="text-gray-900">{item.color}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Raw Data */}
          {item.raw_data && Object.keys(item.raw_data).length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                View Raw CSV Data ({Object.keys(item.raw_data).length} fields)
              </summary>
              <div className="mt-2 p-4 bg-gray-100 rounded-lg max-h-60 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(item.raw_data, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InventorySection;
