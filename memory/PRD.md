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
- Tie-Down Calculator with 393.108 WLL table, direct/indirect infographic, favorites, photos

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
| Resources dropdown | DONE | Session 1 |
| Tie-Down Calculator (49 CFR 393) | DONE | Session 2 |
| Calculator export & save-to-inspection | DONE | Session 2 |
| Photo upload (calculator + inspection) | DONE | Session 2 |
| **Direct=50%, Indirect=100% (corrected per 393.102)** | **DONE** | Session 2 |
| **393.108 WLL values corrected to regulation** | **DONE** | Session 2 |
| **Favorites system (localStorage)** | **DONE** | Session 2 |
| **3-diagram infographic (matching CVSA cert material)** | **DONE** | Session 2 |
| **Collapsible accordion categories (Grade 30→80 order)** | **DONE** | Session 2 |

## Key WLL Rules (393.102)
- **DIRECT** = 50% of WLL (vehicle anchor → cargo, OR same side)
- **INDIRECT** = 100% of WLL (vehicle anchor → over cargo → OTHER side)
- Required aggregate WLL = 50% of cargo weight

## Backlog (Prioritized)
| Priority | Task |
|----------|------|
| P1 | Dedicated mobile resources page |
| P1 | Offline/cached mode for field use |
| P2 | Refactor server.py into modular routes |
