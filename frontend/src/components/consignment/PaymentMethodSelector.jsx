import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

const PAYMENT_METHODS = [
  { id: "check", label: "Check", needsDetails: false },
  { id: "venmo", label: "Venmo", needsDetails: true, placeholder: "@username" },
  { id: "paypal", label: "PayPal", needsDetails: true, placeholder: "email or @username" },
  { id: "zelle", label: "Zelle", needsDetails: true, placeholder: "email or phone number" },
  { id: "cashapp", label: "CashApp", needsDetails: true, placeholder: "$cashtag" },
  { id: "applepay", label: "Apple Pay", needsDetails: true, placeholder: "phone number" }
];

export { PAYMENT_METHODS };

export default function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  paymentDetails, 
  onDetailsChange,
  label = "Payment Method",
  labelClassName = "",
  required = false
}) {
  const selectedPaymentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  return (
    <div className="space-y-2">
      <Label className={labelClassName || "block text-sm font-semibold text-[#333] mb-2"}>
        {label} {required && '*'}
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => {
              onMethodChange(method.id);
              if (!method.needsDetails) {
                onDetailsChange("");
              }
            }}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
              selectedMethod === method.id
                ? "border-[#00D4FF] bg-[#00D4FF]/10 text-[#00A8CC]"
                : "border-[#ddd] hover:border-[#00D4FF]/50 text-[#666] hover:bg-[#F9F6F7]"
            }`}
            data-testid={`payment-method-${method.id}`}
          >
            <CreditCard className="w-4 h-4 mx-auto mb-1" />
            {method.label}
          </button>
        ))}
      </div>
      
      {selectedPaymentMethod?.needsDetails && (
        <div className="mt-3">
          <Label className="block text-sm font-semibold text-[#333] mb-2">
            {selectedPaymentMethod.label} Details *
          </Label>
          <input
            type="text"
            value={paymentDetails}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder={selectedPaymentMethod.placeholder}
            className="w-full px-4 py-3 rounded-xl border border-[#ddd] focus:border-[#00D4FF] focus:ring-2 focus:ring-[#00D4FF]/20 outline-none transition-all bg-white"
            required={required}
            data-testid="payment-details-input"
          />
        </div>
      )}
    </div>
  );
}
