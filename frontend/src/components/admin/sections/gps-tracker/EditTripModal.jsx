/**
 * EditTripModal Component
 * Modal for editing existing trip details
 */
import { motion } from "framer-motion";
import { Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TRIP_PURPOSES = [
  { value: "post_office", label: "Post Office" },
  { value: "sourcing", label: "Sourcing" },
  { value: "other", label: "Other" }
];

const IRS_RATE_2026 = 0.725;

const EditTripModal = ({
  trip,
  editData,
  setEditData,
  onSave,
  onCancel,
  saving = false,
  purposeIcons
}) => {
  if (!trip) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            Edit Trip
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            data-testid="close-edit-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Date */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Trip Date</Label>
            <Input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1"
              data-testid="edit-trip-date"
            />
          </div>
          
          {/* Miles */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Miles Driven</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="1000"
                value={editData.miles}
                onChange={(e) => setEditData(prev => ({ ...prev, miles: e.target.value }))}
                className="pr-16"
                data-testid="edit-trip-miles"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">miles</span>
            </div>
            {editData.miles && parseFloat(editData.miles) > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Tax Deduction: ${(parseFloat(editData.miles) * IRS_RATE_2026).toFixed(2)}
              </p>
            )}
          </div>
          
          {/* Purpose */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Trip Purpose</Label>
            <Select
              value={editData.purpose}
              onValueChange={(value) => setEditData(prev => ({ ...prev, purpose: value }))}
            >
              <SelectTrigger className="mt-1" data-testid="edit-trip-purpose">
                <SelectValue placeholder="Select purpose..." />
              </SelectTrigger>
              <SelectContent>
                {TRIP_PURPOSES.map(purpose => (
                  <SelectItem key={purpose.value} value={purpose.value}>
                    <div className="flex items-center gap-2">
                      {purposeIcons?.[purpose.value] || purpose.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes (for "Other" purpose) */}
          {editData.purpose === "other" && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Trip Notes</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Describe the purpose of this trip..."
                className="mt-1"
                rows={2}
                data-testid="edit-trip-notes"
              />
            </div>
          )}
          
          {/* GPS Info */}
          {trip.location_count > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p>This trip has {trip.location_count} GPS points recorded.</p>
              <p className="text-xs text-gray-400 mt-1">GPS data cannot be edited.</p>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !editData.miles || !editData.purpose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="save-edit-trip-btn"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EditTripModal;
