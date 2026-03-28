/**
 * MileageSummaryTabs Component
 * Displays mileage summary with Today/Month/Year tabs
 */
import { Calendar, CalendarDays, TrendingUp, Settings2 } from "lucide-react";

const MileageSummaryTabs = ({ 
  summary, 
  summaryView, 
  setSummaryView, 
  onAdjustClick 
}) => {
  if (!summary) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-blue-200">
        <button
          onClick={() => setSummaryView("today")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
            summaryView === "today"
              ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500"
              : "text-blue-600 hover:bg-blue-50"
          }`}
          data-testid="summary-tab-today"
        >
          <Calendar className="w-4 h-4 inline mr-1" />
          Today
        </button>
        <button
          onClick={() => setSummaryView("month")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
            summaryView === "month"
              ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500"
              : "text-blue-600 hover:bg-blue-50"
          }`}
          data-testid="summary-tab-month"
        >
          <CalendarDays className="w-4 h-4 inline mr-1" />
          {summary.this_month?.name || "Month"}
        </button>
        <button
          onClick={() => setSummaryView("year")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
            summaryView === "year"
              ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500"
              : "text-blue-600 hover:bg-blue-50"
          }`}
          data-testid="summary-tab-year"
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />
          {summary.year}
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="p-4">
        {summaryView === "today" && (
          <div className="text-center">
            <p className="text-xs text-blue-600 mb-2">Today's Mileage</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.today?.trips || 0}</p>
                <p className="text-xs text-blue-600">Trips</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.today?.miles?.toFixed(1) || "0.0"}</p>
                <p className="text-xs text-blue-600">Miles</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">${summary.today?.deduction?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-blue-600">Deduction</p>
              </div>
            </div>
            {summary.today?.trips === 0 && (
              <p className="text-xs text-blue-500 mt-3">No trips recorded today</p>
            )}
          </div>
        )}
        
        {summaryView === "month" && (
          <div className="text-center">
            <p className="text-xs text-blue-600 mb-2">{summary.this_month?.name} Mileage</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.this_month?.trips || 0}</p>
                <p className="text-xs text-blue-600">Trips</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.this_month?.miles?.toFixed(1) || "0.0"}</p>
                <p className="text-xs text-blue-600">Miles</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">${summary.this_month?.deduction?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-blue-600">Deduction</p>
              </div>
            </div>
          </div>
        )}
        
        {summaryView === "year" && (
          <div className="text-center">
            <p className="text-xs text-blue-600 mb-2">{summary.year} Year-to-Date</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.total_trips || 0}</p>
                <p className="text-xs text-blue-600">Trips</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.total_miles?.toFixed(1) || "0.0"}</p>
                <p className="text-xs text-blue-600">Miles</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">${summary.total_deduction?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-blue-600">Deduction</p>
              </div>
            </div>
          </div>
        )}
        
        {/* IRS Rate and Adjust Button */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-blue-600">IRS Rate: ${summary.irs_rate || 0.725}/mile</span>
          <button
            onClick={onAdjustClick}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            data-testid="adjust-mileage-btn"
          >
            <Settings2 className="w-3 h-3" />
            Adjust
          </button>
        </div>
      </div>
    </div>
  );
};

export default MileageSummaryTabs;
