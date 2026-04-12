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
  - 393.108 WLL table (all grades, webbing, wire rope, steel)
  - Favorites system (localStorage), Custom WLL
  - Drag-and-drop + up/down reorder, defective toggle
  - Count dots match tie-down position order
  - Photo upload from camera or gallery
  - Export all articles to HTML, Save all articles to inspection
  - Direct/Indirect infographic with user's custom images
  - Collapsible sections, eCFR links

## Backlog
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
