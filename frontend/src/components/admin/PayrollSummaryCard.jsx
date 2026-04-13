import { DollarSign, Calendar, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function PayrollSummaryCard({ 
  payrollSummary, 
  isExpanded, 
  onToggle 
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatPeriodDates = (start, end) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="dashboard-card">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
        data-testid="payroll-summary-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-semibold text-[#333]">Payroll Summary</h2>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#888]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#888]" />
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Current Pay Period */}
              <div className="bg-gradient-to-br from-[#22c55e]/10 to-[#16a34a]/5 rounded-xl p-5 border border-[#22c55e]/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#22c55e]">
                      {formatCurrency(payrollSummary?.current_period?.amount)}
                    </p>
                    <p className="text-sm text-[#666]">Wages Owed</p>
                    <p className="text-xs text-[#888]">
                      {payrollSummary?.current_period?.hours?.toFixed(1) || 0} hrs worked this period
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#888] mt-2">
                  Pay Period: {formatPeriodDates(payrollSummary?.current_period?.start, payrollSummary?.current_period?.end)}
                </p>
              </div>

              {/* This Month - Actual Payments */}
              <div className="bg-gradient-to-br from-[#F8C8DC]/20 to-[#F8C8DC]/5 rounded-xl p-5 border border-[#F8C8DC]/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#ec4899] to-[#d946ef] rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#ec4899]">
                      {formatCurrency(payrollSummary?.month_total)}
                    </p>
                    <p className="text-sm text-[#666]">Paid This Month</p>
                    <p className="text-xs text-[#888]">
                      {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* This Year - Actual Payments */}
              <div className="bg-gradient-to-br from-[#C5A065]/10 to-[#C5A065]/5 rounded-xl p-5 border border-[#C5A065]/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#C5A065] to-[#9A7B4F] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#C5A065]">
                      {formatCurrency(payrollSummary?.year_total)}
                    </p>
                    <p className="text-sm text-[#666]">Paid This Year</p>
                    <p className="text-xs text-[#888]">{new Date().getFullYear()} Total</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
