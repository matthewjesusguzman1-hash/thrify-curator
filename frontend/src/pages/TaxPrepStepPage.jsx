import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  DollarSign,
  Receipt,
  Car,
  Upload,
  Download,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Platform options
const PLATFORMS = [
  { value: 'ebay', label: 'eBay', icon: '🏷️' },
  { value: 'poshmark', label: 'Poshmark', icon: '👗' },
  { value: 'mercari', label: 'Mercari', icon: '📦' },
  { value: 'depop', label: 'Depop', icon: '🛍️' },
  { value: 'etsy', label: 'Etsy', icon: '🎨' },
  { value: 'fb_marketplace', label: 'FB Marketplace', icon: '📱' },
  { value: 'in_person', label: 'In-Person Sales', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '📋' }
];

// Expense category labels
const CATEGORY_LABELS = {
  shipping_supplies: { label: 'Shipping Supplies', icon: '📦' },
  software_subscriptions: { label: 'Software & Subscriptions', icon: '💻' },
  equipment: { label: 'Equipment', icon: '📸' },
  home_office: { label: 'Home Office', icon: '🏠' },
  phone_internet: { label: 'Phone & Internet', icon: '📱' },
  business_licenses: { label: 'Business Licenses', icon: '🏷️' },
  education_training: { label: 'Education & Training', icon: '📚' },
  bank_payment_fees: { label: 'Bank & Payment Fees', icon: '🏦' },
  vehicle_non_mileage: { label: 'Vehicle (non-mileage)', icon: '🚙' },
  office_supplies: { label: 'Office Supplies', icon: '📋' },
  packaging_materials: { label: 'Packaging Materials', icon: '🎁' },
  advertising_marketing: { label: 'Advertising & Marketing', icon: '📣' },
  repairs_maintenance: { label: 'Repairs & Maintenance', icon: '🔧' },
  professional_services: { label: 'Professional Services', icon: '💼' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  travel: { label: 'Travel', icon: '✈️' },
  meals: { label: 'Meals (business)', icon: '🍽️' },
  storage_warehouse: { label: 'Storage/Warehouse', icon: '🏬' },
  other: { label: 'Other', icon: '📁' }
};

const TaxPrepStepPage = () => {
  const navigate = useNavigate();
  const { step } = useParams();
  const [searchParams] = useSearchParams();
  const stepNum = parseInt(step);
  const currentYear = new Date().getFullYear();
  // Get year from URL param, fallback to current year
  const urlYear = searchParams.get('year');
  const [selectedYear] = useState(urlYear ? parseInt(urlYear) : currentYear);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [income, setIncome] = useState({ entries: [], total_1099: 0, total_other: 0, total: 0 });
  const [cogs, setCogs] = useState({ entries: [], total: 0 });
  const [expenses, setExpenses] = useState({ entries: [], by_category: {}, total: 0 });
  const [mileage, setMileage] = useState({ entries: [], total_miles: 0, deduction: 0 });
  const [documents, setDocuments] = useState({ documents: [] });
  const [summary, setSummary] = useState(null);
  
  // Modal states
  const [showAdd1099, setShowAdd1099] = useState(false);
  const [showAddOther, setShowAddOther] = useState(false);
  const [showAddCogs, setShowAddCogs] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMileage, setShowAddMileage] = useState(false);
  
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const endpoints = {
        1: [`/api/financials/income/${selectedYear}`],
        2: [`/api/financials/cogs/${selectedYear}`],
        3: [`/api/financials/expenses/${selectedYear}`, `/api/financials/mileage/${selectedYear}`],
        4: [`/api/financials/documents/${selectedYear}`],
        5: [`/api/financials/summary/${selectedYear}`]
      };
      
      const urls = endpoints[stepNum] || [];
      const responses = await Promise.all(
        urls.map(url => fetch(`${API_URL}${url}`, { headers }))
      );
      
      if (stepNum === 1 && responses[0]?.ok) setIncome(await responses[0].json());
      if (stepNum === 2 && responses[0]?.ok) setCogs(await responses[0].json());
      if (stepNum === 3) {
        if (responses[0]?.ok) setExpenses(await responses[0].json());
        if (responses[1]?.ok) setMileage(await responses[1].json());
      }
      if (stepNum === 4 && responses[0]?.ok) setDocuments(await responses[0].json());
      if (stepNum === 5 && responses[0]?.ok) setSummary(await responses[0].json());
      
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, [stepNum, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const markStepComplete = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/financials/tax-prep/progress/${selectedYear}?step=${stepNum}&complete=true`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      
      if (stepNum < 5) {
        navigate(`/admin/tax-prep/step/${stepNum + 1}?year=${selectedYear}`);
      } else {
        navigate('/admin/tax-prep');
      }
    } catch (error) {
      console.error('Error marking step complete:', error);
    }
    setSaving(false);
  };

  const deleteEntry = async (type, id) => {
    try {
      await fetch(`${API_URL}/api/financials/${type}/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const stepTitles = {
    1: 'Income',
    2: 'Cost of Goods',
    3: 'Deductions',
    4: 'Documents',
    5: 'Generate Reports'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/admin/tax-prep?year=${selectedYear}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Tax Prep
            </button>
            <span className="text-sm text-gray-500">Step {stepNum} of 5</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Step {stepNum}: {stepTitles[stepNum]}
        </h1>

        {/* Step 1: Income */}
        {stepNum === 1 && (
          <div className="space-y-6">
            {/* 1099s Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  1099s Received
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAdd1099(true)}
                  data-testid="add-1099-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add 1099
                </Button>
              </div>
              
              <div className="p-4">
                {income.entries.filter(e => e.is_1099).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No 1099s added yet</p>
                ) : (
                  <div className="space-y-2">
                    {income.entries.filter(e => e.is_1099).map(entry => {
                      const platform = PLATFORMS.find(p => p.value === entry.platform);
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{platform?.icon}</span>
                            <div>
                              <div className="font-medium">{platform?.label}</div>
                              {entry.date_received && (
                                <div className="text-sm text-gray-500">Received: {entry.date_received}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatCurrency(entry.amount)}</span>
                            <button
                              onClick={() => deleteEntry('income', entry.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                      <span>1099 Total</span>
                      <span>{formatCurrency(income.total_1099)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Other Income Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  Other Income (No 1099)
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddOther(true)}
                  data-testid="add-other-income-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="p-4">
                {income.entries.filter(e => !e.is_1099).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No other income added</p>
                ) : (
                  <div className="space-y-2">
                    {income.entries.filter(e => !e.is_1099).map(entry => {
                      const platform = PLATFORMS.find(p => p.value === entry.platform);
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{platform?.icon}</span>
                            <div>
                              <div className="font-medium">{platform?.label}</div>
                              {entry.notes && (
                                <div className="text-sm text-gray-500">{entry.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatCurrency(entry.amount)}</span>
                            <button
                              onClick={() => deleteEntry('income', entry.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                      <span>Other Total</span>
                      <span>{formatCurrency(income.total_other)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4" data-testid="total-income-section">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-blue-900">TOTAL INCOME</span>
                <span className="text-blue-600" data-testid="total-income-amount">{formatCurrency(income.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: COGS */}
        {stepNum === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-gray-500" />
                  Inventory Purchases
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddCogs(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Purchase
                </Button>
              </div>
              
              <div className="p-4">
                {cogs.entries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">No inventory purchases recorded</p>
                    <p className="text-sm text-gray-400">
                      If you sell on consignment only, your COGS may be $0
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cogs.entries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{entry.source}</div>
                          <div className="text-sm text-gray-500">
                            {entry.date}
                            {entry.item_count && ` - ${entry.item_count} items`}
                            {entry.description && ` - ${entry.description}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCurrency(entry.amount)}</span>
                          <button
                            onClick={() => deleteEntry('cogs', entry.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-blue-900">TOTAL COGS</span>
                <span className="text-blue-600">{formatCurrency(cogs.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Deductions */}
        {stepNum === 3 && (
          <div className="space-y-6">
            {/* Mileage */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Car className="w-5 h-5 text-gray-500" />
                  Mileage
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddMileage(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Trip
                </Button>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{mileage.total_miles.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Miles</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">${mileage.irs_rate}</div>
                    <div className="text-sm text-gray-500">IRS Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(mileage.deduction)}</div>
                    <div className="text-sm text-gray-500">Deduction</div>
                  </div>
                </div>
                
                {mileage.entries.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 max-h-48 overflow-y-auto">
                    {mileage.entries.slice(0, 10).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-600">{entry.date} - {entry.purpose || 'Business'}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.miles} mi</span>
                          <button
                            onClick={() => deleteEntry('mileage', entry.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-gray-500" />
                  Expenses by Category
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddExpense(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Expense
                </Button>
              </div>
              
              <div className="p-4">
                <div className="space-y-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => {
                    const catData = expenses.by_category[key];
                    const total = catData?.total || 0;
                    const count = catData?.count || 0;
                    
                    if (total === 0) {
                      return (
                        <div key={key} className="flex items-center justify-between py-2 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <span>{icon}</span>
                            <span>{label}</span>
                          </div>
                          <span>--</span>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={key} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          <span className="text-gray-900">{label}</span>
                          <span className="text-gray-500">({count})</span>
                        </div>
                        <span className="font-medium">{formatCurrency(total)}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="pt-4 border-t border-gray-200 flex justify-between font-semibold">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(expenses.total)}</span>
                </div>
              </div>
            </div>

            {/* Total Deductions */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-blue-900">TOTAL DEDUCTIONS</span>
                <span className="text-blue-600">{formatCurrency(expenses.total + mileage.deduction)}</span>
              </div>
              <div className="text-sm text-blue-700 mt-1">
                (Mileage: {formatCurrency(mileage.deduction)} + Expenses: {formatCurrency(expenses.total)})
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {stepNum === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Upload Additional Documents</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Add any documents your accountant may need
                </p>
              </div>
              
              <div className="p-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
                  <p className="text-sm text-gray-400">PDF, JPEG, PNG up to 10MB</p>
                  <input type="file" className="hidden" />
                  <Button variant="outline" className="mt-4">
                    Browse Files
                  </Button>
                </div>
                
                {documents.documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {documents.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="font-medium">{doc.filename}</div>
                            <div className="text-sm text-gray-500">{doc.document_type}</div>
                          </div>
                        </div>
                        <button className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Generate Reports */}
        {stepNum === 5 && summary && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 text-lg mb-4">Tax Summary - {selectedYear}</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Gross Income</span>
                  <span className="font-medium">{formatCurrency(summary.income?.total)}</span>
                </div>
                <div className="flex justify-between py-2 pl-4 text-sm text-gray-500">
                  <span>• 1099 Income</span>
                  <span>{formatCurrency(summary.income?.from_1099)}</span>
                </div>
                <div className="flex justify-between py-2 pl-4 text-sm text-gray-500">
                  <span>• Other Income</span>
                  <span>{formatCurrency(summary.income?.other)}</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Cost of Goods Sold</span>
                  <span className="font-medium">-{formatCurrency(summary.cogs)}</span>
                </div>
                
                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="text-gray-900 font-medium">Gross Profit</span>
                  <span className="font-semibold">{formatCurrency(summary.gross_profit)}</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Deductions</span>
                  <span className="font-medium">-{formatCurrency(summary.deductions?.total)}</span>
                </div>
                <div className="flex justify-between py-2 pl-4 text-sm text-gray-500">
                  <span>• Mileage ({summary.deductions?.mileage_miles} mi × ${summary.deductions?.mileage_rate})</span>
                  <span>{formatCurrency(summary.deductions?.mileage)}</span>
                </div>
                <div className="flex justify-between py-2 pl-4 text-sm text-gray-500">
                  <span>• Expenses</span>
                  <span>{formatCurrency(summary.deductions?.expenses)}</span>
                </div>
                
                <div className="flex justify-between py-3 border-t-2 border-gray-300 text-lg">
                  <span className="font-bold text-gray-900">NET PROFIT</span>
                  <span className={`font-bold ${summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.net_profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Download Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Download Reports</h2>
              
              <div className="space-y-3">
                <Button 
                  className="w-full justify-between" 
                  variant="outline"
                  onClick={() => window.open(`${API_URL}/api/financials/tax-summary/${selectedYear}/download?format=pdf`, '_blank')}
                  data-testid="download-tax-summary-pdf"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Tax Summary (Schedule C)
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">PDF</span>
                </Button>
                
                <Button 
                  className="w-full justify-between" 
                  variant="outline"
                  onClick={() => window.open(`${API_URL}/api/financials/tax-summary/${selectedYear}/download?format=csv`, '_blank')}
                  data-testid="download-tax-summary-csv"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Tax Summary (Schedule C)
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">CSV</span>
                </Button>
              </div>
            </div>

            {/* 1099-NEC Section */}
            <Form1099Section year={selectedYear} getAuthHeader={getAuthHeader} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/admin/tax-prep?year=${selectedYear}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={markStepComplete}
            disabled={saving}
          >
            {saving ? 'Saving...' : stepNum === 5 ? 'Complete' : 'Save & Continue'}
            {stepNum < 5 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      {/* Modals */}
      {showAdd1099 && (
        <AddIncomeModal
          year={selectedYear}
          is1099={true}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAdd1099(false)}
          onSave={() => { setShowAdd1099(false); fetchData(); }}
        />
      )}
      
      {showAddOther && (
        <AddIncomeModal
          year={selectedYear}
          is1099={false}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAddOther(false)}
          onSave={() => { setShowAddOther(false); fetchData(); }}
        />
      )}
      
      {showAddCogs && (
        <AddCOGSModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAddCogs(false)}
          onSave={() => { setShowAddCogs(false); fetchData(); }}
        />
      )}
      
      {showAddExpense && (
        <AddExpenseModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAddExpense(false)}
          onSave={() => { setShowAddExpense(false); fetchData(); }}
        />
      )}
      
      {showAddMileage && (
        <AddMileageModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAddMileage(false)}
          onSave={() => { setShowAddMileage(false); fetchData(); }}
        />
      )}
    </div>
  );
};

// Modal Components
const AddIncomeModal = ({ year, is1099, getAuthHeader, onClose, onSave }) => {
  const [platform, setPlatform] = useState('ebay');
  const [amount, setAmount] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/income`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          platform,
          amount: parseFloat(amount),
          is_1099: is1099,
          date_received: dateReceived || null,
          notes
        })
      });
      
      if (response.ok) onSave();
    } catch (error) {
      console.error('Error saving income:', error);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          {is1099 ? 'Add 1099' : 'Add Other Income'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          
          {is1099 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
          
          {!is1099 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Cash sales at markets"
              />
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddCOGSModal = ({ year, getAuthHeader, onClose, onSave }) => {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [itemCount, setItemCount] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/cogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          date,
          source,
          description,
          amount: parseFloat(amount),
          item_count: itemCount ? parseInt(itemCount) : null
        })
      });
      
      if (response.ok) onSave();
    } catch (error) {
      console.error('Error saving COGS:', error);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Inventory Purchase</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Estate Sale, Goodwill, Auction"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Count (optional)</label>
            <input
              type="number"
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Number of items"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Clothing lot, Vintage items"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddExpenseModal = ({ year, getAuthHeader, onClose, onSave }) => {
  const [category, setCategory] = useState('shipping_supplies');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          category,
          amount: parseFloat(amount),
          date,
          description
        })
      });
      
      if (response.ok) onSave();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                <option key={key} value={key}>{icon} {label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Poly mailers - Amazon"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddMileageModal = ({ year, getAuthHeader, onClose, onSave }) => {
  const [miles, setMiles] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/mileage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          date,
          miles: parseFloat(miles),
          purpose
        })
      });
      
      if (response.ok) onSave();
    } catch (error) {
      console.error('Error saving mileage:', error);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Mileage</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miles</label>
            <input
              type="number"
              step="0.1"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose (optional)</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Sourcing trip, Post office"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 1099-NEC Section Component
const Form1099Section = ({ year, getAuthHeader }) => {
  const [loading, setLoading] = useState(true);
  const [eligibleData, setEligibleData] = useState(null);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    fetchEligible();
  }, [year]);

  const fetchEligible = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/financials/1099/eligible/${year}`, {
        headers: { ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setEligibleData(data);
      }
    } catch (error) {
      console.error('Error fetching 1099 eligible:', error);
    }
    setLoading(false);
  };

  const download1099 = (email, name) => {
    setGenerating(email);
    window.open(`${API_URL}/api/financials/1099/generate/${year}/${encodeURIComponent(email)}`, '_blank');
    setTimeout(() => setGenerating(null), 1000);
  };

  const downloadBatch = () => {
    setGenerating('batch');
    window.open(`${API_URL}/api/financials/1099/batch/${year}`, '_blank');
    setTimeout(() => setGenerating(null), 1000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">1099-NEC Forms</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="form-1099-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">1099-NEC Forms</h2>
        {eligibleData?.eligible_count > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={downloadBatch}
            disabled={generating === 'batch'}
            data-testid="download-batch-1099"
          >
            <Download className="w-4 h-4 mr-1" />
            {generating === 'batch' ? 'Generating...' : 'Download All'}
          </Button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
        <p className="text-blue-800">
          <strong>IRS Requirement:</strong> You must issue a 1099-NEC to anyone you paid $600 or more 
          for services during the tax year. This includes consignors who received payouts.
        </p>
      </div>

      {eligibleData?.eligible_count === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No consignors received $600+ in payouts for {year}.</p>
          <p className="text-sm mt-1">No 1099-NEC forms required.</p>
          {eligibleData?.below_threshold_count > 0 && (
            <p className="text-xs mt-3 text-gray-400">
              {eligibleData.below_threshold_count} consignor(s) received payouts below the $600 threshold.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{eligibleData?.eligible_count}</div>
              <div className="text-xs text-gray-500">Recipients</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${eligibleData?.total_to_report?.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total to Report</div>
            </div>
          </div>

          {/* Recipient List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 grid grid-cols-3">
              <span>Recipient</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {eligibleData?.eligible_recipients?.map((recipient) => (
                <div key={recipient.email} className="px-4 py-3 grid grid-cols-3 items-center">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{recipient.name}</div>
                    <div className="text-xs text-gray-500">{recipient.email}</div>
                  </div>
                  <div className="text-right font-medium text-gray-900">
                    ${recipient.total_paid.toLocaleString()}
                  </div>
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => download1099(recipient.email, recipient.name)}
                      disabled={generating === recipient.email}
                      data-testid={`download-1099-${recipient.email}`}
                    >
                      {generating === recipient.email ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* W-9 Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <p className="text-yellow-800">
              <strong>Note:</strong> Before filing official 1099-NEC forms with the IRS, you'll need 
              W-9 forms from each recipient to obtain their Tax ID (SSN/EIN). The downloaded forms 
              show "XXX-XX-XXXX" as a placeholder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxPrepStepPage;
