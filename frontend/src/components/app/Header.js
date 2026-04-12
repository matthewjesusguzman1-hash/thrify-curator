import { ShieldCheck, Upload } from "lucide-react";
import { Button } from "../ui/button";

export function Header({ onUploadClick, stats }) {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-[#001229] border-b border-[#0a3d6b]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#D4AF37]">
            <ShieldCheck className="w-5 h-5 text-[#001229]" strokeWidth={2} />
          </div>
          <div>
            <h1
              data-testid="app-title"
              className="text-lg sm:text-xl font-semibold tracking-tight text-[#F9FAFB] leading-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              SafeSpect Violation Navigator
            </h1>
            <p className="text-xs text-[#7B8FA3] tracking-wide">
              FMCSA Current Violations Database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-xs text-[#7B8FA3]">
              <span data-testid="stat-total">
                <strong className="text-[#D4AF37]">{stats.total?.toLocaleString()}</strong> violations
              </span>
              <span className="w-px h-4 bg-[#0a3d6b]" />
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
            className="border-[#D4AF37]/40 text-[#D4AF37] bg-transparent hover:bg-[#D4AF37] hover:text-[#001229] transition-colors"
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
