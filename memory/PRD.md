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
