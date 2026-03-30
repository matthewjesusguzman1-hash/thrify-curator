import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Receipt,
  Car,
  ChevronRight,
  Upload,
  Plus,
  FileText
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
  const [expenses, setExpenses] = useState({ entries: [], by_category: {}, total: 0, count: 0 });
  const [mileage, setMileage] = useState({ entries: [], total_miles: 0, deduction: 0 });
  const [loading, setLoading] = useState(true);
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMileage, setShowAddMileage] = useState(false);
  
  // Show tax prep banner Jan-Apr only
  const showTaxBanner = currentMonth >= 1 && currentMonth <= 4;
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [summaryRes, comparisonRes, expensesRes, mileageRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/summary/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/comparison/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/expenses/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/mileage/${selectedYear}`, { headers })
      ]);
      
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (comparisonRes.ok) setComparison(await comparisonRes.json());
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Gross Sales</div>
          <div className="text-2xl font-bold text-gray-900">
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
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
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
                <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(summary?.income?.total)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Import your Vendoo CSV export to automatically populate sales data.
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

export default FinancialsSection;
