import { Upload, ExternalLink, Smartphone, GraduationCap, Globe, ClipboardList, Calculator, Camera, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

const CVSA_LINKS = [
  {
    label: "OOS App (iOS)",
    url: "https://apps.apple.com/us/app/cvsa-out-of-service-criteria/id1424204784",
    description: "Download for iPhone/iPad",
    icon: Smartphone,
  },
  {
    label: "OOS App (Android)",
    url: "https://play.google.com/store/apps/details?id=com.cvsa&hl=en_US",
    description: "Download for Android",
    icon: Smartphone,
  },
  {
    label: "Operational Policies",
    url: "https://www.cvsa.org/wp-content/uploads/Roadside-Inspection-Operational-Policies.pdf",
    description: "Roadside inspection policies (PDF)",
    icon: Globe,
  },
  {
    label: "Inspection Bulletins",
    url: "https://cvsa.org/inspections/inspection-bulletins/",
    description: "Current CVSA bulletins",
    icon: Globe,
  },
  {
    label: "CVSA Training",
    url: "https://cvsa.org",
    description: "Training & resources",
    icon: GraduationCap,
  },
  {
    label: "NSP Truck Guide",
    url: "https://statepatrol.nebraska.gov/sites/default/files/2025-2026-Truck-Guide.pdf",
    description: "NE State Patrol 2025-2026",
    icon: Smartphone,
  },
  {
    label: "FMCSA Portal",
    url: "https://portal.fmcsa.gov",
    description: "State user portal",
    icon: Globe,
  },
];

const FLOWCHARTS = [
  {
    label: "Is a USDOT Number Required?",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/ysauzg1k_cvsa_daaf1c2cc0cecc39aeb7decb7f74a0eb.pdf",
    description: "CVSA decision tree",
    icon: FileText,
  },
  {
    label: "Finding Responsible Carrier & USDOT Number",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/x5ejnwu7_How_To_Find_The_Responsible_Carrier_and_Correct_USDOT_Number_508CLN.pdf",
    description: "FMCSA carrier identification guide",
    icon: FileText,
  },
  {
    label: "Determining Class of CDL Required",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/su07qof5_cvsa_05b838b9b6a2166cfaf418d5f97c34e2.pdf",
    description: "CVSA CDL class flowchart",
    icon: FileText,
  },
  {
    label: "Post-Accident DA Testing Requirements",
    url: "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/g1p8yd97_Flowchart_Post-Accident_DA_Testing_Requirements.pdf",
    description: "FMCSA post-accident testing flowchart",
    icon: FileText,
  },
];

export function Header({ onUploadClick, stats }) {
  const navigate = useNavigate();
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 bg-[#002855] border-b border-[#001a3a]"
    >
      {/* Top row: app title */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-2 sm:pt-3 pb-1">
        <h1
          data-testid="app-title"
          className="text-[11px] sm:text-sm font-semibold tracking-tight text-white/70 leading-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          SafeSpect Violation Navigator
          <span className="text-[10px] sm:text-xs text-[#8FAEC5] font-normal ml-2 hidden sm:inline">
            FMCSA Current Violations Database
          </span>
        </h1>
      </div>

      {/* Bottom row: nav buttons */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          {/* Level 3 Inspection */}
          <Button
            data-testid="level3-nav-btn"
            size="sm"
            onClick={() => navigate("/level3")}
            className="bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432] transition-colors h-8 px-3 sm:px-4 text-xs font-bold shadow-sm flex-shrink-0"
          >
            <span className="text-[11px] font-black sm:mr-1">3</span>
            <span className="hidden sm:inline">Level 3</span>
          </Button>

          {/* Tie-Down Calculator */}
          <Button
            data-testid="calculator-nav-btn"
            size="sm"
            onClick={() => navigate("/calculator")}
            className="bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432] transition-colors h-8 px-3 sm:px-4 text-xs font-bold shadow-sm flex-shrink-0"
          >
            <Calculator className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Tie-Down Calc</span>
          </Button>

          {/* HazMat Worksheet */}
          <Button
            data-testid="hazmat-nav-btn"
            size="sm"
            onClick={() => navigate("/hazmat-worksheet")}
            className="bg-[#D4AF37] text-[#002855] hover:bg-[#c9a432] transition-colors h-8 px-3 sm:px-4 text-xs font-bold shadow-sm flex-shrink-0"
          >
            <span className="text-[11px] font-black sm:mr-1">HM</span>
            <span className="hidden sm:inline">HazMat</span>
          </Button>

          {/* Photo Annotator */}
          <Button
            data-testid="photo-annotator-nav-btn"
            variant="outline"
            size="sm"
            onClick={() => navigate("/photo-annotator")}
            className="border-white/30 text-white bg-transparent hover:bg-white hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs flex-shrink-0"
          >
            <Camera className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Photo</span>
          </Button>

          {/* Inspections */}
          <Button
            data-testid="inspections-nav-btn"
            variant="outline"
            size="sm"
            onClick={() => navigate("/inspections")}
            className="border-white/30 text-white bg-transparent hover:bg-white hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs flex-shrink-0"
          >
            <ClipboardList className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Inspections</span>
          </Button>

          {/* CVSA Links */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                data-testid="cvsa-btn"
                variant="outline"
                size="sm"
                className="border-[#D4AF37]/40 text-[#D4AF37] bg-transparent hover:bg-[#D4AF37] hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs font-bold flex-shrink-0"
              >
                Resources
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[260px] p-2 max-h-[420px] overflow-y-auto"
              align="end"
              data-testid="cvsa-popover"
            >
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] px-2 pb-2">
                CVSA Resources
              </p>
              {CVSA_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#F1F5F9] transition-colors group"
                  data-testid={`cvsa-link-${link.label.replace(/\s/g, '-').toLowerCase()}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#002855]/10 flex-shrink-0">
                    <link.icon className="w-4 h-4 text-[#002855]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                      {link.label}
                      <ExternalLink className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-[#002855]" />
                    </p>
                    <p className="text-[10px] text-[#64748B]">{link.description}</p>
                  </div>
                </a>
              ))}
              <div className="border-t border-[#E2E8F0] mt-2 pt-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] px-2 pb-2">
                  Flowcharts
                </p>
                {FLOWCHARTS.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#F1F5F9] transition-colors group"
                    data-testid={`flowchart-${link.label.replace(/[\s/()]/g, '-').toLowerCase()}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#D4AF37]/10 flex-shrink-0">
                      <link.icon className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0F172A] flex items-center gap-1">
                        {link.label}
                        <ExternalLink className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-[#002855]" />
                      </p>
                      <p className="text-[10px] text-[#64748B]">{link.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            data-testid="upload-btn"
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="border-white/30 text-white bg-transparent hover:bg-white hover:text-[#002855] transition-colors h-8 px-2 sm:px-3 text-xs flex-shrink-0"
          >
            <Upload className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Upload Data</span>
          </Button>
        </div>

        {stats && (
          <div className="hidden md:flex items-center gap-4 text-xs text-[#8FAEC5] flex-shrink-0 ml-3">
            <span data-testid="stat-total">
              <strong className="text-[#D4AF37]">{stats.total?.toLocaleString()}</strong> violations
            </span>
            <span className="w-px h-4 bg-white/20" />
            <span data-testid="stat-oos">
              <strong className="text-[#EF4444]">{stats.oos_count?.toLocaleString()}</strong> OOS
            </span>
          </div>
        )}
      </div>

      <div className="gold-accent h-[2px]" />
    </header>
  );
}
