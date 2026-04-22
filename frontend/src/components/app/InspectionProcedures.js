import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";
import { useLiteMode } from "./LiteModeContext";

const INSPECTIONS = [
  {
    name: "Level I – Full Inspection",
    images: [
      "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/esoihxj9_IMG_1544.jpeg",
      "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/5nvm3u9i_IMG_1545.jpeg",
    ],
    steps: [
      "Choose the Inspection Site",
      "Approach the Vehicle",
      "Greet and Prepare the Driver",
      "Interview Driver",
      "Collect the Driver's Documents",
      "Check for Presence of Hazardous Materials/Dangerous Goods",
      "Identify the Carrier",
      "Examine Driver's License or CDL",
      "Check Medical Examiner's Certificate and SPE Certificate (if applicable)",
      "Check Record of Duty Status",
      "Review Driver's Daily Vehicle Inspection Report (if applicable)",
      "Review Periodic Inspection Report(s)",
      "Prepare Driver for Vehicle Inspection",
      "Inspect Front of Tractor",
      "Inspect Left Front Side of Tractor",
      "Inspect Left Saddle Tank Area",
      "Inspect Trailer Front",
      "Inspect Left Rear Tractor Area",
      "Inspect Left Side of Trailer",
      "Inspect Left Rear Trailer Wheels",
      "Inspect Rear of Trailer",
      "Inspect Double, Triple and Full Trailers",
      "Inspect Right Rear Trailer Wheels",
      "Inspect Right Side of Trailer",
      "Inspect Right Rear Tractor Area",
      "Inspect Right Saddle Tank Area",
      "Inspect Right Front Side of Tractor",
      "Inspect Steering Axle(s)",
      "Inspect Axle(s) 2 and/or 3",
      "Inspect Axle(s) 4 and/or 5",
      "Prepare the Vehicle and Check Brake Adjustment",
      "Inspect Tractor Protection System (tests both tractor protection and emergency brakes)",
      "Inspect Low Air Pressure Warning Device and Brake Pedal",
      "Test Air Loss Rate",
      "Check Steering Wheel Lash",
      "Check Fifth Wheel Movement",
      "Complete the Inspection",
    ],
  },
  {
    name: "Level I – Light-Duty (Hydraulic)",
    steps: [
      "Choose the Inspection Site",
      "Approach the Vehicle",
      "Greet and Prepare the Driver",
      "Interview Driver",
      "Collect the Driver's Documents",
      "Check for Presence of Hazardous Materials/Dangerous Goods",
      "Identify the Carrier",
      "Examine Driver's License",
      "Check Medical Examiner's Certificate and SPE Certificate (if applicable)",
      "Check Record of Duty Status",
      "Review Driver's Daily Vehicle Inspection Report (if applicable)",
      "Review Periodic Inspection Report(s)",
      "Prepare Driver for Vehicle Inspection",
      "Inspect Front of Truck",
      "Inspect Left Front Side of Truck",
      "Inspect Left Driver Side of Truck",
      "Inspect Between Truck and Trailer",
      "Inspect Left Side of Trailer",
      "Inspect Rear of Trailer",
      "Inspect Right Side of Trailer",
      "Inspect Right Passenger Side of Truck",
      "Inspect Steering Axle(s)",
      "Inspect Axle(s) 2 and/or 3",
      "Inspect Axle(s) 4 and/or 5",
      "Inside Cab Inspection",
      "Inspect the Trailer Brake System",
      "Inspect the Ball Hitch, If Necessary",
      "Complete the Inspection",
    ],
  },
  {
    name: "Level II – Walk-Around",
    images: [
      "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/6457x1vb_IMG_1546.jpeg",
      "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/9csotkh6_IMG_1547.jpeg",
    ],
    steps: [
      "Choose the Inspection Site",
      "Approach the Vehicle",
      "Greet and Prepare the Driver",
      "Interview Driver",
      "Collect the Driver's Documents",
      "Check for Presence of Hazardous Materials/Dangerous Goods",
      "Identify the Carrier",
      "Examine Driver's License",
      "Check Medical Examiner's Certificate and SPE Certificate (if applicable)",
      "Check Record of Duty Status",
      "Review Driver's Daily Vehicle Inspection Report (if applicable)",
      "Review Periodic Inspection Report(s)",
      "Prepare Driver for Vehicle Inspection",
      "Inspect Front of Tractor",
      "Inspect Left Front Side of Tractor",
      "Inspect Left Saddle Tank Area",
      "Inspect Trailer Front",
      "Inspect Left Rear Tractor Area",
      "Inspect Left Side of Trailer",
      "Inspect Left Rear Trailer Wheels",
      "Inspect Rear of Trailer",
      "Inspect Double, Triple and Full Trailers",
      "Inspect Right Rear Trailer Wheels",
      "Inspect Right Side of Trailer",
      "Inspect Right Rear Tractor Area",
      "Inspect Right Saddle Tank Area",
      "Inspect Right Front Side of Tractor",
      "Inspect Low Air Pressure Warning Device and Brake Pedal",
      "Test Air Loss Rate",
      "Check Steering Wheel Lash",
      "Complete the Inspection",
    ],
  },
  {
    name: "Level III – Driver Only",
    images: [
      "https://customer-assets.emergentagent.com/job_violation-navigator/artifacts/swsu4e2i_IMG_1541.jpeg",
    ],
    steps: [
      "Choose the Inspection Site",
      "Approach the Vehicle",
      "Greet and Prepare the Driver",
      "Interview Driver",
      "Collect the Driver's Documents",
      "Check for Presence of Hazardous Materials/Dangerous Goods",
      "Identify the Carrier",
      "Examine Driver's License",
      "Check Medical Examiner's Certificate and SPE Certificate (if applicable)",
      "Check Record of Duty Status",
      "Review Driver's Daily Vehicle Inspection Report",
      "Review Periodic Inspection Report(s)",
      "Complete the Inspection",
    ],
  },
  {
    name: "Level V – Vehicle Only",
    steps: [
      "Prepare Operator for Vehicle Inspection",
      "Inspect Front of Tractor",
      "Inspect Left Front Side of Tractor",
      "Inspect Left Saddle Tank Area",
      "Inspect Trailer Front",
      "Inspect Left Rear Tractor Area",
      "Inspect Left Side of Trailer",
      "Inspect Left Rear Trailer Wheels",
      "Inspect Rear of Trailer",
      "Inspect Double, Triple and Full Trailers",
      "Inspect Right Rear Trailer Wheels",
      "Inspect Right Side of Trailer",
      "Inspect Right Rear Tractor Area",
      "Inspect Right Saddle Tank Area",
      "Inspect Right Front Side of Tractor",
      "Inspect Steering Axle(s)",
      "Inspect Axle(s) 2 and/or 3",
      "Inspect Axle(s) 4 and/or 5",
      "Prepare the Vehicle and Check Brake Adjustment",
      "Inspect Tractor Protection System (tests both tractor protection and emergency brakes)",
      "Inspect Low Air Pressure Warning Device and Brake Pedal",
      "Test Air Loss Rate",
      "Check Steering Wheel Lash",
      "Check Fifth Wheel Movement",
      "Complete the Inspection",
    ],
  },
  {
    name: "Passenger Carrier Vehicle",
    steps: [
      "Inspection Preparation (Team Leader)",
      "Greet and Prepare the Driver and Passengers (Team Leader)",
      "Collect Driver's Documents (Team Leader)",
      "Interview the Driver (Team Leader)",
      "Identify the Carrier (Team Leader)",
      "Examine Commercial Driver's License (Team Leader)",
      "Check Medical Examiner's Certificate and SPE Certificate (Team Leader)",
      "Check Record of Duty Status (Team Leader)",
      "Review Vehicle Inspection Reports (Team Leader)",
      "Check Passenger Area (Team Leader)",
      "Check Driver's Compartment (Team Leader)",
      "Inspect Front Outside of Vehicle (Other Inspector(s))",
      "Inspect Left Side of Vehicle (Other Inspector(s))",
      "Inspect Rear of Vehicle (Other Inspector(s))",
      "Inspect Right Side of Vehicle (Other Inspector(s))",
      "Place Inspection Ramps (All Inspector(s))",
      "Inspect the Front Undercarriage (Other Inspector(s))",
      "Inspect the Rear Undercarriage (Other Inspector(s))",
      "Check for Presence of Hazardous Materials/Dangerous Goods (All)",
      "Check Air Loss Rate (Team Leader)",
      "Complete the Inspection (Team Leader)",
      "Take Appropriate Enforcement Action (Team Leader)",
      "Apply CVSA Decal (Team Leader)",
    ],
  },
  {
    name: "Cargo Tank / Bulk Packagings",
    steps: [
      "Initiate the Inspection",
      "Check for Specification Marking",
      "Inspect Test Date Markings",
      "Inspect Securement Integrity",
      "Inspect Double Bulkhead Drains",
      "Inspect Piping and Protection",
      "Inspect Emergency Flow Control Devices",
      "Inspect Rear End Protection",
      "Check Optional Inspection Items",
      "Apply CVSA Decal",
    ],
  },
  {
    name: "HazMat / Dangerous Goods",
    steps: [
      "Initiate the Inspection",
      "Check Shipping Paper(s) Compliance",
      "Check Placarding Compliance",
      "Check Marking Compliance",
      "Check Labeling Compliance",
      "Check Packaging Compliance",
      "Check Loading Compliance",
    ],
  },
];

export function InspectionProcedures({ open, onOpenChange }) {
  const { liteMode } = useLiteMode();
  const [expanded, setExpanded] = useState({});

  // In Lite mode, show only the Level III — Driver Only entry.
  const visibleInspections = useMemo(
    () => (liteMode ? INSPECTIONS.filter((i) => /Level III/.test(i.name)) : INSPECTIONS),
    [liteMode]
  );

  // Auto-expand the single Level III entry when the dialog opens in Lite mode.
  useEffect(() => {
    if (open && liteMode) setExpanded({ 0: true });
    else if (open) setExpanded({});
  }, [open, liteMode]);

  const toggle = (idx) => setExpanded((p) => ({ ...p, [idx]: !p[idx] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] w-[95vw] sm:w-full h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm sm:text-base font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              {liteMode ? "Level III Procedure" : "Inspection Procedures"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-white/70 hover:text-white hover:bg-white/10 text-xs"
          >
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-2" data-testid="inspection-procedures-list">
          <p className="text-xs text-[#64748B] mb-3">
            {liteMode
              ? "CVSA North American Standard — Level III Driver-Only inspection: schematic and step sequence."
              : "CVSA North American Standard inspection steps. Tap a level to view its procedure."}
          </p>

          {visibleInspections.map((insp, idx) => {
            const isOpen = expanded[idx];
            return (
              <div key={idx} className="border rounded-lg overflow-hidden" data-testid={`procedure-${idx}`}>
                <button
                  onClick={() => toggle(idx)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${isOpen ? "bg-[#002855] text-white" : "bg-white hover:bg-[#F8FAFC]"}`}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0 text-[#94A3B8]" />}
                  <span className={`text-sm font-medium ${isOpen ? "text-white" : "text-[#334155]"}`}>{insp.name}</span>
                  <span className={`text-[10px] ml-auto flex-shrink-0 ${isOpen ? "text-white/50" : "text-[#94A3B8]"}`}>{insp.steps.length} steps</span>
                </button>

                {isOpen && (
                  <div className="px-4 py-3 bg-[#F8FAFC] border-t">
                    {insp.images?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {insp.images.map((src, imgIdx) => (
                          <a key={imgIdx} href={src} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={src}
                              alt={`${insp.name} schematic ${imgIdx + 1}`}
                              className="w-full rounded-lg border border-[#E2E8F0] shadow-sm"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <ol className="space-y-1.5">
                      {insp.steps.map((step, sIdx) => (
                        <li key={sIdx} className="flex gap-2.5 text-xs">
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#002855]/10 text-[#002855] font-bold text-[10px] flex-shrink-0">
                            {sIdx + 1}
                          </span>
                          <span className="text-[#475569] pt-0.5 leading-snug">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
