# SafeSpect Violation Navigator — PRD

## Problem Statement
FMCSA roadside violation search/filter app with AI-powered search, NSP blue/gold theme. Includes HazMat inspection tools for training and roadside use.

## What's Implemented
- NSP Blue/Gold Theme, AI Smart Search (natural language → violations), 4-Level Violation Tree
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

## Recent Changes
- **Worksheet Restructured (2026-04-15)**: Matched reference sheet v26.1 hierarchy — grouped sub-bullets under parent checkboxes, added divider, reduced to 55 checks
- **Placard Flow Reordered (2026-04-15)**: Table→Weight→Exceptions→Bulk→Bulk Exceptions
- **Official Placard Images (2026-04-15)**: Using Federal Register public domain images
- **Complete Appendix A/B Data (2026-04-14)**: 1804 entries from Excel

## Backlog
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
| P2 | More inspector tools: Spec Marking Decoder, Retest Calculator, OOS Reference |
