import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Receipt,
  Car,
  ChevronRight,
  Upload,
  Plus,
  FileText,
  Trash2
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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

const FinancialsSection = ({ getAuthHeader }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [summary, setSummary] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [income, setIncome] = useState({ entries: [], total_1099: 0, total_other: 0, total: 0 });
  const [cogs, setCogs] = useState({ entries: [], total: 0 });
  const [expenses, setExpenses] = useState({ entries: [], by_category: {}, total: 0, count: 0 });
  const [mileage, setMileage] = useState({ entries: [], total_miles: 0, deduction: 0 });
  const [loading, setLoading] = useState(true);
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [showVendooImport, setShowVendooImport] = useState(false);
  const [showManageData, setShowManageData] = useState(false);
  
  // Show tax prep banner Jan-Apr only
  const showTaxBanner = currentMonth >= 1 && currentMonth <= 4;
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [summaryRes, comparisonRes, incomeRes, cogsRes, expensesRes, mileageRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/summary/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/comparison/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/income/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/cogs/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/expenses/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/mileage/${selectedYear}`, { headers })
      ]);
      
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (comparisonRes.ok) setComparison(await comparisonRes.json());
      if (incomeRes.ok) setIncome(await incomeRes.json());
      if (cogsRes.ok) setCogs(await cogsRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (mileageRes.ok) setMileage(await mileageRes.json());
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
    setLoading(false);
  }, [selectedYear, getAuthHeader]);
  
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
  
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          Financials
        </h2>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Tax Prep Banner (Jan-Apr only) */}
      {showTaxBanner && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧾</span>
            <span className="font-medium text-blue-900">Tax season is here!</span>
          </div>
          <Button
            onClick={() => window.location.href = '/admin/tax-prep'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Start Tax Prep
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="financials-summary-cards">
        <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="gross-sales-card">
          <div className="text-sm text-gray-500 mb-1">Gross Sales</div>
          <div className="text-2xl font-bold text-gray-900" data-testid="gross-sales-amount">
            {formatCurrency(summary?.income?.total)}
          </div>
          {comparison && comparison.previous.gross_sales > 0 && (
            <div className={`text-xs flex items-center gap-1 mt-1 ${
              summary?.income?.total >= comparison.previous.gross_sales ? 'text-green-600' : 'text-red-600'
            }`}>
              {summary?.income?.total >= comparison.previous.gross_sales ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              vs {formatCurrency(comparison.previous.gross_sales)} last year
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">COGS</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary?.cogs)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Deductions</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary?.deductions?.total)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Net Profit</div>
          <div className={`text-2xl font-bold ${summary?.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary?.net_profit)}
          </div>
          {comparison && comparison.previous.profit !== 0 && (
            <div className={`text-xs flex items-center gap-1 mt-1 ${
              summary?.net_profit >= comparison.previous.profit ? 'text-green-600' : 'text-red-600'
            }`}>
              {summary?.net_profit >= comparison.previous.profit ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              vs {formatCurrency(comparison.previous.profit)} last year
            </div>
          )}
        </div>
      </div>

      {/* Year Comparison Graphs Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">Gross Sales</h3>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.income?.total)}</div>
              <div className="text-sm mt-1">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span> {selectedYear}
                <span className="inline-block w-3 h-3 bg-gray-300 rounded ml-3 mr-1"></span> {selectedYear - 1}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">Profit</h3>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <div className={`text-2xl font-bold ${summary?.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary?.net_profit)}
              </div>
              <div className="text-sm mt-1">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span> {selectedYear}
                <span className="inline-block w-3 h-3 bg-gray-300 rounded ml-3 mr-1"></span> {selectedYear - 1}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {/* Sales Data Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('sales')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'sales' ? 'rotate-90' : ''}`} />
              <span className="font-medium text-gray-900">Sales Data</span>
              <span className="text-sm text-gray-500">({formatCurrency(summary?.income?.total)})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); setShowManageData(true); }}
                data-testid="manage-data-btn"
              >
                <Trash2 className="w-4 h-4" />
                Manage
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); setShowVendooImport(true); }}
                data-testid="import-vendoo-btn"
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </div>
          </button>
          
          {expandedSection === 'sales' && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">1099 Income</span>
                  <span className="font-medium">{formatCurrency(summary?.income?.from_1099)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Other Income</span>
                  <span className="font-medium">{formatCurrency(summary?.income?.other)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">COGS</span>
                  <span className="font-medium">-{formatCurrency(summary?.cogs)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-medium">
                  <span>Total Income</span>
                  <span>{formatCurrency(summary?.income?.total)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {income.entries?.length || 0} income entries, {cogs.entries?.length || 0} COGS entries
              </p>
            </div>
          )}
        </div>

        {/* Deductible Expenses Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('expenses')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'expenses' ? 'rotate-90' : ''}`} />
              <Receipt className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Deductible Expenses</span>
              <span className="text-sm text-gray-500">({formatCurrency(expenses.total)} - {expenses.count} items)</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setShowAddExpense(true); }}
            >
              <Plus className="w-4 h-4" />
              Add New
            </Button>
          </button>
          
          {expandedSection === 'expenses' && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2">
                {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => {
                  const catData = expenses.by_category[key];
                  const total = catData?.total || 0;
                  const count = catData?.count || 0;
                  
                  return (
                    <div key={key} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span className={total > 0 ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {total > 0 ? (
                          <>
                            <span className="text-gray-500">{count} items</span>
                            <span className="font-medium w-20 text-right">{formatCurrency(total)}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-medium">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(expenses.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mileage Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('mileage')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'mileage' ? 'rotate-90' : ''}`} />
              <Car className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Mileage</span>
              <span className="text-sm text-gray-500">
                ({formatNumber(mileage.total_miles)} mi - {formatCurrency(mileage.deduction)} deduction)
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setShowAddMileage(true); }}
            >
              <Plus className="w-4 h-4" />
              Add Trip
            </Button>
          </button>
          
          {expandedSection === 'mileage' && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Miles</span>
                  <span className="font-medium">{formatNumber(mileage.total_miles)} mi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IRS Rate ({selectedYear})</span>
                  <span className="font-medium">${mileage.irs_rate}/mi</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-medium">
                  <span>Deduction</span>
                  <span>{formatCurrency(mileage.deduction)}</span>
                </div>
              </div>
              
              {mileage.entries.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Trips</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {mileage.entries.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span className="text-gray-600">{entry.date} - {entry.purpose || 'Business'}</span>
                        <span className="font-medium">{entry.miles} mi</span>
                      </div>
                    ))}
                  </div>
                  {mileage.entries.length > 5 && (
                    <button className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                      View all {mileage.entries.length} trips
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAddExpense(false)}
          onSave={() => { setShowAddExpense(false); fetchData(); }}
        />
      )}

      {/* Add Mileage Modal */}
      {showAddMileage && (
        <AddMileageModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowAddMileage(false)}
          onSave={() => { setShowAddMileage(false); fetchData(); }}
        />
      )}

      {/* Vendoo Import Modal */}
      {showVendooImport && (
        <VendooImportModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowVendooImport(false)}
          onSuccess={() => { setShowVendooImport(false); fetchData(); }}
        />
      )}

      {/* Manage Data Modal */}
      {showManageData && (
        <ManageDataModal
          year={selectedYear}
          income={income}
          cogs={cogs}
          expenses={expenses}
          mileage={mileage}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowManageData(false)}
          onDataChanged={() => { fetchData(); }}
        />
      )}
    </div>
  );
};

// Add Expense Modal Component
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
      
      if (response.ok) {
        onSave();
      }
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
                placeholder="0.00"
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

// Add Mileage Modal Component
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
      
      if (response.ok) {
        onSave();
      }
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
              placeholder="0.0"
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

// Vendoo Import Modal Component
const VendooImportModal = ({ year, getAuthHeader, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or '01'-'12'
  const [importCogs, setImportCogs] = useState(false);
  const [importFees, setImportFees] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = React.useRef(null);

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const handleFileSelect = (e) => {
    e.stopPropagation();
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file');
        setFile(null);
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleBrowseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      formData.append('year', year.toString());
      formData.append('month', selectedMonth);
      formData.append('import_income', 'true');
      formData.append('import_cogs', importCogs.toString());
      formData.append('import_fees_as_expense', importFees.toString());

      const response = await fetch(`${API_URL}/api/financials/vendoo/import`, {
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999, touchAction: 'manipulation' }}
    >
      <div 
        className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Import Vendoo CSV</h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-3 -mr-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Upload your Vendoo sales export for {year}.
        </p>

        {/* Instructions - Collapsible on mobile */}
        <details className="bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <summary className="p-4 text-sm font-medium text-blue-900 cursor-pointer">
            How to export from Vendoo (tap to expand)
          </summary>
          <ol className="px-4 pb-4 text-blue-800 text-sm space-y-1 list-decimal list-inside">
            <li>Go to Inventory in Vendoo</li>
            <li>Click Export to CSV</li>
            <li>Filter by sold date for {year}</li>
            <li>Include: Platform Sold, Sold Date, Price Sold</li>
          </ol>
        </details>

        <div className="space-y-5">
          {/* File Input - Large touch target */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-3">
              Select Your CSV File
            </label>
            
            <label className="block w-full p-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-center rounded-xl cursor-pointer transition-colors min-h-[60px] flex items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="vendoo-file-input"
              />
              <span className="text-lg font-medium">
                {file ? '📄 Change File' : '📁 Choose CSV File'}
              </span>
            </label>
            
            {/* Show selected file */}
            {file && (
              <div className="flex items-center gap-3 p-4 mt-3 bg-green-50 border-2 border-green-300 rounded-xl">
                <FileText className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-700 truncate">{file.name}</p>
                  <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB - Ready to import</p>
                </div>
                <button 
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-green-600 hover:text-green-800 p-3 min-w-[48px] min-h-[48px] flex items-center justify-center"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            )}
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-3">
              Import Sales From:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-4 text-base border-2 border-gray-300 rounded-xl bg-white min-h-[56px]"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>
                  {m.value === 'all' ? `All of ${year}` : `${m.label} ${year}`}
                </option>
              ))}
            </select>
          </div>

          {/* Import Options - Large touch targets */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-600">Optional Settings:</p>
            <label className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer min-h-[56px]">
              <input
                type="checkbox"
                checked={importCogs}
                onChange={(e) => setImportCogs(e.target.checked)}
                className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-base">Import Cost of Goods</span>
            </label>
            <label className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer min-h-[56px]">
              <input
                type="checkbox"
                checked={importFees}
                onChange={(e) => setImportFees(e.target.checked)}
                className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-base">Import marketplace fees</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-base text-red-700">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
              <p className="font-semibold text-green-900 text-lg mb-3">✓ Import Successful!</p>
              <div className="text-base text-green-800 space-y-2">
                <p>• {result.details.rows_processed} sales processed</p>
                <p>• {result.details.income_entries_created} income entries created</p>
                {result.details.cogs_entries_created > 0 && (
                  <p>• {result.details.cogs_entries_created} COGS entries created</p>
                )}
                <p className="font-semibold pt-2 text-lg">Total: ${result.details.total_sales.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Buttons - Large touch targets */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 py-4 text-base min-h-[56px]" 
              onClick={onClose}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button 
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-4 text-base min-h-[56px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={uploading || !file}
                data-testid="vendoo-import-submit"
              >
                {uploading ? 'Importing...' : 'Import Data'}
              </Button>
            )}
            {result && (
              <Button 
                type="button" 
                className="flex-1 py-4 text-base min-h-[56px] bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
                onClick={onSuccess}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Manage Data Modal Component - for deleting imported data
const ManageDataModal = ({ year, income, cogs, expenses, mileage, getAuthHeader, onClose, onDataChanged }) => {
  const [activeTab, setActiveTab] = useState('income');
  const [deleting, setDeleting] = useState(null);

  const deleteEntry = async (type, id) => {
    setDeleting(id);
    try {
      const response = await fetch(`${API_URL}/api/financials/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (response.ok) {
        onDataChanged();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
    setDeleting(null);
  };

  const deleteAllOfType = async (type) => {
    if (!window.confirm(`Delete ALL ${type} entries for ${year}? This cannot be undone.`)) return;
    
    setDeleting('all');
    try {
      const entries = type === 'income' ? income.entries : 
                      type === 'cogs' ? cogs.entries :
                      type === 'expenses' ? expenses.entries : mileage.entries;
      
      for (const entry of entries) {
        await fetch(`${API_URL}/api/financials/${type}/${entry.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
        });
      }
      onDataChanged();
    } catch (error) {
      console.error('Delete all error:', error);
    }
    setDeleting(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const tabs = [
    { id: 'income', label: 'Income', count: income.entries?.length || 0 },
    { id: 'cogs', label: 'COGS', count: cogs.entries?.length || 0 },
    { id: 'expenses', label: 'Expenses', count: expenses.entries?.length || 0 },
    { id: 'mileage', label: 'Mileage', count: mileage.entries?.length || 0 }
  ];

  const renderEntries = () => {
    let entries = [];
    let type = activeTab;

    switch (activeTab) {
      case 'income':
        entries = income.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.platform} - {formatCurrency(e.amount)}</p>
              <p className="text-sm text-gray-500">{formatDate(e.date_received)} {e.is_1099 ? '(1099)' : ''}</p>
            </div>
            <button
              onClick={() => deleteEntry('income', e.id)}
              disabled={deleting === e.id}
              className="ml-3 p-3 text-red-500 hover:bg-red-50 rounded-lg min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              {deleting === e.id ? '...' : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        ));
      case 'cogs':
        entries = cogs.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.source} - {formatCurrency(e.amount)}</p>
              <p className="text-sm text-gray-500">{formatDate(e.date)} • {e.item_count || 0} items</p>
            </div>
            <button
              onClick={() => deleteEntry('cogs', e.id)}
              disabled={deleting === e.id}
              className="ml-3 p-3 text-red-500 hover:bg-red-50 rounded-lg min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              {deleting === e.id ? '...' : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        ));
      case 'expenses':
        entries = expenses.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.category} - {formatCurrency(e.amount)}</p>
              <p className="text-sm text-gray-500">{formatDate(e.date)}</p>
            </div>
            <button
              onClick={() => deleteEntry('expenses', e.id)}
              disabled={deleting === e.id}
              className="ml-3 p-3 text-red-500 hover:bg-red-50 rounded-lg min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              {deleting === e.id ? '...' : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        ));
      case 'mileage':
        entries = mileage.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.miles} miles - {formatCurrency(e.miles * 0.70)}</p>
              <p className="text-sm text-gray-500">{formatDate(e.date)} • {e.purpose || 'Business'}</p>
            </div>
            <button
              onClick={() => deleteEntry('mileage', e.id)}
              disabled={deleting === e.id}
              className="ml-3 p-3 text-red-500 hover:bg-red-50 rounded-lg min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              {deleting === e.id ? '...' : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        ));
      default:
        return null;
    }
  };

  const currentCount = tabs.find(t => t.id === activeTab)?.count || 0;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999, touchAction: 'manipulation' }}
    >
      <div 
        className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-semibold">Manage Data - {year}</h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-3 -mr-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap min-h-[48px] ${
                activeTab === tab.id 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No {activeTab} entries for {year}
            </div>
          ) : (
            <div className="space-y-2">
              {renderEntries()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 py-3 min-h-[48px]" 
            onClick={onClose}
          >
            Done
          </Button>
          {currentCount > 0 && (
            <Button 
              type="button"
              onClick={() => deleteAllOfType(activeTab)}
              className="flex-1 py-3 min-h-[48px] bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting === 'all'}
            >
              {deleting === 'all' ? 'Deleting...' : `Delete All ${activeTab}`}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FinancialsSection;
