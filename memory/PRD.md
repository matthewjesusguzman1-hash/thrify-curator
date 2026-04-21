# SafeSpect Violation Navigator — PRD

## Problem Statement
FMCSA roadside violation search/filter app with AI-powered search, NSP blue/gold theme. Includes HazMat inspection tools for training and roadside use, Level 3 inspection reference, and field-ready inspector utilities.

## What's Implemented
- NSP Blue/Gold Theme, AI Smart Search (natural language -> violations), 4-Level Violation Tree
- Inspection Documentation (CRUD, photos, HTML export), CVSA Procedures, PWA
- **Multi-Article Tie-Down Calculator** (49 CFR 393) — complete WLL tables, favorites, drag-and-drop
- **HazMat Inspection Worksheet** (49 CFR, v26.1) — RESTRUCTURED:
  - 7-step hierarchical checklist matching official reference sheet
  - Main items = checkboxes, sub-items = reference bullets (not checkboxes)
  - "BEGIN THE VEHICLE INSPECTION" divider between Steps 3-4
  - Reduced from 113 flat checkboxes to 55 meaningful grouped checks
  - Inspector tips, CFR links, tool cross-navigation, localStorage persistence
  - **Inspector Tools**: Does It Need a Placard? (restructured flow), Placard Quick Reference (official CFR images), RQ & Marine Pollutant Lookup (1804 entries), Package Classification, MOT, Segregation Table
- **Photo Annotation Tool** — draw, circle, arrow, text, quick stamps, zoom, movable text
- **AI Smart Search** — natural language queries find correct violations
- **Level 3 Inspection Guide** (DIR Sheet 2025-2026) — NEW:
  - 20 collapsible accordion sections covering all Level 3 topics
  - Topics: General Guidance, Exempted Vehicles, CDL, Farm Plated, Clearinghouse, Medical Card, DOT#/Operating Authority, Vehicle Markings, Annual Inspection, Log Book Exemptions, eRODS/ELD, HOS Interstate, HOS Intrastate, Split Sleeper Berth, Personal Conveyance, Log Book Requirements, OOS Duration, Electronic Logs, Miscellaneous Violations, Drugs & Alcohol
  - Search/filter across all sections, quick-nav chips, Expand/Collapse All
  - CFR references link to eCFR.gov, highlighted key items with gold border
  - Mobile-optimized for field use

## Recent Changes
- **HOS OOS Duration Calculator (2026-04-20)**: Added step-by-step OOS recovery simulation. Inspector enters "hours remaining in today's log"; calculator simulates midnight roll-offs (oldest day drops first, +24 hr per additional day) until the running total falls under the limit, or until cumulative OOS reaches 34 hr — at which point a 34-hour restart is recommended. Every step is shown (cumulative OOS hours, which day ages off, new running total, pass/fail) so the inspector can explain the reasoning for training. Also restructured the Total column to be editable (typing a total clears Drive + On-Duty for that row); removed the separate Override column. Each row's date is now a tappable date input — changing any date shifts the whole window and all other dates auto-populate; a "Reset to today" link appears whenever the window is off-today.
- **HOS 60/70 Hour Calculator (2026-04-20)**: Replaced the "Coming Soon" Hours of Service page with a functional 60/70 hour rule calculator. Toggle for Property (70 hr / 8 day) vs Passenger (60 hr / 7 day) — days dynamically adjust. Each day row has Drive, On-Duty, and Override Total columns (override replaces Drive+On-Duty for that day). Today is highlighted and pinned at the bottom. Running total bar + OUT OF SERVICE / WITHIN LIMIT result card with remaining / exceeded hours.
- **Rules Panel Verbatim Match (2026-04-20)**: Updated the Size & Weight Rules panel wording to match the §60-6,294 statutory reference verbatim (Tandem Axle full definition, Two-Axle Group extremes phrasing, Measuring Distance one-half foot rule + 96" fact clause, Tandem Exception 36'/37'/38' sets, complete Dummy Axle "shall be disregarded" clause, full Idle Reduction/APU text, full Natural Gas Powered Vehicles NSIDH text). Added missing **Sliding Fifth-Wheel §60-6,301** section. Calculation logic untouched.
- **Unified Save/Export UX (2026-04-19)**: Bridge Chart, Photo Annotator, and Tie-Down Calculator now share the same pattern — a "Preview & Export" button (opens a modal with Download + Share) and a "Save to Inspection" button (opens a picker with an inline "Create & Add" field). When no inspections exist, the picker shows an empty-state nudge pointing to the inline create field.
- **Interior Bridge Custom Max (2026-04-18)**: In Custom / Permit mode, added an optional `Max (lbs)` field that overrides the bridge chart for the interior span. Distance is optional in custom mode. Enables interior-bridge checks for permit configurations the FMCSA bridge chart doesn't cover.
- **Interior Bridge Check (2026-04-18)**: Added optional, collapsed-by-default "Interior Bridge" section on Record Weights (between Gross Weight card and Weight Report). Always spans A2 → last axle. User enters only the distance; axle count and weight (gross − A1) auto-compute. Cross-references FMCSA bridge table; LEGAL/OVER status shown inline. Violations automatically added to the Weight Report violations list and Calculation Details, and factor into the 5% tolerance count. **Also rendered on the truck diagram** as a dashed bracket spanning A2→last axle with an inline pill showing `INTERIOR A2-A{last} · {ft} ft · +N OVER` (or max N when legal). Persists to localStorage and resets on Clear.
- **Bridge Chart SVG Text Rendering Fix (2026-04-18)**: Fixed long-standing visual bug where distance labels (`4 ft`, `10 ft`), axle labels (`A1`, `A2`, ...), `max N`, and `53 ft overall` would render with their static portion only (dynamic numbers stripped). Root cause: the in-editor visual tagger wraps mixed static+dynamic JSX expressions in `<span>` elements which SVG `<text>` does not render. Fix: converted every mixed expression in `TruckDiagram` to a single template-literal expression so no `<span>` gets injected.
- **Bridge Chart Dummy Axle Full Rules (2026-04-18)**: Implemented complete CFR dummy-axle rules. (1) Disregard rule: dummy weight < 8,000 lbs AND < 8% of gross → dummy is disregarded (group treated as base count, dummy weight subtracted from group+gross). (2) Otherwise dummy COUNTED: bridge formula uses base+1 axles, and dummy weight is added to the original group's check (e.g., tandem 34k includes dummy weight). Extended to triple+quad groups. (3) Gross weight now defaults to "Max for N axles" (highest column value in BD table) when no Overall Distance entered; helpful note displayed. (4) Group headers show adjusted weight (post-dummy-discount). (5) Dummy status badge shows DISREGARDED / COUNTED with weight in group body. (6) "All within legal limits" aggregate now also considers tandem-check violations. (7) Violations list includes the tandem-only secondary check as its own card.
- **Bridge Chart Enhancements (2026-04-18)**: html2canvas full-section capture, collapsible inputs toggle, clickable Bridge Chart table cells, "(ft)" moved to column header only (not per row), initial dummy-axle support.
- **Level 3 Inspection Guide (2026-04-16)**: Built from DIR Sheet 2025-2026 docx. 20 accordion sections, search, nav chips, CFR links, mobile-ready. Route: /level3
- **Worksheet Restructured (2026-04-15)**: Matched reference sheet v26.1 hierarchy
- **Placard Flow Reordered (2026-04-15)**: Table->Weight->Exceptions->Bulk->Bulk Exceptions
- **Official Placard Images (2026-04-15)**: Using Federal Register public domain images
- **Complete Appendix A/B Data (2026-04-14)**: 1804 entries from Excel

## Backlog
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
| P2 | Refactor HazMatHelpers.js into separate components |
| P2 | More inspector tools: Spec Marking Decoder, Retest Calculator, OOS Reference |
