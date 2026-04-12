# SafeSpect Violation Navigator — PRD

## Problem Statement
A simple, intuitive application to search and filter FMCSA roadside violation data (uploaded Excel). Primary search pillars: violation class, regulatory reference, keyword search, with AI-powered semantic search. NSP (Nebraska State Patrol) blue/gold theme.

## Core Requirements
- Search & filter violations (OOS, HazMat, Level 3)
- Display similar violations based on content
- Inspection Documentation: save violations, add photos, notes, export to HTML
- 4-level interactive Violation Tree for hierarchical navigation
- CVSA and NSP resource links
- PWA support (Save to Home Screen)
- Tie-Down Calculator: cargo weight, length, WLL, direct/indirect usage rules, defective tie-downs

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **AI**: OpenAI via emergentintegrations (Smart Search)
- **PWA**: manifest.json + service worker setup

## What's Implemented
| Feature | Status | Date |
|---------|--------|------|
| Excel parsing & MongoDB ingestion | DONE | Session 1 |
| NSP Blue/Gold Theme | DONE | Session 1 |
| AI Smart Search (emergentintegrations) | DONE | Session 1 |
| 4-Level Violation Tree (resizable split-screen) | DONE | Session 1 |
| Inspection Documentation (CRUD, photos, HTML export) | DONE | Session 1 |
| CVSA Procedures Viewer | DONE | Session 1 |
| PWA with NSP badge | DONE | Session 1 |
| Resources dropdown (NSP Truck Guide, FMCSA, Ops Policies) | DONE | Session 1 |
| **Tie-Down Calculator** (49 CFR 393 compliant) | **DONE** | Session 2 |

### Tie-Down Calculator Details
- Cargo weight/length inputs with real-time calculations
- 5 common presets (1"/2"/4" ratchet straps, 3/8"/1/2" Gr70 chains) + Custom WLL
- Direct (100% WLL) vs Indirect (50% WLL) method toggle per tie-down
- Defective toggle excludes tie-down from calculation
- SVG circular compliance gauge with animated progress
- Visual count dots (green active, red defective, dashed empty)
- WLL breakdown bars with color-coded legend
- Collapsible regulation reference (393.104, 393.106)
- COMPLIANT / NOT COMPLIANT status banner
- Mobile-first responsive design

## Key API Endpoints
- `GET /api/violations` — Search & filter
- `POST /api/violations/smart-search` — AI search
- `GET /api/violations/similar/{id}` — Similar violations
- `GET /api/violations/tree` — 4-level tree data
- `GET /api/inspections`, `POST`, `PUT /api/inspections/{id}` — CRUD

## DB Schema
- `violations`: master_key, violation_class, violation_category, cfr_part, regulatory_reference, violation_text, oos_value, hazmat_value, inspection_level_3
- `inspections`: id, title, date, notes, violations[], photos[]

## Backlog (Prioritized)
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page (consolidate links, procedures, guides) |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py (~1000 lines) into modular route files |
