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
