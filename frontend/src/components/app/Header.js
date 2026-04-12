import { ShieldCheck, Upload } from "lucide-react";
import { Button } from "../ui/button";

export function Header({ onUploadClick, stats }) {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-white border-b border-border"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#002855]">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" strokeWidth={2} />
          </div>
          <div>
            <h1
              data-testid="app-title"
              className="text-lg sm:text-xl font-semibold tracking-tight text-[#002855] leading-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              SafeSpect Violation Navigator
            </h1>
            <p className="text-xs text-[#6B7280] tracking-wide">
              FMCSA Current Violations Database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-xs text-[#6B7280]">
              <span data-testid="stat-total">
                <strong className="text-[#002855]">{stats.total?.toLocaleString()}</strong> violations
              </span>
              <span className="w-px h-4 bg-border" />
              <span data-testid="stat-oos">
                <strong className="text-[#DC2626]">{stats.oos_count?.toLocaleString()}</strong> OOS
              </span>
            </div>
          )}
          <Button
            data-testid="upload-btn"
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white transition-colors"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload Data
          </Button>
        </div>
      </div>
      <div className="gold-accent h-[2px]" />
    </header>
  );
}
