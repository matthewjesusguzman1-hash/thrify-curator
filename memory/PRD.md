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
- Tie-Down export (standalone HTML) and save-to-inspection with combined export

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
| Tie-Down Calculator (49 CFR 393 compliant) | DONE | Session 2 |
| Tie-Down Calculator: Direct/Indirect method toggle | DONE | Session 2 |
| **Calculator nav button (filled gold, prominent)** | **DONE** | Session 2 |
| **Standalone export (HTML download from calculator)** | **DONE** | Session 2 |
| **Save tie-down assessment to inspection** | **DONE** | Session 2 |
| **Tie-down assessments displayed in InspectionDetail** | **DONE** | Session 2 |
| **Inspection HTML export includes tie-down assessments** | **DONE** | Session 2 |
| **Delete tie-down assessment from inspection** | **DONE** | Session 2 |

### Tie-Down Calculator Details
- Cargo weight/length inputs with real-time calculations
- 5 common presets + Custom WLL
- Direct (100% WLL) vs Indirect (50% WLL) method toggle per tie-down
- Defective toggle excludes tie-down from calculation
- SVG circular compliance gauge with animated progress
- Visual count dots, WLL breakdown bars
- Collapsible regulation reference (393.104, 393.106)
- **Export Report**: Downloads standalone HTML with full assessment data
- **Save to Inspection**: Modal picks existing inspection, POSTs assessment with computed values
- **InspectionDetail**: Shows attached assessments with compliance badge, cargo stats, tie-down list
- **Combined export**: Inspection HTML export includes tie-down assessment table

## Key API Endpoints
- `GET /api/violations` — Search & filter
- `POST /api/violations/smart-search` — AI search
- `GET /api/violations/similar/{id}` — Similar violations
- `GET /api/violations/tree` — 4-level tree data
- `GET /api/inspections`, `POST`, `PUT /api/inspections/{id}` — CRUD
- `POST /api/inspections/{id}/tiedown` — Save tie-down assessment
- `DELETE /api/inspections/{id}/tiedown/{assessment_id}` — Remove assessment
- `GET /api/inspections/{id}/export` — HTML export (includes tie-downs)

## DB Schema
- `violations`: master_key, violation_class, violation_category, cfr_part, regulatory_reference, violation_text, oos_value, hazmat_value, inspection_level_3
- `inspections`: id, title, notes, created_at, updated_at, items[], **tiedown_assessments[]**
  - Each tiedown_assessment: assessment_id, cargo_weight, cargo_length, required_wll, min_tiedowns, tiedowns[], total_effective_wll, active_count, defective_count, compliant, created_at

## Backlog (Prioritized)
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page (consolidate links, procedures, guides) |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py (~1000+ lines) into modular route files |
