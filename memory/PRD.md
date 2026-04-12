# SafeSpect Violation Navigator - PRD

## Problem Statement
Build a simple, intuitive app to search FMCSA violation data for Nebraska State Patrol Carrier Enforcement Division. Primary search by violation class, regulatory reference, and keyword. Supports fuzzy/AI semantic search. Filters for OOS, HazMat, Level III, Critical. Only "Current Violations" sheet used.

## Architecture
- **Backend**: FastAPI + MongoDB + OpenAI (via Emergent integrations)
- **Frontend**: React + Tailwind + Shadcn UI
- **Data**: 1,597 current violations from Excel, seeded into MongoDB on startup

## User Personas
- NSP Carrier Enforcement officers searching violations during inspections
- Compliance staff looking up regulatory references

## Core Requirements
- [x] Keyword search across violation text, regulatory reference, codes
- [x] AI-powered semantic search (OpenAI gpt-4.1-mini)
- [x] Filter by Violation Class, OOS, HazMat, Level III, Critical
- [x] Prominent display of Regulatory Reference and Violation Text
- [x] OOS visual indicators (red badge)
- [x] Nebraska State Patrol blue/gold theme
- [x] Excel file upload for data refresh
- [x] Pagination

## What's Implemented (April 12, 2026)
- Full backend API with search, filters, AI semantic search, upload
- Frontend dashboard with all filters, search, table, pagination
- Data seeded from "Current Violations" sheet (1,597 records)
- 100% test pass rate

## Backlog
- P1: Export search results to CSV/PDF
- P1: Bookmark/save frequently used searches
- P2: Mobile-optimized view for field use
- P2: Offline mode for areas with poor connectivity
- P3: Violation change history tracking between data updates
