/**
 * ManualTripForm Component
 * Form for manually logging trips without GPS tracking
 */
import { useState } from "react";
import { FileText, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TRIP_PURPOSES = [
  { value: "post_office", label: "Post Office", icon: "Building2" },
  { value: "sourcing", label: "Sourcing", icon: "ShoppingBag" },
  { value: "other", label: "Other", icon: "FileText" }
];

const IRS_RATE_2026 = 0.725;

const ManualTripForm = ({ 
  onSave, 
  onCancel, 
  saving = false,
  purposeIcons 
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    miles: "",
    purpose: "",
    notes: "",
    receipt: null
  });

  const handleSubmit = () => {
    if (!formData.miles || parseFloat(formData.miles) <= 0) {
      return;
    }
    if (!formData.purpose) {
      return;
    }
    onSave(formData);
  };

  const handleCancel = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      miles: "",
      purpose: "",
      notes: "",
      receipt: null
    });
    onCancel();
  };

  return (
    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-blue-800 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Manual Trip Entry
        </h4>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600"
          data-testid="close-manual-entry-btn"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <p className="text-sm text-blue-600">
        Log a trip you took without GPS tracking
      </p>
      
      {/* Date */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Trip Date *</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          max={new Date().toISOString().split('T')[0]}
          className="mt-1"
          data-testid="manual-trip-date"
        />
      </div>
      
      {/* Miles */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Miles Driven *</Label>
        <div className="relative mt-1">
          <Input
            type="number"
            step="0.1"
            min="0.1"
            max="1000"
            placeholder="e.g., 15.5"
            value={formData.miles}
            onChange={(e) => setFormData(prev => ({ ...prev, miles: e.target.value }))}
            className="pr-16"
            data-testid="manual-trip-miles"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">miles</span>
        </div>
        {formData.miles && parseFloat(formData.miles) > 0 && (
          <p className="text-xs text-green-600 mt-1">
            Tax Deduction: ${(parseFloat(formData.miles) * IRS_RATE_2026).toFixed(2)}
          </p>
        )}
      </div>
      
      {/* Purpose */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Trip Purpose *</Label>
        <Select
          value={formData.purpose}
          onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}
        >
          <SelectTrigger className="mt-1" data-testid="manual-trip-purpose">
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
      {formData.purpose === "other" && (
        <div>
          <Label className="text-sm font-medium text-gray-700">Trip Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Describe the purpose of this trip..."
            className="mt-1"
            rows={2}
            data-testid="manual-trip-notes"
          />
        </div>
      )}
      
      {/* Receipt Upload */}
      <div>
        <Label className="text-sm font-medium text-gray-700">Receipt (Optional)</Label>
        <Input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            receipt: e.target.files?.[0] || null 
          }))}
          className="mt-1"
          data-testid="manual-trip-receipt"
        />
        {formData.receipt && (
          <p className="text-xs text-gray-500 mt-1">
            {formData.receipt.name}
          </p>
        )}
      </div>
      
      {/* Submit Button */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleCancel}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !formData.miles || !formData.purpose}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="save-manual-trip-btn"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Trip
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ManualTripForm;
