import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Check,
  Lock,
  ChevronRight,
  FileText,
  DollarSign,
  Receipt,
  Upload,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TaxPrepPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get auth header from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
      
      const [progressRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/financials/tax-prep/progress/${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/financials/summary/${selectedYear}`, { headers })
      ]);
      
      if (progressRes.ok) setProgress(await progressRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Error fetching tax prep data:', error);
    }
    setLoading(false);
  }, [selectedYear]);

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

  const getStepStatus = (stepNum) => {
    if (!progress) return 'locked';
    const isComplete = progress[`step${stepNum}_complete`];
    if (isComplete) return 'complete';
    
    // Check if previous steps are complete
    for (let i = 1; i < stepNum; i++) {
      if (!progress[`step${i}_complete`]) return 'locked';
    }
    return 'current';
  };

  const steps = [
    { num: 1, title: 'Income', description: 'Enter 1099s and other income', icon: DollarSign },
    { num: 2, title: 'Cost of Goods', description: 'Document inventory purchases', icon: Receipt },
    { num: 3, title: 'Deductions', description: 'Review expenses and mileage', icon: FileText },
    { num: 4, title: 'Documents', description: 'Upload additional documents', icon: Upload },
    { num: 5, title: 'Generate Reports', description: 'Download your tax package', icon: Download }
  ];

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
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Financials
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-2 block">🧾</span>
          <h1 className="text-2xl font-bold text-gray-900">Tax Prep</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              {[currentYear, currentYear - 1].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-500 mt-2">Prepare everything for your accountant</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{progress?.completion_percentage || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress?.completion_percentage || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => {
            const status = getStepStatus(step.num);
            const Icon = step.icon;
            
            return (
              <div
                key={step.num}
                className={`bg-white rounded-lg border overflow-hidden transition-all ${
                  status === 'locked' 
                    ? 'border-gray-200 opacity-60' 
                    : status === 'complete'
                    ? 'border-green-200'
                    : 'border-blue-200 shadow-sm'
                }`}
              >
                <button
                  onClick={() => {
                    if (status !== 'locked') {
                      navigate(`/admin/tax-prep/step/${step.num}`);
                    }
                  }}
                  disabled={status === 'locked'}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 disabled:hover:bg-white disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      status === 'complete' 
                        ? 'bg-green-100 text-green-600' 
                        : status === 'current'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {status === 'complete' ? (
                        <Check className="w-5 h-5" />
                      ) : status === 'locked' ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        Step {step.num}: {step.title}
                      </div>
                      <div className="text-sm text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {status === 'complete' && (
                      <span className="text-sm text-green-600 font-medium">Complete</span>
                    )}
                    {status === 'current' && (
                      <span className="text-sm text-blue-600 font-medium">Continue</span>
                    )}
                    <ChevronRight className={`w-5 h-5 ${
                      status === 'locked' ? 'text-gray-300' : 'text-gray-400'
                    }`} />
                  </div>
                </button>

                {/* Show summary for completed steps */}
                {status === 'complete' && step.num === 1 && summary && (
                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    Total Income: {formatCurrency(summary.income?.total)}
                  </div>
                )}
                {status === 'complete' && step.num === 2 && summary && (
                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    Total COGS: {formatCurrency(summary.cogs)}
                  </div>
                )}
                {status === 'complete' && step.num === 3 && summary && (
                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    Total Deductions: {formatCurrency(summary.deductions?.total)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Preview (if all steps complete) */}
        {progress?.completion_percentage === 100 && summary && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
            <h3 className="font-semibold text-green-900 mb-4">Tax Summary Ready</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Income</span>
                <span className="font-medium">{formatCurrency(summary.income?.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost of Goods Sold</span>
                <span className="font-medium">-{formatCurrency(summary.cogs)}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2">
                <span className="text-gray-600">Gross Profit</span>
                <span className="font-medium">{formatCurrency(summary.gross_profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Deductions</span>
                <span className="font-medium">-{formatCurrency(summary.deductions?.total)}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2 text-base">
                <span className="font-semibold text-green-900">Net Profit</span>
                <span className="font-bold text-green-600">{formatCurrency(summary.net_profit)}</span>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Download Package
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxPrepPage;
