import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Receipt,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  Trash2,
  Camera,
  Pencil,
  Calculator,
  Calendar
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Expense category labels for deductions
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

const TaxesSection = ({ getAuthHeader }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expenses, setExpenses] = useState({ entries: [], by_category: {}, total: 0, count: 0 });
  const [mileageData, setMileageData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Expanded sections
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // Show tax prep banner Jan-Apr only
  const showTaxBanner = currentMonth >= 1 && currentMonth <= 4;
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [expensesRes, mileageRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/expenses/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/admin/mileage/summary/${selectedYear}`, { headers }).catch(() => null)
      ]);
      
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (mileageRes?.ok) setMileageData(await mileageRes.json());
    } catch (error) {
      console.error('Error fetching tax data:', error);
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

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/financials/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  // Calculate estimated tax savings (simplified - assumes 25% tax bracket)
  const estimatedTaxSavings = (expenses.total || 0) * 0.25;
  
  // Calculate mileage deduction
  const mileageDeduction = mileageData?.total_miles ? mileageData.total_miles * 0.67 : 0; // 2024 IRS rate

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
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-400" />
          Taxes & Deductions
        </h2>
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
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
          <div className="text-sm text-gray-500 mb-1">Total Deductions</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(expenses.total)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{expenses.count || 0} expenses</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Mileage Deduction</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(mileageDeduction)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {mileageData?.total_miles?.toLocaleString() || 0} miles @ $0.67
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Total Tax Write-offs</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency((expenses.total || 0) + mileageDeduction)}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Est. Tax Savings</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(estimatedTaxSavings + (mileageDeduction * 0.25))}
          </div>
          <div className="text-xs text-gray-500 mt-1">~25% bracket</div>
        </div>
      </div>

      {/* Add Expense Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowAddExpense(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
        <Button
          onClick={() => window.location.href = '/admin/tax-prep'}
          variant="outline"
          className="border-gray-300"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Tax Prep Wizard
        </Button>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">Deductions by Category</h3>
        </div>
        
        {Object.keys(expenses.by_category || {}).length > 0 ? (
          <div className="divide-y">
            {Object.entries(expenses.by_category || {}).map(([category, data]) => {
              const categoryInfo = CATEGORY_LABELS[category] || { label: category, icon: '📁' };
              const isExpanded = expandedCategory === category;
              
              return (
                <div key={category}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{categoryInfo.icon}</span>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{categoryInfo.label}</p>
                        <p className="text-xs text-gray-500">{data.count} expense{data.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{formatCurrency(data.total)}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && data.entries && (
                    <div className="bg-gray-50 px-4 py-2 space-y-2">
                      {data.entries.map(expense => (
                        <div 
                          key={expense.id}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {expense.description || expense.vendor}
                            </p>
                            <p className="text-xs text-gray-500">
                              {expense.date} • {expense.vendor}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                            <button
                              onClick={() => setEditingExpense(expense)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No expenses recorded for {selectedYear}</p>
            <p className="text-sm mt-1">Add your business expenses to maximize your deductions</p>
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      {(showAddExpense || editingExpense) && (
        <ExpenseModal
          expense={editingExpense}
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => {
            setShowAddExpense(false);
            setEditingExpense(null);
          }}
          onSave={() => {
            setShowAddExpense(false);
            setEditingExpense(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// ==================== EXPENSE MODAL ====================
const ExpenseModal = ({ expense, year, getAuthHeader, onClose, onSave }) => {
  const [form, setForm] = useState({
    description: expense?.description || '',
    vendor: expense?.vendor || '',
    amount: expense?.amount || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || 'other',
    notes: expense?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!form.description || !form.amount) {
      setError('Description and amount are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = expense 
        ? `${API_URL}/api/financials/expenses/${expense.id}`
        : `${API_URL}/api/financials/expenses`;
      
      const res = await fetch(url, {
        method: expense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          year: year
        })
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to save expense');
      }
    } catch (err) {
      setError('Failed to save expense');
    }
    setSaving(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-semibold mb-4">
          {expense ? 'Edit Expense' : 'Add Expense'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Poly mailers from Amazon"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="e.g., Amazon, Staples"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                <option key={key} value={key}>{icon} {label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional details..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : (expense ? 'Update' : 'Add Expense')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaxesSection;
