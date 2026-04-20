import React from "react";
import { useNavigate } from "react-router-dom";
import { Hourglass, ChevronLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export default function HoursOfServicePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <header className="sticky top-0 z-40 bg-[#002855] border-b border-[#001a3a]">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-white hover:text-[#D4AF37] flex items-center gap-1.5 text-sm font-medium" data-testid="hos-back-btn">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-white">
            <Hourglass className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Hours of Service</span>
          </div>
          <div className="w-16" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#002855] flex items-center justify-center shadow-lg mb-6">
          <Hourglass className="w-10 h-10 text-[#D4AF37]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#002855] tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Coming Soon
        </h1>
        <p className="mt-3 text-sm text-[#64748B] max-w-md">
          Hours of Service help is on the way. This section will cover HOS limits, on-duty / off-duty rules, sleeper-berth provisions, and the short-haul exception.
        </p>
        <Button onClick={() => navigate(-1)} className="mt-8 bg-[#002855] text-white hover:bg-[#001a3a] h-10 px-6 text-xs font-bold" data-testid="hos-return-btn">
          Return
        </Button>
      </main>
    </div>
  );
}
