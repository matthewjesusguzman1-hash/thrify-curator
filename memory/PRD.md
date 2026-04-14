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
  - **Complete 393.108 WLL table** (13 categories: 5 chain grades incl. Grade 100, webbing, wire rope, manila, polypropylene, polyester, nylon, double braided nylon, steel strapping — all sizes from eCFR)
  - Favorites system (localStorage), Custom WLL
  - Drag-and-drop + up/down reorder, defective toggle
  - Count dots match tie-down position order
  - Photo upload from camera or gallery
  - Export all articles to HTML, Save all articles to inspection
  - Direct/Indirect infographic with user's custom images
  - Collapsible sections (WLL table + each category independently), eCFR links
- **HazMat Inspection Worksheet** (49 CFR, v26.1):
  - 7-step interactive checklist (113 checkable items) following HM inspection procedure
  - "Mark entire step complete" checkbox for quick step-level completion
  - Collapsible steps with per-step and overall progress bars
  - Inspector tips on every checkable item (113 tips) with contextual regulatory guidance
  - All CFR references are clickable links to eCFR.gov
  - **Inspector Tools**:
    - Placard Determination Helper (Table 1 & 2, weight thresholds, CDL H endorsement, 16 exceptions with explanations)
    - Package Classification Helper (Bulk/Non-Bulk/Specification guided walkthrough)
    - Materials of Trade (MOT) Helper (173.6 exception — linear flow, flags violations inline)
    - Segregation Table (177.848 — pick two classes, plain-language verdict)
  - Quick Reference section — PHMSA Title 49 Chapter 1 regulation index (all Parts linkable)
  - localStorage persistence, reset functionality

## Recent Fixes
- **PDF Export 2-Page Bug (2026-04-13)**: Fixed single-article PDF reports splitting into 2 pages on iOS. Root cause: `html2canvas` captured in-DOM element with flex-inflated scrollHeight. Fix: off-screen cloned wrappers for accurate content height.

## Backlog
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
| P2 | Refactor TieDownCalculator.js into sub-components |
