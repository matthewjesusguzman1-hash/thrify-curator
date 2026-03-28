/**
 * MileageAdjustmentModal Component
 * Modal for silently adjusting mileage totals
 */
import { motion } from "framer-motion";
import { Settings2, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MileageAdjustmentModal = ({
  isOpen,
  onClose,
  adjustmentData,
  setAdjustmentData,
  onSave,
  saving = false,
  summaryView,
  irsRate = 0.725
}) => {
  if (!isOpen) return null;

  const toggleSign = () => {
    setAdjustmentData(prev => ({
      ...prev,
      miles: prev.miles.startsWith('-') ? prev.miles.slice(1) : `-${prev.miles}`
    }));
  };

  const periodLabel = summaryView === "today" ? "today" : 
                      summaryView === "month" ? "this month" : "this year";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600" />
            Adjust Mileage
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            data-testid="close-adjustment-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Add or subtract miles from your {periodLabel} total. This adjustment won't appear in your trip list.
          </p>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Adjustment Amount</Label>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={toggleSign}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  adjustmentData.miles.startsWith('-') 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'
                }`}
                data-testid="toggle-adjustment-sign-btn"
              >
                {adjustmentData.miles.startsWith('-') ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="0.0"
                value={adjustmentData.miles.replace('-', '')}
                onChange={(e) => {
                  const val = e.target.value;
                  const isNeg = adjustmentData.miles.startsWith('-');
                  setAdjustmentData(prev => ({
                    ...prev,
                    miles: isNeg ? `-${val}` : val
                  }));
                }}
                className="flex-1"
                data-testid="adjustment-miles-input"
              />
              <span className="text-gray-500">miles</span>
            </div>
            {adjustmentData.miles && parseFloat(adjustmentData.miles) !== 0 && (
              <p className={`text-xs mt-1 ${parseFloat(adjustmentData.miles) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Tax impact: {parseFloat(adjustmentData.miles) > 0 ? '+' : ''}${(parseFloat(adjustmentData.miles) * irsRate).toFixed(2)}
              </p>
            )}
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Reason (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g., GPS tracking error correction"
              value={adjustmentData.reason}
              onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
              className="mt-1"
              data-testid="adjustment-reason-input"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !adjustmentData.miles || parseFloat(adjustmentData.miles) === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="save-adjustment-btn"
            >
              {saving ? "Saving..." : "Apply Adjustment"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MileageAdjustmentModal;
