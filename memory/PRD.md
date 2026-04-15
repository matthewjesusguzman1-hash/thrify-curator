# SafeSpect Violation Navigator — PRD

## Problem Statement
FMCSA roadside violation search/filter app with AI-powered search, NSP blue/gold theme.

## What's Implemented
- Excel parsing & MongoDB ingestion
- NSP Blue/Gold Theme, AI Smart Search, 4-Level Violation Tree
- Inspection Documentation (CRUD, photos, HTML export)
- CVSA Procedures, PWA, Resources dropdown
- **Multi-Article Tie-Down Calculator** (49 CFR 393):
  - Multiple cargo articles on same trailer, each with own weight/length/blocking/tiedowns/photos
  - Direct=50% WLL, Indirect=100% WLL (default)
  - Headerboard/Blocking toggle (393.110b vs 393.110c)
  - Complete 393.108 WLL table (13 categories), Favorites, Custom WLL
  - Drag-and-drop reorder, defective toggle, photo upload, export to HTML
  - Collapsible sections, eCFR links
- **HazMat Inspection Worksheet** (49 CFR, v26.1):
  - 7-step interactive checklist (113 checkable items)
  - Inspector tips with contextual regulatory guidance, CFR links
  - **Inspector Tools**:
    - Does It Need a Placard? (Table 1 & 2 decision tree)
    - **Placard Calculator** (NEW) — input materials with class, weight, bulk status → outputs required placards, DANGEROUS substitution, exceptions including Class 9 domestic, CDL HM endorsement check
    - RQ & Marine Pollutant Lookup (1804 entries from Appendix A & B)
    - Package Classification Helper
    - Materials of Trade (MOT) Helper
    - Segregation Table (177.848)
  - Quick Reference — PHMSA Title 49 regulation index
  - localStorage persistence, inline reset confirmation
- **Photo Annotation Tool** (NEW):
  - Take photo (camera) or upload from gallery
  - Drawing tools: freehand, circle, arrow, text
  - Color picker (7 colors), adjustable line width
  - Quick stamps: VIOLATION, OOS, DEFECT, date, SEE REPORT
  - Undo, Clear All, Download/Share annotated image
  - Accessible via header nav and /photo-annotator route
- **AI Smart Search** (IMPROVED):
  - Natural language queries: "driver not wearing seatbelt" → 392.16 violations
  - "cell phone in hand" → 392.82, 390.17 violations
  - Maps field observations to CFR sections and regulatory terms

## Recent Changes
- **3 New Features (2026-04-15)**: Placard Calculator, Photo Annotation Tool, Improved AI Search
- **Inspector Tip Corrections (2026-04-15)**: Empty Packages, Cargo Tanks AA/LPG, Organic Peroxide, Emergency Phone, Special Provisions codes, Class 9 exception, Limited Quantities, Placard Display, Nurse Tanks
- **Reset Button Fix (2026-04-15)**: Replaced window.confirm() with inline Yes/No for PWA compatibility
- **Complete Appendix A/B Data (2026-04-14)**: 1804 entries from Excel parsing

## Backlog
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes (>1300 lines) |
| P2 | Refactor TieDownCalculator.js and HazMatHelpers.js into smaller components |
| P2 | More inspector tools: Spec Marking Decoder, Retest Date Calculator, OOS Quick Reference, etc. |
