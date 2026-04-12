import { ShieldCheck, Upload } from "lucide-react";
import { Button } from "../ui/button";

export function Header({ onUploadClick, stats }) {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]"
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#D4AF37] flex-shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#002855]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1
              data-testid="app-title"
              className="text-sm sm:text-xl font-semibold tracking-tight text-white leading-tight truncate"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              SafeSpect Violation Navigator
            </h1>
            <p className="text-[10px] sm:text-xs text-[#8FAEC5] tracking-wide hidden sm:block">
              FMCSA Current Violations Database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-xs text-[#8FAEC5]">
              <span data-testid="stat-total">
                <strong className="text-[#D4AF37]">{stats.total?.toLocaleString()}</strong> violations
              </span>
              <span className="w-px h-4 bg-white/20" />
              <span data-testid="stat-oos">
                <strong className="text-[#EF4444]">{stats.oos_count?.toLocaleString()}</strong> OOS
              </span>
            </div>
          )}
          <Button
            data-testid="upload-btn"
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="border-white/30 text-white bg-transparent hover:bg-white hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs"
          >
            <Upload className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Upload Data</span>
          </Button>
        </div>
      </div>
      <div className="gold-accent h-[2px]" />
    </header>
  );
}
