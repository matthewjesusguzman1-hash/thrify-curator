import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Receipt,
  Car,
  ChevronRight,
  ChevronDown,
  Upload,
  Plus,
  FileText,
  Trash2,
  Camera,
  Pencil
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  const [prevYearIncome, setPrevYearIncome] = useState({ entries: [] });
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
  const [showScreenshotImport, setShowScreenshotImport] = useState(false);
  
  // Show tax prep banner Jan-Apr only
  const showTaxBanner = currentMonth >= 1 && currentMonth <= 4;
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [summaryRes, comparisonRes, incomeRes, prevIncomeRes, cogsRes, expensesRes, mileageRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/summary/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/comparison/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/income/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/income/${selectedYear - 1}`, { headers }),
        fetch(`${API_URL}/api/financials/cogs/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/expenses/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/mileage/${selectedYear}`, { headers })
      ]);
      
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (comparisonRes.ok) setComparison(await comparisonRes.json());
      if (incomeRes.ok) setIncome(await incomeRes.json());
      if (prevIncomeRes.ok) setPrevYearIncome(await prevIncomeRes.json());
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

  // Get monthly chart data for current year and previous year
  const getMonthlyChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((month, index) => ({
      month,
      monthIndex: index + 1,
      grossRevenue: 0,
      netProfit: 0,
      prevGrossRevenue: 0,
      prevNetProfit: 0
    }));

    // Process current year income entries
    (income.entries || []).forEach(entry => {
      const date = new Date(entry.date_received);
      const monthIndex = date.getMonth();
      
      if (entry.platform === 'profit' || entry.notes?.includes('Net Profit')) {
        data[monthIndex].netProfit += entry.amount;
      } else {
        data[monthIndex].grossRevenue += entry.amount;
      }
    });

    // Process previous year income entries
    (prevYearIncome.entries || []).forEach(entry => {
      const date = new Date(entry.date_received);
      const monthIndex = date.getMonth();
      
      if (entry.platform === 'profit' || entry.notes?.includes('Net Profit')) {
        data[monthIndex].prevNetProfit += entry.amount;
      } else {
        data[monthIndex].prevGrossRevenue += entry.amount;
      }
    });

    // For current year, set future months (no data) to null so lines don't show
    // Find the last month with data for current year
    let lastMonthWithData = -1;
    for (let i = 11; i >= 0; i--) {
      if (data[i].grossRevenue > 0 || data[i].netProfit > 0) {
        lastMonthWithData = i;
        break;
      }
    }
    
    // Set months after last data month to null (won't render on chart)
    for (let i = lastMonthWithData + 1; i < 12; i++) {
      data[i].grossRevenue = null;
      data[i].netProfit = null;
    }

    return data;
  };

  const monthlyChartData = getMonthlyChartData();

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
          <DollarSign className="w-6 h-6 text-green-400" />
          Finances
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

      {/* Monthly Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2">{selectedYear} vs {selectedYear - 1} Monthly Comparison</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-blue-600"></span> {selectedYear} Gross
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-green-600"></span> {selectedYear} Profit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-blue-300" style={{borderBottom: '2px dashed'}}></span> {selectedYear - 1} Gross
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-green-300" style={{borderBottom: '2px dashed'}}></span> {selectedYear - 1} Profit
          </span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const labels = {
                    grossRevenue: `${selectedYear} Gross`,
                    netProfit: `${selectedYear} Profit`,
                    prevGrossRevenue: `${selectedYear - 1} Gross`,
                    prevNetProfit: `${selectedYear - 1} Profit`
                  };
                  return [`$${value.toLocaleString()}`, labels[name] || name];
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              {/* Current Year - Solid thick lines */}
              <Line 
                type="monotone"
                dataKey="grossRevenue" 
                name="grossRevenue"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              <Line 
                type="monotone"
                dataKey="netProfit" 
                name="netProfit"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              {/* Previous Year - Dashed lighter lines */}
              <Line 
                type="monotone"
                dataKey="prevGrossRevenue" 
                name="prevGrossRevenue"
                stroke="#93c5fd"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#93c5fd', strokeWidth: 1, r: 3 }}
              />
              <Line 
                type="monotone"
                dataKey="prevNetProfit" 
                name="prevNetProfit"
                stroke="#86efac"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#86efac', strokeWidth: 1, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year Summary with 2025 Comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">{selectedYear} vs {selectedYear - 1} Comparison</h3>
        
        {/* Current Year Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">{selectedYear} Gross Sales</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(summary?.income?.total)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600 font-medium">{selectedYear} Net Profit</p>
            <p className="text-xl font-bold text-green-700">
              {formatCurrency(summary?.income?.recorded_profit || summary?.net_profit)}
            </p>
          </div>
        </div>

        {/* Previous Year Comparison */}
        {comparison && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">{selectedYear - 1} Comparison</p>
            
            {/* YTD Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Same Period ({comparison.ytd_label || 'YTD'})</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(comparison.previous_ytd?.gross_sales || 0)}
                </p>
                {comparison.previous_ytd?.gross_sales > 0 && (
                  <p className={`text-xs mt-1 ${
                    summary?.income?.total >= comparison.previous_ytd.gross_sales ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary?.income?.total >= comparison.previous_ytd.gross_sales ? '↑' : '↓'} 
                    {' '}{Math.abs(Math.round(((summary?.income?.total - comparison.previous_ytd.gross_sales) / comparison.previous_ytd.gross_sales) * 100))}% vs YTD
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Full Year {selectedYear - 1}</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(comparison.previous?.gross_sales || 0)}
                </p>
                {comparison.previous?.gross_sales > 0 && (
                  <p className={`text-xs mt-1 ${
                    summary?.income?.total >= comparison.previous.gross_sales ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round((summary?.income?.total / comparison.previous.gross_sales) * 100)}% of full year
                  </p>
                )}
              </div>
            </div>

            {/* Profit Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Profit ({comparison.ytd_label || 'YTD'})</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(comparison.previous_ytd?.profit || 0)}
                </p>
                {comparison.previous_ytd?.profit > 0 && (
                  <p className={`text-xs mt-1 ${
                    (summary?.income?.recorded_profit || summary?.net_profit) >= comparison.previous_ytd.profit ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(summary?.income?.recorded_profit || summary?.net_profit) >= comparison.previous_ytd.profit ? '↑' : '↓'} 
                    {' '}{Math.abs(Math.round((((summary?.income?.recorded_profit || summary?.net_profit) - comparison.previous_ytd.profit) / comparison.previous_ytd.profit) * 100))}% vs YTD
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Profit (Full Year {selectedYear - 1})</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(comparison.previous?.profit || 0)}
                </p>
                {comparison.previous?.profit > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(((summary?.income?.recorded_profit || summary?.net_profit) / comparison.previous.profit) * 100)}% of full year
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
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
                onClick={(e) => { e.stopPropagation(); setShowScreenshotImport(true); }}
                data-testid="screenshot-import-btn"
              >
                <Upload className="w-4 h-4" />
                Scan
              </Button>
            </div>
          </button>
          
          {expandedSection === 'sales' && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gross Revenue</span>
                  <span className="font-medium">{formatCurrency(summary?.income?.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">COGS</span>
                  <span className="font-medium">-{formatCurrency(summary?.cogs)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-medium">
                  <span>Gross Profit</span>
                  <span>{formatCurrency(summary?.gross_profit)}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowVendooImport(true)}
                >
                  Import from Vendoo CSV (Advanced)
                </Button>
              </div>
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

      {/* Screenshot Import Modal */}
      {showScreenshotImport && (
        <ScreenshotImportModal
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setShowScreenshotImport(false)}
          onSave={() => { fetchData(); }}
        />
      )}
    </div>
  );
};

// Add Income Modal Component - for manually entering sales data
const AddIncomeModal = ({ year, getAuthHeader, onClose, onSave }) => {
  const [platform, setPlatform] = useState('ebay');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [is1099, setIs1099] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const platforms = [
    { value: 'ebay', label: 'eBay' },
    { value: 'poshmark', label: 'Poshmark' },
    { value: 'mercari', label: 'Mercari' },
    { value: 'depop', label: 'Depop' },
    { value: 'etsy', label: 'Etsy' },
    { value: 'fb_marketplace', label: 'Facebook Marketplace' },
    { value: 'amazon', label: 'Amazon' },
    { value: 'whatnot', label: 'Whatnot' },
    { value: 'in_person', label: 'In-Person Sales' },
    { value: 'other', label: 'Other' },
  ];

  const months = [
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
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
          date_received: `${year}-${month}-01`,
          notes: notes || `${months.find(m => m.value === month)?.label} ${year} sales`
        })
      });
      
      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Error adding income:', error);
    }
    setSaving(false);
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
          <h3 className="text-xl font-semibold">Add Sales Income</h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-3 -mr-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          Enter your monthly sales total from Vendoo Analytics or platform reports.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full p-4 text-base border-2 border-gray-300 rounded-xl bg-white min-h-[56px]"
            >
              {platforms.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full p-4 text-base border-2 border-gray-300 rounded-xl bg-white min-h-[56px]"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label} {year}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Total Sales Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 pl-8 text-base border-2 border-gray-300 rounded-xl min-h-[56px]"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* 1099 Checkbox */}
          <label className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer min-h-[56px]">
            <input
              type="checkbox"
              checked={is1099}
              onChange={(e) => setIs1099(e.target.checked)}
              className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-base">This is from a 1099 form</span>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-4 text-base border-2 border-gray-300 rounded-xl min-h-[56px]"
              placeholder="e.g., From Vendoo Analytics"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 py-4 text-base min-h-[56px]" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 py-4 text-base min-h-[56px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" 
              disabled={saving || !amount}
            >
              {saving ? 'Saving...' : 'Add Income'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Add Expense Modal Component
const AddExpenseModal = ({ year, getAuthHeader, onClose, onSave }) => {
  const [category, setCategory] = useState('shipping_supplies');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let receiptUrl = null;
      
      // Upload receipt image if provided
      if (receiptImage) {
        const formData = new FormData();
        formData.append('file', receiptImage);
        formData.append('year', year.toString());
        formData.append('type', 'expense_receipt');
        
        const uploadRes = await fetch(`${API_URL}/api/financials/documents/upload`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptUrl = uploadData.id;
        }
      }
      
      const response = await fetch(`${API_URL}/api/financials/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          category,
          amount: parseFloat(amount),
          date,
          description,
          receipt_id: receiptUrl
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

  const selectedCategory = CATEGORY_LABELS[category];

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category - Button Grid Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base bg-white flex items-center justify-between"
            >
              <span>{selectedCategory?.icon} {selectedCategory?.label}</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
            </button>
            
            {showCategoryPicker && (
              <div className="mt-2 border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setCategory(key); setShowCategoryPicker(false); }}
                      className={`p-2 text-left text-sm rounded-lg ${
                        category === key 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                          : 'bg-white hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                  }
                }}
                className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base"
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
              className="w-full px-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base"
              placeholder="e.g., Poly mailers - Amazon"
            />
          </div>
          
          {/* Receipt Image Upload - Camera or File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (optional)</label>
            {receiptPreview ? (
              <div className="relative border-2 border-gray-300 rounded-lg p-2">
                <img src={receiptPreview} alt="Receipt" className="max-h-32 mx-auto rounded" />
                <button
                  type="button"
                  onClick={() => { setReceiptImage(null); setReceiptPreview(null); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="flex-1 flex flex-col items-center cursor-pointer py-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
                  <Camera className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <label className="flex-1 flex flex-col items-center cursor-pointer py-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Choose File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-2 pb-4">
            <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Edit Expense Modal Component
const EditExpenseModal = ({ expense, year, getAuthHeader, onClose, onSave }) => {
  const [category, setCategory] = useState(expense.category || 'shipping_supplies');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [amount, setAmount] = useState(expense.amount?.toString() || '');
  const [date, setDate] = useState(expense.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(expense.description || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch(`${API_URL}/api/financials/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          date,
          description
        })
      });
      
      if (response.ok) {
        onSave();
      } else {
        alert('Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense');
    }
    setSaving(false);
  };

  const selectedCategory = CATEGORY_LABELS[category];

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Edit Expense</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category - Button Grid Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base bg-white flex items-center justify-between"
            >
              <span>{selectedCategory?.icon} {selectedCategory?.label}</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
            </button>
            
            {showCategoryPicker && (
              <div className="mt-2 border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setCategory(key); setShowCategoryPicker(false); }}
                      className={`p-2 text-left text-sm rounded-lg ${
                        category === key 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                          : 'bg-white hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                  }
                }}
                className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base"
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
              className="w-full px-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg min-h-[48px] text-base"
              placeholder="e.g., Poly mailers - Amazon"
            />
          </div>
          
          <div className="flex gap-3 pt-2 pb-4">
            <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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

// Manage Data Modal Component - for viewing/deleting imported data by year
const ManageDataModal = ({ year: initialYear, income: initialIncome, cogs: initialCogs, expenses: initialExpenses, mileage: initialMileage, getAuthHeader, onClose, onDataChanged }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Local data state for selected year
  const [income, setIncome] = useState(initialIncome);
  const [cogs, setCogs] = useState(initialCogs);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [mileage, setMileage] = useState(initialMileage);

  // Fetch data when year changes
  const fetchYearData = async (year) => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const [incomeRes, cogsRes, expensesRes, mileageRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/income/${year}`, { headers }),
        fetch(`${API_URL}/api/financials/cogs/${year}`, { headers }),
        fetch(`${API_URL}/api/financials/expenses/${year}`, { headers }),
        fetch(`${API_URL}/api/financials/mileage/${year}`, { headers })
      ]);
      
      if (incomeRes.ok) setIncome(await incomeRes.json());
      if (cogsRes.ok) setCogs(await cogsRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (mileageRes.ok) setMileage(await mileageRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  // When year changes, fetch new data
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    fetchYearData(newYear);
  };

  const deleteEntry = async (type, id) => {
    setDeleting(id);
    try {
      const response = await fetch(`${API_URL}/api/financials/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (response.ok) {
        fetchYearData(selectedYear);
        if (selectedYear === initialYear) onDataChanged();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
    setDeleting(null);
  };

  const deleteAllOfType = async (type) => {
    if (!window.confirm(`Delete ALL ${type} entries for ${selectedYear}? This cannot be undone.`)) return;
    
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
      fetchYearData(selectedYear);
      if (selectedYear === initialYear) onDataChanged();
    } catch (error) {
      console.error('Delete all error:', error);
    }
    setDeleting(null);
  };

  const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
  };

  // Group income entries by month and separate gross revenue from profit
  const getMonthlyData = () => {
    const monthlyData = {};
    const entries = income.entries || [];
    
    entries.forEach(e => {
      const date = new Date(e.date_received);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          label: monthLabel, 
          grossRevenue: 0, 
          netProfit: 0, 
          entries: [] 
        };
      }
      
      // Check if it's a profit entry or gross revenue
      if (e.platform === 'profit' || e.notes?.includes('Net Profit')) {
        monthlyData[monthKey].netProfit += e.amount;
      } else {
        monthlyData[monthKey].grossRevenue += e.amount;
      }
      monthlyData[monthKey].entries.push(e);
    });
    
    // Sort by month key descending (newest first)
    return Object.entries(monthlyData)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ monthKey: key, ...data }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'income', label: 'Income', count: income.entries?.length || 0 },
    { id: 'cogs', label: 'COGS', count: cogs.entries?.length || 0 },
    { id: 'expenses', label: 'Expenses', count: expenses.entries?.length || 0 },
    { id: 'mileage', label: 'Mileage', count: mileage.entries?.length || 0 }
  ];

  const monthlyData = getMonthlyData();

  const renderOverview = () => {
    if (monthlyData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No data for {selectedYear}
        </div>
      );
    }

    // Calculate totals
    const totalGross = monthlyData.reduce((sum, m) => sum + m.grossRevenue, 0);
    const totalProfit = monthlyData.reduce((sum, m) => sum + m.netProfit, 0);

    return (
      <div className="space-y-4">
        {/* Year Summary */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">{selectedYear} Totals</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Gross Revenue</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalGross)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Net Profit</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown - max height ~3 months, scroll for more */}
        <h4 className="font-semibold text-gray-700">Monthly Breakdown</h4>
        <div className="space-y-2 max-h-[240px] overflow-y-auto">
          {monthlyData.map(month => (
            <div key={month.monthKey} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{month.label}</span>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(month.grossRevenue)}</p>
                  {month.netProfit > 0 && (
                    <p className="text-sm text-green-600">Profit: {formatCurrency(month.netProfit)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEntries = () => {
    let entries = [];

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'income':
        entries = income.entries || [];
        // Group by month
        const groupedIncome = {};
        entries.forEach(e => {
          const monthLabel = formatMonthYear(e.date_received);
          if (!groupedIncome[monthLabel]) groupedIncome[monthLabel] = [];
          groupedIncome[monthLabel].push(e);
        });
        
        return Object.entries(groupedIncome).map(([month, monthEntries]) => (
          <div key={month} className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1">{month}</h4>
            {monthEntries.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {e.notes?.includes('Net Profit') ? '📈 Net Profit' : '💰 Gross Revenue'} - {formatCurrency(e.amount)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{e.notes}</p>
                </div>
                <button
                  onClick={() => deleteEntry('income', e.id)}
                  disabled={deleting === e.id}
                  className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  {deleting === e.id ? '...' : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        ));
      case 'cogs':
        entries = cogs.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.source} - {formatCurrency(e.amount)}</p>
              <p className="text-sm text-gray-500">{formatMonthYear(e.date)} • {e.item_count || 0} items</p>
            </div>
            <button
              onClick={() => deleteEntry('cogs', e.id)}
              disabled={deleting === e.id}
              className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {deleting === e.id ? '...' : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ));
      case 'expenses':
        entries = expenses.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{CATEGORY_LABELS[e.category]?.label || e.category} - {formatCurrency(e.amount)}</p>
              <p className="text-sm text-gray-500">{formatMonthYear(e.date)}{e.description ? ` • ${e.description}` : ''}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingExpense(e)}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteEntry('expenses', e.id)}
                disabled={deleting === e.id}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                {deleting === e.id ? '...' : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ));
      case 'mileage':
        entries = mileage.entries || [];
        return entries.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.miles} miles - {formatCurrency(e.miles * 0.70)}</p>
              <p className="text-sm text-gray-500">{formatMonthYear(e.date)} • {e.purpose || 'Business'}</p>
            </div>
            <button
              onClick={() => deleteEntry('mileage', e.id)}
              disabled={deleting === e.id}
              className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {deleting === e.id ? '...' : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ));
      default:
        return null;
    }
  };

  const currentCount = activeTab === 'overview' ? null : tabs.find(t => t.id === activeTab)?.count || 0;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999, touchAction: 'manipulation' }}
    >
      <div 
        className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Header with Year Selector */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">Manage Data</h3>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="px-3 py-2 border-2 border-blue-500 rounded-lg text-base font-semibold bg-white"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-3 -mr-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Tabs - horizontally scrollable */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap min-h-[48px] ${
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No {activeTab} entries for {selectedYear}
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
      
      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          year={selectedYear}
          getAuthHeader={getAuthHeader}
          onClose={() => setEditingExpense(null)}
          onSave={() => {
            setEditingExpense(null);
            fetchYearData(selectedYear);
            if (selectedYear === initialYear) onDataChanged();
          }}
        />
      )}
    </div>,
    document.body
  );
};

// Screenshot Import Modal - AI-powered data extraction
const ScreenshotImportModal = ({ year, getAuthHeader, onClose, onSave }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const fileInputRef = React.useRef(null);

  // Editable fields - only what we need
  const [grossRevenue, setGrossRevenue] = useState('');
  const [netProfit, setNetProfit] = useState('');
  const [itemsSold, setItemsSold] = useState('');
  const [itemsListed, setItemsListed] = useState('');
  const [avgSalePrice, setAvgSalePrice] = useState('');
  const [dateRange, setDateRange] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
      setExtractedData(null);
      setEditMode(false);
      setLastSaved(null);
    }
  };

  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setExtractedData(null);
    setEditMode(false);
    setError(null);
    setLastSaved(null);
    setGrossRevenue('');
    setNetProfit('');
    setItemsSold('');
    setItemsListed('');
    setAvgSalePrice('');
    setDateRange('');
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    setAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', image);
      
      const response = await fetch(`${API_URL}/api/financials/screenshot/analyze`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.extracted_data) {
        setExtractedData(data.extracted_data);
        // Populate editable fields
        setGrossRevenue(data.extracted_data.gross_revenue?.toString() || data.extracted_data.total_revenue?.toString() || '');
        setNetProfit(data.extracted_data.net_profit?.toString() || data.extracted_data.total_profit?.toString() || '');
        setItemsSold(data.extracted_data.items_sold?.toString() || data.extracted_data.total_items?.toString() || '');
        setItemsListed(data.extracted_data.items_listed?.toString() || '');
        setAvgSalePrice(data.extracted_data.avg_sale_price?.toString() || '');
        setDateRange(data.extracted_data.date_range || '');
        
        // Calculate avg sale price if not provided
        if (!data.extracted_data.avg_sale_price && data.extracted_data.gross_revenue && data.extracted_data.items_sold) {
          const avg = data.extracted_data.gross_revenue / data.extracted_data.items_sold;
          setAvgSalePrice(avg.toFixed(2));
        }
        
        setEditMode(true);
      } else {
        setError(data.error || 'Could not extract data from image. Please try again or enter data manually.');
      }
    } catch (err) {
      console.error('Screenshot analysis error:', err);
      setError(err.message || 'Failed to analyze image. Please try again.');
    }
    setAnalyzing(false);
  };

  const saveData = async () => {
    if (!grossRevenue || parseFloat(grossRevenue) <= 0) {
      setError('Please enter a valid gross revenue amount');
      return;
    }
    
    setSaving(true);
    
    try {
      // Parse date from extracted dateRange (e.g., "January 2026", "Jan 1 - Jan 31, 2026")
      const monthMap = { 
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04', 'june': '06',
        'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      
      let entryDate = new Date().toISOString().split('T')[0]; // Default to today
      if (dateRange) {
        const dateStr = dateRange.toLowerCase();
        // Try to find month and year
        for (const [monthName, monthNum] of Object.entries(monthMap)) {
          if (dateStr.includes(monthName)) {
            // Look for a 4-digit year
            const yearMatch = dateStr.match(/20\d{2}/);
            const extractedYear = yearMatch ? yearMatch[0] : year.toString();
            entryDate = `${extractedYear}-${monthNum}-15`; // Use 15th of month
            break;
          }
        }
      }
      
      // Build notes with all extracted metrics for reference
      let notes = `Scanned ${new Date().toLocaleDateString()}`;
      if (itemsSold) notes += ` | ${itemsSold} sold`;
      if (itemsListed) notes += ` | ${itemsListed} listed`;
      if (avgSalePrice) notes += ` | Avg $${avgSalePrice}`;
      if (dateRange) notes += ` | ${dateRange}`;
      
      // Create income entry with gross revenue
      const incomeResponse = await fetch(`${API_URL}/api/financials/income`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          year,
          platform: 'other',
          amount: parseFloat(grossRevenue),
          is_1099: false,
          date_received: entryDate,
          notes: `Gross Revenue${notes}`
        })
      });
      
      // Also save Net Profit as separate entry if provided
      if (netProfit && parseFloat(netProfit) > 0) {
        await fetch(`${API_URL}/api/financials/income`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({
            year,
            platform: 'profit',
            amount: parseFloat(netProfit),
            is_1099: false,
            date_received: entryDate,
            notes: `Net Profit${notes}`
          })
        });
      }
      
      if (incomeResponse.ok) {
        setSavedCount(prev => prev + 1);
        setLastSaved({
          amount: parseFloat(grossRevenue),
          netProfit: netProfit ? parseFloat(netProfit) : null,
          itemsSold: itemsSold || null
        });
        // Don't close - let user add more
        onSave(); // This refreshes the data
      }
    } catch (err) {
      setError('Failed to save data');
    }
    setSaving(false);
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-semibold">Scan Screenshot</h3>
            <p className="text-sm text-blue-600 font-medium">Saving to year: {year}</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-3 -mr-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
        
        {savedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-sm text-green-700">
            ✓ {savedCount} entry{savedCount > 1 ? 'ies' : ''} saved this session
          </div>
        )}
        
        {/* Last saved confirmation */}
        {lastSaved && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-4">
            <p className="text-lg font-bold text-green-800 mb-2">
              ✓ Saved: ${lastSaved.amount.toLocaleString()}
            </p>
            {lastSaved.netProfit && (
              <p className="text-sm text-green-700">Net Profit: ${lastSaved.netProfit.toLocaleString()}</p>
            )}
            {lastSaved.itemsSold && (
              <p className="text-sm text-green-700">Items Sold: {lastSaved.itemsSold}</p>
            )}
            <Button 
              className="w-full mt-3 py-4 text-base min-h-[56px] bg-blue-600 hover:bg-blue-700 text-white"
              onClick={resetForm}
            >
              + Scan Another Screenshot
            </Button>
          </div>
        )}
        
        {!lastSaved && (
          <p className="text-sm text-gray-500 mb-4">
            Scan your Vendoo Analytics or platform dashboard. Add data for each month.
          </p>
        )}

        <div className="space-y-4">
          {/* Image Upload */}
          {!editMode && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block p-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-center rounded-xl cursor-pointer transition-colors min-h-[60px] flex flex-col items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Take Photo</span>
                </label>
                
                <label className="block p-4 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white text-center rounded-xl cursor-pointer transition-colors min-h-[60px] flex flex-col items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Choose File</span>
                </label>
              </div>
              
              {imagePreview && (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Screenshot preview" 
                    className="w-full rounded-lg border-2 border-gray-200 max-h-48 object-contain bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {image && !extractedData && (
                <Button
                  onClick={analyzeImage}
                  disabled={analyzing}
                  className="w-full py-4 text-base min-h-[56px] bg-green-600 hover:bg-green-700 text-white"
                >
                  {analyzing ? 'Analyzing...' : 'Extract Data from Image'}
                </Button>
              )}
            </>
          )}

          {/* Extracted/Editable Data */}
          {editMode && (
            <div className="space-y-4 bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-green-700 mb-2">✓ Data extracted - verify and save:</p>
              
              {/* Gross Revenue & Net Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gross Revenue *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={grossRevenue}
                      onChange={(e) => setGrossRevenue(e.target.value)}
                      className="w-full p-3 pl-7 border-2 border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Profit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={netProfit}
                      onChange={(e) => setNetProfit(e.target.value)}
                      className="w-full p-3 pl-7 border-2 border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Items Sold & Listed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items Sold</label>
                  <input
                    type="number"
                    value={itemsSold}
                    onChange={(e) => setItemsSold(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items Listed</label>
                  <input
                    type="number"
                    value={itemsListed}
                    onChange={(e) => setItemsListed(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Avg Sale Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Sale Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={avgSalePrice}
                    onChange={(e) => setAvgSalePrice(e.target.value)}
                    className="w-full p-3 pl-7 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                * Only Gross Revenue is saved as income. Add deductions separately via the Manage button.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-base text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 py-4 text-base min-h-[56px]" 
              onClick={editMode ? () => setEditMode(false) : onClose}
            >
              {editMode ? 'Back' : 'Cancel'}
            </Button>
            {editMode && (
              <Button 
                type="button"
                onClick={saveData}
                className="flex-1 py-4 text-base min-h-[56px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" 
                disabled={saving || !grossRevenue}
              >
                {saving ? 'Saving...' : 'Save Data'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FinancialsSection;
