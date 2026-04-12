# SafeSpect Violation Navigator — PRD

## Problem Statement
FMCSA roadside violation search/filter app with AI-powered search, NSP blue/gold theme.

## Key WLL Rules (393.102)
- **DIRECT** = 50% of WLL (vehicle anchor → cargo, OR same side)
- **INDIRECT** = 100% of WLL (vehicle anchor → over cargo → OTHER side)
- Required aggregate WLL = 50% of cargo weight

## What's Implemented
| Feature | Status |
|---------|--------|
| Excel parsing & MongoDB ingestion | DONE |
| NSP Blue/Gold Theme | DONE |
| AI Smart Search (emergentintegrations) | DONE |
| 4-Level Violation Tree (resizable split-screen) | DONE |
| Inspection Documentation (CRUD, photos, HTML export) | DONE |
| CVSA Procedures Viewer | DONE |
| PWA with NSP badge | DONE |
| Resources dropdown | DONE |
| Tie-Down Calculator (49 CFR 393) | DONE |
| Calculator export & save-to-inspection | DONE |
| Photo upload (calculator + inspection) | DONE |
| Direct=50%, Indirect=100% (corrected per 393.102) | DONE |
| 393.108 WLL values (all 4 webbing sizes, all chain grades) | DONE |
| Favorites system (localStorage) | DONE |
| 3-diagram infographic (matching CVSA cert material) | DONE |
| Collapsible accordion categories (Grade 30→80 order) | DONE |
| All sections collapsible (tie-downs, WLL info, photos, breakdown) | DONE |
| eCFR 393.108 table link | DONE |

## Backlog
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
