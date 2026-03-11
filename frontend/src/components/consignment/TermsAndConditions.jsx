import { Checkbox } from "@/components/ui/checkbox";

export default function TermsAndConditions({
  agreed,
  onAgreeChange,
  scrollable = true,
  className = ""
}) {
  const termsContent = (
    <>
      <h3 className="font-bold text-[#333] mb-2">TERMS & CONDITIONS</h3>
      <p className="text-sm text-[#666] leading-relaxed">
        We keep items for <strong>90 days</strong>. At the end of the 90 days, we
        will donate all remaining unsold items to charity unless other
        arrangements have been made. Merchandise is priced using our own
        discretion. Periodically, price reductions may be applied to ensure items
        sell within a timely manner. A record of all sales is stored using our
        electronic software system.
      </p>
      <p className="text-sm text-[#666] leading-relaxed mt-3">
        <strong>Payouts</strong> are sent out between the 1st and the 15th of the
        month. Payouts over $600 require the completion of a W-9. Inventory that
        is considered unsellable will be returned immediately.
      </p>
      <p className="text-sm text-[#666] leading-relaxed mt-3">
        By signing this agreement, you affirm that you are the legal owner of all
        items being consigned and have full authority to sell them. Thrifty Curator
        is not liable for any damages to inventory.
      </p>
    </>
  );

  return (
    <div className={className}>
      {scrollable ? (
        <div className="bg-[#F9F6F7] rounded-xl p-4 max-h-[200px] overflow-y-auto border border-[#eee]">
          {termsContent}
        </div>
      ) : (
        <div className="bg-[#F9F6F7] rounded-xl p-4 border border-[#eee]">
          {termsContent}
        </div>
      )}
      
      <div className="flex items-start gap-3 mt-4">
        <Checkbox
          id="terms-checkbox"
          checked={agreed}
          onCheckedChange={onAgreeChange}
          className="mt-1"
          data-testid="terms-checkbox"
        />
        <label
          htmlFor="terms-checkbox"
          className="text-sm text-[#666] cursor-pointer"
        >
          I have read and agree to the Terms & Conditions
        </label>
      </div>
    </div>
  );
}
